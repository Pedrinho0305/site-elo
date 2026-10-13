/* ==========================================================================
   Painel · Familiares
   ---------------------------------------------------------------------------
   Quem mais acompanha a pessoa idosa: filhos, netos, vizinhos. Cada familiar
   tem nome, parentesco, telefone e/ou e-mail. Daqui dá para:
     · ligar (discador no celular; no computador, a janela com QR Code de
       avisos.js, que também oferece WhatsApp);
     · marcar "avisar por e-mail": quando o botão vermelho é apertado, o
       servidor manda um e-mail com a localização (POST /api/pochete/evento);
     · editar e remover.
   Rotas: GET/POST /api/familiares, PATCH/DELETE /api/familiares/:id.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const secao = $('familiares');
  const sessao = window.EloSessao?.ler();
  if (!secao || !sessao?.token) return;

  const api = (rota, opcoes) => window.EloSessao.api(rota, opcoes);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);
  const MAXIMO = 10;

  let familiares = [];
  let emailAtivo = true;   // o servidor tem como mandar e-mail? (sem chave, fica simulado)
  let editando = null;     // id do familiar no formulário, ou null para cadastrar

  // "(11) 99999-0000" a partir do que estiver salvo (+5511999990000)
  function telefoneLegivel(t) {
    const d = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return t || '';
  }
  const iniciais = nome => nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

  function status(texto, ok = false) {
    const el = $('familiaStatus');
    el.textContent = texto;
    el.classList.toggle('is-visible', Boolean(texto));
    el.classList.toggle('is-ok', ok);
  }

  function render() {
    const lista = $('familiaLista');
    $('familiaConta').textContent = familiares.length ? `${familiares.length} de ${MAXIMO}` : '';
    $('acaoFamiliaNota').textContent = familiares.length
      ? `${familiares.length} ${familiares.length === 1 ? 'cadastrado' : 'cadastrados'}`
      : 'Cadastrar e ligar';

    if (!familiares.length) {
      lista.innerHTML = '<li class="familia-vazio"><p>Ninguém cadastrado ainda.</p><p class="muted">Comece por quem mora mais perto ou atende o telefone mais rápido: é quem você vai querer chamar numa emergência.</p></li>';
      return;
    }
    lista.innerHTML = familiares.map(f => `
      <li class="familia-item" data-id="${num(f.id)}">
        <span class="familia-avatar" aria-hidden="true">${esc(iniciais(f.nome))}</span>
        <div class="familia-dados">
          <strong>${esc(f.nome)}</strong>
          <span class="muted">${esc(f.parentesco)}${f.telefone ? ' · ' + esc(telefoneLegivel(f.telefone)) : ''}</span>
          ${f.email ? `<span class="muted familia-email">${esc(f.email)}</span>` : ''}
          ${f.avisar ? `<span class="familia-selo">${emailAtivo ? 'Recebe aviso de emergência' : 'Aviso de emergência · e-mail simulado'}</span>` : ''}
        </div>
        <div class="familia-acoes">
          ${f.telefone ? `<a class="btn btn-green" href="tel:${esc(f.telefone)}" data-ligar-nome="${esc(f.nome)}">Ligar</a>` : ''}
          <button type="button" class="btn btn-outline" data-editar>Editar</button>
          <button type="button" class="btn btn-outline btn-danger" data-remover aria-label="Remover ${esc(f.nome)}">Remover</button>
        </div>
      </li>`).join('');
  }

  async function carregar() {
    try {
      const r = await api('familiares');
      familiares = r.familiares;
      emailAtivo = r.avisos_por_email !== false;
      render();
    } catch (e) {
      $('familiaLista').innerHTML = `<li class="muted">${esc(e.message)}</li>`;
    }
  }

  function limparFormulario() {
    editando = null;
    $('familiaForm').reset();
    $('familiaFormTitulo').textContent = 'Cadastrar familiar';
    $('familiaSalvar').textContent = 'Cadastrar';
    $('familiaCancelar').hidden = true;
  }

  function editar(f) {
    editando = f.id;
    $('fNome').value = f.nome;
    $('fParentesco').value = f.parentesco;
    $('fTelefone').value = telefoneLegivel(f.telefone);
    $('fEmail').value = f.email || '';
    $('fAvisar').checked = f.avisar;
    $('familiaFormTitulo').textContent = `Editar ${f.nome.split(' ')[0]}`;
    $('familiaSalvar').textContent = 'Salvar alterações';
    $('familiaCancelar').hidden = false;
    status('');
    $('familiaForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('fNome').focus({ preventScroll: true });
  }

  $('familiaLista').addEventListener('click', async e => {
    const item = e.target.closest('.familia-item');
    if (!item) return;
    const f = familiares.find(x => x.id === Number(item.dataset.id));
    if (e.target.closest('[data-editar]')) editar(f);
    if (e.target.closest('[data-remover]')) {
      if (!confirm(`Remover ${f.nome} dos familiares?`)) return;
      try {
        await api(`familiares/${f.id}`, { method: 'DELETE' });
        if (editando === f.id) limparFormulario();
        await carregar();
      } catch (err) { status(err.message); }
    }
  });

  $('familiaCancelar').addEventListener('click', () => { limparFormulario(); status(''); });

  // Aviso por e-mail só faz sentido com e-mail: avisa antes de mandar
  $('fAvisar').addEventListener('change', () => {
    if ($('fAvisar').checked && !$('fEmail').value.trim()) status('Coloque o e-mail para essa pessoa receber o aviso.');
  });

  $('familiaForm').addEventListener('submit', async e => {
    e.preventDefault();
    const dados = {
      nome: $('fNome').value.trim(),
      parentesco: $('fParentesco').value,
      telefone: $('fTelefone').value.trim() || null,
      email: $('fEmail').value.trim() || null,
      avisar: $('fAvisar').checked,
    };
    if (dados.nome.length < 2) { status('Digite o nome do familiar.'); $('fNome').focus(); return; }
    if (!dados.telefone && !dados.email) { status('Coloque pelo menos o telefone ou o e-mail.'); $('fTelefone').focus(); return; }
    if (dados.avisar && !dados.email) { status('Para avisar em emergência, coloque o e-mail.'); $('fEmail').focus(); return; }
    if (!editando && familiares.length >= MAXIMO) { status(`O limite é de ${MAXIMO} familiares.`); return; }

    const botao = $('familiaSalvar');
    botao.disabled = true;
    try {
      if (editando) await api(`familiares/${editando}`, { method: 'PATCH', body: dados });
      else await api('familiares', { method: 'POST', body: dados });
      status(editando ? 'Alterações salvas.' : `${dados.nome.split(' ')[0]} foi cadastrado(a).`, true);
      limparFormulario();
      await carregar();
    } catch (err) { status(err.message); }
    finally { botao.disabled = false; }
  });

  carregar();
});
