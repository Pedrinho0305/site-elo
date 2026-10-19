// O jogo roda num iframe, só para quem entrou na conta. Ordem:
//   0. sessão: sem login (ou com o token recusado pelo backend em GET /api/me), o palco
//      mostra "Entre na sua conta para jogar" e o iframe nem é carregado;
//   1. data-src local (../jogo/index.html, exportação HTML5 do GDevelop): verifica
//      se existe (HEAD) e carrega com ?modo=pc no computador e ?modo=mobile no
//      celular/tablet (jogo/modo-elo.js pula a tela de escolha do jogo). No
//      celular o palco mostra "Tocar para jogar" e o jogo abre na tela toda
//      (.is-aberto): numa caixa 16:9 dentro da página, o iframe pegava o tamanho
//      do aparelho e os botões da borda saíam cortados. Vale para Android e iPhone;
//      o "Sair" (ou o voltar do celular) fecha e descarrega o jogo;
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

  /* ---- Celular: o jogo na tela toda ---- */
  const start = document.getElementById('gameStart');
  const sairBotao = document.getElementById('gameSair');
  let urlCelular = null;

  const abrir = () => {
    stage.classList.add('is-aberto', 'is-ready');
    document.body.classList.add('jogo-aberto');
    start.hidden = true;
    stage.classList.remove('is-pronto');
    sairBotao.hidden = false;
    frame.src = urlCelular;
    // O voltar do Android fecha o jogo em vez de sair da página
    history.pushState({ jogoAberto: true }, '');
    // Android: tela cheia de verdade, deitado (o toque no botão é o gesto que o navegador
    // exige). iPhone não deixa página em tela cheia: lá o palco já ocupa a tela toda.
    const pedir = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (pedir) {
      Promise.resolve(pedir.call(stage, { navigationUI: 'hide' }))
        .then(() => screen.orientation?.lock?.('landscape'))
        .catch(() => {});
    }
  };

  const fechar = () => {
    if (!stage.classList.contains('is-aberto')) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
    stage.classList.remove('is-aberto', 'is-ready');
    document.body.classList.remove('jogo-aberto');
    frame.src = 'about:blank';   // para a música e libera a memória
    sairBotao.hidden = true;
    start.hidden = false;
    stage.classList.add('is-pronto');
    stage.scrollIntoView({ block: 'center' });
  };

  document.getElementById('gameAbrir')?.addEventListener('click', abrir);
  sairBotao?.addEventListener('click', () => { if (history.state?.jogoAberto) history.back(); else fechar(); });
  window.addEventListener('popstate', fechar);

  const load = (url, externo) => {
    if (celular && !externo && start) {
      urlCelular = url;
      start.hidden = false;
      stage.classList.add('is-pronto');
      if (hint) hint.textContent = 'Abre na tela toda. Jogue com o celular deitado.';
      return;
    }
    frame.src = url;
    stage.classList.add('is-ready');
    if (hint) hint.textContent = externo
      ? 'Jogo carregado do gd.games. Use tela cheia para jogar melhor.'
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
