// ============================================================================
// ELO · Firmware da pochete (ESP32)
// ----------------------------------------------------------------------------
// O que ela faz:
//   · Botão VERMELHO  → emergência: avisa o cuidador na hora (painel, Telegram
//                       e e-mail dos familiares) com a localização; depois
//                       manda a posição a cada 30 s por 10 min.
//   · Botão AMARELO   → pede transporte: o cuidador aprova no painel e a
//                       pochete avisa (luz e som) quando o carro é chamado.
//   · Botão LATERAL   → toque curto: repete a última mensagem do cuidador;
//                       segurar 3 s: teste ("tudo funcionando").
//   · Mensagens do cuidador: tocam no buzzer (ou no módulo de som) com o anel
//     azul piscando; a pessoa aperta QUALQUER botão e o painel mostra "ouviu".
//     (O vermelho continua sendo emergência mesmo com mensagem tocando.)
//   · GPS: posição a cada 2 min se andou, ou a cada 10 min parada.
//   · Bateria: avisa com 20% e com 10%.
//   · Sem internet: guarda os eventos e reenvia quando voltar (emergência
//     primeiro, tentando a cada 10 s).
//   · Sem comando de voz (removido do projeto).
//
// Contrato com o servidor (backend/README.md, "Como a pochete fala com o
// servidor"):
//   POST /api/pochete/evento               { tipo, lat?, lng?, bateria? }
//   GET  /api/pochete/estado               → { corrida, recados[] }
//   POST /api/pochete/recados/:id/confirmar
//   Cabeçalho X-Pochete-Key em todos.
//
// Placa: ESP32 DevKit V1 (core "esp32" da Espressif, 2.x ou 3.x).
// Bibliotecas (Gerenciador de Bibliotecas da Arduino IDE):
//   TinyGPSPlus (Mikal Hart) · Adafruit NeoPixel · ArduinoJson (7.x)
//   DFRobotDFPlayerMini (só com USAR_DFPLAYER 1)
// Ligações: tabela em firmware/README.md.
// ============================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

#include "config.h"        // copie config.example.h para config.h e preencha
#include "certificados.h"

#if USAR_DFPLAYER
#include <DFRobotDFPlayerMini.h>
#endif

// ---------------------------------------------------------------------------
// Pinos
// ---------------------------------------------------------------------------
#define PINO_GPS_RX        16   // TX do módulo GPS → GPIO16 (como no código base)
#define PINO_GPS_TX        17
#define PINO_BOTAO_VERMELHO 32  // botão entre o pino e o GND (pull-up interno)
#define PINO_BOTAO_AMARELO  33
#define PINO_BOTAO_LATERAL  27
#define PINO_ANEL          4    // DIN do anel WS2812
#define LEDS_NO_ANEL       12
#define PINO_BUZZER        25   // buzzer passivo
#define PINO_BATERIA       35   // meio do divisor 100k/100k da bateria
#define PINO_SOM_RX        26   // DFPlayer TX → GPIO26 (opcional)
#define PINO_SOM_TX        14   // DFPlayer RX ← GPIO14 (com resistor de 1k)

// ---------------------------------------------------------------------------
// Tempos (ms)
// ---------------------------------------------------------------------------
const uint32_t CONSULTA_ESTADO_MS      = 15000;        // pergunta ao servidor por corrida e mensagens
const uint32_t POSICAO_ANDANDO_MS      = 2UL * 60000;  // manda a posição se andou mais de 50 m
const uint32_t POSICAO_PARADA_MS       = 10UL * 60000;
const uint32_t POSICAO_EMERGENCIA_MS   = 30000;
const uint32_t DURACAO_EMERGENCIA_MS   = 10UL * 60000;
const uint32_t LEITURA_BATERIA_MS      = 60000;
const uint32_t REENVIO_MS              = 10000;
const uint32_t REPETE_MENSAGEM_MS      = 30000;        // mensagem não confirmada toca de novo
const uint8_t  MAX_REPETICOES_MENSAGEM = 10;
const uint32_t SEGURAR_TESTE_MS        = 3000;
const uint32_t GPS_VELHO_MS            = 10UL * 60000; // posição mais velha que isso não vale

// ---------------------------------------------------------------------------
// Objetos
// ---------------------------------------------------------------------------
TinyGPSPlus gps;
#define gpsSerial Serial2
WiFiMulti wifi;
Adafruit_NeoPixel anel(LEDS_NO_ANEL, PINO_ANEL, NEO_GRB + NEO_KHZ800);
#if USAR_DFPLAYER
HardwareSerial somSerial(1);
DFRobotDFPlayerMini som;
bool somPronto = false;
#endif

#if DEPURAR
#define LOG(...) Serial.printf(__VA_ARGS__)
#else
#define LOG(...) do {} while (0)
#endif

// ---------------------------------------------------------------------------
// Áudios do cartão SD do DFPlayer (pasta "mp3", nomes 0001.mp3, 0002.mp3...)
// 1 a 5 são as mensagens prontas do painel (mesma ordem do servidor:
// RECADOS_PRONTOS em backend/server.js). Os outros são avisos da pochete.
// ---------------------------------------------------------------------------
enum Audio : uint8_t {
  AUDIO_MENSAGEM_NOVA   = 10,  // "Você tem uma mensagem nova de quem cuida de você"
  AUDIO_EMERGENCIA_ENVIADA = 11, // "Pedido de ajuda enviado. Seu cuidador já foi avisado"
  AUDIO_SEM_INTERNET    = 12,  // "Sem internet agora. Vou tentar de novo sozinha"
  AUDIO_CARRO_PEDIDO    = 13,  // "Pedido de carro enviado. Espere a aprovação"
  AUDIO_CARRO_APROVADO  = 14,  // "Seu carro foi chamado"
  AUDIO_CARRO_CHEGANDO  = 15,  // "O motorista está a caminho"
  AUDIO_CARRO_RECUSADO  = 16,  // "O pedido de carro não foi aprovado"
  AUDIO_BATERIA_BAIXA   = 17,  // "Bateria baixa. Coloque a pochete para carregar"
  AUDIO_TESTE_OK        = 18,  // "Tudo funcionando"
};

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
enum Modo { MODO_NORMAL, MODO_EMERGENCIA, MODO_TRANSPORTE, MODO_MENSAGEM };
Modo modo = MODO_NORMAL;

struct Posicao { double lat = 0, lng = 0; bool valida = false; uint32_t quando = 0; };
Posicao posicao, ultimaEnviada;

int bateria = -1;                  // %, -1 = ainda não leu
bool avisou20 = false, avisou10 = false;

uint32_t emergenciaDesde = 0;
uint32_t ultimaConsulta = 0, ultimaPosicao = 0, ultimaBateria = 0, ultimoReenvio = 0;
String statusCorrida = "";

// Mensagens do cuidador: a que está tocando e a última ouvida (para repetir)
struct Recado { uint32_t id = 0; String texto; int audio = 0; uint8_t vezes = 0; uint32_t tocouEm = 0; };
Recado recadoAtual, ultimoRecado;
uint32_t recadosConfirmados[8] = {0};  // evita tocar de novo o que já foi confirmado
uint8_t posConfirmados = 0;

// Uma nota do buzzer (frequência em Hz, duração em ms; 0 Hz = pausa).
// Os tipos ficam antes de qualquer função: a Arduino IDE declara as funções
// no topo do arquivo, e elas precisam enxergar os tipos.
struct Nota { uint16_t freq, dur; };

// Fila de eventos que não conseguiram sair (sem internet)
struct Evento { char tipo[12]; double lat, lng; bool comPosicao; int bateria; uint32_t criadoEm; };
const uint8_t TAM_FILA = 12;
Evento fila[TAM_FILA];
uint8_t naFila = 0;

// ---------------------------------------------------------------------------
// Botões (com debounce e toque longo)
// ---------------------------------------------------------------------------
struct Botao {
  explicit Botao(uint8_t p) : pino(p) {}   // construtor: o core 2.x compila em C++11
  uint8_t pino; bool apertado = false; bool longoDisparado = false;
  uint32_t mudouEm = 0, apertouEm = 0;
  bool toque = false, longo = false;   // eventos desta volta do loop
};
Botao vermelho(PINO_BOTAO_VERMELHO), amarelo(PINO_BOTAO_AMARELO), lateral(PINO_BOTAO_LATERAL);

void lerBotao(Botao &b) {
  b.toque = b.longo = false;
  bool agora = digitalRead(b.pino) == LOW;
  uint32_t t = millis();
  if (agora != b.apertado && t - b.mudouEm > 30) {
    b.mudouEm = t;
    b.apertado = agora;
    if (agora) { b.apertouEm = t; b.longoDisparado = false; }
    else if (!b.longoDisparado) b.toque = true;   // soltou antes do toque longo
  }
  if (b.apertado && !b.longoDisparado && t - b.apertouEm >= SEGURAR_TESTE_MS) {
    b.longoDisparado = true;
    b.longo = true;
  }
}

// ---------------------------------------------------------------------------
// Som: buzzer em sequência sem travar o loop (e DFPlayer, se houver)
// ---------------------------------------------------------------------------
const Nota SOM_OK[]         = {{1319, 90}, {0, 40}, {1760, 140}};
const Nota SOM_ERRO[]       = {{392, 250}, {0, 80}, {330, 350}};
const Nota SOM_EMERGENCIA[] = {{1568, 150}, {0, 60}, {1568, 150}, {0, 60}, {1568, 400}};
const Nota SOM_MENSAGEM[]   = {{988, 120}, {0, 50}, {1319, 120}, {0, 50}, {1568, 220}};
const Nota SOM_CARRO[]      = {{880, 160}, {0, 60}, {1175, 260}};
const Nota SOM_BATERIA[]    = {{659, 200}, {0, 100}, {523, 300}};
const Nota *tocando = nullptr; uint8_t notasRestantes = 0; uint32_t notaAte = 0;

#define TOCAR(seq) tocar(seq, sizeof(seq) / sizeof(Nota))
void tocar(const Nota *seq, uint8_t n) { tocando = seq; notasRestantes = n; notaAte = 0; }

void somTick() {
  if (!tocando || millis() < notaAte) return;
  if (!notasRestantes) { noTone(PINO_BUZZER); tocando = nullptr; return; }
  const Nota &n = *tocando++;
  notasRestantes--;
  if (n.freq) tone(PINO_BUZZER, n.freq, n.dur); else noTone(PINO_BUZZER);
  notaAte = millis() + n.dur;
}

void falar(uint8_t audio) {
#if USAR_DFPLAYER
  if (somPronto && audio) { som.playMp3Folder(audio); return; }
#endif
  (void)audio;
}

// ---------------------------------------------------------------------------
// Anel de LED
// ---------------------------------------------------------------------------
bool semInternet = true;

void anelTick() {
  static uint32_t ultimo = 0;
  uint32_t t = millis();
  if (t - ultimo < 40) return;
  ultimo = t;
  anel.clear();
  switch (modo) {
    case MODO_EMERGENCIA: {                       // vermelho piscando
      bool aceso = (t / 300) % 2;
      for (int i = 0; i < LEDS_NO_ANEL; i++) anel.setPixelColor(i, aceso ? anel.Color(255, 0, 0) : 0);
      break;
    }
    case MODO_TRANSPORTE: {                       // amarelo girando
      int cabeca = (t / 90) % LEDS_NO_ANEL;
      for (int k = 0; k < 4; k++) anel.setPixelColor((cabeca + LEDS_NO_ANEL - k) % LEDS_NO_ANEL, anel.Color(255 >> k, 150 >> k, 0));
      break;
    }
    case MODO_MENSAGEM: {                         // azul respirando
      float f = (sin(t / 400.0) + 1) / 2;
      for (int i = 0; i < LEDS_NO_ANEL; i++) anel.setPixelColor(i, anel.Color(0, 40 * f, 255 * f));
      break;
    }
    default: {
      // normal: um pontinho a cada 10 s (verde = tudo certo, laranja = sem
      // internet, vermelho = bateria baixa). Economiza bateria.
      if (t % 10000 < 160) {
        uint32_t cor = (bateria >= 0 && bateria <= 20) ? anel.Color(120, 0, 0)
                     : semInternet ? anel.Color(120, 50, 0) : anel.Color(0, 90, 20);
        anel.setPixelColor(0, cor);
      }
    }
  }
  anel.show();
}

// ---------------------------------------------------------------------------
// Bateria (Li-Po 3,7 V: 4,2 V cheia, 3,3 V vazia)
// ---------------------------------------------------------------------------
int lerBateria() {
  uint32_t soma = 0;
  for (int i = 0; i < 16; i++) soma += analogReadMilliVolts(PINO_BATERIA);
  float volts = (soma / 16.0f) / 1000.0f * 2.0f * BATERIA_CALIBRACAO;   // divisor 1:2
  // curva aproximada de descarga da Li-Po
  const float v[] = {3.30, 3.50, 3.65, 3.72, 3.78, 3.85, 3.95, 4.05, 4.20};
  const int   p[] = {   0,    5,   15,   30,   45,   60,   75,   90,  100};
  if (volts <= v[0]) return 0;
  for (int i = 1; i < 9; i++) if (volts <= v[i]) return p[i - 1] + (p[i] - p[i - 1]) * (volts - v[i - 1]) / (v[i] - v[i - 1]);
  return 100;
}

// ---------------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------------
bool conectado() {
  bool ok = wifi.run(5000) == WL_CONNECTED;
  semInternet = !ok;
  return ok;
}

// Faz um pedido ao servidor. Devolve o status HTTP (ou < 0 se nem conectou).
int pedir(const char *metodo, const String &rota, const String &corpo, String *resposta) {
  if (!conectado()) return -1;
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

// Manda um evento. Devolve true se o servidor recebeu (ou recusou de vez).
bool enviarEvento(const Evento &e, String *resposta = nullptr, int *statusOut = nullptr) {
  JsonDocument doc;
  doc["tipo"] = e.tipo;
  if (e.comPosicao) { doc["lat"] = e.lat; doc["lng"] = e.lng; }
  if (e.bateria >= 0) doc["bateria"] = e.bateria;
  String corpo; serializeJson(doc, corpo);
  int status = pedir("POST", "/pochete/evento", corpo, resposta);
  if (statusOut) *statusOut = status;
  // 2xx: chegou. 4xx: o servidor recusou (não adianta repetir), menos 429.
  return (status >= 200 && status < 300) || (status >= 400 && status < 500 && status != 429);
}

Evento novoEvento(const char *tipo) {
  Evento e{};
  strncpy(e.tipo, tipo, sizeof(e.tipo) - 1);
  bool fresca = posicao.valida && millis() - posicao.quando < GPS_VELHO_MS;
  e.comPosicao = fresca;
  e.lat = posicao.lat; e.lng = posicao.lng;
  e.bateria = bateria;
  e.criadoEm = millis();
  return e;
}

void enfileirar(const Evento &e) {
  if (naFila == TAM_FILA) {
    // cheia: descarta a localização mais antiga (nunca uma emergência)
    int sai = -1;
    for (int i = 0; i < naFila && sai < 0; i++) if (strcmp(fila[i].tipo, "emergencia") != 0) sai = i;
    if (sai < 0) sai = 0;
    for (int i = sai; i < naFila - 1; i++) fila[i] = fila[i + 1];
    naFila--;
  }
  // emergência fura a fila
  if (strcmp(e.tipo, "emergencia") == 0) {
    for (int i = naFila; i > 0; i--) fila[i] = fila[i - 1];
    fila[0] = e;
  } else fila[naFila] = e;
  naFila++;
}

void reenviarFila() {
  if (!naFila || millis() - ultimoReenvio < REENVIO_MS) return;
  ultimoReenvio = millis();
  while (naFila) {
    if (!enviarEvento(fila[0])) return;     // ainda sem internet: tenta depois
    LOG("[fila] %s reenviado\n", fila[0].tipo);
    if (strcmp(fila[0].tipo, "emergencia") == 0) { TOCAR(SOM_OK); falar(AUDIO_EMERGENCIA_ENVIADA); }
    for (int i = 0; i < naFila - 1; i++) fila[i] = fila[i + 1];
    naFila--;
  }
}

// Manda já; se não der, guarda para reenviar
bool mandarOuGuardar(const char *tipo, String *resposta = nullptr, int *status = nullptr) {
  Evento e = novoEvento(tipo);
  if (enviarEvento(e, resposta, status)) return true;
  enfileirar(e);
  return false;
}

// ---------------------------------------------------------------------------
// Ações dos botões
// ---------------------------------------------------------------------------
void confirmarRecado() {
  if (!recadoAtual.id) return;
  uint32_t id = recadoAtual.id;
  ultimoRecado = recadoAtual;
  recadosConfirmados[posConfirmados++ % 8] = id;
  recadoAtual = Recado();
  if (modo == MODO_MENSAGEM) modo = MODO_NORMAL;
  TOCAR(SOM_OK);
  pedir("POST", "/pochete/recados/" + String(id) + "/confirmar", "{}", nullptr);
}

void emergencia() {
  LOG("[botão] EMERGÊNCIA\n");
  if (recadoAtual.id) confirmarRecado();       // ouviu a mensagem, mas a emergência vem primeiro
  modo = MODO_EMERGENCIA;
  emergenciaDesde = millis();
  TOCAR(SOM_EMERGENCIA);
  if (mandarOuGuardar("emergencia")) falar(AUDIO_EMERGENCIA_ENVIADA);
  else falar(AUDIO_SEM_INTERNET);              // fica na fila, tentando a cada 10 s
  ultimaPosicao = millis();
}

void transporte() {
  LOG("[botão] transporte\n");
  if (!posicao.valida) LOG("[gps] sem posição: o servidor vai recusar o pedido de carro\n");
  String resposta; int status = 0;
  bool ok = mandarOuGuardar("transporte", &resposta, &status);
  if (ok && status >= 200 && status < 300) {
    modo = MODO_TRANSPORTE;
    TOCAR(SOM_CARRO); falar(AUDIO_CARRO_PEDIDO);
  } else {
    // 409: já tem corrida; 422: sem posição ou sem endereço de casa
    TOCAR(SOM_ERRO);
    if (!ok) falar(AUDIO_SEM_INTERNET);
    LOG("[transporte] servidor: %s\n", resposta.c_str());
  }
}

void teste() {
  LOG("[botão] teste\n");
  if (mandarOuGuardar("teste")) { TOCAR(SOM_OK); falar(AUDIO_TESTE_OK); }
  else { TOCAR(SOM_ERRO); falar(AUDIO_SEM_INTERNET); }
}

void tocarRecado(Recado &r) {
  r.vezes++;
  r.tocouEm = millis();
  modo = MODO_MENSAGEM;
  TOCAR(SOM_MENSAGEM);
  falar(r.audio ? r.audio : AUDIO_MENSAGEM_NOVA);
  LOG("[mensagem] \"%s\" (vez %u)\n", r.texto.c_str(), r.vezes);
}

// ---------------------------------------------------------------------------
// Estado no servidor: corrida e mensagens novas
// ---------------------------------------------------------------------------
bool jaConfirmado(uint32_t id) {
  for (uint32_t c : recadosConfirmados) if (c == id) return true;
  return false;
}

void consultarEstado() {
  String resposta;
  int status = pedir("GET", "/pochete/estado", "", &resposta);
  if (status != 200) return;
  JsonDocument doc;
  if (deserializeJson(doc, resposta)) return;

  // Corrida: avisa quando muda
  String novo = doc["corrida"].isNull() ? "" : doc["corrida"]["status"].as<String>();
  if (novo != statusCorrida) {
    LOG("[corrida] %s → %s\n", statusCorrida.c_str(), novo.c_str());
    if (novo == "pendente") modo = MODO_TRANSPORTE;
    else if (novo == "solicitada" || novo == "aprovada") { TOCAR(SOM_CARRO); falar(AUDIO_CARRO_APROVADO); modo = MODO_TRANSPORTE; }
    else if (novo == "a_caminho") { TOCAR(SOM_CARRO); falar(AUDIO_CARRO_CHEGANDO); modo = MODO_TRANSPORTE; }
    else if (statusCorrida == "pendente" && novo == "") { TOCAR(SOM_ERRO); falar(AUDIO_CARRO_RECUSADO); }
    if (novo == "" || novo == "em_andamento") { if (modo == MODO_TRANSPORTE) modo = MODO_NORMAL; }
    statusCorrida = novo;
  }

  // Mensagens: pega a primeira que ainda não foi confirmada aqui
  if (!recadoAtual.id) {
    for (JsonObject r : doc["recados"].as<JsonArray>()) {
      uint32_t id = r["id"];
      if (!id || jaConfirmado(id)) continue;
      recadoAtual.id = id;
      recadoAtual.texto = r["texto"].as<String>();
      recadoAtual.audio = r["audio"] | 0;
      recadoAtual.vezes = 0;
      if (modo != MODO_EMERGENCIA) tocarRecado(recadoAtual);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// GPS
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
  bool emergenciaAtiva = modo == MODO_EMERGENCIA;
  uint32_t intervalo = emergenciaAtiva ? POSICAO_EMERGENCIA_MS : POSICAO_ANDANDO_MS;
  if (t - ultimaPosicao < intervalo || !posicao.valida || t - posicao.quando > GPS_VELHO_MS) return;
  double andou = ultimaEnviada.valida
    ? TinyGPSPlus::distanceBetween(posicao.lat, posicao.lng, ultimaEnviada.lat, ultimaEnviada.lng) : 1e9;
  if (!emergenciaAtiva && andou < 50 && t - ultimaPosicao < POSICAO_PARADA_MS) return;
  ultimaPosicao = t;
  ultimaEnviada = posicao;
  mandarOuGuardar("localizacao");
}

// ---------------------------------------------------------------------------
// setup / loop
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  gpsSerial.setRxBufferSize(2048);     // o GPS não perde frases enquanto a rede trabalha
  gpsSerial.begin(9600, SERIAL_8N1, PINO_GPS_RX, PINO_GPS_TX);

  pinMode(PINO_BOTAO_VERMELHO, INPUT_PULLUP);
  pinMode(PINO_BOTAO_AMARELO, INPUT_PULLUP);
  pinMode(PINO_BOTAO_LATERAL, INPUT_PULLUP);
  pinMode(PINO_BUZZER, OUTPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(PINO_BATERIA, ADC_11db);

  anel.begin();
  anel.setBrightness(60);
  anel.show();

#if USAR_DFPLAYER
  somSerial.begin(9600, SERIAL_8N1, PINO_SOM_RX, PINO_SOM_TX);
  somPronto = som.begin(somSerial);
  if (somPronto) som.volume(26);
  LOG("[som] DFPlayer %s\n", somPronto ? "pronto" : "não respondeu (confira o cartão SD)");
#endif

  // Cão de guarda: se algo travar por 30 s, a pochete reinicia sozinha
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

  bateria = lerBateria();
  LOG("\nELO pochete ligada. Bateria %d%%. Procurando Wi-Fi e satélites...\n", bateria);
  TOCAR(SOM_OK);
  ultimaConsulta = millis() - CONSULTA_ESTADO_MS + 3000;  // primeira consulta logo depois de ligar
}

void loop() {
  esp_task_wdt_reset();
  uint32_t t = millis();

  lerGps();
  lerBotao(vermelho); lerBotao(amarelo); lerBotao(lateral);

  // Vermelho: sempre emergência
  if (vermelho.toque || vermelho.longo) emergencia();

  // Amarelo: com mensagem tocando, só confirma; sem mensagem, pede carro
  if (amarelo.toque) { if (recadoAtual.id) confirmarRecado(); else transporte(); }

  // Lateral: confirma a mensagem / repete a última; segurar 3 s = teste
  if (lateral.toque) {
    if (recadoAtual.id) confirmarRecado();
    else if (ultimoRecado.id) { TOCAR(SOM_MENSAGEM); falar(ultimoRecado.audio ? ultimoRecado.audio : AUDIO_MENSAGEM_NOVA); }
  }
  if (lateral.longo) teste();

  // Fim do modo emergência (a posição continua indo pela rotina normal)
  if (modo == MODO_EMERGENCIA && t - emergenciaDesde > DURACAO_EMERGENCIA_MS) modo = MODO_NORMAL;

  // Mensagem não confirmada: toca de novo de tempos em tempos
  if (recadoAtual.id && modo != MODO_EMERGENCIA && t - recadoAtual.tocouEm > REPETE_MENSAGEM_MS) {
    if (recadoAtual.vezes < MAX_REPETICOES_MENSAGEM) tocarRecado(recadoAtual);
    else { ultimoRecado = recadoAtual; recadoAtual = Recado(); if (modo == MODO_MENSAGEM) modo = MODO_NORMAL; }
  }

  // Bateria
  if (t - ultimaBateria > LEITURA_BATERIA_MS) {
    ultimaBateria = t;
    bateria = lerBateria();
    if (bateria > 25) avisou20 = avisou10 = false;   // carregou
    if ((bateria <= 20 && !avisou20) || (bateria <= 10 && !avisou10)) {
      if (bateria <= 10) avisou10 = true;
      avisou20 = true;
      TOCAR(SOM_BATERIA); falar(AUDIO_BATERIA_BAIXA);
      mandarOuGuardar("bateria");
    }
  }

  mandarPosicaoSePreciso();
  reenviarFila();

  if (t - ultimaConsulta > CONSULTA_ESTADO_MS) { ultimaConsulta = t; consultarEstado(); }

  // Sem GPS conectado (fio solto), como no código base
  static bool avisouGps = false;
  if (!avisouGps && t > 15000 && gps.charsProcessed() < 10) { avisouGps = true; LOG("[gps] nenhum dado do GPS: confira os fios (TX do GPS no GPIO16)\n"); }

  somTick();
  anelTick();
  delay(5);
}
