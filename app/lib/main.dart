import 'package:flutter/material.dart';

import 'nucleo/avisos.dart';
import 'nucleo/sessao.dart';
import 'nucleo/tema.dart';
import 'telas/casca.dart';
import 'widgets/cartao_aviso.dart';

/// ELO — o site inteiro como app (Android e iOS).
/// Fala com o mesmo backend do site publicado (contas, pochete, Uber,
/// Telegram, mensagens) e com a mesma Eloá. Veja app/README.md.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Sessao.i.carregar();
  Avisos.i; // começa a consultar os avisos se já houver sessão
  Sessao.i.confirmar();
  runApp(const EloApp());
}

final chaveNavegador = GlobalKey<NavigatorState>();

class EloApp extends StatelessWidget {
  const EloApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Sessao.i,
      builder: (context, _) => MaterialApp(
        title: 'ELO',
        debugShowCheckedModeBanner: false,
        navigatorKey: chaveNavegador,
        theme: EloTema.criar(EloCores.gelo),
        darkTheme: EloTema.criar(EloCores.noite),
        themeMode: Sessao.i.temaEscuro ? ThemeMode.dark : ThemeMode.light,
        home: const Casca(),
        builder: (context, child) => CamadaDeAvisos(child: child!),
      ),
    );
  }
}
