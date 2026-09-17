// Vercel: o backend (Express, em ../backend/server.js) como função serverless.
// O vercel.json da raiz manda /api e /api/* (menos /api/eloa/*) para cá; o
// Express recebe o caminho original (/api/login, /api/me...).
// As dependências vêm do package.json da raiz (workspace "backend").
import app from '../backend/server.js';
export default app;
