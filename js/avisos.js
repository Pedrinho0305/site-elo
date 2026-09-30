/* ==========================================================================
   Avisos da pochete: o mesmo que chega no Telegram, em card, em qualquer página
   ---------------------------------------------------------------------------
   Quem está logado recebe no canto da tela um card para cada aviso que o
   servidor também manda ao Telegram: emergência, pedido de carro, bateria
   baixa e teste. Cada tipo tem cor, ícone e o que dá para fazer na hora
   ("Ligar 192", "Abrir no mapa", "Ver pedido"); quando o aviso traz posição,
   o card mostra o Google Maps num iframe pequeno (sem chave, sem biblioteca).

   Os botões do Painel também viram card na hora em que são apertados
   (simulação da pochete e ações rápidas), não só o que chega do servidor.

   Mapa dentro do site: EloAvisos.abrirMapa({ lat, lng, titulo }) abre uma
   janela com o Google Maps em iframe. Qualquer link com data-mapa="lat,lng"
   (e data-mapa-titulo, opcional) abre essa janela em vez de uma aba nova.

   De onde vêm:
     · no Painel, painel-pochete.js já recebe os eventos (stream ou consulta)
       e entrega aqui com EloAvisos.chegaram() / EloAvisos.evento();
     · nas outras páginas, este arquivo consulta GET /api/eventos a cada 15 s.
   localStorage['elo-avisos-ultimo'] guarda o último evento mostrado, para
   trocar de página não repetir nem perder aviso (só os da última meia hora).

   API: window.EloAvisos = { mostrar(opcoes), evento(ev, { sempre }), chegaram(eventos), abrirMapa(local) }
   mostrar({ tipo, rotulo?, titulo, texto, duracao?, fixo?, cor?, icone?, mapa?, acoes?: [{ texto, href?, aoClicar?, principal?, manter? }] })
   ========================================================================== */
(() => {
  const CHAVE_ULTIMO = 'elo-avisos-ultimo';
  const maxVisiveis = () => (matchMedia('(max-width: 560px)').matches ? 2 : 3); // no celular, 2
  const RECENTE_MS = 30 * 60 * 1000;
  const naPasta = location.pathname.includes('/pages/');
  const pagina = nome => (naPasta ? '' : 'pages/') + nome;

  const ICONE = {
    emergencia: '<path d="M12 3.8a7.2 7.2 0 0 1 7.2 7.2v4.6l1.7 2.9a1 1 0 0 1-.9 1.5H4a1 1 0 0 1-.9-1.5l1.7-2.9V11A7.2 7.2 0 0 1 12 3.8Z"/><path d="M12 8v4M12 15h.01"/>',
    transporte: '<path d="M5 16.5V12l1.8-4.6A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.4L19 12v4.5"/><path d="M3.5 12h17v4.5h-17z"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>',
    bateria: '<rect x="3" y="7.5" width="16" height="9" rx="2"/><path d="M21 10.5v3M6 10.5v3"/>',
    teste: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.3 2.3 4.7-5"/>',
    corrida: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
    telegram: '<path d="M21 4 3 11l6 2.2L18 7l-7 7.5V20l3.4-3.7L18.5 19 21 4Z"/>',
    local: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  };
  const ROTULO = { emergencia: 'Emergência', transporte: 'Pedido de carro', bateria: 'Bateria baixa', teste: 'Teste da pochete', corrida: 'Corrida', telegram: 'Telegram', local: 'Localização' };

  const texto = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lerUltimo = () => { try { const v = localStorage.getItem(CHAVE_ULTIMO); return v == null ? null : Number(v); } catch { return null; } };
  const gravarUltimo = id => { try { localStorage.setItem(CHAVE_ULTIMO, String(id)); } catch {} };

  function quando(d) {
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return min < 1 ? `agora, ${hora}` : min < 60 ? `há ${min} min, ${hora}` : hora;
  }

  /* ---------------------------------------------------------------------
     Google Maps: o iframe de incorporação não precisa de chave; o marcador
     vermelho do Google fica exatamente na posição
     --------------------------------------------------------------------- */
  const googleEmbed = (lat, lng, z = 16) => `https://maps.google.com/maps?q=${lat},${lng}&z=${z}&hl=pt-BR&output=embed`;
  const googleLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const googleRota = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  function mapaHTML(lat, lng) {
    return `<div class="aviso-mapa">
        <iframe src="${googleEmbed(lat, lng)}" title="Mapa com a localização da pochete" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        <span class="aviso-coord">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
      </div>`;
  }

  /* Janela com o mapa, dentro do site */
  let janela;
  function abrirMapa({ lat, lng, titulo = 'Localização da pochete' }) {
    lat = Number(lat); lng = Number(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!janela?.isConnected) {
      janela = document.createElement('dialog');
      janela.className = 'mapa-janela';
      janela.innerHTML = `
        <div class="mapa-janela-topo">
          <div><h2 class="mapa-janela-titulo"></h2><p class="mapa-janela-coord"></p></div>
          <button type="button" class="aviso-fechar" data-fechar aria-label="Fechar o mapa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>
        <div class="mapa-janela-quadro"><iframe title="Mapa" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
        <div class="aviso-acoes">
          <a class="aviso-acao aviso-acao--principal" data-rota target="_blank" rel="noopener">Como chegar</a>
          <a class="aviso-acao" data-google target="_blank" rel="noopener">Abrir no Google Maps</a>
        </div>`;
      janela.querySelector('[data-fechar]').addEventListener('click', () => janela.close());
      // clique fora do quadro fecha
      janela.addEventListener('click', e => { if (e.target === janela) janela.close(); });
      janela.addEventListener('close', () => janela.querySelector('iframe').removeAttribute('src'));
      document.body.append(janela);
    }
    janela.querySelector('.mapa-janela-titulo').textContent = titulo;
    janela.querySelector('.mapa-janela-coord').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    janela.querySelector('iframe').src = googleEmbed(lat, lng);
    janela.querySelector('[data-rota]').href = googleRota(lat, lng);
    janela.querySelector('[data-google]').href = googleLink(lat, lng);
    if (!janela.open) janela.showModal();
  }

  // Links com data-mapa="lat,lng" abrem a janela (o href continua como reserva)
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-mapa]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const [lat, lng] = link.dataset.mapa.split(',').map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    e.preventDefault();
    abrirMapa({ lat, lng, titulo: link.dataset.mapaTitulo || undefined });
  });

  /* ---------------------------------------------------------------------
     O card
     --------------------------------------------------------------------- */
  let pilha;
  function garantirPilha() {
    if (pilha?.isConnected) return pilha;
    pilha = document.createElement('section');
    pilha.className = 'avisos';
    pilha.setAttribute('aria-label', 'Avisos da pochete');
    document.body.append(pilha);
    return pilha;
  }

  /* Só um aviso fica aberto por vez (o mais novo, ou o que a pessoa clicou);
     os outros viram uma linha, para a pilha não cobrir a página. Emergência
     nunca encolhe. */
  function compactar(aberto) {
    pilha?.querySelectorAll('.aviso').forEach(c => {
      const encolher = c !== aberto && !c.classList.contains('aviso--emergencia');
      c.classList.toggle('is-compacto', encolher);
      if (encolher) c.setAttribute('title', 'Clique para ver o aviso inteiro'); else c.removeAttribute('title');
    });
  }

  function fechar(card) {
    if (card.classList.contains('is-saindo')) return;
    card.classList.add('is-saindo');
    setTimeout(() => card.remove(), 320);
  }

  function mostrar({ tipo = 'teste', rotulo, titulo, texto: corpo = '', duracao = 9000, fixo = false, acoes = [], mapa = null, bateria = null, em = new Date(), telegram = false, cor = null, icone = null }) {
    const card = document.createElement('article');
    card.className = `aviso aviso--${tipo}`;
    if (cor) card.style.setProperty('--c', cor); // o card de um botão usa a cor do botão
    card.setAttribute('role', tipo === 'emergencia' ? 'alert' : 'status');
    const tempo = fixo ? 0 : duracao;
    card.innerHTML = `
      <header class="aviso-topo">
        <span class="aviso-icone" aria-hidden="true"><svg viewBox="0 0 24 24">${icone || ICONE[tipo] || ICONE.teste}</svg></span>
        <div class="aviso-cabeca">
          <p class="aviso-rotulo">${texto(rotulo || ROTULO[tipo] || 'Aviso')}<span aria-hidden="true">·</span><time datetime="${em.toISOString()}">${quando(em)}</time></p>
          <h3 class="aviso-titulo">${texto(titulo)}</h3>
        </div>
        <button type="button" class="aviso-fechar" aria-label="Fechar aviso"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </header>
      ${corpo ? `<p class="aviso-texto">${texto(corpo)}</p>` : ''}
      ${bateria != null ? `<div class="aviso-bateria" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${bateria}" aria-label="Bateria"><span style="--v:${bateria}%"></span><b>${bateria}%</b></div>` : ''}
      ${mapa ? mapaHTML(mapa.lat, mapa.lng) : ''}
      ${acoes.length ? '<div class="aviso-acoes"></div>' : ''}
      ${telegram ? '<p class="aviso-canal"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONE.telegram + '</svg>Também enviado ao seu Telegram</p>' : ''}
      ${tempo ? `<span class="aviso-tempo" style="animation-duration:${tempo}ms" aria-hidden="true"></span>` : ''}`;

    const barra = card.querySelector('.aviso-acoes');
    acoes.forEach(a => {
      const el = document.createElement(a.href ? 'a' : 'button');
      el.className = 'aviso-acao' + (a.principal ? ' aviso-acao--principal' : '');
      el.textContent = a.texto;
      if (a.href) {
        el.href = a.href;
        if (/^https?:/.test(a.href)) { el.target = '_blank'; el.rel = 'noopener'; }
      } else el.type = 'button';
      el.addEventListener('click', e => { if (a.aoClicar) a.aoClicar(e); if (!a.manter) fechar(card); });
      barra.append(el);
    });
    card.querySelector('.aviso-fechar').addEventListener('click', () => fechar(card));

    // passar o mouse ou focar pausa o tempo; emergência nunca some sozinha
    let timer, restante = tempo, inicio;
    const contar = () => { if (!restante) return; inicio = Date.now(); timer = setTimeout(() => fechar(card), restante); card.classList.remove('is-pausado'); };
    const pausar = () => { if (!restante) return; clearTimeout(timer); restante = Math.max(1500, restante - (Date.now() - inicio)); card.classList.add('is-pausado'); };
    card.addEventListener('mouseenter', pausar);
    card.addEventListener('mouseleave', contar);
    card.addEventListener('focusin', pausar);
    card.addEventListener('focusout', contar);

    // clicar num card encolhido abre ele (e encolhe os outros)
    card.addEventListener('click', e => {
      if (!card.classList.contains('is-compacto') || e.target.closest('button, a')) return;
      compactar(card);
    });

    const alvo = garantirPilha();
    alvo.prepend(card);
    compactar(card);
    // no máximo 3 na tela: sai o mais antigo que não é fixo
    const cards = [...alvo.querySelectorAll('.aviso:not(.is-saindo)')];
    if (cards.length > maxVisiveis()) {
      const sobra = [...cards].reverse().find(c => !c.classList.contains('aviso--emergencia')) || cards[cards.length - 1];
      fechar(sobra);
    }
    contar();
    return card;
  }

  /* ---------------------------------------------------------------------
     Evento da pochete → card (os mesmos textos do Telegram)
     --------------------------------------------------------------------- */
  let telegramVinculado = false;

  // sempre: o aviso veio de um botão apertado agora, então até o que
  // normalmente é silencioso (bateria boa, localização) vira card
  function mostrarEvento(ev, { sempre = false } = {}) {
    const d = ev.dados || {};
    const nome = ev.nome_idoso || 'A pochete';
    const em = ev.criado_em ? new Date(ev.criado_em) : new Date();
    const mapa = d.lat != null && d.lng != null ? { lat: Number(d.lat), lng: Number(d.lng) } : null;
    const noMapa = mapa ? [{ texto: 'Abrir no mapa', manter: true, aoClicar: () => abrirMapa({ ...mapa, titulo: `Onde está ${nome}` }) }] : [];
    const base = { em, mapa, telegram: telegramVinculado };

    switch (ev.tipo) {
      case 'emergencia':
        return mostrar({ ...base, tipo: 'emergencia', fixo: true,
          titulo: `${nome} apertou o botão vermelho`,
          texto: 'Veja como está e, se for preciso, ligue 192 (SAMU).',
          acoes: [{ texto: 'Ligar 192', href: 'tel:192', principal: true }, ...noMapa] });
      case 'transporte': {
        const noPainel = document.getElementById('corridaPanel');
        return mostrar({ ...base, tipo: 'transporte', duracao: 20000,
          titulo: `${nome} quer um carro`,
          texto: `${d.destino?.nome ? `Destino: ${d.destino.nome}. ` : ''}O carro só é chamado depois que você aprovar.`,
          acoes: [noPainel
            ? { texto: 'Ver pedido', principal: true, aoClicar: () => noPainel.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
            : { texto: 'Aprovar no painel', principal: true, href: pagina('painel.html#corridaPanel') }, ...noMapa] });
      }
      case 'bateria':
        if (d.bateria == null || (d.bateria > 20 && !sempre)) return null;
        if (d.bateria > 20) return mostrar({ ...base, mapa: null, tipo: 'bateria', rotulo: 'Bateria', cor: 'var(--green)', duracao: 8000, bateria: d.bateria,
          titulo: `Pochete de ${nome} com ${d.bateria}%`, texto: 'Carga boa, nada a fazer por enquanto.' });
        return mostrar({ ...base, mapa: null, tipo: 'bateria', duracao: 12000, bateria: d.bateria,
          titulo: `Pochete de ${nome} com ${d.bateria}%`,
          texto: 'Lembre de carregar hoje à noite.' });
      case 'localizacao':
        if (!sempre || !mapa) return null; // no dia a dia só atualiza o painel
        return mostrar({ ...base, tipo: 'local', duracao: 12000,
          titulo: `Posição de ${nome} atualizada`,
          texto: 'Esta é a posição que a pochete acabou de mandar.',
          acoes: noMapa });
      case 'teste':
        return mostrar({ ...base, mapa: null, tipo: 'teste', duracao: 8000,
          titulo: `Pochete de ${nome} funcionando`,
          texto: 'Tudo certo por aqui: o teste chegou ao servidor.' });
      default:
        return null;
    }
  }

  // Um evento que acabou de acontecer (stream do painel ou botão apertado)
  function evento(ev, opcoes) {
    if (!ev) return;
    const ultimo = lerUltimo();
    if (ev.id != null && ultimo != null && ev.id <= ultimo) return;
    if (ev.id != null) gravarUltimo(Math.max(ultimo ?? 0, ev.id));
    mostrarEvento(ev, opcoes);
  }

  // Uma leva consultada: na primeira vez neste navegador só marca de onde
  // começar; depois, mostra o que é novo e recente
  function chegaram(eventos) {
    if (!eventos?.length) return;
    const maior = Math.max(...eventos.map(e => e.id));
    const ultimo = lerUltimo();
    gravarUltimo(Math.max(ultimo ?? 0, maior));
    if (ultimo == null) return;
    eventos
      .filter(e => e.id > ultimo && Date.now() - new Date(e.criado_em).getTime() < RECENTE_MS)
      .sort((a, b) => a.id - b.id)
      .forEach(mostrarEvento);
  }

  window.EloAvisos = { mostrar, evento, chegaram, abrirMapa };

  /* ---------------------------------------------------------------------
     Consulta nas páginas que não são o Painel
     --------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    const sessao = window.EloSessao?.ler();
    if (!sessao?.token) return;
    window.EloSessao.api('me').then(r => { telegramVinculado = Boolean(r.cuidador?.telegram); }).catch(() => {});
    if (document.getElementById('pochete')) return; // o Painel entrega os eventos por conta própria

    const consultar = async () => {
      if (document.hidden) return;
      try { chegaram((await window.EloSessao.api('eventos?limite=10')).eventos); } catch { /* sem servidor, sem aviso */ }
    };
    consultar();
    setInterval(consultar, 15_000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) consultar(); });
  });
})();
