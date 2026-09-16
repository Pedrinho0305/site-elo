// Vercel: entrega o app Express como função serverless.
// vercel.json manda todas as rotas para cá; o app vive em ../server.js.
import app from '../server.js';
export default app;
