import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/widgets.dart';

import 'quadro_web_nativo.dart' if (dart.library.js_interop) 'quadro_web_navegador.dart' as impl;

/// Uma página web dentro do app: o Google Maps, o jogo, o visualizador 3D.
/// No celular (Android/iOS) é uma WebView; no navegador (usado só para ver
/// o app durante o desenvolvimento) é um <iframe>.
///
/// [interativo]: recebe os toques e gestos (arrastar o mapa, girar o 3D).
/// Desligado, o quadro é só uma imagem viva (útil dentro de listas).
///
/// [emIframe]: carrega a [url] dentro de um <iframe>. O Google Maps exige:
/// aberto direto na WebView ele responde "The Google Maps Embed API must be
/// used in an iframe" e o mapa não aparece.
class QuadroWeb extends StatelessWidget {
  const QuadroWeb({super.key, this.url, this.html, this.interativo = true, this.emIframe = false});

  final String? url;
  final String? html;
  final bool interativo;
  final bool emIframe;

  @override
  Widget build(BuildContext context) {
    // no navegador o quadro já é um <iframe>; o embrulho só é preciso na WebView
    final conteudo = emIframe && url != null && !kIsWeb ? paginaComIframe(url!) : html;
    return impl.QuadroWebImpl(key: ValueKey(url ?? html), url: conteudo == null ? url : null, html: conteudo, interativo: interativo);
  }
}

/// Página mínima que só contém o <iframe> ocupando tudo
String paginaComIframe(String url) => '''<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#e5e3df;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style></head>
<body><iframe src="$url" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></body></html>''';

