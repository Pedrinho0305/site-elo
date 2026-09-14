/* ==========================================================================
   Eloá · Servidor HTTP
   ---------------------------------------------------------------------------
   Expõe o motor de respostas como uma API de verdade, com o mesmo contrato
   do servidor antigo — então qualquer cliente que falava com o Render fala
   com este sem mudar nada.

   Rodar:      node api/server.js            (porta 8000)
               PORT=3000 node api/server.js  (outra porta)
   Sem dependências: só o Node (18 ou mais novo).

   Rotas:
     POST /perguntar   { "pergunta": "...", "sessao": "id-opcional" }
                       → { status: "sucesso", resposta_da_ia, intencao, confianca, fonte, sessao }
     GET  /saude       → { ok: true, versao, sessoes }

   Sessão: mande o mesmo "sessao" em todas as perguntas de uma conversa e a
   Eloá lembra do nome, de quem você fala e do que já explicou. Se não
   mandar, o servidor cria uma e devolve o id na resposta. Sessões paradas
   por 30 minutos são apagadas.
   ========================================================================== */
'use strict';

const http = require('http');
const EloaEngine = require('./eloa-engine.js');

const PORTA = Number(process.env.PORT) || 8000;
const LIMITE_CORPO = 16 * 1024; // 16 KB é mais que suficiente para uma pergunta
const VALIDADE_SESSAO = 30 * 60 * 1000;

const sessoes = new Map(); // id → { sessao, tocadaEm }

function obterSessao(id) {
  const agora = Date.now();
  if (id && sessoes.has(id)) {
    const s = sessoes.get(id);
    s.tocadaEm = agora;
    return { id, sessao: s.sessao };
  }
  const novoId = id && /^[\w-]{1,64}$/.test(id) ? id : 'eloa-' + agora.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  sessoes.set(novoId, { sessao: EloaEngine.criarSessao(), tocadaEm: agora });
  return { id: novoId, sessao: sessoes.get(novoId).sessao };
}

// limpa sessões paradas
setInterval(() => {
  const limite = Date.now() - VALIDADE_SESSAO;
  for (const [id, s] of sessoes) if (s.tocadaEm < limite) sessoes.delete(id);
}, 5 * 60 * 1000).unref();

const CABECALHOS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function responder(res, codigo, corpo) {
  res.writeHead(codigo, CABECALHOS);
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', pedaco => {
      dados += pedaco;
      if (dados.length > LIMITE_CORPO) { reject(new Error('corpo grande demais')); req.destroy(); }
    });
    req.on('end', () => resolve(dados));
    req.on('error', reject);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CABECALHOS);
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/saude') {
    return responder(res, 200, { ok: true, versao: EloaEngine.versao, sessoes: sessoes.size });
  }

  if (req.method === 'POST' && url.pathname === '/perguntar') {
    let pergunta, idSessao;
    try {
      const corpo = await lerCorpo(req);
      const dados = JSON.parse(corpo || '{}');
      pergunta = dados.pergunta;
      idSessao = typeof dados.sessao === 'string' ? dados.sessao : null;
    } catch (erro) {
      return responder(res, 400, { status: 'erro', mensagem: 'Envie um JSON no formato { "pergunta": "..." }.' });
    }

    if (typeof pergunta !== 'string' || !pergunta.trim()) {
      return responder(res, 400, { status: 'erro', mensagem: 'O campo "pergunta" precisa ser um texto.' });
    }

    const { id, sessao } = obterSessao(idSessao);
    const r = sessao.responder(pergunta);
    return responder(res, 200, {
      status: 'sucesso',
      resposta_da_ia: r.resposta,
      intencao: r.intencao,
      confianca: r.confianca,
      fonte: r.fonte,
      sessao: id
    });
  }

  responder(res, 404, { status: 'erro', mensagem: 'Rota não encontrada. Use POST /perguntar ou GET /saude.' });
});

servidor.listen(PORTA, () => {
  console.log(`Eloá respondendo em http://localhost:${PORTA}/perguntar`);
});
