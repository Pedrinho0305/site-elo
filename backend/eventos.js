/* ==========================================================================
   ELO · Eventos em tempo real (Server-Sent Events)
   ---------------------------------------------------------------------------
   O painel abre GET /api/eventos/stream e fica ouvindo. Quando a pochete
   aperta um botão, o servidor publica aqui e a mensagem chega ao navegador
   na hora — sem WebSocket, sem dependência: é HTTP puro que não fecha.

   assinar(cuidadorId, res)         prende a resposta HTTP como um canal
   publicar(cuidadorId, tipo, dados) manda { tipo, dados, em } para todos os
                                     canais daquele cuidador
   ========================================================================== */
const canais = new Map(); // cuidadorId → Set<res>

export function assinar(cuidadorId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: pronto\ndata: ${JSON.stringify({ em: new Date().toISOString() })}\n\n`);

  if (!canais.has(cuidadorId)) canais.set(cuidadorId, new Set());
  canais.get(cuidadorId).add(res);

  // pulso a cada 25 s para proxies não fecharem a conexão
  const pulso = setInterval(() => res.write(': pulso\n\n'), 25_000);

  res.on('close', () => {
    clearInterval(pulso);
    canais.get(cuidadorId)?.delete(res);
  });
}

export function publicar(cuidadorId, tipo, dados) {
  const conjunto = canais.get(cuidadorId);
  if (!conjunto?.size) return 0;
  const corpo = `event: ${tipo}\ndata: ${JSON.stringify({ tipo, dados, em: new Date().toISOString() })}\n\n`;
  for (const res of conjunto) res.write(corpo);
  return conjunto.size;
}

export function conectados(cuidadorId) {
  return canais.get(cuidadorId)?.size || 0;
}
