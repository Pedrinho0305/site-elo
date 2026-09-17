/* ==========================================================================
   Eloá · Conversa
   ---------------------------------------------------------------------------
   Liga a tela à API em Python (api/eloa.py), que responde com um modelo de
   linguagem e memória da conversa. A sessão e as últimas mensagens ficam em
   sessionStorage: recarregar a página não faz a Eloá esquecer, e no site
   publicado (serverless, sem memória entre chamadas) o histórico vai junto
   com cada pergunta.

   Se a API estiver fora do ar, a Eloá responde com o motor local do
   navegador (js/eloa-engine.js): mais simples, mas nunca muda.

   A resposta aparece sendo digitada, como numa conversa de verdade.
   ========================================================================== */
(function () {
  'use strict';

  // Endereço da API em Python. Rodando o site na máquina (localhost, arquivo
  // aberto direto), é o python api/eloa.py na porta 8000; publicado, é a
  // função /api/eloa do mesmo domínio. window.ELOA_API_URL, definido antes
  // deste arquivo, sobrescreve os dois.
  const naMaquina = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);

  const CONFIG = {
    api: {
      url: window.ELOA_API_URL || (naMaquina ? 'http://localhost:8000/perguntar' : '/api/eloa/perguntar'),
      timeoutMs: 45000
    },
    // Tempo "pensando" antes de digitar (só no modo local; o modelo já demora o seu)
    pensando: { base: 350, porCaractere: 3, maximo: 900 },
    digitacao: { msPorCaractere: 14, maximoMs: 2600 },
    avatar: '../assets/img/eloa-avatar.png'
  };

  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     Sessão: o mesmo id em todas as perguntas para a Eloá lembrar da conversa
     ------------------------------------------------------------------------ */
  const CHAVE_SESSAO = 'eloa-sessao';
  const CHAVE_HISTORICO = 'eloa-historico';
  const MAX_HISTORICO = 40; // mensagens (user + assistant), igual ao servidor
  let idSessao = sessionStorage.getItem(CHAVE_SESSAO) || null;
  let historico = [];
  try { historico = JSON.parse(sessionStorage.getItem(CHAVE_HISTORICO)) || []; } catch { historico = []; }

  function lembrar(pergunta, resposta) {
    historico.push({ role: 'user', content: pergunta }, { role: 'assistant', content: resposta });
    historico = historico.slice(-MAX_HISTORICO);
    try { sessionStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico)); } catch {}
  }

  /* ------------------------------------------------------------------------
     API da Eloá: uma função, uma promessa, uma resposta.
     window.EloaAPI.perguntar(texto) → { resposta, fonte, intencao, confianca }
     ------------------------------------------------------------------------ */
  const local = window.EloaEngine ? EloaEngine.criarSessao() : null;
  let apiForaDoAr = false;

  const EloaAPI = {
    async perguntar(texto) {
      if (!apiForaDoAr) {
        const remota = await perguntarApi(texto);
        if (remota) return remota;
      }
      return responderLocal(texto);
    }
  };

  async function perguntarApi(texto) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), CONFIG.api.timeoutMs);
    try {
      const resposta = await fetch(CONFIG.api.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto, sessao: idSessao, historico }),
        signal: controle.signal
      });
      const dados = await resposta.json();
      if (dados && dados.status === 'sucesso' && dados.resposta_da_ia) {
        if (dados.sessao && dados.sessao !== idSessao) {
          idSessao = dados.sessao;
          sessionStorage.setItem(CHAVE_SESSAO, idSessao);
        }
        lembrar(texto, dados.resposta_da_ia);
        return { resposta: dados.resposta_da_ia, fonte: dados.fonte || 'api', intencao: dados.intencao, confianca: dados.confianca };
      }
    } catch (erro) {
      // sem servidor, sem rede ou tempo esgotado: cai para o motor local e
      // tenta a API de novo daqui a um minuto
      apiForaDoAr = true;
      setTimeout(() => { apiForaDoAr = false; }, 60000);
    } finally {
      clearTimeout(relogio);
    }
    return null;
  }

  async function responderLocal(texto) {
    if (!local) {
      return { resposta: 'Estou sem conexão com o meu servidor agora. Tenta de novo em instantes? Se for emergência, use o botão vermelho da pochete ou ligue 192.', fonte: 'offline', intencao: 'desconhecido', confianca: 0 };
    }
    const r = local.responder(texto);
    await esperar(tempoPensando(r.resposta.length));
    return r;
  }

  function tempoPensando(tamanho) {
    const { base, porCaractere, maximo } = CONFIG.pensando;
    return Math.min(maximo, base + tamanho * porCaractere);
  }

  function esperar(ms) {
    return ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve();
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
