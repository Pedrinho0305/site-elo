import 'package:flutter/material.dart';

import '../nucleo/config.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import '../widgets/quadro_web.dart';
import 'casca.dart';

/// Jogo: a arte do Sr. João com o HUD, "Jogar agora" (o jogo do gd.games em
/// tela cheia), a história, o que o jogo ensina e a demonstração (em produção).
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
            (Icons.notification_important_rounded, c.red, 'Como funcionam os alertas de emergência'),
            (Icons.directions_car_rounded, c.orange, 'Aprovação inteligente de transportes'),
            (Icons.mic_rounded, c.purple, 'Uso de comandos de voz para auxiliar idosos'),
            (Icons.place_rounded, c.cyan, 'Localização em tempo real e zonas de segurança'),
            (Icons.forum_rounded, c.green, 'Comunicação efetiva entre cuidador e idoso'),
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
        Cartao(child: SizedBox(height: 160, child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.videocam_outlined, size: 44, color: c.text3),
          const SizedBox(height: 8),
          const Text('Vídeo em produção', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
          Text('A demonstração completa será inserida aqui.', style: TextStyle(color: c.text3)),
        ]))),
      ]),
    );
  }
}

class _TelaJogando extends StatelessWidget {
  const _TelaJogando();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ELO: O Jogo'), actions: [
        IconButton(tooltip: 'Abrir no navegador', icon: const Icon(Icons.open_in_new_rounded), onPressed: () => abrirLink(context, jogoUrl)),
      ]),
      body: const SafeArea(child: QuadroWeb(url: jogoUrl)),
    );
  }
}
