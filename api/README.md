# API da Eloá

Motor de respostas próprio da assistente do projeto ELO. Responde em milissegundos, sem depender de servidor nem de modelo externo, a partir de uma base de conhecimento com o conteúdo real do site — e conversa como uma pessoa: varia o jeito de falar, lembra do que foi dito, puxa o próximo assunto e reage ao tom de quem pergunta.

## O que ela faz de "gente"

- **Varia a resposta.** Cada assunto tem mais de um jeito de ser dito; ela sorteia e não repete o último.
- **Lembra.** Se você diz seu nome, ela usa de vez em quando. Se fala "minha mãe", as respostas passam a falar de "sua mãe". Se repete uma pergunta, ela avisa que já comentou.
- **Puxa assunto.** Termina com uma pergunta ("Quer que eu explique como ligar pela primeira vez?") e entende "sim", "quero", "pode" como resposta a isso.
- **Reage ao tom.** Se a pergunta traz aflição (medo, queda, sozinha, Alzheimer), ela acolhe antes de explicar.
- **Responde duas coisas de uma vez.** "Quanto custa e quanto dura a bateria?" recebe as duas respostas.
- **Confirma quando quase entende.** Se a pergunta chega perto de um assunto mas não bate de vez, ela pergunta "Você quer saber sobre a bateria?" em vez de dizer que não sabe. "Sim" responde; "não" pede para reformular.
- **Reexplica.** "Não entendi" faz ela repetir o último assunto com outras palavras.
- **Entende abreviação de internet.** "oq", "pq", "vc", "tb", "qnt", "qm", "msm"...
- **É honesta.** Se perguntam se é uma pessoa, diz que é uma assistente — feita para conversar como uma. Se o site não traz a informação (detecção de queda, plano de chip, nota fiscal), ela diz o que se sabe e aponta a equipe para o resto. Não inventa.

## Cobertura

46 assuntos, cobrindo tudo que está no site: o que é a ELO, funcionalidades, diferencial, missão, comparação com celular e relógio; emergência (e seus limites), transporte, voz, bateria, localização, conectividade, privacidade; app (e cadastro de mais pessoas), configuração, uso no dia a dia, aparência, água; preço, compra e entrega, garantia, caixa, para quem é; equipe, referências, contato, componentes, páginas do site; e a própria Eloá (o que é, como funciona, que não chama o SAMU).

Medido com duas baterias de perguntas de visitante (uma delas com perguntas que não foram usadas para ajustar): 90 de 91 e 65 de 66 reconhecidas. A que sobra em cada uma é fora do assunto ("capital da França"), e ela diz que não sabe — como deve.

## Arquivos

| Arquivo | O que é |
|---|---|
| `eloa-engine.js` | O motor: base de conhecimento + reconhecimento da pergunta. Funciona no navegador e no Node. |
| `server.js` | Servidor HTTP (Node, sem dependências) que expõe o motor com o mesmo contrato do servidor antigo. |
| `../pages/eloa.js` | A conversa na página: usa o motor local e, só se ele não reconhecer a pergunta, consulta o servidor remoto com tempo limite. |

## Como a página responde

1. **Motor local** — reconhece o assunto e responde na hora.
2. **Servidor remoto (reserva)** — só para perguntas fora da base, com limite de 6 s. Se demorar ou falhar, a Eloá responde com a lista do que sabe fazer.

Para desligar a reserva, em `pages/eloa.js` troque `remoto.ativo` para `false`.

## Ensinar uma resposta nova

Em `eloa-engine.js`, seção 2, adicione um item em `BASE`:

```js
{
  id: 'entrega',
  fortes: ['entrega', 'frete', 'prazo de entrega', 'chega quando'],   // peso 3
  fracas: ['correio', 'transportadora', 'dias'],                       // peso 1
  resposta: 'A entrega leva de 5 a 10 dias úteis.\n\nO frete é calculado no pedido.'
}
```

- Escreva as pistas em minúsculas e **sem acento**.
- Uma pista sem espaço casa pelo **começo da palavra**: `carreg` pega carregar, carregador, carregando. Pistas de até 3 letras (`sos`, `app`, `gps`) casam só por igualdade.
- Uma pista com espaço casa como **trecho da frase**.
- A resposta precisa somar pelo menos 3 pontos para ser usada; abaixo disso a Eloá diz que não sabe.
- `\n` vira quebra de linha no chat.

Para saudações e despedidas curtas, use `exatos` em vez de `fortes`/`fracas` (veja `saudacao` no arquivo).

## Rodar o servidor

```bash
node api/server.js            # http://localhost:8000
PORT=3000 node api/server.js  # outra porta
```

```
POST /perguntar   { "pergunta": "quanto custa?", "sessao": "id-opcional" }
                  → { "status": "sucesso", "resposta_da_ia": "...", "intencao": "preco", "confianca": 0.75, "fonte": "local", "sessao": "eloa-..." }
GET  /saude       → { "ok": true, "versao": "3.0.0", "sessoes": 3 }
```

Mande o mesmo `sessao` em todas as perguntas de uma conversa para a Eloá lembrar do contexto. Sem o campo, o servidor cria uma sessão e devolve o id. Sessões paradas por 30 minutos são apagadas.

O contrato de `POST /perguntar` é o mesmo do servidor antigo no Render, então qualquer cliente que falava com ele fala com este sem mudar nada. Precisa do Node 18 ou mais novo.

## Testar o motor no terminal

```bash
node -e "
const s = require('./api/eloa-engine.js').criarSessao();
console.log(s.responder('minha mãe caiu, como aciono o samu?').resposta);
console.log(s.responder('sim').resposta);
"
```
