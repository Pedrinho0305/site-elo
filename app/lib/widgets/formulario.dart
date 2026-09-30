import 'package:flutter/material.dart';

import '../nucleo/api.dart';

/// Envio compartilhado dos dois formulários públicos (contato e pedido),
/// como o js/formulario.js do site: POST /api/mensagens, que guarda no banco
/// e manda para o e-mail da empresa. Devolve o protocolo (ELO-0007).
Future<String?> enviarMensagem(Map<String, dynamic> dados) async {
  final r = await Api.chamar('mensagens', metodo: 'POST', corpo: {...dados, 'pagina': 'app-${dados['pagina'] ?? ''}'});
  return (r['mensagem'] as Map?)?['protocolo'] as String?;
}

/// Mensagem para o erro do envio, como o formularios.explicar() do site
String explicarErro(Object e) {
  if (e is ErroApi) {
    if (e.status == 429) return 'Você já mandou várias mensagens na última hora. Espere um pouco e tente de novo.';
    return e.mensagem;
  }
  return 'Não consegui enviar agora. Tente de novo em instantes.';
}

/// Campo de texto com rótulo em cima, como os do site
class CampoTexto extends StatelessWidget {
  const CampoTexto({
    super.key, required this.rotulo, required this.controller, this.tipo = TextInputType.text,
    this.obrigatorio = true, this.linhas = 1, this.validar, this.senha = false, this.dica, this.autofill,
  });
  final String rotulo;
  final TextEditingController controller;
  final TextInputType tipo;
  final bool obrigatorio;
  final int linhas;
  final String? Function(String)? validar;
  final bool senha;
  final String? dica;
  final Iterable<String>? autofill;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        keyboardType: tipo,
        obscureText: senha,
        minLines: linhas,
        maxLines: senha ? 1 : (linhas == 1 ? 1 : linhas + 3),
        autofillHints: autofill,
        decoration: InputDecoration(labelText: rotulo + (obrigatorio ? '' : ' (opcional)'), hintText: dica),
        validator: (v) {
          final t = (v ?? '').trim();
          if (obrigatorio && t.isEmpty) return 'Preencha este campo.';
          if (tipo == TextInputType.emailAddress && t.isNotEmpty && !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(t)) return 'Digite um e-mail válido.';
          return validar?.call(t);
        },
      ),
    );
  }
}
