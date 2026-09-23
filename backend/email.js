/* ==========================================================================
   ELO · E-mail
   ---------------------------------------------------------------------------
   Leva para a caixa de entrada da empresa o que chega pelos formulários do
   site: "Entre em contato" (Quem Somos) e "Quero uma ELO" (Produto).

   Provedores (a primeira chave encontrada define; EMAIL_PROVEDOR força):
     gmail    SMTP do próprio Gmail da empresa (smtp.gmail.com:465, nodemailer).
              É o caminho curto quando o EMAIL_EMPRESA já é um Gmail: não cria
              conta em serviço nenhum. Precisa de uma SENHA DE APP (a senha
              normal não serve): ative a verificação em duas etapas na conta e
              gere em myaccount.google.com/apppasswords — são 16 letras, que
              vão em GMAIL_APP_PASSWORD. Limite de ~500 e-mails por dia.
     brevo    POST https://api.brevo.com/v3/smtp/email   (cabeçalho api-key)
              GRATUITO, 300 e-mails/dia, sem domínio próprio: basta verificar
              o endereço remetente em Senders & IP. Chave em brevo.com.
     resend   POST https://api.resend.com/emails         (Bearer)
              Gratuito (3.000/mês), mas só manda de um domínio verificado.

   Variáveis (painel da Vercel ou backend/.env):
     EMAIL_EMPRESA        para onde vão as mensagens (obrigatório)
     GMAIL_APP_PASSWORD   ou BREVO_API_KEY ou RESEND_API_KEY
     EMAIL_REMETENTE      de quem sai o e-mail (padrão: o próprio
                          EMAIL_EMPRESA; no Gmail é a conta que autentica,
                          no Brevo precisa ser um remetente verificado)
     EMAIL_COPIA=0        desliga a confirmação para quem preencheu o formulário

   Sem chave ou sem EMAIL_EMPRESA o módulo fica em MODO SIMULAÇÃO: o e-mail
   aparece no console e a mensagem continua salva no banco — igual ao que a
   Uber e o Telegram fazem sem credencial. Nunca derruba quem chamou: erro
   vira { ok: false, erro } com log.
   ========================================================================== */

const CHAVES = [
  ['gmail', process.env.GMAIL_APP_PASSWORD],
  ['brevo', process.env.BREVO_API_KEY],
  ['resend', process.env.RESEND_API_KEY],
];

export const empresa = (process.env.EMAIL_EMPRESA || '').trim();
export const nomeEmpresa = process.env.EMAIL_NOME || 'ELO';
export const copiaParaQuemEscreveu = process.env.EMAIL_COPIA !== '0';

const forcado = (process.env.EMAIL_PROVEDOR || '').trim().toLowerCase();
const escolhido = forcado
  ? CHAVES.find(([nome]) => nome === forcado)
  : CHAVES.find(([, chave]) => chave);

export const provedor = escolhido?.[1] ? escolhido[0] : null;
// A senha de app do Google vem com espaços na tela ("abcd efgh ijkl mnop");
// o SMTP quer as 16 letras coladas.
const chave = (escolhido?.[1] || '').trim().replace(/\s+/g, '');

export const remetente = (process.env.EMAIL_REMETENTE || empresa).trim();
export const simulado = !provedor || !empresa || !remetente;

/* Por que está simulado — vai para a página do backend e para o log */
export const motivo = provedor && empresa && remetente
  ? null
  : !empresa ? 'falta EMAIL_EMPRESA (para onde mandar)'
  : !provedor ? 'falta GMAIL_APP_PASSWORD (ou BREVO_API_KEY / RESEND_API_KEY)'
  : 'falta EMAIL_REMETENTE';

const TEMPO_LIMITE = 10_000;

/* --------------------------------------------------------------------------
   enviar({ para, assunto, texto, html, responderPara, nomeResponder })
   → { ok: true, id } | { ok: false, erro }
   -------------------------------------------------------------------------- */
export async function enviar({ para, assunto, texto, html, responderPara, nomeResponder } = {}) {
  const destino = (para || empresa).trim();
  if (!destino) return { ok: false, erro: 'sem destinatário' };

  if (simulado) {
    console.log(`\n[e-mail simulado → ${destino}] ${assunto}\n${texto}\n(${motivo}; a mensagem foi salva no banco)`);
    return { ok: true, id: null, simulado: true };
  }

  try {
    const envios = { gmail: porGmail, brevo: porBrevo, resend: porResend };
    const id = await envios[provedor](destino, assunto, texto, html, responderPara, nomeResponder);
    return { ok: true, id };
  } catch (e) {
    console.error('[e-mail]', provedor, e.message);
    return { ok: false, erro: e.message };
  }
}

/* --------------------------------------------------------------------------
   Gmail: SMTP autenticado com a senha de app (nodemailer)
   -------------------------------------------------------------------------- */
let transporte = null;

async function porGmail(para, assunto, texto, html, responderPara, nomeResponder) {
  if (!transporte) {
    const { default: nodemailer } = await import('nodemailer');
    // O padrão é o Gmail; EMAIL_SMTP_HOST/PORTA apontam para outro servidor
    // (o da escola, por exemplo) sem mudar código.
    const porta = Number(process.env.EMAIL_SMTP_PORTA) || 465;
    transporte = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
      port: porta,
      secure: porta === 465,
      auth: { user: remetente, pass: chave },
      connectionTimeout: TEMPO_LIMITE,
      greetingTimeout: TEMPO_LIMITE,
      socketTimeout: TEMPO_LIMITE,
    });
  }

  const info = await transporte.sendMail({
    from: { name: nomeEmpresa, address: remetente },
    to: para,
    subject: assunto,
    text: texto,
    html: html || undefined,
    replyTo: responderPara ? { name: nomeResponder || responderPara, address: responderPara } : undefined,
  });
  return info.messageId || null;
}

async function pedir(url, cabecalhos, corpo) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...cabecalhos },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(TEMPO_LIMITE),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.message || dados.error?.message || `o provedor respondeu ${r.status}`);
  return dados;
}

async function porBrevo(para, assunto, texto, html, responderPara, nomeResponder) {
  const dados = await pedir('https://api.brevo.com/v3/smtp/email', { 'api-key': chave }, {
    sender: { email: remetente, name: nomeEmpresa },
    to: [{ email: para }],
    subject: assunto,
    textContent: texto,
    htmlContent: html || undefined,
    replyTo: responderPara ? { email: responderPara, name: nomeResponder || undefined } : undefined,
  });
  return dados.messageId || null;
}

async function porResend(para, assunto, texto, html, responderPara) {
  const dados = await pedir('https://api.resend.com/emails', { authorization: `Bearer ${chave}` }, {
    from: `${nomeEmpresa} <${remetente}>`,
    to: [para],
    subject: assunto,
    text: texto,
    html: html || undefined,
    reply_to: responderPara || undefined,
  });
  return dados.id || null;
}

/* --------------------------------------------------------------------------
   Os dois e-mails de uma mensagem do site
   -------------------------------------------------------------------------- */
const escapar = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const quebrar = t => escapar(t).replace(/\n/g, '<br>');

/* Moldura simples, com o azul-marinho da marca no topo. E-mail não é página:
   nada de CSS externo nem de variáveis — só HTML com estilo embutido. */
function moldura(titulo, linhas, rodape) {
  const corpo = linhas.map(([rotulo, valor]) => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #e3e8f5;color:#5b6688;font-size:13px;width:150px;vertical-align:top">${escapar(rotulo)}</td>
      <td style="padding:10px 0;border-top:1px solid #e3e8f5;color:#0d1533;font-size:15px">${valor}</td>
    </tr>`).join('');

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#eef3fb;font-family:'Segoe UI',system-ui,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fb;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px -28px rgba(6,11,28,.55)">
        <tr><td style="background:linear-gradient(160deg,#122051,#08122f);padding:22px 28px;color:#eef2ff">
          <div style="font-size:13px;letter-spacing:.14em;color:#8fd7ea">ELO</div>
          <div style="font-size:20px;font-weight:700;margin-top:4px">${escapar(titulo)}</div>
        </td></tr>
        <tr><td style="padding:8px 28px 22px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${corpo}</table>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #e3e8f5;color:#7b86a8;font-size:12.5px">${rodape}</td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

/* Para a empresa: tudo o que a pessoa preencheu, com Responder já apontando
   para o e-mail dela. */
export function emailParaEmpresa(m) {
  const pedido = m.tipo === 'pedido';
  const assunto = `${pedido ? '🛒 Pedido' : '✉️ Contato'} · ${m.assunto} · ${m.nome} [${m.protocolo}]`;

  const campos = [
    ['Nome', m.nome],
    ['E-mail', m.email],
    m.telefone ? ['Telefone', m.telefone] : null,
    ['Assunto', m.assunto],
    pedido && m.detalhes?.quantidade ? ['Quantidade', `${m.detalhes.quantidade} pochete(s)`] : null,
    pedido && m.detalhes?.pagamento ? ['Pagamento', m.detalhes.pagamento] : null,
    pedido && m.detalhes?.cidade ? ['Cidade / UF', m.detalhes.cidade] : null,
    m.mensagem ? [pedido ? 'Observações' : 'Mensagem', m.mensagem] : null,
    ['Protocolo', m.protocolo],
    ['Conta no site', m.cuidador || 'não estava logado'],
    ['Recebido em', m.em],
  ].filter(Boolean);

  const texto = campos.map(([r, v]) => `${r}: ${v}`).join('\n')
    + `\n\nResponda este e-mail para falar direto com ${m.nome.split(' ')[0]}.`;

  const html = moldura(
    pedido ? 'Novo pedido pelo site' : 'Nova mensagem pelo site',
    campos.map(([r, v]) => [r, quebrar(v)]),
    `Chegou pelo formulário de ${pedido ? '<b>Produto</b>' : '<b>Quem Somos</b>'}. Basta responder este e-mail: a resposta vai para ${escapar(m.email)}.`);

  return { assunto, texto, html };
}

/* Para quem escreveu: confirmação com o protocolo. */
export function emailDeConfirmacao(m) {
  const pedido = m.tipo === 'pedido';
  const primeiroNome = m.nome.split(' ')[0];
  const assunto = pedido ? `Recebemos seu pedido, ${primeiroNome} [${m.protocolo}]` : `Recebemos sua mensagem, ${primeiroNome} [${m.protocolo}]`;

  const abertura = pedido
    ? `Obrigado, ${primeiroNome}! Seu pedido chegou até a equipe que desenvolveu a ELO. Vamos responder com as formas de pagamento e o prazo de entrega em até 2 dias úteis.`
    : `Obrigado, ${primeiroNome}! Sua mensagem chegou até a equipe que desenvolveu a ELO. Respondemos em até 2 dias úteis, neste mesmo e-mail.`;

  const campos = [
    ['Protocolo', m.protocolo],
    ['Assunto', m.assunto],
    pedido && m.detalhes?.quantidade ? ['Quantidade', `${m.detalhes.quantidade} pochete(s)`] : null,
    pedido && m.detalhes?.pagamento ? ['Pagamento', m.detalhes.pagamento] : null,
    m.mensagem ? [pedido ? 'Observações' : 'Sua mensagem', m.mensagem] : null,
  ].filter(Boolean);

  const texto = `${abertura}\n\n${campos.map(([r, v]) => `${r}: ${v}`).join('\n')}\n\nEquipe ELO`;
  const html = moldura(abertura, campos.map(([r, v]) => [r, quebrar(v)]),
    'Você recebeu este e-mail porque preencheu um formulário no site da ELO. Se não foi você, é só ignorar.');

  return { assunto, texto, html };
}
