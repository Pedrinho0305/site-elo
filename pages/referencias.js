document.addEventListener('DOMContentLoaded', () => {
  // Entrada escalonada dos cartões de artigo e de recurso
  const items = document.querySelectorAll('.reveal-item');

  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('is-revealed'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = `${Number(entry.target.dataset.revealIndex || 0) * 90}ms`;
        entry.target.classList.add('is-revealed');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: .18 });

    items.forEach((item, index) => {
      item.dataset.revealIndex = String(index % 3);
      observer.observe(item);
    });
  }

  // Artigos sem link ainda cadastrado: evita navegação para "#"
  document.querySelectorAll('.article-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#') return;

    link.setAttribute('aria-disabled', 'true');
    link.title = 'Link do artigo ainda não cadastrado';
    link.addEventListener('click', event => event.preventDefault());
  });
});
