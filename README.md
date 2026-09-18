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

## 3. Sistema de design (`css/header.css`)

Tudo compartilhado vive em `css/header.css` (apesar do nome, é o sistema inteiro: tokens, base, cabeçalho, botões, faixas, rodapé). É o **primeiro** CSS carregado em toda página.

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

### Movimento (`css/reveal.css` + `js/reveal.js`)

- `reveal.js` marca cada filho direto de `<main>` com `.reveal-on-scroll` e, ao entrar na tela, `.is-revealed`. `js/home.js` faz o mesmo com `.animate-on-scroll` → `.visible`. Páginas com cards escalonados usam `.reveal-item` com `transition-delay` por índice (`js/quem-somos.js`, `js/referencias.js`).
- A entrada é **opacidade + `filter: blur(10px) → 0`**. Nada de `transform`.
- A primeira faixa de cada página já nasce visível (lista em `reveal.css`) — se criar uma página com uma primeira seção de classe nova, adicione-a lá.
- Animações contínuas existentes e propositais: pulso do sinal (home), flutuação do produto e dos chips, anel SOS pulsando, hotspots do 3D, ponto "online" da Eloá, cursor de digitação. Não adicione outras "porque sim".
- `prefers-reduced-motion` desliga tudo (regra global no sistema).

---

## 4. Estrutura de arquivos

Organização por tipo: HTML na raiz (home) e em `pages/`, todo CSS em `css/`, todo JS em `js/`, mídia em `assets/` por categoria. `api/` precisa ficar na raiz (a Vercel só reconhece funções ali).

```
index.html                               home (fica na raiz: é o que a Vercel serve em /)
pages/                                   as outras páginas, só HTML
  instrucoes · produtos · quem-somos · referencias · jogo · eloa · login · cadastro · painel · relatorios
css/
  header.css                             SISTEMA compartilhado (tokens, componentes) — primeiro CSS de toda página
  home.css                               home (também carregado pela página Eloá — por isso as regras da home são escopadas por seção)
  reveal.css                             entrada das seções
  auth.css · eloa.css · instrucoes.css · jogo.css · painel.css · produtos.css · quem-somos.css · referencias.css   um por página
js/
  header.js                              tema, menu, sessão (window.EloSessao), perfil — roda em todas as páginas
  home.js · reveal.js
  auth.js · eloa.js · eloa-engine.js · instrucoes.js · video-player.js · jogo.js · painel.js · painel-pochete.js · produtos.js · quem-somos.js · referencias.js
assets/
  favicon.svg
  img/                                   as imagens usadas, com nome do que mostram: pochete-clara, pochete-escura, pochete-embalagem, pochete-miniatura, eloa-avatar, jogo-cuidador, mockup-visualizador-3d
  3d/pochete.glb                         modelo 3D (60 MB; Instruções e Produto)
  icons/                                 PNGs pequenos exportados do Figma — nenhum é usado hoje
  video/                                 vídeo do site antigo (77 MB, sem uso; pode ser apagado)
  team/                                  fotos da equipe (LEIA-ME.txt diz os nomes)
api/                                     FUNÇÕES DA VERCEL (tudo aqui vira rota /api/…; arquivos com "_" na frente não)
  eloa.py                                API da Eloá em Python (FastAPI) → /api/eloa
  _conhecimento.py                       o que a Eloá sabe e como fala (módulo, não é função)
  backend.js                             entrega backend/server.js como função → /api/*
  .env.example · README.md
backend/
  server.js · uber.js · telegram.js · eventos.js · package.json · .env.example · README.md   contas, pochete, Uber, Telegram (Express 5 + MySQL)
  api/index.js · vercel.json             só para publicar o backend como projeto separado (não é o caminho padrão)
jogo/LEIA-ME.txt                         onde colocar a exportação HTML5 do jogo (jogo/index.html)
vercel.json · package.json · requirements.txt · .vercelignore   deploy: rotas das funções, dependências Node (workspace backend) e Python
```

**Caminhos:** a home referencia `css/…`, `js/…`, `assets/…`; as páginas em `pages/` referenciam `../css/…`, `../js/…`, `../assets/…`. Os JS usam caminhos relativos à **página** que os carrega (ex.: `js/eloa.js` aponta o avatar como `../assets/img/eloa-avatar.png`), não ao próprio arquivo.

**Não coloque arquivo do site em `api/`.** A Vercel transforma cada `.js`/`.py` dessa pasta numa função serverless — um script do navegador ali nunca chega ao navegador (foi o que deixou a Eloá muda no primeiro deploy). Módulos auxiliares das funções começam com `_`.

**Ordem dos `<link>` em toda página:** fontes do Google → `css/header.css` → CSS da página → `css/reveal.css`. **Ordem dos scripts:** JS da página → `js/header.js` → `js/reveal.js` (auth e painel invertem: `header.js` antes do JS da página, porque usam `window.EloSessao`). Todos com `defer`. Cache-bust: `?v=6` — suba o número quando mudar CSS.

Toda página tem `<html lang="pt-BR" data-theme="dark">` para não piscar claro antes do JS.

### Como criar uma página nova

1. Copie o `<head>` e o `<header class="site-header">` de `pages/referencias.html` (tem o menu completo com `Entrar`). Marque o link da página como `class="active"`.
2. Adicione o link dela no `.nav-links` de **todas** as outras páginas (o menu é estático, não há include).
3. Crie `pages/nome.html`, `css/nome.css` e `js/nome.js` seguindo o padrão: comentário de abertura explicando o conceito da página, seções numeradas, responsivo no fim. Use só tokens.
4. Se a primeira seção for de classe nova, adicione-a à lista de "já visível" em `reveal.css`.
5. Ensine a Eloá sobre a página em `api/_conhecimento.py` (assunto `site`).

---

## 5. Página por página

### Home (`index.html`, `css/home.css`)
- **Hero** (`.hero.night`): H1 em duas linhas (segunda com peso 400 e cor `--text-2`), botões, `.hero-trust` (garantia, suporte, IP63). À direita, a foto do produto (`.img-escura` no tema escuro, `.img-clara` no claro) flutuando sobre um halo, com **`.hero-chips`** (3 chips de status do app) e o **`.hero-signal`** (SVG inline com dois `<path>` idênticos: `.signal-track` tracejado e `.signal-pulse` com gradiente `#signalGrad` e `stroke-dashoffset` animado). Sequência de entrada orquestrada por `animation-delay` nos filhos de `.hero-text`.
- **Tecnologia que cuida** (`.tecnologia`): grade 3 colunas de `.card`, todos da mesma altura. Três `.card--wide` (2 colunas, ícone à esquerda do texto: Alerta, App do Cuidador, Segurança Total) alternam com três normais — largo+normal, normal+largo, largo+normal — e fecham 3 linhas exatas. O `.card--featured` (emergência) é o largo que pulsa (`sos` keyframes). Em ≤1080 px todos viram normais numa grade 2×3. `.icon-box` = anel cônico; `.icon-red/-orange/-green/-blue/-purple/-teal` definem `--c`.
- **Diferencial** (`.diferencial.night`): grade em áreas `title/visual`, `text/visual`, `stats`, `info`. `.diferencial-visual` = foto da embalagem. `.stats-grid` = faixa com números em gradiente separados por fios. `.info-card` (público) e `.card-objetivo` (painel marinho com ∞ de marca d'água).
- **CTA** (`.cta-section`): painel marinho com ∞ à direita, preço em gradiente, botão. O preço aparece **também** em `pages/produtos.html` (`.offer-value`) — mude os dois juntos.

### Instruções (`pages/instrucoes.html`, `css/instrucoes.css`, `js/instrucoes.js`)
- **Esquema 3D** (`.scheme-section.night`): `<model-viewer>` num `.scheme-stage` quadrado com piso de luz; 6 `.hotspot` numerados (slot `hotspot-N`) ligados à `.scheme-legend` por `data-hotspot`/`data-target` (instrucoes.js). `.is-active` nos dois lados.
- **Seis passos** (`.steps-section`): linha do tempo vertical; o fio é `.step-card::before`; ícones em squircle coloridos por `.icon-*`.
- **Vídeo** (`.video-section.night`): `.video-player` com `<video>` **sem `src`** (o vídeo antigo mostrava o site velho). `video-player.js` detecta a ausência e liga `.is-empty` (aviso "Vídeo em produção" + controles desligados). Para publicar: adicione `src="../assets/arquivo.mp4"` e tudo liga. Controles são **só ícones**: play/pause (troca por `.is-playing`), −10 s, +10 s, barra, tempo, tela cheia.
- **Dicas** (`.tips-box`): painel esverdeado com checks por máscara (`--check-mark`).

### Produto (`pages/produtos.html`, `css/produtos.css`, `js/produtos.js`)
- Título na faixa `.hero.night` com `padding-bottom` grande; o `.banner-card` sobe por cima (`margin-top` negativo) com texto à esquerda e `.banner-visual` (embalagem) à direita.
- `.components-section`: tabela em `.table-container` (rola horizontal), cabeçalho sticky, `.price.highlight` em verde; `.desktop-only`/`.mobile-only` trocam colunas em ≤700 px.
- `.product-preview.night`: `<model-viewer>` com piso de luz (`::after`).
- `.included-card`: grade de itens com check verde. `.offer-card#oferta`: painel marinho (preço) + ações com `.offer-btn` laranja. Usa Font Awesome (único lugar do site).

### Quem Somos (`pages/quem-somos.html`, `css/quem-somos.css`, `js/quem-somos.js`)
- `.page-header.night` + `.mission-card` sobreposto (ícone em anel giratório lento, `.mission-eyebrow` em ciano sentence-case, três `.pillar`).
- `.team-grid` de `.team-card` com `.member-photo` 3:4. Sem foto (`assets/team/nome.jpg` ausente), `quem-somos.js` marca `.no-image` e o CSS mostra as **iniciais em gradiente** via `::after { content: attr(data-initials) }`. Nomes dos arquivos esperados estão em `assets/team/LEIA-ME.txt`.
- `.contact-section.night#contato` com `.contact-form` (validação nativa + status; sem back-end). É o destino de todos os "Fale conosco", "Ajuda" e "Esqueci minha senha".

### Referências (`pages/referencias.html`, `css/referencias.css`, `js/referencias.js`)
- Mesmo cabeçalho sobreposto (`.foundation-card`: header/lead em cima, chips de temas e 3 stats embaixo).
- `.articles-section.night`: lista `<ol>` de `.article-card` numerados (é bibliografia). Links `href="#"` viram `aria-disabled` pelo JS até serem preenchidos.
- `.resources-grid` de `<a class="resource-card">` com fio gradiente que cresce no hover. `.methodology-card` com barra lateral gradiente.

### Jogo (`pages/jogo.html`, `css/jogo.css`, `js/jogo.js`) — construído depois do redesign, a partir do Figma
- **Abertura** (`.game-hero.night`): texto + `.game-art` com a ilustração do Sr. João (`assets/jogo-cuidador.png`, baixada do Figma) e HUD.
- **Jogar** (`.game-stage-section#jogar`): `<iframe id="gameFrame" data-src="../jogo/index.html" data-fallback="https://gd.games/games/15184de8-…">`. `jogo.js` tenta primeiro a exportação HTML5 local (`HEAD` em `jogo/index.html`) — é a única forma de mostrar **só o jogo**; se não existir, usa a página do gd.games, que vem com a interface deles (o build do GDevelop redireciona qualquer embed para o gd.games, não há como esconder). Passo a passo da exportação em `jogo/LEIA-ME.txt`.
- **História** (`.game-story`): texto + `.story-objectives` (5 objetivos com ícone e cor).
- **Demonstração** (`.game-demo.night`): `.demo-screen` com cantos de mira e "Vídeo em produção" (placeholder até haver vídeo).

### Eloá (`pages/eloa.html`, `css/eloa.css`, `js/eloa.js`)
- `main.ai-shell` em duas colunas: `.eloa-presence` (sticky; avatar recortado em círculo com `object-position: 50% 12%`, status "Online agora", `.suggestions` que enviam ao clicar) e `.eloa-console` (`.chat-box` + `.composer`).
- Mensagens: `.message.user` (gradiente, à direita) e `.ai-message-row > .response-avatar + .message.ai`. Estados: `.is-loading` (três pontos) e `.is-typing` (cursor).
- `eloa.js` fala com a API Python (ver §7): em `localhost` usa `http://localhost:8000/perguntar`, publicado usa `/api/eloa/perguntar` (mesmo domínio). Guarda `eloa-sessao` e `eloa-historico` (últimas 40 mensagens) em `sessionStorage` e manda o histórico em cada pergunta — é assim que ela lembra da conversa mesmo em serverless. Se a API não responder, cai no `js/eloa-engine.js` (motor no navegador). **A Eloá sempre responde alguma coisa**: modelo → modo local do servidor → engine do navegador → mensagem de "sem conexão".
- Esta página carrega `css/home.css` da home — por isso toda regra da home é escopada (`.hero .hero-text`, não `.hero-text`).

### Login e Cadastro (`pages/login.html`, `pages/cadastro.html`, `css/auth.css`, `js/auth.js`)
- Cabeçalho próprio (`.auth-header`: logo, "Precisa de ajuda? Fale conosco", tema). Sem rodapé.
- `.auth-shell`: `.auth-welcome.night` (título, foto do produto flutuando, 3 pontos) + `.auth-card` (formulário). Campos com `.password-field` + `.password-toggle`, checkbox customizado `.auth-check`, `.photo-picker` no cadastro (recorta a foto em quadrado 160 px e guarda como data-URL).
- `auth.js`: valida (senhas iguais via `setCustomValidity`) e chama o **backend** (`POST /api/cadastro` ou `/api/login`, ver §6b). **Só entra quem está cadastrado no backend.** Se ele responder com erro (409 email já usado, 401 email/senha incorretos, 503 banco fora), mostra a mensagem; se nem for alcançado, mostra "Não consegui falar com o servidor da ELO" — em nenhum dos casos abre sessão. Com sucesso, `window.EloSessao.entrar({ …cuidador, token })` e vai para `painel.html`. Quem já está logado é redirecionado. (A antiga "demonstração local", que aceitava qualquer email sem servidor, foi removida de propósito.)

### Painel e Relatórios (`pages/painel.html`, `pages/relatorios.html`, `css/painel.css`, `js/painel.js`) — telas do app do cuidador, do Figma
- `.app-header` **sticky** (não flutuante), com `.app-nav` (Painel / Relatórios), sino e o chip de perfil (slot `data-profile-slot`).
- `.app-hero` (saudação com nome da sessão + `.device-card` com a pochete recortada por `.device-thumb`), `.tiles` (4 `.tile` coloridos por `--c`, com `.tile-bar` animada), `.actions-grid` (5 `.action` que mostram uma confirmação em `#actionStatus`), `.profile-section#perfil` (foto grande, nome, email, trocar foto, sair). Relatórios: `.date-range`, tiles com `.tile-delta`, `.log-card` com tabela e `.log-type` coloridos.
- `painel.js` **exige sessão**: sem `elo-sessao`, redireciona para `login.html`. Trocar a foto faz `PATCH /api/me`. Os dados dos tiles e do registro são ilustrativos (o rodapé avisa).
- `painel-pochete.js` (só `painel.html`): stream SSE quando o servidor tem processo contínuo; quando o stream responde 501 (Vercel), passa a **consultar `GET /api/eventos` e `/api/corridas` a cada 10 s** e mostra os mesmos avisos.

---

## 6. Sessão e perfil (`js/header.js`)

`header.js` roda em todas as páginas e faz quatro coisas:

1. **Tema:** lê `localStorage.theme` (padrão **dark**), aplica em `<html data-theme>`, troca o ícone do botão.
2. **Menu mobile:** `#menuToggle` alterna `.nav-links.active`; fecha ao clicar num link.
3. **Sessão:** expõe `window.EloSessao = { ler(), entrar(dados), sair(), api(rota, opções) }` sobre `localStorage['elo-sessao']` = `{ nome, email, foto, token }`. O `token` vem do login no backend e é **obrigatório**: `ler()` descarta sessões sem token (não existe mais sessão "local"). `api()` manda `Authorization: Bearer`; `sair()` avisa o backend (`POST /api/logout`); cada página confirma a sessão em `GET /api/me` e a derruba se vier 401. **Endereço do backend:** `window.ELO_API_URL`, que por padrão é `http://localhost:3000/api` quando o site roda em `localhost` (ou aberto do disco) e `/api` (mesmo domínio) quando está publicado. Para apontar para outro servidor, defina a variável antes de carregar `header.js`.
4. **Perfil:** se há sessão e existe um elemento `[data-profile-slot]`, substitui-o pelo `.profile` (chip + menu). Os links do menu são calculados a partir do `href` do slot (`pages/login.html` na home, `login.html` nas páginas), então **mantenha o `href` do slot correto** em cada página. "Sair" limpa a sessão e volta à home.

Chaves usadas no `localStorage`: `theme`, `elo-sessao`, `elo-cuidador` (legado, primeiro nome). No `sessionStorage`: `eloa-sessao` (id da conversa com a Eloá) e `eloa-historico` (as últimas mensagens, enviadas a cada pergunta).

### 6b. Backend (`backend/`)

Documentação completa em [backend/README.md](backend/README.md), incluindo o **contrato da pochete** (o que o firmware precisa mandar). O essencial: Express 5 + MySQL (`mysql2`), ESM, `npm start` em `http://localhost:3000/api`, banco `alunos_elo` no servidor da escola (o usuário `alunos` só cria bancos com prefixo `alunos_`). Tabelas criadas sozinhas: `cuidadores`, `sessoes`, `pochetes`, `eventos`, `corridas`.

- **Contas:** `scrypt` nativo, sessão por token de 64 hex (30 dias).
- **Pochete:** cada uma tem uma chave `elo_…` (guardada como SHA-256) enviada em `X-Pochete-Key`. `POST /api/pochete/evento` com `tipo` `emergencia | transporte | bateria | localizacao | teste`; `GET /api/pochete/estado` devolve a corrida ativa para ela anunciar por voz.
- **Uber:** `uber.js` implementa a Guest Rides API (token `client_credentials`, estimativa, pedido, consulta, cancelamento). Sem `UBER_CLIENT_ID/SECRET` roda **simulado** (corrida fictícia que avança sozinha). Fluxo: botão amarelo → corrida `pendente` → cuidador aprova no painel → estimativa + pedido → status sincronizado a cada 10 s.
- **Telegram:** `telegram.js` (Bot API `sendMessage` + polling `getUpdates`). O cuidador manda `/start CÓDIGO` ao bot. Sem `TELEGRAM_BOT_TOKEN`, simulado (mensagens no terminal, vínculo por `chat_id` digitado).
- **Tempo real:** `eventos.js` é um canal SSE por cuidador (`GET /api/eventos/stream?token=`); o painel usa `EventSource`. Payload `{ tipo, dados, em }`.
- **Painel** (`js/painel-pochete.js`): toasts, tile "Último alerta", painel de corrida com Aprovar/Recusar/Cancelar, vínculo de pochete (mostra a chave uma vez), Telegram e botões de simulação. Sem token (demonstração local), a seção explica que precisa do servidor.
- **`GET /`** (e `GET /api`, no site publicado) é a página do backend (rotas, estado, ambiente). **Vercel:** publicado junto com o site pela função `api/backend.js` (ver §6c). Em serverless o SSE, o polling do Telegram e a sincronização automática ficam desligados (o app detecta `process.env.VERCEL`); o painel consulta a cada 10 s no lugar do stream, e cada pedido tenta reconectar ao banco se a conexão inicial falhou (`garantirBanco`).

### 6c. Deploy na Vercel (site + Eloá + backend, um projeto só)

O repositório inteiro é **um** projeto na Vercel (Root Directory = raiz, Framework Preset = Other). Tudo no mesmo domínio, sem CORS nem URL fixa no front:

| URL | O que responde |
|---|---|
| `/`, `/pages/…`, `/assets/…` | o site, estático |
| `/api/eloa/perguntar`, `/api/eloa/saude` | `api/eloa.py` (função Python; `vercel.json` manda `/api/eloa/*` para ela) |
| `/api`, `/api/login`, `/api/me`, `/api/pochete/…` etc. | `api/backend.js` → `backend/server.js` (função Node; `vercel.json` manda o resto de `/api/*` para ela) |

Como funciona: `package.json` da raiz declara `backend` como workspace, então o `npm install` da Vercel instala `express`, `cors` e `mysql2` para a função Node; `requirements.txt` da raiz instala `anthropic`, `fastapi` e `uvicorn` para a Python. `vercel.json` tem as rotas e o `excludeFiles` que tira `assets/` (140 MB) do pacote da função Python.

**Variáveis de ambiente** (Settings → Environment Variables do projeto; sem elas o deploy sobe, mas a Eloá fica no modo local e o login responde 503):

| Variável | Para quê |
|---|---|
| **`GEMINI_API_KEY`** (ou `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AI_GATEWAY_API_KEY`) | Eloá com o modelo. **Gemini é o caminho gratuito**: chave em [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sem cartão, ~1.000 pedidos/dia (a Google pode usar as conversas para treinar). Groq também é grátis (modelos Llama). Anthropic e OpenAI são pagas; o Vercel AI Gateway exige cartão na conta. Uma chave basta; a primeira encontrada (nesta ordem: Anthropic, Gemini, Groq, OpenAI, Gateway) define o provedor, ou force com `ELOA_PROVEDOR`. Sem nenhuma, modo local (palavras-chave). |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL do backend (os mesmos valores de `backend/.env`). O banco da escola precisa aceitar conexão de fora, e aceita. |
| `ALLOWED_ORIGINS` | `*` ou o domínio do site. |
| `SESSION_DAYS` | duração do login (padrão 30). |
| `UBER_CLIENT_ID/SECRET`, `TELEGRAM_BOT_TOKEN/USERNAME` | opcionais; sem elas, simulados. |

Depois de mudar variáveis, faça um redeploy. Conferir: `https://SEU-DOMINIO/api` (página do backend, chip "Banco: conectado") e `https://SEU-DOMINIO/api/eloa/saude` (`"modo": "modelo"`).

Para rodar tudo na máquina continua igual: `python -m http.server 8765` na raiz + `python api/eloa.py` + `cd backend && npm start` — o front detecta `localhost` e usa as portas 8000 e 3000.

---

## 7. A Eloá (`api/`)

Documentação completa em [api/README.md](api/README.md). O essencial:

- `api/eloa.py` — servidor FastAPI. `POST /perguntar {pergunta, sessao, historico?}` → `{status, resposta_da_ia, intencao, confianca, fonte, sessao}`; `GET /saude`. As mesmas rotas existem sob `/api/eloa/…` (é assim que a Vercel chama; ver §6c). Roda com `python api/eloa.py` na porta 8000; dependências em `requirements.txt` na raiz.
- **Memória em serverless:** a Vercel não guarda nada entre chamadas, então o cliente manda `historico` (as últimas mensagens) e o servidor usa isso como memória. Localmente a sessão em memória continua funcionando.
- **Modo modelo:** o provedor vem da chave que existir (`PROVEDORES` no topo de `eloa.py`): Anthropic (`claude-opus-5`, SDK `anthropic`), **Gemini** (`gemini-3.5-flash`, grátis), Groq (`llama-3.3-70b-versatile`, grátis), OpenAI (`gpt-4o-mini`) ou Vercel AI Gateway. Gemini, Groq e OpenAI falam o protocolo da OpenAI (SDK `openai`, endpoint compatível); Anthropic e Gateway, o da Anthropic. Em todos, `system` = persona + fatos e o histórico da sessão (até 40 mensagens). `ELOA_MODELO` troca o modelo; `GET /saude` diz `provedor` e `modelo`. Erros de chave, permissão ou modelo inexistente (404) caem no modo local por 10 min com log explicando.
- **Modo local:** sem chave ou com a API fora, reconhece o assunto por palavras-chave e responde com o fato. Troca sozinho.
- `api/_conhecimento.py` — **a única fonte do que a Eloá sabe e de como fala.** `PERSONA` (tom, regras: não inventa, não finge ser humana, não aciona emergência, não sai do assunto, sem Markdown) e `ASSUNTOS` (id, nome, pistas, fato). Mudou algo no site → atualize o fato correspondente. (O `_` no nome impede a Vercel de tratar o arquivo como função.)
- `js/eloa.js` — cliente; escolhe o endereço sozinho (localhost → porta 8000; publicado → `/api/eloa`). `window.ELOA_API_URL` sobrescreve. `js/eloa-engine.js` é o motor de fallback no navegador.
- O Node (`server.js`) e o servidor Gemini no Render foram **removidos**. Não recrie.

---

## 8. Regras para alterações futuras

1. **Tokens, sempre.** Cor, raio, sombra, fonte: só via `var(--…)`. Teste a mudança nos dois temas.
2. **Mobile é obrigatório.** Toda regra nova tem contraparte nos breakpoints (`1080`, `960`, `900`, `760`, `700`, `640`, `560`, `480` px conforme a página). O menu mobile abre em ≤960 px.
3. **Conteúdo real, sem placeholder inventado.** Se algo ainda não existe (vídeo, jogo, foto), use o padrão já criado: estado vazio honesto ("em produção", "em desenvolvimento", iniciais no lugar da foto).
4. **Preço em dois lugares** (home e produto). Fatos que a Eloá cita (preço, bateria, garantia…) estão em `api/_conhecimento.py` — mude junto.
5. **Menu é estático.** Nova página = editar o `.nav-links` em todas as páginas.
6. **Header flutuante ≠ header do app.** Páginas do site usam `.site-header` (fixo, pílula). Painel/Relatórios usam `.app-header` (sticky, largura total). Login/Cadastro usam `.auth-header` (simples, sem menu).
7. **Especificidade:** as páginas usam seletores de uma classe; o sistema usa `main > :first-child` (0,1,1). Se precisar sobrescrever, use `.pagina > .secao` (0,2,0), não `!important`. Os poucos `!important` existentes (`.scheme-hint`, `.demo-specs`, `.profile-logout`, `.profile-role`) são conscientes.
8. **Acessibilidade mínima:** todo ícone-botão tem `aria-label`; `:focus-visible` é o anel ciano do sistema; contraste dos textos sobre gradiente usa `--ink-on-brand`.
9. **Sem dependências novas no front.** O site é HTML/CSS/JS puro. Externos: Google Fonts, `model-viewer` (Instruções e Produto), Font Awesome (só Produto). Back-ends: `api/` (Eloá, Python) e `backend/` (contas e pochete, Node). O site abre sem eles; a Eloá responde pelo motor do navegador, mas **login e cadastro exigem o backend** (só entra quem está cadastrado — não recrie a demonstração local).
10. **Deploy é um projeto só.** Não separe backend e site em projetos diferentes da Vercel sem necessidade: o front usa `/api` relativo. Se um dia o backend for para outro lugar (servidor da escola, para ter o stream), defina `window.ELO_API_URL` antes de `header.js` em todas as páginas.
11. **Antes de entregar, olhe.** O fluxo usado neste projeto: subir `python -m http.server 8765` na raiz, abrir cada página em 1440×900, 1000×700 e 390×844 nos dois temas, rolar até o fim (para os reveals dispararem) e conferir. Fluxos a testar sempre que tocar em sessão (com o backend no ar): login com email não cadastrado → mensagem, sem sessão; cadastro → painel → menu de perfil → sair; painel sem sessão → login; backend fora → login avisa e não entra.

---

## 9. Pendências conhecidas (não são bugs)

| Item | Onde | O que falta |
|---|---|---|
| Vídeo demonstrativo | `pages/instrucoes.html` `<video>` | Gravar o vídeo novo e colocar `src`. O antigo mostrava o site velho e foi retirado. |
| Link do artigo 5 | `pages/referencias.html` `.article-link` do card 5 | Artigos 1–4 têm DOI (vindos do Figma, conferidos na Crossref). O 5 (Hillesheim, UFSC) não tem link no Figma e não foi localizado; segue `href="#"` até a equipe informar. |
| Chave do Gemini | `GEMINI_API_KEY` no projeto da Vercel (e em `api/.env` para rodar local) | Gratuita em aistudio.google.com/apikey. Sem ela a Eloá responde no modo local (palavras-chave), nunca fica muda. |
| Jogo sem a interface do gd.games | `jogo/index.html` | Exportar o jogo em HTML5 no GDevelop e copiar para a pasta `jogo/` (passo a passo no `LEIA-ME`). A página troca sozinha. |
| Firmware da pochete | — | O backend já aceita os eventos (contrato em `backend/README.md`); falta o dispositivo mandar. Até lá, "Testar sem a pochete" no painel. |
| Credenciais Uber e Telegram | `backend/.env` | Sem elas, os dois rodam simulados. Uber exige app aprovado (Guest Rides); Telegram é só criar o bot no @BotFather. |
| Relatórios reais | `relatorios.html` | Os tiles e o registro ainda são ilustrativos; `GET /api/eventos` e `/api/corridas` já devolvem os dados reais para ligar. |
| MySQL configurado | `backend/.env` (local) e `DB_*` na Vercel | Sem ele, o backend não sobe (local) ou responde 503 (Vercel) e ninguém consegue entrar. |
| Tempo real na Vercel | `backend/server.js` | Serverless não mantém o stream SSE nem o bot do Telegram ouvindo; o painel consulta a cada 10 s. Para o tempo real de verdade, rodar `npm start` num servidor contínuo e apontar `window.ELO_API_URL`. |
| Modelo 3D pesado | `assets/*.glb` (60 MB) | Por isso não está na home. Comprimir (Draco) se quiser usar em mais lugares. |
| Vídeo antigo | `assets/*.mp4` (77 MB) | Não é mais referenciado; pode ser apagado do repositório. |

---

## 10. Histórico do que foi feito (ordem)

1. **Redesign completo do CSS** (todas as 7 páginas, dois temas, mobile): conceito "O sinal", sistema de tokens, Unbounded + Figtree, header flutuante, cards em anel, reveal por desfoque. HTML tocado só para fontes, ordem de CSS, `data-theme`, linha de sinal, chips e a foto da embalagem. Tema padrão passou a ser escuro.
2. **Conteúdo do Figma no visual novo:** Jogo (história, objetivos, demo), Login, Cadastro, Painel, Relatórios; link "Entrar".
3. **Ajustes pedidos:** logo vira link; player sem vídeo e com ícones; iframe do jogo; "Entrar" ao lado do tema; chip de perfil com foto e menu após login; seção "Meu perfil"; painel exige sessão.
4. **Eloá em Python:** API FastAPI com Claude + modo local; persona e base em `conhecimento.py`; front com sessão persistente; Node e Gemini removidos.
5. **Reorganização (feita pela equipe):** `header.css`/`header.js` movidos para `header/` (depois, no item 10, para `css/` e `js/`).
6. **Backend de login e cadastro:** `backend/server.js` (Express + MySQL, scrypt, sessões por token); `auth.js`, `painel.js` e `header.js` integrados, com a demonstração local como fallback quando o servidor está fora.
7. **Jogo no gd.games** dentro do iframe; **backend da pochete**: chaves por dispositivo, eventos, corridas Uber (Guest Rides API, com simulação), avisos por Telegram e stream SSE; painel ao vivo com aprovação de corrida, vínculo de pochete/Telegram e simulação dos botões.
8. **Deploy unificado na Vercel e login só com cadastro:** site, Eloá (`api/eloa.py`) e backend (`api/backend.js`) no mesmo projeto e domínio; o front escolhe o endereço da API sozinho; a Eloá manda o histórico do navegador (memória em serverless) e ganhou o fallback em cadeia; `api/eloa-engine.js` virou `js/eloa-engine.js` e `conhecimento.py` virou `_conhecimento.py` (a Vercel tratava os dois como funções); a demonstração local de login foi removida — só entra quem o backend reconhece; o painel consulta a API quando não há stream.
9. **Eloá multi-provedor:** além da Anthropic, fala com Gemini (grátis), Groq (grátis), OpenAI e Vercel AI Gateway; provedor escolhido pela chave existente. Gemini é o caminho adotado por ser gratuito sem cartão.
10. **Arquivos organizados por tipo:** todo CSS em `css/`, todo JS em `js/`, `pages/` só com HTML, `assets/` em `img/` (nomes descritivos), `3d/`, `icons/`, `video/`, `team/`. `style.css`→`css/home.css`, `index.js`→`js/home.js`, `header/`→`css/`+`js/`. Caminhos de todas as páginas atualizados; referência quebrada a `script.js` em Produto removida.

Commits relevantes começam em `093e664 Redesign do CSS do site inteiro`.
