// Cabeçalho: tema, menu mobile e perfil do cuidador.
// A sessão fica no navegador (localStorage 'elo-sessao': { nome, email, foto }).
// Quem está logado vê um chip de perfil no lugar de "Entrar", em todas as páginas.
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks') || document.querySelector('.nav-links');
  const htmlElement = document.documentElement;

  /* ---- Tema ---- */
  function updateThemeIcon(theme) {
    if (!themeToggle) return;
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle?.addEventListener('click', () => {
    const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  /* ---- Menu mobile ---- */
  menuToggle?.addEventListener('click', () => {
    const isOpen = navLinks?.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
    menuToggle.textContent = isOpen ? '✕' : '☰';
  });

  navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      menuToggle?.setAttribute('aria-expanded', 'false');
      if (menuToggle) menuToggle.textContent = '☰';
    });
  });

  /* ---- Perfil ---- */
  const slot = document.querySelector('[data-profile-slot]');
  const session = window.EloSessao.ler();
  if (!slot || !session) return;

  // O link "Entrar" aponta para login.html; a partir dele sabemos a pasta das páginas
  const base = (slot.getAttribute('href') || 'login.html').replace(/login\.html$/, '');
  const inicio = base ? 'index.html' : '../index.html'; // sem pasta = já estamos em /pages
  const initials = session.nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

  const profile = document.createElement('div');
  profile.className = 'profile';
  profile.innerHTML = `
    <button type="button" class="profile-chip" aria-haspopup="menu" aria-expanded="false" aria-label="Menu de ${session.nome}">
      <span class="profile-avatar">${session.foto ? `<img src="${session.foto}" alt="">` : initials}</span>
      <span class="profile-name">${session.nome.split(' ')[0]}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="profile-menu" role="menu" hidden>
      <div class="profile-head">
        <span class="profile-avatar profile-avatar--lg">${session.foto ? `<img src="${session.foto}" alt="">` : initials}</span>
        <div>
          <strong>${session.nome}</strong>
          <span>${session.email || 'Cuidador ELO'}</span>
        </div>
      </div>
      <a role="menuitem" href="${base}painel.html"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>Painel</a>
      <a role="menuitem" href="${base}relatorios.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16"/><path d="M6.5 16V10M11 16V5.5M15.5 16v-7M20 16v-4"/></svg>Relatórios</a>
      <a role="menuitem" href="${base}painel.html#perfil"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/></svg>Meu perfil</a>
      <a role="menuitem" href="${base}quem-somos.html#contato"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/></svg>Ajuda</a>
      <button type="button" role="menuitem" class="profile-logout"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10"/><path d="M15 8l4 4-4 4M9 12h10"/></svg>Sair</button>
    </div>`;

  slot.replaceWith(profile);

  const chip = profile.querySelector('.profile-chip');
  const menu = profile.querySelector('.profile-menu');

  const setOpen = open => {
    menu.hidden = !open;
    chip.setAttribute('aria-expanded', String(open));
    profile.classList.toggle('is-open', open);
  };

  chip.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('click', e => { if (!profile.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  profile.querySelector('.profile-logout').addEventListener('click', () => {
    window.EloSessao.sair();
    window.location.href = inicio;
  });

  // Sessão do backend: confirma que o token ainda vale (senão, sai)
  if (session.token) {
    window.EloSessao.api('me').then(({ cuidador }) => {
      window.EloSessao.entrar({ ...cuidador, token: session.token });
    }).catch(e => {
      if (e.status === 401) { localStorage.removeItem('elo-sessao'); window.location.reload(); }
    });
  }
});

/* Sessão: uma API mínima compartilhada por login, cadastro e painel.
   { nome, email, foto, token? } — o token existe quando o login foi feito
   no backend (backend/server.js); sem token é a demonstração local. */
window.ELO_API_URL = window.ELO_API_URL || 'http://localhost:3000/api';

window.EloSessao = {
  ler() {
    try { return JSON.parse(localStorage.getItem('elo-sessao')); } catch { return null; }
  },
  entrar(dados) {
    localStorage.setItem('elo-sessao', JSON.stringify(dados));
  },
  sair() {
    const s = this.ler();
    localStorage.removeItem('elo-sessao');
    // avisa o backend, sem esperar: a sessão local já acabou
    if (s?.token) this.api('logout', { method: 'POST' }).catch(() => {});
  },
  // Chamada ao backend com o token da sessão. Lança { status, message }.
  async api(rota, opcoes = {}) {
    const s = this.ler();
    const resposta = await fetch(`${window.ELO_API_URL}/${rota}`, {
      method: opcoes.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw Object.assign(new Error(dados.erro || 'Algo deu errado.'), { status: resposta.status });
    return dados;
  }
};
