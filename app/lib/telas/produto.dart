import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../nucleo/config.dart';
import '../nucleo/sessao.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import '../widgets/formulario.dart';
import 'casca.dart';

/// Produto: a embalagem, os componentes com custos, o que vem na caixa,
/// o preço e o formulário do pedido (a equipe responde por e-mail; nenhuma
/// cobrança acontece no app).
class TelaProduto extends StatefulWidget {
  const TelaProduto({super.key});
  @override
  State<TelaProduto> createState() => _TelaProdutoState();
}

class _TelaProdutoState extends State<TelaProduto> {
  final _rolagem = ScrollController();
  final _chavePedido = GlobalKey();

  static const _componentes = [
    ('Módulo GPS/GPRS SIM800L', 'Rastreamento em tempo real e conectividade', 1, 'R\$ 45,00'),
    ('ESP32 DevKit V1', 'Microcontrolador com Wi-Fi e Bluetooth 4.2', 1, 'R\$ 32,00'),
    ('Bateria Li-Po 3,7V 2000mAh', 'Alimentação recarregável e de longa duração', 1, 'R\$ 28,00'),
    ('Módulo de Áudio/Microfone', 'Comunicação de voz e alerta sonoro', 1, 'R\$ 18,00'),
    ('Botões Táticos (3 unidades)', 'Emergência (SOS), Ligar e Configurações', 3, 'R\$ 12,00'),
    ('Pochete Tática Ajustável', 'Base de tecido resistente e ajuste de cintura', 1, 'R\$ 38,00'),
    ('Carregador USB-C 5V/2A', 'Carregador rápido seguro', 1, 'R\$ 19,00'),
    ('Placa PCB Customizada', 'Integração perfeita dos componentes', 1, 'R\$ 25,00'),
    ('Alto-falante Mini 8Ω 2W', 'Exibição de áudio e áudio guia de retorno', 1, 'R\$ 9,00'),
    ('Resistores, LEDs e Conectores', 'Componentes eletrônicos diversos', 1, 'R\$ 15,00'),
    ('Testes e Certificação', 'Controle de qualidade e segurança', 1, 'R\$ 85,00'),
  ];

  void _irParaPedido() {
    final ctx = _chavePedido.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(),
      body: PaginaRolavel(controller: _rolagem, children: [
        const TituloSecao('Produto ELO', grande: true, apoio: 'Componentes, tecnologia e investimento para criar a pochete inteligente'),
        const Respiro(20),
        Cartao(
          padding: EdgeInsets.zero,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            ClipRRect(borderRadius: const BorderRadius.vertical(top: Radius.circular(Raio.lg)), child: Image.asset('assets/img/pochete-embalagem.png', semanticLabel: 'Pochete ELO e embalagem')),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Pochete Inteligente ELO', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
                const SizedBox(height: 8),
                Text('Tecnologia vestível compacta e elegante, desenvolvida especialmente para a terceira idade.', style: TextStyle(color: c.text2, height: 1.5)),
                const SizedBox(height: 14),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  ChipStatus('App integrado', cor: c.cyan, icone: Icons.phone_iphone_rounded),
                  ChipStatus('USB-C recarregável', cor: c.green, icone: Icons.bolt_rounded),
                  ChipStatus('IP63 resistente', cor: c.blue2, icone: Icons.water_drop_rounded),
                ]),
              ]),
            ),
          ]),
        ),
        const Respiro(32),
        const TituloSecao('Componentes Utilizados'),
        const Respiro(14),
        Cartao(
          padding: EdgeInsets.zero,
          child: Column(children: [
            for (final (i, (item, descricao, qtd, valor)) in _componentes.indexed)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: c.line))),
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(item, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(descricao, style: TextStyle(color: c.text3, fontSize: 13)),
                  ])),
                  const SizedBox(width: 10),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text(valor, style: TextStyle(fontWeight: FontWeight.w700, color: c.green2, fontFeatures: const [FontFeature.tabularFigures()])),
                    Text('Qtd $qtd', style: TextStyle(color: c.text3, fontSize: 12.5)),
                  ]),
                ]),
              ),
            _LinhaTotal('Subtotal componentes', 'R\$ 326,00'),
            _LinhaTotal('Montagem, embalagem e logística', 'R\$ 120,00'),
          ]),
        ),
        const Respiro(28),
        Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
          Text('O que está incluso no produto final', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          SizedBox(height: 8),
          ItemCheck('Pochete ELO completa e montada'),
          ItemCheck('Atualizações de software gratuitas'),
          ItemCheck('Suporte técnico 24/7'),
          ItemCheck('Garantia de 12 meses'),
          ItemCheck('Carregador USB-C com cabo de 1,5m'),
          ItemCheck('Manual ilustrado em português'),
        ])),
        const Respiro(18),
        // Oferta: painel marinho com o preço e o botão laranja (o "botão que se aperta")
        Cartao(
          painel: true,
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Pochete ELO completa', style: TextStyle(color: Color(0xFFC7CFEC), fontSize: 15)),
            const SizedBox(height: 6),
            TintaMarca(precoAVista, estilo: GoogleFonts.unbounded(fontSize: 44, fontWeight: FontWeight.w700)),
            const Text('à vista, ou $precoParcelado sem juros', style: TextStyle(color: Color(0xFFC7CFEC), fontSize: 15)),
            const SizedBox(height: 6),
            const Text('Custo de produção por unidade: R\$ 446,00, detalhado na tabela acima.', style: TextStyle(color: Color(0xFF8C97C2), fontSize: 13)),
            const SizedBox(height: 14),
            for (final t in ['Garantia de 12 meses', 'Suporte técnico 24/7 em português', 'Atualizações de software gratuitas', 'Baseada em 5 estudos revisados por pares'])
              Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(children: [
                const Icon(Icons.check_rounded, size: 18, color: Color(0xFF4ADE80)),
                const SizedBox(width: 8),
                Expanded(child: Text(t, style: const TextStyle(color: Color(0xFFEEF2FF)))),
              ])),
            const SizedBox(height: 18),
            BotaoMarca(texto: 'Quero uma ELO', icone: Icons.shopping_bag_rounded, cor: c.orange, expandir: true, aoTocar: _irParaPedido),
            const SizedBox(height: 8),
            const Text('Você fala direto com a equipe que desenvolveu o produto.', style: TextStyle(color: Color(0xFFC7CFEC), fontSize: 13.5)),
          ]),
        ),
        const Respiro(36),
        _FormularioPedido(key: _chavePedido),
      ]),
    );
  }
}

class _LinhaTotal extends StatelessWidget {
  const _LinhaTotal(this.rotulo, this.valor);
  final String rotulo, valor;

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(color: c.bg4.withValues(alpha: .5), border: Border(top: BorderSide(color: c.line))),
      child: Row(children: [
        Expanded(child: Text(rotulo, style: const TextStyle(fontWeight: FontWeight.w700))),
        Text(valor, style: TextStyle(fontWeight: FontWeight.w700, color: c.green2)),
      ]),
    );
  }
}

class _FormularioPedido extends StatefulWidget {
  const _FormularioPedido({super.key});
  @override
  State<_FormularioPedido> createState() => _FormularioPedidoState();
}

class _FormularioPedidoState extends State<_FormularioPedido> {
  final _form = GlobalKey<FormState>();
  final _nome = TextEditingController(text: Sessao.i.nome);
  final _email = TextEditingController(text: Sessao.i.email);
  final _telefone = TextEditingController();
  final _cidade = TextEditingController();
  final _quantidade = TextEditingController(text: '1');
  final _obs = TextEditingController();
  String _pagamento = 'a combinar';
  bool _enviando = false;
  (String, bool)? _status;

  Future<void> _enviar() async {
    if (!_form.currentState!.validate()) return;
    final qtd = int.tryParse(_quantidade.text.trim()) ?? 1;
    setState(() { _enviando = true; _status = null; });
    try {
      final protocolo = await enviarMensagem({
        'tipo': 'pedido', 'nome': _nome.text.trim(), 'email': _email.text.trim(), 'telefone': _telefone.text.trim(),
        'assunto': 'Pedido de $qtd pochete(s) ELO', 'mensagem': _obs.text.trim(), 'quantidade': qtd,
        'pagamento': _pagamento, 'cidade': _cidade.text.trim(), 'pagina': 'produtos',
      });
      final primeiro = _nome.text.trim().split(' ').first;
      setState(() => _status = ('Pedido recebido, $primeiro! A equipe responde no seu e-mail em até 2 dias úteis com as formas de pagamento e o prazo de entrega.${protocolo != null ? ' O protocolo é $protocolo.' : ''}', true));
      _telefone.clear(); _cidade.clear(); _obs.clear(); _quantidade.text = '1';
    } catch (e) {
      setState(() => _status = (explicarErro(e), false));
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Cartao(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _form,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const TituloSecao('Peça a sua ELO', apoio: 'Preencha e a equipe responde no seu e-mail com as formas de pagamento e o prazo de entrega. Nenhuma cobrança acontece aqui.'),
          const SizedBox(height: 10),
          Wrap(spacing: 14, runSpacing: 6, children: [
            for (final t in ['Resposta em até 2 dias úteis', 'Garantia de 12 meses', 'Suporte técnico 24/7 em português'])
              Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.check_rounded, size: 16, color: c.green), const SizedBox(width: 4), Text(t, style: TextStyle(color: c.text2, fontSize: 13.5))]),
          ]),
          const SizedBox(height: 18),
          CampoTexto(rotulo: 'Nome completo', controller: _nome, autofill: const [AutofillHints.name]),
          CampoTexto(rotulo: 'E-mail', controller: _email, tipo: TextInputType.emailAddress, autofill: const [AutofillHints.email]),
          CampoTexto(rotulo: 'Telefone / WhatsApp', controller: _telefone, tipo: TextInputType.phone, autofill: const [AutofillHints.telephoneNumber]),
          CampoTexto(rotulo: 'Cidade e estado', controller: _cidade),
          CampoTexto(rotulo: 'Quantidade', controller: _quantidade, tipo: TextInputType.number, validar: (t) {
            final n = int.tryParse(t);
            return n == null || n < 1 || n > 50 ? 'Entre 1 e 50.' : null;
          }),
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: DropdownButtonFormField<String>(
              initialValue: _pagamento,
              decoration: const InputDecoration(labelText: 'Forma de pagamento'),
              items: const [
                DropdownMenuItem(value: 'à vista', child: Text('À vista — $precoAVista')),
                DropdownMenuItem(value: '12× sem juros', child: Text('$precoParcelado sem juros')),
                DropdownMenuItem(value: 'a combinar', child: Text('Ainda quero conversar sobre isso')),
              ],
              onChanged: (v) => setState(() => _pagamento = v ?? 'a combinar'),
            ),
          ),
          CampoTexto(rotulo: 'Observações', controller: _obs, obrigatorio: false, linhas: 3),
          BotaoMarca(texto: 'Enviar pedido', icone: Icons.send_rounded, carregando: _enviando, aoTocar: _enviar, expandir: true),
          if (_status != null) StatusFormulario(texto: _status!.$1, ok: _status!.$2),
        ]),
      ),
    );
  }
}
