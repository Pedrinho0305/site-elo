import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../nucleo/api.dart';
import '../nucleo/avisos.dart';
import '../nucleo/sessao.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import 'casca.dart';
import 'relatorios.dart';

/// Painel do cuidador: o mesmo do site (pages/painel.html + js/painel*.js).
/// Consulta o servidor a cada 15 s (pochetes, corridas, últimos eventos);
/// os avisos em card vêm da central de avisos, que já consulta sozinha.
class TelaPainel extends StatefulWidget {
  const TelaPainel({super.key});
  @override
  State<TelaPainel> createState() => _TelaPainelState();
}

const _statusCorrida = {
  'pendente': ('Esperando sua aprovação', 'A corrida só é chamada depois do seu ok.'),
  'aprovada': ('Chamando o carro', 'Falando com a Uber.'),
  'solicitada': ('Procurando motorista', 'A Uber está buscando um carro.'),
  'a_caminho': ('Motorista a caminho', ''),
  'em_andamento': ('Em viagem', 'A pessoa está no carro.'),
  'concluida': ('Corrida concluída', 'Chegou ao destino.'),
  'recusada': ('Recusada', 'Você recusou o pedido.'),
  'cancelada': ('Cancelada', ''),
  'sem_motorista': ('Sem motorista', 'Nenhum carro disponível agora. Tente de novo.'),
  'erro': ('Não deu certo', ''),
};
const _ativas = ['pendente', 'aprovada', 'solicitada', 'a_caminho', 'em_andamento'];

class _TelaPainelState extends State<TelaPainel> {
  List<Map<String, dynamic>> pochetes = [];
  Map<String, dynamic>? corrida;
  Map<String, dynamic>? ultimoAlerta;
  Map<String, dynamic>? telegram;
  String? chaveNova;
  String? erroCarga;
  bool carregando = true;
  bool chamandoUber = false;
  Timer? _timer, _esperaTelegram;
  final _chatId = TextEditingController(); // chat_id do Telegram no modo simulado

  @override
  void initState() {
    super.initState();
    _carregar();
    _carregarTelegram();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _carregar());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _esperaTelegram?.cancel();
    super.dispose();
  }

  Future<void> _carregar() async {
    if (!Sessao.i.logado) return;
    try {
      final r = await Future.wait([Api.chamar('pochetes'), Api.chamar('corridas'), Api.chamar('eventos?limite=20')]);
      final corridas = List<Map<String, dynamic>>.from(r[1]['corridas'] as List? ?? []);
      final eventos = List<Map<String, dynamic>>.from(r[2]['eventos'] as List? ?? []);
      if (!mounted) return;
      setState(() {
        pochetes = List<Map<String, dynamic>>.from(r[0]['pochetes'] as List? ?? []);
        corrida = corridas.where((c) => _ativas.contains(c['status'])).firstOrNull;
        ultimoAlerta = eventos.where((e) => e['tipo'] == 'emergencia' || e['tipo'] == 'transporte' || (e['tipo'] == 'bateria' && ((e['dados'] as Map?)?['bateria'] ?? 100) <= 20)).firstOrNull;
        erroCarga = null;
        carregando = false;
      });
    } on ErroApi catch (e) {
      if (mounted) setState(() { erroCarga = e.mensagem; carregando = false; });
    }
  }

  Future<void> _carregarTelegram() async {
    try {
      final t = await Api.chamar('telegram/codigo', metodo: 'POST');
      if (!mounted) return;
      final antes = telegram?['vinculado'] == true;
      setState(() => telegram = t);
      if (t['vinculado'] == true && !antes && _esperaTelegram != null) {
        Avisos.i.mostrar(Aviso(tipo: 'telegram', titulo: 'Telegram vinculado', texto: 'Os avisos vão chegar lá também, inclusive o do botão vermelho.'));
        Sessao.i.atualizarCuidador({'telegram': true});
      }
      // esperando o /start: pergunta a cada 5 s (em serverless é essa consulta que lê o bot)
      final esperar = t['vinculado'] != true && t['simulado'] != true;
      if (esperar && _esperaTelegram == null) _esperaTelegram = Timer.periodic(const Duration(seconds: 5), (_) => _carregarTelegram());
      if (!esperar) { _esperaTelegram?.cancel(); _esperaTelegram = null; }
    } on ErroApi catch (_) {}
  }

  void _recado(String tipo, String titulo, String texto) => Avisos.i.mostrar(Aviso(tipo: tipo, titulo: titulo, texto: texto));

  /* ---------------- ações ---------------- */

  Future<void> _chamarUber() async {
    setState(() => chamandoUber = true);
    try {
      final p = pochetes.firstOrNull;
      final r = await Api.chamar('corridas', metodo: 'POST', corpo: {
        if (p != null) 'pochete_id': p['id'],
        if (p?['posicao'] != null) 'origem': p!['posicao'],
      });
      if (r['modo'] == 'link') {
        // sem credencial da Uber: o link universal abre o app do Uber com tudo preenchido
        if (mounted) await abrirLink(context, r['link'] as String);
        final destino = (r['destino'] as Map?)?['nome'];
        _recado('corrida', 'Uber pronto para pedir', 'Abri o Uber${destino != null ? ' com destino $destino já preenchido' : ''}. Confirme o carro por lá.${r['aviso'] != null ? ' ${r['aviso']}' : ''}');
      } else {
        setState(() => corrida = Map<String, dynamic>.from(r['corrida'] as Map));
        _recado('corrida', 'Carro chamado', 'Acompanhe o status no painel da corrida.');
      }
    } on ErroApi catch (e) {
      _recado('corrida', 'Não deu certo', e.mensagem);
    } finally {
      if (mounted) setState(() => chamandoUber = false);
    }
  }

  Future<void> _acaoCorrida(String acao) async {
    try {
      final r = await Api.chamar('corridas/${corrida!['id']}/$acao', metodo: 'POST');
      setState(() => corrida = Map<String, dynamic>.from(r['corrida'] as Map));
    } on ErroApi catch (e) {
      _recado('corrida', 'Não deu certo', e.mensagem);
    }
  }

  Future<void> _simular(String tipo, {int? bateria}) async {
    final p = pochetes.firstOrNull;
    if (p == null) { _recado('teste', 'Vincule uma pochete primeiro', 'Os testes mandam os eventos como se fossem da pochete.'); return; }
    try {
      final r = await Api.chamar('pochetes/${p['id']}/simular', metodo: 'POST', corpo: {
        'tipo': tipo, 'lat': -23.5612, 'lng': -46.6560, // Av. Paulista, para a demonstração
        'bateria': ?bateria,
      });
      Avisos.i.evento(r['evento'] as Map<String, dynamic>?, sempre: true);
      if (r['corrida'] != null) setState(() => corrida = Map<String, dynamic>.from(r['corrida'] as Map));
      _carregar();
    } on ErroApi catch (e) {
      _recado('teste', 'Não deu certo', e.mensagem);
    }
  }

  void _acaoDemonstracao(String titulo, String feedback, IconData icone, Color cor) {
    Avisos.i.mostrar(Aviso(tipo: 'acao', rotulo: titulo, titulo: feedback, icone: icone, cor: cor, duracao: const Duration(seconds: 6),
        texto: 'Demonstração: esta ação ainda não fala com a pochete de verdade.'));
  }

  /* ---------------- tela ---------------- */

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    final p = pochetes.firstOrNull;
    return Scaffold(
      appBar: const CabecalhoElo(),
      body: PaginaRolavel(aoAtualizar: () async { await _carregar(); await _carregarTelegram(); }, children: [
        ListenableBuilder(listenable: Sessao.i, builder: (_, _) => TituloSecao('Olá, ${Sessao.i.primeiroNome}!', grande: true, apoio: 'Bem-vindo ao seu painel ELO. Acompanhe e cuide de quem você ama.')),
        const SizedBox(height: 16),
        _cartaoPochete(c, p),
        if (erroCarga != null) StatusFormulario(texto: erroCarga!, ok: false),
        const SizedBox(height: 16),
        _tiles(c, p),
        if (corrida != null) ...[const SizedBox(height: 16), _painelCorrida(c)],
        const Respiro(32),
        const TituloSecao('Ações rápidas'),
        const SizedBox(height: 14),
        _acoes(c),
        const Respiro(32),
        const TituloSecao('Pochete e avisos', apoio: 'Vincule a pochete de quem você cuida, escolha onde receber os avisos e teste os botões sem sair daqui.'),
        const SizedBox(height: 14),
        _pochetes(c),
        const SizedBox(height: 14),
        _telegram(c),
        const SizedBox(height: 14),
        _testes(c),
        const Respiro(32),
        _perfil(c),
      ]),
    );
  }

  Widget _cartaoPochete(EloCores c, Map<String, dynamic>? p) {
    final conectada = p?['ultimo_contato'] != null;
    return Cartao(
      padding: const EdgeInsets.all(14),
      child: Row(children: [
        ClipRRect(borderRadius: BorderRadius.circular(Raio.md), child: Container(
          width: 96, height: 72,
          decoration: BoxDecoration(gradient: RadialGradient(colors: [c.cyan.withValues(alpha: .22), Colors.transparent]), color: c.bg2),
          child: Image.asset('assets/img/pochete-miniatura.png', fit: BoxFit.cover),
        )),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(p == null ? 'Pochete ELO' : 'Pochete de ${p['nome_idoso']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
          const SizedBox(height: 4),
          Row(children: [
            Container(width: 9, height: 9, decoration: BoxDecoration(color: p == null ? c.text3 : (conectada ? c.green : c.orange), shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text(p == null ? 'Nenhuma vinculada' : (conectada ? 'Online' : 'Aguardando a pochete'), style: TextStyle(fontWeight: FontWeight.w700, color: p == null ? c.text3 : (conectada ? c.green2 : c.orange))),
          ]),
          Text(p == null ? 'Vincule abaixo, em Pochete e avisos' : (conectada ? 'Último contato ${_hora(p['ultimo_contato'])}' : 'Ainda não falou com o servidor'), style: TextStyle(color: c.text3, fontSize: 13)),
        ])),
      ]),
    );
  }

  Widget _tiles(EloCores c, Map<String, dynamic>? p) {
    final bateria = (p?['bateria'] as num?)?.toInt();
    final pos = p?['posicao'] as Map?;
    final alerta = ultimoAlerta;
    final (tituloAlerta, corAlerta) = switch (alerta?['tipo']) {
      'emergencia' => ('Emergência', c.red),
      'transporte' => ('Pedido de carro', c.orange),
      'bateria' => ('Bateria baixa', c.orange),
      _ => ('Nenhum', c.green),
    };
    final tiles = [
      _Tile(icone: Icons.favorite_rounded, cor: c.green, titulo: 'Status da pochete', valor: p == null ? '—' : (p['ultimo_contato'] != null ? '100%' : '—'),
          nota: p == null ? 'Sem pochete vinculada' : '${p['nome_idoso']} ${p['ultimo_contato'] != null ? 'conectada' : 'sem contato ainda'}', barra: p?['ultimo_contato'] != null ? 1 : 0),
      _Tile(icone: Icons.battery_charging_full_rounded, cor: c.blue2, titulo: 'Bateria', valor: bateria == null ? '—' : '$bateria%',
          nota: bateria == null ? 'Sem leitura ainda' : (bateria <= 20 ? 'Bateria baixa: carregue hoje' : 'Carga restante'), barra: (bateria ?? 0) / 100),
      _Tile(icone: Icons.notifications_rounded, cor: corAlerta, titulo: 'Último alerta', valor: tituloAlerta, texto: true,
          nota: alerta == null ? 'Tudo tranquilo' : '${alerta['nome_idoso'] ?? ''}, ${_hora(alerta['criado_em'])}'),
      _Tile(icone: Icons.place_rounded, cor: c.purple, titulo: 'Localização', valor: pos == null ? '—' : 'Atualizada', texto: true,
          nota: pos == null ? 'Sem posição ainda' : 'Toque para ver no mapa',
          aoTocar: pos == null ? null : () => abrirMapa(context, lat: (pos['lat'] as num).toDouble(), lng: (pos['lng'] as num).toDouble(), titulo: 'Onde está ${p!['nome_idoso']}')),
    ];
    return LayoutBuilder(builder: (context, lim) {
      final col = lim.maxWidth > 620 ? 4 : 2;
      final larg = (lim.maxWidth - 12 * (col - 1)) / col;
      return Wrap(spacing: 12, runSpacing: 12, children: [for (final t in tiles) SizedBox(width: larg, child: t)]);
    });
  }

  Widget _painelCorrida(EloCores c) {
    final r = corrida!;
    final status = r['status'] as String;
    final (titulo, nota) = _statusCorrida[status] ?? (status, '');
    final destino = (r['destino'] as Map?)?['nome'] ?? 'o destino informado';
    final origem = r['origem'] as Map?;
    final ativa = _ativas.contains(status);
    final cor = ['a_caminho', 'em_andamento', 'concluida'].contains(status) ? c.green : c.orange;
    return Cartao(
      cor: cor,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          IconeAnel(Icons.local_taxi_rounded, cor: cor, tamanho: 46),
          const SizedBox(width: 12),
          Expanded(child: Text(titulo, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 19))),
        ]),
        const SizedBox(height: 10),
        Text([
          'Pediu um carro para $destino às ${_hora(r['criado_em'])}.',
          if (r['produto'] != null) '${r['produto']}${r['valor'] != null ? ', ${r['valor']}' : ''}.',
          if (r['eta_min'] != null && ativa) 'Chega em ~${r['eta_min']} min.',
          if (r['motorista'] != null) 'Motorista: ${r['motorista']}${r['veiculo'] != null ? ' · ${r['veiculo']}' : ''}.',
          r['erro'] ?? nota,
        ].where((s) => s.toString().isNotEmpty).join(' '), style: TextStyle(color: c.text2, height: 1.5)),
        const SizedBox(height: 14),
        Wrap(spacing: 10, runSpacing: 10, children: [
          if (origem != null) BotaoContorno(texto: 'Ver no mapa', compacto: true, icone: Icons.map_rounded,
              aoTocar: () => abrirMapa(context, lat: (origem['lat'] as num).toDouble(), lng: (origem['lng'] as num).toDouble(), titulo: 'De onde a corrida sai')),
          if (status == 'pendente') ...[
            BotaoMarca(texto: 'Aprovar corrida', aoTocar: () => _acaoCorrida('aprovar')),
            BotaoContorno(texto: 'Recusar', compacto: true, aoTocar: () => _acaoCorrida('recusar')),
          ],
          if (['aprovada', 'solicitada', 'a_caminho'].contains(status)) BotaoContorno(texto: 'Cancelar corrida', compacto: true, aoTocar: () => _acaoCorrida('cancelar')),
        ]),
      ]),
    );
  }

  Widget _acoes(EloCores c) {
    final acoes = [
      _Acao(Icons.local_taxi_rounded, c.teal, 'Chamar Uber', chamandoUber ? 'Falando com a Uber…' : 'Carro até o destino', chamandoUber ? null : _chamarUber),
      _Acao(Icons.call_rounded, c.green, 'Ligar para idoso', 'Iniciar chamada', () => _acaoDemonstracao('Ligar para idoso', 'Chamando pela pochete', Icons.call_rounded, c.green)),
      _Acao(Icons.chat_rounded, c.blue2, 'Enviar mensagem', 'Mandar mensagem', () => _acaoDemonstracao('Enviar mensagem', 'Mensagem enviada. Ela será lida em voz pela pochete', Icons.chat_rounded, c.blue2)),
      _Acao(Icons.notification_important_rounded, c.red, 'Ligar 192', 'SAMU, se for preciso', () => abrirLink(context, 'tel:192')),
      _Acao(Icons.mic_rounded, c.purple, 'Comando de voz', 'Enviar comando', () => _acaoDemonstracao('Comando de voz', 'Comando de voz enviado à pochete', Icons.mic_rounded, c.purple)),
      _Acao(Icons.groups_rounded, c.orange, 'Ver familiares', 'Gerenciar acessos', () => _acaoDemonstracao('Ver familiares', '3 familiares com acesso ao painel', Icons.groups_rounded, c.orange)),
    ];
    return LayoutBuilder(builder: (context, lim) {
      final col = lim.maxWidth > 620 ? 3 : 2;
      final larg = (lim.maxWidth - 12 * (col - 1)) / col;
      return Wrap(spacing: 12, runSpacing: 12, children: [for (final a in acoes) SizedBox(width: larg, child: a)]);
    });
  }

  Widget _pochetes(EloCores c) {
    return Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Pochetes vinculadas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
      const SizedBox(height: 10),
      if (carregando) const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
      else if (pochetes.isEmpty) Text('Nenhuma pochete vinculada ainda. Cadastre abaixo para receber a chave.', style: TextStyle(color: c.text3))
      else for (final p in pochetes) Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: c.bg2, borderRadius: BorderRadius.circular(Raio.md), border: Border.all(color: c.line)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${p['nome_idoso']}', style: const TextStyle(fontWeight: FontWeight.w700)),
          Text([
            if (p['bateria'] != null) 'Bateria ${p['bateria']}%',
            p['ultimo_contato'] != null ? 'Último contato ${_hora(p['ultimo_contato'])}' : 'Ainda não falou com o servidor',
            p['casa'] != null ? 'Casa: ${(p['casa'] as Map)['nome'] ?? 'cadastrada'}' : 'Sem endereço de casa',
          ].join(' · '), style: TextStyle(color: c.text3, fontSize: 13)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            BotaoContorno(texto: 'Nova chave', compacto: true, aoTocar: () => _novaChave(p)),
            BotaoContorno(texto: 'Desvincular', compacto: true, cor: c.red, aoTocar: () => _desvincular(p)),
          ]),
        ]),
      ),
      if (chaveNova != null) _caixaChave(c),
      const SizedBox(height: 12),
      BotaoContorno(texto: 'Vincular uma pochete', icone: Icons.add_rounded, aoTocar: _vincular),
    ]));
  }

  Widget _caixaChave(EloCores c) => Container(
        margin: const EdgeInsets.only(top: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: c.cyan.withValues(alpha: .08), borderRadius: BorderRadius.circular(Raio.md), border: Border.all(color: c.cyan.withValues(alpha: .45))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Chave da pochete', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Copie e grave no código da pochete (cabeçalho X-Pochete-Key). Ela aparece só agora; depois dá para gerar outra.', style: TextStyle(color: c.text2, fontSize: 13.5)),
          const SizedBox(height: 10),
          SelectableText(chaveNova!, style: const TextStyle(fontFamily: 'monospace', fontSize: 14)),
          const SizedBox(height: 8),
          BotaoContorno(texto: 'Copiar', compacto: true, icone: Icons.copy_rounded, aoTocar: () {
            Clipboard.setData(ClipboardData(text: chaveNova!));
            avisar(context, 'Chave copiada.');
          }),
        ]),
      );

  Future<void> _novaChave(Map<String, dynamic> p) async {
    final ok = await _confirmar('Gerar uma chave nova?', 'A antiga para de funcionar na hora.');
    if (!ok) return;
    try {
      final r = await Api.chamar('pochetes/${p['id']}/chave', metodo: 'POST');
      setState(() => chaveNova = r['chave'] as String?);
    } on ErroApi catch (e) {
      _recado('corrida', 'Não deu certo', e.mensagem);
    }
  }

  Future<void> _desvincular(Map<String, dynamic> p) async {
    final ok = await _confirmar('Desvincular esta pochete?', 'O histórico dela também some.');
    if (!ok) return;
    try {
      await Api.chamar('pochetes/${p['id']}', metodo: 'DELETE');
      await _carregar();
    } on ErroApi catch (e) {
      _recado('corrida', 'Não deu certo', e.mensagem);
    }
  }

  Future<bool> _confirmar(String titulo, String texto) async =>
      await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
        title: Text(titulo), content: Text(texto),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmar'))],
      )) ?? false;

  Future<void> _vincular() async {
    final chave = await showModalBottomSheet<String>(context: context, isScrollControlled: true, builder: (_) => const _FormVincular());
    if (chave != null) {
      setState(() => chaveNova = chave);
      await _carregar();
    }
  }

  Widget _telegram(EloCores c) {
    final t = telegram;
    Widget conteudo;
    if (t == null) {
      conteudo = Text('Carregando…', style: TextStyle(color: c.text3));
    } else if (t['vinculado'] == true) {
      conteudo = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Container(width: 9, height: 9, decoration: BoxDecoration(color: c.green, shape: BoxShape.circle)), const SizedBox(width: 8), Text('Telegram vinculado', style: TextStyle(color: c.green2, fontWeight: FontWeight.w700))]),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          BotaoContorno(texto: 'Enviar mensagem de teste', compacto: true, aoTocar: () async {
            try { await Api.chamar('telegram/teste', metodo: 'POST'); _recado('telegram', 'Mensagem enviada', t['simulado'] == true ? 'Veja no terminal do servidor.' : 'Confira o seu Telegram.'); }
            on ErroApi catch (e) { _recado('telegram', 'Não deu certo', e.mensagem); }
          }),
          BotaoContorno(texto: 'Desvincular', compacto: true, cor: c.red, aoTocar: () async {
            try { await Api.chamar('telegram', metodo: 'DELETE'); await Sessao.i.atualizarCuidador({'telegram': false}); await _carregarTelegram(); }
            on ErroApi catch (e) { _recado('telegram', 'Não deu certo', e.mensagem); }
          }),
        ]),
      ]);
    } else if (t['simulado'] == true) {
      conteudo = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('O bot do Telegram ainda não está configurado no servidor (TELEGRAM_BOT_TOKEN). Em modo simulado, as mensagens aparecem no terminal do servidor. Para testar o fluxo, informe um chat_id qualquer:',
            style: TextStyle(color: c.text3, fontSize: 13.5, height: 1.45)),
        const SizedBox(height: 10),
        TextField(controller: _chatId, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'chat_id (ex.: 123456789)')),
        const SizedBox(height: 10),
        BotaoMarca(texto: 'Vincular', aoTocar: () async {
          try { await Api.chamar('telegram/vincular', metodo: 'POST', corpo: {'chat_id': _chatId.text.trim()}); await Sessao.i.atualizarCuidador({'telegram': true}); await _carregarTelegram(); }
          on ErroApi catch (e) { _recado('telegram', 'Não deu certo', e.mensagem); }
        }),
      ]);
    } else {
      final bot = t['bot'] ?? '';
      final codigo = t['codigo'] ?? '';
      conteudo = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Abra o bot @$bot no Telegram e mande:', style: TextStyle(color: c.text2)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: c.bg, borderRadius: BorderRadius.circular(Raio.sm), border: Border.all(color: c.line2)),
          child: SelectableText('/start $codigo', style: const TextStyle(fontFamily: 'monospace', fontSize: 15)),
        ),
        const SizedBox(height: 10),
        BotaoMarca(texto: 'Abrir o bot já com o código', icone: Icons.send_rounded, aoTocar: () => abrirLink(context, 'https://t.me/$bot?start=$codigo')),
        const SizedBox(height: 8),
        Text('Assim que a mensagem chegar, esta tela confirma sozinha.', style: TextStyle(color: c.text3, fontSize: 13)),
      ]);
    }
    return Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Avisos no Telegram', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
      const SizedBox(height: 4),
      Text('Emergência, pedido de transporte e bateria baixa chegam como mensagem no seu Telegram, além de aparecerem aqui.', style: TextStyle(color: c.text3, fontSize: 13.5, height: 1.45)),
      const SizedBox(height: 12),
      conteudo,
    ]));
  }

  Widget _testes(EloCores c) {
    final botoes = [
      _Acao(Icons.notification_important_rounded, c.red, 'Botão vermelho', 'Emergência', () => _simular('emergencia')),
      _Acao(Icons.directions_car_rounded, c.orange, 'Botão amarelo', 'Pedir carro', () => _simular('transporte')),
      _Acao(Icons.battery_alert_rounded, c.blue2, 'Bateria baixa', '12% de carga', () => _simular('bateria', bateria: 12)),
      _Acao(Icons.place_rounded, c.green, 'Localização', 'Atualizar posição', () => _simular('localizacao')),
    ];
    return Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Testar sem a pochete', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
      const SizedBox(height: 4),
      Text('Aperta os botões como se fosse a pochete. Serve para ver os avisos chegando e treinar a aprovação da corrida.', style: TextStyle(color: c.text3, fontSize: 13.5, height: 1.45)),
      const SizedBox(height: 12),
      Opacity(
        opacity: pochetes.isEmpty ? .5 : 1,
        child: LayoutBuilder(builder: (context, lim) {
          final larg = (lim.maxWidth - 10) / 2;
          return Wrap(spacing: 10, runSpacing: 10, children: [for (final b in botoes) SizedBox(width: larg, child: b)]);
        }),
      ),
    ]));
  }

  Widget _perfil(EloCores c) {
    return ListenableBuilder(
      listenable: Sessao.i,
      builder: (_, _) {
        final foto = Sessao.i.foto;
        ImageProvider? imagem;
        if (foto != null && foto.startsWith('data:image')) {
          try { imagem = MemoryImage(base64Decode(foto.split(',').last)); } catch (_) {}
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const TituloSecao('Meu perfil'),
          const SizedBox(height: 14),
          Cartao(child: Row(children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.cyan, width: 2)),
              child: CircleAvatar(
                radius: 34,
                backgroundImage: imagem,
                backgroundColor: c.cyan,
                child: imagem == null ? Text(Sessao.i.iniciais, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: EloCores.inkOnBrand)) : null,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(Sessao.i.nome, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              Text(Sessao.i.email, style: TextStyle(color: c.text2)),
              Text('Cuidador responsável', style: TextStyle(color: c.cyan, fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 10),
              Wrap(spacing: 8, runSpacing: 8, children: [
                BotaoContorno(texto: 'Relatórios', compacto: true, icone: Icons.insights_rounded, aoTocar: () => abrirTela(context, const TelaRelatorios())),
                BotaoContorno(texto: 'Sair da conta', compacto: true, cor: c.red, aoTocar: () => Sessao.i.sair()),
              ]),
            ])),
          ])),
        ]);
      },
    );
  }
}

String _hora(dynamic iso) {
  final d = DateTime.tryParse('$iso')?.toLocal();
  if (d == null) return '';
  final agora = DateTime.now();
  final hm = '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  if (d.year == agora.year && d.month == agora.month && d.day == agora.day) return hm;
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')} $hm';
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icone, required this.cor, required this.titulo, required this.valor, required this.nota, this.barra, this.texto = false, this.aoTocar});
  final IconData icone;
  final Color cor;
  final String titulo, valor, nota;
  final double? barra;
  final bool texto;
  final VoidCallback? aoTocar;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Cartao(
      padding: const EdgeInsets.all(16),
      aoTocar: aoTocar,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        IconeAnel(icone, cor: cor, tamanho: 40),
        const SizedBox(height: 12),
        Text(titulo, style: TextStyle(color: c.text2, fontWeight: FontWeight.w600, fontSize: 13.5)),
        const SizedBox(height: 2),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(valor, style: TextStyle(fontWeight: FontWeight.w800, fontSize: texto ? 21 : 28, color: cor))),
        const SizedBox(height: 4),
        Text(nota, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: c.text3, fontSize: 12.5)),
        if (barra != null) ...[
          const SizedBox(height: 10),
          ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: barra!.clamp(0, 1), minHeight: 6, color: cor, backgroundColor: c.text.withValues(alpha: .08))),
        ],
      ]),
    );
  }
}

class _Acao extends StatelessWidget {
  const _Acao(this.icone, this.cor, this.titulo, this.nota, this.aoTocar);
  final IconData icone;
  final Color cor;
  final String titulo, nota;
  final VoidCallback? aoTocar;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Opacity(
      opacity: aoTocar == null ? .6 : 1,
      child: Material(
        color: c.bg2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raio.lg), side: BorderSide(color: c.line)),
        child: InkWell(
          borderRadius: BorderRadius.circular(Raio.lg),
          splashColor: cor.withValues(alpha: .15),
          onTap: aoTocar,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              IconeAnel(icone, cor: cor, tamanho: 42),
              const SizedBox(height: 10),
              Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              Text(nota, style: TextStyle(color: c.text3, fontSize: 12.5)),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Vincular uma pochete: gera a chave do dispositivo (aparece uma vez)
class _FormVincular extends StatefulWidget {
  const _FormVincular();
  @override
  State<_FormVincular> createState() => _FormVincularState();
}

class _FormVincularState extends State<_FormVincular> {
  final _nome = TextEditingController();
  final _telefone = TextEditingController();
  final _endereco = TextEditingController();
  bool _enviando = false;
  String? _erro;

  Future<void> _enviar() async {
    final nome = _nome.text.trim();
    if (nome.length < 2) { setState(() => _erro = 'Digite o nome de quem vai usar.'); return; }
    final endereco = _endereco.text.trim();
    setState(() { _enviando = true; _erro = null; });
    try {
      final r = await Api.chamar('pochetes', metodo: 'POST', corpo: {
        'nome_idoso': nome,
        'telefone_idoso': _telefone.text.trim().isEmpty ? null : _telefone.text.trim(),
        // o servidor acha o endereço escrito no mapa
        if (endereco.isNotEmpty) 'casa': {'endereco': endereco},
      });
      if (mounted) Navigator.pop(context, r['chave'] as String?);
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
          const Text('Vincular uma pochete', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 19)),
          const SizedBox(height: 14),
          TextField(controller: _nome, decoration: const InputDecoration(labelText: 'Nome de quem vai usar', hintText: 'Ex.: Dona Maria')),
          const SizedBox(height: 12),
          TextField(controller: _telefone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Celular dela (opcional)', hintText: '(11) 99999-0000')),
          const SizedBox(height: 12),
          TextField(controller: _endereco, keyboardType: TextInputType.streetAddress, decoration: const InputDecoration(labelText: 'Endereço da casa dela (opcional)', hintText: 'Rua das Flores, 123, São Paulo')),
          const SizedBox(height: 8),
          Text('É para lá que o carro leva quando ela aperta o botão amarelo. Escreva rua, número e cidade.', style: TextStyle(color: c.text3, fontSize: 13)),
          const SizedBox(height: 16),
          BotaoMarca(texto: 'Vincular pochete', carregando: _enviando, aoTocar: _enviar, expandir: true),
          if (_erro != null) StatusFormulario(texto: _erro!, ok: false),
        ]),
      ),
    );
  }
}
