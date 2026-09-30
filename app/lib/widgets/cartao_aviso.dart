import 'dart:async';

import 'package:flutter/material.dart';

import '../nucleo/avisos.dart';
import '../nucleo/tema.dart';
import 'comum.dart';

/// Camada que fica por cima de todas as telas e mostra os cards de aviso.
/// No celular, desce do topo (como as notificações do sistema); em telas
/// largas, fica no canto inferior direito, como no site.
class CamadaDeAvisos extends StatelessWidget {
  const CamadaDeAvisos({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      child,
      ListenableBuilder(
        listenable: Avisos.i,
        builder: (context, _) {
          final avisos = Avisos.i.visiveis;
          if (avisos.isEmpty) return const SizedBox.shrink();
          final largo = MediaQuery.sizeOf(context).width >= 700;
          final pilha = ConstrainedBox(
            constraints: BoxConstraints(maxWidth: 400, maxHeight: MediaQuery.sizeOf(context).height * .8),
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                for (final a in avisos)
                  Padding(padding: const EdgeInsets.only(bottom: 10), child: CartaoAviso(key: ValueKey(a.id), aviso: a, aberto: a.tipo == 'emergencia' || Avisos.i.abertoId == a.id)),
              ]),
            ),
          );
          return SafeArea(
            child: Align(
              alignment: largo ? Alignment.bottomRight : Alignment.topCenter,
              child: Padding(padding: EdgeInsets.fromLTRB(12, largo ? 12 : 8, largo ? 20 : 12, largo ? 20 : 0), child: pilha),
            ),
          );
        },
      ),
    ]);
  }
}

const _rotulos = {
  'emergencia': 'Emergência', 'transporte': 'Pedido de carro', 'bateria': 'Bateria baixa', 'teste': 'Teste da pochete',
  'local': 'Localização', 'corrida': 'Corrida', 'telegram': 'Telegram', 'acao': 'Ação',
};

const _icones = {
  'emergencia': Icons.notification_important_rounded, 'transporte': Icons.directions_car_rounded, 'bateria': Icons.battery_alert_rounded,
  'teste': Icons.check_circle_outline_rounded, 'local': Icons.place_rounded, 'corrida': Icons.local_taxi_rounded, 'telegram': Icons.send_rounded,
};

Color corDoTipo(EloCores c, String tipo) => switch (tipo) {
      'emergencia' => c.red,
      'transporte' || 'bateria' => c.orange,
      'teste' => c.green,
      'local' => c.cyan,
      'corrida' => c.teal,
      'telegram' => c.blue2,
      _ => c.cyan,
    };

class CartaoAviso extends StatefulWidget {
  const CartaoAviso({super.key, required this.aviso, required this.aberto});
  final Aviso aviso;
  final bool aberto;

  @override
  State<CartaoAviso> createState() => _CartaoAvisoState();
}

class _CartaoAvisoState extends State<CartaoAviso> with TickerProviderStateMixin {
  late final AnimationController _entrada = AnimationController(vsync: this, duration: const Duration(milliseconds: 420))..forward();
  late final AnimationController _pulso = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));
  AnimationController? _tempo;
  Timer? _atualizaHora;

  Aviso get a => widget.aviso;

  @override
  void initState() {
    super.initState();
    if (a.tipo == 'emergencia') _pulso.repeat();
    if (!a.fixo) {
      _tempo = AnimationController(vsync: this, duration: a.duracao)
        ..addStatusListener((s) { if (s == AnimationStatus.completed) Avisos.i.fechar(a); })
        ..forward();
    }
    _atualizaHora = Timer.periodic(const Duration(seconds: 30), (_) { if (mounted) setState(() {}); });
  }

  @override
  void dispose() {
    _entrada.dispose();
    _pulso.dispose();
    _tempo?.dispose();
    _atualizaHora?.cancel();
    super.dispose();
  }

  String _quando() {
    final min = DateTime.now().difference(a.em).inMinutes;
    final hora = '${a.em.hour.toString().padLeft(2, '0')}:${a.em.minute.toString().padLeft(2, '0')}';
    return min < 1 ? 'agora, $hora' : min < 60 ? 'há $min min, $hora' : hora;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    final cor = a.cor ?? corDoTipo(c, a.tipo);
    final aberto = widget.aberto;

    final cabeca = Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _IconeAviso(icone: a.icone ?? _icones[a.tipo] ?? Icons.notifications_rounded, cor: cor, pulso: a.tipo == 'emergencia' ? _pulso : null, pequeno: !aberto),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text.rich(TextSpan(children: [
          TextSpan(text: a.rotulo ?? _rotulos[a.tipo] ?? 'Aviso', style: TextStyle(color: cor, fontWeight: FontWeight.w700)),
          TextSpan(text: '  ·  ${_quando()}', style: TextStyle(color: c.text3, fontWeight: FontWeight.w500)),
        ]), style: const TextStyle(fontSize: 12.5)),
        const SizedBox(height: 2),
        Text(a.titulo, maxLines: aberto ? 3 : 1, overflow: TextOverflow.ellipsis,
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: aberto ? 16.5 : 15, height: 1.3, color: c.text)),
      ])),
      SizedBox(
        width: 34, height: 34,
        child: IconButton(padding: EdgeInsets.zero, iconSize: 18, color: c.text3, tooltip: 'Fechar aviso',
            onPressed: () => Avisos.i.fechar(a), icon: const Icon(Icons.close_rounded)),
      ),
    ]);

    final corpo = <Widget>[
      if (a.texto.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(a.texto, style: TextStyle(color: c.text2, fontSize: 14.5, height: 1.45))),
      if (a.bateria != null) Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Row(children: [
          Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: a.bateria! / 100, minHeight: 8, color: cor, backgroundColor: c.text.withValues(alpha: .1)))),
          const SizedBox(width: 10),
          Text('${a.bateria}%', style: const TextStyle(fontWeight: FontWeight.w700)),
        ]),
      ),
      if (a.lat != null && a.lng != null) Padding(
        padding: const EdgeInsets.only(top: 12),
        child: MapaGoogle(lat: a.lat!, lng: a.lng!, altura: 140, aoTocar: () => Avisos.i.mostrarMapa?.call(a.lat!, a.lng!, a.titulo)),
      ),
      if (a.acoes.isNotEmpty) Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Row(children: [
          for (final (i, acao) in a.acoes.indexed) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(child: _BotaoAcao(acao: acao, cor: cor, aoTocar: () {
              acao.aoTocar(context);
              if (acao.fecha) Avisos.i.fechar(a);
            })),
          ],
        ]),
      ),
      if (a.telegram) Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Row(children: [Icon(Icons.send_rounded, size: 13, color: c.blue2), const SizedBox(width: 6), Text('Também enviado ao seu Telegram', style: TextStyle(fontSize: 12, color: c.text3))]),
      ),
    ];

    final cartao = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Raio.lg),
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color.lerp(c.bg3, cor, .1)!, c.bg2]),
        border: Border.all(color: Color.lerp(cor, c.line2, .5)!),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: c.escuro ? .5 : .16), blurRadius: 40, offset: const Offset(0, 16), spreadRadius: -12)],
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: aberto ? null : () => Avisos.i.abrir(a),
          child: Stack(children: [
            // faixa de luz no topo, na cor do aviso
            Positioned(left: 0, right: 0, top: 0, height: 3, child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [cor.withValues(alpha: 0), cor, cor, cor.withValues(alpha: 0)], stops: const [0, .3, .7, 1])))),
            Padding(
              padding: EdgeInsets.fromLTRB(14, aberto ? 16 : 11, 8, aberto ? 16 : 11),
              child: Padding(padding: const EdgeInsets.only(right: 6), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [cabeca, if (aberto) ...corpo])),
            ),
            // tempo até sumir
            if (_tempo != null) Positioned(left: 0, right: 0, bottom: 0, height: 2, child: AnimatedBuilder(
              animation: _tempo!,
              builder: (_, _) => FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: 1 - _tempo!.value, child: ColoredBox(color: cor.withValues(alpha: .6))),
            )),
          ]),
        ),
      ),
    );

    // entra saindo do desfoque (a linguagem do site), com um leve deslize
    return FadeTransition(
      opacity: CurvedAnimation(parent: _entrada, curve: Curves.easeOut),
      child: SlideTransition(
        position: Tween(begin: const Offset(0, -.15), end: Offset.zero).animate(CurvedAnimation(parent: _entrada, curve: const Cubic(.22, 1, .36, 1))),
        child: MouseRegion(
          onEnter: (_) => _tempo?.stop(),
          onExit: (_) { if (_tempo != null && !_tempo!.isCompleted) _tempo!.forward(); },
          child: AnimatedSize(duration: const Duration(milliseconds: 250), curve: Curves.easeOut, alignment: Alignment.topCenter, child: cartao),
        ),
      ),
    );
  }
}

class _IconeAviso extends StatelessWidget {
  const _IconeAviso({required this.icone, required this.cor, this.pulso, this.pequeno = false});
  final IconData icone;
  final Color cor;
  final AnimationController? pulso;
  final bool pequeno;

  @override
  Widget build(BuildContext context) {
    final t = pequeno ? 36.0 : 44.0;
    final base = IconeAnel(icone, cor: cor, tamanho: t);
    if (pulso == null) return base;
    // o anel do botão vermelho pulsando
    return SizedBox(width: t, height: t, child: Stack(clipBehavior: Clip.none, children: [
      AnimatedBuilder(animation: pulso!, builder: (_, _) => Transform.scale(
        scale: 1 + pulso!.value * .55,
        child: Opacity(opacity: (1 - pulso!.value) * .9, child: Container(width: t, height: t, decoration: BoxDecoration(borderRadius: BorderRadius.circular(t * .3), border: Border.all(color: cor, width: 2)))),
      )),
      base,
    ]));
  }
}

class _BotaoAcao extends StatelessWidget {
  const _BotaoAcao({required this.acao, required this.cor, required this.aoTocar});
  final AcaoAviso acao;
  final Color cor;
  final VoidCallback aoTocar;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    final principal = acao.principal;
    return SizedBox(
      height: 44,
      child: TextButton(
        onPressed: aoTocar,
        style: TextButton.styleFrom(
          backgroundColor: principal ? cor : c.text.withValues(alpha: .05),
          foregroundColor: principal ? (cor == c.orange ? EloCores.inkOnBrand : Colors.white) : c.text,
          shape: StadiumBorder(side: BorderSide(color: principal ? cor : c.line2)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
        ),
        child: Text(acao.texto),
      ),
    );
  }
}
