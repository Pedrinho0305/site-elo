import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../nucleo/config.dart';

class QuadroWebImpl extends StatefulWidget {
  const QuadroWebImpl({super.key, this.url, this.html, required this.interativo});
  final String? url;
  final String? html;
  final bool interativo;

  @override
  State<QuadroWebImpl> createState() => _QuadroWebImplState();
}

class _QuadroWebImplState extends State<QuadroWebImpl> {
  late final WebViewController _c;
  bool _carregando = true;

  @override
  void initState() {
    super.initState();
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) { if (mounted) setState(() => _carregando = false); },
      ));
    if (widget.url != null) {
      _c.loadRequest(Uri.parse(widget.url!));
    } else {
      _c.loadHtmlString(widget.html ?? '', baseUrl: siteBase);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vista = WebViewWidget(
      controller: _c,
      // dentro de telas que rolam, o quadro interativo fica com o gesto
      gestureRecognizers: widget.interativo ? {Factory<OneSequenceGestureRecognizer>(() => EagerGestureRecognizer())} : const {},
    );
    return Stack(children: [
      Positioned.fill(child: widget.interativo ? vista : IgnorePointer(child: vista)),
      if (_carregando) const Center(child: SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.4))),
    ]);
  }
}
