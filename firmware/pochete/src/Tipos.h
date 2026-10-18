// ============================================================================
// ELO · Tipos compartilhados entre as classes
// ============================================================================
#pragma once
#include <Arduino.h>

// Uma leitura do GPS
struct Posicao {
  double lat = 0, lng = 0;
  bool valida = false;
  uint32_t quando = 0;   // millis() da leitura
};

// O que os botões pedem para a pochete fazer
enum class Acao : uint8_t {
  Emergencia,   // vermelho segurado 3 s
  Uber,         // preto segurado 3 s
};

// Os sons do buzzer (a ordem é a da tabela MELODIAS em Buzzer.cpp)
enum class Som : uint8_t {
  Ligou, TiqueVermelho, TiquePreto, Emergencia, Pedido, Ok, Erro, SemInternet,
  CarroAprovado, CarroChegando, BateriaBaixa, Conectou,
  Total   // não é som: conta quantos existem
};

// Tempo passado desde uma marca de millis() (certo mesmo quando millis() dá a volta)
inline uint32_t desde(uint32_t marca) { return millis() - marca; }
