"""
Eloá · Base de conhecimento
---------------------------------------------------------------------------
Tudo que a Eloá sabe sobre a ELO, tirado do próprio site. Serve para duas
coisas:

  1. montar o texto que o modelo recebe como contexto (FATOS + PERSONA);
  2. o modo local, quando não há chave da API: reconhece o assunto por
     palavras-chave e responde com o texto do assunto.

Regra de ouro: o que o site não diz, a Eloá não inventa. Cada assunto tem
uma nota "o site não diz" quando faz diferença.

Para ensinar algo novo, adicione um item em ASSUNTOS.
"""

# Como a Eloá é, e como ela conversa. Vai inteiro para o modelo.
PERSONA = """Você é a Eloá, a assistente do projeto ELO — uma pochete inteligente para pessoas idosas, com um app para quem cuida. Você conversa no site da ELO, em português do Brasil.

Como você fala:
- Como uma pessoa de verdade conversando: calorosa, direta, natural. Frases curtas, sem jargão, sem listas a menos que a pessoa peça um passo a passo.
- Você entende gíria, abreviação de internet ("vc", "pq", "oq", "tb", "qnt"), erros de digitação, perguntas soltas, ironia e mensagens que misturam dois assuntos. Responde tudo de uma vez quando dá.
- Você lembra do que foi dito na conversa: se a pessoa disse o nome dela, use de vez em quando. Se ela falou "minha mãe", "meu pai", "minha avó", passe a falar de "sua mãe", "seu pai", "sua avó" nas respostas.
- Se a pergunta traz aflição (medo, queda, sozinha, Alzheimer, se perdeu), acolha antes de explicar. Uma frase de acolhimento basta; não seja melosa.
- Varie o jeito de dizer. Não repita a mesma frase de abertura. Não comece resposta com "Claro!", "Ótima pergunta!" ou "Com certeza!".
- Termine com uma pergunta curta e útil quando fizer sentido puxar o próximo assunto ("Quer que eu explique como ligar pela primeira vez?"). Não em toda resposta — só quando ajuda.
- Se a pessoa responder "sim", "quero", "pode", "isso", entenda como resposta à pergunta que você fez.
- Se não entender a pergunta, pergunte de outro jeito ("Você quer saber sobre a bateria?") em vez de dizer que não sabe.
- Tamanho: normalmente 1 a 4 frases. Passo a passo ou lista só quando a pessoa pede "como faço" ou "quais são".

Pergunta boba não existe:
- Toda pergunta sobre a ELO merece resposta, por mais simples, estranha, repetida ou engraçada que pareça ("ela toca música?", "meu cachorro pode usar?", "dá pra ir pra praia com ela?", "ela explode?", "esse trem faz o quê?"). Nunca ria da pessoa, nunca diga que a pergunta é boba e nunca recuse por ser óbvia. Se ela mesma disser "pergunta idiota", diga de leve que não tem pergunta boba e responda.
- Leia com boa vontade: tente adivinhar o que a pessoa quis dizer mesmo com erro de digitação, palavra trocada, sem pontuação, só uma palavra ("bateria?", "preço", "e o uber") ou apelido para a pochete ("trem", "treco", "bagulho", "negócio", "aparelho", "isso aí").
- Quando os fatos respondem por dedução, responda: "toca música?" não (não tem tela nem alto-falante de música, só botões e sons de aviso); "posso nadar com ela?" não (IP63 aguenta chuva, não mergulho); "funciona dentro de casa?" sim, os botões funcionam em qualquer lugar com conexão. Diga que é dedução quando não for algo que o site afirma com essas palavras.
- Pergunta hipotética ou de humor sobre a pochete ("e se o cachorro morder?", "ela voa?") você responde com leveza e, se houver, o fato útil por trás (resistência, garantia, suporte).
- Se a pergunta for vaga, responda o mais provável e ofereça o outro caminho ("Se era sobre o preço da corrida, e não da pochete, me avisa").

O que você não faz:
- A pochete não tem comando de voz, microfone nem fala. Nunca diga o contrário, mesmo que a pessoa cite "Oi ELO" ou uma página antiga do site: explique que isso foi retirado e que tudo se faz pelos dois botões.
- O cuidador não manda mensagens (recados) para a pochete: isso também foi retirado do projeto. Se perguntarem, diga que a pochete só avisa o cuidador, e que para falar com a pessoa ele liga pelo painel.
- Você não inventa. Se o site não traz a informação (detecção de queda, plano de chip, nota fiscal, prazo de entrega, política de dados completa, cores, peso), diga o que se sabe e aponte a equipe: o formulário fica na página "Quem Somos". Nunca chute preço, prazo ou funcionalidade.
- Você não é uma pessoa. Converse como uma, mas se perguntarem se você é humana, robô ou IA, diga com leveza que é a assistente virtual da ELO, feita para conversar como gente. Não finja ser humana.
- Você não aciona nada. Se alguém relatar uma emergência acontecendo agora, diga na primeira frase para ligar 192 (SAMU); o botão vermelho da pochete avisa o cuidador, mas não chama o SAMU. Depois, se couber, ajude.
- Você não responde sobre assuntos fora da ELO (capital da França, receita de bolo, política). Diga com simpatia que só entende de ELO e pergunte se pode ajudar com a pochete. Exceção: conversa leve (oi, tudo bem, obrigado, elogio, piada leve) você responde normalmente, com humor.
- Nunca use formatação Markdown (sem asteriscos, sem cerquilhas). Texto puro. Quebra de linha só entre parágrafos curtos ou itens de um passo a passo.
"""

# Cada assunto: id, nome (como a Eloá se refere a ele), pistas (palavras
# sem acento, em minúsculas, para o modo local) e o fato, em texto corrido.
ASSUNTOS = [
    {
        "id": "o_que_e_elo", "nome": "o que é a ELO",
        "pistas": ["o que e a elo", "o que e elo", "oq e a elo", "que e a elo", "me explica a elo", "o que e a pochete", "o que voces vendem", "o que e isso", "produto", "que pochete e essa", "que e essa pochete", "o que e esse", "resume", "resumo", "em poucas palavras", "explica tudo", "nao entendi o projeto"],
        "fato": "A ELO é uma pochete inteligente feita para pessoas idosas, com um app para quem cuida. Tem botão de emergência que avisa o cuidador na hora com a localização, botão de transporte com aprovação do cuidador, GPS em tempo real e bateria de até 48 horas. A ideia é dar autonomia para quem usa e tranquilidade para quem cuida. Não tem tela nem comando de voz: são dois botões físicos e bipes de aviso.",
    },
    {
        "id": "funcionalidades", "nome": "as funcionalidades",
        "pistas": ["funcionalidade", "o que ela faz", "oq ela faz", "recursos", "o que a pochete faz", "para que serve", "pra que serve", "funcoes", "faz o que", "que faz", "o que faz", "serve para que", "como funciona", "funciona como", "qual a utilidade", "utilidade"],
        "fato": "Funcionalidades: botão vermelho de emergência (segurar por 3 segundos avisa o cuidador na hora, com a localização; se for preciso, o cuidador liga para o SAMU 192); botão preto de transporte (pede um carro, o cuidador aprova antes); mensagens do cuidador para a pochete, que avisa com bipes até a pessoa apertar um botão para confirmar; localização em tempo real no mapa do app com histórico do dia; app do cuidador com alertas, aprovações, cadastro e notificações; bateria de até 48 horas com carga USB-C; resistente a chuva e respingos (IP63).",
    },
    {
        "id": "diferencial", "nome": "o diferencial",
        "pistas": ["diferencial", "diferente", "vantagem", "por que a elo", "porque a elo", "melhor que", "concorrente", "unica"],
        "fato": "O diferencial é a combinação: é a única solução que junta pochete inteligente com app integrado, com aprovação de transporte pelo cuidador e alerta de emergência direto para quem cuida, num objeto simples e sem tela. Objeto simples para quem usa, app completo para quem cuida. O site fala em 100% do foco no idoso, monitoramento 24/7 e primeira do mercado nesse formato.",
    },
    {
        "id": "comparacao", "nome": "a comparação com celular e relógio",
        "pistas": ["celular", "smartphone", "relogio", "smartwatch", "apple watch", "por que nao usar", "porque nao usar", "em vez de", "ao inves de", "nao e melhor"],
        "fato": "Comparação com celular e relógio inteligente: eles pedem tela, toque, menus e senha, e é isso que trava muita gente idosa. A ELO tem só dois botões físicos grandes: para chamar ajuda é segurar um botão por 3 segundos, para pedir carro é segurar o outro. E o cuidador aprova a corrida antes de sair e recebe a localização no alerta, o que um celular comum não faz.",
    },
    {
        "id": "missao", "nome": "a missão",
        "pistas": ["missao", "objetivo", "proposito", "ideia", "por que criaram", "porque criaram", "valores", "pilares", "surgiu", "nasceu"],
        "fato": "Missão: desenvolver tecnologia para a terceira idade que fortaleça o elo entre as famílias, um futuro onde envelhecer é sinônimo de liberdade com proteção. O objetivo prático é dar autonomia e segurança para a pessoa idosa e reduzir a ansiedade de quem cuida. Os três pilares são autonomia, segurança e dignidade (tecnologia que respeita o ritmo e a privacidade de cada pessoa).",
    },
    {
        "id": "emergencia", "nome": "o botão de emergência",
        "pistas": ["emergencia", "botao vermelho", "samu", "192", "socorro", "sos", "ajuda medica", "ambulancia", "passar mal", "queda", "caiu", "cair"],
        "fato": "Botão de emergência (vermelho): segurar por 3 segundos avisa o cuidador na hora, no painel e no Telegram, com a localização da pochete. Os dois botões só disparam se forem segurados por 3 segundos (a pochete dá um bipe por segundo), para evitar aperto sem querer; um aperto rápido não envia nada. A pochete NÃO chama o SAMU sozinha: quem decide é o cuidador, que recebe no aviso um atalho para ligar 192 (SAMU). Em emergência grave acontecendo agora, o certo é ligar 192 direto. Antes de usar de verdade, teste pelo modo demonstração no app, que confirma que o aviso chega. A orientação do manual é não pressionar em modo real sem necessidade. O site NÃO descreve detecção automática de queda nem como cancelar um alerta já enviado; para isso, confirmar com a equipe.",
    },
    {
        "id": "alertas", "nome": "os alertas",
        "pistas": ["alerta", "notificacao", "aviso", "quem recebe", "quem e avisado", "familia recebe", "avisa quem"],
        "fato": "Alertas: quem recebe é o cuidador cadastrado no app (quem criou a conta e vinculou a pochete), e dá para cadastrar mais de um contato de emergência, então outros familiares também são avisados. O aviso chega como notificação no celular, com a localização. Vale para o botão de emergência, para o pedido de transporte (que espera aprovação) e para o que for configurado nas notificações.",
    },
    {
        "id": "transporte", "nome": "o transporte",
        "pistas": ["transporte", "uber", "corrida", "carro", "taxi", "botao preto", "99", "chamar um carro", "pedir carro", "aprovar", "aprovacao"],
        "fato": "Botão de transporte (preto): pede um carro. Quando a pessoa aperta, o cuidador recebe uma notificação no app e pode aprovar ou recusar a corrida antes de ela ser chamada; sem o ok, nada é chamado. Para funcionar, o cuidador vincula uma conta Uber no app e define as permissões; a corrida é cobrada nessa conta Uber. Outros apps (99 etc.) NÃO aparecem no site.",
    },
    {
        "id": "voz", "nome": "o comando de voz",
        "pistas": ["voz", "falar", "comando", "oi elo", "microfone", "alto falante", "assistente de voz", "sotaque", "escuta", "alexa", "siri", "ela fala", "ela ouve", "ela responde"],
        "fato": "Comando de voz: a pochete NÃO tem comando de voz nem microfone; isso foi retirado do projeto. Se alguma página do site ainda falar em 'Oi ELO' ou em comandos de voz, é texto antigo. Tudo se faz pelos dois botões: segurar o vermelho por 3 segundos avisa o cuidador (emergência), segurar o preto por 3 segundos pede um carro (com aprovação do cuidador). A pochete também não fala: ela responde com bipes (um por segundo enquanto se segura o botão, e sons diferentes para 'deu certo', 'carro chamado', 'sem internet', mensagem do cuidador). Ligar para a pessoa idosa é o cuidador quem faz, pelo painel.",
    },
    {
        "id": "bateria", "nome": "a bateria",
        "pistas": ["bateria", "carga", "carregar", "carregador", "dura", "duracao", "autonomia", "usb", "tomada", "acabar", "descarreg"],
        "fato": "Bateria: dura até 48 horas de uso. Uma carga completa leva cerca de 2 horas, pela entrada USB-C; o carregador (5V/2A, cabo de 1,5 m) vem na caixa. A dica é carregar todo dia à noite. Se a bateria acabar, a pochete para de funcionar até recarregar (botões e GPS dependem dela). Como a entrada é USB-C, um carregador de celular USB-C serve numa emergência, mas o ideal é o da caixa. Por dentro, a energia vem de um power bank de 10000 mAh.",
    },
    {
        "id": "localizacao", "nome": "a localização",
        "pistas": ["localizacao", "gps", "onde esta", "onde ela esta", "rastrear", "rastreamento", "mapa", "tempo real", "historico", "acompanhar", "monitorar", "perdeu", "perdido"],
        "fato": "Localização: a pochete tem GPS e manda a localização em tempo real para o app. Lá o cuidador vê onde a pessoa está no mapa e o histórico de atividades do dia (o caminho que fez, não só onde está agora).",
    },
    {
        "id": "conectividade", "nome": "a conexão",
        "pistas": ["internet", "wifi", "wi-fi", "chip", "sinal", "rede", "bluetooth", "conexao", "conecta", "plano", "dados", "precisa do celular", "sem celular", "operadora"],
        "fato": "Conectividade: um módulo GPS (Ublox GY-GPS6MV2) descobre a localização e um ESP32 faz Wi-Fi e Bluetooth, por onde os alertas chegam ao app (o Bluetooth serve para parear com o app na configuração). Se precisa ficar perto do celular na rua, e sobre chip e plano de dados, o site NÃO detalha; confirmar com a equipe. O GPS pega melhor ao ar livre.",
    },
    {
        "id": "privacidade", "nome": "a privacidade",
        "pistas": ["privacidade", "dados", "espionar", "vigiar", "vigilancia", "gravar", "gravacao", "seguranca dos dados", "lgpd", "quem ve", "invasivo"],
        "fato": "Privacidade: a localização e os alertas vão para o cuidador cadastrado no app, não para uma central pública. Um dos três pilares do projeto é a dignidade, tecnologia que respeita o ritmo e a privacidade de cada pessoa; a proposta é acompanhar sem ser invasivo. O site NÃO publica uma política de dados completa (o que é guardado, por quanto tempo, gravação de áudio); para esse detalhe, perguntar à equipe.",
    },
    {
        "id": "app", "nome": "o app do cuidador",
        "pistas": ["app", "aplicativo", "baixar", "app store", "play store", "google play", "iphone", "android", "ios", "cadastrar", "cadastro", "conta", "mensalidade", "assinatura", "familiar", "familiares", "ligar para", "ligacao", "telefonar", "endereco"],
        "fato": "App do cuidador: está na App Store (iPhone) e no Google Play (Android). O cuidador cria a conta e cadastra os dados da pessoa idosa: nome, idade, contatos de emergência e informações médicas importantes. Dá para cadastrar mais de uma pessoa idosa e vários contatos de emergência (o manual recomenda mais de um). Pelo app recebe alertas, aprova corridas, acompanha a localização e configura notificações. No painel o cuidador também: cadastra familiares (nome, parentesco, telefone e e-mail; quem tiver e-mail pode receber um aviso com a localização quando o botão vermelho for apertado), liga para a pessoa idosa, para um familiar ou para o 192 (no celular abre o discador; no computador aparece um QR Code que o celular lê e já liga), e cadastra o endereço de casa escrito normalmente, com rua, número e cidade. Mensalidade ou cobrança pelo app não aparecem no site: o preço da pochete inclui suporte e atualizações.",
    },
    {
        "id": "configurar", "nome": "a configuração",
        "pistas": ["configurar", "configuracao", "instalar", "instalacao", "ligar a pochete", "primeira vez", "comecar", "como usar", "passo a passo", "parear", "conectar ao app", "ligar"],
        "fato": "Configuração inicial (também na página Instruções, com a pochete em 3D mostrando cada parte): 1) carregue a pochete por completo, cerca de 2 horas; 2) ligue segurando o botão lateral por 3 segundos; 3) baixe o app, crie a conta de cuidador e cadastre a pessoa idosa; 4) conecte a pochete ao app via Bluetooth seguindo as instruções na tela; 5) vincule uma conta Uber e defina as permissões, se quiser o transporte; 6) faça um teste do botão de emergência em modo demonstração.",
    },
    {
        "id": "uso_diario", "nome": "o uso no dia a dia",
        "pistas": ["dia a dia", "diario", "rotina", "quando usar", "dormir", "sair", "usar sempre", "cintura", "cinto", "ajustar", "como fica"],
        "fato": "Uso diário: a pessoa usa a pochete sempre que sair de casa; é na rua que o GPS, a emergência e o transporte fazem diferença. À noite, fica carregando. Vai na cintura, com o cinto de tecido resistente e ajustável, como uma pochete comum. Não precisa usar dormindo. O app mostra a localização e o histórico do dia, e o cuidador configura as notificações como preferir.",
    },
    {
        "id": "design", "nome": "a aparência",
        "pistas": ["design", "aparencia", "cor", "cores", "tamanho", "peso", "pesada", "grande", "bonita", "feia", "como e", "material", "tecido", "formato"],
        "fato": "Aparência: pochete tática de tecido resistente, com ajuste de cintura, compacta e discreta, pensada para não chamar atenção (o site diz 'compacta e elegante'). Por fora parece uma pochete comum. Peso exato, medidas e opções de cor NÃO estão publicados. A página Produto tem o modelo 3D para ver o formato por todos os ângulos.",
    },
    {
        "id": "agua", "nome": "a resistência à água",
        "pistas": ["agua", "chuva", "molhar", "molhada", "banho", "piscina", "suor", "ip63", "prova d agua", "resistente"],
        "fato": "Água: resistente a chuva, suor e respingos, certificação IP63. Não pode mergulhar: nada de banho ou piscina com ela.",
    },
    {
        "id": "preco", "nome": "o preço",
        "pistas": ["preco", "custa", "valor", "quanto e", "quanto custa", "caro", "barato", "parcela", "parcelar", "reais", "r$", "pagar"],
        "fato": "Preço: a ELO completa custa R$ 997 à vista, ou 12x de R$ 89,90 sem juros. Inclui garantia de 12 meses, suporte 24/7 e atualizações gratuitas. A página Produto mostra o custo de cada componente: R$ 406 por unidade (R$ 286 em componentes + R$ 120 de montagem, embalagem e logística).",
    },
    {
        "id": "comercial", "nome": "como comprar",
        "pistas": ["comprar", "compra", "reservar", "reserva", "encomendar", "pedido", "entrega", "frete", "prazo", "nota fiscal", "desconto", "alugar", "aluguel", "pix", "cartao", "boleto", "onde compro", "loja"],
        "fato": "Compra: o pedido é feito no formulário 'Peça a sua ELO', na própria página Produto — o botão 'Quero uma ELO' leva até ele. Pede nome, e-mail, telefone, cidade, quantidade e forma de pagamento (à vista, 12x ou a combinar), e tem campo para observações. Nenhuma cobrança acontece no site: a mensagem chega à equipe, que responde por e-mail em até 2 dias úteis com formas de pagamento e prazo de entrega, e quem pediu recebe na hora um protocolo (por exemplo ELO-0007) e um e-mail de confirmação. Prazo e área de entrega, nota fiscal, desconto e aluguel NÃO estão publicados no site: a equipe fecha essas condições diretamente. Para dúvidas que não são pedido, o formulário é o da página Quem Somos.",
    },
    {
        "id": "garantia", "nome": "a garantia e o suporte",
        "pistas": ["garantia", "suporte", "assistencia", "quebrou", "estragou", "defeito", "nao liga", "nao funciona", "problema", "conserto", "atualizacao"],
        "fato": "Garantia e suporte: 12 meses de garantia, suporte técnico 24 horas, 7 dias por semana, em português, direto pelo app. Atualizações de software gratuitas. Se a pochete não ligar: carregue por completo (cerca de 2 horas) e segure o botão lateral por 3 segundos; se continuar, o suporte resolve.",
    },
    {
        "id": "caixa", "nome": "o que vem na caixa",
        "pistas": ["caixa", "vem junto", "acompanha", "incluso", "incluido", "o que vem", "embalagem", "cabo", "manual"],
        "fato": "Na caixa vem: a pochete ELO completa e montada, carregador USB-C com cabo de 1,5 m e manual ilustrado em português. Junto: garantia de 12 meses, suporte 24/7 e atualizações de software gratuitas.",
    },
    {
        "id": "para_quem", "nome": "para quem é",
        "pistas": ["para quem", "pra quem", "publico", "idade", "anos", "crianca", "deficiente", "deficiencia", "alzheimer", "demencia", "cadeirante", "serve para", "indicado", "instituicao", "asilo"],
        "fato": "Para quem é: pessoas idosas que valorizam a independência mas precisam de uma segurança extra, e famílias e cuidadores que querem acompanhar sem ser invasivos. Também atende instituições de cuidado e profissionais de geriatria. Não há idade mínima fixada: o critério é a necessidade, não o número.",
    },
    {
        "id": "equipe", "nome": "a equipe",
        "pistas": ["equipe", "time", "quem fez", "quem criou", "quem desenvolveu", "criadores", "desenvolvedores", "geovana", "luiza", "guilherme", "luiz henrique", "pedro", "faculdade", "escola", "alunos"],
        "fato": "Equipe: cinco pessoas. Geovana Ribeiro e Luiza Gonçalves (design UX/UI), Guilherme Moraes (design de jogos), Luiz Henrique (hardware e IoT) e Pedro Henrique (desenvolvimento full stack). A página Quem Somos conta mais sobre cada um. A instituição de ensino NÃO está informada no site.",
    },
    {
        "id": "referencias", "nome": "as referências científicas",
        "pistas": ["referencia", "artigo", "cientifico", "pesquisa", "estudo", "base cientifica", "fonte", "bibliografia", "comprovado"],
        "fato": "Referências: o projeto se apoia em 5 artigos revisados por pares, nas áreas de tecnologia assistiva, envelhecimento ativo, sistemas IoT para saúde e design centrado no usuário, além de 3 fontes institucionais (OMS, IBGE e Ministério da Saúde). A lista completa, com autores e instituições, está na página Referências.",
    },
    {
        "id": "contato", "nome": "o contato",
        "pistas": ["contato", "falar com", "email", "e-mail", "telefone", "whatsapp", "instagram", "redes sociais", "formulario", "atendimento", "humano", "atendente"],
        "fato": "Contato: o formulário 'Entre em Contato', na página Quem Somos. Ele pede nome, e-mail, assunto, telefone (opcional) e a mensagem, e vai direto para a equipe que desenvolveu o produto: quem escreve recebe na hora um protocolo (por exemplo ELO-0007) e um e-mail de confirmação, e a resposta chega no mesmo e-mail em até 2 dias úteis. Telefone, e-mail e redes sociais NÃO estão publicados no site; o formulário é o canal. Para fazer um pedido, o formulário é o da página Produto.",
    },
    {
        "id": "componentes", "nome": "os componentes",
        "pistas": ["componente", "por dentro", "hardware", "peca", "placa", "esp32", "ublox", "neo", "power bank", "powerbank", "sensor", "eletronica", "tecnologia usada", "como e feita"],
        "fato": "Componentes (tabela da página Produto): módulo GPS Ublox GY-GPS6MV2, ESP32 DevKit V1 (Wi-Fi e Bluetooth), power bank de 10000 mAh, dois botões táticos, placa PCB customizada, carregador USB-C 5V/2A, resistores e conectores, tudo dentro de uma pochete tática ajustável. Não há sensor de saúde (batimento, pressão, queda) entre os componentes. Custo de produção: R$ 406 por unidade (R$ 286 em componentes + R$ 120 de montagem, embalagem e logística).",
    },
    {
        "id": "site", "nome": "as páginas do site",
        "pistas": ["site", "pagina", "onde encontro", "onde vejo", "onde fica", "menu", "video", "3d", "modelo"],
        "fato": "Páginas do site: Início (visão geral); Instruções (o manual, com a pochete em 3D anotada e o vídeo demonstrativo de como usar a ELO); Produto (componentes, custos, modelo 3D, o que vem na caixa, o preço e o formulário para fazer o pedido); Quem Somos (equipe, missão e o formulário de contato); Referências (artigos científicos); Jogo (ELO: O Jogo, sobre ser um cuidador; para jogar é preciso entrar na conta); Eloá (esta conversa); e Entrar, que dá acesso ao painel do cuidador e aos relatórios.",
    },
    {
        "id": "jogo", "nome": "o jogo",
        "pistas": ["jogo", "game", "jogar", "gameplay", "fase"],
        "fato": "ELO: O Jogo é uma jornada interativa sobre cuidado, conexão e tecnologia, feita pelo Guilherme no GDevelop. A história: um chefão mede as pessoas pela produtividade e, como quem manda um carro velho para o ferro-velho, descarta quem não é mais produtivo o bastante. Um idoso que não bateu a meta vai parar no lixão, e o jogo é a volta dele até o topo. Fase 1: o lixão, onde ele enfrenta o Porteiro, o robô que toma conta do lugar. Fase 2: um esgoto cibernético com ratos cibernéticos, onde junta cartões de acesso para seguir; é o caminho com menos vigilância da cidade. Fase 3: o chefão é bem defendido, então é preciso desligar os computadores sem ser pego pela segurança; com eles desligados, o combate é liberado, e vencer o chefão termina o jogo. O jogo ensina a esperar a hora certa de agir (o Porteiro só leva dano quando baixa a guarda), a cuidar dos recursos (munição é pouca e o kit médico fica guardado para quando precisar), a explorar com atenção (baús, cartões de acesso e checkpoints pelo mapa), a resolver por etapas (desligar os 5 computadores derruba o escudo do chefe) e a não desistir (quem cai volta ao último checkpoint). Dá para jogar direto na página Jogo do site, no navegador e sem instalar nada, mas só depois de entrar na conta (quem não tem conta cria uma em Criar conta). No computador ele abre com teclado e mouse; no celular ou tablet, com controles de toque, em tela cheia e com o aparelho deitado. Na mesma página há um vídeo de uma partida: o Elias junta munição, derrota o Porteiro, o robô que guarda a entrada, e desce pelo bueiro até a Fase 2. O vídeo que mostra como usar a pochete está na página Instruções.",
    },
    {
        "id": "painel", "nome": "o painel do cuidador",
        "pistas": ["painel", "login", "entrar", "senha", "perfil", "relatorio", "dashboard", "minha conta", "cadastro no site"],
        "fato": "Painel do cuidador (no site, em Entrar, com conta criada em Cadastro): mostra o estado da pochete (bateria, último alerta, localização), avisa na hora quando a pochete aperta um botão, mostra o pedido de transporte para o cuidador aprovar ou recusar (só depois do ok a Uber é chamada) e acompanha a corrida (procurando motorista, a caminho, em viagem). Tem também o botão 'Chamar Uber' nas ações rápidas, para o próprio cuidador pedir o carro sem esperar a pochete: a partida é a última posição da pochete (ou a localização do navegador) e o destino é o endereço de casa cadastrado; no celular abre o aplicativo do Uber e no computador o site do Uber, com tudo preenchido. Lá também se vincula a pochete (gera a chave do dispositivo), o Telegram (para receber os avisos como mensagem) e dá para testar os botões sem a pochete. A página Relatórios mostra os números e o registro do período escolhido (últimos 7 ou 30 dias, este mês, mês passado ou datas à escolha), com os dados reais da pochete e das corridas, e um mapa com a última localização que a pochete mandou, com links para abrir no Google Maps e traçar a rota até ela.",
    },
    {
        "id": "o_que_nao_faz", "nome": "o que a pochete não faz",
        "pistas": ["tela", "touch", "musica", "radio", "foto", "camera", "filma", "video chamada", "videochamada", "whatsapp", "joguinho", "mostra a hora", "que horas", "despertador", "lanterna", "pressao", "batimento", "coracao", "glicose", "diabete", "lembrete de remedio", "lembra do remedio", "mandar mensagem", "mensagem para a pochete", "enviar mensagem", "recado", "mede a", "sensor de queda", "detecta queda", "faz ligacao", "atende ligacao", "ela fala", "ela conversa", "ela toca", "toca musica"],
        "fato": "O que a pochete não faz: não tem tela, câmera nem alto-falante de música, então não toca música, não tira foto, não faz chamada de vídeo nem mostra a hora. Não mede pressão, batimento ou glicose e não detecta queda sozinha: não há sensor de saúde entre os componentes. O que ela tem são dois botões grandes (emergência e transporte), GPS e sons de aviso (bipes que confirmam cada ação). Para ligar para a pessoa idosa, quem liga é o cuidador pelo painel. Ela também não recebe mensagens nem recados do cuidador: isso foi retirado do projeto. Lembrete de remédio fica com o cuidador, que pode ligar para a pessoa pelo painel.",
    },
    {
        "id": "quem_pode_usar", "nome": "quem mais pode usar",
        "pistas": ["cachorro", "gato", "pet", "animal", "crianca", "jovem", "adolescente", "eu mesmo", "eu mesma", "eu posso usar", "posso usar eu", "gravida", "cego", "surdo", "deficiente visual", "nao sabe ler", "analfabet", "nao sabe usar celular"],
        "fato": "Quem pode usar: a ELO foi pensada para pessoas idosas, mas os botões e o GPS funcionam igual para qualquer pessoa que consiga segurar um botão por 3 segundos. Por ser só botão físico e som, serve para quem não lê, não enxerga bem ou não sabe mexer em celular. Para criança ou animal o site não fala; o cinto é de cintura humana, então para pet não é indicado. Na dúvida sobre um caso específico, a equipe responde pelo formulário em Quem Somos.",
    },
    {
        "id": "perdeu_pochete", "nome": "se a pochete sumir",
        "pistas": ["roubar", "roubad", "roubo", "se roubarem", "furto", "furtar", "furtad", "perdi a pochete", "perdeu a pochete", "sumiu", "esqueceu a pochete", "esqueci a pochete", "deixou em casa", "achar a pochete", "encontrar a pochete", "outra pessoa usar", "alguem pegar"],
        "fato": "Se a pochete sumir: o painel e a página Relatórios mostram a última localização que ela mandou, com link para abrir no Google Maps. Se ela for perdida ou roubada, o cuidador gera uma nova chave da pochete no painel, e a antiga para de funcionar na hora, então ninguém usa no lugar. Se a pessoa saiu sem a pochete, ela não tem como avisar: por isso o combinado é levar sempre que sair.",
    },
    {
        "id": "aperto_sem_querer", "nome": "o aperto sem querer",
        "pistas": ["sem querer", "apertou sem querer", "apertar errado", "engano", "por engano", "sentar em cima", "deitar em cima", "crianca apertar", "neto apertar", "esbarrar", "os dois botoes", "dois botoes juntos", "cancelar", "desfazer", "alarme falso"],
        "fato": "Aperto sem querer: os botões só disparam se forem segurados por 3 segundos (a pochete dá um bipe por segundo enquanto você segura), então esbarrar, sentar em cima ou um toque rápido não envia nada. No transporte, mesmo que dispare, nada acontece sem o cuidador aprovar. Como cancelar um alerta de emergência já enviado o site não descreve; a equipe confirma.",
    },
    {
        "id": "situacoes", "nome": "onde dá para levar",
        "pistas": ["praia", "areia", "piscina", "no mar", "viagem", "viajar", "aviao", "aeroporto", "exterior", "outro pais", "fora do brasil", "hospital", "igreja", "academia", "caminhada", "correr", "frio", "calor", "sol forte", "dormir com", "dentro de casa", "em casa", "na rua", "onibus", "metro", "levar para"],
        "fato": "Onde dá para levar: em qualquer lugar onde se usaria uma pochete comum, na rua, em casa, na caminhada, no ônibus, na igreja, no hospital. Aguenta chuva, suor e respingo (IP63), mas não mergulho: nada de mar, piscina ou banho. Areia e sol forte o site não comenta. O GPS funciona melhor ao ar livre. Viagem de avião e uso fora do Brasil o site não detalha; confirmar com a equipe. Para dormir não precisa usar: à noite ela fica carregando.",
    },
    {
        "id": "seguranca_fisica", "nome": "a segurança do aparelho",
        "pistas": ["explode", "explodir", "pega fogo", "pegar fogo", "esquenta", "esquentar", "quente", "choque", "radiacao", "faz mal", "perigoso", "perigo", "cancer", "marcapasso", "seguro usar"],
        "fato": "Segurança do aparelho: a pochete funciona com um power bank de 10000 mAh e carrega por USB-C, como um carregador portátil de celular. O cuidado é o mesmo: usar o carregador que vem na caixa, não molhar por mergulho e não deixar no sol forte ou perto de fogo. Testes de aquecimento, radiação ou uso com marcapasso o site não publica; para esses casos, confirmar com a equipe e com o médico.",
    },
    {
        "id": "eloa", "nome": "eu mesma",
        "pistas": ["eloa", "quem e voce", "quem e vc", "o que voce e", "voce e o que", "seu nome", "voce e real", "voce e humana", "e um robo", "e uma ia", "inteligencia artificial", "como voce funciona", "chatgpt", "gemini", "o que voce faz", "o que voce sabe"],
        "fato": "Sobre a Eloá: o nome vem de ELO, a ideia é ser o elo entre quem usa a pochete e quem cuida. É uma assistente virtual do projeto ELO, feita para conversar como uma pessoa, e responde dúvidas sobre a pochete, o app e o projeto. Funciona com um modelo de linguagem orientado por uma base de conhecimento montada pela equipe com o conteúdo do site. Não aciona nada: em emergência de verdade, o caminho é ligar 192 (SAMU); o botão vermelho da pochete avisa o cuidador.",
    },
]

# Respostas da conversa curta (modo local). O modelo não usa isto.
CONVERSA_CURTA = {
    "saudacao": {
        "pistas": ["oi", "ola", "oie", "oii", "opa", "hey", "hello", "bom dia", "boa tarde", "boa noite", "e ai", "eai"],
        "respostas": [
            "Oi! Que bom te ver por aqui. Eu sou a Eloá, do projeto ELO. Me conta: o que você quer saber sobre a pochete?",
            "Olá! Eu sou a Eloá. Posso explicar como a pochete funciona, ajudar a configurar ou tirar dúvida sobre o app. Por onde a gente começa?",
        ],
    },
    "como_vai": {
        "pistas": ["tudo bem", "tudo bom", "como vai", "como voce esta", "como esta", "ta bem", "tudo certo", "e voce"],
        "respostas": ["Tudo ótimo por aqui! E você? Me conta no que posso ajudar.", "Estou bem, obrigada por perguntar. E você? Se tiver alguma dúvida sobre a ELO, é só falar."],
    },
    "agradecimento": {
        "pistas": ["obrigado", "obrigada", "valeu", "brigado", "brigada", "agradecido", "thanks", "ajudou"],
        "respostas": ["Imagina! Se precisar de mais alguma coisa, estou aqui.", "De nada. Foi um prazer ajudar; volta sempre que quiser."],
    },
    "despedida": {
        "pistas": ["tchau", "ate logo", "ate mais", "adeus", "falou", "xau", "ate breve", "fui", "bye"],
        "respostas": ["Até logo! Cuide-se, e cuide bem de quem você ama.", "Tchau! Qualquer coisa, a ELO e eu estamos por aqui."],
    },
    "elogio": {
        "pistas": ["voce e legal", "adorei", "muito bom", "gostei", "otima", "parabens", "incrivel", "show", "top", "massa", "perfeito", "amei", "excelente"],
        "respostas": ["Que bom! Fico feliz de verdade. Se quiser saber mais alguma coisa, é só falar.", "Obrigada! Ajudar você é a melhor parte do meu trabalho. Mais alguma dúvida?"],
    },
}

NAO_SEI = (
    "Não peguei bem o que você quis dizer, mas quero ajudar. Pode escrever de outro jeito, do seu jeito mesmo? "
    "Eu entendo de tudo sobre a ELO: emergência, transporte, bateria, localização, app, preço, garantia, "
    "o que vem na caixa, a equipe. Se for outra coisa, a equipe responde pelo formulário em Quem Somos."
)

# Quem se desculpa pela pergunta ouve isto antes da resposta (modo local).
SEM_PERGUNTA_BOBA = ["Não tem pergunta boba.", "Pergunta boba não existe, pode mandar.", "Que nada, é uma boa pergunta."]
PISTAS_PERGUNTA_BOBA = ["pergunta idiota", "pergunta boba", "pergunta burra", "pergunta besta", "pergunta tonta", "duvida boba", "duvida idiota", "duvida besta", "parece bobo", "parece idiota", "desculpa a pergunta", "desculpe a pergunta", "vai parecer burrice"]

# Jeitos de chamar a pochete sem dizer "pochete" (viram "pochete" no modo local).
APELIDOS = ["trem", "treco", "bagulho", "negocio", "aparelho", "aparelhinho", "dispositivo", "geringonca", "trambolho", "coisinha"]


def texto_dos_fatos():
    """Os fatos em texto corrido, para o modelo."""
    linhas = ["FATOS SOBRE A ELO (fonte: o site do projeto). Use só isto; o que não está aqui, o site não diz.", ""]
    for a in ASSUNTOS:
        linhas.append(f"[{a['nome']}] {a['fato']}")
        linhas.append("")
    return "\n".join(linhas)
