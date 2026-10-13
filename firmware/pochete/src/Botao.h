// ============================================================================
// ELO · Um botão físico, com debounce e ativação por 3 s segurando
// ----------------------------------------------------------------------------
// Ligado entre o pino e o GND, com o pull-up interno: solto = HIGH,
// apertado = LOW. ler() devolve no máximo um evento por chamada.
// ============================================================================
#pragma once
#include <Arduino.h>

class Botao {
public:
  enum class Evento : uint8_t {
    Nenhum,
    Tique,        // completou mais um segundo segurando (1 s e 2 s)
    Ativado,      // chegou aos 3 s: dispara a ação (uma vez por aperto)
    ToqueCurto,   // soltou antes dos 3 s
  };

  static constexpr uint32_t SEGURAR_MS  = 3000;
  static constexpr uint32_t DEBOUNCE_MS = 30;

  Botao(const char *nome, uint8_t pino);

  void iniciar();
  Evento ler(uint32_t agora);
  const char *nome() const { return nome_; }

private:
  const char *nome_;
  uint8_t pino_;
  bool apertado_ = false;     // estado estável, depois do debounce
  bool ativado_ = false;      // já passou dos 3 s neste aperto?
  uint8_t bipes_ = 0;         // segundos já avisados neste aperto
  uint32_t mudouEm_ = 0, apertouEm_ = 0;
};
