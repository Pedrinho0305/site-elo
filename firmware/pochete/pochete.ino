// ============================================================================
// ELO · Firmware da pochete (ESP32)
// ----------------------------------------------------------------------------
// Botões só valem se forem SEGURADOS por 3 s (evita aperto sem querer).
// Enquanto segura, a pochete dá um bipe por segundo; aos 3 s, dispara.
//
//   · Botão VERMELHO (D22) → emergência: o servidor avisa o cuidador (painel,
//                            Telegram) e os familiares (e-mail) com a
//                            localização; depois a posição vai a cada 30 s
//                            por 10 min. Sem internet, tenta de novo a cada
//                            10 s até conseguir.
//   · Botão PRETO (D18)    → pede Uber: a corrida fica esperando o cuidador
//                            aprovar no painel; a pochete apita quando o
//                            carro é chamado e quando o motorista vem.
//   · Mensagem do cuidador → toca no buzzer a cada 30 s (até 10 vezes);
//                            um toque curto em QUALQUER botão confirma e o
//                            painel mostra "ouviu". Segurar o vermelho
//                            continua sendo emergência.
//   · GPS                  → posição a cada 2 min se andou, ou a cada 10 min
//                            parada (o painel mostra no mapa).
//
// É o mesmo caminho do botão "Testar sem a pochete" do painel: as duas
// rotas chamam a mesma função do servidor (tratarEvento em backend/server.js).
// Contrato (backend/README.md, "Como a pochete fala com o servidor"):
//   POST /api/pochete/evento               { tipo, lat?, lng? }
//   GET  /api/pochete/estado               → { corrida, recados[] }
//   POST /api/pochete/recados/:id/confirmar
//   Cabeçalho X-Pochete-Key em todos.
//
// Placa: ESP32 DevKit V1 (core "esp32" da Espressif, 2.x ou 3.x).
// Bibliotecas: TinyGPSPlus (Mikal Hart) · ArduinoJson (7.x)
// Ligações: tabela em firmware/README.md.
// ============================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

#include "config.h"        // copie config.example.h para config.h e preencha
#include "certificados.h"

// ---------------------------------------------------------------------------
// Pinos
// ---------------------------------------------------------------------------
#define PINO_GPS_RX          16   // TX do módulo GPS → GPIO16
#define PINO_GPS_TX          17
#define PINO_BOTAO_VERMELHO  22   // botão entre o pino e o GND (pull-up interno)
#define PINO_BOTAO_PRETO     18
#define PINO_BUZZER          23   // buzzer: + no pino, − no GND

// ---------------------------------------------------------------------------
// Tempos (ms)
// ---------------------------------------------------------------------------
const uint32_t SEGURAR_MS              = 3000;         // tempo segurando para ativar
const uint32_t DEBOUNCE_MS             = 30;
const uint32_t CONSULTA_ESTADO_MS      = 15000;        // pergunta ao servidor por corrida e mensagens
const uint32_t POSICAO_ANDANDO_MS      = 2UL * 60000;  // manda a posição se andou mais de 50 m
const uint32_t POSICAO_PARADA_MS       = 10UL * 60000;
const uint32_t POSICAO_EMERGENCIA_MS   = 30000;
const uint32_t DURACAO_EMERGENCIA_MS   = 10UL * 60000;
const uint32_t REENVIO_MS              = 10000;        // emergência que não saiu: tenta de novo
const uint32_t REPETE_MENSAGEM_MS      = 30000;        // mensagem não confirmada toca de novo
const uint8_t  MAX_REPETICOES_MENSAGEM = 10;
const uint32_t GPS_VELHO_MS            = 10UL * 60000; // posição mais velha que isso não vale

#if DEPURAR
#define LOG(...) Serial.printf(__VA_ARGS__)
#else
#define LOG(...) do {} while (0)
#endif

// ---------------------------------------------------------------------------
// Tipos (antes de qualquer função: a Arduino IDE declara as funções no topo
// do arquivo, e elas precisam enxergar os tipos)
// ---------------------------------------------------------------------------
struct Nota { uint16_t freq, dur; };   // Hz e ms; 0 Hz = pausa

enum Som : uint8_t {
  SOM_LIGOU, SOM_TIQUE_VERMELHO, SOM_TIQUE_PRETO, SOM_EMERGENCIA, SOM_PEDIDO,
  SOM_OK, SOM_ERRO, SOM_SEM_INTERNET, SOM_CARRO_APROVADO, SOM_CARRO_CHEGANDO, SOM_MENSAGEM,
};

// O que a tarefa dos botões manda para o loop
enum Acao : uint8_t { ACAO_EMERGENCIA, ACAO_UBER, ACAO_TOQUE_CURTO };

struct Botao {
  const char *nome;
  uint8_t pino;
  Som tique;                  // bipe de cada segundo segurando
  Acao acao;                  // o que dispara aos 3 s
  bool estado;                // estável: HIGH solto, LOW apertado
  uint32_t mudouEm, apertouEm;
  bool ativado;               // já passou dos 3 s neste aperto?
  uint8_t bipes;              // bipes de contagem já dados neste aperto
};

struct Posicao { double lat = 0, lng = 0; bool valida = false; uint32_t quando = 0; };

struct Recado { uint32_t id = 0; String texto; uint8_t vezes = 0; uint32_t tocouEm = 0; };

// ---------------------------------------------------------------------------
// Sons do buzzer (os tons do teste: vermelho grave, preto agudo)
// ---------------------------------------------------------------------------
const Nota N_LIGOU[]          = {{1319, 90}, {0, 40}, {1760, 140}};
const Nota N_TIQUE_VERMELHO[] = {{1000, 70}};
const Nota N_TIQUE_PRETO[]    = {{2500, 70}};
const Nota N_EMERGENCIA[]     = {{1000, 150}, {0, 60}, {1000, 150}, {0, 60}, {1000, 500}};
const Nota N_PEDIDO[]         = {{2500, 120}, {0, 60}, {2500, 120}};
const Nota N_OK[]             = {{1319, 90}, {0, 40}, {1760, 140}};
const Nota N_ERRO[]           = {{392, 250}, {0, 80}, {330, 350}};
const Nota N_SEM_INTERNET[]   = {{392, 150}, {0, 80}, {392, 150}, {0, 80}, {330, 350}};
const Nota N_CARRO_APROVADO[] = {{880, 160}, {0, 60}, {1175, 260}};
const Nota N_CARRO_CHEGANDO[] = {{880, 160}, {0, 60}, {1175, 160}, {0, 60}, {1568, 300}};
const Nota N_MENSAGEM[]       = {{988, 120}, {0, 50}, {1319, 120}, {0, 50}, {1568, 220}};

#define MELODIA(n) { n, sizeof(n) / sizeof(Nota) }
const struct { const Nota *notas; uint8_t n; } MELODIAS[] = {
  MELODIA(N_LIGOU), MELODIA(N_TIQUE_VERMELHO), MELODIA(N_TIQUE_PRETO), MELODIA(N_EMERGENCIA),
  MELODIA(N_PEDIDO), MELODIA(N_OK), MELODIA(N_ERRO), MELODIA(N_SEM_INTERNET),
  MELODIA(N_CARRO_APROVADO), MELODIA(N_CARRO_CHEGANDO), MELODIA(N_MENSAGEM),
};

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
TinyGPSPlus gps;
#define gpsSerial Serial2
WiFiMulti wifi;

// Filas entre a tarefa dos botões/buzzer e o loop (que faz a rede)
QueueHandle_t filaSons, filaAcoes;

// Mensagem tocando? A tarefa dos botões lê isto para decidir se o preto
// segurado confirma a mensagem ou pede carro.
volatile bool recadoTocando = false;

Botao vermelho = { "VERMELHO (D22)", PINO_BOTAO_VERMELHO, SOM_TIQUE_VERMELHO, ACAO_EMERGENCIA, HIGH, 0, 0, false, 0 };
Botao preto    = { "PRETO (D18)",    PINO_BOTAO_PRETO,    SOM_TIQUE_PRETO,    ACAO_UBER,       HIGH, 0, 0, false, 0 };

Posicao posicao, ultimaEnviada;
bool emergenciaAtiva = false, emergenciaPendente = false;
uint32_t emergenciaDesde = 0;
uint32_t ultimaConsulta = 0, ultimaPosicao = 0, ultimoReenvio = 0;
String statusCorrida = "";

Recado recadoAtual;
uint32_t confirmarPendente = 0;        // confirmação que não chegou ao servidor
uint32_t recadosConfirmados[8] = {0};  // evita tocar de novo o que já foi confirmado
uint8_t posConfirmados = 0;

// ---------------------------------------------------------------------------
// Tarefa dos botões e do buzzer: roda separada do loop, então a contagem dos
// 3 s e os sons continuam enquanto o loop espera o servidor.
// ---------------------------------------------------------------------------
void tocar(Som s) { xQueueSend(filaSons, &s, 0); }

void lerBotao(Botao &b, uint32_t t) {
  bool leitura = digitalRead(b.pino);

  if (leitura != b.estado && t - b.mudouEm > DEBOUNCE_MS) {
    b.estado = leitura;
    b.mudouEm = t;
    if (b.estado == LOW) {
      b.apertouEm = t;
      b.ativado = false;
      b.bipes = 0;
      LOG("[botão] %s apertado... segure 3 s\n", b.nome);
    } else if (!b.ativado) {
      LOG("[botão] %s solto antes de 3 s\n", b.nome);
      Acao a = ACAO_TOQUE_CURTO;           // só serve para confirmar mensagem
      xQueueSend(filaAcoes, &a, 0);
    }
  }

  if (b.estado != LOW || b.ativado) return;

  uint32_t segurando = t - b.apertouEm;
  if (segurando >= SEGURAR_MS) {
    b.ativado = true;
    LOG("[botão] %s ATIVADO (3 s)\n", b.nome);
    Acao a = b.acao;
    // Com mensagem tocando, o preto segurado só confirma (não pede carro sem querer)
    if (a == ACAO_UBER && recadoTocando) a = ACAO_TOQUE_CURTO;
    tocar(a == ACAO_EMERGENCIA ? SOM_EMERGENCIA : a == ACAO_UBER ? SOM_PEDIDO : SOM_OK);
    xQueueSend(filaAcoes, &a, 0);
  } else if (segurando / 1000 > b.bipes) {  // um bipe aos 1 s e aos 2 s
    b.bipes = segurando / 1000;
    tocar(b.tique);
  }
}

void tarefaInterface(void *) {
  const Nota *nota = nullptr;
  uint8_t restantes = 0;
  uint32_t notaAte = 0;

  for (;;) {
    uint32_t t = millis();
    lerBotao(vermelho, t);
    lerBotao(preto, t);

    // Som novo interrompe o que estiver tocando
    uint8_t s;
    if (xQueueReceive(filaSons, &s, 0) == pdTRUE) {
      nota = MELODIAS[s].notas;
      restantes = MELODIAS[s].n;
      notaAte = 0;
    }
    if (nota && t >= notaAte) {
      if (!restantes) { noTone(PINO_BUZZER); nota = nullptr; }
      else {
        if (nota->freq) tone(PINO_BUZZER, nota->freq); else noTone(PINO_BUZZER);
        notaAte = t + nota->dur;
        nota++;
        restantes--;
      }
    }
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

// ---------------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------------
bool conectado() { return wifi.run(5000) == WL_CONNECTED; }

// Faz um pedido ao servidor. Devolve o status HTTP (ou < 0 se nem conectou).
int pedir(const char *metodo, const String &rota, const String &corpo, String *resposta) {
  if (!conectado()) { LOG("[rede] sem Wi-Fi\n"); return -1; }
  WiFiClientSecure cliente;
  cliente.setCACert(CERTIFICADOS);
  HTTPClient http;
  http.setTimeout(8000);
  http.setConnectTimeout(8000);
  if (!http.begin(cliente, String(ELO_API) + rota)) return -2;
  http.addHeader("X-Pochete-Key", POCHETE_CHAVE);
  http.addHeader("Content-Type", "application/json");
  int status = http.sendRequest(metodo, corpo);
  if (resposta && status > 0) *resposta = http.getString();
  LOG("[http] %s %s → %d\n", metodo, rota.c_str(), status);
  http.end();
  esp_task_wdt_reset();
  return status;
}

bool posicaoFresca() { return posicao.valida && millis() - posicao.quando < GPS_VELHO_MS; }

// Manda um evento como o botão do painel manda. Sem posição recente, o
// servidor usa a última que recebeu.
int enviarEvento(const char *tipo, String *resposta = nullptr) {
  JsonDocument doc;
  doc["tipo"] = tipo;
  if (posicaoFresca()) { doc["lat"] = posicao.lat; doc["lng"] = posicao.lng; }
  String corpo; serializeJson(doc, corpo);
  return pedir("POST", "/pochete/evento", corpo, resposta);
}

// Texto do campo "erro" da resposta, para o Monitor Serial
String erroDa(const String &resposta) {
  JsonDocument doc;
  if (deserializeJson(doc, resposta)) return resposta;
  return doc["erro"] | resposta;
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------
bool jaConfirmado(uint32_t id) {
  for (uint32_t c : recadosConfirmados) if (c == id) return true;
  return false;
}

void mandarConfirmacao() {
  if (!confirmarPendente) return;
  int status = pedir("POST", "/pochete/recados/" + String(confirmarPendente) + "/confirmar", "{}", nullptr);
  // 2xx chegou; 4xx o servidor recusou de vez (mensagem apagada): não insiste
  if (status >= 200 && status < 500 && status != 429) confirmarPendente = 0;
}

void confirmarRecado() {
  if (!recadoAtual.id) return;
  LOG("[mensagem] confirmada: \"%s\"\n", recadoAtual.texto.c_str());
  recadosConfirmados[posConfirmados++ % 8] = recadoAtual.id;
  confirmarPendente = recadoAtual.id;
  recadoAtual = Recado();
  recadoTocando = false;
  tocar(SOM_OK);
  mandarConfirmacao();                  // se falhar, o loop tenta de novo
}

void mandarEmergencia() {
  String resposta;
  int status = enviarEvento("emergencia", &resposta);
  if (status >= 200 && status < 300) {
    emergenciaPendente = false;
    LOG("[emergência] cuidador avisado\n");
    tocar(SOM_OK);
  } else if (status >= 400 && status < 500 && status != 429) {
    emergenciaPendente = false;         // chave errada etc.: repetir não resolve
    LOG("[emergência] servidor recusou: %s\n", erroDa(resposta).c_str());
    tocar(SOM_ERRO);
  } else {
    emergenciaPendente = true;          // sem internet: tenta a cada 10 s
    LOG("[emergência] não saiu, tentando de novo em 10 s\n");
    tocar(SOM_SEM_INTERNET);
  }
  ultimoReenvio = millis();
}

void emergencia() {
  if (recadoAtual.id) confirmarRecado(); // ouviu a mensagem, mas a emergência vem primeiro
  emergenciaAtiva = true;
  emergenciaDesde = millis();
  ultimaPosicao = millis();
  mandarEmergencia();
}

void pedirUber() {
  if (!posicaoFresca()) LOG("[gps] sem posição agora: o servidor usa a última que recebeu\n");
  String resposta;
  int status = enviarEvento("transporte", &resposta);
  if (status >= 200 && status < 300) {
    statusCorrida = "pendente";
    LOG("[uber] pedido enviado, esperando o cuidador aprovar no painel\n");
    tocar(SOM_OK);
  } else if (status < 0) {
    // Pedido de carro não fica guardado: chegaria atrasado, quando a pessoa
    // talvez nem precise mais. Ela aperta de novo.
    LOG("[uber] sem internet: aperte de novo depois\n");
    tocar(SOM_SEM_INTERNET);
  } else {
    // 409: já tem corrida; 422: sem posição ou sem endereço de casa no painel
    LOG("[uber] servidor recusou (%d): %s\n", status, erroDa(resposta).c_str());
    tocar(SOM_ERRO);
  }
}

void tocarRecado() {
  recadoAtual.vezes++;
  recadoAtual.tocouEm = millis();
  recadoTocando = true;
  tocar(SOM_MENSAGEM);
  LOG("[mensagem] \"%s\" (vez %u) — toque um botão para confirmar\n", recadoAtual.texto.c_str(), recadoAtual.vezes);
}

// ---------------------------------------------------------------------------
// Estado no servidor: corrida e mensagens novas
// ---------------------------------------------------------------------------
void consultarEstado() {
  String resposta;
  if (pedir("GET", "/pochete/estado", "", &resposta) != 200) return;
  JsonDocument doc;
  if (deserializeJson(doc, resposta)) return;

  // Corrida: avisa quando o status muda
  String novo = doc["corrida"].isNull() ? "" : doc["corrida"]["status"].as<String>();
  if (novo != statusCorrida) {
    LOG("[uber] %s → %s\n", statusCorrida.length() ? statusCorrida.c_str() : "(nenhuma)", novo.length() ? novo.c_str() : "(nenhuma)");
    if (novo == "aprovada" || novo == "solicitada") tocar(SOM_CARRO_APROVADO);
    else if (novo == "a_caminho") tocar(SOM_CARRO_CHEGANDO);
    else if (statusCorrida == "pendente" && novo == "") { LOG("[uber] o cuidador recusou o pedido\n"); tocar(SOM_ERRO); }
    statusCorrida = novo;
  }

  // Mensagens: pega a primeira que ainda não foi confirmada aqui
  if (!recadoAtual.id) {
    for (JsonObject r : doc["recados"].as<JsonArray>()) {
      uint32_t id = r["id"];
      if (!id || jaConfirmado(id)) continue;
      recadoAtual.id = id;
      recadoAtual.texto = r["texto"].as<String>();
      recadoAtual.vezes = 0;
      if (!emergenciaAtiva) tocarRecado();
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// GPS (o mesmo do código de teste, sem travar o loop)
// ---------------------------------------------------------------------------
void lerGps() {
  while (gpsSerial.available() > 0) {
    if (gps.encode(gpsSerial.read()) && gps.location.isUpdated() && gps.location.isValid()) {
      posicao.lat = gps.location.lat();
      posicao.lng = gps.location.lng();
      posicao.valida = true;
      posicao.quando = millis();
    }
  }
}

void mandarPosicaoSePreciso() {
  uint32_t t = millis();
  uint32_t intervalo = emergenciaAtiva ? POSICAO_EMERGENCIA_MS : POSICAO_ANDANDO_MS;
  if (t - ultimaPosicao < intervalo || !posicaoFresca()) return;
  double andou = ultimaEnviada.valida
    ? TinyGPSPlus::distanceBetween(posicao.lat, posicao.lng, ultimaEnviada.lat, ultimaEnviada.lng) : 1e9;
  if (!emergenciaAtiva && andou < 50 && t - ultimaPosicao < POSICAO_PARADA_MS) return;
  ultimaPosicao = t;
  ultimaEnviada = posicao;
  LOG("[gps] %.6f, %.6f (%u satélites)\n", posicao.lat, posicao.lng, gps.satellites.value());
  enviarEvento("localizacao");          // não saiu? a próxima vai
}

// ---------------------------------------------------------------------------
// setup / loop
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  gpsSerial.setRxBufferSize(2048);     // o GPS não perde frases enquanto a rede trabalha
  gpsSerial.begin(9600, SERIAL_8N1, PINO_GPS_RX, PINO_GPS_TX);

  pinMode(PINO_BOTAO_VERMELHO, INPUT_PULLUP);
  pinMode(PINO_BOTAO_PRETO, INPUT_PULLUP);
  pinMode(PINO_BUZZER, OUTPUT);
  noTone(PINO_BUZZER);

  filaSons = xQueueCreate(6, sizeof(uint8_t));
  filaAcoes = xQueueCreate(6, sizeof(uint8_t));
  xTaskCreatePinnedToCore(tarefaInterface, "interface", 4096, nullptr, 2, nullptr, 1);

  // Cão de guarda: se o loop travar por 30 s, a pochete reinicia sozinha
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t guarda = { .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true };
  if (esp_task_wdt_reconfigure(&guarda) != ESP_OK) esp_task_wdt_init(&guarda);  // já vem ligado ou não, conforme a versão
#else
  esp_task_wdt_init(30, true);
#endif
  esp_task_wdt_add(NULL);

  WiFi.mode(WIFI_STA);
  if (strlen(WIFI_1_NOME)) wifi.addAP(WIFI_1_NOME, WIFI_1_SENHA);
  if (strlen(WIFI_2_NOME)) wifi.addAP(WIFI_2_NOME, WIFI_2_SENHA);
  if (strlen(WIFI_3_NOME)) wifi.addAP(WIFI_3_NOME, WIFI_3_SENHA);

  LOG("\nELO pochete ligada. Procurando Wi-Fi e satélites...\n");
  LOG("Segure o VERMELHO 3 s = emergência · segure o PRETO 3 s = Uber\n");
  tocar(SOM_LIGOU);
  ultimaConsulta = millis() - CONSULTA_ESTADO_MS + 3000;  // primeira consulta logo depois de ligar
}

void loop() {
  esp_task_wdt_reset();
  uint32_t t = millis();

  lerGps();

  // O que a tarefa dos botões pediu
  uint8_t acao;
  while (xQueueReceive(filaAcoes, &acao, 0) == pdTRUE) {
    if (acao == ACAO_EMERGENCIA) emergencia();
    else if (acao == ACAO_UBER) pedirUber();
    else if (recadoAtual.id) confirmarRecado();   // toque curto: só confirma mensagem
  }

  // Emergência que não saiu: tenta de novo
  if (emergenciaPendente && t - ultimoReenvio > REENVIO_MS) mandarEmergencia();

  // Fim do modo emergência (a posição volta à rotina normal)
  if (emergenciaAtiva && t - emergenciaDesde > DURACAO_EMERGENCIA_MS) emergenciaAtiva = false;

  // Mensagem não confirmada: toca de novo de tempos em tempos
  if (recadoAtual.id && !emergenciaAtiva && t - recadoAtual.tocouEm > REPETE_MENSAGEM_MS) {
    if (recadoAtual.vezes < MAX_REPETICOES_MENSAGEM) tocarRecado();
    else { recadoAtual = Recado(); recadoTocando = false; }
  }

  mandarPosicaoSePreciso();

  if (t - ultimaConsulta > CONSULTA_ESTADO_MS) {
    ultimaConsulta = t;
    mandarConfirmacao();               // confirmação que ficou sem internet
    consultarEstado();
  }

  // Sem GPS conectado (fio solto), como no código de teste
  static bool avisouGps = false;
  if (!avisouGps && t > 15000 && gps.charsProcessed() < 10) { avisouGps = true; LOG("[gps] nenhum dado do GPS: confira os fios (TX do GPS no GPIO16)\n"); }

  delay(5);
}
