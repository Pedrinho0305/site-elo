# API da Eloá

A Eloá é a assistente do projeto ELO. Esta pasta tem a API em Python que responde por ela: um modelo de linguagem (Claude) conversando como uma pessoa, a partir da persona e dos fatos do site, com memória da conversa por sessão.

Ela entende praticamente qualquer jeito de perguntar — gíria, abreviação, erro de digitação, duas perguntas de uma vez, ironia, aflição — e responde curto, no tom de quem conversa. O que o site não diz, ela não inventa: aponta a equipe.

## Rodar

```bash
pip install -r requirements.txt      # na raiz do projeto
```

Coloque **uma** chave de modelo. A gratuita é a do Google Gemini (crie em [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sem cartão):

```bash
# Windows (PowerShell)
$env:GEMINI_API_KEY = "AIza..."
# Linux / Mac
export GEMINI_API_KEY="AIza..."
```

Ou copie `api/.env.example` para `api/.env` e preencha (o arquivo não vai para o git). Outras chaves aceitas: `GROQ_API_KEY` (grátis, Llama), `ANTHROPIC_API_KEY` (paga), `OPENAI_API_KEY` (paga; com `OPENAI_BASE_URL` serve para qualquer API compatível) e `AI_GATEWAY_API_KEY` (Vercel, exige cartão). A primeira encontrada, na ordem Anthropic → Gemini → Groq → OpenAI → Gateway, define o provedor; `ELOA_PROVEDOR` força um.

```bash
python api/eloa.py           # http://localhost:8000
```

Abra o site (por exemplo `python -m http.server 8765` na raiz) e vá em **Eloá**. Em `localhost` a página aponta sozinha para `http://localhost:8000/perguntar`; no site publicado, para `/api/eloa/perguntar`. Para outro endereço, defina `window.ELOA_API_URL` antes de carregar `js/eloa.js`.

## Na Vercel

`api/eloa.py` vira a função `/api/eloa` do mesmo projeto do site (o `vercel.json` da raiz manda `/api/eloa/*` para ela; as rotas existem com e sem esse prefixo). Dependências em `requirements.txt` na raiz. Defina `GEMINI_API_KEY` (ou outra das chaves acima) nas variáveis do projeto e faça redeploy — sem chave, modo local. `GET /api/eloa/saude` mostra `provedor` e `modelo`. Como serverless não guarda nada entre chamadas, `js/eloa.js` manda o campo `historico` (últimas mensagens, em `sessionStorage`) e o servidor usa isso como memória da conversa.

## Dois modos

| Modo | Quando | Como responde |
|---|---|---|
| **modelo** | há uma chave válida (Gemini, Groq, Anthropic, OpenAI ou Gateway) | O modelo do provedor (`gemini-3.5-flash`, `llama-3.3-70b-versatile`, `claude-opus-5`, `gpt-4o-mini`…), com a persona e os fatos como contexto e o histórico da sessão. É o modo "gente". Troque o modelo com `ELOA_MODELO`. |
| **local** | sem chave, chave inválida, limite de uso ou API fora | Reconhece o assunto por palavras-chave e responde com o fato correspondente. Menos natural, mas nunca inventa e nunca fica muda. |

O servidor troca de modo sozinho e informa em `GET /saude` (`"modo": "modelo"` ou `"local"`). Se a API do modelo falhar no meio de uma conversa, aquela pergunta cai no modo local e a próxima tenta o modelo de novo.

E se o servidor Python nem estiver no ar, a página usa o motor antigo no próprio navegador (`js/eloa-engine.js`) e tenta a API de novo a cada minuto. Ou seja: **a Eloá sempre responde**.

## Rotas

```
POST /perguntar   { "pergunta": "...", "sessao": "id-opcional" }
                  → { status: "sucesso", resposta_da_ia, intencao, confianca, fonte, sessao }
GET  /saude       → { ok, versao, modo, modelo, sessoes }
```

Mesmo contrato do servidor antigo. `fonte` diz de onde veio a resposta (`modelo` ou `local`). Mande o mesmo `sessao` em todas as perguntas de uma conversa; sem ele, o servidor cria um e devolve. Sessões paradas por 30 minutos são apagadas.

## Configuração (variáveis de ambiente)

| Variável | Padrão | O que faz |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | chave da API. Sem ela, modo local |
| `ELOA_MODELO` | `claude-opus-5` | modelo usado |
| `ELOA_ESFORCO` | `low` | `low`, `medium` ou `high`. Chat curto vai bem em `low`; suba se quiser respostas mais elaboradas |
| `ELOA_ORIGENS` | `*` | origens permitidas no CORS, separadas por vírgula (em produção, coloque o domínio do site) |
| `PORT` | `8000` | porta |

O prefixo enviado ao modelo (persona + fatos) é o mesmo em todas as chamadas e fica em cache na API, então cada pergunta custa pouco.

## Arquivos

| Arquivo | O que é |
|---|---|
| `eloa.py` | O servidor (FastAPI): sessões, chamada ao modelo, modo local, rotas. |
| `_conhecimento.py` | A persona da Eloá e os fatos sobre a ELO. **Para ensinar algo novo, edite aqui** — vale para os dois modos. (O `_` impede a Vercel de tratar o arquivo como função.) |
| `../js/eloa-engine.js` | Motor antigo, só no navegador, usado quando o servidor está fora do ar. |
| `../js/eloa.js` | A conversa na página: fala com a API, guarda a sessão, mostra a resposta sendo digitada. |
| `../requirements.txt` | `anthropic`, `fastapi`, `uvicorn` (na raiz, onde a Vercel procura). |

## Para ensinar a Eloá

Abra `_conhecimento.py` e adicione um item em `ASSUNTOS`:

```python
{
    "id": "seguro", "nome": "o seguro",
    "pistas": ["seguro", "roubo", "perdi a pochete"],
    "fato": "Texto do que o site diz sobre isso. Se algo não estiver no site, escreva 'o site NÃO informa X'.",
},
```

O modelo passa a saber disso na próxima pergunta; o modo local reconhece pelas `pistas`. Para mudar o jeito de falar dela, edite `PERSONA` no mesmo arquivo.
