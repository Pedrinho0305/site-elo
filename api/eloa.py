"""
Eloá · API em Python
---------------------------------------------------------------------------
A assistente do projeto ELO conversando como uma pessoa. Um modelo de
linguagem (Claude) responde a partir da persona e dos fatos do site, com
memória da conversa por sessão. Se não houver chave da API (ou ela falhar),
um modo local por palavras-chave responde com os mesmos fatos: a Eloá
nunca fica muda.

Rodar:
    pip install -r requirements.txt          (na raiz do projeto)
    set ANTHROPIC_API_KEY=sk-ant-...        (Windows)  |  export ... (Linux/Mac)
    python api/eloa.py                       (porta 8000)
    set PORT=3000 & python api/eloa.py       (outra porta)

Na Vercel este arquivo vira a função /api/eloa (o vercel.json da raiz manda
/api/eloa/* para cá). As mesmas rotas existem com e sem o prefixo /api/eloa.

Rotas (mesmo contrato do servidor antigo):
    POST /perguntar  { "pergunta": "...", "sessao": "id-opcional", "historico": [...] }
                     -> { status: "sucesso", resposta_da_ia, intencao, confianca, fonte, sessao }
    GET  /saude      -> { ok, versao, modo: "modelo" | "local", sessoes }

Sessão: mande o mesmo "sessao" em todas as perguntas de uma conversa e a
Eloá lembra do que foi dito. Sem "sessao", o servidor cria uma e devolve o
id. Sessões paradas por 30 minutos são apagadas. Em serverless a memória
não sobrevive entre chamadas, então o cliente pode mandar "historico" (as
últimas mensagens, [{role, content}]) e ele passa a valer como a memória.

Variáveis opcionais:
    ELOA_MODELO   modelo (padrão: claude-opus-5)
    ELOA_ESFORCO  low | medium | high (padrão: low; chat curto não precisa de mais)
    ELOA_ORIGENS  origens permitidas no CORS, separadas por vírgula (padrão: *)
"""
from __future__ import annotations

import logging
import os
import random
import re
import sys
import threading
import time
import unicodedata
import uuid

# O módulo de conhecimento mora ao lado deste arquivo; garante o import
# também quando o processo começa em outra pasta (Vercel, uvicorn na raiz).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Um api/.env com ANTHROPIC_API_KEY=... também serve (sem dependência extra)
_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env):
    with open(_env, encoding="utf-8") as _f:
        for _linha in _f:
            _linha = _linha.strip()
            if _linha and not _linha.startswith("#") and "=" in _linha:
                _k, _v = _linha.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

import anthropic
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# _conhecimento.py: o "_" impede a Vercel de tratar o arquivo como uma função própria
from _conhecimento import ASSUNTOS, CONVERSA_CURTA, NAO_SEI, PERSONA, texto_dos_fatos

VERSAO = "2.0.0"
MODELO = os.environ.get("ELOA_MODELO", "claude-opus-5")
ESFORCO = os.environ.get("ELOA_ESFORCO", "low")
VALIDADE_SESSAO = 30 * 60          # segundos
MAX_TURNOS = 40                    # mensagens guardadas por sessão (user + assistant)
MAX_TOKENS_RESPOSTA = 1500         # respostas de chat são curtas por desenho (persona)

log = logging.getLogger("eloa")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logging.getLogger("httpx2").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

# O prefixo estável (persona + fatos) é o mesmo em todas as chamadas: fica em cache.
SISTEMA = [{
    "type": "text",
    "text": PERSONA + "\n\n" + texto_dos_fatos(),
    "cache_control": {"type": "ephemeral"},
}]


# ---------------------------------------------------------------------------
# Sessões (memória da conversa)
# ---------------------------------------------------------------------------
class Sessao:
    def __init__(self) -> None:
        self.mensagens: list[dict] = []
        self.tocada_em = time.time()


_sessoes: dict[str, Sessao] = {}
_trava = threading.Lock()


def obter_sessao(id_sessao: str | None) -> tuple[str, Sessao]:
    agora = time.time()
    with _trava:
        # limpa as paradas
        for sid in [s for s, v in _sessoes.items() if agora - v.tocada_em > VALIDADE_SESSAO]:
            del _sessoes[sid]
        if id_sessao and id_sessao in _sessoes:
            s = _sessoes[id_sessao]
            s.tocada_em = agora
            return id_sessao, s
        novo = id_sessao if id_sessao and re.fullmatch(r"[\w-]{1,64}", id_sessao) else "eloa-" + uuid.uuid4().hex[:12]
        _sessoes[novo] = Sessao()
        return novo, _sessoes[novo]


# ---------------------------------------------------------------------------
# Modo modelo (Claude)
# ---------------------------------------------------------------------------
_cliente: anthropic.Anthropic | None = None
_modelo_indisponivel_ate = 0.0     # depois de erro de credencial, evita bater na API a cada pergunta


def cliente() -> anthropic.Anthropic:
    global _cliente
    if _cliente is None:
        _cliente = anthropic.Anthropic(timeout=45.0, max_retries=1)
    return _cliente


def modelo_disponivel() -> bool:
    return time.time() >= _modelo_indisponivel_ate


def responder_com_modelo(sessao: Sessao, pergunta: str) -> str | None:
    """Uma resposta do modelo, ou None se ele não puder responder agora."""
    global _modelo_indisponivel_ate
    mensagens = sessao.mensagens + [{"role": "user", "content": pergunta}]
    try:
        resposta = cliente().messages.create(
            model=MODELO,
            max_tokens=MAX_TOKENS_RESPOSTA,
            system=SISTEMA,
            messages=mensagens,
            output_config={"effort": ESFORCO},
        )
    except TypeError as e:
        # O SDK levanta TypeError quando não acha credencial nenhuma
        if "authentication" not in str(e).lower():
            raise
        log.warning("Nenhuma credencial da API encontrada (defina ANTHROPIC_API_KEY). Modo local por 10 minutos.")
        _modelo_indisponivel_ate = time.time() + 600
        return None
    except anthropic.AuthenticationError:
        log.warning("Credencial da API inválida (ANTHROPIC_API_KEY). Modo local por 10 minutos.")
        _modelo_indisponivel_ate = time.time() + 600
        return None
    except anthropic.PermissionDeniedError as e:
        log.warning("Chave sem permissão: %s. Modo local por 10 minutos.", e.message)
        _modelo_indisponivel_ate = time.time() + 600
        return None
    except anthropic.RateLimitError:
        log.warning("Limite de requisições da API. Modo local por 30 segundos.")
        _modelo_indisponivel_ate = time.time() + 30
        return None
    except anthropic.BadRequestError as e:
        log.error("Pedido recusado pela API: %s", e.message)
        return None
    except anthropic.APIStatusError as e:
        log.warning("API respondeu %s. Modo local nesta pergunta.", e.status_code)
        return None
    except anthropic.APIConnectionError:
        log.warning("Sem conexão com a API. Modo local nesta pergunta.")
        return None

    if resposta.stop_reason == "refusal":
        log.info("Modelo recusou (%s).", getattr(resposta.stop_details, "category", None))
        return None

    texto = "".join(b.text for b in resposta.content if b.type == "text").strip()
    if not texto:
        return None

    sessao.mensagens.append({"role": "user", "content": pergunta})
    sessao.mensagens.append({"role": "assistant", "content": texto})
    del sessao.mensagens[:-MAX_TURNOS]
    return texto


# ---------------------------------------------------------------------------
# Modo local (palavras-chave sobre a mesma base)
# ---------------------------------------------------------------------------
ABREVIACOES = {
    "oq": "o que", "pq": "por que", "q": "que", "vc": "voce", "vcs": "voces", "tb": "tambem", "tbm": "tambem",
    "qnt": "quanto", "qto": "quanto", "qd": "quando", "qdo": "quando", "qm": "quem", "msm": "mesmo",
    "pra": "para", "pro": "para o", "ta": "esta", "n": "nao", "nn": "nao", "mt": "muito", "mto": "muito",
    "blz": "beleza", "vlw": "valeu", "obg": "obrigado", "hj": "hoje", "dps": "depois", "kd": "cade",
}


def normalizar(texto: str) -> str:
    base = unicodedata.normalize("NFD", (texto or "").lower())
    base = "".join(c for c in base if unicodedata.category(c) != "Mn")
    base = re.sub(r"[^a-z0-9$ ]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    return " ".join(ABREVIACOES.get(t, t) for t in base.split(" "))


def pontuar(texto: str, pistas: list[str]) -> int:
    pontos = 0
    palavras = texto.split(" ")
    for pista in pistas:
        if " " in pista:
            if pista in texto:
                pontos += 3
        elif any(p.startswith(pista) for p in palavras):
            pontos += 2
    return pontos


def responder_local(sessao: Sessao, pergunta: str) -> tuple[str, str, float]:
    """(resposta, intenção, confiança). Sempre responde alguma coisa."""
    texto = normalizar(pergunta)
    ultima = sessao.mensagens[-1]["content"] if sessao.mensagens else ""

    # conversa curta: frase inteira ou quase
    for nome, dados in CONVERSA_CURTA.items():
        if texto in dados["pistas"] or any(texto.startswith(p + " ") and len(texto) < len(p) + 12 for p in dados["pistas"]):
            resposta = random.choice([r for r in dados["respostas"] if r != ultima] or dados["respostas"])
            break
    else:
        # emergência acontecendo agora vem antes de qualquer assunto
        if re.search(r"\b(agora|socorro|urgente|caiu|desmaiou|passando mal)\b", texto):
            resposta = ("Se é uma emergência agora, aperte o botão vermelho da pochete ou ligue 192 (SAMU). "
                        "Eu sou só uma assistente de texto e não aciono nada. Depois, se quiser, eu explico como o alerta funciona.")
            sessao.mensagens += [{"role": "user", "content": pergunta}, {"role": "assistant", "content": resposta}]
            return resposta, "emergencia_agora", 1.0

        pontuados = sorted(((pontuar(texto, a["pistas"]), a) for a in ASSUNTOS), key=lambda x: -x[0])
        melhor_pontos, melhor = pontuados[0]
        if melhor_pontos == 0:
            resposta, intencao, confianca = NAO_SEI, "desconhecido", 0.0
        else:
            segundo = pontuados[1][1] if len(pontuados) > 1 and pontuados[1][0] == melhor_pontos else None
            resposta = melhor["fato"]
            if segundo:
                resposta += "\n\n" + segundo["fato"]
            intencao, confianca = melhor["id"], min(1.0, melhor_pontos / 6)
        sessao.mensagens += [{"role": "user", "content": pergunta}, {"role": "assistant", "content": resposta}]
        del sessao.mensagens[:-MAX_TURNOS]
        return resposta, intencao, confianca

    sessao.mensagens += [{"role": "user", "content": pergunta}, {"role": "assistant", "content": resposta}]
    del sessao.mensagens[:-MAX_TURNOS]
    return resposta, nome, 1.0


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
app = FastAPI(title="Eloá", version=VERSAO, docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("ELOA_ORIGENS", "*").split(",")],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class Mensagem(BaseModel):
    role: str = Field(pattern=r"^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class Pergunta(BaseModel):
    pergunta: str = Field(min_length=1, max_length=4000)
    sessao: str | None = None
    # memória guardada no navegador (serverless não lembra entre chamadas)
    historico: list[Mensagem] | None = Field(default=None, max_length=MAX_TURNOS)


rotas = APIRouter()


@rotas.get("/")
@rotas.get("/saude")
def saude():
    return {"ok": True, "versao": VERSAO, "modo": "modelo" if modelo_disponivel() else "local", "modelo": MODELO, "sessoes": len(_sessoes)}


@rotas.post("/perguntar")
def perguntar(dados: Pergunta):
    pergunta = dados.pergunta.strip()
    if not pergunta:
        return {"status": "erro", "mensagem": 'O campo "pergunta" precisa ser um texto.'}

    id_sessao, sessao = obter_sessao(dados.sessao)
    if dados.historico is not None:
        # o cliente é a fonte da memória: user/assistant alternados, começando em user
        mensagens = [m for m in dados.historico if m.content.strip()]
        while mensagens and mensagens[0].role != "user":
            mensagens.pop(0)
        limpo: list[dict] = []
        for m in mensagens:
            if limpo and limpo[-1]["role"] == m.role:
                continue
            limpo.append({"role": m.role, "content": m.content.strip()})
        if limpo and limpo[-1]["role"] == "user":
            limpo.pop()
        sessao.mensagens = limpo

    if modelo_disponivel():
        texto = responder_com_modelo(sessao, pergunta)
        if texto:
            return {"status": "sucesso", "resposta_da_ia": texto, "intencao": "conversa", "confianca": 1.0, "fonte": "modelo", "sessao": id_sessao}

    texto, intencao, confianca = responder_local(sessao, pergunta)
    return {"status": "sucesso", "resposta_da_ia": texto, "intencao": intencao, "confianca": confianca, "fonte": "local", "sessao": id_sessao}


# As mesmas rotas na raiz (python api/eloa.py) e sob /api/eloa (Vercel)
app.include_router(rotas)
app.include_router(rotas, prefix="/api/eloa")

# Sem credencial nenhuma, nem tenta o modelo: responde no modo local direto
_perfil = os.path.join(os.path.expanduser("~"), ".config", "anthropic")
if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or os.path.isdir(_perfil)):
    log.warning("ANTHROPIC_API_KEY não definida e nenhum perfil do 'ant auth login': a Eloá responde no modo local.")
    _modelo_indisponivel_ate = float("inf")


if __name__ == "__main__":
    import uvicorn

    porta = int(os.environ.get("PORT", "8000"))
    log.info("Eloá respondendo em http://localhost:%s/perguntar (modelo: %s, esforço: %s)", porta, MODELO, ESFORCO)
    uvicorn.run(app, host="0.0.0.0", port=porta, log_level="warning")
