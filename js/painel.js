// Painel do cuidador: saudação, ações rápidas e "Meu perfil". A parte que
// fala com a pochete e o servidor está em painel-pochete.js.
document.addEventListener('DOMContentLoaded', () => {
  // Sem sessão (login no backend), o painel não faz sentido: volta para o login
  const session = window.EloSessao?.ler();
  if (!session) { window.location.replace('login.html'); return; }

  const greeting = document.getElementById('greetingName');
  if (greeting) greeting.textContent = session.nome.split(' ')[0];

  const status = document.getElementById('actionStatus');
  let timer;

  // cada ação rápida também vira card, com a cor e o ícone do próprio botão
  const COR_DA_ACAO = { green: 'var(--green)', blue: 'var(--blue-2)', red: 'var(--red)', purple: 'var(--purple)', orange: 'var(--orange)', teal: 'var(--teal)' };
  const cardDaAcao = button => {
    const cor = [...button.classList].find(c => c.startsWith('action--'))?.slice(8);
    window.EloAvisos?.mostrar({
      tipo: 'acao', cor: COR_DA_ACAO[cor] || 'var(--cyan)',
      icone: button.querySelector('.action-icon svg')?.innerHTML,
      rotulo: button.querySelector('.action-title')?.textContent,
      titulo: button.dataset.feedback,
      texto: 'Demonstração: esta ação ainda não fala com a pochete de verdade.',
      duracao: 6000,
    });
  };

  document.querySelectorAll('.action[data-feedback]').forEach(button => {
    button.addEventListener('click', () => {
      cardDaAcao(button);
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
        // guarda a foto na conta, no backend
        window.EloSessao.api('me', { method: 'PATCH', body: { foto: session.foto } }).catch(err => {
          if (perfilStatus) { perfilStatus.textContent = 'A foto ficou só neste navegador: ' + err.message; perfilStatus.classList.add('is-visible'); }
        });
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

  /* ---- Sino: os últimos alertas (emergência, pedido de carro, bateria baixa) ----
     O número no sino conta os que chegaram depois da última vez que o menu
     foi aberto (guardado em localStorage['elo-avisos-visto']). */
  const sino = document.querySelector('.app-bell');
  if (sino && session.token) {
    const noRelatorio = location.pathname.endsWith('relatorios.html');
    const menuSino = document.createElement('div');
    menuSino.className = 'bell-menu';
    menuSino.id = 'avisosMenu';
    menuSino.hidden = true;
    menuSino.setAttribute('role', 'dialog');
    menuSino.setAttribute('aria-label', 'Avisos');
    sino.after(menuSino);
    sino.setAttribute('aria-haspopup', 'dialog');
    sino.setAttribute('aria-expanded', 'false');
    sino.setAttribute('aria-controls', 'avisosMenu');
    const selo = document.createElement('span');
    selo.className = 'app-bell-badge';
    selo.hidden = true;
    sino.append(selo);

    const AVISO = {
      emergencia: ['Emergência', 'botão vermelho apertado', 'red'],
      transporte: ['Pedido de carro', 'botão amarelo apertado', 'orange'],
      bateria: ['Bateria baixa', '', 'orange'],
    };
    const ehAviso = e => e.tipo === 'emergencia' || e.tipo === 'transporte' || (e.tipo === 'bateria' && e.dados?.bateria <= 20);
    let avisos = [];
    const visto = () => { try { return Number(localStorage.getItem('elo-avisos-visto')) || 0; } catch { return 0; } };

    const renderSino = () => {
      const novos = avisos.filter(a => a.id > visto()).length;
      selo.hidden = !novos;
      selo.textContent = novos > 9 ? '9+' : String(novos);
      sino.setAttribute('aria-label', novos ? `Avisos: ${novos} novo${novos > 1 ? 's' : ''}` : 'Avisos: nenhum novo');
      const itens = avisos.slice(0, 6).map(a => {
        const [titulo, nota, cor] = AVISO[a.tipo];
        const d = new Date(a.criado_em);
        const hora = `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const detalhe = a.tipo === 'bateria' ? `${a.dados.bateria}%` : nota;
        const nome = String(a.nome_idoso || 'A pochete').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        return `<li class="bell-item bell-item--${cor}"><strong>${titulo}</strong><span>${nome}, ${detalhe}</span><time>${hora}</time></li>`;
      }).join('');
      menuSino.innerHTML = `
        <p class="bell-title">Avisos da pochete</p>
        ${itens ? `<ul class="bell-list">${itens}</ul>` : '<p class="bell-empty">Nenhum aviso por enquanto. Emergências, pedidos de carro e bateria baixa aparecem aqui.</p>'}
        <a class="bell-more" href="${noRelatorio ? '#registro' : 'relatorios.html#registro'}">Ver o registro completo</a>`;
      menuSino.querySelector('.bell-more').addEventListener('click', () => abrirSino(false));
    };

    const carregarAvisos = async () => {
      try {
        const { eventos } = await window.EloSessao.api('eventos?limite=50');
        avisos = eventos.filter(ehAviso);
        renderSino();
      } catch { /* sem servidor, o sino só fica sem número */ }
    };

    const abrirSino = abrir => {
      menuSino.hidden = !abrir;
      sino.setAttribute('aria-expanded', String(abrir));
      if (abrir && avisos[0]) {
        try { localStorage.setItem('elo-avisos-visto', String(avisos[0].id)); } catch {}
        selo.hidden = true;
        sino.setAttribute('aria-label', 'Avisos: nenhum novo');
      }
    };

    renderSino();
    sino.addEventListener('click', () => abrirSino(menuSino.hidden));
    document.addEventListener('click', e => { if (!menuSino.hidden && !e.target.closest('.app-bell, .bell-menu')) abrirSino(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menuSino.hidden) { abrirSino(false); sino.focus(); } });
    carregarAvisos();
    setInterval(() => { if (!document.hidden) carregarAvisos(); }, 30_000);
  }

  // Links ainda sem destino não navegam
  document.querySelectorAll('a[aria-disabled="true"]').forEach(link => {
    link.addEventListener('click', event => event.preventDefault());
  });
});
