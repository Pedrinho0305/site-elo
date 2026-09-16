// O jogo roda num iframe. Ordem:
//   1. data-src local (../jogo/index.html, exportação HTML5 do GDevelop): verifica
//      se existe (HEAD) e carrega — só o jogo, sem interface de terceiros;
//   2. data-fallback (página do gd.games): usado se o arquivo local não existir;
//   3. sem nenhum dos dois: aviso de "em desenvolvimento".
document.addEventListener('DOMContentLoaded', () => {
  const frame = document.getElementById('gameFrame');
  const stage = document.getElementById('gameStage');
  const empty = document.getElementById('gameEmpty');
  const hint = document.getElementById('gameHint');
  const fullscreen = document.getElementById('gameFullscreen');
  if (!frame || !stage) return;

  const src = frame.dataset.src;
  const fallback = frame.dataset.fallback;

  const showEmpty = () => {
    stage.classList.add('is-empty');
    empty.hidden = false;
    if (hint) hint.textContent = 'Em desenvolvimento';
  };

  const load = (url, externo) => {
    frame.src = url;
    stage.classList.add('is-ready');
    if (hint) hint.textContent = externo
      ? 'Jogo carregado do gd.games. Use tela cheia para jogar melhor.'
      : 'Clique dentro do jogo para começar. Use tela cheia para jogar melhor.';
    if (fullscreen) fullscreen.hidden = false;
  };

  const usarFallback = () => (fallback ? load(fallback, true) : showEmpty());

  if (/^https?:\/\//.test(src)) {
    load(src, true);
  } else {
    fetch(src, { method: 'HEAD', cache: 'no-store' })
      .then(r => (r.ok ? load(src, false) : usarFallback()))
      .catch(usarFallback);
  }

  fullscreen?.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (stage.requestFullscreen) await stage.requestFullscreen();
  });
});
