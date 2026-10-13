#include "Pochete.h"
#include <WiFi.h>
#include "Log.h"

namespace {
constexpr uint32_t CONSULTA_ESTADO_MS      = 15000;        // pergunta por corrida e mensagens
constexpr uint32_t POSICAO_ANDANDO_MS      = 2UL * 60000;  // manda a posição se andou mais de 50 m
constexpr uint32_t POSICAO_PARADA_MS       = 10UL * 60000;
constexpr uint32_t POSICAO_EMERGENCIA_MS   = 30000;
constexpr uint32_t DURACAO_EMERGENCIA_MS   = 10UL * 60000;
constexpr uint32_t REENVIO_MS              = 10000;        // emergência que não saiu
constexpr uint32_t REPETE_MENSAGEM_MS      = 30000;        // mensagem não confirmada toca de novo
constexpr uint8_t  MAX_REPETICOES_MENSAGEM = 10;
constexpr uint32_t LEITURA_BATERIA_MS      = 60000;
constexpr uint32_t GPS_VELHO_MS            = 10UL * 60000; // posição mais velha que isso não vale
constexpr double   ANDOU_METROS            = 50;
constexpr uint32_t TENTA_WIFI_MS           = 10000;        // sem rede: procura de novo
}  // namespace

Pochete::Pochete(Servidor &servidor, Gps &gps, Controles &controles, Buzzer &buzzer, Bateria &bateria)
  : servidor_(servidor), gps_(gps), controles_(controles), buzzer_(buzzer), bateria_(bateria) {}

void Pochete::iniciar() {
  controles_.iniciar();
  gps_.iniciar();
  bateria_.iniciar();
  servidor_.iniciar();

  nivelBateria_ = bateria_.ler();
  LOG("\nELO pochete ligada. Procurando Wi-Fi e satélites...\n");
  LOG("Segure o VERMELHO 3 s = emergência · segure o PRETO 3 s = Uber\n");
  if (bateria_.existe()) LOG("Bateria: %d%%\n", nivelBateria_);
  buzzer_.tocar(Som::Ligou);

  // Já procura o Wi-Fi ao ligar: o som diz se deu certo (útil longe do computador)
  ultimaTentativaWifi_ = millis();
  if (!servidor_.conectar()) {
    LOG("[wi-fi] nenhuma rede do config.h encontrada; tento de novo a cada 10 s\n");
    buzzer_.tocar(Som::SemInternet);
  }
  verificarWifi();

  if (Servidor::chaveDeExemplo()) {
    LOG("\n[chave] FALTA A CHAVE DA POCHETE no config.h (POCHETE_CHAVE ainda é a de exemplo).\n"
        "        Painel → Pochete e avisos → Vincular uma pochete (ou \"Nova chave\"), cole a chave\n"
        "        elo_... em POCHETE_CHAVE e grave de novo. Até lá, nada é enviado ao site.\n\n");
  }

  ultimaConsulta_ = millis() - CONSULTA_ESTADO_MS + 3000;   // primeira consulta logo depois de ligar
  ultimaBateria_ = millis();
}

// Toca um som quando o Wi-Fi conecta ou cai (só na mudança)
void Pochete::verificarWifi() {
  if (!servidor_.online() && desde(ultimaTentativaWifi_) > TENTA_WIFI_MS) {
    ultimaTentativaWifi_ = millis();
    servidor_.conectar();
  }
  bool agora = servidor_.online();
  if (agora == online_) return;
  online_ = agora;
  if (agora) {
    LOG("[wi-fi] conectado em \"%s\" (IP %s)\n", servidor_.rede().c_str(), WiFi.localIP().toString().c_str());
    buzzer_.tocar(Som::Conectou);
  } else {
    LOG("[wi-fi] conexão perdida; procurando de novo\n");
    buzzer_.tocar(Som::SemInternet);
  }
}

// Os tempos são medidos com desde() na hora de cada comparação: as ações
// esperam o servidor por alguns segundos e mudam as marcas no meio do caminho.
void Pochete::atualizar() {
  gps_.ler();

  Acao acao;
  while (controles_.proximaAcao(acao)) {
    switch (acao) {
      case Acao::Emergencia: emergencia(); break;
      case Acao::Uber:       pedirUber(); break;
      case Acao::ToqueCurto: if (recado_.id) confirmarRecado(); break;
    }
  }

  if (emergenciaPendente_ && desde(ultimoReenvio_) > REENVIO_MS) mandarEmergencia();
  if (emergenciaAtiva_ && desde(emergenciaDesde_) > DURACAO_EMERGENCIA_MS) {
    emergenciaAtiva_ = false;
    LOG("[emergência] fim dos 10 min: posição volta ao normal\n");
  }

  if (recado_.id && !emergenciaAtiva_ && desde(recado_.tocouEm) > REPETE_MENSAGEM_MS) {
    if (recado_.vezes < MAX_REPETICOES_MENSAGEM) tocarRecado(); else esquecerRecado();
  }

  verificarWifi();

  // Chave faltando ou recusada: som de erro uma vez (depois do som de "conectou")
  if (millis() > 8000 && servidor_.chaveRecusada() != avisouChave_) {
    avisouChave_ = servidor_.chaveRecusada();
    if (avisouChave_) buzzer_.tocar(Som::Erro);
  }

  verificarBateria();
  mandarPosicaoSePreciso();

  if (desde(ultimaConsulta_) > CONSULTA_ESTADO_MS) {
    ultimaConsulta_ = millis();
    mandarConfirmacao();   // confirmação que ficou sem internet
    consultarEstado();
  }

  if (!avisouGps_ && millis() > 15000 && gps_.semDados()) {
    avisouGps_ = true;
    LOG("[gps] nenhum dado do GPS: confira os fios (TX do GPS no GPIO16)\n");
  }
}

// ---------------------------------------------------------------------------
// Ações dos botões
// ---------------------------------------------------------------------------
Resposta Pochete::enviar(const char *tipo) {
  // Sem posição recente, o servidor usa a última que recebeu
  const Posicao *posicao = gps_.recente(GPS_VELHO_MS) ? &gps_.posicao() : nullptr;
  return servidor_.enviarEvento(tipo, posicao, nivelBateria_);
}

void Pochete::emergencia() {
  if (recado_.id) confirmarRecado();   // ouviu a mensagem, mas a emergência vem primeiro
  emergenciaAtiva_ = true;
  emergenciaDesde_ = millis();
  ultimaPosicao_ = millis();
  mandarEmergencia();
}

void Pochete::mandarEmergencia() {
  Resposta r = enviar("emergencia");
  ultimoReenvio_ = millis();
  if (r.ok()) {
    emergenciaPendente_ = false;
    LOG("[emergência] cuidador avisado\n");
    buzzer_.tocar(Som::Ok);
  } else if (r.recusado()) {
    emergenciaPendente_ = false;        // chave errada etc.: repetir não resolve
    LOG("[emergência] servidor recusou: %s\n", r.erro.c_str());
    buzzer_.tocar(Som::Erro);
  } else {
    emergenciaPendente_ = true;         // sem internet: tenta a cada 10 s
    LOG("[emergência] não saiu, tentando de novo em 10 s\n");
    buzzer_.tocar(Som::SemInternet);
  }
}

void Pochete::pedirUber() {
  if (!gps_.recente(GPS_VELHO_MS)) LOG("[gps] sem posição agora: o servidor usa a última que recebeu\n");
  Resposta r = enviar("transporte");
  if (r.ok()) {
    statusCorrida_ = "pendente";
    LOG("[uber] pedido enviado, esperando o cuidador aprovar no painel\n");
    buzzer_.tocar(Som::Ok);
  } else if (r.semRede()) {
    // Pedido de carro não fica guardado: chegaria atrasado, quando a pessoa
    // talvez nem precise mais. Ela aperta de novo.
    LOG("[uber] sem internet: aperte de novo depois\n");
    buzzer_.tocar(Som::SemInternet);
  } else {
    // 409: já tem corrida; 422: sem posição ou sem endereço de casa no painel
    LOG("[uber] servidor recusou (%d): %s\n", r.status, r.erro.c_str());
    buzzer_.tocar(Som::Erro);
  }
}

// ---------------------------------------------------------------------------
// Mensagens do cuidador
// ---------------------------------------------------------------------------
void Pochete::tocarRecado() {
  recado_.vezes++;
  recado_.tocouEm = millis();
  controles_.mensagemTocando(true);
  buzzer_.tocar(Som::Mensagem);
  LOG("[mensagem] \"%s\" (vez %u) — toque um botão para confirmar\n", recado_.texto.c_str(), recado_.vezes);
}

void Pochete::confirmarRecado() {
  LOG("[mensagem] confirmada: \"%s\"\n", recado_.texto.c_str());
  recadosConfirmados_[posConfirmados_++ % 8] = recado_.id;
  confirmarPendente_ = recado_.id;
  esquecerRecado();
  buzzer_.tocar(Som::Ok);
  mandarConfirmacao();   // se falhar, tenta de novo na próxima consulta
}

void Pochete::mandarConfirmacao() {
  if (!confirmarPendente_) return;
  Resposta r = servidor_.confirmarRecado(confirmarPendente_);
  if (r.ok() || r.recusado()) confirmarPendente_ = 0;   // 4xx: mensagem apagada, não insiste
}

void Pochete::esquecerRecado() {
  recado_ = Recado();
  controles_.mensagemTocando(false);
}

bool Pochete::jaConfirmado(uint32_t id) const {
  for (uint32_t c : recadosConfirmados_) if (c == id) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Rotinas
// ---------------------------------------------------------------------------
void Pochete::consultarEstado() {
  EstadoServidor estado = servidor_.consultarEstado();
  if (!estado.ok) return;

  // Corrida: avisa quando o status muda
  if (estado.corrida != statusCorrida_) {
    LOG("[uber] %s → %s\n", statusCorrida_.length() ? statusCorrida_.c_str() : "(nenhuma)",
        estado.corrida.length() ? estado.corrida.c_str() : "(nenhuma)");
    if (estado.corrida == "aprovada" || estado.corrida == "solicitada") buzzer_.tocar(Som::CarroAprovado);
    else if (estado.corrida == "a_caminho") buzzer_.tocar(Som::CarroChegando);
    else if (statusCorrida_ == "pendente" && estado.corrida.isEmpty()) {
      LOG("[uber] o cuidador recusou o pedido\n");
      buzzer_.tocar(Som::Erro);
    }
    statusCorrida_ = estado.corrida;
  }

  // Mensagens: pega a primeira que ainda não foi confirmada aqui
  if (recado_.id) return;
  for (uint8_t i = 0; i < estado.totalRecados; i++) {
    const RecadoServidor &r = estado.recados[i];
    if (!r.id || jaConfirmado(r.id)) continue;
    recado_.id = r.id;
    recado_.texto = r.texto;
    recado_.vezes = 0;
    if (!emergenciaAtiva_) tocarRecado();
    else controles_.mensagemTocando(true);
    break;
  }
}

void Pochete::mandarPosicaoSePreciso() {
  if (!gps_.recente(GPS_VELHO_MS)) return;
  // A primeira posição depois de ligar vai na hora; as outras, no intervalo
  uint32_t intervalo = emergenciaAtiva_ ? POSICAO_EMERGENCIA_MS : POSICAO_ANDANDO_MS;
  if (ultimaEnviada_.valida && desde(ultimaPosicao_) < intervalo) return;

  const Posicao &agora = gps_.posicao();
  double andou = ultimaEnviada_.valida ? Gps::distancia(agora, ultimaEnviada_) : 1e9;
  if (!emergenciaAtiva_ && andou < ANDOU_METROS && desde(ultimaPosicao_) < POSICAO_PARADA_MS) return;

  ultimaPosicao_ = millis();
  ultimaEnviada_ = agora;
  LOG("[gps] %.6f, %.6f (%lu satélites)\n", agora.lat, agora.lng, static_cast<unsigned long>(gps_.satelites()));
  enviar("localizacao");   // não saiu? a próxima vai
}

void Pochete::verificarBateria() {
  if (!bateria_.existe() || desde(ultimaBateria_) < LEITURA_BATERIA_MS) return;
  ultimaBateria_ = millis();
  nivelBateria_ = bateria_.ler();

  if (nivelBateria_ > 25) avisou20_ = avisou10_ = false;   // carregou
  bool avisar = (nivelBateria_ <= 20 && !avisou20_) || (nivelBateria_ <= 10 && !avisou10_);
  if (!avisar) return;
  if (nivelBateria_ <= 10) avisou10_ = true;
  avisou20_ = true;
  LOG("[bateria] %d%%: avisando o cuidador\n", nivelBateria_);
  buzzer_.tocar(Som::BateriaBaixa);
  enviar("bateria");
}
