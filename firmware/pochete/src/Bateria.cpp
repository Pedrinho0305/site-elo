#include "Bateria.h"

Bateria::Bateria(int8_t pino, float calibracao) : pino_(pino), calibracao_(calibracao) {}

void Bateria::iniciar() {
  if (!existe()) return;
  analogReadResolution(12);
  analogSetPinAttenuation(pino_, ADC_11db);
}

int Bateria::ler() {
  if (!existe()) return -1;
  uint32_t soma = 0;
  for (int i = 0; i < 16; i++) soma += analogReadMilliVolts(pino_);
  float volts = (soma / 16.0f) / 1000.0f * 2.0f * calibracao_;   // divisor 1:2

  // Curva aproximada de descarga da Li-Po (4,2 V cheia, 3,3 V vazia)
  const float v[] = {3.30, 3.50, 3.65, 3.72, 3.78, 3.85, 3.95, 4.05, 4.20};
  const int   p[] = {   0,    5,   15,   30,   45,   60,   75,   90,  100};
  if (volts <= v[0]) return 0;
  for (int i = 1; i < 9; i++) {
    if (volts <= v[i]) return p[i - 1] + (p[i] - p[i - 1]) * (volts - v[i - 1]) / (v[i] - v[i - 1]);
  }
  return 100;
}
