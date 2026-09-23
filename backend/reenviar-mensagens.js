/* ==========================================================================
   ELO · Reenviar mensagens do site
   ---------------------------------------------------------------------------
   As mensagens dos formulários ficam sempre salvas na tabela `mensagens`,
   mesmo quando o e-mail não sai (chave ausente, chave errada, provedor fora).
   A coluna `email_status` guarda o que aconteceu: `enviado`, `simulado` ou
   `falhou: …`. Este script pega o que não foi enviado e manda de novo.

   Rodar (de dentro de backend/):
     node --env-file-if-exists=.env reenviar-mensagens.js          tudo que falta
     node --env-file-if-exists=.env reenviar-mensagens.js 7        só a mensagem 7
     node --env-file-if-exists=.env reenviar-mensagens.js --tudo   inclusive as já enviadas

   Precisa das mesmas variáveis do servidor (DB_* e a chave de e-mail).
   ========================================================================== */
import mysql from 'mysql2/promise';
import * as correio from './email.js';

const argumento = process.argv[2];
const todas = argumento === '--tudo';
const soEsta = /^\d+$/.test(argumento || '') ? Number(argumento) : null;

if (correio.simulado) {
  console.error(`O e-mail está em modo simulado (${correio.motivo}).`);
  console.error('Preencha GMAIL_APP_PASSWORD (ou BREVO_API_KEY) no backend/.env e rode de novo.');
  process.exit(1);
}

const banco = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alunos_elo',
  timezone: 'Z',
  connectTimeout: 10_000,
});

const condicao = soEsta ? 'WHERE id = ?' : todas ? '' : "WHERE email_status <> 'enviado'";
const [linhas] = await banco.query(`SELECT * FROM mensagens ${condicao} ORDER BY id`, soEsta ? [soEsta] : []);

if (!linhas.length) {
  console.log('Nada para reenviar: todas as mensagens já foram entregues.');
  await banco.end();
  process.exit(0);
}

console.log(`Reenviando ${linhas.length} mensagem(ns) por ${correio.provedor} para ${correio.empresa}:\n`);

for (const m of linhas) {
  const dados = {
    tipo: m.tipo,
    nome: m.nome,
    email: m.email,
    telefone: m.telefone,
    assunto: m.assunto,
    mensagem: m.mensagem,
    detalhes: typeof m.detalhes === 'string' ? JSON.parse(m.detalhes) : m.detalhes,
    protocolo: 'ELO-' + String(m.id).padStart(4, '0'),
    cuidador: m.cuidador_id ? `conta #${m.cuidador_id}` : null,
    em: new Date(m.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  };

  const email = correio.emailParaEmpresa(dados);
  const envio = await correio.enviar({
    para: correio.empresa,
    assunto: email.assunto,
    texto: email.texto,
    html: email.html,
    responderPara: m.email,
    nomeResponder: m.nome,
  });

  const status = envio.ok ? 'enviado' : 'falhou: ' + String(envio.erro).slice(0, 100);
  await banco.query('UPDATE mensagens SET email_status = ? WHERE id = ?', [status, m.id]);
  console.log(`  ${envio.ok ? '✓' : '✗'} ${dados.protocolo} · ${m.tipo} · ${m.nome} → ${status}`);
}

console.log('\nPronto. Confira a caixa de entrada de ' + correio.empresa + '.');
await banco.end();
