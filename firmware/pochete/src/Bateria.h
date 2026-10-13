// ============================================================================
// ELO · Bateria Li-Po 3,7 V (opcional)
// ----------------------------------------------------------------------------
// Mede pelo meio de um divisor 100 kΩ + 100 kΩ ligado num pino analógico.
// PINO_BATERIA = -1 no config.h: a montagem não mede e ler() devolve -1.
// ============================================================================
#pragma once
#include <Arduino.h>

class Bateria {
public:
  Bateria(int8_t pino, float calibracao);

  void iniciar();
  bool existe() const { return pino_ >= 0; }
  int ler();   // 0 a 100 (%), ou -1 sem medição

private:
  int8_t pino_;
  float calibracao_;
};
