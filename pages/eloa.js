/* ==========================================================================
   Eloá · Conversa
   ---------------------------------------------------------------------------
   Liga a tela ao motor de respostas (../api/eloa-engine.js).

   Ordem de resposta:
     1. Motor local, com memória da conversa — responde na hora, sem rede.
     2. Se o motor não reconhece a pergunta e o servidor remoto está ativo,
        pergunta a ele com tempo limite. Se demorar ou falhar, a Eloá
        responde com o que sabe fazer, em vez de deixar esperando.

   A resposta aparece sendo digitada, como numa conversa de verdade.
   ========================================================================== */
(function () {
  'use strict';

  const CONFIG = {
    // Servidor remoto (Gemini no Render) só como reserva. Para desligar de
    // vez, troque `ativo` para false.
    remoto: {
      ativo: true,
      url: 'https://teste-ia-t66d.onrender.com/perguntar',
      timeoutMs: 6000
    },
    // Tempo "pensando" antes de começar a digitar, e ritmo da digitação
    pensando: { base: 350, porCaractere: 3, maximo: 900 },
    digitacao: { msPorCaractere: 14, maximoMs: 2600 },
    avatar: '../assets/ChatGPT%20Image%201%20de%20set.%20de%202026,%2021_31_52.png'
  };

  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     API da Eloá: uma função, uma promessa, uma resposta.
     window.EloaAPI.perguntar(texto) → { resposta, fonte, intencao, confianca }
     ------------------------------------------------------------------------ */
  const sessao = EloaEngine.criarSessao();

  const EloaAPI = {
    async perguntar(texto) {
      const local = sessao.responder(texto);

      if (local.intencao !== 'desconhecido') {
        await esperar(tempoPensando(local.resposta.length));
        return local;
      }

      if (CONFIG.remoto.ativo) {
        const remota = await perguntarRemoto(texto);
        if (remota) return remota;
      }

      return local; // "não sei", com o que ela sabe fazer
    },
    memoria: sessao.memoria
  };

  function tempoPensando(tamanho) {
    const { base, porCaractere, maximo } = CONFIG.pensando;
    return Math.min(maximo, base + tamanho * porCaractere);
  }

  function esperar(ms) {
    return ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve();
  }

  async function perguntarRemoto(texto) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), CONFIG.remoto.timeoutMs);
    try {
      const resposta = await fetch(CONFIG.remoto.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto }),
        signal: controle.signal
      });
      const dados = await resposta.json();
      if (dados && dados.status === 'sucesso' && dados.resposta_da_ia) {
        return { resposta: dados.resposta_da_ia, fonte: 'remoto', intencao: 'remoto', confianca: 1 };
      }
    } catch (erro) {
      // tempo esgotado ou sem rede: segue para a resposta local
    } finally {
      clearTimeout(relogio);
    }
    return null;
  }

  /* ------------------------------------------------------------------------
     Tela
     ------------------------------------------------------------------------ */
  const caixa = document.getElementById('chat-box');
  const campo = document.getElementById('user-input');
  const botaoEnviar = document.querySelector('.send-btn');
  let ocupada = false;

  function rolarParaOFim() {
    requestAnimationFrame(() => { caixa.scrollTop = caixa.scrollHeight; });
  }

  function adicionarMensagem(texto, remetente) {
    const balao = document.createElement('div');
    balao.className = 'message ' + remetente;
    balao.innerText = texto;

    if (remetente === 'ai') {
      const linha = document.createElement('div');
      linha.className = 'ai-message-row';
      const avatar = document.createElement('img');
      avatar.className = 'response-avatar';
      avatar.src = CONFIG.avatar;
      avatar.alt = '';
      linha.append(avatar, balao);
      caixa.appendChild(linha);
    } else {
      caixa.appendChild(balao);
    }

    rolarParaOFim();
    return balao;
  }

  // Escreve a resposta aos poucos, como quem digita
  function digitar(balao, texto) {
    if (reduzirMovimento) { balao.innerText = texto; rolarParaOFim(); return Promise.resolve(); }

    const { msPorCaractere, maximoMs } = CONFIG.digitacao;
    const passo = Math.max(1, Math.ceil((texto.length * msPorCaractere) / maximoMs));
    const intervalo = Math.min(msPorCaractere, maximoMs / texto.length) * passo;

    return new Promise(resolver => {
      let i = 0;
      balao.innerText = '';
      balao.classList.add('is-typing');
      const tique = () => {
        i = Math.min(texto.length, i + passo);
        balao.innerText = texto.slice(0, i);
        rolarParaOFim();
        if (i < texto.length) setTimeout(tique, intervalo);
        else { balao.classList.remove('is-typing'); resolver(); }
      };
      tique();
    });
  }

  // Quem digita enquanto a Eloá responde não perde a mensagem: ela entra
  // na fila e é respondida em seguida, na ordem.
  const fila = [];

  function enviar() {
    const texto = campo.value.trim();
    if (!texto) return;
    campo.value = '';
    adicionarMensagem(texto, 'user');
    fila.push(texto);
    if (!ocupada) processar();
  }

  async function processar() {
    ocupada = true;
    while (fila.length) {
      const texto = fila.shift();
      const balao = adicionarMensagem('Eloá está digitando', 'ai');
      balao.classList.add('is-loading');
      try {
        const r = await EloaAPI.perguntar(texto);
        balao.classList.remove('is-loading');
        balao.dataset.fonte = r.fonte;
        await digitar(balao, r.resposta);
      } catch (erro) {
        balao.classList.remove('is-loading');
        balao.innerText = 'Algo deu errado aqui do meu lado. Tenta perguntar de novo?';
      }
    }
    ocupada = false;
    rolarParaOFim();
  }

  botaoEnviar.addEventListener('click', enviar);
  campo.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); enviar(); }
  });

  // Sugestões: preenchem o campo e enviam na hora
  document.querySelectorAll('.suggestions button').forEach(botao => {
    botao.addEventListener('click', () => {
      campo.value = botao.dataset.prompt;
      enviar();
    });
  });

  window.EloaAPI = EloaAPI;
})();
