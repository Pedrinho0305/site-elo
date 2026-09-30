import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../nucleo/tema.dart';
import '../widgets/comum.dart';
import 'casca.dart';

/// Referências: a fundamentação, os cinco artigos (é bibliografia: pode
/// numerar), os recursos institucionais e a nota de metodologia.
class TelaReferencias extends StatelessWidget {
  const TelaReferencias({super.key});

  static const _artigos = [
    ('Tecnologia Assistiva para Idosos: Uma Revisão Sistemática', 'Andrade, D. C. F.', 'Instituto de Estudos em Saúde Coletiva da Universidade Federal do Rio de Janeiro', 'https://doi.org/10.1590/1414-462X202199010420'),
    ('Influência da tecnologia assistiva no desempenho funcional e na qualidade de vida de idosos comunitários frágeis', 'Andrade, D. C. F.', 'Instituto de Estudos em Saúde Coletiva da Universidade Federal do Rio de Janeiro', 'https://doi.org/10.1590/1809-9823.2009120110'),
    ('O impacto do declínio cognitivo, da capacidade funcional e da mobilidade de idosos com doença de Alzheimer na sobrecarga dos cuidadores', 'Borges, L. L.', 'Secretaria Municipal de Goiânia, Centro de Referência em Atenção à Saúde da Pessoa Idosa', 'https://doi.org/10.1590/S1809-29502009000300010'),
    ('Correlação entre funcionalidade, mobilidade e risco de quedas em idosos com doença de Alzheimer', 'Pinheiro, A. H.', 'Federal District Health Department, Geriatrics and Gerontology Outpatient Clinic', 'https://doi.org/10.1590/1980-0037.2020v22e70219'),
    ('Mobilidade a pé nas cidades: a percepção dos idosos sobre a segurança', 'Hillesheim, D.', 'Universidade Federal de Santa Catarina', null),
  ];

  static const _recursos = [
    ('OMS — Envelhecimento e Saúde', 'Dados globais sobre envelhecimento populacional e desafios de saúde', 'https://www.who.int/health-topics/ageing'),
    ('IBGE — Projeções da População Idosa no Brasil', 'Estatísticas demográficas brasileiras sobre envelhecimento', 'https://www.ibge.gov.br/estatisticas/sociais/populacao.html'),
    ('Ministério da Saúde — Política Nacional da Saúde da Pessoa Idosa', 'Políticas públicas de saúde voltadas à terceira idade', 'https://www.gov.br/saude/pt-br'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.cores;
    return Scaffold(
      appBar: const CabecalhoElo(titulo: 'Referências'),
      body: PaginaRolavel(children: [
        const TituloSecao('Referências Científicas', grande: true, apoio: 'Embasamento científico e pesquisas que fundamentam o desenvolvimento do ELO'),
        const Respiro(20),
        Cartao(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Base do projeto', style: TextStyle(color: c.cyan, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          const Text('Fundamentação Teórica', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
          const SizedBox(height: 8),
          Text('O ELO foi desenvolvido a partir de pesquisas científicas rigorosas. Cada decisão técnica e de produto foi guiada por evidências acadêmicas e boas práticas da indústria.',
              style: TextStyle(color: c.text2, height: 1.55)),
          const SizedBox(height: 14),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final t in ['Tecnologia assistiva', 'Envelhecimento ativo', 'Sistemas IoT para saúde', 'Design centrado no usuário'])
              ChipStatus(t, cor: c.cyan),
          ]),
          const SizedBox(height: 18),
          Row(children: [
            for (final (n, t) in [('5', 'artigos revisados por pares'), ('4', 'áreas de pesquisa'), ('3', 'fontes institucionais')])
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                TintaMarca(n, estilo: GoogleFonts.unbounded(fontSize: 28, fontWeight: FontWeight.w700)),
                Text(t, style: TextStyle(color: c.text2, fontSize: 12.5, height: 1.3)),
              ])),
          ]),
        ])),
        const Respiro(32),
        const TituloSecao('Artigos Científicos'),
        const Respiro(14),
        for (final (i, (titulo, autor, instituicao, link)) in _artigos.indexed)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Cartao(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              TintaMarca('${i + 1}', estilo: GoogleFonts.unbounded(fontSize: 26, fontWeight: FontWeight.w700)),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, height: 1.35)),
                const SizedBox(height: 6),
                Text(autor, style: TextStyle(color: c.text, fontWeight: FontWeight.w600)),
                Text(instituicao, style: TextStyle(color: c.text3, fontSize: 13.5, height: 1.4)),
                const SizedBox(height: 10),
                if (link != null)
                  BotaoContorno(texto: 'Acessar artigo', icone: Icons.open_in_new_rounded, compacto: true, aoTocar: () => abrirLink(context, link))
                else
                  Text('Link em breve', style: TextStyle(color: c.text3, fontStyle: FontStyle.italic)),
              ])),
            ])),
          ),
        const Respiro(24),
        const TituloSecao('Recursos Adicionais'),
        const Respiro(14),
        for (final (titulo, texto, link) in _recursos)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Cartao(
              aoTocar: () => abrirLink(context, link),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5)),
                  const SizedBox(height: 4),
                  Text(texto, style: TextStyle(color: c.text2, fontSize: 14)),
                ])),
                Icon(Icons.open_in_new_rounded, color: c.cyan, size: 20),
              ]),
            ),
          ),
        const Respiro(20),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: c.bg2, borderRadius: BorderRadius.circular(Raio.lg), border: Border.all(color: c.line),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 4, height: 150, decoration: BoxDecoration(gradient: EloCores.gradMarca, borderRadius: BorderRadius.circular(2))),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Nota sobre Metodologia', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              const SizedBox(height: 8),
              Text('Todas as referências foram selecionadas por sua relevância para os aspectos técnicos, éticos e sociais do projeto ELO. Foram priorizadas publicações recentes (2023–2024) de periódicos revisados por pares com alto fator de impacto nas áreas de gerontologia, tecnologia assistiva, Internet das Coisas e interação humano-computador. As pesquisas informaram decisões sobre usabilidade, segurança de dados, design de interface e eficácia dos sistemas de alerta.',
                  style: TextStyle(color: c.text2, height: 1.55, fontSize: 14.5)),
            ])),
          ]),
        ),
      ]),
    );
  }
}
