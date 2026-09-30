/* ==========================================================================
   Relatórios: números, registro e mapa com dados reais
   ---------------------------------------------------------------------------
   Tudo vem do backend, com a sessão do cuidador (painel.js já mandou para o
   login quem não tem):
     · período: botão de datas com atalhos (7 dias, 30 dias, este mês, mês
       passado) ou datas à escolha;
     · azulejos: contados em GET /api/eventos?de=&ate= e GET /api/corridas,
       comparados com o período anterior de mesmo tamanho;
     · registro: eventos da pochete + corridas, do mais novo ao mais antigo;
       "Ver todos" abre a lista inteira do período;
     · mapa: a última posição de cada pochete vinculada (GET /api/pochetes),
       no Google Maps em iframe (sem chave), atualizada a cada 30 s; os
       "Ver no mapa" do registro abrem a janela de mapa de js/avisos.js. Sem pochete, o mapa
       não aparece; com pochete sem posição, diz que ainda não chegou.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const sessao = window.EloSessao?.ler();
  if (!sessao) return;
  const api = rota => window.EloSessao.api(rota);
  const $ = id => document.getElementById(id);

  const DIA = 24 * 60 * 60 * 1000;
  const REGISTROS_INICIAIS = 8;
  const ATIVAS = ['pendente', 'aprovada', 'solicitada', 'a_caminho', 'em_andamento'];

  let pochetes = [];
  let pocheteNoMapa = 0;
  let verTodos = false;
  let linhas = [];

  /* ---------------------------------------------------------------------
     Datas
     --------------------------------------------------------------------- */
  const inicioDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dataCurta = d => d.toLocaleDateString('pt-BR');
  const dataHora = d => `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const paraCampo = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const doCampo = v => { const [a, m, d] = v.split('-').map(Number); return new Date(a, m - 1, d); };

  function quando(d) {
    const hoje = inicioDoDia(new Date());
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d >= hoje) return `hoje às ${hora}`;
    if (d >= new Date(hoje - DIA)) return `ontem às ${hora}`;
    return `${dataCurta(d)} às ${hora}`;
  }

  // "ate" é exclusivo: o dia seguinte ao último dia escolhido, à meia-noite
  function periodoPronto(tipo) {
    const hoje = inicioDoDia(new Date());
    const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    if (tipo === '7') return { de: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6), ate: amanha, rotulo: 'Últimos 7 dias' };
    if (tipo === 'mes') return { de: new Date(hoje.getFullYear(), hoje.getMonth(), 1), ate: amanha, rotulo: 'Este mês' };
    if (tipo === 'mes-passado') return { de: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), ate: new Date(hoje.getFullYear(), hoje.getMonth(), 1), rotulo: 'Mês passado' };
    return { de: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29), ate: amanha, rotulo: 'Últimos 30 dias' };
  }

  let periodo = { ...periodoPronto('30'), tipo: '30' };

  /* ---------------------------------------------------------------------
     Botão do período
     --------------------------------------------------------------------- */
  const botao = $('periodoBotao');
  const menu = $('periodoMenu');

  function abrirMenu(abrir) {
    menu.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
    if (abrir) {
      $('periodoDe').value = paraCampo(periodo.de);
      $('periodoAte').value = paraCampo(new Date(periodo.ate - DIA));
      $('periodoAte').max = paraCampo(new Date());
      $('periodoErro').textContent = '';
      menu.querySelector('button').focus();
    }
  }

  function mostrarPeriodo() {
    $('periodoTexto').textContent = periodo.rotulo;
    botao.setAttribute('aria-label', `Período: ${periodo.rotulo}, de ${dataCurta(periodo.de)} a ${dataCurta(new Date(periodo.ate - DIA))}`);
    menu.querySelectorAll('[data-periodo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.periodo === periodo.tipo)));
  }

  function escolher(novo) {
    periodo = novo;
    mostrarPeriodo();
    abrirMenu(false);
    botao.focus();
    carregarRelatorio();
  }

  botao.addEventListener('click', () => abrirMenu(menu.hidden));
  menu.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => escolher({ ...periodoPronto(b.dataset.periodo), tipo: b.dataset.periodo })));

  $('periodoForm').addEventListener('submit', e => {
    e.preventDefault();
    const de = doCampo($('periodoDe').value);
    const ultimo = doCampo($('periodoAte').value);
    if (ultimo < de) { $('periodoErro').textContent = 'A data final precisa ser depois da inicial.'; return; }
    const ate = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1);
    escolher({ de, ate, rotulo: `${dataCurta(de)} a ${dataCurta(ultimo)}`, tipo: 'datas' });
  });

  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.range-picker')) abrirMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { abrirMenu(false); botao.focus(); } });

  /* ---------------------------------------------------------------------
     Azulejos
     --------------------------------------------------------------------- */
  const SETA_CIMA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const SETA_BAIXO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';

  // menosEhMelhor: nos alertas, cair é bom (seta para baixo em verde)
  function comparar(id, atual, anterior, menosEhMelhor = false) {
    const el = $(id);
    el.className = 'tile-delta';
    if (atual === anterior) { el.textContent = anterior ? 'Igual ao período anterior' : 'Nada no período anterior'; return; }
    if (!anterior) { el.textContent = 'Nada no período anterior'; return; }
    const subiu = atual > anterior;
    const pct = Math.round(Math.abs(atual - anterior) / anterior * 100);
    el.classList.add(subiu ? 'tile-delta--up' : 'tile-delta--down', subiu === menosEhMelhor ? 'tile-delta--ruim' : 'tile-delta--bom');
    el.innerHTML = `${subiu ? SETA_CIMA : SETA_BAIXO}${pct}% em relação ao período anterior`;
  }

  const ehAlerta = e => e.tipo === 'emergencia' || (e.tipo === 'bateria' && e.dados?.bateria != null && e.dados.bateria <= 20);
  const ehBotao = e => ['emergencia', 'transporte', 'teste'].includes(e.tipo);

  function preencherTiles(ev, evAntes, co, coAntes) {
    $('tileTotal').textContent = ev.length + co.length;
    comparar('tileTotalDelta', ev.length + co.length, evAntes.length + coAntes.length);

    const alertas = ev.filter(ehAlerta).length;
    $('tileAlertas').textContent = alertas;
    comparar('tileAlertasDelta', alertas, evAntes.filter(ehAlerta).length, true);

    const botoes = ev.filter(ehBotao).length;
    $('tileBotoes').textContent = botoes;
    comparar('tileBotoesDelta', botoes, evAntes.filter(ehBotao).length);

    // das corridas que já terminaram, quantas chegaram ao destino
    const encerradas = co.filter(c => !ATIVAS.includes(c.status));
    const concluidas = encerradas.filter(c => c.status === 'concluida').length;
    const nota = $('tileCorridasDelta');
    nota.className = 'tile-delta';
    if (!co.length) { $('tileCorridas').textContent = '–'; nota.textContent = 'Nenhuma corrida no período'; return; }
    $('tileCorridas').textContent = encerradas.length ? `${Math.round(concluidas / encerradas.length * 100)}%` : '–';
    const emCurso = co.length - encerradas.length;
    nota.textContent = `${concluidas} de ${encerradas.length} encerrada${encerradas.length === 1 ? '' : 's'}${emCurso ? `, ${emCurso} em curso` : ''}`;
  }

  function tilesSemDados(texto) {
    ['tileTotal', 'tileCorridas', 'tileAlertas', 'tileBotoes'].forEach(id => { $(id).textContent = '–'; });
    ['tileTotalDelta', 'tileCorridasDelta', 'tileAlertasDelta', 'tileBotoesDelta'].forEach(id => { $(id).className = 'tile-delta'; $(id).textContent = texto; });
  }

  /* ---------------------------------------------------------------------
     Registro
     --------------------------------------------------------------------- */
  const ICONE = {
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.3 2.3 4.7-5"/></svg>',
    sino: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8a7.2 7.2 0 0 1 7.2 7.2v4.6l1.7 2.9a1 1 0 0 1-.9 1.5H4a1 1 0 0 1-.9-1.5l1.7-2.9V11A7.2 7.2 0 0 1 12 3.8Z"/><path d="M10 18.5a2 2 0 0 0 4 0"/></svg>',
    carro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16.5V12l1.8-4.6A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.4L19 12v4.5"/><path d="M3.5 12h17v4.5h-17z"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/></svg>',
    bateria: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7.5" width="16" height="9" rx="2"/><path d="M21 10.5v3M6 10.5v3M9 10.5v3"/></svg>',
    local: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  };

  const STATUS_CORRIDA = {
    pendente: 'esperando sua aprovação', aprovada: 'aprovada', solicitada: 'procurando motorista',
    a_caminho: 'motorista a caminho', em_andamento: 'em viagem', concluida: 'concluída',
    recusada: 'recusada', cancelada: 'cancelada', sem_motorista: 'sem motorista disponível', erro: 'não deu certo',
  };

  const texto = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const linkMapa = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  function linhaDoEvento(e) {
    const d = e.dados || {};
    const nome = texto(e.nome_idoso || 'A pochete');
    const pelo = d.origem === 'painel' ? ' (teste pelo painel)' : '';
    const onde = d.lat != null ? ` <a class="log-map" href="${linkMapa(d.lat, d.lng)}" target="_blank" rel="noopener" data-mapa="${d.lat},${d.lng}" data-mapa-titulo="${nome}, ${dataHora(new Date(e.criado_em))}">Ver no mapa</a>` : '';
    const base = { quando: new Date(e.criado_em) };
    switch (e.tipo) {
      case 'emergencia': return { ...base, tipo: 'Emergência', cor: 'red', icone: ICONE.sino, texto: `${nome} apertou o botão vermelho${pelo}.${onde}` };
      case 'transporte': return { ...base, tipo: 'Pedido de carro', cor: 'orange', icone: ICONE.carro, texto: `${nome} apertou o botão amarelo e pediu um carro${d.destino?.nome ? ` para ${texto(d.destino.nome)}` : ''}${pelo}.${onde}` };
      case 'bateria': {
        const baixa = d.bateria != null && d.bateria <= 20;
        return { ...base, tipo: baixa ? 'Bateria baixa' : 'Bateria', cor: baixa ? 'orange' : 'blue', icone: ICONE.bateria, texto: `Pochete de ${nome} com ${d.bateria ?? '?'}% de bateria${pelo}.` };
      }
      case 'localizacao': return { ...base, tipo: 'Localização', cor: 'blue', icone: ICONE.local, texto: `Posição de ${nome} atualizada${pelo}.${onde}` };
      case 'teste': return { ...base, tipo: 'Teste', cor: 'green', icone: ICONE.ok, texto: `Teste da pochete de ${nome}: tudo funcionando${pelo}.` };
      default: return { ...base, tipo: texto(e.tipo), cor: 'blue', icone: ICONE.ok, texto: nome };
    }
  }

  function linhaDaCorrida(c) {
    const p = pochetes.find(x => x.id === c.pochete_id);
    const detalhes = [c.motorista, c.valor].filter(Boolean).map(texto).join(', ');
    return {
      quando: new Date(c.criado_em),
      tipo: 'Corrida', cor: c.status === 'concluida' ? 'green' : 'purple', icone: ICONE.carro,
      texto: `Corrida de ${texto(p?.nome_idoso || 'a pochete')} para ${texto(c.destino?.nome || 'o destino informado')}: ${STATUS_CORRIDA[c.status] || texto(c.status)}${detalhes ? ` (${detalhes})` : ''}.`,
    };
  }

  function renderRegistro() {
    const corpo = $('logCorpo');
    const botaoTodos = $('logTodos');
    const visiveis = verTodos ? linhas : linhas.slice(0, REGISTROS_INICIAIS);
    corpo.innerHTML = visiveis.map(l => `
      <tr>
        <td><time datetime="${l.quando.toISOString()}">${dataHora(l.quando)}</time></td>
        <td><span class="log-type log-type--${l.cor}">${l.icone}${l.tipo}</span></td>
        <td>${l.texto}</td>
      </tr>`).join('');
    botaoTodos.hidden = linhas.length <= REGISTROS_INICIAIS;
    botaoTodos.textContent = verTodos ? 'Mostrar menos' : `Ver todos (${linhas.length})`;
    botaoTodos.setAttribute('aria-expanded', String(verTodos));
  }

  function registroVazio(html) {
    linhas = [];
    $('logTodos').hidden = true;
    $('logCorpo').innerHTML = `<tr class="log-vazio"><td colspan="3">${html}</td></tr>`;
  }

  $('logTodos').addEventListener('click', () => {
    verTodos = !verTodos;
    renderRegistro();
    if (!verTodos) $('registro').scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  /* ---------------------------------------------------------------------
     Carregar o período
     --------------------------------------------------------------------- */
  let pedido = 0;
  async function carregarRelatorio() {
    const este = ++pedido;
    verTodos = false;
    tilesSemDados('Carregando…');
    registroVazio('Carregando o registro…');

    if (!pochetes.length) {
      tilesSemDados('Sem pochete vinculada');
      registroVazio('Nenhuma pochete vinculada ainda. <a href="painel.html#pochete">Vincule a pochete no Painel</a> para os registros aparecerem aqui.');
      return;
    }

    // o período anterior, de mesmo tamanho, vem junto para a comparação
    const antes = new Date(periodo.de.getTime() - (periodo.ate - periodo.de));
    try {
      const [{ eventos }, { corridas }] = await Promise.all([
        api(`eventos?de=${encodeURIComponent(antes.toISOString())}&ate=${encodeURIComponent(periodo.ate.toISOString())}&limite=1000`),
        api('corridas'),
      ]);
      if (este !== pedido) return;
      const noPeriodo = x => { const d = new Date(x.criado_em); return d >= periodo.de && d < periodo.ate; };
      const noAnterior = x => { const d = new Date(x.criado_em); return d >= antes && d < periodo.de; };
      const ev = eventos.filter(noPeriodo), co = corridas.filter(noPeriodo);
      preencherTiles(ev, eventos.filter(noAnterior), co, corridas.filter(noAnterior));

      linhas = [...ev.map(linhaDoEvento), ...co.map(linhaDaCorrida)].sort((a, b) => b.quando - a.quando);
      if (!linhas.length) registroVazio(`Nada registrado entre ${dataCurta(periodo.de)} e ${dataCurta(new Date(periodo.ate - DIA))}. Escolha outro período no botão de datas.`);
      else renderRegistro();
    } catch (e) {
      if (este !== pedido) return;
      tilesSemDados('Sem conexão com o servidor');
      registroVazio(`Não consegui carregar o registro: ${texto(e.message)}`);
    }
  }

  /* ---------------------------------------------------------------------
     Mapa
     --------------------------------------------------------------------- */
  function distancia(a, b) {
    const r = Math.PI / 180, R = 6371e3;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const metros = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;

  function renderMapa() {
    const secao = $('mapa');
    secao.hidden = !pochetes.length;
    if (!pochetes.length) return;
    const p = pochetes[pocheteNoMapa] || pochetes[0];

    // várias pochetes: um botão para cada
    const escolha = $('mapaPochetes');
    escolha.hidden = pochetes.length < 2;
    if (pochetes.length > 1) {
      escolha.innerHTML = pochetes.map((x, i) => `<button type="button" data-i="${i}" aria-pressed="${i === pocheteNoMapa}">${texto(x.nome_idoso)}</button>`).join('');
      escolha.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { pocheteNoMapa = Number(b.dataset.i); renderMapa(); }));
    }

    const pos = p.posicao;
    const contato = p.ultimo_contato ? new Date(p.ultimo_contato) : null;
    $('mapaVazio').hidden = Boolean(pos);
    $('mapaFrame').hidden = !pos;
    $('mapaChip').hidden = !pos;
    $('mapaAbrir').hidden = !pos;
    $('mapaRota').hidden = !pos;

    if (!pos) {
      $('mapaLead').textContent = `A pochete de ${p.nome_idoso} ainda não mandou a localização.`;
      $('mapaVazioTexto').textContent = 'Assim que a pochete mandar a posição pelo GPS, o mapa aparece aqui. Para testar antes, use "Testar sem a pochete" no Painel.';
      $('mapaFatos').innerHTML = `<div><dt>Último contato</dt><dd>${contato ? quando(contato) : 'nunca'}</dd></div>`;
      $('mapaFrame').removeAttribute('src');
      return;
    }

    // Google Maps em iframe, com o marcador exatamente na posição
    const src = `https://maps.google.com/maps?q=${pos.lat},${pos.lng}&z=16&hl=pt-BR&output=embed`;
    if ($('mapaFrame').getAttribute('src') !== src) $('mapaFrame').src = src;

    $('mapaLead').textContent = `Última posição que a pochete de ${p.nome_idoso} mandou.`;
    $('mapaChipTexto').textContent = contato ? `Última posição ${quando(contato)}` : 'Última posição conhecida';
    const fatos = [
      ['Coordenadas', `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`],
      ['Último contato', contato ? quando(contato) : 'sem registro'],
    ];
    if (p.casa) fatos.push([`Distância de ${p.casa.nome || 'casa'}`, metros(distancia(pos, p.casa))]);
    if (p.bateria != null) fatos.push(['Bateria', `${p.bateria}%`]);
    $('mapaFatos').innerHTML = fatos.map(([t, v]) => `<div><dt>${texto(t)}</dt><dd>${texto(v)}</dd></div>`).join('');
    $('mapaAbrir').href = linkMapa(pos.lat, pos.lng);
    $('mapaRota').href = `https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}`;
  }

  async function carregarPochetes() {
    ({ pochetes } = await api('pochetes'));
    if (pocheteNoMapa >= pochetes.length) pocheteNoMapa = 0;
    renderMapa();
  }

  $('mapaAtualizar').addEventListener('click', async () => {
    const b = $('mapaAtualizar');
    b.disabled = true; b.textContent = 'Atualizando…';
    try { await carregarPochetes(); b.textContent = 'Atualizado'; }
    catch { b.textContent = 'Sem conexão'; }
    setTimeout(() => { b.disabled = false; b.textContent = 'Atualizar'; }, 1500);
  });

  // a pochete manda a posição a cada poucos minutos: o mapa acompanha
  setInterval(() => { if (!document.hidden && pochetes.length) carregarPochetes().catch(() => {}); }, 30_000);

  /* ---------------------------------------------------------------------
     Início
     --------------------------------------------------------------------- */
  mostrarPeriodo();
  carregarPochetes()
    .then(carregarRelatorio)
    .catch(e => {
      tilesSemDados('Sem conexão com o servidor');
      registroVazio(`Não consegui falar com o servidor da ELO: ${texto(e.message)}`);
    });
});
