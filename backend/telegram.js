/* ==========================================================================
   ELO · Telegram
   ---------------------------------------------------------------------------
   Avisa o cuidador no Telegram quando a pochete aperta um botão. Usa a Bot
   API (https://core.telegram.org/bots/api):

     enviar    POST https://api.telegram.org/bot<TOKEN>/sendMessage
     receber   GET  https://api.telegram.org/bot<TOKEN>/getUpdates   (long polling)

   Como o cuidador se vincula: no painel ele pega um código, abre o bot no
   Telegram e manda "/start CÓDIGO". O polling recebe a mensagem, casa o
   código com a conta e guarda o chat_id. Não precisa de URL pública.

   Sem TELEGRAM_BOT_TOKEN, o módulo funciona em MODO SIMULAÇÃO: as mensagens
   vão para o console e o vínculo é feito direto pelo painel.

   Para criar um bot: fale com @BotFather no Telegram, /newbot, e copie o
   token para TELEGRAM_BOT_TOKEN. O nome de usuário vai em TELEGRAM_BOT_USERNAME.
   ========================================================================== */
const token = process.env.TELEGRAM_BOT_TOKEN || '';
export const simulado = !token;
export const botUsername = process.env.TELEGRAM_BOT_USERNAME || (simulado ? 'elo_bot_simulado' : '');

const API = `https://api.telegram.org/bot${token}`;

async function api(metodo, corpo) {
  const r = await fetch(`${API}/${metodo}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!dados.ok) throw Object.assign(new Error(dados.description || `Telegram respondeu ${r.status}`), { status: 502 });
  return dados.result;
}

/* Envia uma mensagem. Nunca derruba quem chamou: erro vira false + log. */
export async function enviar(chatId, texto) {
  if (!chatId) return false;
  if (simulado) {
    console.log(`[telegram simulado → ${chatId}] ${texto.replace(/\n/g, ' ⏎ ')}`);
    return true;
  }
  try {
    await api('sendMessage', { chat_id: chatId, text: texto, parse_mode: 'HTML', disable_web_page_preview: true });
    return true;
  } catch (e) {
    console.error('[telegram]', e.message);
    return false;
  }
}

/* ------------------------------------------------------------------------
   Polling: fica esperando mensagens novas e chama aoStart(codigo, chat)
   quando alguém manda "/start CÓDIGO". O retorno de aoStart é a resposta
   enviada de volta (ou null para responder o padrão).
   ------------------------------------------------------------------------ */
let offset = 0;
let rodando = false;

export function iniciarPolling(aoStart) {
  if (simulado || rodando) return;
  rodando = true;

  (async function loop() {
    while (rodando) {
      try {
        const updates = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
        for (const u of updates) {
          offset = u.update_id + 1;
          const msg = u.message;
          if (!msg?.text) continue;
          const m = msg.text.trim().match(/^\/start(?:@\w+)?\s+([A-Za-z0-9-]{4,16})$/i);
          const chat = { id: String(msg.chat.id), nome: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') };
          if (m) {
            const resposta = await aoStart(m[1].toUpperCase(), chat);
            await enviar(chat.id, resposta || 'Não encontrei esse código. Pegue um novo no painel da ELO e mande /start CÓDIGO.');
          } else {
            await enviar(chat.id, 'Oi! Eu sou o bot da ELO. Para receber os avisos da pochete, pegue o código no painel e mande: /start CÓDIGO');
          }
        }
      } catch (e) {
        console.error('[telegram polling]', e.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  })();
}

export function pararPolling() { rodando = false; }
