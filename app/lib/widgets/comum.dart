import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../nucleo/tema.dart';
import 'quadro_web.dart';

/* ==========================================================================
   Peças compartilhadas: o equivalente do css/header.css no app
   ========================================================================== */

/// Abre um link fora do app (Uber, Google Maps, artigos) ou uma ligação (tel:)
Future<void> abrirLink(BuildContext context, String url) async {
  final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) avisar(context, 'Não consegui abrir: $url');
}

void avisar(BuildContext context, String texto) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(texto)));
}

/// O logo: ∞ no círculo com o gradiente da marca + "ELO"
class EloLogo extends StatelessWidget {
  const EloLogo({super.key, this.tamanho = 34, this.comTexto = true});
  final double tamanho;
  final bool comTexto;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: tamanho, height: tamanho,
        decoration: BoxDecoration(shape: BoxShape.circle, gradient: EloCores.gradMarca, boxShadow: [BoxShadow(color: c.cyan.withValues(alpha: .35), blurRadius: 16)]),
        child: Transform.rotate(angle: -0.785398, child: Icon(Icons.link_rounded, size: tamanho * .62, color: EloCores.inkOnBrand)),
      ),
      if (comTexto) ...[
        const SizedBox(width: 10),
        Text('ELO', style: GoogleFonts.unbounded(fontWeight: FontWeight.w700, fontSize: tamanho * .55, color: c.text, letterSpacing: -.5)),
      ],
    ]);
  }
}

/// Texto com o gradiente da marca como tinta (números grandes, preço)
class TintaMarca extends StatelessWidget {
  const TintaMarca(this.texto, {super.key, required this.estilo});
  final String texto;
  final TextStyle estilo;

  @override
  Widget build(BuildContext context) => ShaderMask(
        shaderCallback: (r) => EloCores.gradMarca.createShader(r),
        blendMode: BlendMode.srcIn,
        child: Text(texto, style: estilo),
      );
}

/// Pílula primária com o gradiente da marca (texto escuro), mínimo 54 px
class BotaoMarca extends StatelessWidget {
  const BotaoMarca({super.key, required this.texto, this.aoTocar, this.icone, this.carregando = false, this.cor, this.expandir = false});
  final String texto;
  final VoidCallback? aoTocar;
  final IconData? icone;
  final bool carregando;
  final Color? cor; // laranja só no "Quero uma ELO"; vermelho só em emergência
  final bool expandir;

  @override
  Widget build(BuildContext context) {
    final ativo = aoTocar != null && !carregando;
    final corTexto = cor == null ? EloCores.inkOnBrand : Colors.white;
    return Opacity(
      opacity: ativo ? 1 : .6,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: cor == null ? EloCores.gradMarca : null,
          color: cor,
          borderRadius: BorderRadius.circular(999),
          boxShadow: [BoxShadow(color: (cor ?? context.cores.cyan).withValues(alpha: .28), blurRadius: 22, offset: const Offset(0, 8))],
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: BorderRadius.circular(999),
            onTap: ativo ? aoTocar : null,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 54),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 26),
                child: Row(mainAxisSize: expandir ? MainAxisSize.max : MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
                  if (carregando) SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: corTexto))
                  else if (icone != null) Icon(icone, size: 20, color: corTexto),
                  if (carregando || icone != null) const SizedBox(width: 10),
                  Flexible(child: Text(texto, textAlign: TextAlign.center, style: GoogleFonts.figtree(fontWeight: FontWeight.w700, fontSize: 16, color: corTexto))),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Pílula de contorno
class BotaoContorno extends StatelessWidget {
  const BotaoContorno({super.key, required this.texto, this.aoTocar, this.icone, this.cor, this.expandir = false, this.compacto = false});
  final String texto;
  final VoidCallback? aoTocar;
  final IconData? icone;
  final Color? cor;
  final bool expandir;
  final bool compacto;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    final corTexto = cor ?? c.text;
    return OutlinedButton(
      onPressed: aoTocar,
      style: OutlinedButton.styleFrom(
        minimumSize: Size(expandir ? double.infinity : 0, compacto ? 42 : 50),
        padding: EdgeInsets.symmetric(horizontal: compacto ? 14 : 20),
        shape: const StadiumBorder(),
        side: BorderSide(color: c.line2),
        backgroundColor: c.text.withValues(alpha: .04),
        foregroundColor: corTexto,
        textStyle: GoogleFonts.figtree(fontWeight: FontWeight.w700, fontSize: compacto ? 14 : 15),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icone != null) ...[Icon(icone, size: 18), const SizedBox(width: 8)],
        Flexible(child: Text(texto, textAlign: TextAlign.center)),
      ]),
    );
  }
}

/// Cartão do site: gradiente escuro, borda fina, raio 22 e brilho diagonal
class Cartao extends StatelessWidget {
  const Cartao({super.key, required this.child, this.padding = const EdgeInsets.all(20), this.cor, this.aoTocar, this.painel = false});
  final Widget child;
  final EdgeInsets padding;
  final Color? cor; // acende a borda na cor do que o cartão mede
  final VoidCallback? aoTocar;
  final bool painel; // painel azul-marinho (a embalagem), escuro nos dois temas

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Container(
      decoration: BoxDecoration(
        gradient: painel ? EloCores.gradPainel : c.gradCartao,
        borderRadius: BorderRadius.circular(Raio.lg),
        border: Border.all(color: cor != null ? Color.lerp(cor, c.line, .55)! : (painel ? const Color(0x33A0B2EB) : c.line)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: c.escuro ? .35 : .08), blurRadius: 40, offset: const Offset(0, 18), spreadRadius: -18)],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(Raio.lg),
          onTap: aoTocar,
          child: Stack(children: [
            // brilho diagonal (--gloss)
            Positioned.fill(child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Raio.lg),
              gradient: LinearGradient(begin: Alignment.topLeft, end: const Alignment(.2, .2), colors: [Colors.white.withValues(alpha: c.escuro || painel ? .06 : .7), Colors.white.withValues(alpha: 0)]),
            )))),
            Padding(padding: padding, child: child),
          ]),
        ),
      ),
    );
  }
}

/// Ícone em "squircle" colorido pela cor do cartão
class IconeAnel extends StatelessWidget {
  const IconeAnel(this.icone, {super.key, required this.cor, this.tamanho = 48});
  final IconData icone;
  final Color cor;
  final double tamanho;

  @override
  Widget build(BuildContext context) => Container(
        width: tamanho, height: tamanho,
        decoration: BoxDecoration(
          color: cor.withValues(alpha: .14),
          borderRadius: BorderRadius.circular(tamanho * .3),
          border: Border.all(color: cor.withValues(alpha: .42), width: 1.4),
        ),
        child: Icon(icone, color: cor, size: tamanho * .48),
      );
}

/// Título de seção (Unbounded) com linha de apoio opcional
class TituloSecao extends StatelessWidget {
  const TituloSecao(this.titulo, {super.key, this.apoio, this.grande = false});
  final String titulo;
  final String? apoio;
  final bool grande;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(titulo, style: GoogleFonts.unbounded(fontSize: grande ? 32 : 24, fontWeight: FontWeight.w700, height: 1.12, letterSpacing: -.8, color: c.text)),
      if (apoio != null) ...[
        const SizedBox(height: 10),
        Text(apoio!, style: TextStyle(fontSize: 16.5, height: 1.5, color: c.text2)),
      ],
    ]);
  }
}

/// Chip de status (como os do app no hero do site)
class ChipStatus extends StatelessWidget {
  const ChipStatus(this.texto, {super.key, required this.cor, this.icone});
  final String texto;
  final Color cor;
  final IconData? icone;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: c.bg2.withValues(alpha: .92), borderRadius: BorderRadius.circular(999), border: Border.all(color: c.line2)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icone != null) Icon(icone, size: 16, color: cor) else Container(width: 8, height: 8, decoration: BoxDecoration(color: cor, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Flexible(child: Text(texto, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: c.text))),
      ]),
    );
  }
}

/// Lista com check verde (listas do site com --check-mark)
class ItemCheck extends StatelessWidget {
  const ItemCheck(this.texto, {super.key, this.cor});
  final String texto;
  final Color? cor;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(top: 2), child: Icon(Icons.check_circle_rounded, size: 20, color: cor ?? c.green)),
        const SizedBox(width: 10),
        Expanded(child: Text(texto, style: TextStyle(fontSize: 15.5, height: 1.45, color: c.text2))),
      ]),
    );
  }
}

/// Página rolável padrão: largura máxima e respiro nas bordas
class PaginaRolavel extends StatelessWidget {
  const PaginaRolavel({super.key, required this.children, this.aoAtualizar, this.controller});
  final List<Widget> children;
  final Future<void> Function()? aoAtualizar;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    final lista = ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 40),
      children: [Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 760), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)))],
    );
    return aoAtualizar == null ? lista : RefreshIndicator(onRefresh: aoAtualizar!, child: lista);
  }
}

/// Espaço vertical entre seções
class Respiro extends StatelessWidget {
  const Respiro([this.altura = 36, Key? key]) : super(key: key);
  final double altura;
  @override
  Widget build(BuildContext context) => SizedBox(height: altura);
}

/// Estado de envio de formulário (ok / erro), como o .form-status do site
class StatusFormulario extends StatelessWidget {
  const StatusFormulario({super.key, required this.texto, required this.ok});
  final String texto;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    final cor = ok ? c.green : c.red;
    return Container(
      margin: const EdgeInsets.only(top: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: cor.withValues(alpha: .1), borderRadius: BorderRadius.circular(Raio.md), border: Border.all(color: cor.withValues(alpha: .45))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(ok ? Icons.check_circle_rounded : Icons.error_outline_rounded, color: cor, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(texto, style: TextStyle(color: c.text, height: 1.45))),
      ]),
    );
  }
}

/* --------------------------------------------------------------------------
   Mapas: Google Maps em quadro web (sem chave), como no site
   -------------------------------------------------------------------------- */
String googleEmbed(double lat, double lng, {int zoom = 16}) => 'https://maps.google.com/maps?q=$lat,$lng&z=$zoom&hl=pt-BR&output=embed';
String googleLink(double lat, double lng) => 'https://www.google.com/maps/search/?api=1&query=$lat,$lng';
String googleRota(double lat, double lng) => 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';

class MapaGoogle extends StatelessWidget {
  const MapaGoogle({super.key, required this.lat, required this.lng, this.altura = 150, this.interativo = false, this.aoTocar});
  final double lat, lng, altura;
  final bool interativo;
  final VoidCallback? aoTocar;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return ClipRRect(
      borderRadius: BorderRadius.circular(Raio.md),
      child: Container(
        height: altura,
        decoration: BoxDecoration(color: c.bg, border: Border.all(color: c.line)),
        child: Stack(children: [
          Positioned.fill(child: QuadroWeb(url: googleEmbed(lat, lng), interativo: interativo)),
          if (!interativo && aoTocar != null) Positioned.fill(child: Material(type: MaterialType.transparency, child: InkWell(onTap: aoTocar))),
          Positioned(right: 8, top: 8, child: IgnorePointer(child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(color: c.bg2.withValues(alpha: .88), borderRadius: BorderRadius.circular(999)),
            child: Text('${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: c.text, fontFeatures: const [FontFeature.tabularFigures()])),
          ))),
        ]),
      ),
    );
  }
}

/// Janela com o mapa, dentro do app (o equivalente do EloAvisos.abrirMapa)
Future<void> abrirMapa(BuildContext context, {required double lat, required double lng, String titulo = 'Localização da pochete'}) {
  return showDialog(
    context: context,
    builder: (ctx) {
      final c = ctx.cores;
      return Dialog(
        insetPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raio.lg), side: BorderSide(color: c.line2)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 620),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                  const SizedBox(height: 2),
                  Text('${lat.toStringAsFixed(6)}, ${lng.toStringAsFixed(6)}', style: TextStyle(color: c.text3, fontSize: 13)),
                ])),
                IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded), tooltip: 'Fechar o mapa'),
              ]),
              const SizedBox(height: 12),
              MapaGoogle(lat: lat, lng: lng, altura: (MediaQuery.sizeOf(ctx).height * .52).clamp(240, 380), interativo: true),
              const SizedBox(height: 14),
              Wrap(spacing: 10, runSpacing: 10, children: [
                BotaoMarca(texto: 'Como chegar', icone: Icons.directions_rounded, aoTocar: () => abrirLink(ctx, googleRota(lat, lng))),
                BotaoContorno(texto: 'Abrir no Google Maps', aoTocar: () => abrirLink(ctx, googleLink(lat, lng))),
              ]),
            ]),
          ),
        ),
      );
    },
  );
}
