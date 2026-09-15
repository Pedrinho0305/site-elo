# ELO — instruções para o assistente

Antes de qualquer alteração no site, leia o [README.md](README.md): ele documenta o conceito visual, o sistema de design (tokens, componentes, movimento), a estrutura de arquivos, o comportamento de cada página, a sessão/perfil, a API da Eloá e as regras para mudanças.

Resumo das regras que mais quebram quando ignoradas:

- Só tokens (`var(--…)`) para cor, raio, sombra e fonte; testar nos dois temas (`data-theme="dark"` é o padrão).
- `header/header.css` é o sistema compartilhado e o primeiro CSS de toda página; `style.css` (home) também é carregado pela página Eloá, então regras da home são escopadas por seção.
- O menu é estático: página nova = editar `.nav-links` em todas as páginas e ensinar a Eloá em `api/conhecimento.py`.
- Preço aparece na home e no produto; fatos citados pela Eloá vivem em `api/conhecimento.py`. Mude junto.
- Não reintroduzir padrões evitados (lista na seção 2 do README): caixa alta espaçada, "→" em links, uma palavra colorida no título, cards idênticos, fade-slide-up por seção.
- Conferir visualmente em 1440, 1000 e 390 px antes de entregar; testar o fluxo cadastro → painel → sair quando tocar em sessão.
