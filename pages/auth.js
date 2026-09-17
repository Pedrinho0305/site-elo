// Login e cadastro. Fala com o backend (backend/server.js): só entra quem
// está cadastrado lá. Se o servidor estiver fora do ar, avisa e não entra.
// Com sucesso, abre a sessão ('elo-sessao', com o token) e vai para o painel.
// A foto é recortada e reduzida antes de enviar.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('authForm');
  const status = document.getElementById('formStatus');
  if (!form) return;

  // Quem já está logado não precisa entrar de novo
  if (window.EloSessao?.ler()) { window.location.replace(form.dataset.next || 'painel.html'); return; }

  /* ---- Mostrar / esconder senha ---- */
  document.querySelectorAll('.password-toggle').forEach(button => {
    const input = document.getElementById(button.dataset.toggle);
    if (!input) return;
    button.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.setAttribute('aria-pressed', String(!visible));
      button.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Esconder senha');
      button.classList.toggle('is-on', !visible);
    });
  });

  /* ---- Foto de perfil (cadastro) ---- */
  let foto = null;
  const fotoInput = document.getElementById('foto');
  const preview = document.getElementById('photoPreview');
  const photoLabel = document.getElementById('photoLabel');

  fotoInput?.addEventListener('change', () => {
    const file = fotoInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      if (status) status.textContent = 'Escolha uma imagem JPG ou PNG de até 5 MB.';
      fotoInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Recorte quadrado, 160px: cabe no localStorage e fica nítido no chip
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        foto = canvas.toDataURL('image/jpeg', .85);
        if (preview) { preview.innerHTML = `<img src="${foto}" alt="">`; preview.classList.add('has-photo'); }
        if (photoLabel) photoLabel.textContent = 'Foto escolhida. Trocar foto';
        if (status) status.textContent = '';
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  /* ---- Confirmação de senha (cadastro) ---- */
  const confirm = form.querySelector('[data-match]');
  const checkMatch = () => {
    if (!confirm) return;
    const original = document.getElementById(confirm.dataset.match);
    confirm.setCustomValidity(original && original.value !== confirm.value ? 'As senhas não são iguais.' : '');
  };
  confirm?.addEventListener('input', checkMatch);
  confirm && document.getElementById(confirm.dataset.match)?.addEventListener('input', checkMatch);

  /* ---- Envio ---- */
  form.addEventListener('submit', async event => {
    event.preventDefault();
    checkMatch();

    if (!form.checkValidity()) {
      const first = form.querySelector(':invalid');
      if (status) status.textContent = first?.validationMessage || 'Preencha todos os campos para continuar.';
      first?.focus();
      return;
    }

    const email = form.querySelector('#email').value.trim().toLowerCase();
    const senha = form.querySelector('#senha').value;
    const nomeDigitado = form.querySelector('#nome')?.value.trim();
    const cadastro = Boolean(nomeDigitado);

    const button = form.querySelector('.auth-submit');
    const rotulo = button.textContent;
    button.disabled = true;
    button.textContent = cadastro ? 'Criando conta' : 'Entrando';
    if (status) status.textContent = '';

    let perfil;
    try {
      const dados = await window.EloSessao.api(cadastro ? 'cadastro' : 'login', {
        method: 'POST',
        body: cadastro ? { nome: nomeDigitado, email, senha, foto } : { email, senha }
      });
      perfil = { ...dados.cuidador, token: dados.token };
    } catch (e) {
      // o backend respondeu (email já usado, senha errada, conta inexistente,
      // banco fora) ou nem foi alcançado: em nenhum caso a pessoa entra
      if (status) status.textContent = e.status ? e.message : 'Não consegui falar com o servidor da ELO. Confira sua conexão e tente de novo em instantes.';
      button.disabled = false;
      button.textContent = rotulo;
      (e.status === 401 ? form.querySelector('#senha') : form.querySelector('#email'))?.focus();
      if (!e.status) console.warn('Backend indisponível em', window.ELO_API_URL, e);
      return;
    }

    window.EloSessao.entrar(perfil);
    localStorage.setItem('elo-cuidador', perfil.nome.split(' ')[0]);
    setTimeout(() => { window.location.href = form.dataset.next || 'painel.html'; }, 400);
  });
});
