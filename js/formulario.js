/* ==========================================================================
   ELO · Formulários que falam com o backend
   ---------------------------------------------------------------------------
   Os dois formulários públicos do site — "Entre em contato" (Quem Somos) e
   "Quero uma ELO" (Produto) — mandam para a mesma rota: POST /api/mensagens.
   O servidor guarda a mensagem no banco e manda para o e-mail da equipe
   (backend/server.js + backend/email.js).

   Aqui fica só o que os dois têm em comum: o envio, o botão em espera e o
   texto de status. O endereço do backend vem de window.ELO_API_URL, definido
   em js/header.js (localhost:3000/api na máquina, /api publicado).

   Carregado por pages/quem-somos.html e pages/produtos.html, antes do JS da
   página.
   ========================================================================== */
window.EloFormulario = {
  /* Manda a mensagem. Devolve { ok, mensagem } ou lança { status, message }. */
  async enviar(dados) {
    // EloSessao.api já monta a URL e manda o token de quem está logado
    if (window.EloSessao?.api) return window.EloSessao.api('mensagens', { method: 'POST', body: dados });

    const base = window.ELO_API_URL || '/api';
    const resposta = await fetch(`${base}/mensagens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw Object.assign(new Error(corpo.erro || 'Algo deu errado.'), { status: resposta.status });
    return corpo;
  },

  /* Botão em espera enquanto o servidor responde */
  aguardando(botao, ligado, textoEspera = 'Enviando…') {
    if (!botao) return;
    if (ligado) {
      botao.dataset.textoOriginal ??= botao.textContent;
      botao.textContent = textoEspera;
      botao.disabled = true;
    } else {
      botao.textContent = botao.dataset.textoOriginal || botao.textContent;
      botao.disabled = false;
    }
  },

  /* Uma linha de status: 'ok' em verde, 'erro' em vermelho, '' neutro */
  status(elemento, texto, tom = '') {
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.classList.toggle('is-ok', tom === 'ok');
    elemento.classList.toggle('is-error', tom === 'erro');
  },

  /* Preenche nome e e-mail de quem já está logado, sem sobrescrever o que a
     pessoa digitou */
  preencherComSessao(form) {
    const sessao = window.EloSessao?.ler?.();
    if (!sessao || !form) return;
    for (const [campo, valor] of [['nome', sessao.nome], ['email', sessao.email]]) {
      const alvo = form.elements[campo];
      if (alvo && !alvo.value && valor) alvo.value = valor;
    }
  },

  /* A mesma leitura de erro nos dois formulários: erro do servidor quando ele
     respondeu, aviso de conexão quando nem chegou lá */
  explicar(e) {
    return e?.status
      ? e.message
      : 'Não consegui falar com o servidor da ELO. Confira sua conexão e tente de novo em instantes.';
  }
};
