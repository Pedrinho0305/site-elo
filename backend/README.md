# Backend da ELO

Express 5 + MySQL. É o servidor que liga a pochete, o cuidador e os serviços externos:

- **contas** dos cuidadores (cadastro, login, sessão por token);
- **pochetes** vinculadas a cada cuidador, cada uma com a própria chave;
- **eventos** que a pochete manda (emergência, transporte, bateria, localização);
- **corridas de Uber**: a pochete pede → o cuidador aprova no painel → o servidor chama a Uber;
- **avisos**: mensagem no Telegram e, ao mesmo tempo, no painel em tempo real (SSE);
- **mensagens do site**: o contato de Quem Somos e o pedido da página de Produto caem no banco e no e-mail da empresa.

## Rodar

```bash
npm install                 # na raiz do repositório (backend é um workspace; as dependências vão para node_modules da raiz)
cd backend
copy .env.example .env      # Windows (cp no Linux/Mac) — preencha o MySQL
npm start                   # http://localhost:3000/api
npm run dev                 # reinicia sozinho quando o código muda
```

**A senha do MySQL é obrigatória.** Sem ela o terminal mostra `Access denied for user '…' (using password: NO)` e o processo sai: o `.env` precisa de um banco que você consiga acessar — o MySQL da sua máquina (`DB_HOST=localhost`, `DB_USER=root`) ou o da escola (`benserverplex.ddns.net`, usuário `alunos`, as mesmas contas do site publicado). O `.env.example` traz os dois blocos. Se não tiver nenhuma senha em mãos, dá para desenvolver sem backend local: abra o site com `?api=publicado` (README §6) e o navegador fala com o backend já publicado.

`npm run dev` lê o `.env` **uma vez, ao subir**; depois de editar o arquivo, pare (Ctrl+C) e rode de novo.

O banco e as tabelas são criados sozinhos. Confira em `http://localhost:3000/api/saude`:

```json
{ "ok": true, "banco": "conectado", "uber": "simulado", "telegram": "simulado", "email": "simulado" }
```

**Servidor da escola:** o usuário `alunos` só pode criar bancos com prefixo `alunos_`; por isso `DB_NAME=alunos_elo`.

Abra `http://localhost:3000/` no navegador: é a **página do backend**, com todas as rotas, o estado do banco/Uber/Telegram e o ambiente. Com `Accept: application/json` ela devolve o mesmo em JSON.

## Deploy na Vercel

**Caminho padrão: junto com o site, no mesmo projeto.** A raiz do repositório tem `api/backend.js`, que importa `server.js` e o entrega como função serverless; o `vercel.json` da raiz manda `/api` e `/api/*` (menos `/api/eloa/*`, que é da Eloá) para ela, e o `package.json` da raiz declara `backend` como workspace para a Vercel instalar `express`, `cors` e `mysql2`. O front chama `/api` no mesmo domínio — nada de URL fixa.

1. Projeto da Vercel com **Root Directory = raiz** do repositório (Framework Preset: Other).
2. Em *Environment Variables*, copie as do `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ALLOWED_ORIGINS`, `SESSION_DAYS`, `EMAIL_EMPRESA` + `BREVO_API_KEY` (e-mail dos formulários) e, se tiver, as da Uber e do Telegram. O `.env` não sobe.
3. Deploy (push na `main`). Conferir em `https://seu-dominio/api`: é a página do backend, com o chip do banco.

Sem as variáveis do banco, todas as rotas respondem `503 { erro: "O banco de dados está indisponível…" }` e o login do site mostra essa mensagem — ninguém entra. Cada pedido tenta reconectar (`garantirBanco`), então basta corrigir a variável e fazer redeploy.

**Projeto separado (alternativa):** `backend/api/index.js` + `backend/vercel.json` continuam aqui para publicar só o backend com Root Directory = `backend`. Nesse caso, defina `window.ELO_API_URL = 'https://seu-backend.vercel.app/api'` antes de `js/header.js` em todas as páginas do site.

**O que não funciona em serverless** (a página `/api` avisa): o stream em tempo real (`/api/eventos/stream` responde 501 — o painel do site então consulta `GET /api/eventos` e `/api/corridas` a cada 10 s), o bot do Telegram ouvindo `/start` e a sincronização automática das corridas — porque a Vercel não mantém um processo aberto. Tudo o resto (contas, pochetes, eventos, corridas com aprovação, envio de mensagens no Telegram) funciona. Para o tempo real, hospede em um lugar com processo contínuo (Render, Railway ou o servidor da escola) com `npm start`; o código é o mesmo.

## Uber e Telegram: real ou simulado

Os dois funcionam sem credencial nenhuma, em **modo simulado**, para o projeto ser testado inteiro:

| Serviço | Simulado (sem variável) | Real (com variável) |
|---|---|---|
| **Uber** | Corridas pedidas pela pochete viram fictícias e avançam sozinhas: procurando motorista (20 s) → a caminho (60 s) → em viagem (150 s) → concluída. Motorista "Carlos (simulado)". O botão "Chamar Uber" do painel **não** simula: devolve o link universal (veja abaixo). | Guest Rides API: `UBER_CLIENT_ID` + `UBER_CLIENT_SECRET` (conta Uber for Business aprovada em developer.uber.com). `UBER_SANDBOX=1` usa o sandbox da Uber. |

**Credencial não é acesso.** Dá para ter `UBER_CLIENT_ID` e `UBER_CLIENT_SECRET` corretos e a Uber ainda recusar o token com `invalid_scope`, porque o produto **Guest Rides** (escopo `guests.trips`) é liberado caso a caso, só para contas Uber for Business aprovadas. Por isso quem decide o caminho é `uber.disponivel()`, que pede um token de verdade: se a Uber não responder, o servidor volta ao modo simulado/link e guarda esse resultado por 10 minutos (para não bater na Uber a cada clique). A página `/api` mostra o motivo exato no chip **Uber** — por exemplo `credencial sem acesso à Guest Rides (scope(s) are invalid)`.
| **Telegram** | Mensagens impressas no terminal do servidor; o painel vincula por um `chat_id` digitado. | `TELEGRAM_BOT_TOKEN` (crie com o @BotFather) + `TELEGRAM_BOT_USERNAME`. O cuidador manda `/start CÓDIGO` para o bot e fica vinculado. |
| **E-mail** | O e-mail aparece no terminal (com o motivo) e a mensagem continua salva no banco; `reenviar-mensagens.js` manda depois. | `EMAIL_EMPRESA` (para onde vai) + `GMAIL_APP_PASSWORD` (Senha de App do Gmail da empresa), **ou** `BREVO_API_KEY`, **ou** `RESEND_API_KEY`. |

A Uber usa a **Guest Rides API** (`auth.uber.com/oauth/v2/token` com `client_credentials`, escopo `guests.trips`; `POST /v1/guests/trips/estimates`; `POST /v1/guests/trips`; `GET|DELETE /v1/guests/trips/{request_id}`). Ela pede corridas para um "convidado" (a pessoa idosa, que não precisa ter o app) a partir da conta da organização. A Uber precisa aprovar o app antes de liberar as credenciais.

### Chamar Uber pelo painel: os dois caminhos

`POST /api/corridas` é o botão **Chamar Uber** do painel do cuidador, e ele se comporta conforme o que o servidor tem:

| | Com `UBER_CLIENT_ID/SECRET` | Sem credenciais (padrão hoje) |
|---|---|---|
| Resposta | `201 { modo: "api", corrida }` | `200 { modo: "link", link, origem, destino, aviso? }` |
| O que acontece | Estima e pede na Guest Rides API; a corrida entra no histórico e o painel acompanha o status (`solicitada` → `a_caminho` → …), com Cancelar | O site abre o **link universal** `https://m.uber.com/ul/?action=setPickup&…`: no celular abre o app do Uber, no computador o site, já com partida e destino preenchidos. Quem confirma o carro é a pessoa, dentro do Uber |
| Registro | Corrida gravada na tabela `corridas` | Nada é gravado — depois do link, o servidor não tem como saber o que aconteceu |

A **partida** é a última posição conhecida da pochete; se ela ainda não mandou nenhuma, o navegador pergunta a localização (funciona em desktop e celular) e manda em `origem`. O **destino** é o endereço de casa cadastrado na pochete, ou o que vier em `destino`. Sem nenhum dos dois, o link sai com `pickup=my_location` e um `aviso` explicando que o destino será escolhido na tela do Uber.

Por que o link universal existe: a Guest Rides API só funciona com uma conta Uber for Business **aprovada pela Uber**, o que um projeto escolar não costuma ter. O link é o caminho oficial para chamar um carro de fora do app, não precisa de credencial nenhuma e funciona de verdade — por isso ele é o padrão, em vez de uma corrida fictícia que ninguém poderia pegar.

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
| `POST` | `/api/corridas` | `{ pochete_id?, origem?: { lat, lng }, destino?: { lat, lng, nome } }` | chama o carro pelo painel: `201 { modo: "api", corrida }` com credenciais da Uber, ou `{ modo: "link", link, origem, destino, aviso? }` sem elas |
| `GET` | `/api/corridas` · `/api/corridas/:id` | — | `{ corridas }` / `{ corrida }` (consulta a Uber e atualiza) |
| `POST` | `/api/corridas/:id/aprovar` | — | estima na Uber, pede o carro, `{ corrida }` |
| `POST` | `/api/corridas/:id/recusar` · `/cancelar` | — | `{ corrida }` |
| `POST` | `/api/telegram/codigo` | — | `{ codigo, bot, simulado, vinculado }` |
| `POST` | `/api/telegram/vincular` | `{ chat_id }` | só no modo simulado |
| `DELETE` | `/api/telegram` · `POST /api/telegram/teste` | — | |

`cuidador = { id, nome, email, foto, telefone, telegram }`. Erros vêm como `{ "erro": "mensagem" }` em português.

Cada mensagem do stream é `{ tipo, dados, em }`; em `dados` vêm `evento`, `pochete` (id, nome, bateria, posição) e, quando existe, `corrida`. O `EventSource` reconecta sozinho; o servidor manda um pulso a cada 25 s.

## Formulários do site: contato e pedido

Os dois formulários públicos — **Entre em contato** (Quem Somos) e **Quero uma ELO** (Produto) — mandam para a mesma rota. Ninguém precisa estar logado; se estiver, a conta fica registrada junto.

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| `POST` | `/api/mensagens` | `{ tipo: "contato" \| "pedido", nome, email, telefone?, assunto?, mensagem?, quantidade?, pagamento?, cidade?, pagina?, site? }` | `201 { ok, mensagem, email }` · `400` campo inválido · `429` muitas mensagens |
| `GET` | `/api/mensagens?tipo=&limite=` | Bearer de uma conta em `ADMIN_EMAILS` | `{ mensagens }` · `403` para as outras contas |
| `PATCH` | `/api/mensagens/:id` | Bearer (equipe) `{ lida }` | `{ mensagem }` |

O que acontece em cada envio:

1. **Valida** nome, e-mail e conteúdo, e descarta em silêncio o que vem com o campo-armadilha `site` preenchido (robô).
2. **Limita a enxurrada**: no máximo `MENSAGENS_POR_HORA` (5) por e-mail ou IP na última hora → `429`.
3. **Salva na tabela `mensagens`** — é o registro; nada se perde se o e-mail falhar.
4. **Manda o e-mail para `EMAIL_EMPRESA`** com *Responder* já apontando para quem escreveu, e uma confirmação com o protocolo para a pessoa (desligue com `EMAIL_COPIA=0`).
5. **Responde com o protocolo** (`ELO-0007`), que o site mostra na tela. `email` diz o que aconteceu com o envio: `enviado`, `simulado` ou `falhou: …` (também fica gravado em `email_status`).

### Ligar o e-mail de verdade (gratuito)

**Caminho curto — pelo próprio Gmail da empresa** (`elocompany.pochete@gmail.com`), sem criar conta em serviço nenhum:

1. Entre na conta e ligue a **verificação em duas etapas** em [myaccount.google.com/security](https://myaccount.google.com/security) (o Google só libera Senha de App com ela ativa).
2. Gere uma **Senha de App** em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — dê o nome "ELO site". São 16 letras.
3. Cole em `GMAIL_APP_PASSWORD` (com ou sem os espaços, o código tira) e confirme `EMAIL_EMPRESA` — no `backend/.env` e no painel da Vercel. **A senha normal do Gmail não funciona.**
4. Confira em `/api`: o chip **E-mail** passa de `simulado` para `gmail → elocompany.pochete@gmail.com`.

O envio é SMTP (`smtp.gmail.com:465`, via `nodemailer`), limite de ~500 e-mails por dia — mais do que suficiente para os formulários. `EMAIL_SMTP_HOST` e `EMAIL_SMTP_PORTA` apontam para outro servidor SMTP, se um dia for o caso.

**Alternativa — Brevo** (quando não se quer mexer na conta do Google): crie a chave em [brevo.com](https://www.brevo.com) → *SMTP & API*, verifique o endereço remetente em *Senders, Domains & Dedicated IPs* e preencha `BREVO_API_KEY`. Gratuita, 300 e-mails por dia, sem domínio próprio. `RESEND_API_KEY` também existe, mas exige domínio verificado.

Sem nenhuma chave o módulo fica simulado: o e-mail vai para o terminal e a mensagem continua no banco, para ninguém perder um pedido enquanto a chave não existe.

### Mandar de novo o que não saiu

`email_status`, na tabela `mensagens`, guarda o que aconteceu com cada envio (`enviado`, `simulado`, `falhou: …`). O que ficou para trás sai com:

```bash
cd backend
node --env-file-if-exists=.env reenviar-mensagens.js          # tudo que não foi enviado
node --env-file-if-exists=.env reenviar-mensagens.js 7        # só a mensagem 7
node --env-file-if-exists=.env reenviar-mensagens.js --tudo   # inclusive as já enviadas
```

### Ler as mensagens

`GET /api/mensagens` é para a equipe: só as contas cujo e-mail está em `ADMIN_EMAILS` (ou, sem essa variável, a conta com o e-mail de `EMAIL_EMPRESA`) recebem a lista; qualquer outro cuidador logado leva `403`. É a mesma sessão do painel:

```bash
curl -H "Authorization: Bearer SEU_TOKEN" https://seu-dominio/api/mensagens?tipo=pedido
```

## Tabelas

```
cuidadores  id, nome, email UNIQUE, senha_hash, foto, telefone, telegram_chat_id, telegram_codigo, criado_em, atualizado_em
sessoes     token PK, cuidador_id → cuidadores, criado_em, expira_em
pochetes    id, cuidador_id → cuidadores, nome_idoso, telefone_idoso, chave_hash UNIQUE, casa_lat/lng/nome, bateria, lat, lng, ultimo_contato
eventos     id, pochete_id → pochetes, tipo, dados JSON, criado_em
corridas    id, pochete_id → pochetes, status, origem_lat/lng, destino_lat/lng/nome, uber_request_id, uber_status, produto, valor, eta_min, motorista, veiculo, erro, solicitada_em, criado_em, atualizado_em
mensagens   id, tipo (contato|pedido), nome, email, telefone, assunto, mensagem, detalhes JSON, cuidador_id → cuidadores, pagina, ip, email_status, lida, criado_em
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
| `email.js` | manda as mensagens do site para o e-mail da empresa (Gmail, Brevo ou Resend) + simulação |
| `reenviar-mensagens.js` | script avulso: reenvia as mensagens cujo `email_status` não é `enviado` |
| `.env.example` | todas as variáveis, comentadas |

## O front

- `js/header.js`: `window.EloSessao.api()` (manda o token), `window.ELO_API_URL` (`/api` publicado, `localhost:3000/api` na máquina).
- `js/auth.js`: cadastro/login; **só entra quem o servidor reconhece** — sem servidor, avisa e não abre sessão.
- `js/painel.js`: perfil e ações; `js/painel-pochete.js`: stream ao vivo, painel de corrida (Aprovar/Recusar/Cancelar), vínculo de pochete e Telegram, simulação dos botões.
- `js/formulario.js`: o envio dos dois formulários públicos (`js/quem-somos.js` e `js/produtos.js` só cuidam dos campos e do texto de resposta).
