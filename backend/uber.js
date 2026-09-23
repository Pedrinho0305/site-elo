/* ==========================================================================
   ELO · Uber (Guest Rides API)
   ---------------------------------------------------------------------------
   Chama um carro para a pessoa idosa. Usa a Guest Rides API da Uber, que
   permite pedir corridas para um "convidado" (quem não tem o app) a partir
   de uma conta empresarial:

     token     POST https://auth.uber.com/oauth/v2/token   (client_credentials, scope guests.trips)
     estimar   POST https://api.uber.com/v1/guests/trips/estimates
     pedir     POST https://api.uber.com/v1/guests/trips
     consultar GET  https://api.uber.com/v1/guests/trips/{request_id}
     cancelar  DELETE https://api.uber.com/v1/guests/trips/{request_id}

   Essa API exige uma conta Uber for Business aprovada pela Uber
   (developer.uber.com → Guest Rides). Sem credenciais (UBER_CLIENT_ID /
   UBER_CLIENT_SECRET) — ou com credenciais que a Uber aceita mas sem o
   escopo `guests.trips` liberado, que é o caso mais comum — este módulo
   funciona em MODO SIMULAÇÃO: devolve corridas fictícias que avançam de
   status com o tempo, para o painel e a pochete serem testados de ponta a
   ponta. Quem decide é `disponivel()`, que pede um token de verdade.

   Variáveis:
     UBER_CLIENT_ID, UBER_CLIENT_SECRET   credenciais do app
     UBER_SANDBOX=1                       usa o sandbox da Uber (cabeçalho x-uber-sandbox-runuuid)
     UBER_ORG_UUID                        organização (apps de terceiros)
   ========================================================================== */
import crypto from 'node:crypto';

const AUTH_URL = 'https://auth.uber.com/oauth/v2/token';
const API_URL = 'https://api.uber.com/v1';

const config = {
  clientId: process.env.UBER_CLIENT_ID || '',
  clientSecret: process.env.UBER_CLIENT_SECRET || '',
  sandbox: process.env.UBER_SANDBOX === '1',
  orgUuid: process.env.UBER_ORG_UUID || '',
};

export const simulado = !(config.clientId && config.clientSecret);

/* ------------------------------------------------------------------------
   Ter credencial não é o mesmo que ter acesso
   ---------------------------------------------------------------------------
   A Guest Rides é um produto que a Uber libera caso a caso: dá para ter uma
   app criada, com client_id e client_secret corretos, e mesmo assim o pedido
   de token voltar `invalid_scope` porque `guests.trips` não foi aprovado.
   Por isso quem decide o caminho não é a presença da chave, e sim se a Uber
   realmente responde — senão o site trocaria o link universal (que funciona)
   por uma API que sempre falha.

   O resultado negativo vale 10 minutos, para não bater na Uber a cada clique.
   ------------------------------------------------------------------------ */
let semAcessoAte = 0;
let ultimoMotivo = '';

export async function disponivel() {
  if (simulado) return false;
  if (Date.now() < semAcessoAte) return false;
  try {
    await obterToken();
    ultimoMotivo = '';
    return true;
  } catch (e) {
    ultimoMotivo = e.message;
    semAcessoAte = Date.now() + 10 * 60 * 1000;
    console.error('[uber] credenciais existem, mas a API não respondeu:', e.message, '— usando o modo simulado/link por 10 min');
    return false;
  }
}

/* Como o servidor está em relação à Uber, para a página /api e o log */
export async function estado() {
  if (simulado) return 'simulado (sem UBER_CLIENT_ID/SECRET)';
  return (await disponivel()) ? 'real' : `credencial sem acesso à Guest Rides (${ultimoMotivo || 'escopo não liberado'})`;
}

/* ------------------------------------------------------------------------
   Token (client_credentials). Dura 30 dias; renovamos com folga.
   ------------------------------------------------------------------------ */
let token = { valor: null, expiraEm: 0 };

async function obterToken() {
  if (token.valor && Date.now() < token.expiraEm - 60_000) return token.valor;
  const corpo = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials',
    scope: 'guests.trips',
  });
  const r = await fetch(AUTH_URL, { method: 'POST', body: corpo });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok || !dados.access_token) throw erroUber(r.status, dados, 'Não consegui autenticar na Uber.');
  token = { valor: dados.access_token, expiraEm: Date.now() + (dados.expires_in || 3600) * 1000 };
  return token.valor;
}

async function chamar(metodo, caminho, corpo) {
  const cabecalhos = {
    authorization: `Bearer ${await obterToken()}`,
    'content-type': 'application/json',
  };
  if (config.sandbox) cabecalhos['x-uber-sandbox-runuuid'] = sandboxRun;
  if (config.orgUuid) cabecalhos['x-uber-organizationuuid'] = config.orgUuid;

  const r = await fetch(`${API_URL}${caminho}`, { method: metodo, headers: cabecalhos, body: corpo ? JSON.stringify(corpo) : undefined });
  const dados = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw erroUber(r.status, dados);
  return dados;
}

const sandboxRun = crypto.randomUUID();

function erroUber(status, dados, padrao = 'A Uber não aceitou o pedido.') {
  const e = new Error(dados?.message || dados?.error_description || dados?.code || padrao);
  e.status = status >= 500 ? 502 : 400;
  e.uber = dados;
  return e;
}

/* ------------------------------------------------------------------------
   Estados: a Uber usa processing / accepted / arriving / in_progress /
   completed / driver_canceled / rider_canceled / no_drivers_available.
   O painel usa os nossos, em português.
   ------------------------------------------------------------------------ */
export function traduzirStatus(uber) {
  return {
    processing: 'solicitada',
    accepted: 'a_caminho',
    arriving: 'a_caminho',
    in_progress: 'em_andamento',
    completed: 'concluida',
    driver_canceled: 'cancelada',
    rider_canceled: 'cancelada',
    no_drivers_available: 'sem_motorista',
  }[uber] || 'solicitada';
}

/* ------------------------------------------------------------------------
   API pública do módulo
   ------------------------------------------------------------------------ */

// Estimativa: devolve a opção mais barata disponível { product_id, fare_id, nome, valor, eta_min }
export async function estimar(origem, destino) {
  if (!(await disponivel())) return simular.estimar(origem, destino);

  const dados = await chamar('POST', '/guests/trips/estimates', {
    pickup: { latitude: origem.lat, longitude: origem.lng },
    dropoff: { latitude: destino.lat, longitude: destino.lng },
  });
  const opcoes = (dados.product_estimates || [])
    .filter(p => p.estimate_info?.fare_id && p.fulfillment_indicator !== 'RED')
    .map(p => ({
      product_id: p.product.product_id,
      fare_id: p.estimate_info.fare_id,
      nome: p.product.display_name,
      valor: p.estimate_info.fare?.display || null,
      valor_numero: p.estimate_info.fare?.value ?? null,
      eta_min: p.estimate_info.pickup_estimate ?? null,
    }))
    .sort((a, b) => (a.valor_numero ?? 1e9) - (b.valor_numero ?? 1e9));
  if (!opcoes.length) throw Object.assign(new Error('Nenhum carro disponível agora nessa região.'), { status: 409 });
  return opcoes[0];
}

// Pede a corrida para a pessoa idosa (o "convidado"). Devolve { request_id, status }
export async function solicitar({ idoso, origem, destino, estimativa, observacao }) {
  if (!(await disponivel())) return simular.solicitar();

  const [primeiro, ...resto] = String(idoso.nome || 'Passageiro ELO').trim().split(' ');
  const dados = await chamar('POST', '/guests/trips', {
    guest: {
      first_name: primeiro,
      last_name: resto.join(' ') || 'ELO',
      phone_number: idoso.telefone,
      locale: 'pt-BR',
    },
    pickup: { latitude: origem.lat, longitude: origem.lng, address: origem.nome || undefined },
    dropoff: { latitude: destino.lat, longitude: destino.lng, address: destino.nome || undefined },
    product_id: estimativa.product_id,
    fare_id: estimativa.fare_id,
    note_for_driver: observacao || 'Passageiro idoso, usuário da pochete ELO. Por favor, aguarde na porta.',
    call_enabled: true,
  });
  return { request_id: dados.request_id, status: traduzirStatus(dados.status), eta_min: dados.estimate_info?.eta ?? null };
}

export async function consultar(requestId, criadoEm) {
  if (!(await disponivel())) return simular.consultar(requestId, criadoEm);
  const dados = await chamar('GET', `/guests/trips/${requestId}`);
  return {
    status: traduzirStatus(dados.status),
    uber_status: dados.status,
    motorista: dados.driver ? { nome: dados.driver.name, telefone: dados.driver.phone_number, nota: dados.driver.rating } : null,
    veiculo: dados.vehicle ? `${dados.vehicle.make || ''} ${dados.vehicle.model || ''} ${dados.vehicle.license_plate || ''}`.trim() : null,
    eta_min: dados.pickup?.eta ?? null,
  };
}

export async function cancelar(requestId) {
  if (!(await disponivel())) return simular.cancelar(requestId);
  await chamar('DELETE', `/guests/trips/${requestId}`);
  return { status: 'cancelada' };
}

/* ------------------------------------------------------------------------
   Link universal (deep link)
   ---------------------------------------------------------------------------
   O outro jeito de chamar um carro, e o único que funciona sem a Uber ter
   aprovado credenciais: um link que abre o app no celular e o site do Uber
   no computador, já com a partida e o destino preenchidos. Quem conclui o
   pedido é a pessoa, dentro do Uber — por isso o servidor não acompanha o
   status depois (diferente da Guest Rides API, acima).

   Formato oficial: https://m.uber.com/ul/?action=setPickup
     &pickup[latitude]&pickup[longitude]&pickup[nickname]
     &dropoff[latitude]&dropoff[longitude]&dropoff[nickname]
   Sem coordenada de partida, "pickup=my_location" deixa o próprio app
   resolver onde a pessoa está.
   ------------------------------------------------------------------------ */
export function linkUniversal({ origem, destino, nomeOrigem, nomeDestino } = {}) {
  const p = new URLSearchParams({ action: 'setPickup' });
  if (config.clientId) p.set('client_id', config.clientId);

  if (origem) {
    p.set('pickup[latitude]', String(origem.lat));
    p.set('pickup[longitude]', String(origem.lng));
    if (nomeOrigem) p.set('pickup[nickname]', nomeOrigem);
  } else {
    p.set('pickup', 'my_location');
  }

  if (destino) {
    p.set('dropoff[latitude]', String(destino.lat));
    p.set('dropoff[longitude]', String(destino.lng));
    if (nomeDestino) p.set('dropoff[nickname]', nomeDestino);
  }

  return `https://m.uber.com/ul/?${p}`;
}

/* ------------------------------------------------------------------------
   Simulação: uma corrida fictícia que avança sozinha
     0–20 s   solicitada (procurando motorista)
     20–60 s  a_caminho (motorista aceitou)
     60–150 s em_andamento
     depois   concluida
   ------------------------------------------------------------------------ */
const canceladas = new Set();

const simular = {
  estimar(origem, destino) {
    const km = distanciaKm(origem, destino);
    const valor = 8 + km * 2.4;
    return {
      product_id: 'sim-uberx', fare_id: 'sim-' + crypto.randomUUID().slice(0, 8),
      nome: 'UberX (simulado)', valor: `R$ ${valor.toFixed(2).replace('.', ',')}`, valor_numero: valor, eta_min: 4,
    };
  },
  solicitar() {
    return { request_id: 'sim-' + crypto.randomUUID(), status: 'solicitada', eta_min: 4 };
  },
  consultar(requestId, criadoEm) {
    if (canceladas.has(requestId)) return { status: 'cancelada', uber_status: 'rider_canceled', motorista: null, veiculo: null, eta_min: null };
    const s = (Date.now() - new Date(criadoEm).getTime()) / 1000;
    const motorista = { nome: 'Carlos (simulado)', telefone: '+55 11 90000-0000', nota: 4.9 };
    if (s < 20) return { status: 'solicitada', uber_status: 'processing', motorista: null, veiculo: null, eta_min: 4 };
    if (s < 60) return { status: 'a_caminho', uber_status: 'accepted', motorista, veiculo: 'Fiat Argo prata ABC1D23', eta_min: Math.max(1, Math.round(4 - (s - 20) / 12)) };
    if (s < 150) return { status: 'em_andamento', uber_status: 'in_progress', motorista, veiculo: 'Fiat Argo prata ABC1D23', eta_min: null };
    return { status: 'concluida', uber_status: 'completed', motorista, veiculo: 'Fiat Argo prata ABC1D23', eta_min: null };
  },
  cancelar(requestId) {
    canceladas.add(requestId);
    return { status: 'cancelada' };
  },
};

function distanciaKm(a, b) {
  const r = 6371, dLat = grau(b.lat - a.lat), dLng = grau(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(grau(a.lat)) * Math.cos(grau(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
const grau = g => (g * Math.PI) / 180;
