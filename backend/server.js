/* ==========================================================================
   ELO · Backend
   ---------------------------------------------------------------------------
   Express 5 + MySQL (mysql2). Cuida de:
     • contas dos cuidadores (cadastro, login, sessão por token)
     • pochetes vinculadas a cada cuidador (chave própria para o dispositivo)
     • eventos que a pochete manda (emergência, transporte, bateria, localização)
     • corridas de Uber: pedido → aprovação do cuidador → chamada à Uber
     • avisos no Telegram e em tempo real no painel (SSE)

   Rodar:
     cd backend && npm install
     copie .env.example para .env e preencha
     npm start                      (porta 3000)
   As tabelas são criadas sozinhas na primeira execução.

   GET /            página com todas as rotas e o estado do servidor (JSON com Accept: application/json)

   ROTAS DO CUIDADOR (Authorization: Bearer <token>)
     POST   /api/cadastro                { nome, email, senha, foto? }      → 201 { token, cuidador }
     POST   /api/login                   { email, senha }                   → { token, cuidador }
     GET    /api/me · PATCH /api/me      { nome?, foto?, telefone? }        → { cuidador }
     POST   /api/logout
     GET    /api/pochetes                                                   → { pochetes }
     POST   /api/pochetes                { nome_idoso, telefone_idoso?, casa? } → 201 { pochete, chave }
     POST   /api/pochetes/:id/chave                                         → { chave }   (gera uma nova)
     PATCH  /api/pochetes/:id            { nome_idoso?, telefone_idoso?, casa? }
     DELETE /api/pochetes/:id
     POST   /api/pochetes/:id/simular    { tipo, lat?, lng?, bateria?, destino? }  (testa sem o dispositivo)
     GET    /api/eventos?limite=20                                          → { eventos }
     GET    /api/eventos/stream?token=   SSE: emergencia, transporte, corrida, bateria, localizacao
     GET    /api/corridas                                                   → { corridas }
     GET    /api/corridas/:id            (atualiza o status na Uber)        → { corrida }
     POST   /api/corridas/:id/aprovar · /recusar · /cancelar
     POST   /api/telegram/codigo                                            → { codigo, bot, vinculado }
     POST   /api/telegram/vincular       { chat_id }   (só no modo simulado)
     DELETE /api/telegram
     POST   /api/telegram/teste

   ROTAS DA POCHETE (X-Pochete-Key: <chave>)
     POST   /api/pochete/evento          { tipo: emergencia|transporte|bateria|localizacao|teste,
                                           lat?, lng?, bateria?, destino?: { lat, lng, nome } }
     GET    /api/pochete/estado          → { pochete, corrida }   (para ela anunciar "corrida aprovada")

   Erros: { erro: "mensagem em português" } com o status HTTP certo.

   VERCEL: o app é exportado (export default) e uma função serverless o
   entrega — api/backend.js na raiz do site (mesmo projeto do front, rotas em
   /api/*) ou backend/api/index.js (projeto só do backend). Na Vercel não há
   processo contínuo, então o stream SSE, o polling do Telegram e a
   sincronização periódica com a Uber ficam desligados (veja a rota /).
   O painel do site faz polling quando o stream não existe.
   ========================================================================== */
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import * as uber from './uber.js';
import * as telegram from './telegram.js';
import * as sse from './eventos.js';

/* ------------------------------------------------------------------------
   Configuração
   ------------------------------------------------------------------------ */
const NA_VERCEL = Boolean(process.env.VERCEL);
const INICIO = Date.now();

const CONFIG = {
  porta: Number(process.env.PORT) || 3000,
  origens: (process.env.ALLOWED_ORIGINS || '*').split(',').map(o => o.trim()),
  sessaoDias: Number(process.env.SESSION_DAYS) || 30,
  bateriaBaixa: Number(process.env.BATERIA_BAIXA) || 20,
  banco: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alunos_elo',
  },
};

const LIMITE_FOTO = 400 * 1024;
const scrypt = promisify(crypto.scrypt);

/* ------------------------------------------------------------------------
   Banco
   ------------------------------------------------------------------------ */
let pool;
let conectando = null;

// Uma tentativa por vez; quem chegar enquanto conecta espera a mesma promessa
function garantirBanco() {
  if (pool) return Promise.resolve(pool);
  conectando ??= conectarBanco().finally(() => { conectando = null; });
  return conectando;
}

async function conectarBanco() {
  const servidor = await mysql.createConnection({ ...CONFIG.banco, database: undefined, connectTimeout: 10_000 });
  await servidor.query(`CREATE DATABASE IF NOT EXISTS \`${CONFIG.banco.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await servidor.end();

  const novo = mysql.createPool({ ...CONFIG.banco, waitForConnections: true, connectionLimit: NA_VERCEL ? 2 : 10, charset: 'utf8mb4', timezone: 'Z', connectTimeout: 10_000 });
  // NOW() e CURRENT_TIMESTAMP em UTC, igual ao que o driver lê (timezone: 'Z')
  novo.on('connection', c => c.query("SET time_zone = '+00:00'"));
  await novo.query("SET time_zone = '+00:00'");
  pool = novo;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cuidadores (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nome          VARCHAR(120)  NOT NULL,
      email         VARCHAR(190)  NOT NULL UNIQUE,
      senha_hash    VARCHAR(200)  NOT NULL,
      foto          MEDIUMTEXT    NULL,
      telefone      VARCHAR(20)   NULL,
      telegram_chat_id VARCHAR(32) NULL,
      telegram_codigo  VARCHAR(12) NULL,
      criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // colunas novas em bancos criados pela versão anterior
  const [cols] = await pool.query('SHOW COLUMNS FROM cuidadores');
  const nomes = new Set(cols.map(c => c.Field));
  for (const [col, def] of [['telefone', 'VARCHAR(20) NULL'], ['telegram_chat_id', 'VARCHAR(32) NULL'], ['telegram_codigo', 'VARCHAR(12) NULL']]) {
    if (!nomes.has(col)) await pool.query(`ALTER TABLE cuidadores ADD COLUMN ${col} ${def}`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessoes (
      token        CHAR(64)      PRIMARY KEY,
      cuidador_id  INT UNSIGNED  NOT NULL,
      criado_em    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expira_em    DATETIME      NOT NULL,
      INDEX (cuidador_id),
      CONSTRAINT fk_sessao_cuidador FOREIGN KEY (cuidador_id) REFERENCES cuidadores(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pochetes (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cuidador_id     INT UNSIGNED  NOT NULL,
      nome_idoso      VARCHAR(120)  NOT NULL,
      telefone_idoso  VARCHAR(20)   NULL,
      chave_hash      CHAR(64)      NOT NULL UNIQUE,
      casa_lat        DECIMAL(9,6)  NULL,
      casa_lng        DECIMAL(9,6)  NULL,
      casa_nome       VARCHAR(200)  NULL,
      bateria         TINYINT UNSIGNED NULL,
      lat             DECIMAL(9,6)  NULL,
      lng             DECIMAL(9,6)  NULL,
      ultimo_contato  DATETIME      NULL,
      criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (cuidador_id),
      CONSTRAINT fk_pochete_cuidador FOREIGN KEY (cuidador_id) REFERENCES cuidadores(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS eventos (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      pochete_id  INT UNSIGNED  NOT NULL,
      tipo        VARCHAR(20)   NOT NULL,
      dados       JSON          NULL,
      criado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (pochete_id, criado_em),
      CONSTRAINT fk_evento_pochete FOREIGN KEY (pochete_id) REFERENCES pochetes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS corridas (
      id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      pochete_id       INT UNSIGNED  NOT NULL,
      status           VARCHAR(20)   NOT NULL DEFAULT 'pendente',
      origem_lat       DECIMAL(9,6)  NOT NULL,
      origem_lng       DECIMAL(9,6)  NOT NULL,
      destino_lat      DECIMAL(9,6)  NOT NULL,
      destino_lng      DECIMAL(9,6)  NOT NULL,
      destino_nome     VARCHAR(200)  NULL,
      uber_request_id  VARCHAR(64)   NULL,
      uber_status      VARCHAR(40)   NULL,
      produto          VARCHAR(60)   NULL,
      valor            VARCHAR(30)   NULL,
      eta_min          INT           NULL,
      motorista        VARCHAR(200)  NULL,
      veiculo          VARCHAR(120)  NULL,
      erro             VARCHAR(200)  NULL,
      solicitada_em    DATETIME      NULL,
      criado_em        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (pochete_id, status),
      CONSTRAINT fk_corrida_pochete FOREIGN KEY (pochete_id) REFERENCES pochetes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [colsCorridas] = await pool.query('SHOW COLUMNS FROM corridas');
  if (!colsCorridas.some(c => c.Field === 'solicitada_em')) await pool.query('ALTER TABLE corridas ADD COLUMN solicitada_em DATETIME NULL AFTER erro');
}

/* ------------------------------------------------------------------------
   Senhas, tokens e chaves
   ------------------------------------------------------------------------ */
async function gerarHash(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const chave = await scrypt(senha, sal, 64);
  return `scrypt$${sal}$${chave.toString('hex')}`;
}

async function conferirSenha(senha, hash) {
  const [, sal, esperado] = hash.split('$');
  if (!sal || !esperado) return false;
  const chave = await scrypt(senha, sal, 64);
  const a = Buffer.from(esperado, 'hex');
  return a.length === chave.length && crypto.timingSafeEqual(a, chave);
}

async function abrirSessao(cuidadorId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + CONFIG.sessaoDias * 24 * 60 * 60 * 1000);
  await pool.query('INSERT INTO sessoes (token, cuidador_id, expira_em) VALUES (?, ?, ?)', [token, cuidadorId, expira]);
  return token;
}

// A chave da pochete é mostrada uma vez e guardada só como hash (como senha)
function novaChavePochete() {
  const chave = 'elo_' + crypto.randomBytes(24).toString('base64url');
  return { chave, hash: hashChave(chave) };
}
const hashChave = chave => crypto.createHash('sha256').update(chave).digest('hex');

/* ------------------------------------------------------------------------
   Validação e utilidades
   ------------------------------------------------------------------------ */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const limparNome = n => String(n || '').trim().replace(/\s+/g, ' ');
const limparEmail = e => String(e || '').trim().toLowerCase();
const limparTelefone = t => (t == null || t === '') ? null : String(t).replace(/[^\d+]/g, '').slice(0, 20);

function validarFoto(foto) {
  if (foto == null || foto === '') return null;
  if (typeof foto !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(foto)) throw erro(400, 'A foto precisa ser uma imagem JPG, PNG ou WebP.');
  if (foto.length > LIMITE_FOTO) throw erro(400, 'A foto é grande demais. Escolha uma menor.');
  return foto;
}

function validarCoordenada(lat, lng) {
  lat = Number(lat); lng = Number(lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function erro(status, mensagem) { return Object.assign(new Error(mensagem), { status }); }
const publico = c => ({ id: c.id, nome: c.nome, email: c.email, foto: c.foto || null, telefone: c.telefone || null, telegram: Boolean(c.telegram_chat_id) });
const pochetePublica = p => ({
  id: p.id, nome_idoso: p.nome_idoso, telefone_idoso: p.telefone_idoso,
  casa: p.casa_lat != null ? { lat: Number(p.casa_lat), lng: Number(p.casa_lng), nome: p.casa_nome } : null,
  bateria: p.bateria, posicao: p.lat != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null,
  ultimo_contato: p.ultimo_contato, criado_em: p.criado_em,
});
const corridaPublica = c => ({
  id: c.id, pochete_id: c.pochete_id, status: c.status,
  origem: { lat: Number(c.origem_lat), lng: Number(c.origem_lng) },
  destino: { lat: Number(c.destino_lat), lng: Number(c.destino_lng), nome: c.destino_nome },
  produto: c.produto, valor: c.valor, eta_min: c.eta_min, motorista: c.motorista, veiculo: c.veiculo, erro: c.erro,
  uber_request_id: c.uber_request_id, criado_em: c.criado_em, solicitada_em: c.solicitada_em, atualizado_em: c.atualizado_em,
});
const mapa = (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`;
const STATUS_ATIVOS = ['pendente', 'aprovada', 'solicitada', 'a_caminho', 'em_andamento'];

/* ------------------------------------------------------------------------
   O coração: um evento da pochete
   ------------------------------------------------------------------------ */
async function tratarEvento(pochete, cuidador, tipo, dados = {}, origem = 'pochete') {
  const pos = validarCoordenada(dados.lat, dados.lng) || (pochete.lat != null ? { lat: Number(pochete.lat), lng: Number(pochete.lng) } : null);
  const bateria = dados.bateria != null ? Math.max(0, Math.min(100, Math.round(Number(dados.bateria)))) : pochete.bateria;

  await pool.query('UPDATE pochetes SET lat = ?, lng = ?, bateria = ?, ultimo_contato = NOW() WHERE id = ?',
    [pos?.lat ?? null, pos?.lng ?? null, Number.isFinite(bateria) ? bateria : null, pochete.id]);

  const registro = { ...dados, lat: pos?.lat, lng: pos?.lng, bateria, origem };
  const [r] = await pool.query('INSERT INTO eventos (pochete_id, tipo, dados) VALUES (?, ?, ?)', [pochete.id, tipo, JSON.stringify(registro)]);
  const evento = { id: r.insertId, pochete_id: pochete.id, nome_idoso: pochete.nome_idoso, tipo, dados: registro, criado_em: new Date().toISOString() };

  const lugar = pos ? `\n📍 ${mapa(pos.lat, pos.lng)}` : '\n📍 Sem localização recente';
  let corrida = null;

  switch (tipo) {
    case 'emergencia':
      await telegram.enviar(cuidador.telegram_chat_id, `🚨 <b>EMERGÊNCIA</b>\n${pochete.nome_idoso} apertou o botão vermelho. O SAMU (192) foi acionado.${lugar}`);
      break;

    case 'transporte': {
      const destino = validarCoordenada(dados.destino?.lat, dados.destino?.lng)
        || (pochete.casa_lat != null ? { lat: Number(pochete.casa_lat), lng: Number(pochete.casa_lng) } : null);
      if (!pos) throw erro(422, 'A pochete precisa mandar a localização (lat, lng) para pedir transporte.');
      if (!destino) throw erro(422, 'Sem destino: cadastre o endereço de casa da pochete no painel ou mande destino no evento.');
      const destinoNome = dados.destino?.nome || (dados.destino?.lat ? null : pochete.casa_nome || 'Casa');

      // uma corrida ativa por vez
      const [ativas] = await pool.query('SELECT id FROM corridas WHERE pochete_id = ? AND status IN (?)', [pochete.id, STATUS_ATIVOS]);
      if (ativas.length) throw erro(409, 'Já existe uma corrida em andamento para esta pochete.');

      const [c] = await pool.query(
        'INSERT INTO corridas (pochete_id, status, origem_lat, origem_lng, destino_lat, destino_lng, destino_nome) VALUES (?, "pendente", ?, ?, ?, ?, ?)',
        [pochete.id, pos.lat, pos.lng, destino.lat, destino.lng, destinoNome]);
      const [[linha]] = await pool.query('SELECT * FROM corridas WHERE id = ?', [c.insertId]);
      corrida = corridaPublica(linha);
      await telegram.enviar(cuidador.telegram_chat_id, `🚕 <b>Pedido de transporte</b>\n${pochete.nome_idoso} quer um carro para ${destinoNome || 'o destino informado'}.\nAprove ou recuse no painel da ELO.${lugar}`);
      break;
    }

    case 'bateria':
      if (bateria != null && bateria <= CONFIG.bateriaBaixa) {
        await telegram.enviar(cuidador.telegram_chat_id, `🔋 A pochete de ${pochete.nome_idoso} está com ${bateria}% de bateria. Lembre de carregar hoje à noite.`);
      }
      break;

    case 'teste':
      await telegram.enviar(cuidador.telegram_chat_id, `✅ Teste da pochete de ${pochete.nome_idoso}: tudo funcionando.${lugar}`);
      break;

    // localizacao: só atualiza e avisa o painel
  }

  sse.publicar(cuidador.id, tipo, { evento, corrida, pochete: { id: pochete.id, nome_idoso: pochete.nome_idoso, bateria, posicao: pos } });
  return { evento, corrida };
}

/* Atualiza uma corrida com o que a Uber diz e avisa o painel se mudou */
async function sincronizarCorrida(corrida, cuidadorId) {
  if (!corrida.uber_request_id || !['solicitada', 'a_caminho', 'em_andamento'].includes(corrida.status)) return corrida;
  try {
    const u = await uber.consultar(corrida.uber_request_id, corrida.solicitada_em || corrida.criado_em);
    const motorista = u.motorista ? `${u.motorista.nome}${u.motorista.telefone ? ' · ' + u.motorista.telefone : ''}` : corrida.motorista;
    if (u.status !== corrida.status || u.eta_min !== corrida.eta_min || motorista !== corrida.motorista) {
      await pool.query('UPDATE corridas SET status = ?, uber_status = ?, eta_min = ?, motorista = ?, veiculo = ? WHERE id = ?',
        [u.status, u.uber_status, u.eta_min, motorista, u.veiculo || corrida.veiculo, corrida.id]);
      const [[atual]] = await pool.query('SELECT * FROM corridas WHERE id = ?', [corrida.id]);
      sse.publicar(cuidadorId, 'corrida', { corrida: corridaPublica(atual) });
      return atual;
    }
  } catch (e) {
    console.error('[uber consultar]', e.message);
  }
  return corrida;
}

/* ------------------------------------------------------------------------
   App
   ------------------------------------------------------------------------ */
const app = express();
app.use(cors({ origin: CONFIG.origens.includes('*') ? true : CONFIG.origens }));
app.use(express.json({ limit: '1mb' }));

// Sem banco não há rota que funcione: tenta conectar (de novo, se a primeira
// vez falhou — comum em serverless) e responde 503 honesto se não der.
app.use('/api', async (req, _res, next) => {
  if (req.path === '/') return next(); // a página de estado mostra o erro do banco por conta própria
  try { await garantirBanco(); next(); }
  catch (e) { console.error('[banco]', e.code || '', e.message); next(erro(503, 'O banco de dados está indisponível. Tente de novo em instantes.')); }
});

async function carregarPorToken(token) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw erro(401, 'Faça login para continuar.');
  const [linhas] = await pool.query(
    'SELECT c.* FROM sessoes s JOIN cuidadores c ON c.id = s.cuidador_id WHERE s.token = ? AND s.expira_em > NOW()', [token]);
  if (!linhas.length) throw erro(401, 'Sua sessão expirou. Entre de novo.');
  return linhas[0];
}

async function autenticar(req, _res, next) {
  try {
    const [tipo, token] = String(req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer') throw erro(401, 'Faça login para continuar.');
    req.cuidador = await carregarPorToken(token);
    req.token = token;
    next();
  } catch (e) { next(e); }
}

// A pochete se identifica pela chave dela
async function autenticarPochete(req, _res, next) {
  try {
    const chave = String(req.headers['x-pochete-key'] || '');
    if (!chave.startsWith('elo_')) throw erro(401, 'Chave da pochete ausente. Envie o cabeçalho X-Pochete-Key.');
    const [linhas] = await pool.query(
      'SELECT p.*, c.id AS c_id, c.nome AS c_nome, c.telegram_chat_id AS c_telegram FROM pochetes p JOIN cuidadores c ON c.id = p.cuidador_id WHERE p.chave_hash = ?',
      [hashChave(chave)]);
    if (!linhas.length) throw erro(401, 'Chave da pochete inválida.');
    const p = linhas[0];
    req.pochete = p;
    req.cuidador = { id: p.c_id, nome: p.c_nome, telegram_chat_id: p.c_telegram };
    next();
  } catch (e) { next(e); }
}

// pochete do cuidador logado, ou 404
async function pocheteDoCuidador(req) {
  const [linhas] = await pool.query('SELECT * FROM pochetes WHERE id = ? AND cuidador_id = ?', [Number(req.params.id), req.cuidador.id]);
  if (!linhas.length) throw erro(404, 'Pochete não encontrada.');
  return linhas[0];
}

async function corridaDoCuidador(req) {
  const [linhas] = await pool.query(
    'SELECT c.* FROM corridas c JOIN pochetes p ON p.id = c.pochete_id WHERE c.id = ? AND p.cuidador_id = ?', [Number(req.params.id), req.cuidador.id]);
  if (!linhas.length) throw erro(404, 'Corrida não encontrada.');
  return linhas[0];
}

/* ---- página inicial: o backend inteiro numa tela ---- */
const ROTAS = [
  ['Servidor', [
    ['GET', '/', 'Esta página (no site publicado, /api). Com Accept: application/json, devolve o mesmo em JSON.'],
    ['GET', '/api/saude', 'Estado do banco, da Uber e do Telegram.'],
  ]],
  ['Contas do cuidador', [
    ['POST', '/api/cadastro', '{ nome, email, senha, foto? } → 201 { token, cuidador }. 409 se o email já existe.'],
    ['POST', '/api/login', '{ email, senha } → { token, cuidador }. 401 se errado.'],
    ['GET', '/api/me', 'Bearer → { cuidador }'],
    ['PATCH', '/api/me', 'Bearer { nome?, foto?, telefone? } → { cuidador }'],
    ['POST', '/api/logout', 'Bearer → { ok }'],
  ]],
  ['Pochetes (cuidador)', [
    ['GET', '/api/pochetes', 'Bearer → { pochetes }'],
    ['POST', '/api/pochetes', 'Bearer { nome_idoso, telefone_idoso?, casa? } → 201 { pochete, chave }. A chave só aparece aqui.'],
    ['POST', '/api/pochetes/:id/chave', 'Bearer → { chave } nova; a antiga para de funcionar.'],
    ['PATCH', '/api/pochetes/:id', 'Bearer { nome_idoso?, telefone_idoso?, casa? }'],
    ['DELETE', '/api/pochetes/:id', 'Bearer → { ok }'],
    ['POST', '/api/pochetes/:id/simular', 'Bearer { tipo, lat?, lng?, bateria?, destino? } — aperta um botão como se fosse a pochete.'],
  ]],
  ['A pochete fala com o servidor (X-Pochete-Key)', [
    ['POST', '/api/pochete/evento', '{ tipo: emergencia | transporte | bateria | localizacao | teste, lat?, lng?, bateria?, destino? } → 201 { evento, corrida? }'],
    ['GET', '/api/pochete/estado', '→ { pochete, cuidador, corrida } — para ela anunciar a corrida por voz.'],
  ]],
  ['Eventos e corridas (cuidador)', [
    ['GET', '/api/eventos?limite=20', 'Bearer → { eventos }'],
    ['GET', '/api/eventos/stream?token=', 'SSE: emergencia, transporte, bateria, localizacao, teste, corrida, telegram. Não funciona em serverless.'],
    ['GET', '/api/corridas', 'Bearer → { corridas } (consulta a Uber e atualiza)'],
    ['GET', '/api/corridas/:id', 'Bearer → { corrida }'],
    ['POST', '/api/corridas/:id/aprovar', 'Bearer → estima e pede o carro na Uber → { corrida }'],
    ['POST', '/api/corridas/:id/recusar', 'Bearer → { corrida }'],
    ['POST', '/api/corridas/:id/cancelar', 'Bearer → cancela na Uber → { corrida }'],
  ]],
  ['Telegram (cuidador)', [
    ['POST', '/api/telegram/codigo', 'Bearer → { codigo, bot, simulado, vinculado }'],
    ['POST', '/api/telegram/vincular', 'Bearer { chat_id } (só no modo simulado)'],
    ['DELETE', '/api/telegram', 'Bearer → { ok }'],
    ['POST', '/api/telegram/teste', 'Bearer → manda uma mensagem de teste'],
  ]],
];

async function estadoServidor() {
  let banco = 'conectado';
  try { await (await garantirBanco()).query('SELECT 1'); } catch (e) { banco = 'indisponível: ' + (e.code || e.message); }
  return {
    nome: 'ELO backend',
    versao: '1.1.0',
    ambiente: NA_VERCEL ? 'vercel' : 'servidor',
    banco, host_banco: `${CONFIG.banco.user}@${CONFIG.banco.host}/${CONFIG.banco.database}`,
    uber: uber.simulado ? 'simulado' : 'real',
    telegram: telegram.simulado ? 'simulado' : 'bot @' + telegram.botUsername,
    tempo_real: NA_VERCEL ? 'desligado (serverless)' : 'SSE ativo',
    ativo_ha_s: Math.round((Date.now() - INICIO) / 1000),
    node: process.version,
  };
}

const escapar = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

app.get(['/', '/api'], async (req, res, next) => {
  try {
    const estado = await estadoServidor();
    if (req.accepts(['html', 'json']) === 'json') return res.json({ ...estado, rotas: ROTAS });

    const ok = estado.banco === 'conectado';
    const chip = (rotulo, valor, cor) => `<span class="chip chip--${cor}"><b>${rotulo}</b> ${escapar(valor)}</span>`;
    const grupos = ROTAS.map(([titulo, rotas]) => `
      <section>
        <h2>${escapar(titulo)}</h2>
        <table>${rotas.map(([m, r, d]) => `<tr><td><code class="m m-${m.toLowerCase()}">${m}</code></td><td><code>${escapar(r)}</code></td><td>${escapar(d)}</td></tr>`).join('')}</table>
      </section>`).join('');

    res.type('html').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ELO backend</title>
<style>
  :root{--bg:#060b1c;--bg2:#0b1229;--bg3:#111a38;--line:rgba(160,178,235,.16);--t:#eef2ff;--t2:#b4bddc;--t3:#808cb5;--g:#22c55e;--c:#22d3ee;--b:#2f7ff7;--o:#ff7a1a;--r:#ff3b4e}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:16px/1.55 system-ui,Segoe UI,sans-serif}
  main{max-width:1040px;margin:0 auto;padding:40px 24px 64px}
  h1{font-size:34px;margin:0;letter-spacing:-.02em}h1 span{background:linear-gradient(100deg,var(--g),var(--c) 52%,var(--b));-webkit-background-clip:text;background-clip:text;color:transparent}
  .lead{color:var(--t2);margin:8px 0 22px;max-width:70ch}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:34px}
  .chip{display:inline-flex;gap:6px;align-items:center;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--bg2);font-size:14px;color:var(--t2)}.chip b{color:var(--t);font-weight:600}
  .chip--ok{border-color:rgba(34,197,94,.5)}.chip--warn{border-color:rgba(255,122,26,.5)}.chip--bad{border-color:rgba(255,59,78,.6)}
  section{margin-top:26px;padding:18px 20px;border-radius:18px;background:var(--bg2);border:1px solid var(--line)}
  h2{font-size:17px;margin:0 0 10px}table{width:100%;border-collapse:collapse}td{padding:9px 8px;border-top:1px solid var(--line);vertical-align:top;font-size:14.5px;color:var(--t2)}td:first-child{width:74px}td:nth-child(2){width:270px;color:var(--t)}
  code{font:13px ui-monospace,Consolas,monospace}.m{display:inline-block;padding:2px 8px;border-radius:6px;font-weight:700;color:#05101f}
  .m-get{background:var(--c)}.m-post{background:var(--g)}.m-patch{background:var(--o)}.m-delete{background:var(--r);color:#fff}
  .aviso{margin-top:26px;padding:16px 20px;border-radius:14px;background:rgba(255,122,26,.1);border:1px solid rgba(255,122,26,.45);color:var(--t2)}
  footer{margin-top:34px;color:var(--t3);font-size:14px}a{color:var(--c)}
</style></head><body><main>
  <h1><span>ELO</span> backend</h1>
  <p class="lead">Servidor das contas dos cuidadores, das pochetes, das corridas de Uber e dos avisos por Telegram. Todas as rotas respondem JSON; erros vêm como <code>{ "erro": "mensagem" }</code>.</p>
  <div class="chips">
    ${chip('Banco', estado.banco, ok ? 'ok' : 'bad')}
    ${chip('Uber', estado.uber, estado.uber === 'real' ? 'ok' : 'warn')}
    ${chip('Telegram', estado.telegram, estado.telegram === 'simulado' ? 'warn' : 'ok')}
    ${chip('Tempo real', estado.tempo_real, NA_VERCEL ? 'warn' : 'ok')}
    ${chip('Ambiente', estado.ambiente, 'ok')}
    ${chip('Ativo há', estado.ativo_ha_s + ' s', 'ok')}
    ${chip('Node', estado.node, 'ok')}
  </div>
  ${grupos}
  ${NA_VERCEL ? `<div class="aviso"><b>Rodando na Vercel.</b> Funções serverless não mantêm processo aberto: o stream em tempo real (<code>/api/eventos/stream</code>), o bot do Telegram (que precisa ficar ouvindo o <code>/start</code>) e a sincronização automática das corridas ficam desligados; o painel do site consulta o servidor a cada 10 s no lugar do stream. Cadastro, login, pochetes, eventos, corridas e o envio de mensagens funcionam normalmente. Para o tempo real, rode o servidor num lugar com processo contínuo (Render, Railway, servidor da escola).</div>` : ''}
  <footer>Mesmo contrato em <code>backend/README.md</code>. Saúde em <a href="/api/saude">/api/saude</a>. Esta página em JSON: <code>curl -H "Accept: application/json" /</code></footer>
</main></body></html>`);
  } catch (e) { next(e); }
});

/* ---- saúde ---- */
app.get('/api/saude', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, banco: 'conectado', uber: uber.simulado ? 'simulado' : 'real', telegram: telegram.simulado ? 'simulado' : 'real' });
  } catch (e) { next(e); }
});

/* ---- contas ---- */
app.post('/api/cadastro', async (req, res, next) => {
  try {
    const nome = limparNome(req.body?.nome);
    const email = limparEmail(req.body?.email);
    const senha = String(req.body?.senha || '');
    const foto = validarFoto(req.body?.foto);

    if (nome.length < 2 || nome.length > 120) throw erro(400, 'Digite seu nome completo.');
    if (!EMAIL.test(email)) throw erro(400, 'Digite um email válido.');
    if (senha.length < 6) throw erro(400, 'A senha precisa ter pelo menos 6 caracteres.');
    if (senha.length > 200) throw erro(400, 'A senha é longa demais.');

    const [existe] = await pool.query('SELECT id FROM cuidadores WHERE email = ?', [email]);
    if (existe.length) throw erro(409, 'Já existe uma conta com esse email. Quer entrar?');

    const [r] = await pool.query('INSERT INTO cuidadores (nome, email, senha_hash, foto) VALUES (?, ?, ?, ?)', [nome, email, await gerarHash(senha), foto]);
    const token = await abrirSessao(r.insertId);
    res.status(201).json({ token, cuidador: { id: r.insertId, nome, email, foto, telefone: null, telegram: false } });
  } catch (e) { next(e); }
});

app.post('/api/login', async (req, res, next) => {
  try {
    const email = limparEmail(req.body?.email);
    const senha = String(req.body?.senha || '');
    if (!EMAIL.test(email) || !senha) throw erro(400, 'Digite seu email e sua senha.');

    const [linhas] = await pool.query('SELECT * FROM cuidadores WHERE email = ?', [email]);
    const cuidador = linhas[0];
    if (!cuidador || !(await conferirSenha(senha, cuidador.senha_hash))) throw erro(401, 'Email ou senha incorretos.');

    res.json({ token: await abrirSessao(cuidador.id), cuidador: publico(cuidador) });
  } catch (e) { next(e); }
});

app.get('/api/me', autenticar, (req, res) => res.json({ cuidador: publico(req.cuidador) }));

app.patch('/api/me', autenticar, async (req, res, next) => {
  try {
    const campos = [], valores = [];
    if (req.body?.nome !== undefined) {
      const nome = limparNome(req.body.nome);
      if (nome.length < 2 || nome.length > 120) throw erro(400, 'Digite seu nome completo.');
      campos.push('nome = ?'); valores.push(nome);
    }
    if (req.body?.foto !== undefined) { campos.push('foto = ?'); valores.push(validarFoto(req.body.foto)); }
    if (req.body?.telefone !== undefined) { campos.push('telefone = ?'); valores.push(limparTelefone(req.body.telefone)); }
    if (!campos.length) throw erro(400, 'Nada para atualizar.');

    valores.push(req.cuidador.id);
    await pool.query(`UPDATE cuidadores SET ${campos.join(', ')} WHERE id = ?`, valores);
    const [[atual]] = await pool.query('SELECT * FROM cuidadores WHERE id = ?', [req.cuidador.id]);
    res.json({ cuidador: publico(atual) });
  } catch (e) { next(e); }
});

app.post('/api/logout', autenticar, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sessoes WHERE token = ?', [req.token]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---- pochetes ---- */
app.get('/api/pochetes', autenticar, async (req, res, next) => {
  try {
    const [linhas] = await pool.query('SELECT * FROM pochetes WHERE cuidador_id = ? ORDER BY id', [req.cuidador.id]);
    res.json({ pochetes: linhas.map(pochetePublica) });
  } catch (e) { next(e); }
});

function lerCasa(casa) {
  if (casa === null) return { lat: null, lng: null, nome: null };
  if (casa === undefined) return undefined;
  const c = validarCoordenada(casa.lat, casa.lng);
  if (!c) throw erro(400, 'O endereço de casa precisa de latitude e longitude válidas.');
  return { ...c, nome: String(casa.nome || 'Casa').slice(0, 200) };
}

app.post('/api/pochetes', autenticar, async (req, res, next) => {
  try {
    const nome = limparNome(req.body?.nome_idoso);
    if (nome.length < 2) throw erro(400, 'Digite o nome de quem vai usar a pochete.');
    const casa = lerCasa(req.body?.casa) || { lat: null, lng: null, nome: null };
    const { chave, hash } = novaChavePochete();
    const [r] = await pool.query(
      'INSERT INTO pochetes (cuidador_id, nome_idoso, telefone_idoso, chave_hash, casa_lat, casa_lng, casa_nome) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.cuidador.id, nome, limparTelefone(req.body?.telefone_idoso), hash, casa.lat, casa.lng, casa.nome]);
    const [[p]] = await pool.query('SELECT * FROM pochetes WHERE id = ?', [r.insertId]);
    res.status(201).json({ pochete: pochetePublica(p), chave });
  } catch (e) { next(e); }
});

app.post('/api/pochetes/:id/chave', autenticar, async (req, res, next) => {
  try {
    const p = await pocheteDoCuidador(req);
    const { chave, hash } = novaChavePochete();
    await pool.query('UPDATE pochetes SET chave_hash = ? WHERE id = ?', [hash, p.id]);
    res.json({ chave });
  } catch (e) { next(e); }
});

app.patch('/api/pochetes/:id', autenticar, async (req, res, next) => {
  try {
    const p = await pocheteDoCuidador(req);
    const campos = [], valores = [];
    if (req.body?.nome_idoso !== undefined) {
      const nome = limparNome(req.body.nome_idoso);
      if (nome.length < 2) throw erro(400, 'Digite o nome de quem vai usar a pochete.');
      campos.push('nome_idoso = ?'); valores.push(nome);
    }
    if (req.body?.telefone_idoso !== undefined) { campos.push('telefone_idoso = ?'); valores.push(limparTelefone(req.body.telefone_idoso)); }
    const casa = lerCasa(req.body?.casa);
    if (casa) { campos.push('casa_lat = ?', 'casa_lng = ?', 'casa_nome = ?'); valores.push(casa.lat, casa.lng, casa.nome); }
    if (!campos.length) throw erro(400, 'Nada para atualizar.');
    valores.push(p.id);
    await pool.query(`UPDATE pochetes SET ${campos.join(', ')} WHERE id = ?`, valores);
    const [[atual]] = await pool.query('SELECT * FROM pochetes WHERE id = ?', [p.id]);
    res.json({ pochete: pochetePublica(atual) });
  } catch (e) { next(e); }
});

app.delete('/api/pochetes/:id', autenticar, async (req, res, next) => {
  try {
    const p = await pocheteDoCuidador(req);
    await pool.query('DELETE FROM pochetes WHERE id = ?', [p.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Simula um botão da pochete a partir do painel (mesmo caminho do dispositivo)
app.post('/api/pochetes/:id/simular', autenticar, async (req, res, next) => {
  try {
    const p = await pocheteDoCuidador(req);
    const tipo = String(req.body?.tipo || '');
    if (!['emergencia', 'transporte', 'bateria', 'localizacao', 'teste'].includes(tipo)) throw erro(400, 'Tipo inválido.');
    res.status(201).json(await tratarEvento(p, req.cuidador, tipo, req.body, 'painel'));
  } catch (e) { next(e); }
});

/* ---- a pochete fala com o servidor ---- */
app.post('/api/pochete/evento', autenticarPochete, async (req, res, next) => {
  try {
    const tipo = String(req.body?.tipo || '');
    if (!['emergencia', 'transporte', 'bateria', 'localizacao', 'teste'].includes(tipo)) throw erro(400, 'Tipo inválido. Use emergencia, transporte, bateria, localizacao ou teste.');
    res.status(201).json(await tratarEvento(req.pochete, req.cuidador, tipo, req.body, 'pochete'));
  } catch (e) { next(e); }
});

app.get('/api/pochete/estado', autenticarPochete, async (req, res, next) => {
  try {
    await pool.query('UPDATE pochetes SET ultimo_contato = NOW() WHERE id = ?', [req.pochete.id]);
    const [linhas] = await pool.query('SELECT * FROM corridas WHERE pochete_id = ? AND status IN (?) ORDER BY id DESC LIMIT 1', [req.pochete.id, STATUS_ATIVOS]);
    const corrida = linhas[0] ? await sincronizarCorrida(linhas[0], req.cuidador.id) : null;
    res.json({ pochete: pochetePublica(req.pochete), cuidador: req.cuidador.nome, corrida: corrida ? corridaPublica(corrida) : null });
  } catch (e) { next(e); }
});

/* ---- eventos ---- */
app.get('/api/eventos', autenticar, async (req, res, next) => {
  try {
    const limite = Math.min(100, Math.max(1, Number(req.query.limite) || 20));
    const [linhas] = await pool.query(
      `SELECT e.*, p.nome_idoso FROM eventos e JOIN pochetes p ON p.id = e.pochete_id
       WHERE p.cuidador_id = ? ORDER BY e.id DESC LIMIT ${limite}`, [req.cuidador.id]);
    res.json({ eventos: linhas.map(e => ({ id: e.id, pochete_id: e.pochete_id, nome_idoso: e.nome_idoso, tipo: e.tipo, dados: typeof e.dados === 'string' ? JSON.parse(e.dados) : e.dados, criado_em: e.criado_em })) });
  } catch (e) { next(e); }
});

// EventSource não manda cabeçalhos: o token vem na query
app.get('/api/eventos/stream', async (req, res, next) => {
  try {
    const cuidador = await carregarPorToken(String(req.query.token || ''));
    if (NA_VERCEL) throw erro(501, 'O stream em tempo real não funciona em serverless. Use GET /api/eventos e /api/corridas para consultar.');
    sse.assinar(cuidador.id, res);
  } catch (e) { next(e); }
});

/* ---- corridas ---- */
app.get('/api/corridas', autenticar, async (req, res, next) => {
  try {
    const [linhas] = await pool.query(
      `SELECT c.* FROM corridas c JOIN pochetes p ON p.id = c.pochete_id WHERE p.cuidador_id = ? ORDER BY c.id DESC LIMIT 50`, [req.cuidador.id]);
    const corridas = [];
    for (const c of linhas) corridas.push(corridaPublica(await sincronizarCorrida(c, req.cuidador.id)));
    res.json({ corridas });
  } catch (e) { next(e); }
});

app.get('/api/corridas/:id', autenticar, async (req, res, next) => {
  try { res.json({ corrida: corridaPublica(await sincronizarCorrida(await corridaDoCuidador(req), req.cuidador.id)) }); } catch (e) { next(e); }
});

app.post('/api/corridas/:id/aprovar', autenticar, async (req, res, next) => {
  try {
    const c = await corridaDoCuidador(req);
    if (c.status !== 'pendente') throw erro(409, 'Essa corrida não está mais esperando aprovação.');
    const [[p]] = await pool.query('SELECT * FROM pochetes WHERE id = ?', [c.pochete_id]);
    const origem = { lat: Number(c.origem_lat), lng: Number(c.origem_lng) };
    const destino = { lat: Number(c.destino_lat), lng: Number(c.destino_lng), nome: c.destino_nome };

    await pool.query('UPDATE corridas SET status = "aprovada" WHERE id = ?', [c.id]);
    try {
      const estimativa = await uber.estimar(origem, destino);
      const pedido = await uber.solicitar({
        idoso: { nome: p.nome_idoso, telefone: p.telefone_idoso || req.cuidador.telefone || '+5500000000000' },
        origem, destino, estimativa,
      });
      await pool.query('UPDATE corridas SET status = ?, uber_request_id = ?, produto = ?, valor = ?, eta_min = ?, solicitada_em = NOW() WHERE id = ?',
        [pedido.status, pedido.request_id, estimativa.nome, estimativa.valor, pedido.eta_min ?? estimativa.eta_min, c.id]);
      await telegram.enviar(req.cuidador.telegram_chat_id, `✅ Corrida aprovada para ${p.nome_idoso}: ${estimativa.nome}, ${estimativa.valor || 'valor a confirmar'}. Chega em ~${pedido.eta_min ?? estimativa.eta_min ?? '?'} min.`);
    } catch (e) {
      await pool.query('UPDATE corridas SET status = "erro", erro = ? WHERE id = ?', [String(e.message).slice(0, 200), c.id]);
      const [[falha]] = await pool.query('SELECT * FROM corridas WHERE id = ?', [c.id]);
      sse.publicar(req.cuidador.id, 'corrida', { corrida: corridaPublica(falha) });
      throw erro(e.status || 502, `Não consegui chamar o carro: ${e.message}`);
    }
    const [[atual]] = await pool.query('SELECT * FROM corridas WHERE id = ?', [c.id]);
    sse.publicar(req.cuidador.id, 'corrida', { corrida: corridaPublica(atual) });
    res.json({ corrida: corridaPublica(atual) });
  } catch (e) { next(e); }
});

app.post('/api/corridas/:id/recusar', autenticar, async (req, res, next) => {
  try {
    const c = await corridaDoCuidador(req);
    if (c.status !== 'pendente') throw erro(409, 'Essa corrida não está mais esperando aprovação.');
    await pool.query('UPDATE corridas SET status = "recusada" WHERE id = ?', [c.id]);
    const [[atual]] = await pool.query('SELECT * FROM corridas WHERE id = ?', [c.id]);
    sse.publicar(req.cuidador.id, 'corrida', { corrida: corridaPublica(atual) });
    res.json({ corrida: corridaPublica(atual) });
  } catch (e) { next(e); }
});

app.post('/api/corridas/:id/cancelar', autenticar, async (req, res, next) => {
  try {
    const c = await corridaDoCuidador(req);
    if (!['aprovada', 'solicitada', 'a_caminho'].includes(c.status)) throw erro(409, 'Essa corrida não pode mais ser cancelada.');
    if (c.uber_request_id) await uber.cancelar(c.uber_request_id);
    await pool.query('UPDATE corridas SET status = "cancelada" WHERE id = ?', [c.id]);
    const [[atual]] = await pool.query('SELECT * FROM corridas WHERE id = ?', [c.id]);
    sse.publicar(req.cuidador.id, 'corrida', { corrida: corridaPublica(atual) });
    res.json({ corrida: corridaPublica(atual) });
  } catch (e) { next(e); }
});

/* ---- telegram ---- */
app.post('/api/telegram/codigo', autenticar, async (req, res, next) => {
  try {
    let codigo = req.cuidador.telegram_codigo;
    if (!codigo) {
      codigo = crypto.randomBytes(3).toString('hex').toUpperCase();
      await pool.query('UPDATE cuidadores SET telegram_codigo = ? WHERE id = ?', [codigo, req.cuidador.id]);
    }
    res.json({ codigo, bot: telegram.botUsername, simulado: telegram.simulado, vinculado: Boolean(req.cuidador.telegram_chat_id) });
  } catch (e) { next(e); }
});

// No modo simulado não há bot para receber o /start: o painel vincula direto
app.post('/api/telegram/vincular', autenticar, async (req, res, next) => {
  try {
    if (!telegram.simulado) throw erro(400, 'Com o bot ativo, vincule mandando /start CÓDIGO para ele no Telegram.');
    const chatId = String(req.body?.chat_id || '').trim();
    if (!/^-?\d{3,20}$/.test(chatId)) throw erro(400, 'Informe o chat_id numérico do Telegram.');
    await pool.query('UPDATE cuidadores SET telegram_chat_id = ?, telegram_codigo = NULL WHERE id = ?', [chatId, req.cuidador.id]);
    res.json({ ok: true, vinculado: true });
  } catch (e) { next(e); }
});

app.delete('/api/telegram', autenticar, async (req, res, next) => {
  try {
    await pool.query('UPDATE cuidadores SET telegram_chat_id = NULL, telegram_codigo = NULL WHERE id = ?', [req.cuidador.id]);
    res.json({ ok: true, vinculado: false });
  } catch (e) { next(e); }
});

app.post('/api/telegram/teste', autenticar, async (req, res, next) => {
  try {
    if (!req.cuidador.telegram_chat_id) throw erro(400, 'Vincule o Telegram primeiro.');
    const ok = await telegram.enviar(req.cuidador.telegram_chat_id, `👋 Olá, ${req.cuidador.nome.split(' ')[0]}! Os avisos da ELO vão chegar aqui.`);
    if (!ok) throw erro(502, 'O Telegram não aceitou a mensagem. Confira o token do bot.');
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---- 404 e erros ---- */
app.use((req, res) => res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.path}` }));

app.use((e, _req, res, _next) => {
  if (e instanceof TypeError && !pool) return res.status(503).json({ erro: 'O banco de dados não está configurado neste servidor.' });
  if (e.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Envie um JSON válido.' });
  if (e.type === 'entity.too.large') return res.status(413).json({ erro: 'Pedido grande demais.' });
  if (e.status) return res.status(e.status).json({ erro: e.message });
  if (e.code && /^(ER_|ECONNREFUSED|PROTOCOL_)/.test(e.code)) {
    console.error('[banco]', e.code, e.message);
    return res.status(503).json({ erro: 'O banco de dados está indisponível. Tente de novo em instantes.' });
  }
  console.error(e);
  res.status(500).json({ erro: 'Algo deu errado do nosso lado.' });
});

/* ------------------------------------------------------------------------
   Sobe
   ------------------------------------------------------------------------ */
try {
  await garantirBanco();
} catch (e) {
  console.error('Não consegui conectar ao MySQL:', e.code || '', e.message);
  console.error('Confira DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no backend/.env e se o MySQL está rodando.');
  if (!NA_VERCEL) process.exit(1);
  // na Vercel o app segue no ar: cada pedido tenta conectar de novo e a rota / mostra o erro
}

// Tarefas contínuas: só onde existe um processo de verdade (não na Vercel)
if (!NA_VERCEL) {
  setInterval(() => pool?.query('DELETE FROM sessoes WHERE expira_em < NOW()').catch(() => {}), 60 * 60 * 1000).unref();

  // corridas ativas: sincroniza com a Uber a cada 10 s para o painel ver o status mudar
  setInterval(async () => {
    if (!pool) return;
    try {
      const [ativas] = await pool.query(
        `SELECT c.*, p.cuidador_id FROM corridas c JOIN pochetes p ON p.id = c.pochete_id
         WHERE c.status IN ('solicitada', 'a_caminho', 'em_andamento') AND c.uber_request_id IS NOT NULL`);
      for (const c of ativas) await sincronizarCorrida(c, c.cuidador_id);
    } catch (e) { console.error('[sincronizar corridas]', e.message); }
  }, 10_000).unref();

  // Telegram: quem manda "/start CÓDIGO" para o bot fica vinculado
  if (pool) telegram.iniciarPolling(async (codigo, chat) => {
    const [linhas] = await pool.query('SELECT id, nome FROM cuidadores WHERE telegram_codigo = ?', [codigo]);
    if (!linhas.length) return null;
    await pool.query('UPDATE cuidadores SET telegram_chat_id = ?, telegram_codigo = NULL WHERE id = ?', [chat.id, linhas[0].id]);
    sse.publicar(linhas[0].id, 'telegram', { vinculado: true, chat: chat.nome });
    return `Pronto, ${linhas[0].nome.split(' ')[0]}! Os avisos da pochete vão chegar aqui.`;
  });

  app.listen(CONFIG.porta, () => {
    console.log(`ELO backend em http://localhost:${CONFIG.porta}  (rotas em /api, resumo em /)`);
    console.log(`  MySQL: ${CONFIG.banco.user}@${CONFIG.banco.host}/${CONFIG.banco.database}`);
    console.log(`  Uber: ${uber.simulado ? 'SIMULADO (defina UBER_CLIENT_ID e UBER_CLIENT_SECRET)' : 'real' + (process.env.UBER_SANDBOX === '1' ? ' (sandbox)' : '')}`);
    console.log(`  Telegram: ${telegram.simulado ? 'SIMULADO (defina TELEGRAM_BOT_TOKEN)' : 'bot @' + telegram.botUsername}`);
  });
}

// Vercel (backend/api/index.js) importa o app daqui
export default app;
