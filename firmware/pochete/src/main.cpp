// ============================================================================
// ELO · Firmware da pochete (ESP32) — ponto de entrada
// ----------------------------------------------------------------------------
// Monta as peças e roda a pochete. Cada parte está na sua classe:
//   Botao      um botão com debounce e ativação por 3 s
//   Buzzer     melodias sem travar o programa
//   Controles  os dois botões e o buzzer, numa tarefa própria do ESP32
//   Gps        a posição (TinyGPSPlus na Serial2)
//   Bateria    a carga (opcional, PINO_BATERIA no config.h)
//   Servidor   Wi-Fi e https com o site (contrato em backend/README.md)
//   Pochete    as regras: emergência, Uber, posição, bateria
// ============================================================================
#include <Arduino.h>
#include <esp_task_wdt.h>
#include "Pinos.h"
#include "Pochete.h"

namespace {
Buzzer    buzzer(PINO_BUZZER);
Botao     vermelho("VERMELHO (D22)", PINO_BOTAO_VERMELHO);
Botao     preto("PRETO (D18)", PINO_BOTAO_PRETO);
Controles controles(buzzer, vermelho, preto);
Gps       gps(Serial2, PINO_GPS_RX, PINO_GPS_TX);
Bateria   bateria(PINO_BATERIA, BATERIA_CALIBRACAO);
Servidor  servidor;
Pochete   pochete(servidor, gps, controles, buzzer, bateria);

// Cão de guarda: se o loop travar por 30 s, a pochete reinicia sozinha
void ligarCaoDeGuarda() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t guarda = { .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true };
  if (esp_task_wdt_reconfigure(&guarda) != ESP_OK) esp_task_wdt_init(&guarda);   // já vem ligado ou não, conforme a versão
#else
  esp_task_wdt_init(30, true);
#endif
  esp_task_wdt_add(nullptr);
}
}  // namespace

void setup() {
  Serial.begin(115200);
  ligarCaoDeGuarda();
  pochete.iniciar();
}

void loop() {
  esp_task_wdt_reset();
  pochete.atualizar();
  delay(5);
}
