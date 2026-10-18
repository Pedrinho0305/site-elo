// ============================================================================
// ELO · Controles: os dois botões e o buzzer, numa tarefa própria do ESP32
// ----------------------------------------------------------------------------
// Roda separado do loop principal: enquanto a pochete espera o servidor
// (alguns segundos), a contagem dos 3 s e os sons continuam funcionando.
// O loop busca as ações com proximaAcao().
// ============================================================================
#pragma once
#include <Arduino.h>
#include "Botao.h"
#include "Buzzer.h"
#include "Tipos.h"

class Controles {
public:
  Controles(Buzzer &buzzer, Botao &vermelho, Botao &preto);

  void iniciar();
  bool proximaAcao(Acao &acao);

private:
  static void tarefa(void *controles);
  void tratar(Botao::Evento evento, Acao acaoAo3s, Som tique);

  Buzzer &buzzer_;
  Botao &vermelho_, &preto_;
  QueueHandle_t acoes_ = nullptr;
};
