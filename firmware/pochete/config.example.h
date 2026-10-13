// ============================================================================
// ELO · Configuração da pochete
// ----------------------------------------------------------------------------
// Copie este arquivo para "config.h" (mesma pasta) e preencha. O config.h
// fica fora do git: ele tem a senha do Wi-Fi e a chave da pochete.
// ============================================================================
#pragma once

// ---- Wi-Fi: até 3 redes, tentadas na ordem (casa, celular roteando, ...) ----
#define WIFI_1_NOME   "NomeDaRedeDeCasa"
#define WIFI_1_SENHA  "senha-da-rede"
#define WIFI_2_NOME   ""          // vazio = não usa
#define WIFI_2_SENHA  ""
#define WIFI_3_NOME   ""
#define WIFI_3_SENHA  ""

// ---- Servidor da ELO ----
// O site publicado (as rotas da pochete ficam em /api/pochete/...)
#define ELO_API       "https://site-elo-pi.vercel.app/api"

// Chave da pochete: aparece UMA vez no Painel, em "Vincular uma pochete"
// (ou "Nova chave"). Começa com elo_
#define POCHETE_CHAVE "elo_COLE_A_CHAVE_AQUI"

// ---- Opcionais ----
// Bateria: pino do meio de um divisor 100 kΩ + 100 kΩ entre a bateria e o
// GND (ex.: 35). -1 = a montagem não mede a bateria (o painel fica sem %).
#define PINO_BATERIA -1
// Calibração do divisor (meça com multímetro: tensão real / tensão lida).
#define BATERIA_CALIBRACAO 1.0f

// 1 = mostra tudo no Monitor Serial (115200)
#define DEPURAR 1
