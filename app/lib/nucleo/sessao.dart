import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

/// Sessão do cuidador, igual à do site: { nome, email, foto, token }.
/// Só entra quem o backend reconhece (sem "demonstração local"); sem token
/// não há sessão. Também guarda a escolha de tema.
class Sessao extends ChangeNotifier {
  Sessao._();
  static final i = Sessao._();

  SharedPreferences? _prefs;
  String? token;
  Map<String, dynamic> cuidador = {};
  bool temaEscuro = true;

  bool get logado => token != null && token!.isNotEmpty;
  String get nome => (cuidador['nome'] as String?) ?? '';
  String get primeiroNome => nome.trim().split(' ').first;
  String get email => (cuidador['email'] as String?) ?? '';
  String? get foto => cuidador['foto'] as String?;
  bool get telegramVinculado => cuidador['telegram'] == true;

  String get iniciais {
    final partes = nome.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
    return partes.map((p) => p[0].toUpperCase()).join();
  }

  Future<void> carregar() async {
    _prefs = await SharedPreferences.getInstance();
    temaEscuro = (_prefs!.getString('theme') ?? 'dark') == 'dark';
    final salvo = _prefs!.getString('elo-sessao');
    if (salvo != null) {
      try {
        final dados = jsonDecode(salvo) as Map<String, dynamic>;
        token = dados['token'] as String?;
        cuidador = Map<String, dynamic>.from(dados['cuidador'] as Map? ?? {});
      } catch (_) {
        token = null;
      }
    }
    if (!logado) token = null;
  }

  /// Confere no servidor se a sessão ainda vale (derruba se vier 401)
  Future<void> confirmar() async {
    if (!logado) return;
    try {
      final r = await Api.chamar('me');
      cuidador = Map<String, dynamic>.from(r['cuidador'] as Map);
      await _gravar();
      notifyListeners();
    } on ErroApi catch (e) {
      if (e.status == 401) await sair(avisarServidor: false);
    }
  }

  Future<void> entrar(String novoToken, Map<String, dynamic> dadosCuidador) async {
    token = novoToken;
    cuidador = dadosCuidador;
    await _gravar();
    notifyListeners();
  }

  Future<void> atualizarCuidador(Map<String, dynamic> dados) async {
    cuidador = {...cuidador, ...dados};
    await _gravar();
    notifyListeners();
  }

  Future<void> sair({bool avisarServidor = true}) async {
    if (avisarServidor && logado) {
      Api.chamar('logout', metodo: 'POST').catchError((_) => <String, dynamic>{});
    }
    token = null;
    cuidador = {};
    await _prefs?.remove('elo-sessao');
    notifyListeners();
  }

  Future<void> alternarTema() async {
    temaEscuro = !temaEscuro;
    await _prefs?.setString('theme', temaEscuro ? 'dark' : 'light');
    notifyListeners();
  }

  Future<void> _gravar() async {
    await _prefs?.setString('elo-sessao', jsonEncode({'token': token, 'cuidador': cuidador}));
  }

  // Preferências pequenas usadas por outras partes (último aviso visto etc.)
  int? lerInt(String chave) => _prefs?.getInt(chave);
  Future<void> gravarInt(String chave, int valor) async => _prefs?.setInt(chave, valor);
}
