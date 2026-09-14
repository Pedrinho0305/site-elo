/* ==========================================================================
   Eloá · Motor de respostas
   ---------------------------------------------------------------------------
   A API própria da Eloá. Responde em milissegundos, sem servidor nem modelo
   externo, a partir de uma base de conhecimento com o conteúdo real do site
   — e conversa como uma pessoa: varia o jeito de falar, lembra do que foi
   dito, puxa o próximo assunto, confirma quando quase entende e reage ao
   tom de quem pergunta.

   Regra de ouro da base: o que o site não diz, a Eloá não inventa. Ela
   responde o que se sabe e aponta a equipe para o resto.

   Funciona nos dois lados:
     • navegador → window.EloaEngine
     • Node      → const EloaEngine = require('./eloa-engine')

   Uso com memória (recomendado para um chat):
     const sessao = EloaEngine.criarSessao();
     sessao.responder('quanto dura a bateria?');
     sessao.responder('sim');   // entende que é resposta ao "quer que eu explique...?"

   Para ensinar uma resposta nova, adicione um item em BASE (seção 2).
   ========================================================================== */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.EloaEngine = fabrica();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1 · Normalização
     ------------------------------------------------------------------------ */
  // Jeito de escrever na internet → palavra inteira
  const ABREVIACOES = {
    oq: 'o que', pq: 'por que', q: 'que', vc: 'voce', vcs: 'voces', tb: 'tambem', tbm: 'tambem',
    qnt: 'quanto', qto: 'quanto', qd: 'quando', qdo: 'quando', qm: 'quem', msm: 'mesmo',
    pra: 'para', pro: 'para o', ta: 'esta', tao: 'estao', n: 'nao', nn: 'nao', ne: 'nao e',
    cmg: 'comigo', ctg: 'contigo', mt: 'muito', mto: 'muito', blz: 'beleza', vlw: 'valeu',
    obg: 'obrigado', sla: 'sei la', hj: 'hoje', dps: 'depois', bjs: 'beijos', kd: 'cade'
  };

  function normalizar(texto) {
    const base = String(texto || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9$ ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return base.split(' ').map(t => ABREVIACOES[t] || t).join(' ');
  }

  function tokenizar(texto) {
    return normalizar(texto).split(' ').filter(Boolean);
  }

  function sortear(lista, evitar) {
    if (!lista || !lista.length) return null;
    if (lista.length === 1) return lista[0];
    let escolha;
    do { escolha = lista[Math.floor(Math.random() * lista.length)]; } while (escolha === evitar);
    return escolha;
  }

  /* ------------------------------------------------------------------------
     2 · Base de conhecimento
     Cada assunto tem:
       nome       como a Eloá se refere a ele ("a bateria") ao pedir confirmação
       fortes     radicais/expressões que definem o assunto (peso 3)
       fracas     pistas que ajudam a desempatar (peso 1)
       respostas  jeitos diferentes de dizer a mesma coisa; um é sorteado
       seguimento pergunta que ela faz no fim, e para qual assunto leva
     Pistas em minúsculas e sem acento. Radical casa pelo começo da palavra
     ("carreg" pega carregar, carregador). Com espaço, casa como trecho.
     {pessoa} vira "sua mãe", "seu pai"... se a pessoa mencionou alguém.
     ------------------------------------------------------------------------ */
  const BASE = [

    /* ---- conversa curta ------------------------------------------------ */
    {
      id: 'saudacao', nome: 'um oi',
      exatos: ['oi', 'ola', 'oie', 'oii', 'opa', 'hey', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'e ai', 'eai', 'oi eloa', 'ola eloa', 'oi tudo bem', 'ola tudo bem', 'oi eloa tudo bem', 'bom dia eloa', 'boa tarde eloa', 'boa noite eloa'],
      respostas: [
        'Oi! Que bom te ver por aqui. Eu sou a Eloá, do projeto ELO. Me conta: o que você quer saber sobre a pochete?',
        'Olá! Eu sou a Eloá. Posso explicar como a pochete funciona, ajudar a configurar ou tirar dúvida sobre o app. Por onde a gente começa?',
        'Oi, tudo bem? Sou a Eloá, a assistente da ELO. Pode perguntar o que quiser sobre a pochete — eu explico do jeito mais simples que eu conseguir.'
      ]
    },
    {
      id: 'como_vai', nome: 'como eu estou',
      exatos: ['tudo bem', 'tudo bom', 'como vai', 'como voce esta', 'como esta', 'como vai voce', 'ta bem', 'tudo certo', 'como voce ta', 'e voce', 'e vc', 'tudo bem com voce'],
      respostas: [
        'Tudo ótimo por aqui! E você? Me conta no que posso ajudar.',
        'Estou bem, obrigada por perguntar. E você, como está? Se tiver alguma dúvida sobre a ELO, é só falar.'
      ]
    },
    {
      id: 'agradecimento', nome: 'um obrigado',
      exatos: ['obrigado', 'obrigada', 'valeu', 'brigado', 'brigada', 'muito obrigado', 'muito obrigada', 'agradecido', 'thanks', 'obg', 'vlw', 'valeu eloa', 'obrigada eloa', 'obrigado eloa', 'ajudou muito', 'ajudou'],
      respostas: [
        'Imagina! Se precisar de mais alguma coisa, estou aqui.',
        'De nada. Foi um prazer ajudar — volta sempre que quiser.',
        'Que isso, é para isso que eu existo. Qualquer outra dúvida, é só chamar.'
      ]
    },
    {
      id: 'despedida', nome: 'um tchau',
      exatos: ['tchau', 'ate logo', 'ate mais', 'adeus', 'falou', 'xau', 'ate breve', 'tchau eloa', 'ate amanha', 'fui', 'ate', 'bye'],
      respostas: [
        'Até logo! Cuide-se, e cuide bem de quem você ama.',
        'Tchau! Qualquer coisa, a ELO e eu estamos por aqui.'
      ]
    },
    {
      id: 'elogio', nome: 'um elogio',
      exatos: ['voce e legal', 'adorei', 'muito bom', 'gostei', 'voce e otima', 'parabens', 'incrivel', 'show', 'top', 'massa', 'demais', 'perfeito', 'otimo', 'legal', 'que legal', 'amei', 'muito legal', 'excelente', 'muito boa', 'boa demais'],
      respostas: [
        'Que bom! Fico feliz de verdade. Se quiser saber mais alguma coisa, é só falar.',
        'Obrigada! Ajudar você é a melhor parte do meu trabalho. Mais alguma dúvida?'
      ]
    },

    /* ---- sobre a Eloá -------------------------------------------------- */
    {
      id: 'nome_eloa', nome: 'o meu nome',
      fortes: ['qual seu nome', 'qual e o seu nome', 'qual o seu nome', 'como voce se chama', 'por que eloa', 'porque eloa', 'seu nome', 'quem e eloa', 'significa eloa'],
      respostas: [
        'Me chamo Eloá. Vem de ELO, o nome do projeto: a ideia é que eu seja o elo entre quem usa a pochete e quem cuida.',
        'Eloá! O nome vem de ELO, o projeto da pochete. Gosto dele — é curto e diz o que eu faço: ligar as pessoas.'
      ]
    },
    {
      id: 'real', nome: 'se eu sou uma pessoa',
      fortes: ['voce e real', 'voce e uma pessoa', 'e um robo', 'voce e um robo', 'e uma ia', 'voce e humana', 'e de verdade', 'voce e gente', 'e uma maquina', 'voce e de verdade', 'voce e humano', 'e humana', 'e humano', 'inteligencia artificial', 'voce e ia', 'e uma pessoa'],
      respostas: [
        'Sou uma assistente virtual, não uma pessoa — mas fui feita para conversar como uma. Pode falar comigo do seu jeito, sem cerimônia.',
        'Não sou gente, não. Sou a assistente do projeto ELO. Mas prometo que converso melhor que muito robô por aí.'
      ]
    },
    {
      id: 'eloa_funcionamento', nome: 'como eu funciono',
      fortes: ['como voce funciona', 'voce usa chatgpt', 'usa chatgpt', 'usa gemini', 'usa gpt', 'voce funciona com internet', 'voce precisa de internet', 'voce e feita', 'quem te fez', 'quem te criou', 'voce e uma ia', 'qual ia voce', 'que ia voce', 'voce e o chatgpt', 'openai', 'como voce sabe', 'de onde vem suas respostas', 'voce aprende'],
      respostas: [
        'Eu respondo com uma base de conhecimento que a equipe do ELO montou com tudo que está no site. Ela roda direto no seu navegador, então sou rápida e não preciso de internet para o que sei. Não uso ChatGPT nem Gemini para isso.\n\nSe você perguntar algo fora da minha base, posso tentar um servidor da equipe — mas aí depende dele estar acordado.',
        'Funciono de um jeito simples: reconheço o assunto da sua pergunta e respondo com o que a equipe escreveu sobre ele. Tudo acontece aqui no seu navegador, em milissegundos. Não sou o ChatGPT — sou feita sob medida para a ELO.'
      ]
    },
    {
      id: 'eloa_emergencia', nome: 'se eu chamo o SAMU',
      fortes: ['voce chama o samu', 'voce pode chamar', 'chama o samu por mim', 'voce liga', 'me ajuda numa emergencia', 'voce aciona', 'voce avisa', 'voce manda ajuda', 'chame o samu', 'chama uma ambulancia', 'liga para o samu', 'preciso de socorro agora', 'estou passando mal', 'me socorre'],
      respostas: [
        'Eu não aciono nada — sou só uma assistente de texto. Se for uma emergência agora, use o botão vermelho da pochete, que chama o SAMU e avisa o cuidador, ou ligue direto para o 192.',
        'Não consigo chamar ajuda por aqui. Para emergência de verdade, o caminho é o botão vermelho da pochete ou o telefone 192 (SAMU). Eu só explico como as coisas funcionam.'
      ]
    },
    {
      id: 'piada', nome: 'uma piada',
      fortes: ['piada', 'me faz rir', 'conta uma', 'algo engracado', 'me divirta', 'engracado'],
      respostas: ['Piada não é o meu forte, confesso. Mas eu sou ótima em explicar por que a pochete não afunda na chuva.'],
      seguimento: { texto: 'Quer que eu conte?', alvo: 'agua' }
    },
    {
      id: 'sobre_eloa', nome: 'o que eu faço',
      fortes: ['quem e voce', 'quem voce e', 'o que voce faz', 'o que voce sabe', 'voce pode me ajudar', 'me ajuda', 'o que voce pode', 'no que voce ajuda', 'preciso de ajuda', 'me ajude', 'pode ajudar', 'sobre o que posso perguntar', 'o que posso perguntar', 'me apresenta', 'se apresenta', 'quem fala'],
      fracas: ['eloa', 'assistente', 'ajudar', 'ajuda', 'duvida'],
      respostas: [
        'Sou a Eloá, a assistente do projeto ELO. Respondo dúvidas sobre a pochete, o app do cuidador e o uso no dia a dia.\n\nPode me perguntar sobre o botão de emergência, o transporte, os comandos de voz, a bateria, a localização, o preço, a garantia — ou sobre o projeto e a equipe.',
        'Eu sou a Eloá. Meu trabalho é explicar a ELO de um jeito simples: como a pochete funciona, como configurar, quanto custa, o que vem na caixa, quem fez. Pergunta o que quiser.'
      ]
    },

    /* ---- o projeto ----------------------------------------------------- */
    {
      id: 'o_que_e_elo', nome: 'o que é a ELO',
      fortes: ['o que e a elo', 'o que e elo', 'o que e a pochete', 'como funciona a elo', 'como funciona a pochete', 'me fala da elo', 'me fale sobre a elo', 'explica a elo', 'o que a elo faz', 'resumo', 'pochete inteligente', 'me explica', 'me fala tudo', 'fala tudo', 'tudo sobre', 'sobre o projeto', 'o que e o projeto', 'do que se trata', 'me conta sobre', 'visao geral', 'em resumo', 'o que e isso'],
      fracas: ['pochete', 'projeto', 'produto', 'elo', 'sobre'],
      respostas: [
        'A ELO é uma pochete inteligente feita para pessoas idosas, com um app para quem cuida.\n\nEla tem botão de emergência que aciona o SAMU (192), botão de transporte com aprovação do cuidador, comandos de voz, GPS em tempo real e bateria de até 48 horas. A ideia é dar autonomia para quem usa e tranquilidade para quem cuida.',
        'Pensa numa pochete comum — só que com um botão que chama o SAMU, outro que pede um carro com a aprovação de quem cuida, comando de voz e GPS. Isso é a ELO. Ela deixa {pessoa} sair sozinha com segurança, e você acompanha tudo pelo app.'
      ],
      seguimento: { texto: 'Quer que eu liste todas as funcionalidades?', alvo: 'funcionalidades' }
    },
    {
      id: 'funcionalidades', nome: 'as funcionalidades',
      fortes: ['funcionalidade', 'funcoes', 'funcao', 'recurso', 'feature', 'serve para que', 'para que serve', 'serve para', 'quero saber tudo', 'saber tudo', 'o que mais', 'mais alguma coisa', 'mais funcoes', 'outras funcoes', 'o que ela faz', 'o que a pochete faz', 'o que ela tem', 'o que tem', 'oferece', 'beneficio', 'vantagem', 'capaz de', 'consegue fazer', 'ela faz o que', 'faz o que', 'o que faz', 'o que da para fazer', 'o que posso fazer', 'principais', 'lista'],
      fracas: ['tudo', 'quais', 'todas', 'pode', 'serve'],
      respostas: [
        'As principais funcionalidades da ELO são:\n\n• Botão de emergência — um toque chama o SAMU (192) e avisa o cuidador com a localização\n• Botão de transporte — pede um carro, e o cuidador aprova antes\n• Comandos de voz — "Oi ELO" para ligar, pedir carro, saber onde está ou chamar ajuda\n• Localização em tempo real — GPS no mapa do app, com histórico do dia\n• App do cuidador — alertas, aprovações, cadastro e notificações\n• Bateria de até 48 horas, com carga USB-C\n• Resistente a chuva e respingos (IP63)',
        'Ela faz cinco coisas principais: chama o SAMU pelo botão vermelho, pede transporte pelo botão amarelo (com aprovação do cuidador), obedece a comandos de voz, mostra a localização em tempo real no app e avisa o cuidador de tudo isso. Fora isso, a bateria dura até 48 horas e ela aguenta chuva.'
      ],
      seguimento: { texto: 'Quer que eu detalhe alguma delas?', alvo: null }
    },
    {
      id: 'diferencial', nome: 'o diferencial da ELO',
      fortes: ['diferencial', 'diferente', 'diferenca', 'e boa', 'e bom', 'vale a pena', 'compensa', 'recomenda', 'funciona bem', 'confiavel', 'e confiavel', 'qualidade', 'por que escolher', 'porque escolher', 'por que a elo', 'porque a elo', 'e melhor', 'melhor que', 'unica', 'unico', 'inovacao', 'inovador', 'o que tem de especial', 'especial', 'concorrente', 'outras marcas', 'existe algo parecido', 'no mercado', 'primeira'],
      fracas: ['melhor', 'vale a pena', 'compensa', 'destaque'],
      respostas: [
        'O diferencial é a combinação: a ELO é a única solução que junta pochete inteligente com app integrado, oferecendo comandos de voz, aprovação de transporte pelo cuidador e acionamento direto do SAMU — tudo num objeto simples, sem tela.\n\nNão é só tecnologia: é cuidado humanizado. 100% do foco no idoso, monitoramento 24/7, e a primeira do mercado nesse formato.',
        'O que ela tem de diferente é não exigir que a pessoa idosa lide com tela nenhuma. São botões físicos e voz. E do outro lado, quem cuida tem o app com tudo: alertas, aprovação de corrida, localização. Essa dupla — objeto simples para quem usa, app completo para quem cuida — é o que não existe pronto no mercado.'
      ],
      seguimento: { texto: 'Quer saber por que isso é melhor que um celular ou um relógio?', alvo: 'comparacao' }
    },
    {
      id: 'comparacao', nome: 'a comparação com celular ou relógio',
      fortes: ['celular', 'smartwatch', 'relogio', 'pulseira', 'smartphone', 'por que nao usar', 'porque nao usar', 'melhor que', 'em vez de', 'ao inves de', 'alternativa', 'apple watch', 'galaxy watch', 'telefone comum', 'so um telefone'],
      fracas: ['comparar', 'diferenca', 'vantagem', 'usar'],
      respostas: [
        'A diferença está em quem vai usar. Celular e relógio inteligente pedem tela, toque, menus, senha — e é justamente isso que trava muita gente idosa. A ELO tem botões físicos grandes e comando de voz: para chamar ajuda é um toque, para pedir carro é outro.\n\nE tem a parte de quem cuida: o cuidador aprova a corrida antes de sair e recebe a localização no alerta. Isso um celular comum não faz.',
        'Um celular exige que a pessoa saiba usar celular. A ELO não exige nada: um botão vermelho para emergência, um amarelo para transporte, e a voz para o resto. Foi feita para quem tem dificuldade com tecnologia — e para a família acompanhar sem precisar ficar ligando.'
      ]
    },
    {
      id: 'missao', nome: 'a missão do projeto',
      fortes: ['missao', 'objetivo', 'proposito', 'por que criaram', 'porque criaram', 'por que fizeram', 'porque fizeram', 'motivacao', 'ideia do projeto', 'de onde veio', 'como surgiu', 'inspiracao', 'valores', 'pilares', 'autonomia', 'dignidade'],
      fracas: ['criar', 'surgiu', 'nasceu', 'sonho', 'meta', 'querem'],
      respostas: [
        'A missão da ELO é desenvolver tecnologia para a terceira idade que fortaleça o elo entre as famílias — um futuro onde envelhecer é sinônimo de liberdade com proteção.\n\nO objetivo prático é dar autonomia e segurança para a pessoa idosa, e reduzir a ansiedade de quem cuida. Os três pilares são autonomia, segurança e dignidade.',
        'A ideia nasceu de uma pergunta simples: como deixar {pessoa} sair sozinha sem a família ficar aflita? A resposta foi uma pochete que cuida sem vigiar. Os pilares do projeto são autonomia, segurança e dignidade — tecnologia que respeita o ritmo e a privacidade de cada pessoa.'
      ]
    },

    /* ---- emergência ---------------------------------------------------- */
    {
      id: 'emergencia', nome: 'o botão de emergência',
      fortes: ['emergenc', 'sos', '192', 'samu', 'socorro', 'botao vermelho', 'ambulancia'],
      fracas: ['vermelh', 'panico', 'alerta', 'acidente', 'queda', 'cair', 'caiu', 'passar mal', 'urgenc', 'hospital', 'ajuda'],
      respostas: [
        'O botão vermelho é o de emergência. Um toque aciona o SAMU (192) e avisa o cuidador na hora, com a localização da pochete.\n\nAntes de usar de verdade, teste pelo modo demonstração no app — assim você confirma que está tudo funcionando sem chamar o SAMU.',
        'É o botão vermelho. Quando {pessoa} aperta, duas coisas acontecem ao mesmo tempo: o SAMU (192) é acionado e você recebe um alerta no app com a localização.\n\nDá para testar em modo demonstração, sem chamar o SAMU de verdade — e é bom fazer isso assim que configurar.'
      ],
      seguimento: { texto: 'Quer que eu mostre como fazer esse teste pelo app?', alvo: 'configurar' }
    },
    {
      id: 'emergencia_detalhes', nome: 'os detalhes do botão de emergência',
      fortes: ['sem querer', 'por engano', 'acidentalmente', 'cancelar', 'cancela', 'desfazer', 'demora', 'quanto tempo leva', 'chega o alerta', 'nao conseguir apertar', 'nao consegue apertar', 'nao apertar', 'nao aperta', 'cair e nao', 'desmaiar', 'desmaiou', 'detecta queda', 'detecta', 'sensor de queda', 'sozinha', 'automatico', 'automaticamente', 'o samu vem', 'vem mesmo', 'falso alarme'],
      fracas: ['apertar', 'apertou', 'aperta', 'botao', 'engano', 'tempo'],
      respostas: [
        'Vou te dizer o que está no manual e o que não está.\n\nO que está: o acionamento é pelo botão — a pessoa aperta, o SAMU é chamado e o cuidador recebe o alerta com a localização. Para não disparar por engano nos testes, existe o modo demonstração no app, e a orientação é não pressionar em modo real sem necessidade.\n\nO que não está descrito: detecção automática de queda e como cancelar um chamado já feito. Se isso é importante para você, vale perguntar direto à equipe pelo formulário em Quem Somos.',
        'Hoje o acionamento é manual: {pessoa} aperta o botão vermelho e o SAMU é chamado junto com o alerta para você. O site não descreve detecção automática de queda nem um passo para cancelar depois de acionado — então, para não te dar uma resposta inventada, o melhor é confirmar isso com a equipe. O formulário fica na página Quem Somos.'
      ]
    },

    {
      id: 'alertas', nome: 'quem recebe os alertas',
      fortes: ['avisa', 'avisar', 'aviso', 'avisada', 'avisado', 'quem recebe', 'fica sabendo', 'ficam sabendo', 'notifica', 'notificacao', 'familia recebe', 'familia fica', 'como eu sei', 'como vou saber', 'me avisa', 'sou avisado', 'sou avisada', 'recebe o alerta', 'recebe alerta'],
      fracas: ['alerta', 'familia', 'cuidador', 'mensagem', 'chega'],
      respostas: [
        'Quem recebe os alertas é o cuidador cadastrado no app — a pessoa que criou a conta e vinculou a pochete. E dá para cadastrar mais de um contato de emergência, então outros familiares também podem ser avisados.\n\nO aviso chega como notificação no celular, com a localização de {pessoa}. Isso vale para o botão de emergência, para o pedido de transporte (que espera sua aprovação) e para o que você configurar nas notificações.',
        'O app avisa. Quando {pessoa} aperta o botão de emergência, o cuidador recebe uma notificação com a localização na mesma hora; quando pede transporte, chega um pedido de aprovação. Você escolhe quem entra como contato de emergência — e pode ser mais de uma pessoa da família.'
      ],
      seguimento: { texto: 'Quer saber como cadastrar mais de um contato?', alvo: 'app_detalhes' }
    },

    /* ---- transporte ---------------------------------------------------- */
    {
      id: 'transporte', nome: 'o botão de transporte',
      fortes: ['uber', 'corrida', 'transport', 'botao amarelo', 'pedir carro', 'chamar carro', 'chamar um carro', 'taxi', 'motorista'],
      fracas: ['amarel', 'aprov', 'recus', 'negar', 'viagem', 'buscar', 'levar', 'ir ate', 'carro', 'locomo'],
      respostas: [
        'O botão amarelo pede um carro. Quando {pessoa} aperta, você recebe uma notificação no app e pode aprovar ou recusar a corrida antes de ela ser chamada.\n\nPara funcionar, é só vincular uma conta Uber no app e definir as permissões.',
        'Funciona assim: {pessoa} aperta o botão amarelo, e a corrida não sai na hora — primeiro chega uma notificação para você aprovar ou recusar. Só depois do seu ok o carro é chamado.\n\nVocê vincula a conta Uber uma vez, no app, e pronto.'
      ],
      seguimento: { texto: 'Quer saber como configurar isso no app?', alvo: 'app' }
    },
    {
      id: 'transporte_detalhes', nome: 'os detalhes do transporte',
      fortes: ['99', 'quem paga', 'paga a corrida', 'pagar a corrida', 'nao responder', 'nao responde', 'nao aprovar', 'sem aprovacao', 'se eu nao ver', 'outro aplicativo de transporte', 'indriver', 'cabify'],
      fracas: ['pagamento', 'cobra', 'cartao', 'aplicativo', 'demorar'],
      respostas: [
        'Pelo que está descrito, o transporte funciona com uma conta Uber vinculada no app — então a corrida é cobrada nessa conta, como qualquer corrida do Uber. Outros aplicativos, como 99, não aparecem no site; se for essencial para você, confirme com a equipe.\n\nE a corrida só é chamada depois da sua aprovação: sem resposta, ela não sai.',
        'A conta é a do Uber, vinculada no app pelo cuidador — a cobrança vai para ela. Sobre 99 ou outros aplicativos, o site não menciona, então não vou te prometer. E vale lembrar: a corrida só sai depois que você aprova; sem o seu ok, nada é chamado.'
      ]
    },

    /* ---- voz ----------------------------------------------------------- */
    {
      id: 'voz', nome: 'os comandos de voz',
      fortes: ['comando de voz', 'comandos de voz', 'por voz', 'oi elo', 'microfone', 'alto falante', 'reconhece', 'falar com ela', 'falar com a pochete', 'falando', 'ela fala', 'que comandos', 'quais comandos', 'comandos tem', 'ativa por voz', 'ativar por voz'],
      fracas: ['voz', 'fala', 'audio', 'som', 'escuta', 'ouvir', 'comando', 'responde', 'dizer'],
      respostas: [
        'É só dizer "Oi ELO" para ativar. Depois, {pessoa} pode falar:\n• "Ligar para [nome]"\n• "Onde estou?"\n• "Chamar transporte"\n• "Emergência"\n\nA pochete responde em áudio, confirmando cada comando.',
        'A pochete escuta. Diga "Oi ELO" e depois o comando: "Ligar para Maria", "Onde estou?", "Chamar transporte" ou "Emergência". Ela responde falando, para {pessoa} não precisar olhar para tela nenhuma.'
      ],
      seguimento: { texto: 'Quer que eu explique o que acontece quando ela fala "Emergência"?', alvo: 'emergencia' }
    },
    {
      id: 'voz_detalhes', nome: 'os limites do comando de voz',
      fortes: ['fala baixo', 'voz baixa', 'sotaque', 'nao ouvir', 'nao escuta', 'nao entende', 'nao entender', 'barulho', 'lugar barulhento', 'rouco', 'gaguej', 'idioma', 'ingles', 'espanhol', 'outra lingua', 'so em portugues'],
      fracas: ['entende', 'ouve', 'escutar', 'reconhecer'],
      respostas: [
        'O reconhecimento é por voz, com a palavra de ativação "Oi ELO", em português. Sobre sotaque forte, voz baixa ou lugares barulhentos, o site não traz testes — então não vou te garantir.\n\nO que eu posso garantir: os botões físicos funcionam sempre, independente da voz. Emergência e transporte nunca dependem de a pochete entender a fala.',
        'A voz é uma comodidade; os botões são a garantia. Se {pessoa} fala baixo ou o lugar está barulhento, o botão vermelho e o amarelo continuam funcionando com um toque. Sobre a precisão do reconhecimento em cada situação, quem pode detalhar é a equipe.'
      ]
    },

    /* ---- bateria ------------------------------------------------------- */
    {
      id: 'bateria', nome: 'a bateria',
      fortes: ['bateria', 'carreg', 'usb', 'energia', 'autonomia', 'quanto dura', 'quanto tempo dura', 'recarga'],
      fracas: ['dura', 'horas', 'tomada', 'cabo', 'acaba', 'descarreg', 'recarreg', 'pilha', 'fonte'],
      respostas: [
        'A bateria dura até 48 horas de uso. Uma carga completa leva cerca de 2 horas, pela entrada USB-C — o carregador vem na caixa.\n\nA dica é carregar todo dia à noite, aí nunca pega ninguém desprevenido.',
        'Até 48 horas. E carrega rápido: umas 2 horas na tomada, com o carregador USB-C que vem junto.\n\nEu recomendo criar o hábito de deixar carregando à noite, junto com o celular.'
      ],
      seguimento: { texto: 'Quer que eu explique como ligar a pochete pela primeira vez?', alvo: 'configurar' }
    },
    {
      id: 'bateria_detalhes', nome: 'o que acontece se a bateria acabar',
      fortes: ['acabar na rua', 'acabar a bateria', 'bateria acabar', 'ficar sem bateria', 'avisa quando', 'aviso de bateria', 'bateria fraca', 'qualquer carregador', 'carregador de celular', 'carregador comum', 'outro carregador', 'powerbank', 'power bank'],
      fracas: ['acabar', 'fraca', 'carregador'],
      respostas: [
        'Se a bateria acabar, a pochete para de funcionar até ser recarregada — os botões e o GPS dependem dela. Por isso a orientação é carregar toda noite: com 48 horas de autonomia, uma noite pulada ainda não deixa ninguém na mão.\n\nA entrada é USB-C, então em tese um carregador de celular USB-C serve. O que vem na caixa é um de 5V/2A; se usar outro, prefira um parecido.',
        'Sem bateria, sem pochete — ela precisa de carga para tudo. A boa notícia: são 48 horas por carga e a recarga leva umas 2 horas. Vira rotina rápido. E como a entrada é USB-C, dá para carregar com um carregador de celular USB-C na emergência, mas o ideal é o que vem na caixa (5V/2A).'
      ]
    },

    /* ---- localização / conectividade / privacidade --------------------- */
    {
      id: 'localizacao', nome: 'a localização',
      fortes: ['gps', 'localiz', 'onde esta', 'onde ela esta', 'onde ele esta', 'onde meu', 'onde minha', 'rastre', 'mapa', 'tempo real', 'geolocal'],
      fracas: ['posicao', 'lugar', 'perdid', 'historico', 'endereco', 'saber onde', 'acompanhar', 'monitor', 'caminho'],
      respostas: [
        'A pochete tem GPS e manda a localização em tempo real para o app. Lá você vê onde {pessoa} está no mapa e o histórico de atividades do dia.',
        'Sim, ela mostra onde {pessoa} está, o tempo todo, no mapa do app. E guarda o histórico do dia — então dá para ver o caminho que fez, não só onde está agora.'
      ],
      seguimento: { texto: 'Quer saber como baixar e configurar o app?', alvo: 'app' }
    },
    {
      id: 'conectividade', nome: 'a conexão da pochete',
      fortes: ['chip', 'internet', 'wifi', 'wi fi', '4g', '3g', '5g', 'sinal', 'dados moveis', 'plano', 'operadora', 'alcance', 'longe do celular', 'sem celular por perto', 'precisa do celular', 'qualquer lugar', 'todo o brasil', 'sem sinal', 'area rural', 'interior', 'conexao'],
      fracas: ['bluetooth', 'conecta', 'funciona sem', 'precisa de', 'cobertura', 'rede'],
      respostas: [
        'A pochete tem conexão própria: um módulo GPS/GPRS (o SIM800L) cuida da localização e de mandar os alertas pela rede celular, e um ESP32 faz Wi-Fi e Bluetooth — o Bluetooth é usado para parear com o app na configuração.\n\nOu seja: ela não depende de o celular estar do lado para funcionar na rua. Onde tem sinal de celular, ela funciona. Sobre chip e plano de dados (se vem incluso ou como é contratado), o site não detalha — confirme com a equipe.',
        'Ela funciona com rede celular própria, por um módulo GPRS — é assim que o GPS e os alertas chegam ao app mesmo com {pessoa} longe de casa. O Bluetooth serve para a configuração inicial com o celular. O que eu não sei te dizer é como fica o chip e o plano: isso a equipe precisa confirmar.'
      ]
    },
    {
      id: 'privacidade', nome: 'a privacidade dos dados',
      fortes: ['privacidade', 'dados', 'seguro', 'seguranca dos dados', 'quem ve', 'quem ve a localizacao', 'quem tem acesso', 'hack', 'invadir', 'invasao', 'roub', 'grava', 'gravacao', 'escuta tudo', 'espiona', 'vigia', 'lgpd', 'compartilha', 'vende dados', 'invasivo', 'invasiva', 'controle', 'vigilancia'],
      fracas: ['acesso', 'informacao', 'protegido', 'confidencial', 'respeita'],
      respostas: [
        'A localização e os alertas vão para o cuidador cadastrado no app — não para uma central pública. E um dos três pilares do projeto é a dignidade: tecnologia que respeita o ritmo e a privacidade de cada pessoa. A proposta é acompanhar sem ser invasivo.\n\nO site não publica uma política de dados completa (o que é guardado, por quanto tempo); se você precisa desse detalhe, peça à equipe pelo formulário.',
        'Quem vê a localização é quem você cadastrar como cuidador no app. O projeto foi desenhado com a ideia de "monitorar sem ser invasivo" — a privacidade de {pessoa} é um dos pilares. Sobre gravação de áudio e política de dados, o site não entra em detalhes técnicos; a equipe pode responder isso com precisão.'
      ]
    },

    /* ---- app ----------------------------------------------------------- */
    {
      id: 'app', nome: 'o app do cuidador',
      fortes: ['aplicativo', 'app', 'play store', 'app store', 'google play', 'notific', 'baixar', 'instalar o app', 'cadastr', 'loja de aplicativo'],
      fracas: ['celular', 'conta', 'instalar', 'cuidador', 'login', 'senha', 'perfil', 'tela'],
      respostas: [
        'O app ELO está na App Store e no Google Play. Você cria a conta como cuidador e cadastra os dados de {pessoa}: nome, idade, contatos de emergência e informações médicas importantes.\n\nPelo app você recebe os alertas, aprova corridas, acompanha a localização e configura as notificações.',
        'Baixa na App Store ou no Google Play, cria sua conta de cuidador e cadastra {pessoa} — nome, idade, contatos de emergência e o que for importante de saúde.\n\nDepois é por lá que tudo acontece: alertas, aprovação de corrida, localização. E dá para cadastrar mais de um contato de emergência.'
      ],
      seguimento: { texto: 'Quer que eu passe o passo a passo para conectar a pochete ao app?', alvo: 'configurar' }
    },
    {
      id: 'app_detalhes', nome: 'os detalhes do app',
      fortes: ['mais de um idoso', 'dois idosos', 'varios idosos', 'mais de uma pessoa', 'quantos cuidadores', 'mais de um cuidador', 'varios cuidadores', 'irmao', 'irma', 'outra pessoa tambem', 'tambem pode receber', 'tambem recebe', 'app e gratuito', 'app gratis', 'app e pago', 'paga pelo app', 'mensalidade', 'assinatura', 'iphone', 'ios', 'android', 'samsung', 'motorola', 'xiaomi', 'preciso de conta', 'criar conta', 'versao'],
      fracas: ['gratuito', 'gratis', 'pago', 'mais de um', 'familia', 'todos'],
      respostas: [
        'Tem app para os dois: iPhone (App Store) e Android (Google Play). Você cria uma conta de cuidador e cadastra as pessoas idosas que acompanha — o site fala em "cadastrar idosos", no plural.\n\nPara mais de um familiar receber os alertas, o caminho é cadastrar vários contatos de emergência — o manual recomenda isso. Sobre o app ter cobrança à parte, o site não menciona nenhuma: o valor da pochete inclui suporte e atualizações.',
        'iPhone e Android, os dois. A conta é do cuidador, e nela você cadastra quem acompanha. Outros familiares podem entrar como contatos de emergência — o app aceita vários, e a dica do manual é justamente cadastrar mais de um.\n\nMensalidade ou cobrança pelo app não aparecem em lugar nenhum do site; o que está lá é o preço da pochete com suporte e atualizações inclusos.'
      ]
    },

    /* ---- uso ----------------------------------------------------------- */
    {
      id: 'configurar', nome: 'como configurar',
      fortes: ['configur', 'parear', 'bluetooth', 'ligar a pochete', 'ligar pochete', 'liga a pochete', 'ligo a pochete', 'primeiro uso', 'primeira vez', 'por onde comeco', 'como comecar', 'como comeco', 'ativar a pochete', 'conectar a pochete', 'botao lateral', 'passo a passo', 'modo demonstracao', 'testar', 'instalacao', 'como instalo', 'como ligo', 'como liga', 'ligo ela', 'liga ela', 'fazer o teste', 'faco o teste', 'o teste', 'conecta no celular', 'conectar no celular'],
      fracas: ['conectar', 'passo', 'instru', 'manual', 'tutorial', 'comecar', 'ligar', 'liga', 'ligo', 'desligar', 'sincroniz', 'instalar', 'teste', 'setup'],
      respostas: [
        'Para começar:\n1. Carregue a pochete por completo (cerca de 2 horas).\n2. Ligue segurando o botão lateral por 3 segundos.\n3. Abra o app e conecte via Bluetooth, seguindo as instruções na tela.\n4. Faça um teste do botão de emergência em modo demonstração.\n\nA página de Instruções tem tudo isso com o modelo 3D da pochete mostrando cada parte.',
        'É rápido. Carrega por completo, segura o botão lateral por 3 segundos até ligar, abre o app e conecta pelo Bluetooth. Por último, faz um teste do botão de emergência em modo demonstração — sem chamar o SAMU de verdade.\n\nSe quiser ver cada peça, a página de Instruções tem a pochete em 3D.'
      ],
      seguimento: { texto: 'Ficou alguma dúvida em algum desses passos?', alvo: null }
    },
    {
      id: 'uso_diario', nome: 'o uso no dia a dia',
      fortes: ['dia a dia', 'no dia', 'rotina', 'usar sempre', 'precisa usar', 'tem que usar', 'o tempo todo', 'dormir', 'dormindo', 'a noite', 'em casa', 'dentro de casa', 'cintura', 'colocar', 'coloca', 'tirar', 'tira', 'vestir', 'veste', 'como usa', 'como usar', 'quando usar', 'quando usa', 'sair de casa', 'sempre que sair'],
      fracas: ['usar', 'uso', 'usa', 'levar', 'carregar junto', 'habito'],
      respostas: [
        'A orientação é simples: {pessoa} usa a pochete sempre que sair de casa — é na rua que o GPS, o botão de emergência e o transporte fazem diferença. À noite, a pochete fica carregando, e de manhã está pronta.\n\nEla vai na cintura, com o cinto ajustável, como uma pochete comum. O app do cuidador mostra a localização e o histórico do dia, e você configura as notificações do jeito que preferir.',
        'Sai de casa, leva a pochete. Volta, deixa carregando à noite. É basicamente isso. Ela ajusta na cintura como qualquer pochete, e o resto é automático: a localização vai para o app, os botões ficam à mão. Não precisa usar dormindo — o momento dela é a rua.'
      ],
      seguimento: { texto: 'Quer saber quanto tempo a bateria aguenta por dia?', alvo: 'bateria' }
    },
    {
      id: 'design', nome: 'a aparência e o conforto',
      fortes: ['confort', 'pesa', 'peso', 'leve', 'quanto pesa', 'tamanho', 'grande', 'pequena', 'medida', 'cor', 'cores', 'outra cor', 'preta', 'branca', 'bonita', 'feia', 'aparencia', 'design', 'visual', 'como ela e', 'como e a pochete', 'material', 'tecido', 'estilo', 'discreta', 'chama atencao', 'parece'],
      fracas: ['elegante', 'compacta', 'leve', 'ajust', 'modelo'],
      respostas: [
        'Ela é uma pochete tática de tecido resistente, com ajuste de cintura — compacta e discreta, pensada para não chamar atenção. O site a descreve como "compacta e elegante".\n\nPeso exato, medidas e opções de cor não estão publicados. Se isso pesa na decisão, pergunte à equipe pelo formulário — e a página de Produto tem o modelo 3D para você ver a forma dela por todos os ângulos.',
        'Por fora, é uma pochete normal: tecido resistente, cinto ajustável, formato compacto. A ideia é justamente essa — parecer uma pochete comum, não um equipamento. Cores e peso o site não informa; o modelo 3D na página de Produto mostra bem o formato.'
      ]
    },
    {
      id: 'agua', nome: 'a resistência à água',
      fortes: ['agua', 'chuva', 'molh', 'ip63', 'ip65', 'banho', 'mergulh', 'submerg', 'prova d agua', 'a prova', 'suor', 'umidade', 'lavar', 'lava'],
      fracas: ['resist', 'piscina', 'praia', 'lavar', 'limpar', 'aguenta'],
      respostas: [
        'Pode ficar tranquilo com chuva e respingos: ela tem certificação IP63. O que não pode é mergulhar — nada de banho ou piscina com ela.',
        'Chuva, suor, respingo — tudo bem, ela é IP63. Só não é à prova de mergulho, então tira antes do banho.'
      ]
    },

    /* ---- compra -------------------------------------------------------- */
    {
      id: 'preco', nome: 'o preço',
      fortes: ['preco', 'custa', 'custo', 'valor', 'reais', 'r$', 'parcel', 'quanto e', 'quanto custa', 'quanto sai', 'quanto fica', 'quanto vale', 'pagar', 'pagamento', 'caro', 'barato', 'dividir', 'divide', 'parcelamento'],
      fracas: ['investimento', 'desconto', 'promocao', 'vezes', 'juros', 'cartao', 'pix', 'boleto', 'quanto'],
      respostas: [
        'A ELO completa custa R$ 997 à vista, ou 12× de R$ 89,90 sem juros. Isso já inclui garantia de 12 meses, suporte 24/7 e atualizações gratuitas.\n\nSe quiser ver de onde vem esse valor, a página de Produto mostra o custo de cada componente — R$ 446 por unidade.',
        'R$ 997 à vista, ou 12 parcelas de R$ 89,90. Vem com garantia de um ano, suporte 24 horas e atualizações sem custo.\n\nA gente é transparente sobre isso: a tabela de componentes na página de Produto mostra que cada unidade custa R$ 446 para produzir.'
      ],
      seguimento: { texto: 'Quer saber o que vem na caixa?', alvo: 'caixa' }
    },
    {
      id: 'comercial', nome: 'compra, entrega e pagamento',
      fortes: ['quando lanca', 'lancamento', 'ja esta a venda', 'esta a venda', 'a venda', 'disponivel', 'estoque', 'desconto', 'promocao', 'cupom', 'alugar', 'aluguel', 'entrega', 'frete', 'prazo', 'nota fiscal', 'aceita cartao', 'formas de pagamento', 'forma de pagamento', 'pix', 'boleto', 'cartao de credito', 'parcelamento', 'onde compro', 'como compro', 'quero comprar', 'comprar', 'compra', 'pedido', 'encomend', 'reservar', 'reserva', 'pre venda', 'quando chega', 'quando recebo', 'devolucao', 'arrependimento', 'troca'],
      fracas: ['vender', 'loja', 'site', 'mercado livre', 'amazon', 'shopee'],
      respostas: [
        'O que eu sei com certeza: o preço é R$ 997 à vista ou 12× de R$ 89,90, e a reserva é feita falando com a equipe pelo formulário da página Quem Somos — você fala direto com quem desenvolveu.\n\nO que o site não detalha: prazo e área de entrega, formas de pagamento, nota fiscal, desconto e aluguel. Essas condições a equipe fecha com você diretamente. A página de Produto tem o botão "Quero uma ELO" que leva ao formulário.',
        'Para comprar ou reservar, o caminho é o formulário em Quem Somos — a equipe responde e combina os detalhes. O preço é R$ 997 (ou 12× de R$ 89,90).\n\nCondições de entrega, pagamento, nota fiscal e desconto não estão publicadas no site, então prefiro não te prometer nada: pergunte diretamente e eles confirmam.'
      ]
    },
    {
      id: 'garantia', nome: 'a garantia e o suporte',
      fortes: ['garantia', 'suporte', 'assistencia', 'defeito', 'quebr', 'conserto', 'consertar', 'devolu', 'estrag', 'parou de funcionar', 'nao funciona', 'nao liga', 'deu problema', 'com problema', 'travou', 'atendimento'],
      fracas: ['problema', 'ajuda tecnica', 'atualiz', 'reparo', 'manutencao', 'resolver'],
      respostas: [
        'A ELO tem garantia de 12 meses e suporte técnico 24 horas, 7 dias por semana, em português, direto pelo app. As atualizações de software são gratuitas.\n\nSe a pochete não ligar, tenta carregar por completo (umas 2 horas) e segurar o botão lateral por 3 segundos. Se continuar, o suporte resolve.',
        'Um ano de garantia e suporte 24/7 em português, pelo próprio app. Atualizações não custam nada.\n\nSe for problema de não ligar, antes de acionar o suporte: carrega por completo e segura o botão lateral por 3 segundos. Na maioria das vezes é só isso.'
      ]
    },
    {
      id: 'caixa', nome: 'o que vem na caixa',
      fortes: ['caixa', 'incluso', 'inclui', 'vem com', 'acompanha', 'embalagem', 'kit', 'o que vem', 'vem junto', 'itens', 'conteudo'],
      fracas: ['manual', 'carregador', 'cabo', 'acessorio', 'junto'],
      respostas: [
        'Na caixa vem:\n• A pochete ELO completa e montada\n• Carregador USB-C com cabo de 1,5 m\n• Manual ilustrado em português\n\nE junto: garantia de 12 meses, suporte 24/7 e atualizações de software gratuitas.',
        'Vem a pochete pronta para usar, o carregador USB-C com cabo de 1,5 metro e um manual ilustrado em português. Fora isso, você leva um ano de garantia, suporte 24 horas e atualizações gratuitas.'
      ]
    },
    {
      id: 'para_quem', nome: 'para quem é a ELO',
      fortes: ['para quem', 'pra quem', 'publico', 'indicad', 'serve para', 'quem pode usar', 'pessoa idosa', 'idoso', 'idosa', 'terceira idade', 'qual idade', 'a partir de', 'crianca', 'jovem', 'adulto', 'deficiencia', 'cadeirante'],
      fracas: ['familia', 'cuidador', 'instituic', 'geriatr', 'idade', 'anos', 'alzheimer', 'demencia', 'sozinh', 'quem'],
      respostas: [
        'A ELO foi pensada para pessoas idosas que valorizam a independência, mas precisam de uma segurança extra — e para as famílias e cuidadores que querem acompanhar sem ser invasivos.\n\nTambém atende instituições de cuidado e profissionais de geriatria. Não há uma idade mínima fixada: o critério é a necessidade, não o número.',
        'Para quem quer continuar saindo sozinho, mas sem deixar a família aflita. É para a pessoa idosa que usa e, ao mesmo tempo, para quem cuida e quer acompanhar de longe, com respeito. Instituições e profissionais de geriatria também usam.'
      ],
      seguimento: { texto: 'Quer que eu explique como {pessoa} usaria no dia a dia?', alvo: 'uso_diario' }
    },

    /* ---- equipe, ciência, contato, tecnologia -------------------------- */
    {
      id: 'equipe', nome: 'a equipe',
      fortes: ['equipe', 'quem fez', 'quem criou', 'quem desenvolv', 'quem somos', 'criador', 'desenvolvedor', 'integrantes', 'alunos', 'quem esta por tras', 'quem faz', 'time', 'quem sao voces', 'quem e voces', 'membros', 'fundador', 'de que escola', 'qual escola', 'qual faculdade', 'de onde sao', 'instituicao'],
      fracas: ['geovana', 'guilherme', 'luiz', 'luiza', 'pedro', 'escola', 'faculdade', 'estudante', 'grupo', 'voces'],
      respostas: [
        'A ELO é feita por uma equipe de cinco pessoas: Geovana Ribeiro e Luiza Gonçalves (design UX/UI), Guilherme Moraes (design de jogos), Luiz Henrique (hardware e IoT) e Pedro Henrique (desenvolvimento full stack).\n\nA página Quem Somos conta mais sobre cada um. A instituição de ensino não está informada no site.',
        'Somos cinco: a Geovana e a Luiza cuidam do design, o Guilherme do jogo, o Luiz Henrique do hardware e o Pedro do app. Dá para conhecer todo mundo na página Quem Somos.'
      ]
    },
    {
      id: 'referencias', nome: 'a base científica',
      fortes: ['referenc', 'artigo', 'cientific', 'pesquisa', 'estudo', 'bibliograf', 'embasamento', 'academic', 'base teorica', 'fundamentacao', 'comprovad', 'evidencia'],
      fracas: ['fonte', 'universidade', 'revisad', 'prova', 'ciencia', 'teoria'],
      respostas: [
        'O projeto se apoia em 5 artigos revisados por pares, nas áreas de tecnologia assistiva, envelhecimento ativo, sistemas IoT para saúde e design centrado no usuário. A lista completa, com autores e instituições, está na página de Referências.',
        'Tem base científica, sim: cinco artigos revisados por pares sobre tecnologia assistiva, envelhecimento ativo, IoT na saúde e design centrado no usuário. Estão todos listados na página de Referências.'
      ]
    },
    {
      id: 'contato', nome: 'como falar com a equipe',
      fortes: ['contato', 'falar com a equipe', 'falar com voces', 'falo com voces', 'fala com voces', 'contato com voces', 'falar com alguem', 'falar com uma pessoa', 'atendente', 'humano', 'email', 'e mail', 'telefone', 'whatsapp', 'instagram', 'redes sociais', 'formulario', 'mensagem para', 'entrar em contato'],
      fracas: ['falar', 'equipe', 'contatar', 'escrever'],
      respostas: [
        'Para falar com a equipe, use o formulário na página Quem Somos — você fala direto com quem desenvolveu o produto.\n\nSe for para reservar uma ELO, a página de Produto tem o botão "Quero uma ELO" que leva ao mesmo formulário.',
        'O caminho é o formulário da página Quem Somos: cai direto com a equipe que fez a pochete. Telefone e redes sociais não estão publicados no site — o formulário é o canal.'
      ]
    },
    {
      id: 'componentes', nome: 'os componentes',
      fortes: ['componente', 'esp32', 'sim800', 'pcb', 'placa', 'hardware', 'sensor', 'chip', 'arduino', 'microcontrolador', 'como e feita', 'feita de', 'por dentro', 'tecnologia usada', 'especificac', 'ficha tecnica', 'peca'],
      fracas: ['tecnologia', 'eletron', 'circuito', 'modulo', 'material', 'processador'],
      respostas: [
        'Por dentro, a ELO usa um módulo GPS/GPRS SIM800L, um ESP32 (Wi-Fi e Bluetooth), bateria Li-Po de 2000 mAh, módulo de áudio com microfone, alto-falante, três botões táticos e uma placa PCB própria, tudo dentro de uma pochete tática ajustável.\n\nA tabela com todos os componentes e valores está na página de Produto.',
        'O cérebro é um ESP32, que cuida do Wi-Fi e do Bluetooth. O GPS e a conexão celular vêm de um módulo SIM800L. Tem bateria de 2000 mAh, microfone, alto-falante e três botões, tudo numa placa feita pela equipe. A lista completa, com preço de cada peça, está na página de Produto.'
      ]
    },
    {
      id: 'site', nome: 'as páginas do site',
      fortes: ['video', 'jogo', 'game', 'manual', 'instrucoes', '3d', 'modelo 3d', 'onde vejo', 'onde encontro', 'onde esta a pagina', 'qual pagina', 'pagina de', 'menu', 'navegar', 'onde fica', 'tem um jogo', 'tem video'],
      fracas: ['pagina', 'site', 'ver', 'assistir', 'mostrar'],
      respostas: [
        'O site tem estas páginas:\n• Início — a visão geral da ELO\n• Instruções — o manual, com a pochete em 3D anotada e o vídeo demonstrativo\n• Produto — componentes, custos, o modelo 3D, o que vem na caixa e o preço\n• Quem Somos — a equipe, a missão e o formulário de contato\n• Referências — os artigos científicos\n• Jogo — ainda em desenvolvimento\n• Eloá — eu!',
        'Depende do que você procura: o vídeo e a pochete em 3D com cada parte explicada estão em Instruções; preço e componentes, em Produto; a equipe e o formulário, em Quem Somos; os artigos, em Referências. A página Jogo ainda está sendo feita.'
      ]
    },

    {
      id: 'nao_entendi', nome: 'explicar de outro jeito',
      fortes: ['nao entendi', 'entendi nada', 'nao entendo', 'confuso', 'confusa', 'nao ficou claro', 'explica melhor', 'explica de novo', 'explique melhor', 'repete', 'de novo', 'mais simples', 'nao compreendi', 'complicado', 'dificil de entender', 'como assim', 'oi?', 'que?'],
      respostas: [
        'Desculpa! Vou tentar de outro jeito. Me diz qual parte ficou confusa, ou pergunta de novo que eu explico com outras palavras.',
        'Sem problema — às vezes eu complico. Me fala o que você quer saber e eu vou direto ao ponto.'
      ]
    },

    /* ---- tom ----------------------------------------------------------- */
    {
      id: 'preocupacao', nome: 'a sua preocupação',
      fortes: ['medo', 'preocup', 'aflit', 'ansios', 'caiu', 'queda', 'sozinh', 'alzheimer', 'demencia', 'esquec', 'se perd', 'perdeu', 'nervos', 'insegur', 'angust', 'receio', 'risco', 'nao confio', 'desconfio', 'fico com medo'],
      respostas: [
        'Entendo a preocupação — é exatamente para isso que a ELO existe.\n\nSe {pessoa} precisar de ajuda, um toque no botão vermelho aciona o SAMU (192) e avisa você na hora, com a localização. E pelo app você acompanha onde {pessoa} está, em tempo real, sem precisar ficar ligando.',
        'Faz todo sentido se preocupar. A ELO foi feita para essa situação: {pessoa} sai com a pochete, e se acontecer qualquer coisa, o botão de emergência chama o SAMU e avisa você com a localização exata. No dia a dia, o GPS mostra no app por onde {pessoa} anda.'
      ],
      seguimento: { texto: 'Quer que eu explique como o botão de emergência funciona?', alvo: 'emergencia' }
    }
  ];

  const NAO_SEI = [
    'Essa eu ainda não sei responder. Mas posso ajudar com o botão de emergência, o transporte, os comandos de voz, a bateria, a localização, o app, o preço, a garantia — e com o projeto e a equipe. Quer ir por algum desses?',
    'Hmm, isso está fora do que eu conheço. O que eu sei bem é a ELO: como funciona, como configurar, quanto custa, o que vem na caixa, quem fez. Se for sobre outra coisa, a equipe responde pelo formulário em Quem Somos.'
  ];

  /* ------------------------------------------------------------------------
     3 · Jeito de falar
     ------------------------------------------------------------------------ */
  const ABERTURAS = ['Boa pergunta.', 'Deixa eu te explicar.', 'Claro.', 'Essa é importante.', 'Ah, sim.'];

  const ACOLHIMENTO = [
    'Entendo a preocupação — é exatamente para isso que a ELO existe.',
    'Faz todo sentido se preocupar com isso. Deixa eu te mostrar como a ELO ajuda.',
    'Eu entendo. Cuidar de longe dá aflição mesmo. Vou te explicar direitinho.'
  ];

  const PESSOAS = [
    ['minha mae', 'sua mãe'], ['meu pai', 'seu pai'],
    ['minha avo', 'sua avó'], ['minha vo', 'sua avó'], ['vovo', 'sua avó'],
    ['meu avo', 'seu avô'], ['meu vo', 'seu avô'],
    ['minha sogra', 'sua sogra'], ['meu sogro', 'seu sogro'],
    ['minha tia', 'sua tia'], ['meu tio', 'seu tio'],
    ['meu marido', 'seu marido'], ['minha esposa', 'sua esposa'],
    ['meus pais', 'seus pais'], ['meus avos', 'seus avós']
  ];

  const AFIRMATIVOS = ['sim', 'quero', 'pode', 'claro', 'por favor', 'vai', 'manda', 'bora', 'ok', 'uhum', 'aham', 'quero sim', 'pode ser', 'isso', 'pode sim', 'pode falar', 'conta', 'explica', 'mostra', 'sim por favor', 'vamos', 'beleza', 'ta', 'ta bom', 'yes', 'com certeza', 'quero saber', 'sim quero', 'pode explicar', 'exato', 'exatamente', 'isso mesmo', 'e isso', 'e isso mesmo', 'positivo', 'certo', 'sim e isso'];
  const NEGATIVOS = ['nao', 'nao precisa', 'nao quero', 'deixa', 'agora nao', 'nao obrigado', 'nao obrigada', 'depois', 'nope', 'nem', 'nao por enquanto', 'nao valeu', 'nao e isso', 'nao era isso', 'errado', 'nada a ver'];

  function detectarPessoa(textoNorm) {
    const t = ' ' + textoNorm + ' ';
    for (const [gatilho, forma] of PESSOAS) {
      if (t.includes(' ' + gatilho + ' ')) return forma;
    }
    return null;
  }

  function detectarNome(textoNorm) {
    const m = textoNorm.match(/(?:meu nome e|me chamo|eu sou o|eu sou a|sou o|sou a|aqui e o|aqui e a|pode me chamar de) ([a-z]{2,})/);
    if (!m) return null;
    const nome = m[1];
    const naoSaoNomes = ['cuidador', 'cuidadora', 'filho', 'filha', 'neto', 'neta', 'pai', 'mae', 'idoso', 'idosa', 'medico', 'medica', 'enfermeira', 'enfermeiro', 'assistente', 'eloa', 'elo', 'responsavel', 'unico', 'unica'];
    if (naoSaoNomes.includes(nome)) return null;
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }

  function preencherPessoa(texto, pessoa) {
    return texto
      .replace(/\{pessoa\}/g, pessoa || 'a pessoa')
      .replace(/de a pessoa/g, 'da pessoa')
      .replace(/de o /g, 'do ')
      .replace(/em a pessoa/g, 'na pessoa');
  }

  /* ------------------------------------------------------------------------
     4 · Casamento de assunto
     ------------------------------------------------------------------------ */
  const PESO_FORTE = 3;
  const PESO_FRACA = 1;
  const PONTOS_MINIMOS = 3;   // certeza suficiente para responder direto
  const PONTOS_PALPITE = 1;   // abaixo de MINIMOS mas acima disso: ela confirma antes

  function casaRadical(tokens, radical) {
    if (radical.length <= 3) return tokens.includes(radical);
    return tokens.some(t => t.startsWith(radical));
  }

  function pontuar(intencao, textoNorm, tokens) {
    let pontos = 0;
    const listas = [[intencao.fortes || [], PESO_FORTE], [intencao.fracas || [], PESO_FRACA]];
    for (const [lista, peso] of listas) {
      for (const pista of lista) {
        const casou = pista.includes(' ') ? textoNorm.includes(pista) : casaRadical(tokens, pista);
        if (casou) pontos += peso;
      }
    }
    return pontos;
  }

  function classificar(textoNorm, tokens) {
    const ranking = BASE
      .filter(i => i.fortes || i.fracas)
      .map(i => ({ intencao: i, pontos: pontuar(i, textoNorm, tokens) }))
      .filter(r => r.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos);

    const principal = ranking[0] && ranking[0].pontos >= PONTOS_MINIMOS ? ranking[0] : null;

    // "preocupacao" é tom, não assunto: nunca vira o segundo tema
    let secundario = null;
    const segundo = ranking.find(r => r !== ranking[0] && r.intencao.id !== 'preocupacao');
    if (principal && segundo && segundo.pontos >= PONTOS_MINIMOS && segundo.pontos >= principal.pontos * 0.6) {
      secundario = segundo;
    }

    // Frases curtas (saudação, agradecimento...). Só se nada pontuou de verdade.
    let exato = null;
    if (!principal && tokens.length <= 4) {
      const t = ' ' + textoNorm + ' ';
      for (const i of BASE) {
        if (!i.exatos) continue;
        if (i.exatos.some(e => textoNorm === e || t.includes(' ' + e + ' '))) { exato = i; break; }
      }
    }

    // Palpite: quase entendeu — vai confirmar em vez de dizer que não sabe
    const palpite = !principal && !exato && ranking[0] && ranking[0].pontos >= PONTOS_PALPITE && ranking[0].intencao.id !== 'preocupacao'
      ? ranking[0] : null;

    return { principal, secundario, exato, palpite };
  }

  /* ------------------------------------------------------------------------
     5 · Sessão — a conversa com memória
     ------------------------------------------------------------------------ */
  function criarSessao() {
    const memoria = {
      nome: null,
      pessoa: null,
      pendente: null,      // assunto oferecido ou palpite aguardando "sim"
      ofereceu: false,
      ultimaOferta: null,
      ultimaIntencao: null,
      ultimaResposta: null,
      ultimaAbertura: null,
      vistos: {},
      turnos: 0
    };

    const porId = id => BASE.find(i => i.id === id);

    function emendar(prefixo, corpo) {
      const baixa = /^[A-ZÀ-Ý](?![A-ZÀ-Ý$])/.test(corpo);
      return prefixo + (baixa ? corpo.charAt(0).toLowerCase() + corpo.slice(1) : corpo);
    }

    function montar(intencao, opcoes) {
      opcoes = opcoes || {};
      const partes = [];
      const conversaCurta = !!intencao.exatos;

      if (opcoes.acolher) partes.push(sortear(ACOLHIMENTO));

      const usaNome = memoria.nome && !conversaCurta && !opcoes.semNome && Math.random() < 0.3;

      if (!opcoes.semAbertura && !conversaCurta && !opcoes.acolher && !usaNome && Math.random() < 0.4) {
        const ab = sortear(ABERTURAS, memoria.ultimaAbertura);
        memoria.ultimaAbertura = ab;
        partes.push(ab);
      }

      let corpo = sortear(intencao.respostas, memoria.ultimaResposta);
      memoria.ultimaResposta = corpo;

      if (memoria.vistos[intencao.id] > 0 && !conversaCurta && !opcoes.semRepeticao) {
        corpo = emendar(sortear(['Como eu comentei, ', 'Reforçando: ', 'Sem problema, de novo: ']), corpo);
      }

      if (usaNome) corpo = emendar(memoria.nome + ', ', corpo);

      partes.push(corpo);
      let texto = partes.join(' ');

      memoria.pendente = null;
      memoria.ofereceu = false;
      if (intencao.seguimento && !opcoes.semSeguimento) {
        const alvo = intencao.seguimento.alvo;
        const repetida = memoria.ultimaOferta === intencao.seguimento.texto;
        if ((!alvo || !memoria.vistos[alvo]) && !repetida) {
          texto += '\n\n' + intencao.seguimento.texto;
          memoria.pendente = alvo;
          memoria.ofereceu = true;
          memoria.ultimaOferta = intencao.seguimento.texto;
        }
      }

      memoria.vistos[intencao.id] = (memoria.vistos[intencao.id] || 0) + 1;
      memoria.ultimaIntencao = intencao.id;
      return preencherPessoa(texto, memoria.pessoa);
    }

    function responder(pergunta) {
      memoria.turnos++;
      const textoNorm = normalizar(pergunta);
      const tokens = tokenizar(pergunta);

      if (!tokens.length) {
        return { resposta: 'Pode escrever sua pergunta que eu respondo.', intencao: 'vazio', confianca: 1, fonte: 'local' };
      }

      const pessoa = detectarPessoa(textoNorm);
      if (pessoa) memoria.pessoa = pessoa;
      const nome = detectarNome(textoNorm);
      let prefixoNome = '';
      if (nome && nome !== memoria.nome) {
        memoria.nome = nome;
        prefixoNome = sortear(['Prazer, ' + nome + '!', 'Certo, ' + nome + '.']) + ' ';
      }

      const acolher = (porId('preocupacao').fortes).some(p => textoNorm.includes(p));

      // Resposta ao que ela ofereceu ou ao palpite
      if (memoria.ofereceu && AFIRMATIVOS.includes(textoNorm)) {
        const alvo = memoria.pendente ? porId(memoria.pendente) : null;
        memoria.pendente = null;
        memoria.ofereceu = false;
        if (alvo) return { resposta: montar(alvo, { semAbertura: true }), intencao: alvo.id, confianca: 1, fonte: 'local' };
        return { resposta: sortear(['Certo! O que você quer saber?', 'Pode perguntar.', 'Manda.']), intencao: 'aguardando', confianca: 1, fonte: 'local' };
      }
      if (NEGATIVOS.includes(textoNorm)) {
        const eraPalpite = memoria.ofereceu && memoria.palpite;
        memoria.pendente = null;
        memoria.ofereceu = false;
        memoria.palpite = false;
        if (eraPalpite) {
          return { resposta: sortear(['Entendi, não era isso. Tenta me perguntar de outro jeito? Ou, se preferir, a equipe responde pelo formulário em Quem Somos.', 'Ah, desculpa. Reformula para mim? Posso ter entendido errado a palavra-chave.']), intencao: 'palpite_errado', confianca: 1, fonte: 'local' };
        }
        return { resposta: sortear(['Tranquilo. Se quiser saber mais alguma coisa, é só falar.', 'Sem problema. Estou por aqui se precisar.']), intencao: 'recusa', confianca: 1, fonte: 'local' };
      }
      if (AFIRMATIVOS.includes(textoNorm)) {
        return { resposta: sortear(['Certo! O que você quer saber?', 'Pode perguntar.']), intencao: 'aguardando', confianca: 1, fonte: 'local' };
      }

      const { principal, secundario, exato, palpite } = classificar(textoNorm, tokens);

      if (exato) {
        return { resposta: prefixoNome + montar(exato), intencao: exato.id, confianca: 1, fonte: 'local' };
      }

      // "Não entendi": se há um assunto recente com outra forma de dizer, reexplica
      if (principal && principal.intencao.id === 'nao_entendi') {
        const ultimo = memoria.ultimaIntencao && memoria.ultimaIntencao !== 'nao_entendi' ? porId(memoria.ultimaIntencao) : null;
        if (ultimo && ultimo.respostas.length > 1 && !ultimo.exatos) {
          const texto = sortear(['Claro, vou explicar de outro jeito.', 'Deixa eu tentar de novo, mais direto.']) + ' ' +
            montar(ultimo, { semAbertura: true, semNome: true, semRepeticao: true, semSeguimento: true });
          return { resposta: texto, intencao: 'reexplicacao:' + ultimo.id, confianca: 1, fonte: 'local' };
        }
      }

      if (nome && !principal && !palpite) {
        return { resposta: prefixoNome + 'Eu sou a Eloá. No que posso te ajudar hoje?', intencao: 'apresentacao', confianca: 1, fonte: 'local' };
      }

      // Quase entendeu: confirma antes de responder
      if (!principal && palpite) {
        memoria.pendente = palpite.intencao.id;
        memoria.ofereceu = true;
        memoria.palpite = true;
        memoria.ultimaOferta = null;
        const nomeAssunto = palpite.intencao.nome || palpite.intencao.id;
        return {
          resposta: sortear([
            'Não tenho certeza se entendi. Você quer saber sobre ' + nomeAssunto + '?',
            'Deixa eu confirmar: é sobre ' + nomeAssunto + ' que você quer saber?',
            'Acho que você está perguntando sobre ' + nomeAssunto + '. É isso?'
          ]),
          intencao: 'confirmacao',
          palpite: palpite.intencao.id,
          confianca: Math.min(0.5, palpite.pontos / 6),
          fonte: 'local'
        };
      }

      if (!principal) {
        memoria.pendente = null;
        memoria.ofereceu = false;
        return { resposta: sortear(NAO_SEI), intencao: 'desconhecido', confianca: 0, fonte: 'local' };
      }

      memoria.palpite = false;
      const acolherAqui = acolher && principal.intencao.id !== 'preocupacao';
      let texto = prefixoNome + montar(principal.intencao, { acolher: acolherAqui, semSeguimento: !!secundario, semNome: !!prefixoNome });
      if (secundario) {
        texto += '\n\n' + montar(secundario.intencao, { semAbertura: true, semNome: true });
      }

      return {
        resposta: texto,
        intencao: principal.intencao.id + (secundario ? '+' + secundario.intencao.id : ''),
        confianca: Math.min(1, principal.pontos / 8),
        fonte: 'local'
      };
    }

    return { responder, memoria };
  }

  /* ------------------------------------------------------------------------
     6 · Interface pública
     ------------------------------------------------------------------------ */
  return {
    criarSessao,
    responder: pergunta => criarSessao().responder(pergunta),
    normalizar,
    intencoes: () => BASE.map(i => i.id),
    versao: '3.0.0'
  };
});
