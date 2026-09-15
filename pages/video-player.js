// Player do vídeo demonstrativo. Sem src no <video>, o player fica em
// espera (aviso na tela, controles desligados). Com src, liga sozinho.
document.addEventListener('DOMContentLoaded', () => {
  const player = document.getElementById('videoPlayer');
  const video = document.getElementById('instructionVideo');
  const playButton = document.getElementById('videoPlay');
  const backButton = document.getElementById('videoBack');
  const forwardButton = document.getElementById('videoForward');
  const progress = document.getElementById('videoProgress');
  const timeLabel = document.getElementById('videoTime');
  const fullscreenButton = document.getElementById('videoFullscreen');

  if (!video || !player) return;

  const controls = [playButton, backButton, forwardButton, progress, fullscreenButton];
  const hasSource = Boolean(video.getAttribute('src') || video.querySelector('source'));

  if (!hasSource) {
    player.classList.add('is-empty');
    controls.forEach(c => { c.disabled = true; });
    return;
  }

  const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  };

  const updateProgress = () => {
    const duration = video.duration || 0;
    progress.value = duration ? (video.currentTime / duration) * 100 : 0;
    progress.style.setProperty('--fill', `${progress.value}%`);
    timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
  };

  const setPlaying = playing => {
    player.classList.toggle('is-playing', playing);
    const label = playing ? 'Pausar' : 'Reproduzir';
    playButton.setAttribute('aria-label', label);
    playButton.title = label;
  };

  playButton.addEventListener('click', async () => {
    if (video.paused) await video.play(); else video.pause();
  });

  video.addEventListener('click', () => playButton.click());
  video.addEventListener('play', () => setPlaying(true));
  video.addEventListener('pause', () => setPlaying(false));
  video.addEventListener('ended', () => setPlaying(false));
  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('loadedmetadata', updateProgress);

  backButton.addEventListener('click', () => { video.currentTime = Math.max(0, video.currentTime - 10); });
  forwardButton.addEventListener('click', () => { video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10); });

  progress.addEventListener('input', () => {
    if (video.duration) video.currentTime = (progress.value / 100) * video.duration;
  });

  fullscreenButton.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (player.requestFullscreen) await player.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });

  updateProgress();
});
