// ============================================================================
// ELO · Mensagens no Monitor Serial (115200), ligadas com DEPURAR 1 no config.h
// ============================================================================
#pragma once
#include <Arduino.h>
#include "../config.h"

#if DEPURAR
#define LOG(...) Serial.printf(__VA_ARGS__)
#else
#define LOG(...) do {} while (0)
#endif
