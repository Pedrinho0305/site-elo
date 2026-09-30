import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// "O sinal": os mesmos tokens do css/header.css do site, nos dois temas.
/// Noite (escuro) é o padrão; Gelo (claro) é o azul pálido da foto do produto.
@immutable
class EloCores extends ThemeExtension<EloCores> {
  const EloCores({
    required this.bg, required this.bg2, required this.bg3, required this.bg4,
    required this.line, required this.line2,
    required this.text, required this.text2, required this.text3,
    required this.green, required this.green2, required this.cyan, required this.blue, required this.blue2,
    required this.orange, required this.red, required this.purple, required this.teal,
    required this.escuro,
  });

  final Color bg, bg2, bg3, bg4, line, line2, text, text2, text3;
  final Color green, green2, cyan, blue, blue2, orange, red, purple, teal;
  final bool escuro;

  static const inkOnBrand = Color(0xFF05101F);

  static const noite = EloCores(
    bg: Color(0xFF060B1C), bg2: Color(0xFF0B1229), bg3: Color(0xFF111A38), bg4: Color(0xFF1A2552),
    line: Color(0x24A0B2EB), line2: Color(0x4DA0B2EB),
    text: Color(0xFFEEF2FF), text2: Color(0xFFB4BDDC), text3: Color(0xFF808CB5),
    green: Color(0xFF22C55E), green2: Color(0xFF4ADE80), cyan: Color(0xFF22D3EE), blue: Color(0xFF2F7FF7), blue2: Color(0xFF6AA6FF),
    orange: Color(0xFFFF7A1A), red: Color(0xFFFF3B4E), purple: Color(0xFFA78BFA), teal: Color(0xFF2DD4BF),
    escuro: true,
  );

  static const gelo = EloCores(
    bg: Color(0xFFEEF3FB), bg2: Color(0xFFFFFFFF), bg3: Color(0xFFF5F8FE), bg4: Color(0xFFE2EAF9),
    line: Color(0x1A14285A), line2: Color(0x3814285A),
    text: Color(0xFF0B1226), text2: Color(0xFF414D72), text3: Color(0xFF6E7997),
    green: Color(0xFF16A34A), green2: Color(0xFF15803D), cyan: Color(0xFF0E9FBF), blue: Color(0xFF1D6FF2), blue2: Color(0xFF1D6FF2),
    orange: Color(0xFFF26A0A), red: Color(0xFFE11D48), purple: Color(0xFF7C3AED), teal: Color(0xFF0D9488),
    escuro: false,
  );

  /// Logo ∞: verde → ciano → azul
  static const gradMarca = LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF22D3EE), Color(0xFF2F7FF7)], stops: [0, .52, 1]);

  /// Painel azul-marinho (a embalagem): escuro nos dois temas
  static const gradPainel = LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF122051), Color(0xFF08122F)]);

  LinearGradient get gradCartao => LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [bg3, bg2]);

  @override
  EloCores copyWith() => this;

  @override
  EloCores lerp(ThemeExtension<EloCores>? other, double t) => t < .5 ? this : (other as EloCores? ?? this);
}

extension ContextoElo on BuildContext {
  EloCores get cores => Theme.of(this).extension<EloCores>()!;
  bool get telaEstreita => MediaQuery.sizeOf(this).width < 600;
}

/// Raios do site
class Raio {
  static const xl = 32.0, lg = 22.0, md = 14.0, sm = 10.0;
}

class EloTema {
  static ThemeData criar(EloCores c) {
    // Figtree no texto; Unbounded (display) nos títulos grandes
    final base = ThemeData(brightness: c.escuro ? Brightness.dark : Brightness.light, useMaterial3: true, fontFamily: GoogleFonts.figtree().fontFamily);
    final texto = base.textTheme.apply(bodyColor: c.text, displayColor: c.text);
    TextStyle? display(TextStyle? s, double peso) => GoogleFonts.unbounded(textStyle: s, fontWeight: FontWeight.values[(peso ~/ 100) - 1], letterSpacing: -0.6, color: c.text);
    return base.copyWith(
      scaffoldBackgroundColor: c.bg,
      colorScheme: ColorScheme.fromSeed(
        seedColor: c.cyan, brightness: c.escuro ? Brightness.dark : Brightness.light,
      ).copyWith(primary: c.cyan, secondary: c.green, surface: c.bg2, error: c.red, onPrimary: EloCores.inkOnBrand),
      textTheme: texto.copyWith(
        displayLarge: display(texto.displayLarge, 700),
        displayMedium: display(texto.displayMedium, 700),
        displaySmall: display(texto.displaySmall, 700),
        headlineLarge: display(texto.headlineLarge, 700),
        headlineMedium: display(texto.headlineMedium, 600),
        headlineSmall: display(texto.headlineSmall, 600),
      ),
      extensions: [c],
      dividerColor: c.line,
      appBarTheme: AppBarTheme(
        backgroundColor: c.bg, surfaceTintColor: Colors.transparent, foregroundColor: c.text, elevation: 0, scrolledUnderElevation: 0,
        titleTextStyle: GoogleFonts.figtree(fontWeight: FontWeight.w700, fontSize: 18, color: c.text),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.bg2, indicatorColor: c.cyan.withValues(alpha: .16), surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((s) => GoogleFonts.figtree(fontSize: 12, fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500, color: s.contains(WidgetState.selected) ? c.text : c.text3)),
        iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(color: s.contains(WidgetState.selected) ? c.cyan : c.text3)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: c.bg2,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle: TextStyle(color: c.text2),
        hintStyle: TextStyle(color: c.text3),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Raio.md), borderSide: BorderSide(color: c.line2)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Raio.md), borderSide: BorderSide(color: c.line2)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Raio.md), borderSide: BorderSide(color: c.cyan, width: 1.6)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Raio.md), borderSide: BorderSide(color: c.red)),
      ),
      snackBarTheme: SnackBarThemeData(backgroundColor: c.bg3, contentTextStyle: GoogleFonts.figtree(color: c.text), behavior: SnackBarBehavior.floating),
      dialogTheme: DialogThemeData(backgroundColor: c.bg2, surfaceTintColor: Colors.transparent),
      bottomSheetTheme: BottomSheetThemeData(backgroundColor: c.bg2, surfaceTintColor: Colors.transparent),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: c.cyan),
    );
  }
}
