#include "Servidor.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include "../config.h"
#include "certificados.h"
#include "Log.h"

void Servidor::iniciar() {
  WiFi.mode(WIFI_STA);
  // Até 3 redes, tentadas na ordem (casa, celular roteando...)
  if (strlen(WIFI_1_NOME)) wifi_.addAP(WIFI_1_NOME, WIFI_1_SENHA);
  if (strlen(WIFI_2_NOME)) wifi_.addAP(WIFI_2_NOME, WIFI_2_SENHA);
  if (strlen(WIFI_3_NOME)) wifi_.addAP(WIFI_3_NOME, WIFI_3_SENHA);
}

bool Servidor::conectar() {
  // WiFiMulti procura as redes do config.h e entra na de sinal mais forte
  return wifi_.run(5000) == WL_CONNECTED;
}

bool Servidor::online() const {
  return WiFi.status() == WL_CONNECTED;
}

String Servidor::rede() const {
  return WiFi.SSID();
}

namespace {
// O servidor bloqueia por 15 min a rede que erra a chave 30 vezes (até a
// chave certa). Com a chave recusada, a pochete espera antes de tentar de novo.
constexpr uint32_t ESPERA_CHAVE_RECUSADA_MS = 10UL * 60000;
}  // namespace

bool Servidor::chaveDeExemplo() {
  return strcmp(POCHETE_CHAVE, "elo_COLE_A_CHAVE_AQUI") == 0 || strlen(POCHETE_CHAVE) < 10;
}

Resposta Servidor::pedir(const char *metodo, const String &rota, const String &corpo, String *resposta) {
  Resposta r;
  if (chaveDeExemplo() || (chaveRecusada_ && desde(chaveRecusadaEm_) < ESPERA_CHAVE_RECUSADA_MS)) {
    r.status = 401;
    r.erro = chaveDeExemplo() ? "falta a chave da pochete no config.h" : "chave da pochete recusada pelo servidor";
    return r;
  }
  if (!conectar()) {
    LOG("[rede] sem Wi-Fi\n");
    r.status = -1;
    return r;
  }

  WiFiClientSecure cliente;
  cliente.setCACert(CERTIFICADOS);   // só conversa com o servidor verdadeiro
  HTTPClient http;
  http.setTimeout(8000);
  http.setConnectTimeout(8000);
  if (!http.begin(cliente, String(ELO_API) + rota)) {
    r.status = -2;
    return r;
  }
  http.addHeader("X-Pochete-Key", POCHETE_CHAVE);
  http.addHeader("Content-Type", "application/json");

  r.status = http.sendRequest(metodo, corpo);
  String texto = r.status > 0 ? http.getString() : String();
  http.end();
  esp_task_wdt_reset();
  LOG("[http] %s %s → %d\n", metodo, rota.c_str(), r.status);

  if (r.status > 0 && !r.ok()) {
    // O servidor explica o problema em { "erro": "..." }
    JsonDocument doc;
    r.erro = !deserializeJson(doc, texto) && doc["erro"].is<const char *>() ? doc["erro"].as<String>() : texto;
  }
  if (r.status == 401) {
    chaveRecusada_ = true;
    chaveRecusadaEm_ = millis();
    LOG("\n[chave] O SITE RECUSOU A CHAVE DA POCHETE (%s).\n"
        "        Painel → Pochete e avisos → \"Nova chave\", cole em POCHETE_CHAVE no config.h e grave de novo.\n"
        "        Para não ser bloqueada, a pochete só tenta de novo em 10 min.\n\n", r.erro.c_str());
  } else if (r.status > 0) {
    chaveRecusada_ = false;
  }
  if (r.status == 429) LOG("[http] o servidor pediu calma: muitas tentativas desta rede. Espere uns 15 min.\n");
  if (resposta) *resposta = texto;
  return r;
}

Resposta Servidor::enviarEvento(const char *tipo, const Posicao *posicao, int bateria) {
  JsonDocument doc;
  doc["tipo"] = tipo;
  if (posicao) {
    doc["lat"] = posicao->lat;
    doc["lng"] = posicao->lng;
  }
  if (bateria >= 0) doc["bateria"] = bateria;
  String corpo;
  serializeJson(doc, corpo);
  return pedir("POST", "/pochete/evento", corpo, nullptr);
}

EstadoServidor Servidor::consultarEstado() {
  EstadoServidor estado;
  String texto;
  if (pedir("GET", "/pochete/estado", "", &texto).status != 200) return estado;

  JsonDocument doc;
  if (deserializeJson(doc, texto)) return estado;

  estado.ok = true;
  if (!doc["corrida"].isNull()) estado.corrida = doc["corrida"]["status"].as<String>();
  return estado;
}
