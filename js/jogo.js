// O jogo roda num iframe, só para quem entrou na conta. Ordem:
//   0. sessão: sem login (ou com o token recusado pelo backend em GET /api/me), o palco
//      mostra "Entre na sua conta para jogar" e o iframe nem é carregado;
//   1. data-src local (../jogo/index.html, exportação HTML5 do GDevelop): verifica
//      se existe (HEAD) e carrega com ?modo=pc no computador e ?modo=mobile no
//      celular/tablet (jogo/modo-elo.js pula a tela de escolha do jogo);
//   2. data-fallback (página do gd.games): usado se o arquivo local não existir;
//   3. sem nenhum dos dois: aviso de "em desenvolvimento".
document.addEventListener('DOMContentLoaded', () => {
  const frame = document.getElementById('gameFrame');
  const stage = document.getElementById('gameStage');
  const empty = document.getElementById('gameEmpty');
  const lock = document.getElementById('gameLock');
  const hint = document.getElementById('gameHint');
  const fullscreen = document.getElementById('gameFullscreen');
  if (!frame || !stage) return;

  const src = frame.dataset.src;
  const fallback = frame.dataset.fallback;

  // Celular ou tablet (inclusive iPad, que se apresenta como Mac): controles de toque
  const ua = navigator.userAgent || '';
  const celular = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    || window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const modo = celular ? 'mobile' : 'pc';

  const showEmpty = () => {
    stage.classList.add('is-empty');
    empty.hidden = false;
    if (hint) hint.textContent = 'Em desenvolvimento';
  };

  const showLock = (titulo, texto, semBotoes = false) => {
    stage.classList.add('is-locked');
    if (lock) lock.hidden = false;
    lock?.querySelector('.game-lock-actions')?.toggleAttribute('hidden', semBotoes);
    if (titulo) document.getElementById('gameLockTitle').textContent = titulo;
    if (texto) document.getElementById('gameLockText').textContent = texto;
    if (hint) hint.textContent = 'Disponível para quem tem conta na ELO';
  };

  const load = (url, externo) => {
    frame.src = url;
    stage.classList.add('is-ready');
    if (hint) hint.textContent = externo
      ? 'Jogo carregado do gd.games. Use tela cheia para jogar melhor.'
      : celular
        ? 'Toque no jogo para abrir em tela cheia e jogue com o celular deitado.'
        : 'Clique dentro do jogo para começar. Use tela cheia para jogar melhor.';
    if (fullscreen) fullscreen.hidden = false;
  };

  const usarFallback = () => (fallback ? load(fallback, true) : showEmpty());

  const carregar = () => {
    if (/^https?:\/\//.test(src)) {
      load(src, true);
      return;
    }
    fetch(src, { method: 'HEAD', cache: 'no-store' })
      .then(r => (r.ok ? load(`${src}?modo=${modo}`, false) : usarFallback()))
      .catch(usarFallback);
  };

  // Só quem está cadastrado joga: a sessão local precisa ser aceita pelo backend
  const sessao = window.EloSessao?.ler();
  if (!sessao) {
    showLock();
  } else {
    if (hint) hint.textContent = 'Conferindo seu login';
    window.EloSessao.api('me')
      .then(carregar)
      .catch(e => {
        if (e.status === 401) {
          window.EloSessao.sair();
          showLock('Seu login expirou', 'Entre de novo na sua conta para continuar jogando.');
        } else {
          showLock('Não consegui confirmar seu login', 'O servidor da ELO não respondeu. Confira sua conexão e recarregue a página.', true);
        }
      });
  }

  fullscreen?.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (stage.requestFullscreen) await stage.requestFullscreen();
  });
});
