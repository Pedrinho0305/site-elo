import 'dart:async';

import 'package:flutter/material.dart';

import 'api.dart';
import 'sessao.dart';

/// Um aviso na tela: o mesmo que o servidor manda ao Telegram (emergência,
/// pedido de carro, bateria baixa, teste) ou um recado do próprio app.
class Aviso {
  Aviso({
    required this.tipo,
    required this.titulo,
    this.rotulo,
    this.texto = '',
    this.lat,
    this.lng,
    this.bateria,
    this.acoes = const [],
    this.fixo = false,
    this.duracao = const Duration(seconds: 9),
    this.cor,
    this.icone,
    DateTime? em,
  })  : em = em ?? DateTime.now(),
        id = _proximo++;

  static int _proximo = 0;
  final int id;
  final String tipo; // emergencia | transporte | bateria | teste | local | corrida | telegram | acao
  final String titulo;
  final String? rotulo;
  final String texto;
  final double? lat, lng;
  final int? bateria;
  final List<AcaoAviso> acoes;
  final bool fixo; // emergência não some sozinha
  final Duration duracao;
  final Color? cor; // o card de um botão usa a cor do botão
  final IconData? icone;
  final DateTime em;
  bool telegram = false;
}

class AcaoAviso {
  const AcaoAviso(this.texto, this.aoTocar, {this.principal = false, this.fecha = true});
  final String texto;
  final void Function(BuildContext context) aoTocar;
  final bool principal;
  final bool fecha;
}

/// A central de avisos: consulta GET /api/eventos a cada 15 s enquanto há
/// sessão e o app está aberto, e mostra cada evento novo como card.
/// 'elo-avisos-ultimo' guarda o último evento mostrado (nada repete ao
/// reabrir; só os da última meia hora aparecem).
class Avisos extends ChangeNotifier {
  Avisos._() {
    Sessao.i.addListener(_sessaoMudou);
    _sessaoMudou();
  }
  static final i = Avisos._();

  static const _chave = 'elo-avisos-ultimo';
  static const _recente = Duration(minutes: 30);

  final List<Aviso> visiveis = [];
  int? abertoId; // só um aberto por vez; os outros encolhem (emergência nunca)
  Timer? _timer;

  /// Quem sabe navegar (definido pela casca do app): ir ao Painel, abrir mapa
  void Function(String destino)? navegar;
  void Function(double lat, double lng, String titulo)? mostrarMapa;

  void _sessaoMudou() {
    if (Sessao.i.logado && _timer == null) {
      consultar();
      _timer = Timer.periodic(const Duration(seconds: 15), (_) => consultar());
    } else if (!Sessao.i.logado) {
      _timer?.cancel();
      _timer = null;
    }
  }

  bool _consultando = false;
  Future<void> consultar() async {
    if (!Sessao.i.logado || _consultando) return;
    _consultando = true;
    try {
      final r = await Api.chamar('eventos?limite=10');
      chegaram(List<Map<String, dynamic>>.from((r['eventos'] as List?) ?? []));
    } catch (_) {
      // sem servidor, sem aviso
    } finally {
      _consultando = false;
    }
  }

  /// Uma leva consultada: na primeira vez só marca de onde começar
  void chegaram(List<Map<String, dynamic>> eventos) {
    if (eventos.isEmpty) return;
    final maior = eventos.map((e) => (e['id'] as num).toInt()).reduce((a, b) => a > b ? a : b);
    final ultimo = Sessao.i.lerInt(_chave);
    Sessao.i.gravarInt(_chave, ultimo == null ? maior : (maior > ultimo ? maior : ultimo));
    if (ultimo == null) return;
    final novos = eventos.where((e) {
      final id = (e['id'] as num).toInt();
      final em = DateTime.tryParse('${e['criado_em']}') ?? DateTime.now();
      return id > ultimo && DateTime.now().difference(em) < _recente;
    }).toList()
      ..sort((a, b) => (a['id'] as num).compareTo(b['id'] as num));
    for (final e in novos) {
      mostrarEvento(e);
    }
  }

  /// Um evento que acabou de acontecer (botão apertado no Painel)
  void evento(Map<String, dynamic>? ev, {bool sempre = false}) {
    if (ev == null) return;
    final id = (ev['id'] as num?)?.toInt();
    final ultimo = Sessao.i.lerInt(_chave);
    if (id != null && ultimo != null && id <= ultimo) return;
    if (id != null) Sessao.i.gravarInt(_chave, ultimo == null || id > ultimo ? id : ultimo);
    mostrarEvento(ev, sempre: sempre);
  }

  /// Evento → card, com os mesmos textos do Telegram
  void mostrarEvento(Map<String, dynamic> ev, {bool sempre = false}) {
    final d = Map<String, dynamic>.from((ev['dados'] as Map?) ?? {});
    final nome = (ev['nome_idoso'] as String?) ?? 'A pochete';
    final em = DateTime.tryParse('${ev['criado_em']}')?.toLocal() ?? DateTime.now();
    final lat = (d['lat'] as num?)?.toDouble();
    final lng = (d['lng'] as num?)?.toDouble();
    final temMapa = lat != null && lng != null;
    final noMapa = temMapa
        ? [AcaoAviso('Abrir no mapa', (_) => mostrarMapa?.call(lat, lng, 'Onde está $nome'), fecha: false)]
        : <AcaoAviso>[];
    final bateria = (d['bateria'] as num?)?.toInt();

    switch (ev['tipo']) {
      case 'emergencia':
        mostrar(Aviso(tipo: 'emergencia', fixo: true, em: em, lat: lat, lng: lng,
            titulo: '$nome apertou o botão vermelho',
            texto: 'Veja como está e, se for preciso, ligue 192 (SAMU).',
            acoes: [AcaoAviso('Ligar 192', (ctx) => navegar?.call('tel:192'), principal: true, fecha: false), ...noMapa]));
      case 'transporte':
        final destino = (d['destino'] as Map?)?['nome'];
        mostrar(Aviso(tipo: 'transporte', duracao: const Duration(seconds: 20), em: em, lat: lat, lng: lng,
            titulo: '$nome quer um carro',
            texto: '${destino != null ? 'Destino: $destino. ' : ''}O carro só é chamado depois que você aprovar.',
            acoes: [AcaoAviso('Ver pedido', (_) => navegar?.call('painel'), principal: true), ...noMapa]));
      case 'bateria':
        if (bateria == null || (bateria > 20 && !sempre)) return;
        final boa = bateria > 20;
        mostrar(Aviso(tipo: 'bateria', em: em, bateria: bateria, rotulo: boa ? 'Bateria' : null, cor: boa ? const Color(0xFF22C55E) : null,
            duracao: Duration(seconds: boa ? 8 : 12),
            titulo: 'Pochete de $nome com $bateria%',
            texto: boa ? 'Carga boa, nada a fazer por enquanto.' : 'Lembre de carregar hoje à noite.'));
      case 'teste':
        mostrar(Aviso(tipo: 'teste', em: em, duracao: const Duration(seconds: 8),
            titulo: 'Pochete de $nome funcionando', texto: 'Tudo certo por aqui: o teste chegou ao servidor.'));
      case 'localizacao':
        if (!sempre || !temMapa) return; // no dia a dia só atualiza o painel
        mostrar(Aviso(tipo: 'local', em: em, lat: lat, lng: lng, duracao: const Duration(seconds: 12),
            titulo: 'Posição de $nome atualizada', texto: 'Esta é a posição que a pochete acabou de mandar.', acoes: noMapa));
    }
  }

  void mostrar(Aviso a) {
    a.telegram = Sessao.i.telegramVinculado && const {'emergencia', 'transporte', 'bateria', 'teste'}.contains(a.tipo);
    visiveis.insert(0, a);
    abertoId = a.id;
    // no máximo 3 na tela: sai o mais antigo que não é emergência
    while (visiveis.length > 3) {
      final sobra = visiveis.lastWhere((x) => x.tipo != 'emergencia', orElse: () => visiveis.last);
      visiveis.remove(sobra);
    }
    notifyListeners();
  }

  void abrir(Aviso a) {
    abertoId = a.id;
    notifyListeners();
  }

  void fechar(Aviso a) {
    visiveis.remove(a);
    if (abertoId == a.id) abertoId = visiveis.isEmpty ? null : visiveis.first.id;
    notifyListeners();
  }
}
