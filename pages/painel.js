// Painel de demonstração: sem servidor. Usa o nome guardado no cadastro e
// responde às ações rápidas com uma confirmação na tela.
document.addEventListener('DOMContentLoaded', () => {
  // Sem sessão, o painel não faz sentido: volta para o login
  const session = window.EloSessao?.ler();
  if (!session) { window.location.replace('login.html'); return; }

  const greeting = document.getElementById('greetingName');
  if (greeting) greeting.textContent = session.nome.split(' ')[0];

  const status = document.getElementById('actionStatus');
  let timer;

  document.querySelectorAll('.action[data-feedback]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.action.is-active').forEach(b => b.classList.remove('is-active'));
      button.classList.add('is-active');
      if (!status) return;
      status.textContent = button.dataset.feedback;
      status.classList.add('is-visible');
      clearTimeout(timer);
      timer = setTimeout(() => {
        status.classList.remove('is-visible');
        button.classList.remove('is-active');
      }, 4000);
    });
  });

  /* ---- Meu perfil ---- */
  const avatar = document.getElementById('perfilAvatar');
  const initials = session.nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  const renderAvatar = () => { if (avatar) avatar.innerHTML = session.foto ? `<img src="${session.foto}" alt="">` : initials; };
  renderAvatar();
  const nomeEl = document.getElementById('perfilNome'); if (nomeEl) nomeEl.textContent = session.nome;
  const emailEl = document.getElementById('perfilEmail'); if (emailEl) emailEl.textContent = session.email || '';

  document.getElementById('perfilFoto')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    const perfilStatus = document.getElementById('perfilStatus');
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 160, canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const side = Math.min(img.width, img.height);
        canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        session.foto = canvas.toDataURL('image/jpeg', .85);
        window.EloSessao.entrar(session);
        if (session.token) {
          // backend: guarda a foto na conta
          window.EloSessao.api('me', { method: 'PATCH', body: { foto: session.foto } }).catch(err => {
            if (perfilStatus) { perfilStatus.textContent = 'A foto ficou só neste navegador: ' + err.message; perfilStatus.classList.add('is-visible'); }
          });
        } else {
          try {
            const perfil = JSON.parse(localStorage.getItem('elo-perfil'));
            if (perfil && perfil.email === session.email) { perfil.foto = session.foto; localStorage.setItem('elo-perfil', JSON.stringify(perfil)); }
          } catch {}
        }
        renderAvatar();
        document.querySelectorAll('.profile .profile-avatar').forEach(a => { a.innerHTML = `<img src="${session.foto}" alt="">`; });
        if (perfilStatus) { perfilStatus.textContent = 'Foto atualizada.'; perfilStatus.classList.add('is-visible'); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('perfilSair')?.addEventListener('click', () => {
    window.EloSessao.sair();
    window.location.href = '../index.html';
  });

  // Links ainda sem destino não navegam
  document.querySelectorAll('a[aria-disabled="true"]').forEach(link => {
    link.addEventListener('click', event => event.preventDefault());
  });
});
