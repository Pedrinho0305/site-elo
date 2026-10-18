#include "Buzzer.h"

namespace {

// Tons do teste da montagem: vermelho grave (1000 Hz), preto agudo (2500 Hz)
const Nota LIGOU[]          = {{1319, 90}, {0, 40}, {1760, 140}};
const Nota TIQUE_VERMELHO[] = {{1000, 70}};
const Nota TIQUE_PRETO[]    = {{2500, 70}};
const Nota EMERGENCIA[]     = {{1000, 150}, {0, 60}, {1000, 150}, {0, 60}, {1000, 500}};
const Nota PEDIDO[]         = {{2500, 120}, {0, 60}, {2500, 120}};
const Nota OK[]             = {{1319, 90}, {0, 40}, {1760, 140}};
const Nota ERRO[]           = {{392, 250}, {0, 80}, {330, 350}};
const Nota SEM_INTERNET[]   = {{392, 150}, {0, 80}, {392, 150}, {0, 80}, {330, 350}};
const Nota CARRO_APROVADO[] = {{880, 160}, {0, 60}, {1175, 260}};
const Nota CARRO_CHEGANDO[] = {{880, 160}, {0, 60}, {1175, 160}, {0, 60}, {1568, 300}};
const Nota BATERIA_BAIXA[]  = {{659, 200}, {0, 100}, {523, 300}};
const Nota CONECTOU[]       = {{784, 70}, {0, 30}, {1047, 70}, {0, 30}, {1319, 70}, {0, 30}, {1568, 160}};

struct Melodia { const Nota *notas; uint8_t n; };

template <size_t N>
constexpr Melodia melodia(const Nota (&notas)[N]) { return { notas, static_cast<uint8_t>(N) }; }

// Na ordem do enum Som (Tipos.h)
const Melodia MELODIAS[] = {
  melodia(LIGOU), melodia(TIQUE_VERMELHO), melodia(TIQUE_PRETO), melodia(EMERGENCIA),
  melodia(PEDIDO), melodia(OK), melodia(ERRO), melodia(SEM_INTERNET),
  melodia(CARRO_APROVADO), melodia(CARRO_CHEGANDO), melodia(BATERIA_BAIXA),
  melodia(CONECTOU),
};
static_assert(sizeof(MELODIAS) / sizeof(MELODIAS[0]) == static_cast<size_t>(Som::Total),
              "cada Som precisa de uma melodia, na mesma ordem");

}  // namespace

Buzzer::Buzzer(uint8_t pino) : pino_(pino) {}

void Buzzer::iniciar() {
  pinMode(pino_, OUTPUT);
  noTone(pino_);
  fila_ = xQueueCreate(6, sizeof(Som));
}

void Buzzer::tocar(Som som) {
  if (fila_) xQueueSend(fila_, &som, 0);
}

void Buzzer::atualizar(uint32_t agora) {
  Som som;
  if (fila_ && xQueueReceive(fila_, &som, 0) == pdTRUE) {
    const Melodia &m = MELODIAS[static_cast<size_t>(som)];
    nota_ = m.notas;
    restantes_ = m.n;
    ate_ = agora;
  }
  if (!nota_ || static_cast<int32_t>(agora - ate_) < 0) return;

  if (!restantes_) {
    noTone(pino_);
    nota_ = nullptr;
    return;
  }
  if (nota_->freq) tone(pino_, nota_->freq); else noTone(pino_);
  ate_ = agora + nota_->dur;
  nota_++;
  restantes_--;
}
