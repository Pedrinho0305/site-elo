#include "Gps.h"

Gps::Gps(HardwareSerial &serial, int8_t rx, int8_t tx) : serial_(serial), rx_(rx), tx_(tx) {}

void Gps::iniciar() {
  serial_.setRxBufferSize(2048);   // o GPS não perde frases enquanto a rede trabalha
  serial_.begin(9600, SERIAL_8N1, rx_, tx_);
}

void Gps::ler() {
  while (serial_.available() > 0) {
    if (gps_.encode(serial_.read()) && gps_.location.isUpdated() && gps_.location.isValid()) {
      posicao_.lat = gps_.location.lat();
      posicao_.lng = gps_.location.lng();
      posicao_.valida = true;
      posicao_.quando = millis();
    }
  }
}

bool Gps::recente(uint32_t idadeMaxima) const {
  return posicao_.valida && desde(posicao_.quando) < idadeMaxima;
}

double Gps::distancia(const Posicao &a, const Posicao &b) {
  return TinyGPSPlus::distanceBetween(a.lat, a.lng, b.lat, b.lng);
}
