document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('instructionVideo');
  const playButton = document.getElementById('videoPlay');
  const backButton = document.getElementById('videoBack');
  const forwardButton = document.getElementById('videoForward');
  const progress = document.getElementById('videoProgress');
  const timeLabel = document.getElementById('videoTime');
  const fullscreenButton = document.getElementById('videoFullscreen');

  if (!video) return;

  const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  };

  const updateProgress = () => {
    const duration = video.duration || 0;
    progress.value = duration ? (video.currentTime / duration) * 100 : 0;
    timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
  };

  playButton.addEventListener('click', async () => {
    if (!video.currentSrc && !video.src) return;
    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  });

  video.addEventListener('play', () => { playButton.textContent = 'Pausar'; });
  video.addEventListener('pause', () => { playButton.textContent = 'Reproduzir'; });
  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('loadedmetadata', updateProgress);

  backButton.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
  });

  forwardButton.addEventListener('click', () => {
    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
  });

  progress.addEventListener('input', () => {
    if (video.duration) video.currentTime = (progress.value / 100) * video.duration;
  });

  fullscreenButton.addEventListener('click', async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (video.requestFullscreen) {
      await video.requestFullscreen();
    } else {
      await video.parentElement.requestFullscreen();
    }
  });

  updateProgress();
});
