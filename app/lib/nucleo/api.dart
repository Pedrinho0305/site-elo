import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';
import 'sessao.dart';

/// Erro vindo do backend ({ "erro": "mensagem" } em português) ou da rede.
class ErroApi implements Exception {
  ErroApi(this.status, this.mensagem);
  final int? status;
  final String mensagem;
  @override
  String toString() => mensagem;
}

/// O mesmo contrato que o site usa (js/header.js → EloSessao.api):
/// `Authorization: Bearer TOKEN`, corpo JSON, erro em `{ erro }`.
class Api {
  static Future<Map<String, dynamic>> chamar(String rota, {String metodo = 'GET', Object? corpo}) async {
    final req = http.Request(metodo, Uri.parse('$apiBase/$rota'));
    req.headers['Content-Type'] = 'application/json';
    req.headers['Accept'] = 'application/json';
    final token = Sessao.i.token;
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    if (corpo != null) req.body = jsonEncode(corpo);

    http.Response resposta;
    try {
      resposta = await http.Response.fromStream(await req.send().timeout(const Duration(seconds: 25)));
    } on Exception {
      throw ErroApi(null, 'Não consegui falar com o servidor da ELO. Confira sua conexão e tente de novo.');
    }

    Map<String, dynamic> dados = {};
    try {
      final d = jsonDecode(utf8.decode(resposta.bodyBytes));
      if (d is Map<String, dynamic>) dados = d;
    } catch (_) {}

    if (resposta.statusCode >= 400) {
      if (resposta.statusCode == 401 && Sessao.i.logado && rota != 'login') {
        unawaited(Sessao.i.sair(avisarServidor: false));
      }
      throw ErroApi(resposta.statusCode, (dados['erro'] as String?) ?? 'Algo deu errado.');
    }
    return dados;
  }
}
