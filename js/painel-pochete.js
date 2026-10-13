/* ==========================================================================
   Painel · Pochete ao vivo
   ---------------------------------------------------------------------------
   Só funciona com sessão do backend (token). Faz estas coisas:
     1. ouve GET /api/eventos/stream (SSE) e mostra cada aviso na hora:
        toast, tile "Último alerta", bateria e localização; se o servidor
        não tem stream (serverless, como na Vercel), consulta a cada 10 s;
     2. mostra a corrida pendente com Aprovar / Recusar e acompanha o status;
     3. vincula pochetes (gera a chave, endereço de casa por texto) e o Telegram;
     4. simula os botões da pochete para testar;
     5. ações rápidas: ligar para a pessoa (discador no celular, janela com
        QR Code no computador, via EloAvisos.ligar), mensagem para a pochete
        (POST /api/pochetes/:id/recados) e onde ela está agora.
   Familiares ficam em painel-familia.js.
   Sem token (sessão antiga, sem login no servidor), a seção explica e para por aqui.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const sessao = window.EloSessao?.ler();
  const api = (rota, opcoes) => window.EloSessao.api(rota, opcoes);
  const $ = id => document.getElementById(id);
  // Tudo que vem do servidor (nomes, destinos, mensagens de erro) e pode ter
  // sido escrito por outra pessoa ou pela própria pochete passa por esc()
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number.isFinite(Number(n)) ? Number(n) : 0;

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
     Avisos na tela: o card de js/avisos.js, o mesmo das outras páginas.
     Os eventos da pochete (emergência, carro, bateria, teste) vão inteiros
     para EloAvisos, que monta o card com o mesmo texto do Telegram; os
     recados do próprio painel (corrida, Telegram, erros) passam por aqui.
     --------------------------------------------------------------------- */
  const avisos = window.EloAvisos;
  function toast(tipo, titulo, texto, duracao = 8000) {
    avisos?.mostrar({ tipo, titulo, texto, duracao, fixo: duracao === 0 });
  }

  const hora = d => new Date(d || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const mapa = p => p ? `https://maps.google.com/?q=${num(p.lat)},${num(p.lng)}` : null;

  function atualizarTiles(p) {
    if (!p) return;
    if (p.bateria != null) {
      $('tileBateria').textContent = `${p.bateria}%`;
      $('tileBateriaBarra').style.setProperty('--v', `${p.bateria}%`);
      $('tileBateriaNota').textContent = p.bateria <= 20 ? 'Bateria baixa: carregue hoje' : 'Carga restante';
    }
    if (p.posicao) {
      $('tileLocal').textContent = 'Atualizada';
      $('tileLocalNota').innerHTML = `${hora()} · <a href="${mapa(p.posicao)}" target="_blank" rel="noopener" data-mapa="${num(p.posicao.lat)},${num(p.posicao.lng)}" data-mapa-titulo="Onde está ${esc(p.nome_idoso || 'a pochete')}">ver no mapa</a>`;
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
          <h2>${esc(titulo)}</h2>
          <p>${esc(pochete ? pochete.nome_idoso : 'A pochete')} pediu um carro para <strong>${esc(c.destino.nome || 'o destino informado')}</strong> às ${hora(c.criado_em)}.
             ${c.produto ? `${esc(c.produto)}${c.valor ? ', ' + esc(c.valor) : ''}.` : ''} ${c.eta_min != null && ativa ? `Chega em ~${num(c.eta_min)} min.` : ''}
             ${c.motorista ? `Motorista: ${esc(c.motorista)}${c.veiculo ? ' · ' + esc(c.veiculo) : ''}.` : ''} ${esc(c.erro ? c.erro : nota)}</p>
        </div>
      </div>
      <div class="ride-actions">
        <a class="btn btn-outline" href="${mapa(c.origem)}" target="_blank" rel="noopener" data-mapa="${num(c.origem.lat)},${num(c.origem.lng)}" data-mapa-titulo="De onde a corrida sai">Ver no mapa</a>
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
          <p>Abri o Uber ${destino ? `com destino <strong>${esc(destino.nome || 'cadastrado')}</strong> já preenchido` : 'com a partida já preenchida'}.
             No celular ele abre no aplicativo; no computador, no site do Uber. Confirme o carro por lá.
             ${aviso ? `<br><span class="muted">${esc(aviso)}</span>` : ''}</p>
        </div>
      </div>
      <div class="ride-actions">
        <a class="btn btn-green" href="${/^https:\/\/m\.uber\.com\//.test(link) ? esc(link) : 'https://m.uber.com/ul/'}" target="_blank" rel="noopener">Abrir o Uber</a>
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
      const { pochete, evento } = JSON.parse(e.data).dados;
      atualizarTiles(pochete);
      marcarAlerta('Emergência', `${pochete.nome_idoso}, ${hora()}`, 'tile--red');
      avisos?.evento(evento);
    });
    fonte.addEventListener('transporte', e => {
      const { pochete, corrida, evento } = JSON.parse(e.data).dados;
      atualizarTiles(pochete);
      marcarAlerta('Pedido de carro', `${pochete.nome_idoso}, ${hora()}`, 'tile--orange');
      if (corrida) renderCorrida(corrida);
      avisos?.evento(evento);
    });
    fonte.addEventListener('bateria', e => {
      const { pochete, evento } = JSON.parse(e.data).dados;
      atualizarTiles(pochete);
      if (pochete.bateria <= 20) marcarAlerta('Bateria baixa', `${pochete.bateria}%, ${hora()}`, 'tile--orange');
      avisos?.evento(evento);
    });
    fonte.addEventListener('localizacao', e => atualizarTiles(JSON.parse(e.data).dados.pochete));
    fonte.addEventListener('teste', e => { const { pochete, evento } = JSON.parse(e.data).dados; atualizarTiles(pochete); avisos?.evento(evento); });
    fonte.addEventListener('corrida', e => {
      const { corrida } = JSON.parse(e.data).dados;
      renderCorrida(corrida);
      const [titulo] = STATUS[corrida.status] || [corrida.status];
      if (['a_caminho', 'em_andamento', 'concluida', 'sem_motorista', 'erro'].includes(corrida.status)) toast('corrida', titulo, corrida.motorista || corrida.erro || '');
    });
    fonte.addEventListener('recado', e => recadoMudou(JSON.parse(e.data).dados));
    fonte.addEventListener('telegram', () => { telegram.vinculado = true; renderTelegram(); toast('telegram', 'Telegram vinculado', 'Os avisos vão chegar lá também.'); });
    fonte.onerror = () => {
      // Queda de rede: o EventSource reconecta sozinho. Fechado de vez (o
      // servidor respondeu 501, sem stream em serverless): passa a consultar.
      if (fonte.readyState === EventSource.CLOSED) consultar();
    };
  }

  /* Sem stream, o painel pergunta ao servidor a cada 10 s o que mudou:
     eventos novos acendem o tile "Último alerta" e viram cards (EloAvisos
     decide o que é novo, inclusive o que chegou enquanto se estava em outra
     página); a corrida ativa é atualizada. */
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
          if (ev.tipo === 'emergencia') marcarAlerta('Emergência', `${nome}, ${hora(ev.criado_em)}`, 'tile--red');
          if (ev.tipo === 'transporte') marcarAlerta('Pedido de carro', `${nome}, ${hora(ev.criado_em)}`, 'tile--orange');
          if (ev.tipo === 'bateria' && ev.dados?.bateria <= 20) marcarAlerta('Bateria baixa', `${ev.dados.bateria}%, ${hora(ev.criado_em)}`, 'tile--orange');
        }
        avisos?.chegaram(eventos);
        await carregarPochetes();
        await carregarCorridas();
        await conferirRecados();
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
      <div class="pochete-item" data-id="${num(p.id)}">
        <div>
          <strong>${esc(p.nome_idoso)}</strong>
          <span class="muted">${p.bateria != null ? `Bateria ${num(p.bateria)}% · ` : ''}${p.ultimo_contato ? 'Último contato ' + hora(p.ultimo_contato) : 'Ainda não falou com o servidor'}</span>
          <span class="muted pochete-endereco">${p.endereco ? 'Casa: ' + esc(p.endereco) + (p.casa ? '' : ' <em class="aviso-endereco">(não achei no mapa: confira o número e a cidade)</em>') : 'Sem endereço de casa'}</span>
        </div>
        <div class="pochete-item-actions">
          <button type="button" class="btn btn-outline" data-acao="editar">Editar</button>
          <button type="button" class="btn btn-outline" data-acao="chave">Nova chave</button>
          <button type="button" class="btn btn-outline btn-danger" data-acao="apagar">Desvincular</button>
        </div>
      </div>`).join('');

    lista.querySelectorAll('[data-acao]').forEach(b => b.addEventListener('click', async () => {
      const id = Number(b.closest('.pochete-item').dataset.id);
      try {
        if (b.dataset.acao === 'editar') { editarPochete(b.closest('.pochete-item'), pochetes.find(x => x.id === id)); return; }
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

  // Endereço de casa e telefone direto na lista: dois campos, salvar, pronto
  function editarPochete(item, p) {
    if (!p || item.querySelector('.endereco-form')) return;
    const form = document.createElement('form');
    form.className = 'endereco-form';
    form.innerHTML = `
      <div class="endereco-campos">
        <div class="form-field">
          <label for="endereco-${num(p.id)}">Endereço de casa</label>
          <input type="text" id="endereco-${num(p.id)}" autocomplete="street-address" placeholder="Rua das Flores, 123, Jardim Paulista, São Paulo">
        </div>
        <div class="form-field">
          <label for="telefone-${num(p.id)}">Telefone dela</label>
          <input type="tel" id="telefone-${num(p.id)}" placeholder="(11) 99999-0000">
        </div>
      </div>
      <div class="endereco-linha">
        <button type="submit" class="btn btn-green">Salvar</button>
        <button type="button" class="btn btn-outline" data-cancelar>Cancelar</button>
      </div>
      <p class="muted" role="status"></p>`;
    const campo = form.querySelector(`#endereco-${num(p.id)}`);
    const telefone = form.querySelector(`#telefone-${num(p.id)}`);
    campo.value = p.endereco || '';
    telefone.value = p.telefone_idoso || '';
    form.querySelector('[data-cancelar]').addEventListener('click', () => form.remove());
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const aviso = form.querySelector('[role="status"]');
      const botao = form.querySelector('[type="submit"]');
      const endereco = campo.value.trim();
      const mudouEndereco = endereco !== (p.endereco || '');
      botao.disabled = true; aviso.textContent = mudouEndereco && endereco ? 'Procurando o endereço no mapa…' : 'Salvando…';
      try {
        const { pochete } = await api(`pochetes/${p.id}`, { method: 'PATCH', body: {
          telefone_idoso: telefone.value.trim() || null,
          ...(mudouEndereco ? { casa: endereco ? { endereco } : null } : {}),
        } });
        const semMapa = pochete.endereco && !pochete.casa;
        toast('teste', semMapa ? 'Salvo, mas não achei o endereço no mapa' : 'Pochete atualizada',
          semMapa ? 'O Uber vai receber o endereço escrito. Se puder, confira o número e a cidade.' : 'O endereço é o destino quando o botão preto pede um carro.');
        await carregarPochetes();
      } catch (err) { aviso.textContent = err.message; botao.disabled = false; }
    });
    item.append(form);
    campo.focus();
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
      atualizarAcoes();
      if (pochetes[0]) atualizarTiles({ ...pochetes[0], nome_idoso: pochetes[0].nome_idoso });
      $('simularPanel').classList.toggle('is-disabled', !pochetes.length);
    } catch (e) { $('pocheteLista').innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
  }

  $('keyCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('keyValue').textContent); $('keyCopy').textContent = 'Copiada'; setTimeout(() => { $('keyCopy').textContent = 'Copiar'; }, 2000); } catch {}
  });

  /* Endereço da casa: o cuidador escreve como escreveria para um taxista e o
     servidor acha no mapa. "Usar o lugar onde estou" guarda a posição do
     navegador; se o texto for mexido depois, vale o texto. */
  let casaAqui = null;
  const LUGAR_ATUAL = 'Casa (lugar marcado agora)';
  const avisoForm = texto => { const s = $('pocheteStatus'); s.textContent = texto; s.classList.toggle('is-visible', !!texto); };

  $('pCasaEndereco').addEventListener('input', () => { casaAqui = null; });

  $('pUsarLocal').addEventListener('click', async () => {
    avisoForm('Procurando onde você está…');
    casaAqui = await posicaoDoNavegador();
    if (!casaAqui) return avisoForm('Não consegui achar sua localização. Escreva o endereço no campo acima.');
    $('pCasaEndereco').value = LUGAR_ATUAL;
    avisoForm('Pronto: a casa dela fica marcada onde você está agora.');
  });

  $('pocheteForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = $('pIdoso').value.trim();
    if (nome.length < 2) return avisoForm('Digite o nome de quem vai usar.');
    const endereco = $('pCasaEndereco').value.trim();
    const casa = casaAqui ? { ...casaAqui, nome: 'Casa' } : endereco ? { endereco } : undefined;
    const botao = e.target.querySelector('[type="submit"]');
    botao.disabled = true;
    if (casa?.endereco) avisoForm('Procurando o endereço no mapa…');
    try {
      const { chave, pochete } = await api('pochetes', { method: 'POST', body: { nome_idoso: nome, telefone_idoso: $('pTelefone').value || null, casa } });
      e.target.reset(); casaAqui = null;
      // endereço que o mapa não achou fica guardado como texto (o Uber recebe escrito)
      avisoForm(casa?.endereco && !pochete.casa ? 'Pochete vinculada. Não achei o endereço no mapa: confira o número e a cidade em "Editar".' : '');
      await carregarPochetes();
      mostrarChave(chave);
    } catch (err) { avisoForm(err.message); }
    finally { botao.disabled = false; }
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
      const bot = String(telegram.bot || '').replace(/[^\w]/g, ''), codigo = String(telegram.codigo || '').replace(/[^\w-]/g, '');
      el.innerHTML = `<p>Abra o bot <a href="https://t.me/${bot}" target="_blank" rel="noopener">@${bot}</a> no Telegram e mande:</p>
        <code class="key-value">/start ${codigo}</code>
        <div class="tg-actions"><a class="btn btn-green" href="https://t.me/${bot}?start=${codigo}" target="_blank" rel="noopener">Abrir o bot já com o código</a></div>
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

  /* Esperando o /start: pergunta ao servidor a cada 5 s. Em serverless é essa
     consulta que faz o servidor ler a mensagem mandada ao bot. */
  let esperandoTelegram = null;
  async function carregarTelegram() {
    try {
      const antes = telegram.vinculado;
      telegram = await api('telegram/codigo', { method: 'POST' });
      if (telegram.vinculado && !antes && esperandoTelegram) toast('telegram', 'Telegram vinculado', 'Os avisos vão chegar lá também, inclusive o do botão vermelho.');
      renderTelegram();
      const esperar = !telegram.vinculado && !telegram.simulado;
      if (esperar && !esperandoTelegram) esperandoTelegram = setInterval(() => { if (!document.hidden) carregarTelegram(); }, 5000);
      if (!esperar && esperandoTelegram) { clearInterval(esperandoTelegram); esperandoTelegram = null; }
    }
    catch (e) { $('telegramEstado').innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
  }

  /* ---------------------------------------------------------------------
     Ações rápidas: ligar para a pessoa e onde ela está
     --------------------------------------------------------------------- */
  const primeiraCom = campo => pochetes.find(p => p[campo]) || null;
  // "Dona Lia Souza" → "Dona Lia"; "Maria Souza" → "Maria" (título sozinho não diz quem é)
  const chamar = nome => { const [a, b] = String(nome || '').split(' ').filter(Boolean); return /^(dona|seu|sr\.?|sra\.?|dr\.?|dra\.?|vó|vô|tia|tio)$/i.test(a || '') && b ? `${a} ${b}` : (a || ''); };

  function atualizarAcoes() {
    const comTelefone = primeiraCom('telefone_idoso');
    $('acaoLigarIdosoNota').textContent = comTelefone ? `Para ${chamar(comTelefone.nome_idoso)}` : (pochetes.length ? 'Cadastre o telefone dela' : 'Vincule a pochete');
    const comPosicao = primeiraCom('posicao');
    $('acaoOndeNota').textContent = comPosicao?.ultimo_contato ? `Às ${hora(comPosicao.ultimo_contato)}` : 'Sem posição ainda';
  }

  $('acaoLigarIdoso').addEventListener('click', () => {
    const p = primeiraCom('telefone_idoso');
    if (p) { avisos?.ligar({ numero: p.telefone_idoso, nome: p.nome_idoso }); return; }
    toast('teste', pochetes.length ? 'Falta o telefone' : 'Vincule a pochete primeiro',
      pochetes.length ? 'Toque em "Editar" na pochete, logo abaixo, e coloque o telefone dela.' : 'O telefone dela é cadastrado junto com a pochete, logo abaixo.');
    $('pochete').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('acaoOnde').addEventListener('click', () => {
    const p = primeiraCom('posicao');
    if (p) { avisos?.abrirMapa({ ...p.posicao, titulo: `Onde está ${p.nome_idoso}` }); return; }
    toast('teste', 'Sem posição ainda', 'A pochete manda a localização quando liga e a cada poucos minutos. Para testar agora, use "Localização" em Testar sem a pochete.');
  });

  /* ---------------------------------------------------------------------
     Mensagem para a pochete
     ---------------------------------------------------------------------
     A pochete busca as mensagens novas em GET /api/pochete/estado, toca o
     áudio (as prontas têm voz gravada; as escritas, o aviso de mensagem) e
     a pessoa aperta qualquer botão para confirmar. O painel acompanha:
     enviada → chegou na pochete → ouviu. */
  const janelaRecado = $('recadoJanela');
  const STATUS_RECADO = { pendente: 'Esperando a pochete buscar', entregue: 'Chegou na pochete, tocando', confirmado: 'Ouviu' };
  let prontos = [];
  let esperandoConfirmacao = new Map(); // id → { pochete_id, texto }
  let atualizarJanela = null;

  const pocheteDoRecado = () => pochetes.find(p => p.id === Number($('recadoPochete').value)) || pochetes[0];

  async function carregarRecados() {
    const p = pocheteDoRecado();
    if (!p) return;
    try {
      const r = await api(`pochetes/${p.id}/recados?limite=8`);
      if (!prontos.length && r.prontos?.length) {
        prontos = r.prontos;
        $('recadoProntos').innerHTML = prontos.map((x, i) => `<button type="button" class="recado-chip" data-i="${i}">${esc(x.texto)}</button>`).join('');
      }
      $('recadoLista').innerHTML = r.recados.length ? r.recados.map(x => `
        <li class="recado-item recado-item--${esc(x.status)}">
          <p>${esc(x.texto)}</p>
          <span class="muted">${hora(x.criado_em)} · ${esc(STATUS_RECADO[x.status] || x.status)}${x.status === 'confirmado' && x.confirmado_em ? ' às ' + hora(x.confirmado_em) : ''}</span>
          ${x.status !== 'confirmado' ? `<button type="button" class="link-btn" data-simular-ouvir="${num(x.id)}">Testar: fazer de conta que ela ouviu</button>` : ''}
        </li>`).join('') : '<li class="muted">Nenhuma mensagem ainda.</li>';
      r.recados.filter(x => x.status !== 'confirmado' && Date.now() - new Date(x.criado_em).getTime() < 12 * 3600e3)
        .forEach(x => { if (!esperandoConfirmacao.has(x.id)) esperandoConfirmacao.set(x.id, { pochete_id: p.id, texto: x.texto, status: x.status }); });
    } catch (e) { $('recadoLista').innerHTML = `<li class="muted">${esc(e.message)}</li>`; }
  }

  $('acaoMensagem').addEventListener('click', () => {
    if (!pochetes.length) {
      toast('teste', 'Vincule a pochete primeiro', 'A mensagem vai para a pochete de quem você cuida.');
      $('pochete').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const escolha = $('recadoPochete');
    escolha.innerHTML = pochetes.map(p => `<option value="${num(p.id)}">${esc(p.nome_idoso)}</option>`).join('');
    $('recadoPocheteCampo').hidden = pochetes.length < 2;
    $('recadoPara').textContent = pochetes.length < 2 ? `Para ${pochetes[0].nome_idoso}` : 'Escolha para quem';
    $('recadoStatus').textContent = '';
    janelaRecado.showModal();
    carregarRecados();
    atualizarJanela ??= setInterval(() => { if (janelaRecado.open && !document.hidden) carregarRecados(); }, 5000);
  });
  $('recadoPochete').addEventListener('change', () => { carregarRecados(); });
  janelaRecado.querySelector('[data-fechar]').addEventListener('click', () => janelaRecado.close());
  janelaRecado.addEventListener('click', e => { if (e.target === janelaRecado) janelaRecado.close(); });
  janelaRecado.addEventListener('close', () => { clearInterval(atualizarJanela); atualizarJanela = null; });

  $('recadoProntos').addEventListener('click', e => {
    const chip = e.target.closest('[data-i]');
    if (!chip) return;
    $('recadoTexto').value = prontos[Number(chip.dataset.i)]?.texto || '';
    $('recadoTexto').dispatchEvent(new Event('input'));
    $('recadoTexto').focus();
  });
  $('recadoTexto').addEventListener('input', () => { $('recadoConta').textContent = `${$('recadoTexto').value.length}/160`; });

  $('recadoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const status = $('recadoStatus');
    const texto = $('recadoTexto').value.trim();
    const p = pocheteDoRecado();
    if (texto.length < 2) { status.textContent = 'Escolha uma mensagem pronta ou escreva a sua.'; status.classList.add('is-visible'); return; }
    const botao = e.target.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      const { recado } = await api(`pochetes/${p.id}/recados`, { method: 'POST', body: { texto } });
      esperandoConfirmacao.set(recado.id, { pochete_id: p.id, texto: recado.texto, status: recado.status });
      $('recadoTexto').value = ''; $('recadoConta').textContent = '0/160';
      status.textContent = `Enviada. A pochete de ${chamar(p.nome_idoso)} toca a mensagem na próxima vez que falar com o servidor (em até 15 segundos).`;
      status.classList.add('is-visible');
      await carregarRecados();
    } catch (err) { status.textContent = err.message; status.classList.add('is-visible'); }
    finally { botao.disabled = false; }
  });

  // Teste sem o dispositivo: o painel faz o papel da pessoa apertando o botão
  $('recadoLista').addEventListener('click', async e => {
    const b = e.target.closest('[data-simular-ouvir]');
    if (!b) return;
    b.disabled = true;
    try {
      const { recado } = await api(`pochetes/${pocheteDoRecado().id}/recados/${b.dataset.simularOuvir}/confirmar`, { method: 'POST' });
      recadoMudou({ recado, nome_idoso: pocheteDoRecado().nome_idoso });
      await carregarRecados();
    } catch (err) { toast('teste', 'Não deu certo', err.message); b.disabled = false; }
  });

  // Uma mensagem foi entregue ou confirmada (stream ou consulta)
  function recadoMudou({ recado, nome_idoso }) {
    if (!recado) { if (janelaRecado.open) carregarRecados(); return; }
    const antes = esperandoConfirmacao.get(recado.id);
    if (recado.status === 'confirmado' && antes) {
      esperandoConfirmacao.delete(recado.id);
      avisos?.mostrar({ tipo: 'teste', rotulo: 'Mensagem', cor: 'var(--blue-2)', duracao: 10000,
        titulo: `${chamar(nome_idoso) || 'A pessoa'} ouviu sua mensagem`,
        texto: `"${recado.texto}"${recado.confirmado_em ? ` · ${hora(recado.confirmado_em)}` : ''}` });
    }
    if (janelaRecado.open) carregarRecados();
  }

  // Sem stream: confere de tempos em tempos as mensagens ainda não ouvidas
  async function conferirRecados() {
    const porPochete = new Set([...esperandoConfirmacao.values()].map(x => x.pochete_id));
    for (const id of porPochete) {
      try {
        const { recados } = await api(`pochetes/${id}/recados?limite=8`);
        const p = pochetes.find(x => x.id === id);
        recados.forEach(r => { if (esperandoConfirmacao.has(r.id) && r.status === 'confirmado') recadoMudou({ recado: r, nome_idoso: p?.nome_idoso }); });
      } catch { /* tenta na próxima */ }
    }
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
      const r = await api(`pochetes/${p.id}/simular`, { method: 'POST', body: { tipo, ...POSICAO_TESTE, ...extra } });
      // o card aparece na hora, igual ao que chega no Telegram (sem esperar o stream)
      avisos?.evento(r.evento, { sempre: true });
      if (r.corrida) renderCorrida(r.corrida);
      await carregarPochetes();
      status.textContent = `Enviado como ${p.nome_idoso}. O mesmo aviso foi para o Telegram, se estiver vinculado.`;
    } catch (e) { status.textContent = e.message; }
    status.classList.add('is-visible');
    setTimeout(() => status.classList.remove('is-visible'), 5000);
  }

  document.querySelectorAll('[data-simular]').forEach(b => b.addEventListener('click', () => {
    simular(b.dataset.simular, b.dataset.bateria ? { bateria: Number(b.dataset.bateria) } : {});
  }));


  /* ---------------------------------------------------------------------
     Início
     --------------------------------------------------------------------- */
  // Sem stream no servidor (Vercel), nem tenta: evita o 501 no console e já consulta
  api('saude').then(s => (s.tempo_real === false ? consultar() : ouvir())).catch(() => ouvir());
  carregarPochetes().then(carregarCorridas);
  carregarTelegram();
});
