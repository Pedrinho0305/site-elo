import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../nucleo/config.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import '../widgets/quadro_web.dart';
import 'casca.dart';

/// Jogo: a arte do Sr. João com o HUD, "Jogar agora" (o jogo do site em tela
/// cheia, na horizontal), a história, o que o jogo ensina e a partida gravada.
class TelaJogo extends StatelessWidget {
  const TelaJogo({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(titulo: 'Jogo'),
      body: PaginaRolavel(children: [
        const TituloSecao('ELO: O Jogo', grande: true, apoio: 'Uma jornada interativa sobre cuidado, conexão e tecnologia.'),
        const SizedBox(height: 12),
        Text('Você é o cuidador. A cidade é grande, a noite chegou e o Sr. João saiu para caminhar com a pochete. Tudo certo por aqui?',
            style: TextStyle(color: c.text2, fontSize: 16, height: 1.55)),
        const SizedBox(height: 18),
        ClipRRect(
          borderRadius: BorderRadius.circular(Raio.lg),
          child: Stack(children: [
            Image.asset('assets/img/jogo-cuidador.jpg', semanticLabel: 'O Sr. João no parque, com a pochete ELO'),
            Positioned(left: 12, top: 12, child: ChipStatus('Sr. João conectado', cor: c.green)),
            Positioned(right: 12, bottom: 12, child: ChipStatus('Parque Central, 21h40', cor: c.cyan, icone: Icons.place_rounded)),
          ]),
        ),
        const SizedBox(height: 18),
        BotaoMarca(texto: 'Jogar agora', icone: Icons.sports_esports_rounded, expandir: true, aoTocar: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const _TelaJogando()))),
        const Respiro(32),
        const TituloSecao('História do jogo'),
        const SizedBox(height: 12),
        for (final p in [
          'Você é um cuidador tecnológico responsável por garantir a segurança e o bem-estar de idosos em uma cidade moderna. Equipado com a tecnologia ELO, você precisa monitorar, responder a emergências e tomar decisões rápidas para manter todos seguros.',
          'Em cada fase, você enfrentará diferentes cenários: desde ajudar dona Maria a chamar um Uber para sua consulta médica até responder a alertas de emergência do Sr. João, que se perdeu no parque. O jogo simula situações reais do dia a dia.',
          'À medida que você avança, desbloqueia novos recursos da pochete ELO e enfrenta desafios mais complexos. Será que você consegue manter o elo forte com todos sob seus cuidados?',
        ])
          Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(p, style: TextStyle(color: c.text2, height: 1.6, fontSize: 15.5))),
        const SizedBox(height: 8),
        Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('O que o jogo ensina', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 12),
          for (final (icone, cor, texto) in [
            (Icons.gps_fixed_rounded, c.red, 'Esperar a hora certa: o Porteiro só leva dano quando baixa a guarda'),
            (Icons.medical_services_rounded, c.orange, 'Cuidar dos recursos: munição é pouca e o kit médico fica guardado para quando precisar'),
            (Icons.inventory_2_rounded, c.green, 'Explorar com atenção: baús, cartões de acesso e checkpoints estão espalhados pelo mapa'),
            (Icons.checklist_rounded, c.blue2, 'Resolver por etapas: desligar os 5 computadores derruba o escudo do chefe'),
            (Icons.replay_rounded, c.cyan, 'Não desistir: quem cai volta ao último checkpoint e tenta de novo'),
          ])
            Padding(padding: const EdgeInsets.only(bottom: 10), child: Row(children: [
              IconeAnel(icone, cor: cor, tamanho: 38),
              const SizedBox(width: 12),
              Expanded(child: Text(texto, style: const TextStyle(fontWeight: FontWeight.w600))),
            ])),
        ])),
        const Respiro(28),
        const TituloSecao('Demonstração do jogo', apoio: 'Veja o jogo em ação: gameplay e mecânicas principais.'),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(Raio.lg),
          child: const AspectRatio(aspectRatio: 16 / 9, child: QuadroWeb(html: _videoHtml)),
        ),
      ]),
    );
  }
}

/// O mesmo <video> da página Jogo do site. Sem o botão de tela cheia: a
/// WebView do Android não abre o vídeo em tela cheia e o botão ficaria morto.
const String _videoHtml = '''<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;display:block;object-fit:contain}</style></head>
<body><video src="$jogoVideoUrl" poster="$jogoVideoCapaUrl" controls controlslist="nofullscreen nodownload" disablepictureinpicture preload="metadata" playsinline aria-label="Partida gravada de ELO: O Jogo, Fase 1"></video></body></html>''';

/// O jogo ocupando a tela toda, na horizontal e sem as barras do sistema,
/// como no site pelo celular. Sair: o botão no canto ou o voltar do aparelho.
class _TelaJogando extends StatefulWidget {
  const _TelaJogando();

  @override
  State<_TelaJogando> createState() => _TelaJogandoState();
}

class _TelaJogandoState extends State<_TelaJogando> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations([DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    SystemChrome.setPreferredOrientations(const []);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(children: [
        const Positioned.fill(child: QuadroWeb(url: jogoUrl)),
        Positioned(
          left: 8,
          top: 8,
          child: SafeArea(
            child: Material(
              color: Colors.black45,
              shape: const CircleBorder(),
              child: IconButton(
                tooltip: 'Sair do jogo',
                color: Colors.white,
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}
