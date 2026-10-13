import 'dart:async';

import 'package:flutter/material.dart';

import '../nucleo/api.dart';
import '../nucleo/avisos.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';

/// Partes do Painel que o site tem em js/painel-familia.js e na janela de
/// mensagem de js/painel-pochete.js: familiares, mensagem para a pochete e
/// edição de endereço/telefone da pochete. Mesmas rotas do site.

/* --------------------------------------------------------------------------
   Telefone: "(11) 99999-0000" para mostrar, "tel:+5511999990000" para ligar
   -------------------------------------------------------------------------- */
String _digitos(String? t) => (t ?? '').replaceAll(RegExp(r'\D'), '');

String telefoneLegivel(String? t) {
  var d = _digitos(t);
  if (d.startsWith('55') && (d.length == 12 || d.length == 13)) d = d.substring(2);
  if (d.length == 11) return '(${d.substring(0, 2)}) ${d.substring(2, 7)}-${d.substring(7)}';
  if (d.length == 10) return '(${d.substring(0, 2)}) ${d.substring(2, 6)}-${d.substring(6)}';
  return t ?? '';
}

String linkLigar(String? t) {
  final bruto = (t ?? '').trim();
  final d = _digitos(bruto);
  if (bruto.startsWith('+')) return 'tel:+$d';
  if (d.length == 10 || d.length == 11) return 'tel:+55$d';
  return 'tel:$d';
}

/// "Dona Lia Souza" → "Dona Lia"; "Maria Souza" → "Maria"
String chamarPeloNome(String? nome) {
  final p = (nome ?? '').trim().split(RegExp(r'\s+')).where((x) => x.isNotEmpty).toList();
  if (p.isEmpty) return '';
  final titulo = RegExp(r'^(dona|seu|sr\.?|sra\.?|dr\.?|dra\.?|vó|vô|tia|tio)$', caseSensitive: false);
  return titulo.hasMatch(p[0]) && p.length > 1 ? '${p[0]} ${p[1]}' : p[0];
}

String _hora(dynamic iso) {
  final d = DateTime.tryParse('$iso')?.toLocal();
  if (d == null) return '';
  return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

/* --------------------------------------------------------------------------
   Familiares
   -------------------------------------------------------------------------- */
class SecaoFamiliares extends StatefulWidget {
  const SecaoFamiliares({super.key});
  @override
  State<SecaoFamiliares> createState() => SecaoFamiliaresState();
}

class SecaoFamiliaresState extends State<SecaoFamiliares> {
  List<Map<String, dynamic>> familiares = [];
  List<String> parentescos = const ['Filho(a)', 'Neto(a)', 'Cônjuge', 'Irmão(ã)', 'Sobrinho(a)', 'Genro ou nora', 'Vizinho(a)', 'Amigo(a)', 'Cuidador(a)', 'Outro'];
  bool emailAtivo = true;
  bool carregando = true;
  String? erro;

  @override
  void initState() {
    super.initState();
    carregar();
  }

  Future<void> carregar() async {
    try {
      final r = await Api.chamar('familiares');
      if (!mounted) return;
      setState(() {
        familiares = List<Map<String, dynamic>>.from(r['familiares'] as List? ?? []);
        parentescos = List<String>.from(r['parentescos'] as List? ?? parentescos);
        emailAtivo = r['avisos_por_email'] != false;
        carregando = false;
        erro = null;
      });
    } on ErroApi catch (e) {
      if (mounted) setState(() { erro = e.mensagem; carregando = false; });
    }
  }

  Future<void> _formulario([Map<String, dynamic>? atual]) async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FormFamiliar(atual: atual, parentescos: parentescos),
    );
    if (salvou == true) await carregar();
  }

  Future<void> _remover(Map<String, dynamic> f) async {
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: Text('Remover ${f['nome']}?'),
      content: const Text('A pessoa sai da lista de familiares e deixa de receber avisos.'),
      actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remover'))],
    )) ?? false;
    if (!ok) return;
    try {
      await Api.chamar('familiares/${f['id']}', metodo: 'DELETE');
      await carregar();
    } on ErroApi catch (e) {
      if (mounted) avisar(context, e.mensagem);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const TituloSecao('Familiares', apoio: 'Cadastre quem mais acompanha a pessoa. Você liga para qualquer um daqui, e quem tiver e-mail pode ser avisado na hora de uma emergência.'),
      const SizedBox(height: 14),
      Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Text('Cadastrados', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
          const SizedBox(width: 8),
          if (familiares.isNotEmpty) Text('${familiares.length} de 10', style: TextStyle(color: c.text3, fontSize: 13)),
        ]),
        const SizedBox(height: 10),
        if (carregando) const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
        else if (erro != null) Text(erro!, style: TextStyle(color: c.text3))
        else if (familiares.isEmpty) Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(Raio.md), border: Border.all(color: c.line2)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Ninguém cadastrado ainda.', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text('Comece por quem mora mais perto ou atende o telefone mais rápido: é quem você vai querer chamar numa emergência.', style: TextStyle(color: c.text3, fontSize: 13.5, height: 1.45)),
          ]),
        )
        else for (final f in familiares) _item(c, f),
        const SizedBox(height: 12),
        BotaoContorno(texto: 'Cadastrar familiar', icone: Icons.person_add_alt_1_rounded, aoTocar: familiares.length >= 10 ? null : () => _formulario()),
      ])),
    ]);
  }

  Widget _item(EloCores c, Map<String, dynamic> f) {
    final nome = '${f['nome']}';
    final iniciais = nome.split(' ').where((p) => p.isNotEmpty).take(2).map((p) => p[0].toUpperCase()).join();
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: c.bg2, borderRadius: BorderRadius.circular(Raio.md), border: Border.all(color: c.line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(radius: 21, backgroundColor: c.orange.withValues(alpha: .14),
              child: Text(iniciais, style: TextStyle(color: c.orange, fontWeight: FontWeight.w700, fontSize: 13))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(nome, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text([f['parentesco'], if (f['telefone'] != null) telefoneLegivel(f['telefone'] as String?)].join(' · '), style: TextStyle(color: c.text3, fontSize: 13)),
            if (f['email'] != null) Text('${f['email']}', style: TextStyle(color: c.text3, fontSize: 13)),
            if (f['avisar'] == true) Container(
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(color: c.red.withValues(alpha: .1), borderRadius: BorderRadius.circular(999), border: Border.all(color: c.red.withValues(alpha: .35))),
              child: Text(emailAtivo ? 'Recebe aviso de emergência' : 'Aviso de emergência · e-mail simulado', style: TextStyle(color: c.red, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ])),
        ]),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          if (f['telefone'] != null) BotaoMarca(texto: 'Ligar', icone: Icons.call_rounded, aoTocar: () => abrirLink(context, linkLigar(f['telefone'] as String?))),
          BotaoContorno(texto: 'Editar', compacto: true, aoTocar: () => _formulario(f)),
          BotaoContorno(texto: 'Remover', compacto: true, cor: c.red, aoTocar: () => _remover(f)),
        ]),
      ]),
    );
  }
}

class _FormFamiliar extends StatefulWidget {
  const _FormFamiliar({this.atual, required this.parentescos});
  final Map<String, dynamic>? atual;
  final List<String> parentescos;
  @override
  State<_FormFamiliar> createState() => _FormFamiliarState();
}

class _FormFamiliarState extends State<_FormFamiliar> {
  late final _nome = TextEditingController(text: widget.atual?['nome'] as String? ?? '');
  late final _telefone = TextEditingController(text: telefoneLegivel(widget.atual?['telefone'] as String?));
  late final _email = TextEditingController(text: widget.atual?['email'] as String? ?? '');
  late String _parentesco = widget.atual?['parentesco'] as String? ?? widget.parentescos.first;
  late bool _avisar = widget.atual?['avisar'] == true;
  bool _enviando = false;
  String? _erro;

  Future<void> _salvar() async {
    final nome = _nome.text.trim(), telefone = _telefone.text.trim(), email = _email.text.trim();
    String? problema;
    if (nome.length < 2) { problema = 'Digite o nome do familiar.'; }
    else if (telefone.isEmpty && email.isEmpty) { problema = 'Coloque pelo menos o telefone ou o e-mail.'; }
    else if (_avisar && email.isEmpty) { problema = 'Para avisar em emergência, coloque o e-mail.'; }
    if (problema != null) { setState(() => _erro = problema); return; }
    setState(() { _enviando = true; _erro = null; });
    final corpo = {'nome': nome, 'parentesco': _parentesco, 'telefone': telefone.isEmpty ? null : telefone, 'email': email.isEmpty ? null : email, 'avisar': _avisar};
    try {
      if (widget.atual == null) {
        await Api.chamar('familiares', metodo: 'POST', corpo: corpo);
      } else {
        await Api.chamar('familiares/${widget.atual!['id']}', metodo: 'PATCH', corpo: corpo);
      }
      if (mounted) Navigator.pop(context, true);
    } on ErroApi catch (e) {
      setState(() => _erro = e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.viewInsetsOf(context).bottom + 20),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(widget.atual == null ? 'Cadastrar familiar' : 'Editar ${chamarPeloNome(widget.atual!['nome'] as String?)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 19)),
          const SizedBox(height: 14),
          TextField(controller: _nome, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Nome')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: widget.parentescos.contains(_parentesco) ? _parentesco : widget.parentescos.last,
            decoration: const InputDecoration(labelText: 'Parentesco'),
            items: [for (final p in widget.parentescos) DropdownMenuItem(value: p, child: Text(p))],
            onChanged: (v) => setState(() => _parentesco = v ?? _parentesco),
          ),
          const SizedBox(height: 12),
          TextField(controller: _telefone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telefone com DDD')),
          const SizedBox(height: 12),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail')),
          const SizedBox(height: 6),
          CheckboxListTile(
            value: _avisar,
            onChanged: (v) => setState(() => _avisar = v ?? false),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            title: const Text('Avisar por e-mail quando o botão vermelho for apertado'),
          ),
          const SizedBox(height: 8),
          BotaoMarca(texto: widget.atual == null ? 'Cadastrar' : 'Salvar alterações', carregando: _enviando, aoTocar: _salvar, expandir: true),
          if (_erro != null) StatusFormulario(texto: _erro!, ok: false),
        ]),
      ),
    );
  }
}

/* --------------------------------------------------------------------------
   Mensagem para a pochete
   -------------------------------------------------------------------------- */
Future<void> abrirMensagem(BuildContext context, List<Map<String, dynamic>> pochetes) =>
    showModalBottomSheet<void>(context: context, isScrollControlled: true, builder: (_) => _FormRecado(pochetes: pochetes));

const _statusRecado = {'pendente': 'Esperando a pochete buscar', 'entregue': 'Chegou na pochete, tocando', 'confirmado': 'Ouviu'};

class _FormRecado extends StatefulWidget {
  const _FormRecado({required this.pochetes});
  final List<Map<String, dynamic>> pochetes;
  @override
  State<_FormRecado> createState() => _FormRecadoState();
}

class _FormRecadoState extends State<_FormRecado> {
  final _texto = TextEditingController();
  late Map<String, dynamic> _pochete = widget.pochetes.first;
  List<Map<String, dynamic>> _recados = [];
  List<String> _prontos = [];
  bool _enviando = false;
  String? _status;
  bool _ok = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _carregar();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _carregar());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _carregar() async {
    try {
      final r = await Api.chamar('pochetes/${_pochete['id']}/recados?limite=8');
      if (!mounted) return;
      final novos = List<Map<String, dynamic>>.from(r['recados'] as List? ?? []);
      // alguma que estava esperando acabou de ser ouvida? avisa
      for (final n in novos) {
        final antes = _recados.where((x) => x['id'] == n['id']).firstOrNull;
        if (antes != null && antes['status'] != 'confirmado' && n['status'] == 'confirmado') {
          Avisos.i.mostrar(Aviso(tipo: 'teste', titulo: '${chamarPeloNome(_pochete['nome_idoso'] as String?)} ouviu sua mensagem', texto: '"${n['texto']}"'));
        }
      }
      setState(() {
        _recados = novos;
        _prontos = [for (final p in (r['prontos'] as List? ?? [])) '${(p as Map)['texto']}'];
      });
    } on ErroApi catch (_) {}
  }

  Future<void> _enviar() async {
    final texto = _texto.text.trim();
    if (texto.length < 2) { setState(() { _status = 'Escolha uma mensagem pronta ou escreva a sua.'; _ok = false; }); return; }
    setState(() { _enviando = true; _status = null; });
    try {
      await Api.chamar('pochetes/${_pochete['id']}/recados', metodo: 'POST', corpo: {'texto': texto});
      _texto.clear();
      setState(() { _status = 'Enviada. A pochete toca a mensagem na próxima vez que falar com o servidor (em até 15 segundos).'; _ok = true; });
      await _carregar();
    } on ErroApi catch (e) {
      setState(() { _status = e.mensagem; _ok = false; });
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  Future<void> _simularOuviu(Map<String, dynamic> r) async {
    try {
      await Api.chamar('pochetes/${_pochete['id']}/recados/${r['id']}/confirmar', metodo: 'POST');
      await _carregar();
    } on ErroApi catch (e) {
      if (mounted) avisar(context, e.mensagem);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.viewInsetsOf(context).bottom + 20),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Mensagem para a pochete', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 19)),
          const SizedBox(height: 12),
          if (widget.pochetes.length > 1) ...[
            DropdownButtonFormField<int>(
              initialValue: _pochete['id'] as int,
              decoration: const InputDecoration(labelText: 'Para quem'),
              items: [for (final p in widget.pochetes) DropdownMenuItem(value: p['id'] as int, child: Text('${p['nome_idoso']}'))],
              onChanged: (v) { setState(() { _pochete = widget.pochetes.firstWhere((p) => p['id'] == v); _recados = []; }); _carregar(); },
            ),
            const SizedBox(height: 12),
          ] else Text('Para ${_pochete['nome_idoso']}', style: TextStyle(color: c.text3)),
          const SizedBox(height: 8),
          Text('Mensagens prontas (tocam com a voz gravada na pochete)', style: TextStyle(fontWeight: FontWeight.w600, color: c.text2, fontSize: 13.5)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final p in _prontos) ActionChip(label: Text(p), onPressed: () => setState(() => _texto.text = p)),
          ]),
          const SizedBox(height: 14),
          TextField(controller: _texto, maxLength: 160, minLines: 2, maxLines: 4, decoration: const InputDecoration(labelText: 'Ou escreva')),
          Text('Texto escrito faz a pochete tocar o aviso de mensagem nova e piscar o anel azul. A pessoa aperta qualquer botão para dizer que ouviu.', style: TextStyle(color: c.text3, fontSize: 12.5, height: 1.4)),
          const SizedBox(height: 14),
          BotaoMarca(texto: 'Enviar para a pochete', icone: Icons.send_rounded, carregando: _enviando, aoTocar: _enviar, expandir: true),
          if (_status != null) StatusFormulario(texto: _status!, ok: _ok),
          const SizedBox(height: 18),
          const Text('Enviadas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 8),
          if (_recados.isEmpty) Text('Nenhuma mensagem ainda.', style: TextStyle(color: c.text3))
          else for (final r in _recados) Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: c.bg2, borderRadius: BorderRadius.circular(Raio.sm),
              border: Border(left: BorderSide(width: 3, color: r['status'] == 'confirmado' ? c.green : (r['status'] == 'entregue' ? c.blue2 : c.text3))),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${r['texto']}', style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('${_hora(r['criado_em'])} · ${_statusRecado[r['status']] ?? r['status']}${r['status'] == 'confirmado' && r['confirmado_em'] != null ? ' às ${_hora(r['confirmado_em'])}' : ''}',
                  style: TextStyle(color: c.text3, fontSize: 12.5)),
              if (r['status'] != 'confirmado') TextButton(onPressed: () => _simularOuviu(r), child: const Text('Testar: fazer de conta que ela ouviu')),
            ]),
          ),
        ]),
      ),
    );
  }
}

/* --------------------------------------------------------------------------
   Editar a pochete: endereço de casa (texto) e telefone
   -------------------------------------------------------------------------- */
Future<bool> editarPochete(BuildContext context, Map<String, dynamic> p) async =>
    await showModalBottomSheet<bool>(context: context, isScrollControlled: true, builder: (_) => _FormEditarPochete(pochete: p)) ?? false;

class _FormEditarPochete extends StatefulWidget {
  const _FormEditarPochete({required this.pochete});
  final Map<String, dynamic> pochete;
  @override
  State<_FormEditarPochete> createState() => _FormEditarPocheteState();
}

class _FormEditarPocheteState extends State<_FormEditarPochete> {
  late final _endereco = TextEditingController(text: widget.pochete['endereco'] as String? ?? '');
  late final _telefone = TextEditingController(text: telefoneLegivel(widget.pochete['telefone_idoso'] as String?));
  bool _enviando = false;
  String? _erro;

  Future<void> _salvar() async {
    final endereco = _endereco.text.trim();
    final mudou = endereco != (widget.pochete['endereco'] as String? ?? '');
    setState(() { _enviando = true; _erro = null; });
    try {
      final r = await Api.chamar('pochetes/${widget.pochete['id']}', metodo: 'PATCH', corpo: {
        'telefone_idoso': _telefone.text.trim().isEmpty ? null : _telefone.text.trim(),
        if (mudou) 'casa': endereco.isEmpty ? null : {'endereco': endereco},
      });
      final p = r['pochete'] as Map;
      if (p['endereco'] != null && p['casa'] == null) {
        Avisos.i.mostrar(Aviso(tipo: 'teste', titulo: 'Salvo, mas não achei o endereço no mapa', texto: 'O Uber vai receber o endereço escrito. Se puder, confira o número e a cidade.'));
      }
      if (mounted) Navigator.pop(context, true);
    } on ErroApi catch (e) {
      setState(() => _erro = e.mensagem);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.viewInsetsOf(context).bottom + 20),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Pochete de ${widget.pochete['nome_idoso']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 19)),
          const SizedBox(height: 14),
          TextField(controller: _endereco, keyboardType: TextInputType.streetAddress, decoration: const InputDecoration(labelText: 'Endereço de casa', hintText: 'Rua das Flores, 123, Jardim Paulista, São Paulo')),
          const SizedBox(height: 6),
          Text('Rua, número, bairro e cidade. É o destino quando o botão preto pede um carro; o mapa é achado sozinho.', style: TextStyle(color: c.text3, fontSize: 13)),
          const SizedBox(height: 12),
          TextField(controller: _telefone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Telefone dela')),
          const SizedBox(height: 16),
          BotaoMarca(texto: 'Salvar', carregando: _enviando, aoTocar: _salvar, expandir: true),
          if (_erro != null) StatusFormulario(texto: _erro!, ok: false),
        ]),
      ),
    );
  }
}
