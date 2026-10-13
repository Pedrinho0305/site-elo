// ============================================================================
// ELO · GPS (TinyGPSPlus na Serial2, como no código de teste da montagem)
// ============================================================================
#pragma once
#include <Arduino.h>
#include <TinyGPSPlus.h>
#include "Tipos.h"

class Gps {
public:
  Gps(HardwareSerial &serial, int8_t rx, int8_t tx);

  void iniciar();
  void ler();                                  // chamar sempre: lê o que chegou, sem esperar
  const Posicao &posicao() const { return posicao_; }
  bool recente(uint32_t idadeMaxima) const;    // tem posição mais nova que isso?
  uint32_t satelites() { return gps_.satellites.value(); }
  bool semDados() const { return gps_.charsProcessed() < 10; }   // fio solto?

  static double distancia(const Posicao &a, const Posicao &b);   // em metros

private:
  HardwareSerial &serial_;
  int8_t rx_, tx_;
  TinyGPSPlus gps_;
  Posicao posicao_;
};
