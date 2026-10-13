#include "Botao.h"
#include "Log.h"

Botao::Botao(const char *nome, uint8_t pino) : nome_(nome), pino_(pino) {}

void Botao::iniciar() {
  pinMode(pino_, INPUT_PULLUP);
}

Botao::Evento Botao::ler(uint32_t agora) {
  bool leitura = digitalRead(pino_) == LOW;

  // Mudou de estado (ignora o "chiado" do contato nos primeiros 30 ms)
  if (leitura != apertado_ && agora - mudouEm_ > DEBOUNCE_MS) {
    apertado_ = leitura;
    mudouEm_ = agora;
    if (apertado_) {
      apertouEm_ = agora;
      ativado_ = false;
      bipes_ = 0;
      LOG("[botão] %s apertado... segure 3 s\n", nome_);
      return Evento::Nenhum;
    }
    if (!ativado_) {
      LOG("[botão] %s solto antes de 3 s\n", nome_);
      return Evento::ToqueCurto;
    }
    return Evento::Nenhum;
  }

  if (!apertado_ || ativado_) return Evento::Nenhum;

  uint32_t segurando = agora - apertouEm_;
  if (segurando >= SEGURAR_MS) {
    ativado_ = true;
    LOG("[botão] %s ATIVADO (3 s)\n", nome_);
    return Evento::Ativado;
  }
  if (segurando / 1000 > bipes_) {
    bipes_ = segurando / 1000;
    return Evento::Tique;
  }
  return Evento::Nenhum;
}
