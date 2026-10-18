// ============================================================================
// ELO · Conversa com o servidor do site (backend/README.md, "Como a pochete
// fala com o servidor")
// ----------------------------------------------------------------------------
//   POST /api/pochete/evento               { tipo, lat?, lng?, bateria? }
//   GET  /api/pochete/estado               → { corrida }
// Todos com o cabeçalho X-Pochete-Key, por https com o certificado conferido.
// É o mesmo caminho do "Testar sem a pochete" do painel: as duas rotas
// chamam a mesma função do servidor (tratarEvento em backend/server.js).
// ============================================================================
#pragma once
#include <Arduino.h>
#include <WiFiMulti.h>
#include "Tipos.h"

// Resultado de um pedido
struct Resposta {
  int status = 0;    // HTTP; < 0 = nem chegou ao servidor (sem Wi-Fi, sem rede)
  String erro;       // o campo "erro" que o servidor manda quando recusa

  bool ok() const { return status >= 200 && status < 300; }
  bool semRede() const { return status < 0; }
  // 4xx (menos 429, "calma"): o servidor recusou de vez, repetir não resolve
  bool recusado() const { return status >= 400 && status < 500 && status != 429; }
};

// O que GET /pochete/estado devolve
struct EstadoServidor {
  bool ok = false;
  String corrida;                 // status da corrida ativa; "" = nenhuma
};

class Servidor {
public:
  void iniciar();

  bool conectar();                    // tenta o Wi-Fi (espera até 5 s)
  bool online() const;                // está conectado agora? (não espera)
  String rede() const;                // nome da rede conectada

  static bool chaveDeExemplo();       // POCHETE_CHAVE ainda é a do config.example.h?
  bool chaveRecusada() const { return chaveDeExemplo() || chaveRecusada_; }

  // tipo: "emergencia", "transporte", "localizacao", "bateria" ou "teste".
  // posicao = nullptr: o servidor usa a última posição que recebeu.
  // bateria < 0: não manda.
  Resposta enviarEvento(const char *tipo, const Posicao *posicao, int bateria);
  EstadoServidor consultarEstado();

private:
  Resposta pedir(const char *metodo, const String &rota, const String &corpo, String *resposta);

  WiFiMulti wifi_;
  bool chaveRecusada_ = false;        // o servidor respondeu 401
  uint32_t chaveRecusadaEm_ = 0;
};
