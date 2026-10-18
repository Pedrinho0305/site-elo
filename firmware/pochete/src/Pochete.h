// ============================================================================
// ELO · Pochete: as regras de funcionamento (o que o site promete)
// ----------------------------------------------------------------------------
//   · Vermelho segurado 3 s → emergência: o servidor avisa o cuidador (painel,
//     Telegram) e os familiares (e-mail) com a localização. A posição vai a
//     cada 30 s por 10 min. Sem internet, tenta de novo a cada 10 s.
//   · Preto segurado 3 s → pede Uber: a corrida espera o cuidador aprovar no
//     painel; a pochete apita quando o carro é chamado e quando ele vem.
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
  // Ações
  void emergencia();
  void mandarEmergencia();
  void pedirUber();

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

  int nivelBateria_ = -1;
  bool avisou20_ = false, avisou10_ = false;
  bool avisouGps_ = false;
  bool avisouChave_ = false;         // já tocou o erro da chave recusada?

  bool online_ = false;              // último estado do Wi-Fi avisado com som
  uint32_t ultimaTentativaWifi_ = 0;
};
