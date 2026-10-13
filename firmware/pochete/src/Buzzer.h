// ============================================================================
// ELO · Buzzer: toca melodias sem travar o programa
// ----------------------------------------------------------------------------
// tocar() pode ser chamado de qualquer tarefa (o pedido entra numa fila);
// atualizar() roda na tarefa dos Controles e toca nota por nota.
// Um som novo interrompe o que estiver tocando.
// ============================================================================
#pragma once
#include <Arduino.h>
#include "Tipos.h"

// Uma nota: frequência em Hz (0 = pausa) e duração em ms
struct Nota { uint16_t freq, dur; };

class Buzzer {
public:
  explicit Buzzer(uint8_t pino);

  void iniciar();
  void tocar(Som som);
  void atualizar(uint32_t agora);

private:
  uint8_t pino_;
  QueueHandle_t fila_ = nullptr;
  const Nota *nota_ = nullptr;   // próxima nota da melodia em curso
  uint8_t restantes_ = 0;
  uint32_t ate_ = 0;             // quando a nota atual acaba
};
