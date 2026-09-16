# ELO — Guia do site

Documento de referência do redesign do site da ELO (pochete inteligente para pessoas idosas, com app para quem cuida) e de tudo que foi construído depois. Foi escrito para orientar qualquer pessoa ou IA que precise alterar o site: explica **o que existe, por que está assim e como mudar sem quebrar o conjunto**.

Leia antes de mexer. Se uma mudança contradizer alguma regra daqui, a regra vence, a menos que quem pediu a mudança diga o contrário.

---

## 1. O produto e o público

- **ELO** é uma pochete preta com anel luminoso, botão vermelho de emergência (aciona o SAMU 192), botão amarelo de transporte (o cuidador aprova a corrida pelo app), comandos de voz ("Oi ELO"), GPS em tempo real, bateria de até 48 h, IP63. Preço: R$ 997 ou 12× R$ 89,90.
- **Logo:** um infinito (∞) em gradiente verde → azul. **Embalagem:** azul-marinho. **App:** diz "Tudo certo por aqui" com um check verde.
- **Público do site:** familiares e cuidadores adultos (quem compra), pessoas idosas (quem usa), instituições e professores/avaliadores (é um projeto de equipe estudantil: Geovana, Guilherme, Luiz Henrique, Luiza e Pedro).
- **Fonte de verdade do conteúdo:** o próprio site. O que o site não diz, ninguém inventa — nem a Eloá, nem quem edita. Se faltar informação, a resposta é "confirme com a equipe" (formulário em Quem Somos).

---

## 2. O conceito visual: "O sinal"

O redesign nasceu do próprio objeto, não de um template:

| Elemento do produto | Como virou linguagem do site |
|---|---|
| Linhas tracejadas azuis ligando ícones ao celular na foto oficial | A **linha de sinal** animada no hero da home, com um pulso de luz que percorre o traçado |
| Logo ∞ verde → ciano → azul | `--grad-brand`, usado em botões primários, números grandes, ícone do logo e marcas d'água (`--elo-mark`) |
| Anel luminoso do botão físico (laranja/verde/branco) | **Ícones em anel cônico** que giram no hover; anel que acende ao redor dos botões no hover |
| Casca preta brilhante da pochete | Cards com **brilho diagonal** (`--gloss`) e fundo em gradiente escuro |
| Embalagem azul-marinho | Fundo noite `#060b1c` e painéis `--grad-panel` |
| Botão laranja | **Só** no botão de compra ("Quero uma ELO") — é "o botão que se aperta" |
| Vermelho do botão de emergência | **Só** onde é emergência (card SOS, ações de emergência, erros de formulário, "Sair") |
| Chips do app ("Conectado, bateria 85%") | Chips de status flutuando no hero, HUD na arte do jogo, pílulas de tipo no registro do painel |

**Um elemento memorável por página, o resto disciplinado.** Na home é a linha de sinal; nas Instruções é o palco 3D; no Produto é o painel com a embalagem; no Jogo é a arte do Sr. João; na Eloá é a presença dela.

### O que este site deliberadamente NÃO faz

Estes padrões foram evitados porque denunciam design genérico. Não os reintroduza:

- Fundo creme/bege com serifa e terracota; preto puro `#000`/`#111` como fundo de página.
- Cards idênticos com a mesma sombra cinza e o mesmo raio para tudo.
- Rótulos em CAIXA ALTA espaçada acima de títulos; strings com " · " no meio; "→" no fim de links e botões.
- Uma palavra colorida no meio do título (na home, a segunda linha do H1 muda de **peso**, não de cor).
- Numeração "01 / 02 / 03" em coisas que não são sequência. Os passos das Instruções e os artigos das Referências são sequência: podem.
- Fade-and-slide-up em todas as seções. As seções entram saindo do **desfoque** (opacidade + blur), sem deslizar.
- Markdown na fala da Eloá.

---

## 3. Sistema de design (`header/header.css`)

Tudo compartilhado vive em `header/header.css` (apesar do nome, é o sistema inteiro: tokens, base, cabeçalho, botões, faixas, rodapé). É o **primeiro** CSS carregado em toda página.

### Tokens (tema escuro é o padrão)

```
--bg #060b1c · --bg-2 #0b1229 · --bg-3 #111a38 · --bg-4 #1a2552     fundos, do mais fundo ao mais elevado
--text #eef2ff · --text-2 #b4bddc · --text-3 #808cb5                  texto, secundário, terciário
--line rgba(160,178,235,.14) · --line-2 (.30)                         bordas finas e fortes
--green #22c55e · --cyan #22d3ee · --blue #2f7ff7 · --blue-2 #6aa6ff  luz da marca
--orange #ff7a1a (compra) · --red #ff3b4e (emergência) · --purple · --teal
--ink-on-brand #05101f                                                texto escuro sobre o gradiente
--grad-brand   verde → ciano → azul (100deg)
--grad-panel   painel azul-marinho (usado em CTA, oferta, "Nosso objetivo")
--gloss        reflexo diagonal dos cards
--shadow-1 (card) · --shadow-2 (painel grande)
--elo-mark     o ∞ do logo como data-URI SVG, para marcas d'água (background-image)
--check-mark   check SVG para máscaras de listas
```

O tema claro (`[data-theme="light"]`) redefine os mesmos tokens em azul-gelo (`--bg #eef3fb`, painéis brancos). **Nunca use uma cor fixa onde exista token** — é o que faz os dois temas funcionarem. Exceções conscientes: painéis `--grad-panel` são escuros nos dois temas (é a embalagem), então o texto dentro deles usa `#eef2ff`/`#c7cfec` fixos.

### Tipografia

- **Unbounded** (display; 400–700): H1, H2 e números grandes. Larga, com cara de hardware. Sempre com `letter-spacing: -.02em` ou menos.
- **Figtree** (texto; 400–700): corpo, H3 de cards, botões, rótulos. Muito legível para quem enxerga mal.
- Corpo: 17 px no mobile, 18 px em telas ≥ 900 px. Linhas de texto com no máximo ~60ch.
- H3 dentro de cards usa **Figtree 700**, não Unbounded — a display fica reservada para títulos de seção.

### Forma e espaço

```
--r-xl 32px (painéis, palcos) · --r-lg 22px (cards) · --r-md 14px (campos, chips) · --r-pill
--page 1200px · --edge clamp(1.1rem, 4.5vw, 3.5rem) · --band-y clamp(4rem, 8vw, 7rem)
--header-h 66px · --header-top 14px
--ease cubic-bezier(.22,1,.36,1)
```

Largura padrão de conteúdo: `width: min(100% - 2 * var(--edge), var(--page)); margin-inline: auto;`. Em seções que precisam ir de borda a borda (faixas `.night`), o conteúdo interno usa esse mesmo padrão ou `padding-inline: max(var(--edge), calc((100% - var(--page)) / 2))`.

### Componentes compartilhados

| Classe | O que é | Regras |
|---|---|---|
| `.site-header` | Pílula de vidro **fixa e flutuante** (`position: fixed; top: 14px`), com `backdrop-filter` | Por causa do `backdrop-filter`, o header é bloco de contenção dos filhos: o menu mobile (`.nav-links`) é `position: absolute` **relativo ao header** e **sólido** (blur não funciona ali). Não troque por `fixed`. |
| `.logo` | `<a>` com o ∞ em círculo gradiente + "ELO" | No header sempre é link para a home. No rodapé é `<div>`. |
| `.nav-links` | Menu. `a.active` = página atual (sublinhado gradiente). `.nav-links.active` (na `<ul>`) = menu mobile aberto | Não confundir as duas classes `active`. Entradas do mobile entram escalonadas (`li:nth-child` delays). |
| `.header-login` | Pílula "Entrar" com ícone, **ao lado do botão de tema**, marcada com `data-profile-slot` | O `header.js` a substitui pelo chip de perfil quando há sessão. No mobile vira só ícone. |
| `.profile` / `.profile-chip` / `.profile-menu` | Chip com foto/iniciais + nome + menu (Painel, Relatórios, Meu perfil, Ajuda, Sair) | Montado por JS; o CSS está no sistema. |
| `.theme-toggle`, `.menu-toggle` | Botões redondos de 44 px | O ícone do tema é trocado pelo JS (🌙/☀️). |
| `.btn` + `.btn-green` / `.btn-blue` / `.btn-outline`, `.offer-btn`, `.submit-button` | Pílulas com anel que acende no hover (`::before` mascarado) | Primário = gradiente da marca com texto escuro. Laranja só em `.offer-btn`. Mínimo 54 px de altura. |
| `.night` | Faixa de destaque: fundo `--bg-2`, brilhos radiais azul/verde e grade de pontos via `::before` | O `::after` de uma `.night` está livre para uso da página (ex.: piso de luz do modelo 3D). |
| `footer` | Grade logo / frase / copyright com fio gradiente no topo | Igual em todas as páginas. |
| `main > :first-child` | Recebe `padding-top` para passar por baixo do header flutuante | **Não** sobrescreva `padding` (shorthand) na primeira seção de uma página com seletor de menor especificidade; use `padding-bottom`/`padding-inline`. Páginas cujo `main` não é o container (Eloá, auth, painel) sobrescrevem com `.x-shell > :first-child`. |
| `.brand-ink` | Texto com o gradiente da marca como tinta | Também aplicado automaticamente a `.stat-card h3`, `.cta-price-value`, `.offer-value`, `.foundation-stat dt`. |

Ícones são **SVG inline** com `fill="none" stroke="currentColor"`, 1.8–2 px de traço, cantos redondos, dentro de um círculo ou "squircle" (`border-radius: 14–20px`) colorido por `--c`. Padrão de card com cor: `.card { --c: var(--green) }` e o CSS usa `color-mix(in srgb, var(--c) 14%, transparent)` para fundos.

### Movimento (`reveal.css` + `reveal.js`)

- `reveal.js` marca cada filho direto de `<main>` com `.reveal-on-scroll` e, ao entrar na tela, `.is-revealed`. `index.js` faz o mesmo com `.animate-on-scroll` → `.visible`. Páginas com cards escalonados usam `.reveal-item` com `transition-delay` por índice (quem-somos.js, referencias.js).
- A entrada é **opacidade + `filter: blur(10px) → 0`**. Nada de `transform`.
- A primeira faixa de cada página já nasce visível (lista em `reveal.css`) — se criar uma página com uma primeira seção de classe nova, adicione-a lá.
- Animações contínuas existentes e propositais: pulso do sinal (home), flutuação do produto e dos chips, anel SOS pulsando, hotspots do 3D, ponto "online" da Eloá, cursor de digitação. Não adicione outras "porque sim".
- `prefers-reduced-motion` desliga tudo (regra global no sistema).

---

## 4. Estrutura de arquivos

```
index.html · index.js · style.css        home (style.css também é carregado pela página Eloá — por isso todas as regras da home são escopadas por seção)
reveal.css · reveal.js                   entrada das seções
header/header.css · header/header.js     SISTEMA compartilhado + tema, menu, sessão, perfil
pages/
  instrucoes.html/.css/.js + video-player.js
  produtos.html/.css/.js
  quem-somos.html/.css/.js
  referencias.html/.css/.js
  jogo.html/.css/.js
  eloa.html/.css/.js
  login.html · cadastro.html · auth.css · auth.js
  painel.html · relatorios.html · painel.css · painel.js
api/
  eloa.py · conhecimento.py · requirements.txt · .env.example · README.md    API da Eloá em Python
  eloa-engine.js                                                             motor antigo, fallback no navegador
backend/
  server.js · package.json · .env.example · README.md                        login e cadastro (Express 5 + MySQL)
jogo/LEIA-ME.txt                         onde colocar a exportação HTML5 do jogo (jogo/index.html)
assets/                                  imagens, favicon, modelo 3D (.glb, 60 MB), vídeo antigo (77 MB), team/ (fotos da equipe)
```

**Ordem dos `<link>` em toda página:** fontes do Google → `header/header.css` → CSS da página → `reveal.css`. **Ordem dos scripts:** JS da página → `header/header.js` → `reveal.js` (auth e painel invertem: `header.js` antes do JS da página, porque usam `window.EloSessao`). Todos com `defer`. Cache-bust: `?v=6` — suba o número quando mudar CSS.

Toda página tem `<html lang="pt-BR" data-theme="dark">` para não piscar claro antes do JS.

### Como criar uma página nova

1. Copie o `<head>` e o `<header class="site-header">` de `pages/referencias.html` (tem o menu completo com `Entrar`). Marque o link da página como `class="active"`.
2. Adicione o link dela no `.nav-links` de **todas** as outras páginas (o menu é estático, não há include).
3. Crie `pages/nome.css` seguindo o padrão: comentário de abertura explicando o conceito da página, seções numeradas, responsivo no fim. Use só tokens.
4. Se a primeira seção for de classe nova, adicione-a à lista de "já visível" em `reveal.css`.
5. Ensine a Eloá sobre a página em `api/conhecimento.py` (assunto `site`).

---

## 5. Página por página

### Home (`index.html`, `style.css`)
- **Hero** (`.hero.night`): H1 em duas linhas (segunda com peso 400 e cor `--text-2`), botões, `.hero-trust` (garantia, suporte, IP63). À direita, a foto do produto (`.img-escura` no tema escuro, `.img-clara` no claro) flutuando sobre um halo, com **`.hero-chips`** (3 chips de status do app) e o **`.hero-signal`** (SVG inline com dois `<path>` idênticos: `.signal-track` tracejado e `.signal-pulse` com gradiente `#signalGrad` e `stroke-dashoffset` animado). Sequência de entrada orquestrada por `animation-delay` nos filhos de `.hero-text`.
- **Tecnologia que cuida** (`.tecnologia`): grade 3 colunas de `.card`; o `.card--featured` (emergência) é **2×2** e pulsa (`sos` keyframes) — com ele, 6 cards fecham 3 linhas exatas. Em ≤1080 px vira 2 colunas e o destaque volta a ser normal. `.icon-box` = anel cônico; `.icon-red/-orange/-green/-blue/-purple/-teal` definem `--c`.
- **Diferencial** (`.diferencial.night`): grade em áreas `title/visual`, `text/visual`, `stats`, `info`. `.diferencial-visual` = foto da embalagem. `.stats-grid` = faixa com números em gradiente separados por fios. `.info-card` (público) e `.card-objetivo` (painel marinho com ∞ de marca d'água).
- **CTA** (`.cta-section`): painel marinho com ∞ à direita, preço em gradiente, botão. O preço aparece **também** em `pages/produtos.html` (`.offer-value`) — mude os dois juntos.

### Instruções (`pages/instrucoes.*`)
- **Esquema 3D** (`.scheme-section.night`): `<model-viewer>` num `.scheme-stage` quadrado com piso de luz; 6 `.hotspot` numerados (slot `hotspot-N`) ligados à `.scheme-legend` por `data-hotspot`/`data-target` (instrucoes.js). `.is-active` nos dois lados.
- **Seis passos** (`.steps-section`): linha do tempo vertical; o fio é `.step-card::before`; ícones em squircle coloridos por `.icon-*`.
- **Vídeo** (`.video-section.night`): `.video-player` com `<video>` **sem `src`** (o vídeo antigo mostrava o site velho). `video-player.js` detecta a ausência e liga `.is-empty` (aviso "Vídeo em produção" + controles desligados). Para publicar: adicione `src="../assets/arquivo.mp4"` e tudo liga. Controles são **só ícones**: play/pause (troca por `.is-playing`), −10 s, +10 s, barra, tempo, tela cheia.
- **Dicas** (`.tips-box`): painel esverdeado com checks por máscara (`--check-mark`).

### Produto (`pages/produtos.*`)
- Título na faixa `.hero.night` com `padding-bottom` grande; o `.banner-card` sobe por cima (`margin-top` negativo) com texto à esquerda e `.banner-visual` (embalagem) à direita.
- `.components-section`: tabela em `.table-container` (rola horizontal), cabeçalho sticky, `.price.highlight` em verde; `.desktop-only`/`.mobile-only` trocam colunas em ≤700 px.
- `.product-preview.night`: `<model-viewer>` com piso de luz (`::after`).
- `.included-card`: grade de itens com check verde. `.offer-card#oferta`: painel marinho (preço) + ações com `.offer-btn` laranja. Usa Font Awesome (único lugar do site).

### Quem Somos (`pages/quem-somos.*`)
- `.page-header.night` + `.mission-card` sobreposto (ícone em anel giratório lento, `.mission-eyebrow` em ciano sentence-case, três `.pillar`).
- `.team-grid` de `.team-card` com `.member-photo` 3:4. Sem foto (`assets/team/nome.jpg` ausente), `quem-somos.js` marca `.no-image` e o CSS mostra as **iniciais em gradiente** via `::after { content: attr(data-initials) }`. Nomes dos arquivos esperados estão em `assets/team/LEIA-ME.txt`.
- `.contact-section.night#contato` com `.contact-form` (validação nativa + status; sem back-end). É o destino de todos os "Fale conosco", "Ajuda" e "Esqueci minha senha".

### Referências (`pages/referencias.*`)
- Mesmo cabeçalho sobreposto (`.foundation-card`: header/lead em cima, chips de temas e 3 stats embaixo).
- `.articles-section.night`: lista `<ol>` de `.article-card` numerados (é bibliografia). Links `href="#"` viram `aria-disabled` pelo JS até serem preenchidos.
- `.resources-grid` de `<a class="resource-card">` com fio gradiente que cresce no hover. `.methodology-card` com barra lateral gradiente.

### Jogo (`pages/jogo.*`) — construído depois do redesign, a partir do Figma
- **Abertura** (`.game-hero.night`): texto + `.game-art` com a ilustração do Sr. João (`assets/jogo-cuidador.png`, baixada do Figma) e HUD.
- **Jogar** (`.game-stage-section#jogar`): `<iframe id="gameFrame" data-src="../jogo/index.html" data-fallback="https://gd.games/games/15184de8-…">`. `jogo.js` tenta primeiro a exportação HTML5 local (`HEAD` em `jogo/index.html`) — é a única forma de mostrar **só o jogo**; se não existir, usa a página do gd.games, que vem com a interface deles (o build do GDevelop redireciona qualquer embed para o gd.games, não há como esconder). Passo a passo da exportação em `jogo/LEIA-ME.txt`.
- **História** (`.game-story`): texto + `.story-objectives` (5 objetivos com ícone e cor).
- **Demonstração** (`.game-demo.night`): `.demo-screen` com cantos de mira e "Vídeo em produção" (placeholder até haver vídeo).

### Eloá (`pages/eloa.*`)
- `main.ai-shell` em duas colunas: `.eloa-presence` (sticky; avatar recortado em círculo com `object-position: 50% 12%`, status "Online agora", `.suggestions` que enviam ao clicar) e `.eloa-console` (`.chat-box` + `.composer`).
- Mensagens: `.message.user` (gradiente, à direita) e `.ai-message-row > .response-avatar + .message.ai`. Estados: `.is-loading` (três pontos) e `.is-typing` (cursor).
- `eloa.js` fala com a API Python (ver §7), guarda `eloa-sessao` em `sessionStorage` e cai no `api/eloa-engine.js` se o servidor não responder.
- Esta página carrega `style.css` da home — por isso toda regra da home é escopada (`.hero .hero-text`, não `.hero-text`).

### Login e Cadastro (`pages/login.html`, `cadastro.html`, `auth.*`)
- Cabeçalho próprio (`.auth-header`: logo, "Precisa de ajuda? Fale conosco", tema). Sem rodapé.
- `.auth-shell`: `.auth-welcome.night` (título, foto do produto flutuando, 3 pontos) + `.auth-card` (formulário). Campos com `.password-field` + `.password-toggle`, checkbox customizado `.auth-check`, `.photo-picker` no cadastro (recorta a foto em quadrado 160 px e guarda como data-URL).
- `auth.js`: valida (senhas iguais via `setCustomValidity`) e chama o **backend** (`POST /api/cadastro` ou `/api/login`, ver §6b). Se o backend responder com erro (409 email já usado, 401 senha errada), mostra a mensagem. Se o backend não estiver no ar, cai na **demonstração local** (`elo-perfil` em `localStorage`, nome derivado do email). Em qualquer caso abre a sessão (`window.EloSessao.entrar`) e vai para `painel.html`. Quem já está logado é redirecionado.

### Painel e Relatórios (`pages/painel.html`, `relatorios.html`, `painel.*`) — telas do app do cuidador, do Figma
- `.app-header` **sticky** (não flutuante), com `.app-nav` (Painel / Relatórios), sino e o chip de perfil (slot `data-profile-slot`).
- `.app-hero` (saudação com nome da sessão + `.device-card` com a pochete recortada por `.device-thumb`), `.tiles` (4 `.tile` coloridos por `--c`, com `.tile-bar` animada), `.actions-grid` (5 `.action` que mostram uma confirmação em `#actionStatus`), `.profile-section#perfil` (foto grande, nome, email, trocar foto, sair). Relatórios: `.date-range`, tiles com `.tile-delta`, `.log-card` com tabela e `.log-type` coloridos.
- `painel.js` **exige sessão**: sem `elo-sessao`, redireciona para `login.html`. Trocar a foto faz `PATCH /api/me` quando há token. Os dados dos tiles e do registro são ilustrativos (o rodapé avisa).

---

## 6. Sessão e perfil (`header/header.js`)

`header.js` roda em todas as páginas e faz quatro coisas:

1. **Tema:** lê `localStorage.theme` (padrão **dark**), aplica em `<html data-theme>`, troca o ícone do botão.
2. **Menu mobile:** `#menuToggle` alterna `.nav-links.active`; fecha ao clicar num link.
3. **Sessão:** expõe `window.EloSessao = { ler(), entrar(dados), sair(), api(rota, opções) }` sobre `localStorage['elo-sessao']` = `{ nome, email, foto, token? }`. `token` existe quando o login foi feito no backend; `api()` já manda `Authorization: Bearer`. `sair()` avisa o backend (`POST /api/logout`). Com token, cada página confirma a sessão em `GET /api/me` e a derruba se vier 401. `window.ELO_API_URL` (padrão `http://localhost:3000/api`) define o endereço.
4. **Perfil:** se há sessão e existe um elemento `[data-profile-slot]`, substitui-o pelo `.profile` (chip + menu). Os links do menu são calculados a partir do `href` do slot (`pages/login.html` na home, `login.html` nas páginas), então **mantenha o `href` do slot correto** em cada página. "Sair" limpa a sessão e volta à home.

Chaves usadas no `localStorage`: `theme`, `elo-sessao`, `elo-perfil` (só na demonstração local), `elo-cuidador` (legado, primeiro nome). No `sessionStorage`: `eloa-sessao` (id da conversa com a Eloá).

### 6b. Backend (`backend/`)

Documentação completa em [backend/README.md](backend/README.md), incluindo o **contrato da pochete** (o que o firmware precisa mandar). O essencial: Express 5 + MySQL (`mysql2`), ESM, `npm start` em `http://localhost:3000/api`, banco `alunos_elo` no servidor da escola (o usuário `alunos` só cria bancos com prefixo `alunos_`). Tabelas criadas sozinhas: `cuidadores`, `sessoes`, `pochetes`, `eventos`, `corridas`.

- **Contas:** `scrypt` nativo, sessão por token de 64 hex (30 dias).
- **Pochete:** cada uma tem uma chave `elo_…` (guardada como SHA-256) enviada em `X-Pochete-Key`. `POST /api/pochete/evento` com `tipo` `emergencia | transporte | bateria | localizacao | teste`; `GET /api/pochete/estado` devolve a corrida ativa para ela anunciar por voz.
- **Uber:** `uber.js` implementa a Guest Rides API (token `client_credentials`, estimativa, pedido, consulta, cancelamento). Sem `UBER_CLIENT_ID/SECRET` roda **simulado** (corrida fictícia que avança sozinha). Fluxo: botão amarelo → corrida `pendente` → cuidador aprova no painel → estimativa + pedido → status sincronizado a cada 10 s.
- **Telegram:** `telegram.js` (Bot API `sendMessage` + polling `getUpdates`). O cuidador manda `/start CÓDIGO` ao bot. Sem `TELEGRAM_BOT_TOKEN`, simulado (mensagens no terminal, vínculo por `chat_id` digitado).
- **Tempo real:** `eventos.js` é um canal SSE por cuidador (`GET /api/eventos/stream?token=`); o painel usa `EventSource`. Payload `{ tipo, dados, em }`.
- **Painel** (`pages/painel-pochete.js`): toasts, tile "Último alerta", painel de corrida com Aprovar/Recusar/Cancelar, vínculo de pochete (mostra a chave uma vez), Telegram e botões de simulação. Sem token (demonstração local), a seção explica que precisa do servidor.
- **`GET /`** é a página do backend (rotas, estado, ambiente). **Vercel:** `backend/api/index.js` + `vercel.json`; Root Directory = `backend`, variáveis do `.env` no painel da Vercel. Em serverless o SSE, o polling do Telegram e a sincronização automática ficam desligados (o app detecta `process.env.VERCEL`); o resto funciona.

---

## 7. A Eloá (`api/`)

Documentação completa em [api/README.md](api/README.md). O essencial:

- `api/eloa.py` — servidor FastAPI. `POST /perguntar {pergunta, sessao}` → `{status, resposta_da_ia, intencao, confianca, fonte, sessao}`; `GET /saude`. Roda com `python api/eloa.py` na porta 8000.
- **Modo modelo:** com `ANTHROPIC_API_KEY`, chama Claude (`claude-opus-5`, `effort: low`) com `system` = persona + fatos (com `cache_control`) e o histórico da sessão (até 40 mensagens, 30 min de validade).
- **Modo local:** sem chave ou com a API fora, reconhece o assunto por palavras-chave e responde com o fato. Troca sozinho.
- `api/conhecimento.py` — **a única fonte do que a Eloá sabe e de como fala.** `PERSONA` (tom, regras: não inventa, não finge ser humana, não aciona emergência, não sai do assunto, sem Markdown) e `ASSUNTOS` (id, nome, pistas, fato). Mudou algo no site → atualize o fato correspondente.
- `pages/eloa.js` — cliente. `window.ELOA_API_URL` muda o endereço.
- O Node (`server.js`) e o servidor Gemini no Render foram **removidos**. Não recrie.

---

## 8. Regras para alterações futuras

1. **Tokens, sempre.** Cor, raio, sombra, fonte: só via `var(--…)`. Teste a mudança nos dois temas.
2. **Mobile é obrigatório.** Toda regra nova tem contraparte nos breakpoints (`1080`, `960`, `900`, `760`, `700`, `640`, `560`, `480` px conforme a página). O menu mobile abre em ≤960 px.
3. **Conteúdo real, sem placeholder inventado.** Se algo ainda não existe (vídeo, jogo, foto), use o padrão já criado: estado vazio honesto ("em produção", "em desenvolvimento", iniciais no lugar da foto).
4. **Preço em dois lugares** (home e produto). Fatos que a Eloá cita (preço, bateria, garantia…) estão em `api/conhecimento.py` — mude junto.
5. **Menu é estático.** Nova página = editar o `.nav-links` em todas as páginas.
6. **Header flutuante ≠ header do app.** Páginas do site usam `.site-header` (fixo, pílula). Painel/Relatórios usam `.app-header` (sticky, largura total). Login/Cadastro usam `.auth-header` (simples, sem menu).
7. **Especificidade:** as páginas usam seletores de uma classe; o sistema usa `main > :first-child` (0,1,1). Se precisar sobrescrever, use `.pagina > .secao` (0,2,0), não `!important`. Os poucos `!important` existentes (`.scheme-hint`, `.demo-specs`, `.profile-logout`, `.profile-role`) são conscientes.
8. **Acessibilidade mínima:** todo ícone-botão tem `aria-label`; `:focus-visible` é o anel ciano do sistema; contraste dos textos sobre gradiente usa `--ink-on-brand`.
9. **Sem dependências novas no front.** O site é HTML/CSS/JS puro. Externos: Google Fonts, `model-viewer` (Instruções e Produto), Font Awesome (só Produto). Back-ends: `api/` (Eloá, Python) e `backend/` (login/cadastro, Node) — ambos opcionais para o site abrir; sem eles, Eloá e login funcionam em modo local.
10. **Antes de entregar, olhe.** O fluxo usado neste projeto: subir `python -m http.server 8765` na raiz, abrir cada página em 1440×900, 1000×700 e 390×844 nos dois temas, rolar até o fim (para os reveals dispararem) e conferir. Fluxos a testar sempre que tocar em sessão: cadastro → painel → menu de perfil → sair; painel sem sessão → login.

---

## 9. Pendências conhecidas (não são bugs)

| Item | Onde | O que falta |
|---|---|---|
| Vídeo demonstrativo | `pages/instrucoes.html` `<video>` | Gravar o vídeo novo e colocar `src`. O antigo mostrava o site velho e foi retirado. |
| Fotos da equipe | `assets/team/` | 5 arquivos `.jpg` com os nomes do `LEIA-ME.txt`. Até lá, iniciais. |
| Links dos artigos | `pages/referencias.html` `.article-link` | Todos `href="#"`. |
| Chave da API | `api/.env` | Sem ela a Eloá responde no modo local. |
| Jogo sem a interface do gd.games | `jogo/index.html` | Exportar o jogo em HTML5 no GDevelop e copiar para a pasta `jogo/` (passo a passo no `LEIA-ME`). A página troca sozinha. |
| Firmware da pochete | — | O backend já aceita os eventos (contrato em `backend/README.md`); falta o dispositivo mandar. Até lá, "Testar sem a pochete" no painel. |
| Credenciais Uber e Telegram | `backend/.env` | Sem elas, os dois rodam simulados. Uber exige app aprovado (Guest Rides); Telegram é só criar o bot no @BotFather. |
| Relatórios reais | `relatorios.html` | Os tiles e o registro ainda são ilustrativos; `GET /api/eventos` e `/api/corridas` já devolvem os dados reais para ligar. |
| MySQL configurado | `backend/.env` | Sem ele, o backend não sobe e o front cai na demonstração local. |
| Modelo 3D pesado | `assets/*.glb` (60 MB) | Por isso não está na home. Comprimir (Draco) se quiser usar em mais lugares. |
| Vídeo antigo | `assets/*.mp4` (77 MB) | Não é mais referenciado; pode ser apagado do repositório. |

---

## 10. Histórico do que foi feito (ordem)

1. **Redesign completo do CSS** (todas as 7 páginas, dois temas, mobile): conceito "O sinal", sistema de tokens, Unbounded + Figtree, header flutuante, cards em anel, reveal por desfoque. HTML tocado só para fontes, ordem de CSS, `data-theme`, linha de sinal, chips e a foto da embalagem. Tema padrão passou a ser escuro.
2. **Conteúdo do Figma no visual novo:** Jogo (história, objetivos, demo), Login, Cadastro, Painel, Relatórios; link "Entrar".
3. **Ajustes pedidos:** logo vira link; player sem vídeo e com ícones; iframe do jogo; "Entrar" ao lado do tema; chip de perfil com foto e menu após login; seção "Meu perfil"; painel exige sessão.
4. **Eloá em Python:** API FastAPI com Claude + modo local; persona e base em `conhecimento.py`; front com sessão persistente; Node e Gemini removidos.
5. **Reorganização (feita pela equipe):** `header.css`/`header.js` movidos para `header/`.
6. **Backend de login e cadastro:** `backend/server.js` (Express + MySQL, scrypt, sessões por token); `auth.js`, `painel.js` e `header.js` integrados, com a demonstração local como fallback quando o servidor está fora.
7. **Jogo no gd.games** dentro do iframe; **backend da pochete**: chaves por dispositivo, eventos, corridas Uber (Guest Rides API, com simulação), avisos por Telegram e stream SSE; painel ao vivo com aprovação de corrida, vínculo de pochete/Telegram e simulação dos botões.

Commits relevantes começam em `093e664 Redesign do CSS do site inteiro`.
