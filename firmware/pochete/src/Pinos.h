// ============================================================================
// ELO · Pinos da montagem (ESP32 DevKit V1) — tabela em firmware/README.md
// ============================================================================
#pragma once
#include <Arduino.h>
#include "../config.h"

constexpr int8_t  PINO_GPS_RX         = 16;   // TX do módulo GPS → GPIO16
constexpr int8_t  PINO_GPS_TX         = 17;
constexpr uint8_t PINO_BOTAO_VERMELHO = 22;   // botão entre o pino e o GND (pull-up interno)
constexpr uint8_t PINO_BOTAO_PRETO    = 18;
constexpr uint8_t PINO_BUZZER         = 23;   // buzzer: + no pino, − no GND

// Bateria: opcional, no config.h (-1 = a montagem não mede a bateria)
#ifndef PINO_BATERIA
#define PINO_BATERIA -1
#endif
#ifndef BATERIA_CALIBRACAO
#define BATERIA_CALIBRACAO 1.0f
#endif
