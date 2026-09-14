document.addEventListener('DOMContentLoaded', () => {
  // Entrada escalonada dos cartões de mecânica e das capturas.
  // reveal.js só observa os filhos diretos de <main>; quem usa .reveal-item
  // precisa do próprio observador, como em quem-somos.js.
  const items = document.querySelectorAll('.reveal-item');

  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const index = Number(entry.target.dataset.revealIndex || 0);
      entry.target.style.transitionDelay = `${index * 110}ms`;
      entry.target.classList.add('is-revealed');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: .2 });

  // O índice reinicia a cada grade, para o escalonamento acompanhar a linha
  document.querySelectorAll('.mechanics-grid, .gallery-grid').forEach(grid => {
    grid.querySelectorAll('.reveal-item').forEach((item, index) => {
      item.dataset.revealIndex = String(index % 3);
      observer.observe(item);
    });
  });
});
