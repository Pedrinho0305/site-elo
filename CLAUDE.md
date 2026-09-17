# ELO — instruções para o assistente

Antes de qualquer alteração no site, leia o [README.md](README.md): ele documenta o conceito visual, o sistema de design (tokens, componentes, movimento), a estrutura de arquivos, o comportamento de cada página, a sessão/perfil, a API da Eloá e as regras para mudanças.

Resumo das regras que mais quebram quando ignoradas:

- Só tokens (`var(--…)`) para cor, raio, sombra e fonte; testar nos dois temas (`data-theme="dark"` é o padrão).
- `header/header.css` é o sistema compartilhado e o primeiro CSS de toda página; `style.css` (home) também é carregado pela página Eloá, então regras da home são escopadas por seção.
- O menu é estático: página nova = editar `.nav-links` em todas as páginas e ensinar a Eloá em `api/_conhecimento.py`.
- Preço aparece na home e no produto; fatos citados pela Eloá vivem em `api/_conhecimento.py`. Mude junto.
- Não reintroduzir padrões evitados (lista na seção 2 do README): caixa alta espaçada, "→" em links, uma palavra colorida no título, cards idênticos, fade-slide-up por seção.
- Conferir visualmente em 1440, 1000 e 390 px antes de entregar; testar o fluxo cadastro → painel → sair quando tocar em sessão.
- Dois back-ends: `api/eloa.py` (Eloá, Python + Claude) e `backend/` (contas, pochete, Uber, Telegram, SSE — Express + MySQL). Os dois são publicados **junto com o site, no mesmo projeto da Vercel**, como funções `/api/eloa/*` e `/api/*` (`vercel.json` + `api/backend.js`); o front usa `/api` relativo quando publicado e `localhost:8000`/`localhost:3000` quando roda na máquina. Variáveis de ambiente (MySQL e a chave do Vercel AI Gateway ou da Anthropic para a Eloá) ficam no painel da Vercel — README §6c.
- A Eloá tem que responder sempre: modelo → modo local do servidor → `pages/eloa-engine.js` no navegador. Não remova essa cadeia. Uber e Telegram rodam simulados sem credencial; não remova.
- Login e cadastro só funcionam com o backend: **só entra quem está cadastrado**. Não recrie a "demonstração local" de login; sessão sem `token` não vale.
- `api/` é a pasta de funções da Vercel: não coloque arquivo do site lá, e módulos auxiliares começam com `_`.
- O contrato que a pochete usa (`X-Pochete-Key`, `POST /api/pochete/evento`, `GET /api/pochete/estado`) está em `backend/README.md`; mudanças nele precisam ser combinadas com o firmware.
