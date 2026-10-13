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
// 1 = módulo de som DFPlayer Mini ligado (toca as mensagens gravadas no
//     cartão SD: veja firmware/README.md). 0 = só o buzzer.
#define USAR_DFPLAYER 0

// Fator de calibração do divisor de tensão da bateria (meça com multímetro:
// tensão real / tensão que o Serial mostra). 1.0 se não souber.
#define BATERIA_CALIBRACAO 1.0f

// 1 = mostra tudo no Monitor Serial (115200)
#define DEPURAR 1
