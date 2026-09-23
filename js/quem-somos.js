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

  // Formulário de contato: vai para POST /api/mensagens (backend/server.js),
  // que guarda no banco e manda para o e-mail da equipe. O envio em si está
  // em js/formulario.js, compartilhado com o pedido da página de Produto.
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  const botao = form?.querySelector('.submit-button');
  const formularios = window.EloFormulario;

  formularios.preencherComSessao(form);

  form?.addEventListener('submit', async event => {
    event.preventDefault();

    if (!form.checkValidity()) {
      formularios.status(status, 'Preencha todos os campos para enviar sua mensagem.', 'erro');
      form.reportValidity();
      return;
    }

    const valor = campo => form.elements[campo]?.value.trim() || '';
    const primeiroNome = valor('nome').split(' ')[0];

    formularios.aguardando(botao, true);
    formularios.status(status, 'Enviando sua mensagem…');

    try {
      const { mensagem } = await formularios.enviar({
        tipo: 'contato',
        nome: valor('nome'),
        email: valor('email'),
        telefone: valor('telefone'),
        assunto: valor('assunto'),
        mensagem: valor('mensagem'),
        site: valor('site'),
        pagina: 'quem-somos'
      });

      const protocolo = mensagem?.protocolo ? ` O protocolo é ${mensagem.protocolo}.` : '';
      formularios.status(status, `Obrigado, ${primeiroNome}! Sua mensagem chegou à equipe e respondemos no seu e-mail em até 2 dias úteis.${protocolo}`, 'ok');
      form.reset();
    } catch (e) {
      formularios.status(status, formularios.explicar(e), 'erro');
    } finally {
      formularios.aguardando(botao, false);
    }
  });
});
