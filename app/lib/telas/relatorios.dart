import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../nucleo/api.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import 'casca.dart';

/// Relatórios, com os dados reais (o mesmo do js/relatorios.js do site):
/// período (7 dias, 30 dias, este mês, mês passado ou datas), os quatro
/// números comparados com o período anterior, o mapa da pochete e o registro.
class TelaRelatorios extends StatefulWidget {
  const TelaRelatorios({super.key});
  @override
  State<TelaRelatorios> createState() => _TelaRelatoriosState();
}

class _Periodo {
  _Periodo(this.de, this.ate, this.rotulo, this.tipo);
  final DateTime de, ate; // ate é exclusivo (meia-noite do dia seguinte)
  final String rotulo, tipo;
}

class _TelaRelatoriosState extends State<TelaRelatorios> {
  late _Periodo periodo = _pronto('30');
  List<Map<String, dynamic>> pochetes = [], eventos = [], eventosAntes = [], corridas = [], corridasAntes = [];
  int pocheteNoMapa = 0;
  bool carregando = true, verTodos = false;
  String? erro;
  Timer? _timer;

  static DateTime _dia(DateTime d) => DateTime(d.year, d.month, d.day);
  static String _data(DateTime d) => '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  _Periodo _pronto(String tipo) {
    final hoje = _dia(DateTime.now());
    final amanha = hoje.add(const Duration(days: 1));
    return switch (tipo) {
      '7' => _Periodo(hoje.subtract(const Duration(days: 6)), amanha, 'Últimos 7 dias', '7'),
      'mes' => _Periodo(DateTime(hoje.year, hoje.month), amanha, 'Este mês', 'mes'),
      'mes-passado' => _Periodo(DateTime(hoje.year, hoje.month - 1), DateTime(hoje.year, hoje.month), 'Mês passado', 'mes-passado'),
      _ => _Periodo(hoje.subtract(const Duration(days: 29)), amanha, 'Últimos 30 dias', '30'),
    };
  }

  @override
  void initState() {
    super.initState();
    _carregar();
    // a pochete manda a posição a cada poucos minutos: o mapa acompanha
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _carregarPochetes());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _carregarPochetes() async {
    try {
      final r = await Api.chamar('pochetes');
      if (mounted) setState(() => pochetes = List<Map<String, dynamic>>.from(r['pochetes'] as List? ?? []));
    } catch (_) {}
  }

  Future<void> _carregar() async {
    setState(() { carregando = true; erro = null; verTodos = false; });
    final antes = periodo.de.subtract(periodo.ate.difference(periodo.de));
    try {
      final r = await Future.wait([
        Api.chamar('pochetes'),
        Api.chamar('eventos?de=${Uri.encodeComponent(antes.toUtc().toIso8601String())}&ate=${Uri.encodeComponent(periodo.ate.toUtc().toIso8601String())}&limite=1000'),
        Api.chamar('corridas'),
      ]);
      DateTime quando(Map x) => DateTime.parse('${x['criado_em']}').toLocal();
      bool noPeriodo(Map x) { final d = quando(x); return !d.isBefore(periodo.de) && d.isBefore(periodo.ate); }
      bool noAnterior(Map x) { final d = quando(x); return !d.isBefore(antes) && d.isBefore(periodo.de); }
      final ev = List<Map<String, dynamic>>.from(r[1]['eventos'] as List? ?? []);
      final co = List<Map<String, dynamic>>.from(r[2]['corridas'] as List? ?? []);
      if (!mounted) return;
      setState(() {
        pochetes = List<Map<String, dynamic>>.from(r[0]['pochetes'] as List? ?? []);
        eventos = ev.where(noPeriodo).toList();
        eventosAntes = ev.where(noAnterior).toList();
        corridas = co.where(noPeriodo).toList();
        corridasAntes = co.where(noAnterior).toList();
        carregando = false;
      });
    } on ErroApi catch (e) {
      if (mounted) setState(() { erro = e.mensagem; carregando = false; });
    }
  }

  Future<void> _escolherPeriodo() async {
    final escolha = await showModalBottomSheet<Object>(
      context: context,
      builder: (ctx) {
        final c = ctx.cores;
        return SafeArea(child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Escolher o período', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: 12),
            for (final (tipo, rotulo) in [('7', 'Últimos 7 dias'), ('30', 'Últimos 30 dias'), ('mes', 'Este mês'), ('mes-passado', 'Mês passado')])
              ListTile(
                title: Text(rotulo),
                trailing: periodo.tipo == tipo ? Icon(Icons.check_rounded, color: c.cyan) : null,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raio.md)),
                onTap: () => Navigator.pop(ctx, tipo),
              ),
            ListTile(
              leading: const Icon(Icons.date_range_rounded),
              title: const Text('Escolher as datas'),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raio.md)),
              onTap: () => Navigator.pop(ctx, 'datas'),
            ),
          ]),
        ));
      },
    );
    if (escolha == null) return;
    if (escolha == 'datas') {
      if (!mounted) return;
      final faixa = await showDateRangePicker(
        context: context,
        firstDate: DateTime(2024),
        lastDate: DateTime.now(),
        initialDateRange: DateTimeRange(start: periodo.de, end: periodo.ate.subtract(const Duration(days: 1))),
        helpText: 'Período do relatório',
        saveText: 'Aplicar',
      );
      if (faixa == null) return;
      periodo = _Periodo(_dia(faixa.start), _dia(faixa.end).add(const Duration(days: 1)), '${_data(faixa.start)} a ${_data(faixa.end)}', 'datas');
    } else {
      periodo = _pronto(escolha as String);
    }
    _carregar();
  }

  bool _ehAlerta(Map e) => e['tipo'] == 'emergencia' || (e['tipo'] == 'bateria' && (((e['dados'] as Map?)?['bateria'] as num?) ?? 100) <= 20);
  bool _ehBotao(Map e) => const ['emergencia', 'transporte', 'teste'].contains(e['tipo']);

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(titulo: 'Relatórios'),
      body: PaginaRolavel(aoAtualizar: _carregar, children: [
        const TituloSecao('Relatório e atividades', grande: true, apoio: 'Acompanhe tudo o que importa sobre o cuidado e o uso da pochete.'),
        const SizedBox(height: 16),
        Material(
          color: c.bg2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raio.md), side: BorderSide(color: c.line2)),
          child: InkWell(
            borderRadius: BorderRadius.circular(Raio.md),
            onTap: _escolherPeriodo,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(children: [
                Icon(Icons.calendar_month_rounded, color: c.cyan),
                const SizedBox(width: 10),
                Expanded(child: Text(periodo.rotulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                Text('${_data(periodo.de)} a ${_data(periodo.ate.subtract(const Duration(days: 1)))}', style: TextStyle(color: c.text3, fontSize: 12.5)),
                const SizedBox(width: 6),
                Icon(Icons.expand_more_rounded, color: c.text3),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (erro != null) StatusFormulario(texto: erro!, ok: false),
        _numeros(c),
        if (pochetes.isNotEmpty) ...[const Respiro(28), _mapa(c)],
        const Respiro(28),
        _registro(c),
      ]),
    );
  }

  Widget _numeros(EloCores c) {
    final semPochete = !carregando && pochetes.isEmpty;
    final encerradas = corridas.where((x) => !['pendente', 'aprovada', 'solicitada', 'a_caminho', 'em_andamento'].contains(x['status'])).toList();
    final concluidas = encerradas.where((x) => x['status'] == 'concluida').length;
    final emCurso = corridas.length - encerradas.length;
    final tiles = [
      _Numero(Icons.assignment_rounded, c.blue2, 'Total de atividades', eventos.length + corridas.length, eventosAntes.length + corridasAntes.length),
      _NumeroTexto(Icons.check_circle_rounded, c.green, 'Corridas concluídas',
          corridas.isEmpty || encerradas.isEmpty ? '–' : '${(concluidas / encerradas.length * 100).round()}%',
          corridas.isEmpty ? 'Nenhuma corrida no período' : '$concluidas de ${encerradas.length} encerrada${encerradas.length == 1 ? '' : 's'}${emCurso > 0 ? ', $emCurso em curso' : ''}'),
      _Numero(Icons.notifications_rounded, c.orange, 'Alertas gerados', eventos.where(_ehAlerta).length, eventosAntes.where(_ehAlerta).length, menosEhMelhor: true),
      _Numero(Icons.touch_app_rounded, c.purple, 'Botões apertados', eventos.where(_ehBotao).length, eventosAntes.where(_ehBotao).length),
    ];
    return LayoutBuilder(builder: (context, lim) {
      final col = lim.maxWidth > 620 ? 4 : 2;
      final larg = (lim.maxWidth - 12 * (col - 1)) / col;
      return Wrap(spacing: 12, runSpacing: 12, children: [
        for (final t in tiles)
          SizedBox(width: larg, child: carregando ? const _Carregando() : (semPochete ? _SemDados(t) : t)),
      ]);
    });
  }

  Widget _mapa(EloCores c) {
    final p = pochetes[pocheteNoMapa.clamp(0, pochetes.length - 1)];
    final pos = p['posicao'] as Map?;
    final contato = DateTime.tryParse('${p['ultimo_contato']}')?.toLocal();
    final casa = p['casa'] as Map?;
    String? distancia;
    if (pos != null && casa != null) {
      final m = _distancia((pos['lat'] as num).toDouble(), (pos['lng'] as num).toDouble(), (casa['lat'] as num).toDouble(), (casa['lng'] as num).toDouble());
      distancia = m < 1000 ? '${(m / 10).round() * 10} m' : '${(m / 1000).toStringAsFixed(1).replaceAll('.', ',')} km';
    }
    final fatos = [
      if (pos != null) ('Coordenadas', '${(pos['lat'] as num).toStringAsFixed(6)}, ${(pos['lng'] as num).toStringAsFixed(6)}'),
      ('Último contato', contato == null ? 'nunca' : _quando(contato)),
      if (distancia != null) ('Distância de ${casa!['nome'] ?? 'casa'}', distancia),
      if (p['bateria'] != null) ('Bateria', '${p['bateria']}%'),
    ];
    return Cartao(
      padding: EdgeInsets.zero,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (pos != null)
          Stack(children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(Raio.lg)),
              child: SizedBox(height: 260, child: MapaGoogle(lat: (pos['lat'] as num).toDouble(), lng: (pos['lng'] as num).toDouble(), altura: 260, interativo: true)),
            ),
            Positioned(left: 12, top: 12, child: IgnorePointer(child: ChipStatus(contato == null ? 'Última posição conhecida' : 'Última posição ${_quando(contato)}', cor: c.green))),
          ])
        else
          Container(
            height: 180,
            decoration: BoxDecoration(color: c.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(Raio.lg))),
            padding: const EdgeInsets.all(20),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.place_outlined, size: 40, color: c.cyan),
              const SizedBox(height: 8),
              Text('Assim que a pochete mandar a posição pelo GPS, o mapa aparece aqui. Para testar antes, use "Testar sem a pochete" no Painel.',
                  textAlign: TextAlign.center, style: TextStyle(color: c.text3, height: 1.45)),
            ]),
          ),
        Padding(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Onde está a pochete', style: GoogleFonts.unbounded(fontSize: 21, fontWeight: FontWeight.w700, letterSpacing: -.5)),
            if (pochetes.length > 1) ...[
              const SizedBox(height: 10),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final (i, x) in pochetes.indexed)
                  ChoiceChip(label: Text('${x['nome_idoso']}'), selected: i == pocheteNoMapa, onSelected: (_) => setState(() => pocheteNoMapa = i), shape: const StadiumBorder()),
              ]),
            ],
            const SizedBox(height: 8),
            Text(pos == null ? 'A pochete de ${p['nome_idoso']} ainda não mandou a localização.' : 'Última posição que a pochete de ${p['nome_idoso']} mandou.', style: TextStyle(color: c.text2)),
            const SizedBox(height: 8),
            for (final (i, (rotulo, valor)) in fatos.indexed)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: c.line))),
                child: Row(children: [
                  Expanded(child: Text(rotulo, style: TextStyle(color: c.text3, fontSize: 14))),
                  Text(valor, style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()])),
                ]),
              ),
            const SizedBox(height: 10),
            Wrap(spacing: 10, runSpacing: 10, children: [
              if (pos != null) ...[
                BotaoMarca(texto: 'Como chegar', icone: Icons.directions_rounded, aoTocar: () => abrirLink(context, googleRota((pos['lat'] as num).toDouble(), (pos['lng'] as num).toDouble()))),
                BotaoContorno(texto: 'Abrir no Google Maps', aoTocar: () => abrirLink(context, googleLink((pos['lat'] as num).toDouble(), (pos['lng'] as num).toDouble()))),
              ],
              BotaoContorno(texto: 'Atualizar', icone: Icons.refresh_rounded, aoTocar: () async { await _carregarPochetes(); if (mounted) avisar(context, 'Posição atualizada.'); }),
            ]),
          ]),
        ),
      ]),
    );
  }

  Widget _registro(EloCores c) {
    final linhas = [
      ...eventos.map((e) => _linhaEvento(c, e)).whereType<_Linha>(),
      ...corridas.map((x) => _linhaCorrida(c, x)),
    ]..sort((a, b) => b.quando.compareTo(a.quando));
    final visiveis = verTodos ? linhas : linhas.take(8).toList();
    return Cartao(
      padding: EdgeInsets.zero,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 10, 8),
          child: Row(children: [
            const Expanded(child: Text('Registro do sistema', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18))),
            if (linhas.length > 8)
              TextButton(onPressed: () => setState(() => verTodos = !verTodos),
                  child: Text(verTodos ? 'Mostrar menos' : 'Ver todos (${linhas.length})', style: TextStyle(color: c.cyan, fontWeight: FontWeight.w700))),
          ]),
        ),
        if (carregando) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
        else if (pochetes.isEmpty) Padding(padding: const EdgeInsets.all(20), child: Text('Nenhuma pochete vinculada ainda. Vincule a pochete no Painel para os registros aparecerem aqui.', textAlign: TextAlign.center, style: TextStyle(color: c.text3)))
        else if (linhas.isEmpty) Padding(padding: const EdgeInsets.all(20), child: Text('Nada registrado entre ${_data(periodo.de)} e ${_data(periodo.ate.subtract(const Duration(days: 1)))}. Escolha outro período.', textAlign: TextAlign.center, style: TextStyle(color: c.text3)))
        else for (final l in visiveis) Container(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: c.line))),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            IconeAnel(l.icone, cor: l.cor, tamanho: 36),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(l.tipo, style: TextStyle(color: l.cor, fontWeight: FontWeight.w700, fontSize: 13.5)),
                const Spacer(),
                Text('${_data(l.quando)} ${l.quando.hour.toString().padLeft(2, '0')}:${l.quando.minute.toString().padLeft(2, '0')}',
                    style: TextStyle(color: c.text3, fontSize: 12.5, fontFeatures: const [FontFeature.tabularFigures()])),
              ]),
              const SizedBox(height: 3),
              Text(l.texto, style: TextStyle(color: c.text, height: 1.4)),
              if (l.lat != null)
                GestureDetector(
                  onTap: () => abrirMapa(context, lat: l.lat!, lng: l.lng!, titulo: '${l.tipo}, ${_data(l.quando)}'),
                  child: Padding(padding: const EdgeInsets.only(top: 4), child: Text('Ver no mapa', style: TextStyle(color: c.cyan, fontWeight: FontWeight.w600, decoration: TextDecoration.underline, decorationColor: c.cyan))),
                ),
            ])),
          ]),
        ),
      ]),
    );
  }

  _Linha? _linhaEvento(EloCores c, Map<String, dynamic> e) {
    final d = (e['dados'] as Map?) ?? {};
    final nome = e['nome_idoso'] ?? 'A pochete';
    final pelo = d['origem'] == 'painel' ? ' (teste pelo painel)' : '';
    final quando = DateTime.parse('${e['criado_em']}').toLocal();
    final lat = (d['lat'] as num?)?.toDouble(), lng = (d['lng'] as num?)?.toDouble();
    switch (e['tipo']) {
      case 'emergencia': return _Linha(quando, 'Emergência', c.red, Icons.notification_important_rounded, '$nome apertou o botão vermelho$pelo.', lat, lng);
      case 'transporte':
        final destino = (d['destino'] as Map?)?['nome'];
        return _Linha(quando, 'Pedido de carro', c.orange, Icons.directions_car_rounded, '$nome apertou o botão amarelo e pediu um carro${destino != null ? ' para $destino' : ''}$pelo.', lat, lng);
      case 'bateria':
        final b = d['bateria'] as num?;
        final baixa = b != null && b <= 20;
        return _Linha(quando, baixa ? 'Bateria baixa' : 'Bateria', baixa ? c.orange : c.blue2, Icons.battery_std_rounded, 'Pochete de $nome com ${b ?? '?'}% de bateria$pelo.', null, null);
      case 'localizacao': return _Linha(quando, 'Localização', c.blue2, Icons.place_rounded, 'Posição de $nome atualizada$pelo.', lat, lng);
      case 'teste': return _Linha(quando, 'Teste', c.green, Icons.check_circle_rounded, 'Teste da pochete de $nome: tudo funcionando$pelo.', null, null);
    }
    return null;
  }

  _Linha _linhaCorrida(EloCores c, Map<String, dynamic> x) {
    const status = {
      'pendente': 'esperando sua aprovação', 'aprovada': 'aprovada', 'solicitada': 'procurando motorista', 'a_caminho': 'motorista a caminho',
      'em_andamento': 'em viagem', 'concluida': 'concluída', 'recusada': 'recusada', 'cancelada': 'cancelada', 'sem_motorista': 'sem motorista disponível', 'erro': 'não deu certo',
    };
    final p = pochetes.where((p) => p['id'] == x['pochete_id']).firstOrNull;
    final detalhes = [x['motorista'], x['valor']].whereType<String>().join(', ');
    return _Linha(DateTime.parse('${x['criado_em']}').toLocal(), 'Corrida', x['status'] == 'concluida' ? c.green : c.purple, Icons.local_taxi_rounded,
        'Corrida de ${p?['nome_idoso'] ?? 'a pochete'} para ${(x['destino'] as Map?)?['nome'] ?? 'o destino informado'}: ${status[x['status']] ?? x['status']}${detalhes.isNotEmpty ? ' ($detalhes)' : ''}.', null, null);
  }
}

String _quando(DateTime d) {
  final hoje = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
  final hm = '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  if (!d.isBefore(hoje)) return 'hoje às $hm';
  if (!d.isBefore(hoje.subtract(const Duration(days: 1)))) return 'ontem às $hm';
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} às $hm';
}

double _distancia(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371e3, rad = math.pi / 180;
  final dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  final h = math.pow(math.sin(dLat / 2), 2) + math.cos(lat1 * rad) * math.cos(lat2 * rad) * math.pow(math.sin(dLng / 2), 2);
  return 2 * r * math.asin(math.sqrt(h));
}

class _Linha {
  _Linha(this.quando, this.tipo, this.cor, this.icone, this.texto, this.lat, this.lng);
  final DateTime quando;
  final String tipo, texto;
  final Color cor;
  final IconData icone;
  final double? lat, lng;
}

/// Número do período com a comparação ao período anterior
class _Numero extends StatelessWidget {
  const _Numero(this.icone, this.cor, this.titulo, this.atual, this.anterior, {this.menosEhMelhor = false});
  final IconData icone;
  final Color cor;
  final String titulo;
  final int atual, anterior;
  final bool menosEhMelhor;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    Widget delta;
    if (atual == anterior || anterior == 0) {
      delta = Text(anterior == 0 ? 'Nada no período anterior' : 'Igual ao período anterior', style: TextStyle(color: c.text3, fontSize: 12.5));
    } else {
      final subiu = atual > anterior;
      final pct = ((atual - anterior).abs() / anterior * 100).round();
      final bom = subiu != menosEhMelhor; // nos alertas, cair é bom
      delta = Row(children: [
        Icon(subiu ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded, size: 16, color: bom ? c.green2 : c.red),
        const SizedBox(width: 4),
        Expanded(child: Text('$pct% em relação ao período anterior', style: TextStyle(color: c.text2, fontSize: 12.5))),
      ]);
    }
    return _MolduraNumero(icone: icone, cor: cor, titulo: titulo, valor: '$atual', rodape: delta);
  }
}

class _NumeroTexto extends StatelessWidget {
  const _NumeroTexto(this.icone, this.cor, this.titulo, this.valor, this.nota);
  final IconData icone;
  final Color cor;
  final String titulo, valor, nota;

  @override
  Widget build(BuildContext context) =>
      _MolduraNumero(icone: icone, cor: cor, titulo: titulo, valor: valor, rodape: Text(nota, style: TextStyle(color: context.cores.text2, fontSize: 12.5)));
}

class _MolduraNumero extends StatelessWidget {
  const _MolduraNumero({required this.icone, required this.cor, required this.titulo, required this.valor, required this.rodape});
  final IconData icone;
  final Color cor;
  final String titulo, valor;
  final Widget rodape;

  @override
  Widget build(BuildContext context) => Cartao(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 150,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            IconeAnel(icone, cor: cor, tamanho: 40),
            const SizedBox(height: 10),
            Text(titulo, style: TextStyle(color: context.cores.text2, fontWeight: FontWeight.w600, fontSize: 13.5)),
            Text(valor, style: GoogleFonts.unbounded(fontSize: 28, fontWeight: FontWeight.w700, color: cor)),
            const Spacer(),
            rodape,
          ]),
        ),
      );
}

class _SemDados extends StatelessWidget {
  const _SemDados(this.original);
  final Widget original;
  @override
  Widget build(BuildContext context) => Opacity(opacity: .55, child: IgnorePointer(child: original));
}

class _Carregando extends StatelessWidget {
  const _Carregando();
  @override
  Widget build(BuildContext context) => const Cartao(padding: EdgeInsets.all(16), child: SizedBox(height: 150, child: Center(child: CircularProgressIndicator(strokeWidth: 2.4))));
}
