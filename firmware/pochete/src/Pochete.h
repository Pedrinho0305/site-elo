// ============================================================================
// ELO · Pochete: as regras de funcionamento (o que o site promete)
// ----------------------------------------------------------------------------
//   · Vermelho segurado 3 s → emergência: o servidor avisa o cuidador (painel,
//     Telegram) e os familiares (e-mail) com a localização. A posição vai a
//     cada 30 s por 10 min. Sem internet, tenta de novo a cada 10 s.
//   · Preto segurado 3 s → pede Uber: a corrida espera o cuidador aprovar no
//     painel; a pochete apita quando o carro é chamado e quando ele vem.
//   · Mensagens do cuidador: tocam a cada 30 s (até 10 vezes); um toque curto
//     em qualquer botão confirma e o painel mostra "ouviu".
//   · Localização em tempo real: a cada 2 min se andou, 10 min parada.
//   · Bateria (se a montagem medir): aviso com 20% e com 10%.
// ============================================================================
#pragma once
#include <Arduino.h>
#include "Bateria.h"
#include "Buzzer.h"
#include "Controles.h"
#include "Gps.h"
#include "Servidor.h"
#include "Tipos.h"

class Pochete {
public:
  Pochete(Servidor &servidor, Gps &gps, Controles &controles, Buzzer &buzzer, Bateria &bateria);

  void iniciar();
  void atualizar();   // chamar no loop()

private:
  struct Recado {
    uint32_t id = 0;
    String texto;
    uint8_t vezes = 0;
    uint32_t tocouEm = 0;
  };

  // Ações
  void emergencia();
  void mandarEmergencia();
  void pedirUber();

  // Mensagens do cuidador
  void tocarRecado();
  void confirmarRecado();
  void mandarConfirmacao();
  void esquecerRecado();
  bool jaConfirmado(uint32_t id) const;

  // Rotinas
  void consultarEstado();
  void mandarPosicaoSePreciso();
  void verificarBateria();
  void verificarWifi();
  Resposta enviar(const char *tipo);

  Servidor &servidor_;
  Gps &gps_;
  Controles &controles_;
  Buzzer &buzzer_;
  Bateria &bateria_;

  bool emergenciaAtiva_ = false, emergenciaPendente_ = false;
  uint32_t emergenciaDesde_ = 0, ultimoReenvio_ = 0;

  Posicao ultimaEnviada_;
  uint32_t ultimaPosicao_ = 0, ultimaConsulta_ = 0, ultimaBateria_ = 0;

  String statusCorrida_;

  Recado recado_;
  uint32_t confirmarPendente_ = 0;        // confirmação que não chegou ao servidor
  uint32_t recadosConfirmados_[8] = {0};  // não toca de novo o que já foi confirmado
  uint8_t posConfirmados_ = 0;

  int nivelBateria_ = -1;
  bool avisou20_ = false, avisou10_ = false;
  bool avisouGps_ = false;
  bool avisouChave_ = false;         // já tocou o erro da chave recusada?

  bool online_ = false;              // último estado do Wi-Fi avisado com som
  uint32_t ultimaTentativaWifi_ = 0;
};
