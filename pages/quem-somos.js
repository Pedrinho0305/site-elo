document.addEventListener('DOMContentLoaded', () => {
  // Mostra as iniciais enquanto a foto do integrante não estiver disponível
  document.querySelectorAll('.member-photo').forEach(photo => {
    const image = photo.querySelector('img');
    if (!image) return;

    const markAsMissing = () => photo.classList.add('no-image');
    image.addEventListener('error', markAsMissing);
    if (image.complete && image.naturalWidth === 0) markAsMissing();
  });

  // Entrada escalonada das fichas do time
  const cards = document.querySelectorAll('.reveal-item');
  if (!('IntersectionObserver' in window)) {
    cards.forEach(card => card.classList.add('is-revealed'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const index = Number(entry.target.dataset.revealIndex || 0);
        entry.target.style.transitionDelay = `${index * 110}ms`;
        entry.target.classList.add('is-revealed');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: .2 });

    cards.forEach((card, index) => {
      card.dataset.revealIndex = String(index % 3);
      observer.observe(card);
    });
  }

  // Formulário de contato (sem back-end: apenas confirmação local)
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  form?.addEventListener('submit', event => {
    event.preventDefault();

    if (!form.checkValidity()) {
      if (status) status.textContent = 'Preencha todos os campos para enviar sua mensagem.';
      form.reportValidity();
      return;
    }

    const nome = document.getElementById('nome').value.trim().split(' ')[0];
    if (status) status.textContent = `Obrigado, ${nome}! Recebemos sua mensagem e responderemos em breve.`;
    form.reset();
  });
});
