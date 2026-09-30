import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../nucleo/config.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import 'casca.dart';
import 'instrucoes.dart';

/// Início: a home do site. O elemento memorável é o produto flutuando com
/// os chips de status do app, sobre o halo da marca.
class TelaInicio extends StatelessWidget {
  const TelaInicio({super.key, required this.irPara});
  final void Function(int aba) irPara;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(),
      body: PaginaRolavel(children: [
        // Hero
        Text.rich(
          TextSpan(children: [
            const TextSpan(text: 'Conecte-se com quem você ama, '),
            TextSpan(text: 'onde quer que estejam', style: TextStyle(fontWeight: FontWeight.w400, color: c.text2)),
          ]),
          style: GoogleFonts.unbounded(fontSize: context.telaEstreita ? 30 : 42, fontWeight: FontWeight.w700, height: 1.1, letterSpacing: -1, color: c.text),
        ),
        const SizedBox(height: 16),
        Text('A pochete inteligente ELO mantém idosos seguros e independentes, conectando cuidadores em tempo real com tecnologia de ponta.',
            style: TextStyle(fontSize: 17, height: 1.55, color: c.text2)),
        const SizedBox(height: 22),
        Wrap(spacing: 12, runSpacing: 12, children: [
          BotaoMarca(texto: 'Conheça a ELO', aoTocar: () => irPara(1)),
          BotaoContorno(texto: 'Como funciona', aoTocar: () => abrirTela(context, const TelaInstrucoes())),
        ]),
        const SizedBox(height: 18),
        Wrap(spacing: 16, runSpacing: 8, children: [
          _Confianca(Icons.verified_user_outlined, 'Garantia de 12 meses', c.green),
          _Confianca(Icons.support_agent_rounded, 'Suporte 24/7 em português', c.cyan),
          _Confianca(Icons.water_drop_outlined, 'Resistente à água (IP63)', c.blue2),
        ]),
        const Respiro(28),
        const _ProdutoComChips(),
        const Respiro(44),

        // Tecnologia que cuida
        const TituloSecao('Tecnologia que Cuida', apoio: 'Recursos desenvolvidos pensando na segurança e autonomia dos idosos'),
        const Respiro(18),
        _Recurso(Icons.notification_important_rounded, c.red, 'Botão de Alerta',
            'Em caso de emergência, um simples toque avisa o cuidador na hora, com a localização. Se for preciso, ele liga para o SAMU (192).', destaque: true),
        _Recurso(Icons.directions_car_rounded, c.orange, 'Uber com Aprovação', 'Solicite transporte com um botão. O cuidador recebe notificação e pode aprovar ou negar a corrida.'),
        _Recurso(Icons.mic_rounded, c.purple, 'Comandos de Voz', 'Interface por voz e áudio para facilitar o uso, mesmo para quem tem dificuldades com tecnologia.'),
        _Recurso(Icons.phone_iphone_rounded, c.green, 'App do Cuidador', 'Aplicativo completo para cadastrar idosos, receber alertas e monitorar atividades em tempo real.'),
        _Recurso(Icons.shield_rounded, c.blue2, 'Segurança Total', 'Rastreamento em tempo real e notificações instantâneas garantem tranquilidade para toda a família.'),
        _Recurso(Icons.all_inclusive_rounded, c.teal, 'Conexão Constante', 'Mantenha contato direto e saiba sempre onde seu ente querido está, promovendo independência com segurança.'),
        const Respiro(36),

        // Diferencial
        const TituloSecao('Nosso Diferencial'),
        const SizedBox(height: 12),
        Text('A ELO é a única solução que combina pochete inteligente com app integrado, oferecendo comandos de voz, aprovação de transportes pelo cuidador e alerta de emergência direto para quem cuida. Não é apenas tecnologia - é cuidado humanizado em cada detalhe.',
            style: TextStyle(fontSize: 16.5, height: 1.55, color: c.text2)),
        const SizedBox(height: 18),
        ClipRRect(borderRadius: BorderRadius.circular(Raio.lg), child: Image.asset('assets/img/pochete-embalagem.png', semanticLabel: 'A pochete e a caixa que chega na sua casa')),
        const SizedBox(height: 18),
        Cartao(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
          child: Row(children: [
            for (final (n, t) in [('100%', 'Foco no Idoso'), ('24/7', 'Monitoramento'), ('1º', 'No Mercado')])
              Expanded(child: Column(children: [
                TintaMarca(n, estilo: GoogleFonts.unbounded(fontSize: 26, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(t, textAlign: TextAlign.center, style: TextStyle(color: c.text2, fontSize: 13.5)),
              ])),
          ]),
        ),
        const SizedBox(height: 14),
        Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Público-Alvo', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 8),
          const ItemCheck('Idosos ativos que valorizam independência mas precisam de segurança extra.'),
          const ItemCheck('Familiares e cuidadores que desejam monitorar sem ser invasivos.'),
          const ItemCheck('Instituições de cuidado que buscam soluções tecnológicas eficientes.'),
          const ItemCheck('Profissionais de saúde especializados em geriatria.'),
        ])),
        const SizedBox(height: 14),
        Cartao(
          painel: true,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Nosso Objetivo', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: Color(0xFFEEF2FF))),
            const SizedBox(height: 10),
            const Text('Proporcionar autonomia e segurança para idosos através de tecnologia intuitiva, conectando-os aos entes queridos de forma inteligente.',
                style: TextStyle(fontSize: 15.5, height: 1.55, color: Color(0xFFC7CFEC))),
            const SizedBox(height: 10),
            const Text('Queremos reduzir a ansiedade de familiares e aumentar a qualidade de vida dos idosos, permitindo que vivam com dignidade e liberdade, sabendo que ajuda está sempre a um toque de distância.',
                style: TextStyle(fontSize: 15.5, height: 1.55, color: Color(0xFFC7CFEC))),
          ]),
        ),
        const Respiro(36),

        // CTA com o preço
        Cartao(
          painel: true,
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Pronto para fortalecer o elo com quem você ama?',
                style: GoogleFonts.unbounded(fontSize: 22, fontWeight: FontWeight.w700, height: 1.2, color: const Color(0xFFEEF2FF), letterSpacing: -.5)),
            const SizedBox(height: 16),
            TintaMarca(precoAVista, estilo: GoogleFonts.unbounded(fontSize: 40, fontWeight: FontWeight.w700)),
            const Text('à vista, ou $precoParcelado', style: TextStyle(color: Color(0xFFC7CFEC), fontSize: 15.5)),
            const SizedBox(height: 18),
            BotaoMarca(texto: 'Conhecer a ELO agora', aoTocar: () => irPara(1), expandir: true),
            const SizedBox(height: 10),
            const Text('Garantia de 12 meses e suporte 24/7 inclusos', style: TextStyle(color: Color(0xFFC7CFEC), fontSize: 13.5)),
          ]),
        ),
      ]),
    );
  }
}

class _Confianca extends StatelessWidget {
  const _Confianca(this.icone, this.texto, this.cor);
  final IconData icone;
  final String texto;
  final Color cor;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icone, size: 18, color: cor),
        const SizedBox(width: 6),
        Text(texto, style: TextStyle(fontSize: 14, color: context.cores.text2, fontWeight: FontWeight.w500)),
      ]);
}

/// O produto flutuando sobre o halo, com os três chips do app
class _ProdutoComChips extends StatefulWidget {
  const _ProdutoComChips();
  @override
  State<_ProdutoComChips> createState() => _ProdutoComChipsState();
}

class _ProdutoComChipsState extends State<_ProdutoComChips> with SingleTickerProviderStateMixin {
  late final AnimationController _flutua = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat(reverse: true);

  @override
  void dispose() {
    _flutua.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return SizedBox(
      height: 340,
      child: Stack(alignment: Alignment.center, children: [
        Container(
          width: 300, height: 300,
          decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [c.cyan.withValues(alpha: .28), c.green.withValues(alpha: .08), Colors.transparent])),
        ),
        AnimatedBuilder(
          animation: _flutua,
          builder: (_, child) => Transform.translate(offset: Offset(0, -8 + 16 * Curves.easeInOut.transform(_flutua.value)), child: child),
          child: Image.asset(c.escuro ? 'assets/img/pochete-escura.png' : 'assets/img/pochete-clara.png', height: 280, semanticLabel: 'Pochete ELO'),
        ),
        Positioned(left: 0, top: 18, child: ChipStatus('Tudo certo por aqui', cor: c.green, icone: Icons.check_circle_rounded)),
        Positioned(right: 0, top: 150, child: ChipStatus('Corrida aprovada pelo cuidador', cor: c.orange, icone: Icons.directions_car_rounded)),
        Positioned(left: 8, bottom: 14, child: ChipStatus('Localização atualizada há 2 min', cor: c.cyan, icone: Icons.place_rounded)),
      ]),
    );
  }
}

class _Recurso extends StatelessWidget {
  const _Recurso(this.icone, this.cor, this.titulo, this.texto, {this.destaque = false});
  final IconData icone;
  final Color cor;
  final String titulo, texto;
  final bool destaque;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Cartao(
          cor: destaque ? cor : null,
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            IconeAnel(icone, cor: cor, tamanho: 50),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              const SizedBox(height: 6),
              Text(texto, style: TextStyle(color: context.cores.text2, fontSize: 15, height: 1.5)),
            ])),
          ]),
        ),
      );
}
