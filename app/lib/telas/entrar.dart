import 'package:flutter/material.dart';

import '../nucleo/api.dart';
import '../nucleo/sessao.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import '../widgets/formulario.dart';
import 'casca.dart';
import 'quem_somos.dart';

/// Entrar / Criar conta. Só entra quem o backend reconhece: com erro (409
/// e-mail já usado, 401 e-mail/senha incorretos, 503 banco fora) ou sem
/// servidor, a tela explica e não abre sessão. Sem "demonstração local".
class TelaEntrar extends StatefulWidget {
  const TelaEntrar({super.key});
  @override
  State<TelaEntrar> createState() => _TelaEntrarState();
}

class _TelaEntrarState extends State<TelaEntrar> {
  bool _cadastro = false;
  final _form = GlobalKey<FormState>();
  final _nome = TextEditingController();
  final _email = TextEditingController();
  final _senha = TextEditingController();
  final _confirmar = TextEditingController();
  bool _verSenha = false;
  bool _enviando = false;
  String? _erro;

  Future<void> _enviar() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _enviando = true; _erro = null; });
    try {
      final r = _cadastro
          ? await Api.chamar('cadastro', metodo: 'POST', corpo: {'nome': _nome.text.trim(), 'email': _email.text.trim(), 'senha': _senha.text})
          : await Api.chamar('login', metodo: 'POST', corpo: {'email': _email.text.trim(), 'senha': _senha.text});
      await Sessao.i.entrar(r['token'] as String, Map<String, dynamic>.from(r['cuidador'] as Map));
    } on ErroApi catch (e) {
      setState(() => _erro = e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(),
      body: PaginaRolavel(children: [
        // boas-vindas (faixa noite com a pochete)
        Cartao(
          painel: true,
          padding: const EdgeInsets.all(22),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_cadastro ? 'Bem-vindo!' : 'Bem-vindo de volta!', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: Color(0xFFEEF2FF))),
              const SizedBox(height: 8),
              Text(_cadastro ? 'Crie sua conta de cuidador e comece a acompanhar quem você ama com tecnologia e segurança.'
                  : 'Acesse sua conta e continue cuidando de quem você ama com tecnologia e segurança.',
                  style: const TextStyle(color: Color(0xFFC7CFEC), height: 1.5)),
              const SizedBox(height: 12),
              for (final t in ['Segurança em tempo real', 'Alertas instantâneos', 'Tecnologia que cuida'])
                Padding(padding: const EdgeInsets.only(bottom: 4), child: Row(children: [
                  const Icon(Icons.circle, size: 7, color: Color(0xFF22D3EE)),
                  const SizedBox(width: 8),
                  Text(t, style: const TextStyle(color: Color(0xFFEEF2FF), fontSize: 13.5)),
                ])),
            ])),
            const SizedBox(width: 10),
            Image.asset('assets/img/pochete-escura.png', width: context.telaEstreita ? 110 : 170),
          ]),
        ),
        const Respiro(20),
        Cartao(
          padding: const EdgeInsets.all(20),
          child: AutofillGroup(
            child: Form(
              key: _form,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text(_cadastro ? 'Crie sua conta' : 'Acesse sua conta', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 21)),
                const SizedBox(height: 4),
                Text(_cadastro ? 'Cadastre-se para acessar o painel do cuidador.' : 'Entre com seu email e senha para acessar.', style: TextStyle(color: c.text2)),
                const SizedBox(height: 18),
                if (_cadastro) CampoTexto(rotulo: 'Nome completo', controller: _nome, autofill: const [AutofillHints.name],
                    validar: (t) => t.length < 2 ? 'Digite seu nome completo.' : null),
                CampoTexto(rotulo: 'Email', controller: _email, tipo: TextInputType.emailAddress, autofill: const [AutofillHints.email]),
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: TextFormField(
                    controller: _senha,
                    obscureText: !_verSenha,
                    autofillHints: [_cadastro ? AutofillHints.newPassword : AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Senha',
                      suffixIcon: IconButton(
                        tooltip: _verSenha ? 'Esconder senha' : 'Mostrar senha',
                        icon: Icon(_verSenha ? Icons.visibility_off_rounded : Icons.visibility_rounded),
                        onPressed: () => setState(() => _verSenha = !_verSenha),
                      ),
                    ),
                    validator: (v) {
                      if ((v ?? '').isEmpty) return 'Digite sua senha.';
                      if (_cadastro && v!.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
                      return null;
                    },
                  ),
                ),
                if (_cadastro)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: TextFormField(
                      controller: _confirmar,
                      obscureText: !_verSenha,
                      decoration: const InputDecoration(labelText: 'Confirmar senha'),
                      validator: (v) => v != _senha.text ? 'As senhas não são iguais.' : null,
                    ),
                  ),
                if (!_cadastro)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => abrirTela(context, const TelaQuemSomos(assunto: 'Esqueci minha senha')),
                      child: Text('Esqueci minha senha', style: TextStyle(color: c.cyan, fontWeight: FontWeight.w600)),
                    ),
                  ),
                const SizedBox(height: 6),
                BotaoMarca(texto: _cadastro ? 'Criar conta' : 'Entrar', carregando: _enviando, aoTocar: _enviar, expandir: true),
                if (_erro != null) StatusFormulario(texto: _erro!, ok: false),
                const SizedBox(height: 14),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(_cadastro ? 'Já tem uma conta?' : 'Ainda não tem uma conta?', style: TextStyle(color: c.text2)),
                  TextButton(
                    onPressed: () => setState(() { _cadastro = !_cadastro; _erro = null; }),
                    child: Text(_cadastro ? 'Acessar conta' : 'Criar conta', style: TextStyle(color: c.cyan, fontWeight: FontWeight.w700)),
                  ),
                ]),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}
