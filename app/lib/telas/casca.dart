import 'package:flutter/material.dart';

import '../main.dart';
import '../nucleo/avisos.dart';
import '../nucleo/sessao.dart';
import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import 'eloa.dart';
import 'entrar.dart';
import 'inicio.dart';
import 'instrucoes.dart';
import 'jogo.dart';
import 'painel.dart';
import 'produto.dart';
import 'quem_somos.dart';
import 'referencias.dart';
import 'relatorios.dart';

/// A casca do app: barra inferior com as áreas principais. O menu do site
/// (Início, Instruções, Produto, Quem Somos, Referências, Jogo, Eloá, Entrar)
/// vira Início · Produto · Eloá · Painel · Mais.
class Casca extends StatefulWidget {
  const Casca({super.key});

  static CascaEstado? of(BuildContext context) => context.findAncestorStateOfType<CascaEstado>();

  @override
  State<Casca> createState() => CascaEstado();
}

class CascaEstado extends State<Casca> {
  int aba = 0;

  @override
  void initState() {
    super.initState();
    // os cards de aviso sabem navegar e abrir o mapa
    Avisos.i.navegar = (destino) {
      final ctx = chaveNavegador.currentContext;
      if (ctx == null) return;
      if (destino.startsWith('tel:')) {
        abrirLink(ctx, destino);
      } else if (destino == 'painel') {
        chaveNavegador.currentState?.popUntil((r) => r.isFirst);
        irPara(3);
      }
    };
    Avisos.i.mostrarMapa = (lat, lng, titulo) {
      final ctx = chaveNavegador.currentContext;
      if (ctx != null) abrirMapa(ctx, lat: lat, lng: lng, titulo: titulo);
    };
  }

  void irPara(int nova) => setState(() => aba = nova);

  /// Abre uma tela por cima da casca (Instruções, Quem Somos, Relatórios...)
  static void abrir(BuildContext context, Widget tela) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => tela));
  }

  @override
  Widget build(BuildContext context) {
    final telas = [
      TelaInicio(irPara: irPara),
      const TelaProduto(),
      const TelaEloa(),
      ListenableBuilder(listenable: Sessao.i, builder: (_, _) => Sessao.i.logado ? const TelaPainel() : const TelaEntrar()),
      const TelaMais(),
    ];
    return Scaffold(
      body: IndexedStack(index: aba, children: telas),
      // a barra ouve a sessão: "Entrar" vira "Painel" assim que o login termina
      bottomNavigationBar: ListenableBuilder(listenable: Sessao.i, builder: (context, _) => NavigationBar(
        selectedIndex: aba,
        onDestinationSelected: irPara,
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Início'),
          const NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag_rounded), label: 'Produto'),
          const NavigationDestination(icon: Icon(Icons.chat_bubble_outline_rounded), selectedIcon: Icon(Icons.chat_bubble_rounded), label: 'Eloá'),
          NavigationDestination(
            icon: const Icon(Icons.space_dashboard_outlined), selectedIcon: const Icon(Icons.space_dashboard_rounded),
            label: Sessao.i.logado ? 'Painel' : 'Entrar',
          ),
          const NavigationDestination(icon: Icon(Icons.menu_rounded), label: 'Mais'),
        ],
      )),
    );
  }
}

/// Cabeçalho de cada área: logo, título curto e botão de tema
class CabecalhoElo extends StatelessWidget implements PreferredSizeWidget {
  const CabecalhoElo({super.key, this.titulo, this.acoes = const []});
  final String? titulo;
  final List<Widget> acoes;

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    final podeVoltar = Navigator.of(context).canPop();
    return AppBar(
      toolbarHeight: 64,
      automaticallyImplyLeading: podeVoltar,
      titleSpacing: podeVoltar ? 0 : 18,
      title: titulo == null ? const EloLogo(tamanho: 32) : Text(titulo!),
      actions: [
        ...acoes,
        ListenableBuilder(
          listenable: Sessao.i,
          builder: (_, _) => IconButton(
            tooltip: 'Alternar tema',
            onPressed: Sessao.i.alternarTema,
            icon: Icon(Sessao.i.temaEscuro ? Icons.light_mode_rounded : Icons.dark_mode_rounded),
          ),
        ),
        const SizedBox(width: 8),
      ],
    );
  }
}

/// "Mais": o resto do menu do site
class TelaMais extends StatelessWidget {
  const TelaMais({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    Widget item(IconData icone, Color cor, String titulo, String apoio, VoidCallback aoTocar) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Cartao(
            padding: const EdgeInsets.all(14),
            aoTocar: aoTocar,
            child: Row(children: [
              IconeAnel(icone, cor: cor, tamanho: 44),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16.5)),
                const SizedBox(height: 2),
                Text(apoio, style: TextStyle(color: c.text3, fontSize: 13.5)),
              ])),
              Icon(Icons.chevron_right_rounded, color: c.text3),
            ]),
          ),
        );

    return Scaffold(
      appBar: const CabecalhoElo(),
      body: ListenableBuilder(
        listenable: Sessao.i,
        builder: (context, _) => PaginaRolavel(children: [
          const TituloSecao('Mais da ELO'),
          const Respiro(18),
          item(Icons.menu_book_rounded, c.cyan, 'Instruções', 'A pochete em 3D e os seis passos para começar', () => CascaEstado.abrir(context, const TelaInstrucoes())),
          item(Icons.groups_rounded, c.purple, 'Quem Somos', 'A equipe, a missão e o contato', () => CascaEstado.abrir(context, const TelaQuemSomos())),
          item(Icons.science_rounded, c.blue2, 'Referências', 'Os artigos que embasam o projeto', () => CascaEstado.abrir(context, const TelaReferencias())),
          item(Icons.sports_esports_rounded, c.green, 'Jogo', 'ELO: O Jogo, sobre ser cuidador', () => CascaEstado.abrir(context, const TelaJogo())),
          if (Sessao.i.logado)
            item(Icons.insights_rounded, c.orange, 'Relatórios', 'Números, registro e o mapa da pochete', () => CascaEstado.abrir(context, const TelaRelatorios())),
          item(Sessao.i.temaEscuro ? Icons.light_mode_rounded : Icons.dark_mode_rounded, c.teal, Sessao.i.temaEscuro ? 'Tema claro' : 'Tema escuro', 'Trocar as cores do app', Sessao.i.alternarTema),
          if (Sessao.i.logado)
            item(Icons.logout_rounded, c.red, 'Sair da conta', Sessao.i.email, () async {
              await Sessao.i.sair();
              if (context.mounted) Casca.of(context)?.irPara(0);
            })
          else
            item(Icons.login_rounded, c.green, 'Entrar', 'Acesse o painel do cuidador', () => Casca.of(context)?.irPara(3)),
          const Respiro(24),
          Center(child: Text('ELO · app do cuidador', style: TextStyle(color: c.text3, fontSize: 13))),
        ]),
      ),
    );
  }
}

/// Atalho usado pelas telas para abrir outras por cima da casca
void abrirTela(BuildContext context, Widget tela) => CascaEstado.abrir(context, tela);
