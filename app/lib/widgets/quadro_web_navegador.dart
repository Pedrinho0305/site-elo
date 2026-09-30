import 'dart:convert';
import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

// Só para ver o app no navegador durante o desenvolvimento: <iframe>.
int _proximo = 0;

class QuadroWebImpl extends StatefulWidget {
  const QuadroWebImpl({super.key, this.url, this.html, required this.interativo});
  final String? url;
  final String? html;
  final bool interativo;

  @override
  State<QuadroWebImpl> createState() => _QuadroWebImplState();
}

class _QuadroWebImplState extends State<QuadroWebImpl> {
  late final String _tipo = 'elo-quadro-${_proximo++}';

  @override
  void initState() {
    super.initState();
    final src = widget.url ?? Uri.dataFromString(widget.html ?? '', mimeType: 'text/html', encoding: utf8).toString();
    ui_web.platformViewRegistry.registerViewFactory(_tipo, (int _) {
      final f = web.HTMLIFrameElement()
        ..src = src
        ..allow = 'fullscreen'
        ..style.border = '0'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.pointerEvents = widget.interativo ? 'auto' : 'none';
      return f;
    });
  }

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _tipo);
}
