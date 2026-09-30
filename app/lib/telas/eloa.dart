import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../nucleo/config.dart';
import '../nucleo/tema.dart';
import 'casca.dart';

/// Eloá: a mesma assistente do site, pela mesma API (/api/eloa/perguntar).
/// O app manda o histórico em cada pergunta, que é como ela lembra da
/// conversa em serverless. Sem modelo, o servidor responde no modo local;
/// sem servidor, o app diz que está sem conexão (e lembra do 192).
class TelaEloa extends StatefulWidget {
  const TelaEloa({super.key});
  @override
  State<TelaEloa> createState() => _TelaEloaState();
}

class _Mensagem {
  _Mensagem(this.texto, {this.minha = false, this.carregando = false});
  String texto;
  final bool minha;
  bool carregando;
}

class _TelaEloaState extends State<TelaEloa> {
  final _mensagens = <_Mensagem>[
    _Mensagem('Olá! Eu sou a Eloá, a IA do projeto ELO. Posso explicar como a pochete funciona, tirar dúvidas sobre o app do cuidador e ajudar a configurar tudo. Como posso ajudar?'),
  ];
  final _historico = <Map<String, String>>[];
  final _campo = TextEditingController();
  final _rolagem = ScrollController();
  String? _sessao;
  bool _esperando = false;

  static const _sugestoes = [
    'Como funciona o botão de emergência?',
    'Quanto tempo dura a bateria?',
    'Como o cuidador aprova uma corrida?',
    'Quais comandos de voz ela entende?',
  ];

  Future<void> _perguntar(String texto) async {
    texto = texto.trim();
    if (texto.isEmpty || _esperando) return;
    _campo.clear();
    final resposta = _Mensagem('', carregando: true);
    setState(() {
      _mensagens.add(_Mensagem(texto, minha: true));
      _mensagens.add(resposta);
      _esperando = true;
    });
    _descer();

    String textoResposta;
    try {
      final r = await http
          .post(Uri.parse(eloaUrl), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'pergunta': texto, 'sessao': _sessao, 'historico': _historico}))
          .timeout(const Duration(seconds: 45));
      final dados = jsonDecode(utf8.decode(r.bodyBytes)) as Map<String, dynamic>;
      if (dados['status'] == 'sucesso' && dados['resposta_da_ia'] != null) {
        textoResposta = dados['resposta_da_ia'] as String;
        _sessao = dados['sessao'] as String? ?? _sessao;
        _historico.addAll([{'role': 'user', 'content': texto}, {'role': 'assistant', 'content': textoResposta}]);
        if (_historico.length > 40) _historico.removeRange(0, _historico.length - 40);
      } else {
        textoResposta = 'Algo deu errado aqui do meu lado. Tenta perguntar de novo?';
      }
    } catch (_) {
      textoResposta = 'Estou sem conexão com o meu servidor agora. Tenta de novo em instantes? Se for emergência, ligue 192 (SAMU); o botão vermelho da pochete avisa o cuidador.';
    }
    if (!mounted) return;
    setState(() {
      resposta.texto = textoResposta;
      resposta.carregando = false;
      _esperando = false;
    });
    _descer();
  }

  void _descer() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_rolagem.hasClients) _rolagem.animateTo(_rolagem.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      });

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(),
      body: Column(children: [
        // presença da Eloá
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 12),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(2.5),
              decoration: const BoxDecoration(shape: BoxShape.circle, gradient: EloCores.gradMarca),
              child: const CircleAvatar(radius: 26, backgroundImage: AssetImage('assets/img/eloa-avatar.jpg')),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Fale com a Eloá', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 19)),
              Row(children: [
                Container(width: 8, height: 8, decoration: BoxDecoration(color: c.green, shape: BoxShape.circle)),
                const SizedBox(width: 6),
                Text('Online agora', style: TextStyle(color: c.green2, fontSize: 13.5, fontWeight: FontWeight.w600)),
              ]),
            ])),
          ]),
        ),
        Expanded(
          child: ListView.builder(
            controller: _rolagem,
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 12),
            itemCount: _mensagens.length + (_mensagens.length == 1 ? 1 : 0),
            itemBuilder: (context, i) {
              if (i == _mensagens.length) {
                // sugestões, enquanto a conversa não começou
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Você pode começar por aqui', style: TextStyle(color: c.text3, fontSize: 13.5)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 8, runSpacing: 8, children: [
                      for (final s in _sugestoes)
                        ActionChip(
                          label: Text(s),
                          onPressed: () => _perguntar(s),
                          backgroundColor: c.bg2,
                          side: BorderSide(color: c.line2),
                          shape: const StadiumBorder(),
                        ),
                    ]),
                  ]),
                );
              }
              return _Balao(m: _mensagens[i]);
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          decoration: BoxDecoration(color: c.bg2, border: Border(top: BorderSide(color: c.line))),
          child: SafeArea(
            top: false,
            child: Row(children: [
              Expanded(child: TextField(
                controller: _campo,
                minLines: 1, maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: _perguntar,
                decoration: InputDecoration(hintText: 'Pergunte algo à Eloá…', border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: c.line2))),
              )),
              const SizedBox(width: 8),
              Container(
                decoration: const BoxDecoration(shape: BoxShape.circle, gradient: EloCores.gradMarca),
                child: IconButton(tooltip: 'Enviar', onPressed: _esperando ? null : () => _perguntar(_campo.text), icon: const Icon(Icons.arrow_upward_rounded, color: EloCores.inkOnBrand)),
              ),
            ]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Text('A Eloá responde em texto. Em emergência, ligue 192 (SAMU).', style: TextStyle(color: c.text3, fontSize: 11.5)),
        ),
      ]),
    );
  }
}

class _Balao extends StatelessWidget {
  const _Balao({required this.m});
  final _Mensagem m;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    final largura = MediaQuery.sizeOf(context).width * .8;
    final balao = Container(
      constraints: BoxConstraints(maxWidth: largura.clamp(200, 560)),
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
      decoration: BoxDecoration(
        gradient: m.minha ? EloCores.gradMarca : null,
        color: m.minha ? null : c.bg3,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(18), topRight: const Radius.circular(18),
          bottomLeft: Radius.circular(m.minha ? 18 : 4), bottomRight: Radius.circular(m.minha ? 4 : 18),
        ),
        border: m.minha ? null : Border.all(color: c.line),
      ),
      child: m.carregando
          ? const _Digitando()
          : SelectableText(m.texto, style: TextStyle(color: m.minha ? EloCores.inkOnBrand : c.text, height: 1.5, fontSize: 15.5, fontWeight: m.minha ? FontWeight.w600 : FontWeight.w400)),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: m.minha ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!m.minha) ...[const CircleAvatar(radius: 14, backgroundImage: AssetImage('assets/img/eloa-avatar.jpg')), const SizedBox(width: 8)],
          Flexible(child: balao),
        ],
      ),
    );
  }
}

/// Três pontos enquanto a Eloá pensa
class _Digitando extends StatefulWidget {
  const _Digitando();
  @override
  State<_Digitando> createState() => _DigitandoState();
}

class _DigitandoState extends State<_Digitando> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();

  @override
  void dispose() {
    _a.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cor = context.cores.text3;
    return SizedBox(
      height: 20, width: 44,
      child: AnimatedBuilder(
        animation: _a,
        builder: (_, _) => Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          for (var i = 0; i < 3; i++)
            Opacity(
              opacity: .3 + .7 * (1 - ((_a.value * 3 - i) % 3).clamp(0, 1)),
              child: Container(width: 7, height: 7, decoration: BoxDecoration(color: cor, shape: BoxShape.circle)),
            ),
        ]),
      ),
    );
  }
}
