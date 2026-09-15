// O jogo roda num iframe. O endereço fica em data-src:
//   - caminho relativo (../jogo/index.html): verifica se o arquivo existe antes
//     de carregar; se não existir, mostra o aviso de "em desenvolvimento";
//   - endereço externo (https://...): carrega direto.
document.addEventListener('DOMContentLoaded', () => {
  const frame = document.getElementById('gameFrame');
  const stage = document.getElementById('gameStage');
  const empty = document.getElementById('gameEmpty');
  const hint = document.getElementById('gameHint');
  const fullscreen = document.getElementById('gameFullscreen');
  if (!frame || !stage) return;

  const src = frame.dataset.src;

  const showEmpty = () => {
    stage.classList.add('is-empty');
    empty.hidden = false;
    if (hint) hint.textContent = 'Em desenvolvimento';
  };

  const load = () => {
    frame.src = src;
    stage.classList.add('is-ready');
    if (hint) hint.textContent = 'Clique dentro do jogo para começar. Use tela cheia para jogar melhor.';
    if (fullscreen) fullscreen.hidden = false;
  };

  if (/^https?:\/\//.test(src)) {
    load();
  } else {
    fetch(src, { method: 'HEAD', cache: 'no-store' })
      .then(r => (r.ok ? load() : showEmpty()))
      .catch(showEmpty);
  }

  fullscreen?.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (stage.requestFullscreen) await stage.requestFullscreen();
  });
});
