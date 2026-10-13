#include "Controles.h"

Controles::Controles(Buzzer &buzzer, Botao &vermelho, Botao &preto)
  : buzzer_(buzzer), vermelho_(vermelho), preto_(preto) {}

void Controles::iniciar() {
  buzzer_.iniciar();
  vermelho_.iniciar();
  preto_.iniciar();
  acoes_ = xQueueCreate(6, sizeof(Acao));
  xTaskCreatePinnedToCore(tarefa, "controles", 4096, this, 2, nullptr, 1);
}

bool Controles::proximaAcao(Acao &acao) {
  return acoes_ && xQueueReceive(acoes_, &acao, 0) == pdTRUE;
}

void Controles::tarefa(void *controles) {
  Controles &c = *static_cast<Controles *>(controles);
  for (;;) {
    uint32_t agora = millis();
    c.tratar(c.vermelho_.ler(agora), Acao::Emergencia, Som::TiqueVermelho);
    c.tratar(c.preto_.ler(agora), Acao::Uber, Som::TiquePreto);
    c.buzzer_.atualizar(agora);
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void Controles::tratar(Botao::Evento evento, Acao acaoAo3s, Som tique) {
  Acao acao;
  switch (evento) {
    case Botao::Evento::Tique:
      buzzer_.tocar(tique);
      return;

    case Botao::Evento::Ativado:
      acao = acaoAo3s;
      if (acao == Acao::Uber && mensagemTocando_) acao = Acao::ToqueCurto;
      // O som sai na hora, antes de a pochete falar com o servidor
      buzzer_.tocar(acao == Acao::Emergencia ? Som::Emergencia : acao == Acao::Uber ? Som::Pedido : Som::Ok);
      break;

    case Botao::Evento::ToqueCurto:
      acao = Acao::ToqueCurto;
      break;

    default:
      return;
  }
  xQueueSend(acoes_, &acao, 0);
}
