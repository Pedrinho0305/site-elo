// ============================================================================
// ELO · Teste do GPS falando com o site (ESP32)
// ----------------------------------------------------------------------------
// O código de teste do GPS, agora mandando a posição para o servidor da ELO.
// Mostra a localização no Monitor Serial (115200) e, a cada 30 s com sinal
// do GPS, manda para o site. A posição aparece no Painel (mapa "Onde está
// agora") e em Relatórios.
//
// É a mesma rota que a pochete completa usa (firmware/pochete):
//   POST /api/pochete/evento   { "tipo": "localizacao", "lat": ..., "lng": ... }
//   Cabeçalho X-Pochete-Key com a chave da pochete.
//
// Placa: ESP32 Dev Module. Bibliotecas: TinyGPSPlus · ArduinoJson (7.x)
// Antes de gravar: copie config.example.h para config.h e preencha o Wi-Fi
// e a chave (Painel → Pochete e avisos → Vincular uma pochete).
// ============================================================================
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

#include "config.h"
#include "certificados.h"

TinyGPSPlus gps;
#define gpsSerial Serial2

const uint32_t ENVIO_MS   = 30000;  // manda a posição a cada 30 s
const uint32_t MOSTRAR_MS = 2000;   // mostra no Serial a cada 2 s (não a cada frase do GPS)

uint32_t ultimoEnvio = 0, ultimaTela = 0;

void setup() {
  Serial.begin(115200);
  gpsSerial.setRxBufferSize(1024);   // não perde frases do GPS enquanto manda para o site
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  Serial.print("Conectando ao Wi-Fi \"");
  Serial.print(WIFI_1_NOME);
  Serial.print("\"");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_1_NOME, WIFI_1_SENHA);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(500); Serial.print("."); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " conectado!" : " não conectou (vou tentar de novo ao enviar)");

  Serial.println("Waiting for GPS fix and satellites...");
}

void loop() {
  // Lê tudo que o GPS mandou (sem delay: com delay(1000) a serial enche e perde frases)
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());

  uint32_t agora = millis();

  if (agora - ultimaTela > MOSTRAR_MS && gps.charsProcessed() > 10) {
    ultimaTela = agora;
    displayLocationInfo();
  }

  if (gps.location.isValid() && gps.location.age() < 5000 && agora - ultimoEnvio > ENVIO_MS) {
    ultimoEnvio = agora;
    enviarPosicao(gps.location.lat(), gps.location.lng());
  }

  // Fio solto: avisa uma vez e continua tentando (antes travava aqui para sempre)
  static bool avisou = false;
  if (!avisou && agora > 5000 && gps.charsProcessed() < 10) {
    avisou = true;
    Serial.println(F("No GPS detected: check wiring."));
  }
}

// Manda a posição para o site, como a pochete faz
void enviarPosicao(double lat, double lng) {
  Serial.println(F("========== Enviando para o site =========="));

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sem Wi-Fi, reconectando...");
    WiFi.reconnect();
    for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) delay(250);
    if (WiFi.status() != WL_CONNECTED) { Serial.println("Ainda sem Wi-Fi. Tento de novo em 30 s."); return; }
  }

  JsonDocument doc;
  doc["tipo"] = "localizacao";
  doc["lat"] = lat;
  doc["lng"] = lng;
  String corpo;
  serializeJson(doc, corpo);

  WiFiClientSecure cliente;
  cliente.setCACert(CERTIFICADOS);   // só conversa com o servidor verdadeiro
  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(cliente, String(ELO_API) + "/pochete/evento")) { Serial.println("Endereço do servidor inválido (confira ELO_API)."); return; }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Pochete-Key", POCHETE_CHAVE);

  int status = http.POST(corpo);
  String resposta = status > 0 ? http.getString() : "";
  http.end();

  Serial.print("Posição: ");
  Serial.print(lat, 6); Serial.print(", "); Serial.println(lng, 6);
  Serial.print("Resposta do servidor: ");
  Serial.println(status);

  if (status == 201) {
    Serial.println("OK! Abra o Painel do site: a posição aparece em \"Onde está agora\".");
  } else if (status < 0) {
    Serial.print("Não conectou ao servidor: ");
    Serial.println(HTTPClient::errorToString(status));
  } else {
    JsonDocument erro;                 // o servidor explica o problema em { "erro": "..." }
    if (!deserializeJson(erro, resposta) && erro["erro"].is<const char *>()) Serial.println(erro["erro"].as<const char *>());
    else Serial.println(resposta);
    if (status == 401) Serial.println("Confira a POCHETE_CHAVE no config.h (Painel → Pochete e avisos).");
  }
  Serial.println(F("=========================================="));
}

void displayLocationInfo() {
  Serial.println(F("-------------------------------------"));
  Serial.println("\n Location Info:");

  Serial.print("Latitude:  ");
  Serial.print(gps.location.lat(), 6);
  Serial.print(" ");
  Serial.println(gps.location.rawLat().negative ? "S" : "N");

  Serial.print("Longitude: ");
  Serial.print(gps.location.lng(), 6);
  Serial.print(" ");
  Serial.println(gps.location.rawLng().negative ? "W" : "E");

  Serial.print("Fix Quality: ");
  Serial.println(gps.location.isValid() ? "Valid" : "Invalid");

  Serial.print("Satellites: ");
  Serial.println(gps.satellites.value());

  Serial.print("Altitude:   ");
  Serial.print(gps.altitude.meters());
  Serial.println(" m");

  Serial.print("Speed:      ");
  Serial.print(gps.speed.kmph());
  Serial.println(" km/h");

  Serial.print("Course:     ");
  Serial.print(gps.course.deg());
  Serial.println("°");

  Serial.print("Date:       ");
  if (gps.date.isValid()) {
    Serial.printf("%02d/%02d/%04d\n", gps.date.day(), gps.date.month(), gps.date.year());
  } else {
    Serial.println("Invalid");
  }

  Serial.print("Time (UTC): ");
  if (gps.time.isValid()) {
    Serial.printf("%02d:%02d:%02d\n", gps.time.hour(), gps.time.minute(), gps.time.second());
  } else {
    Serial.println("Invalid");
  }

  Serial.println(F("-------------------------------------"));
}
