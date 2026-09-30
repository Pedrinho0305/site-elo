import 'package:flutter/widgets.dart';

import 'quadro_web_nativo.dart' if (dart.library.js_interop) 'quadro_web_navegador.dart' as impl;

/// Uma página web dentro do app: o Google Maps, o jogo, o visualizador 3D.
/// No celular (Android/iOS) é uma WebView; no navegador (usado só para ver
/// o app durante o desenvolvimento) é um <iframe>.
///
/// [interativo]: recebe os toques e gestos (arrastar o mapa, girar o 3D).
/// Desligado, o quadro é só uma imagem viva (útil dentro de listas).
class QuadroWeb extends StatelessWidget {
  const QuadroWeb({super.key, this.url, this.html, this.interativo = true});

  final String? url;
  final String? html;
  final bool interativo;

  @override
  Widget build(BuildContext context) => impl.QuadroWebImpl(key: ValueKey(url ?? html), url: url, html: html, interativo: interativo);
}
