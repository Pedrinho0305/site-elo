import 'package:flutter/material.dart';

import '../nucleo/sessao.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import '../widgets/formulario.dart';
import 'casca.dart';

/// Quem Somos: missão, a equipe e o formulário de contato (que é o destino
/// de "Fale conosco", "Ajuda" e "Esqueci minha senha").
class TelaQuemSomos extends StatelessWidget {
  const TelaQuemSomos({super.key, this.assunto});
  final String? assunto;

  static const _equipe = [
    ('Geovana Ribeiro', 'Designer UX/UI', 'Design inclusivo e acessibilidade digital para todas as idades', 'geo.gribeiro', 'geovana-ribeiro.jpg'),
    ('Guilherme Moraes', 'Designer Gamer', 'Produtor de jogos, formado pela Zion. Foco na Unreal e GDevelop', 'gui12161', 'guilherme-moraes.jpg'),
    ('Luiz Henrique', 'Engenharia de Hardware', 'Técnico em IoT e dispositivos vestíveis', 'luizhenribarbosa', 'luiz-henrique.jpg'),
    ('Luiza Gonçalves', 'Designer UX/UI', 'Design inclusivo e acessibilidade digital para todas as idades', 'luiza.glvz', 'luiza-goncalves.jpg'),
    ('Pedro Henrique', 'Desenvolvedor Full Stack', 'Expert em React Native e desenvolvimento de apps com foco em UX para idosos', 'ph_0305', 'pedro-henrique.jpg'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(titulo: 'Quem Somos'),
      body: PaginaRolavel(children: [
        const TituloSecao('Quem Somos', grande: true, apoio: 'Uma equipe multidisciplinar dedicada a transformar o cuidado com tecnologia'),
        const Respiro(20),
        Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Nosso propósito', style: TextStyle(color: c.cyan, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          const Text('Nossa Missão', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
          const SizedBox(height: 8),
          Text('Desenvolver soluções tecnológicas inovadoras para a terceira idade, fortalecendo o elo entre famílias e criando um futuro onde envelhecer é sinônimo de liberdade com proteção.',
              style: TextStyle(color: c.text2, height: 1.55, fontSize: 15.5)),
          const SizedBox(height: 16),
          for (final (icone, cor, titulo, texto) in [
            (Icons.directions_walk_rounded, c.green, 'Autonomia', 'Liberdade para ir e vir com confiança em cada trajeto do dia a dia.'),
            (Icons.shield_rounded, c.blue2, 'Segurança', 'Monitoramento discreto e alertas em tempo real para quem cuida.'),
            (Icons.favorite_rounded, c.purple, 'Dignidade', 'Tecnologia que respeita o ritmo e a privacidade de cada pessoa.'),
          ])
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                IconeAnel(icone, cor: cor, tamanho: 40),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(texto, style: TextStyle(color: c.text2, height: 1.45)),
                ])),
              ]),
            ),
        ])),
        const Respiro(32),
        const TituloSecao('Nosso Time'),
        const Respiro(14),
        LayoutBuilder(builder: (context, lim) {
          final colunas = lim.maxWidth > 560 ? 3 : 2;
          final largura = (lim.maxWidth - 12 * (colunas - 1)) / colunas;
          return Wrap(spacing: 12, runSpacing: 12, children: [
            for (final (nome, papel, bio, insta, foto) in _equipe)
              SizedBox(
                width: largura,
                child: Cartao(
                  padding: EdgeInsets.zero,
                  aoTocar: () => abrirLink(context, 'https://instagram.com/$insta'),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(Raio.lg)),
                      child: AspectRatio(aspectRatio: 3 / 4, child: Image.asset('assets/equipe/$foto', fit: BoxFit.cover, semanticLabel: nome)),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(nome, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5)),
                        Text(papel, style: TextStyle(color: c.cyan, fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 6),
                        Text(bio, style: TextStyle(color: c.text2, fontSize: 13, height: 1.4)),
                        const SizedBox(height: 6),
                        Text('@$insta', style: TextStyle(color: c.text3, fontSize: 12.5)),
                      ]),
                    ),
                  ]),
                ),
              ),
          ]);
        }),
        const Respiro(32),
        _FormularioContato(assunto: assunto),
      ]),
    );
  }
}

class _FormularioContato extends StatefulWidget {
  const _FormularioContato({this.assunto});
  final String? assunto;
  @override
  State<_FormularioContato> createState() => _FormularioContatoState();
}

class _FormularioContatoState extends State<_FormularioContato> {
  final _form = GlobalKey<FormState>();
  final _nome = TextEditingController(text: Sessao.i.nome);
  final _email = TextEditingController(text: Sessao.i.email);
  late final _assunto = TextEditingController(text: widget.assunto ?? '');
  final _telefone = TextEditingController();
  final _mensagem = TextEditingController();
  bool _enviando = false;
  (String, bool)? _status;

  Future<void> _enviar() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _enviando = true; _status = null; });
    try {
      final protocolo = await enviarMensagem({
        'tipo': 'contato', 'nome': _nome.text.trim(), 'email': _email.text.trim(), 'telefone': _telefone.text.trim(),
        'assunto': _assunto.text.trim(), 'mensagem': _mensagem.text.trim(), 'pagina': 'quem-somos',
      });
      final primeiro = _nome.text.trim().split(' ').first;
      setState(() => _status = ('Obrigado, $primeiro! Sua mensagem chegou à equipe e respondemos no seu e-mail em até 2 dias úteis.${protocolo != null ? ' O protocolo é $protocolo.' : ''}', true));
      _assunto.clear(); _telefone.clear(); _mensagem.clear();
    } catch (e) {
      setState(() => _status = (explicarErro(e), false));
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Cartao(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _form,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const TituloSecao('Entre em Contato', apoio: 'Tem dúvidas, sugestões ou quer fazer parte do projeto? Fale conosco!'),
          const SizedBox(height: 18),
          CampoTexto(rotulo: 'Nome completo', controller: _nome, autofill: const [AutofillHints.name]),
          CampoTexto(rotulo: 'E-mail', controller: _email, tipo: TextInputType.emailAddress, autofill: const [AutofillHints.email]),
          CampoTexto(rotulo: 'Assunto', controller: _assunto),
          CampoTexto(rotulo: 'Telefone', controller: _telefone, tipo: TextInputType.phone, obrigatorio: false),
          CampoTexto(rotulo: 'Mensagem', controller: _mensagem, linhas: 4),
          BotaoMarca(texto: 'Enviar mensagem', icone: Icons.send_rounded, carregando: _enviando, aoTocar: _enviar, expandir: true),
          if (_status != null) StatusFormulario(texto: _status!.$1, ok: _status!.$2),
        ]),
      ),
    );
  }
}
