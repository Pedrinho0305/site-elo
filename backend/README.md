# Backend da ELO

Express 5 + MySQL. É o servidor que liga a pochete, o cuidador e os serviços externos:

- **contas** dos cuidadores (cadastro, login, sessão por token);
- **pochetes** vinculadas a cada cuidador, cada uma com a própria chave;
- **eventos** que a pochete manda (emergência, transporte, bateria, localização);
- **corridas de Uber**: a pochete pede → o cuidador aprova no painel → o servidor chama a Uber;
- **avisos**: mensagem no Telegram e, ao mesmo tempo, no painel em tempo real (SSE).

## Rodar

```bash
npm install                 # na raiz do repositório (backend é um workspace; as dependências vão para node_modules da raiz)
cd backend
copy .env.example .env      # Windows (cp no Linux/Mac) — preencha o MySQL
npm start                   # http://localhost:3000/api
npm run dev                 # reinicia sozinho quando o código muda
```

O banco e as tabelas são criados sozinhos. Confira em `http://localhost:3000/api/saude`:

```json
{ "ok": true, "banco": "conectado", "uber": "simulado", "telegram": "simulado" }
```

**Servidor da escola:** o usuário `alunos` só pode criar bancos com prefixo `alunos_`; por isso `DB_NAME=alunos_elo`.

Abra `http://localhost:3000/` no navegador: é a **página do backend**, com todas as rotas, o estado do banco/Uber/Telegram e o ambiente. Com `Accept: application/json` ela devolve o mesmo em JSON.

## Deploy na Vercel

**Caminho padrão: junto com o site, no mesmo projeto.** A raiz do repositório tem `api/backend.js`, que importa `server.js` e o entrega como função serverless; o `vercel.json` da raiz manda `/api` e `/api/*` (menos `/api/eloa/*`, que é da Eloá) para ela, e o `package.json` da raiz declara `backend` como workspace para a Vercel instalar `express`, `cors` e `mysql2`. O front chama `/api` no mesmo domínio — nada de URL fixa.

1. Projeto da Vercel com **Root Directory = raiz** do repositório (Framework Preset: Other).
2. Em *Environment Variables*, copie as do `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ALLOWED_ORIGINS`, `SESSION_DAYS` e, se tiver, as da Uber e do Telegram. O `.env` não sobe.
3. Deploy (push na `main`). Conferir em `https://seu-dominio/api`: é a página do backend, com o chip do banco.

Sem as variáveis do banco, todas as rotas respondem `503 { erro: "O banco de dados está indisponível…" }` e o login do site mostra essa mensagem — ninguém entra. Cada pedido tenta reconectar (`garantirBanco`), então basta corrigir a variável e fazer redeploy.

**Projeto separado (alternativa):** `backend/api/index.js` + `backend/vercel.json` continuam aqui para publicar só o backend com Root Directory = `backend`. Nesse caso, defina `window.ELO_API_URL = 'https://seu-backend.vercel.app/api'` antes de `header/header.js` em todas as páginas do site.

**O que não funciona em serverless** (a página `/api` avisa): o stream em tempo real (`/api/eventos/stream` responde 501 — o painel do site então consulta `GET /api/eventos` e `/api/corridas` a cada 10 s), o bot do Telegram ouvindo `/start` e a sincronização automática das corridas — porque a Vercel não mantém um processo aberto. Tudo o resto (contas, pochetes, eventos, corridas com aprovação, envio de mensagens no Telegram) funciona. Para o tempo real, hospede em um lugar com processo contínuo (Render, Railway ou o servidor da escola) com `npm start`; o código é o mesmo.

## Uber e Telegram: real ou simulado

Os dois funcionam sem credencial nenhuma, em **modo simulado**, para o projeto ser testado inteiro:

| Serviço | Simulado (sem variável) | Real (com variável) |
|---|---|---|
| **Uber** | Corridas fictícias que avançam sozinhas: procurando motorista (20 s) → a caminho (60 s) → em viagem (150 s) → concluída. Motorista "Carlos (simulado)". | Guest Rides API: `UBER_CLIENT_ID` + `UBER_CLIENT_SECRET` (conta Uber for Business aprovada em developer.uber.com). `UBER_SANDBOX=1` usa o sandbox da Uber. |
| **Telegram** | Mensagens impressas no terminal do servidor; o painel vincula por um `chat_id` digitado. | `TELEGRAM_BOT_TOKEN` (crie com o @BotFather) + `TELEGRAM_BOT_USERNAME`. O cuidador manda `/start CÓDIGO` para o bot e fica vinculado. |

A Uber usa a **Guest Rides API** (`auth.uber.com/oauth/v2/token` com `client_credentials`, escopo `guests.trips`; `POST /v1/guests/trips/estimates`; `POST /v1/guests/trips`; `GET|DELETE /v1/guests/trips/{request_id}`). Ela pede corridas para um "convidado" (a pessoa idosa, que não precisa ter o app) a partir da conta da organização. A Uber precisa aprovar o app antes de liberar as credenciais.

## Como a pochete fala com o servidor (contrato do dispositivo)

Este é o "norte" para o firmware. Tudo que a pochete precisa:

1. **Uma chave.** O cuidador vincula a pochete no painel (seção "Pochete e avisos") e recebe uma chave `elo_…`. Grave-a no dispositivo. Ela vai no cabeçalho `X-Pochete-Key` de todo pedido.
2. **Mandar eventos** com `POST /api/pochete/evento`:

```http
POST /api/pochete/evento
Content-Type: application/json
X-Pochete-Key: elo_xxxxxxxxxxxxxxxx

{ "tipo": "emergencia", "lat": -23.5612, "lng": -46.6560, "bateria": 77 }
```

| `tipo` | Quando mandar | O que o servidor faz |
|---|---|---|
| `emergencia` | botão vermelho | Telegram 🚨 + aviso no painel (o acionamento do SAMU é da pochete) |
| `transporte` | botão amarelo | Cria a corrida **pendente** e avisa o cuidador para aprovar. Destino = `destino` do corpo ou o endereço de casa cadastrado no painel |
| `bateria` | ao ligar e a cada X min | Guarda; abaixo de `BATERIA_BAIXA` (20%) avisa |
| `localizacao` | a cada 1–5 min | Atualiza a posição no painel |
| `teste` | botão de teste / primeira ligação | Telegram ✅ "tudo funcionando" |

Campos opcionais em qualquer evento: `lat`, `lng` (float), `bateria` (0–100), `destino: { lat, lng, nome }` (só transporte). Sem `lat/lng`, o servidor usa a última posição conhecida.

3. **Ler o estado** com `GET /api/pochete/estado` (mesmo cabeçalho) — devolve a corrida ativa, se houver, para a pochete anunciar por voz ("corrida aprovada, o carro chega em 4 minutos"):

```json
{ "pochete": { "id": 1, "nome_idoso": "Sr. João", "bateria": 77, "posicao": { "lat": -23.56, "lng": -46.65 } },
  "cuidador": "Beatriz Floel",
  "corrida": { "id": 7, "status": "a_caminho", "eta_min": 3, "motorista": "Carlos · +55 11 …", "veiculo": "Fiat Argo prata ABC1D23", "destino": { "nome": "Casa" } } }
```

Status possíveis da corrida: `pendente` → `aprovada` → `solicitada` → `a_caminho` → `em_andamento` → `concluida`; ou `recusada`, `cancelada`, `sem_motorista`, `erro`.

Esqueleto para ESP32 (Arduino, `HTTPClient`):

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
const char* API = "http://SEU_SERVIDOR:3000/api";
const char* CHAVE = "elo_xxxxxxxxxxxxxxxx";

int enviarEvento(const char* tipo, float lat, float lng, int bateria) {
  HTTPClient http;
  http.begin(String(API) + "/pochete/evento");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Pochete-Key", CHAVE);
  String corpo = String("{\"tipo\":\"") + tipo + "\",\"lat\":" + String(lat, 6) + ",\"lng\":" + String(lng, 6) + ",\"bateria\":" + bateria + "}";
  int status = http.POST(corpo);   // 201 = recebido; 401 = chave errada; 409 = já tem corrida ativa
  http.end();
  return status;
}
```

Enquanto o dispositivo não existe, o painel tem a seção **"Testar sem a pochete"**, que manda exatamente os mesmos eventos pelo caminho `POST /api/pochetes/:id/simular`.

## Rotas do cuidador (`Authorization: Bearer <token>`)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| `POST` | `/api/cadastro` | `{ nome, email, senha, foto? }` | `201 { token, cuidador }` · `409` email já usado |
| `POST` | `/api/login` | `{ email, senha }` | `{ token, cuidador }` · `401` |
| `GET` / `PATCH` | `/api/me` | `{ nome?, foto?, telefone? }` | `{ cuidador }` |
| `POST` | `/api/logout` | — | `{ ok }` |
| `GET` | `/api/pochetes` | — | `{ pochetes }` |
| `POST` | `/api/pochetes` | `{ nome_idoso, telefone_idoso?, casa?: { lat, lng, nome } }` | `201 { pochete, chave }` — a chave só aparece aqui |
| `POST` | `/api/pochetes/:id/chave` | — | `{ chave }` nova (a antiga morre) |
| `PATCH` / `DELETE` | `/api/pochetes/:id` | `{ nome_idoso?, telefone_idoso?, casa? }` | |
| `POST` | `/api/pochetes/:id/simular` | `{ tipo, lat?, lng?, bateria?, destino? }` | igual ao evento da pochete |
| `GET` | `/api/eventos?limite=20` | — | `{ eventos }` |
| `GET` | `/api/eventos/stream?token=` | — | **SSE**: eventos `emergencia`, `transporte`, `bateria`, `localizacao`, `teste`, `corrida`, `telegram` |
| `GET` | `/api/corridas` · `/api/corridas/:id` | — | `{ corridas }` / `{ corrida }` (consulta a Uber e atualiza) |
| `POST` | `/api/corridas/:id/aprovar` | — | estima na Uber, pede o carro, `{ corrida }` |
| `POST` | `/api/corridas/:id/recusar` · `/cancelar` | — | `{ corrida }` |
| `POST` | `/api/telegram/codigo` | — | `{ codigo, bot, simulado, vinculado }` |
| `POST` | `/api/telegram/vincular` | `{ chat_id }` | só no modo simulado |
| `DELETE` | `/api/telegram` · `POST /api/telegram/teste` | — | |

`cuidador = { id, nome, email, foto, telefone, telegram }`. Erros vêm como `{ "erro": "mensagem" }` em português.

Cada mensagem do stream é `{ tipo, dados, em }`; em `dados` vêm `evento`, `pochete` (id, nome, bateria, posição) e, quando existe, `corrida`. O `EventSource` reconecta sozinho; o servidor manda um pulso a cada 25 s.

## Tabelas

```
cuidadores  id, nome, email UNIQUE, senha_hash, foto, telefone, telegram_chat_id, telegram_codigo, criado_em, atualizado_em
sessoes     token PK, cuidador_id → cuidadores, criado_em, expira_em
pochetes    id, cuidador_id → cuidadores, nome_idoso, telefone_idoso, chave_hash UNIQUE, casa_lat/lng/nome, bateria, lat, lng, ultimo_contato
eventos     id, pochete_id → pochetes, tipo, dados JSON, criado_em
corridas    id, pochete_id → pochetes, status, origem_lat/lng, destino_lat/lng/nome, uber_request_id, uber_status, produto, valor, eta_min, motorista, veiculo, erro, solicitada_em, criado_em, atualizado_em
```

Senhas com `scrypt` nativo (`scrypt$sal$chave`). A chave da pochete é guardada só como SHA-256; sessões são tokens de 64 hex com validade de `SESSION_DAYS`. Todas as datas em UTC (`SET time_zone = '+00:00'` em cada conexão).

## Arquivos

| Arquivo | O que é |
|---|---|
| `server.js` | rotas, banco, regras (o "coração" é `tratarEvento`); exporta o app |
| `api/index.js` + `vercel.json` | deploy na Vercel como projeto separado (o padrão é `../api/backend.js`, junto com o site) |
| `uber.js` | cliente da Guest Rides API + simulação |
| `telegram.js` | envio de mensagens + polling do `/start CÓDIGO` + simulação |
| `eventos.js` | canal SSE por cuidador |
| `.env.example` | todas as variáveis, comentadas |

## O front

- `header/header.js`: `window.EloSessao.api()` (manda o token), `window.ELO_API_URL` (`/api` publicado, `localhost:3000/api` na máquina).
- `pages/auth.js`: cadastro/login; **só entra quem o servidor reconhece** — sem servidor, avisa e não abre sessão.
- `pages/painel.js`: perfil e ações; `pages/painel-pochete.js`: stream ao vivo, painel de corrida (Aprovar/Recusar/Cancelar), vínculo de pochete e Telegram, simulação dos botões.
