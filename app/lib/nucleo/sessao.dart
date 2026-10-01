import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

/// Sessão do cuidador, igual à do site: { nome, email, foto, token }.
/// Só entra quem o backend reconhece (sem "demonstração local"); sem token
/// não há sessão. Também guarda a escolha de tema.
///
/// O token (que dá acesso à conta) fica no cofre do sistema: Keystore no
/// Android, Keychain no iOS. Nas preferências comuns, que qualquer backup ou
/// celular com root lê em texto puro, ficam só nome, e-mail e foto.
class Sessao extends ChangeNotifier {
  Sessao._();
  static final i = Sessao._();

  static const _cofre = FlutterSecureStorage();
  static const _chaveToken = 'elo-token';

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
    String? tokenAntigo;
    if (salvo != null) {
      try {
        final dados = jsonDecode(salvo) as Map<String, dynamic>;
        tokenAntigo = dados['token'] as String?;
        cuidador = Map<String, dynamic>.from(dados['cuidador'] as Map? ?? {});
      } catch (_) {
        cuidador = {};
      }
    }
    try {
      token = await _cofre.read(key: _chaveToken);
    } catch (_) {
      token = null; // cofre ilegível (ex.: chave do aparelho trocada): entra de novo
    }
    // Versão anterior guardava o token nas preferências: muda para o cofre
    if (tokenAntigo != null && tokenAntigo.isNotEmpty) {
      token ??= tokenAntigo;
      await _gravar();
    }
    if (!logado) {
      token = null;
      cuidador = {};
    }
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
    try {
      await _cofre.delete(key: _chaveToken);
    } catch (_) {}
    notifyListeners();
  }

  Future<void> alternarTema() async {
    temaEscuro = !temaEscuro;
    await _prefs?.setString('theme', temaEscuro ? 'dark' : 'light');
    notifyListeners();
  }

  Future<void> _gravar() async {
    try {
      if (token == null) {
        await _cofre.delete(key: _chaveToken);
      } else {
        await _cofre.write(key: _chaveToken, value: token);
      }
    } catch (e) {
      debugPrint('Cofre indisponível, a sessão vale só enquanto o app está aberto: $e');
    }
    // Sem o token: nas preferências fica só o que aparece na tela
    await _prefs?.setString('elo-sessao', jsonEncode({'cuidador': cuidador}));
  }

  // Preferências pequenas usadas por outras partes (último aviso visto etc.)
  int? lerInt(String chave) => _prefs?.getInt(chave);
  Future<void> gravarInt(String chave, int valor) async => _prefs?.setInt(chave, valor);
}
