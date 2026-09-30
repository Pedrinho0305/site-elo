import 'package:flutter/material.dart';

import '../nucleo/config.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import '../widgets/quadro_web.dart';
import 'casca.dart';

/// Instruções: a pochete em 3D (sob demanda: o modelo tem 60 MB), as seis
/// partes, os seis passos, o vídeo (em produção) e as dicas.
class TelaInstrucoes extends StatefulWidget {
  const TelaInstrucoes({super.key});
  @override
  State<TelaInstrucoes> createState() => _TelaInstrucoesState();
}

class _TelaInstrucoesState extends State<TelaInstrucoes> {
  bool _ver3d = false;

  static const _partes = [
    ('Botão de emergência', 'Um toque avisa o cuidador na hora, com a localização. Se for preciso, ele liga para o SAMU (192).'),
    ('Botão de transporte', 'Pede um carro. O cuidador aprova ou recusa pelo app antes de a corrida ser chamada.'),
    ('Microfone e alto-falante', 'Diga "Oi ELO" para ligar para alguém, saber onde está ou chamar ajuda. A pochete responde em voz.'),
    ('GPS e conexão com o app', 'Por dentro, o módulo GPS envia a localização em tempo real e mantém a pochete ligada ao app do cuidador.'),
    ('Entrada USB-C e bateria', 'Uma carga de cerca de 2 horas dura até 48 horas de uso. Recarregue todo dia à noite.'),
    ('Cinto ajustável', 'Tecido resistente, com ajuste de cintura. Aguenta chuva e respingos (IP63), mas não mergulho.'),
  ];

  static const _passos = [
    ('Cadastro no App', 'Baixe o app ELO na App Store ou Google Play. Crie sua conta como cuidador e cadastre os dados do idoso (nome, idade, contatos de emergência e informações médicas importantes).'),
    ('Configure a Pochete', 'Ligue a pochete ELO pressionando o botão lateral por 3 segundos. Conecte via Bluetooth ao aplicativo seguindo as instruções na tela. A pochete deve ser carregada completamente antes do primeiro uso (cerca de 2 horas).'),
    ('Teste o Botão de Emergência', 'O botão vermelho envia um alerta ao cuidador, com a localização; é ele quem decide se liga para o SAMU (192). Faça um teste (modo demonstração no app) para garantir que tudo funciona. IMPORTANTE: Não pressione em modo real sem necessidade.'),
    ('Configure Uber', 'No app, vincule uma conta Uber e defina as permissões. Quando o idoso pressionar o botão amarelo na pochete, você receberá uma notificação para aprovar ou negar a corrida antes dela ser solicitada.'),
    ('Ative Comandos de Voz', 'Diga "Oi ELO" para ativar o assistente por voz. Comandos disponíveis: "Ligar para [nome]", "Onde estou?", "Chamar transporte", "Emergência". A pochete responde com confirmações em áudio.'),
    ('Uso Diário', 'O idoso deve usar a pochete sempre que sair. A bateria dura até 48 horas. Recarregue diariamente. O app mostra localização em tempo real e histórico de atividades. Configure notificações de acordo com suas preferências.'),
  ];

  // <model-viewer> é o mesmo visualizador das páginas Instruções e Produto do site
  static const _html3d = '''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
<style>html,body{margin:0;height:100%;background:transparent}model-viewer{width:100%;height:100%;--poster-color:transparent}</style></head>
<body><model-viewer src="$modelo3dUrl" camera-controls auto-rotate touch-action="pan-y" shadow-intensity="1" exposure="1.1" alt="Pochete ELO em 3D"></model-viewer></body></html>''';

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(titulo: 'Instruções'),
      body: PaginaRolavel(children: [
        const TituloSecao('Manual de Instruções', grande: true, apoio: 'Gire a pochete e veja o que cada parte faz. Depois, siga os seis passos para começar a usar.'),
        const Respiro(20),
        Cartao(
          padding: EdgeInsets.zero,
          child: SizedBox(
            height: 320,
            child: _ver3d
                ? ClipRRect(borderRadius: BorderRadius.circular(Raio.lg), child: const QuadroWeb(html: _html3d))
                : Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Expanded(child: Image.asset('assets/img/pochete-miniatura.png')),
                      const SizedBox(height: 12),
                      BotaoMarca(texto: 'Ver a pochete em 3D', icone: Icons.threed_rotation_rounded, aoTocar: () => setState(() => _ver3d = true)),
                      const SizedBox(height: 8),
                      Text('O modelo tem 60 MB: prefira o Wi-Fi.', style: TextStyle(color: c.text3, fontSize: 13)),
                    ]),
                  ),
          ),
        ),
        const Respiro(18),
        for (final (i, (titulo, texto)) in _partes.indexed)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Cartao(
              padding: const EdgeInsets.all(16),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CircleAvatar(radius: 17, backgroundColor: i == 0 ? c.red : c.cyan.withValues(alpha: .16),
                    child: Text('${i + 1}', style: TextStyle(fontWeight: FontWeight.w700, color: i == 0 ? Colors.white : c.cyan))),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16.5)),
                  const SizedBox(height: 4),
                  Text(texto, style: TextStyle(color: c.text2, height: 1.5)),
                ])),
              ]),
            ),
          ),
        const Respiro(28),
        const TituloSecao('Comece em seis passos'),
        const Respiro(18),
        // linha do tempo: o fio liga os passos (é sequência, pode numerar)
        for (final (i, (titulo, texto)) in _passos.indexed)
          IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Column(children: [
                IconeAnel(const [Icons.person_add_alt_1_rounded, Icons.settings_rounded, Icons.notification_important_rounded, Icons.directions_car_rounded, Icons.mic_rounded, Icons.event_available_rounded][i],
                    cor: [c.cyan, c.blue2, c.red, c.orange, c.purple, c.green][i], tamanho: 44),
                if (i < _passos.length - 1) Expanded(child: Container(width: 2, margin: const EdgeInsets.symmetric(vertical: 6), decoration: const BoxDecoration(gradient: EloCores.gradMarca))),
              ]),
              const SizedBox(width: 14),
              Expanded(child: Padding(
                padding: const EdgeInsets.only(bottom: 22),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${i + 1}. $titulo', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                  const SizedBox(height: 6),
                  Text(texto, style: TextStyle(color: c.text2, height: 1.55)),
                ]),
              )),
            ]),
          ),
        const Respiro(18),
        const TituloSecao('Vídeo Demonstrativo', apoio: 'Assista ao guia completo de utilização do ELO'),
        const Respiro(14),
        Cartao(
          child: SizedBox(
            height: 170,
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.play_circle_outline_rounded, size: 48, color: c.text3),
              const SizedBox(height: 10),
              const Text('Vídeo em produção', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              const SizedBox(height: 4),
              Text('O guia em vídeo será publicado aqui em breve.', style: TextStyle(color: c.text3)),
            ]),
          ),
        ),
        const Respiro(28),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: c.green.withValues(alpha: .08), borderRadius: BorderRadius.circular(Raio.lg), border: Border.all(color: c.green.withValues(alpha: .35))),
          child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Dicas Importantes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
            SizedBox(height: 8),
            ItemCheck('Mantenha a pochete sempre carregada (carregador incluso na embalagem)'),
            ItemCheck('Teste os botões semanalmente em modo demonstração'),
            ItemCheck('Configure múltiplos contatos de emergência no app'),
            ItemCheck('A pochete é resistente à água (IP63), mas não submergível'),
            ItemCheck('Em caso de problemas, consulte o suporte 24/7 no app'),
          ]),
        ),
      ]),
    );
  }
}
