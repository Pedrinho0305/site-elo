/* ==========================================================================
   Painel · Pochete ao vivo
   ---------------------------------------------------------------------------
   Só funciona com sessão do backend (token). Faz quatro coisas:
     1. ouve GET /api/eventos/stream (SSE) e mostra cada aviso na hora:
        toast, tile "Último alerta", bateria e localização; se o servidor
        não tem stream (serverless, como na Vercel), consulta a cada 10 s;
     2. mostra a corrida pendente com Aprovar / Recusar e acompanha o status;
     3. vincula pochetes (gera a chave) e o Telegram;
     4. simula os botões da pochete para testar.
   Sem token (sessão antiga, sem login no servidor), a seção explica e para por aqui.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const sessao = window.EloSessao?.ler();
  const api = (rota, opcoes) => window.EloSessao.api(rota, opcoes);
  const $ = id => document.getElementById(id);

  const secao = $('pochete');
  if (!secao) return;

  if (!sessao?.token) {
    secao.querySelector('.pochete-grid').innerHTML = '<div class="panel"><h3>Precisa entrar de novo</h3><p class="muted">Esta parte fala com o servidor da ELO e a sua sessão não tem um login nele. Saia e entre de novo para vincular a pochete e receber os avisos.</p></div>';
    return;
  }

  let pochetes = [];
  let corridaAtual = null;
  let telegram = { vinculado: false, codigo: null, bot: '', simulado: true };

  /* ---------------------------------------------------------------------
     Avisos na tela
     --------------------------------------------------------------------- */
  const ICONES = {
    emergencia: '🚨', transporte: '🚕', bateria: '🔋', localizacao: '📍', teste: '✅', corrida: '🚗', telegram: '✈️'
  };

  function toast(tipo, titulo, texto, duracao = 8000) {
    const el = document.createElement('div');
    el.className = `toast toast--${tipo}`;
    el.innerHTML = `<span class="toast-icon">${ICONES[tipo] || '•'}</span><div><strong></strong><p></p></div><button type="button" aria-label="Fechar">✕</button>`;
    el.querySelector('strong').textContent = titulo;
    el.querySelector('p').textContent = texto;
    el.querySelector('button').addEventListener('click', () => el.remove());
    $('toasts').prepend(el);
    if (duracao) setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 400); }, duracao);
  }

  const hora = d => new Date(d || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const mapa = p => p ? `https://maps.google.com/?q=${p.lat},${p.lng}` : null;

  function atualizarTiles(p) {
    if (!p) return;
    if (p.bateria != null) {
      $('tileBateria').textContent = `${p.bateria}%`;
      $('tileBateriaBarra').style.setProperty('--v', `${p.bateria}%`);
      $('tileBateriaNota').textContent = p.bateria <= 20 ? 'Bateria baixa: carregue hoje' : 'Carga restante';
    }
    if (p.posicao) {
      $('tileLocal').textContent = 'Atualizada';
      $('tileLocalNota').innerHTML = `${hora()} · <a href="${mapa(p.posicao)}" target="_blank" rel="noopener">ver no mapa</a>`;
    }
    $('tileStatus').textContent = '100%';
    $('tileStatusNota').textContent = `${p.nome_idoso || 'Pochete'} conectada`;
  }

  function marcarAlerta(titulo, nota, cor) {
    $('tileAlerta').textContent = titulo;
    $('tileAlertaNota').textContent = nota;
    const card = $('tileAlertaCard');
    card.classList.remove('tile--orange', 'tile--red', 'tile--green');
    card.classList.add(cor);
  }

  /* ---------------------------------------------------------------------
     Corrida
     --------------------------------------------------------------------- */
  const STATUS = {
    pendente: ['Esperando sua aprovação', 'A corrida só é chamada depois do seu ok.'],
    aprovada: ['Chamando o carro', 'Falando com a Uber.'],
    solicitada: ['Procurando motorista', 'A Uber está buscando um carro.'],
    a_caminho: ['Motorista a caminho', ''],
    em_andamento: ['Em viagem', 'A pessoa está no carro.'],
    concluida: ['Corrida concluída', 'Chegou ao destino.'],
    recusada: ['Recusada', 'Você recusou o pedido.'],
    cancelada: ['Cancelada', ''],
    sem_motorista: ['Sem motorista', 'Nenhum carro disponível agora. Tente de novo.'],
    erro: ['Não deu certo', ''],
  };

  function renderCorrida(c) {
    const painel = $('corridaPanel');
    corridaAtual = c;
    if (!c || ['recusada', 'cancelada', 'concluida', 'erro', 'sem_motorista'].includes(c.status) && Date.now() - new Date(c.atualizado_em || c.criado_em).getTime() > 5 * 60 * 1000) {
      painel.hidden = true; painel.innerHTML = ''; return;
    }
    const [titulo, nota] = STATUS[c.status] || [c.status, ''];
    const pochete = pochetes.find(p => p.id === c.pochete_id);
    const ativa = ['pendente', 'aprovada', 'solicitada', 'a_caminho', 'em_andamento'].includes(c.status);
    painel.hidden = false;
    painel.className = `ride-panel ride-panel--${c.status}`;
    painel.innerHTML = `
      <div class="ride-head">
        <span class="ride-icon" aria-hidden="true">🚕</span>
        <div>
          <h2>${titulo}</h2>
          <p>${pochete ? pochete.nome_idoso : 'A pochete'} pediu um carro para <strong>${c.destino.nome || 'o destino informado'}</strong> às ${hora(c.criado_em)}.
             ${c.produto ? `${c.produto}${c.valor ? ', ' + c.valor : ''}.` : ''} ${c.eta_min != null && ativa ? `Chega em ~${c.eta_min} min.` : ''}
             ${c.motorista ? `Motorista: ${c.motorista}${c.veiculo ? ' · ' + c.veiculo : ''}.` : ''} ${c.erro ? c.erro : nota}</p>
        </div>
      </div>
      <div class="ride-actions">
        <a class="btn btn-outline" href="${mapa(c.origem)}" target="_blank" rel="noopener">Ver no mapa</a>
        ${c.status === 'pendente' ? '<button type="button" class="btn btn-green" data-corrida="aprovar">Aprovar corrida</button><button type="button" class="btn btn-outline" data-corrida="recusar">Recusar</button>' : ''}
        ${['aprovada', 'solicitada', 'a_caminho'].includes(c.status) ? '<button type="button" class="btn btn-outline" data-corrida="cancelar">Cancelar corrida</button>' : ''}
        ${!ativa ? '<button type="button" class="btn btn-outline" data-corrida="fechar">Fechar</button>' : ''}
      </div>`;

    painel.querySelectorAll('[data-corrida]').forEach(b => b.addEventListener('click', async () => {
      const acao = b.dataset.corrida;
      if (acao === 'fechar') { painel.hidden = true; return; }
      painel.querySelectorAll('button').forEach(x => { x.disabled = true; });
      try {
        const { corrida } = await api(`corridas/${c.id}/${acao}`, { method: 'POST' });
        renderCorrida(corrida);
      } catch (e) {
        toast('corrida', 'Não deu certo', e.message);
        painel.querySelectorAll('button').forEach(x => { x.disabled = false; });
      }
    }));
  }

  /* ---------------------------------------------------------------------
     Chamar Uber pelo painel
     ---------------------------------------------------------------------
     Partida: a última posição da pochete; se ela ainda não falou com o
     servidor, a do navegador (funciona no computador e no celular, com
     permissão). Destino: o endereço de casa cadastrado na pochete.

     O servidor responde de dois jeitos (POST /api/corridas):
       modo "api"  → tem credencial da Uber: a corrida é pedida e o painel
                     acompanha o status aqui dentro, como o fluxo da pochete;
       modo "link" → sem credencial: vem o link universal do Uber, que abre o
                     app no celular e o site no computador com partida e
                     destino prontos. Ninguém finge corrida que não existe.
     --------------------------------------------------------------------- */
  function posicaoDoNavegador() {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
      );
    });
  }

  function renderLinkUber({ link, destino, aviso }) {
    const painel = $('corridaPanel');
    corridaAtual = null;
    painel.hidden = false;
    painel.className = 'ride-panel ride-panel--link';
    painel.innerHTML = `
      <div class="ride-head">
        <span class="ride-icon" aria-hidden="true">🚕</span>
        <div>
          <h2>Uber pronto para pedir</h2>
          <p>Abri o Uber ${destino ? `com destino <strong>${destino.nome || 'cadastrado'}</strong> já preenchido` : 'com a partida já preenchida'}.
             No celular ele abre no aplicativo; no computador, no site do Uber. Confirme o carro por lá.
             ${aviso ? `<br><span class="muted">${aviso}</span>` : ''}</p>
        </div>
      </div>
      <div class="ride-actions">
        <a class="btn btn-green" href="${link}" target="_blank" rel="noopener">Abrir o Uber</a>
        <button type="button" class="btn btn-outline" data-corrida="fechar">Fechar</button>
      </div>`;
    painel.querySelector('[data-corrida="fechar"]').addEventListener('click', () => { painel.hidden = true; });
    painel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  $('acaoUber')?.addEventListener('click', async () => {
    const botao = $('acaoUber');
    const nota = $('acaoUberNota');
    const textoNota = nota.textContent;
    botao.disabled = true;

    try {
      // A pochete sabe onde está? Senão, pergunta ao navegador.
      const pochete = pochetes[0] || null;
      let origem = pochete?.posicao || null;
      if (!origem) {
        nota.textContent = 'Procurando sua localização…';
        origem = await posicaoDoNavegador();
      }

      nota.textContent = 'Falando com a Uber…';
      const r = await api('corridas', {
        method: 'POST',
        body: { pochete_id: pochete?.id, origem: origem || undefined }
      });

      if (r.modo === 'link') {
        renderLinkUber(r);
        // O clique já passou por um await, então o navegador pode bloquear a
        // aba nova: o botão "Abrir o Uber" do painel continua ali para isso.
        const aba = window.open(r.link, '_blank', 'noopener');
        if (!aba) toast('corrida', 'Toque em "Abrir o Uber"', 'O navegador bloqueou a aba nova. O botão está logo acima dos números.');
      } else {
        renderCorrida(r.corrida);
        toast('corrida', 'Carro chamado', 'Acompanhe o status no painel da corrida.');
      }
    } catch (e) {
      toast('corrida', 'Não deu certo', e.message);
    } finally {
      nota.textContent = textoNota;
      botao.disabled = false;
    }
  });

  async function carregarCorridas() {
    try {
      const { corridas } = await api('corridas');
      const ativa = corridas.find(c => ['pendente', 'aprovada', 'solicitada', 'a_caminho', 'em_andamento'].includes(c.status));
      renderCorrida(ativa || null);
    } catch (e) { console.warn('corridas', e.message); }
  }

  /* ---------------------------------------------------------------------
     Stream em tempo real
     --------------------------------------------------------------------- */
  function ouvir() {
    const fonte = new EventSource(`${window.ELO_API_URL}/eventos/stream?token=${encodeURIComponent(sessao.token)}`);

    fonte.addEventListener('emergencia', e => {
      const { pochete } = JSON.parse(e.data).dados;
      atualizarTiles(pochete);
      marcarAlerta('Emergência', `${pochete.nome_idoso}, ${hora()}`, 'tile--red');
      toast('emergencia', `Emergência: ${pochete.nome_idoso}`, `Botão vermelho apertado às ${hora()}. O SAMU foi acionado.${pochete.posicao ? ' Toque em Localização para ver no mapa.' : ''}`, 0);
    });
    fonte.addEventListener('transporte', e => {
      const { pochete, corrida } = JSON.parse(e.data).dados;
      atualizarTiles(pochete);
      marcarAlerta('Pedido de carro', `${pochete.nome_idoso}, ${hora()}`, 'tile--orange');
      toast('transporte', `${pochete.nome_idoso} pediu um carro`, 'Aprove ou recuse no painel de corrida, logo acima dos números.', 12000);
      if (corrida) renderCorrida(corrida);
    });
    fonte.addEventListener('bateria', e => {
      const { pochete } = JSON.parse(e.data).dados;
      atualizarTiles(pochete);
      if (pochete.bateria <= 20) { marcarAlerta('Bateria baixa', `${pochete.bateria}%, ${hora()}`, 'tile--orange'); toast('bateria', 'Bateria baixa', `A pochete de ${pochete.nome_idoso} está com ${pochete.bateria}%.`); }
    });
    fonte.addEventListener('localizacao', e => atualizarTiles(JSON.parse(e.data).dados.pochete));
    fonte.addEventListener('teste', e => { const { pochete } = JSON.parse(e.data).dados; atualizarTiles(pochete); toast('teste', 'Teste recebido', `A pochete de ${pochete.nome_idoso} está funcionando.`); });
    fonte.addEventListener('corrida', e => {
      const { corrida } = JSON.parse(e.data).dados;
      renderCorrida(corrida);
      const [titulo] = STATUS[corrida.status] || [corrida.status];
      if (['a_caminho', 'em_andamento', 'concluida', 'sem_motorista', 'erro'].includes(corrida.status)) toast('corrida', titulo, corrida.motorista || corrida.erro || '');
    });
    fonte.addEventListener('telegram', () => { telegram.vinculado = true; renderTelegram(); toast('telegram', 'Telegram vinculado', 'Os avisos vão chegar lá também.'); });
    fonte.onerror = () => {
      // Queda de rede: o EventSource reconecta sozinho. Fechado de vez (o
      // servidor respondeu 501, sem stream em serverless): passa a consultar.
      if (fonte.readyState === EventSource.CLOSED) consultar();
    };
  }

  /* Sem stream, o painel pergunta ao servidor a cada 10 s o que mudou:
     eventos novos viram avisos, a corrida ativa é atualizada. */
  let consultando = false;
  let ultimoEventoId = null;
  function consultar() {
    if (consultando) return;
    consultando = true;
    const tique = async () => {
      if (document.hidden) return;
      try {
        const { eventos } = await api('eventos?limite=10');
        // a primeira consulta só marca de onde começar (nada de reavisar o que é antigo)
        const novos = ultimoEventoId == null ? [] : eventos.filter(e => e.id > ultimoEventoId);
        ultimoEventoId = Math.max(ultimoEventoId ?? 0, ...eventos.map(e => e.id));
        for (const ev of novos.reverse()) {
          const p = pochetes.find(x => x.id === ev.pochete_id) || {};
          const nome = ev.nome_idoso || p.nome_idoso || 'A pochete';
          if (ev.tipo === 'emergencia') { marcarAlerta('Emergência', `${nome}, ${hora(ev.criado_em)}`, 'tile--red'); toast('emergencia', `Emergência: ${nome}`, `Botão vermelho apertado às ${hora(ev.criado_em)}. O SAMU foi acionado.`, 0); }
          if (ev.tipo === 'transporte') { marcarAlerta('Pedido de carro', `${nome}, ${hora(ev.criado_em)}`, 'tile--orange'); toast('transporte', `${nome} pediu um carro`, 'Aprove ou recuse no painel de corrida, logo acima dos números.', 12000); }
          if (ev.tipo === 'bateria' && ev.dados?.bateria <= 20) { marcarAlerta('Bateria baixa', `${ev.dados.bateria}%, ${hora(ev.criado_em)}`, 'tile--orange'); toast('bateria', 'Bateria baixa', `A pochete de ${nome} está com ${ev.dados.bateria}%.`); }
          if (ev.tipo === 'teste') toast('teste', 'Teste recebido', `A pochete de ${nome} está funcionando.`);
        }
        await carregarPochetes();
        await carregarCorridas();
      } catch (e) { console.warn('consulta', e.message); }
    };
    tique();
    setInterval(tique, 10_000);
  }

  /* ---------------------------------------------------------------------
     Pochetes
     --------------------------------------------------------------------- */
  function renderPochetes() {
    const lista = $('pocheteLista');
    if (!pochetes.length) { lista.innerHTML = '<p class="muted">Nenhuma pochete vinculada ainda. Cadastre abaixo para receber a chave.</p>'; return; }
    lista.innerHTML = pochetes.map(p => `
      <div class="pochete-item" data-id="${p.id}">
        <div>
          <strong>${p.nome_idoso}</strong>
          <span class="muted">${p.bateria != null ? `Bateria ${p.bateria}% · ` : ''}${p.ultimo_contato ? 'Último contato ' + hora(p.ultimo_contato) : 'Ainda não falou com o servidor'}${p.casa ? ' · Casa: ' + (p.casa.nome || 'cadastrada') : ' · Sem endereço de casa'}</span>
        </div>
        <div class="pochete-item-actions">
          <button type="button" class="btn btn-outline" data-acao="chave">Nova chave</button>
          <button type="button" class="btn btn-outline btn-danger" data-acao="apagar">Desvincular</button>
        </div>
      </div>`).join('');

    lista.querySelectorAll('[data-acao]').forEach(b => b.addEventListener('click', async () => {
      const id = Number(b.closest('.pochete-item').dataset.id);
      try {
        if (b.dataset.acao === 'chave') {
          if (!confirm('Gerar uma chave nova? A antiga para de funcionar na hora.')) return;
          const { chave } = await api(`pochetes/${id}/chave`, { method: 'POST' });
          mostrarChave(chave);
        } else {
          if (!confirm('Desvincular esta pochete? O histórico dela também some.')) return;
          await api(`pochetes/${id}`, { method: 'DELETE' });
          await carregarPochetes();
        }
      } catch (e) { toast('corrida', 'Não deu certo', e.message); }
    }));
  }

  function mostrarChave(chave) {
    $('keyValue').textContent = chave;
    $('keyBox').hidden = false;
    $('keyBox').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function carregarPochetes() {
    try {
      ({ pochetes } = await api('pochetes'));
      renderPochetes();
      if (pochetes[0]) atualizarTiles({ ...pochetes[0], nome_idoso: pochetes[0].nome_idoso });
      $('simularPanel').classList.toggle('is-disabled', !pochetes.length);
    } catch (e) { $('pocheteLista').innerHTML = `<p class="muted">${e.message}</p>`; }
  }

  $('keyCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('keyValue').textContent); $('keyCopy').textContent = 'Copiada'; setTimeout(() => { $('keyCopy').textContent = 'Copiar'; }, 2000); } catch {}
  });

  $('pUsarLocal').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      $('pCasaLat').value = pos.coords.latitude.toFixed(6);
      $('pCasaLng').value = pos.coords.longitude.toFixed(6);
    }, () => { $('pocheteStatus').textContent = 'Não consegui pegar a localização. Digite as coordenadas.'; $('pocheteStatus').classList.add('is-visible'); });
  });

  $('pocheteForm').addEventListener('submit', async e => {
    e.preventDefault();
    const status = $('pocheteStatus');
    const nome = $('pIdoso').value.trim();
    if (nome.length < 2) { status.textContent = 'Digite o nome de quem vai usar.'; status.classList.add('is-visible'); return; }
    const lat = parseFloat($('pCasaLat').value.replace(',', '.')), lng = parseFloat($('pCasaLng').value.replace(',', '.'));
    const casa = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, nome: $('pCasaNome').value.trim() || 'Casa' } : undefined;
    try {
      const { chave } = await api('pochetes', { method: 'POST', body: { nome_idoso: nome, telefone_idoso: $('pTelefone').value || null, casa } });
      e.target.reset(); $('pCasaNome').value = 'Casa';
      status.textContent = ''; status.classList.remove('is-visible');
      await carregarPochetes();
      mostrarChave(chave);
    } catch (err) { status.textContent = err.message; status.classList.add('is-visible'); }
  });

  /* ---------------------------------------------------------------------
     Telegram
     --------------------------------------------------------------------- */
  function renderTelegram() {
    const el = $('telegramEstado');
    if (telegram.vinculado) {
      el.innerHTML = `<p class="tg-ok"><span class="status-dot"></span>Telegram vinculado</p>
        <div class="tg-actions"><button type="button" class="btn btn-outline" data-tg="teste">Enviar mensagem de teste</button><button type="button" class="btn btn-outline btn-danger" data-tg="desvincular">Desvincular</button></div>`;
    } else if (telegram.simulado) {
      el.innerHTML = `<p class="muted">O bot do Telegram ainda não está configurado no servidor (<code>TELEGRAM_BOT_TOKEN</code>). Em modo simulado, as mensagens aparecem no terminal do servidor. Para testar o fluxo, informe um chat_id qualquer:</p>
        <div class="tg-form"><input type="text" id="tgChat" placeholder="chat_id (ex.: 123456789)" inputmode="numeric"><button type="button" class="btn btn-green" data-tg="vincular">Vincular</button></div>`;
    } else {
      el.innerHTML = `<p>Abra o bot <a href="https://t.me/${telegram.bot}" target="_blank" rel="noopener">@${telegram.bot}</a> no Telegram e mande:</p>
        <code class="key-value">/start ${telegram.codigo}</code>
        <p class="muted">Assim que a mensagem chegar, esta tela confirma sozinha.</p>`;
    }
    el.querySelectorAll('[data-tg]').forEach(b => b.addEventListener('click', async () => {
      try {
        if (b.dataset.tg === 'teste') { await api('telegram/teste', { method: 'POST' }); toast('telegram', 'Mensagem enviada', telegram.simulado ? 'Veja no terminal do servidor.' : 'Confira o seu Telegram.'); }
        if (b.dataset.tg === 'desvincular') { await api('telegram', { method: 'DELETE' }); telegram.vinculado = false; await carregarTelegram(); }
        if (b.dataset.tg === 'vincular') { await api('telegram/vincular', { method: 'POST', body: { chat_id: $('tgChat').value.trim() } }); telegram.vinculado = true; renderTelegram(); }
      } catch (e) { toast('telegram', 'Não deu certo', e.message); }
    }));
  }

  async function carregarTelegram() {
    try { telegram = await api('telegram/codigo', { method: 'POST' }); renderTelegram(); }
    catch (e) { $('telegramEstado').innerHTML = `<p class="muted">${e.message}</p>`; }
  }

  /* ---------------------------------------------------------------------
     Simulação dos botões
     --------------------------------------------------------------------- */
  const POSICAO_TESTE = { lat: -23.5612, lng: -46.6560 }; // Av. Paulista, para a demonstração

  async function simular(tipo, extra = {}) {
    const p = pochetes[0];
    const status = $('simularStatus');
    if (!p) { status.textContent = 'Vincule uma pochete primeiro.'; status.classList.add('is-visible'); return; }
    try {
      await api(`pochetes/${p.id}/simular`, { method: 'POST', body: { tipo, ...POSICAO_TESTE, ...extra } });
      status.textContent = `Enviado como ${p.nome_idoso}. O aviso chega em instantes.`;
    } catch (e) { status.textContent = e.message; }
    status.classList.add('is-visible');
    setTimeout(() => status.classList.remove('is-visible'), 5000);
  }

  document.querySelectorAll('[data-simular]').forEach(b => b.addEventListener('click', () => {
    simular(b.dataset.simular, b.dataset.bateria ? { bateria: Number(b.dataset.bateria) } : {});
  }));

  // A ação rápida "Enviar emergência" também passa pelo servidor quando há pochete
  document.querySelector('.actions-grid .action--red')?.addEventListener('click', () => { if (pochetes[0]) simular('emergencia'); });

  /* ---------------------------------------------------------------------
     Início
     --------------------------------------------------------------------- */
  ouvir();
  carregarPochetes().then(carregarCorridas);
  carregarTelegram();
});
