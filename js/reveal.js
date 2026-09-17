document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('main > *, .chat-container');
  if (!('IntersectionObserver' in window)) {
    elements.forEach(element => element.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });

  elements.forEach(element => {
    element.classList.add('reveal-on-scroll');
    observer.observe(element);
  });
});
