/* ==========================================================================
   QR Code (sem biblioteca)
   ---------------------------------------------------------------------------
   Usado pela janela "Ligar" no computador: o número vira um QR Code com
   tel:+55..., a pessoa aponta a câmera do celular e a ligação abre pronta.

   Implementa o necessário da norma ISO/IEC 18004 para textos curtos: modo
   byte, correção de erro nível M, versões 1 a 9 (até 180 bytes), escolha
   automática da máscara pela menor penalidade. Segue a estrutura da
   implementação de referência de Project Nayuki (MIT).

   API: window.EloQR.svg(texto, { escuro, claro, margem }) → string <svg>
        window.EloQR.matriz(texto, mascara?) → boolean[][] (para teste)
   ========================================================================== */
(() => {
  // Nível M: [códigos de correção por bloco, [[nº de blocos, dados por bloco], ...]]
  const BLOCOS_M = [null,
    [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
    [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]],
  ];
  const ALINHAMENTO = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46]];

  const bit = (x, i) => ((x >>> i) & 1) !== 0;

  /* ---- Reed-Solomon sobre GF(256), polinômio 0x11D ---- */
  function mult(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function divisor(grau) {
    const r = new Array(grau).fill(0);
    r[grau - 1] = 1;
    let raiz = 1;
    for (let i = 0; i < grau; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = mult(r[j], raiz);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      raiz = mult(raiz, 0x02);
    }
    return r;
  }
  function resto(dados, div) {
    const r = new Array(div.length).fill(0);
    for (const b of dados) {
      const fator = b ^ r.shift();
      r.push(0);
      div.forEach((coef, i) => { r[i] ^= mult(coef, fator); });
    }
    return r;
  }

  /* ---- bits de dados: modo byte, versão mínima que cabe ---- */
  function codificar(texto) {
    const bytes = [...new TextEncoder().encode(texto)];
    let versao = 0;
    for (let v = 1; v <= 9; v++) {
      const capacidade = BLOCOS_M[v][1].reduce((s, [n, d]) => s + n * d, 0);
      if (4 + 8 + bytes.length * 8 <= capacidade * 8) { versao = v; break; }
    }
    if (!versao) throw new Error('Texto longo demais para o QR Code');
    const capacidade = BLOCOS_M[versao][1].reduce((s, [n, d]) => s + n * d, 0);

    const bits = [];
    const poe = (valor, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
    poe(0b0100, 4);              // modo byte
    poe(bytes.length, 8);        // contagem (8 bits até a versão 9)
    bytes.forEach(b => poe(b, 8));
    poe(0, Math.min(4, capacidade * 8 - bits.length)); // terminador
    while (bits.length % 8) bits.push(0);
    const dados = [];
    for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    for (let pad = 0xEC; dados.length < capacidade; pad ^= 0xEC ^ 0x11) dados.push(pad);

    // separa em blocos, calcula a correção de cada um e intercala
    const [ecLen, grupos] = BLOCOS_M[versao];
    const div = divisor(ecLen);
    const blocos = [];
    let k = 0;
    for (const [n, d] of grupos) for (let i = 0; i < n; i++) {
      const parte = dados.slice(k, k += d);
      blocos.push({ dados: parte, ec: resto(parte, div) });
    }
    const final = [];
    const maior = Math.max(...blocos.map(b => b.dados.length));
    for (let i = 0; i < maior; i++) blocos.forEach(b => { if (i < b.dados.length) final.push(b.dados[i]); });
    for (let i = 0; i < ecLen; i++) blocos.forEach(b => final.push(b.ec[i]));
    return { versao, codigos: final };
  }

  /* ---- a matriz ---- */
  function montar(versao, codigos, mascara) {
    const tam = versao * 4 + 17;
    const m = Array.from({ length: tam }, () => new Array(tam).fill(false));
    const funcao = Array.from({ length: tam }, () => new Array(tam).fill(false));
    const poe = (x, y, escuro) => { m[y][x] = escuro; funcao[y][x] = true; };

    for (let i = 0; i < tam; i++) { poe(6, i, i % 2 === 0); poe(i, 6, i % 2 === 0); }   // linhas de tempo
    const localizador = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < tam && y >= 0 && y < tam) poe(x, y, d !== 2 && d !== 4);
      }
    };
    localizador(3, 3); localizador(tam - 4, 3); localizador(3, tam - 4);
    const pos = ALINHAMENTO[versao], ult = pos.length - 1;
    pos.forEach((a, i) => pos.forEach((b, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === ult) || (i === ult && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poe(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    formato(m, funcao, tam, 0, poe); // reserva as áreas do formato (valor final vem depois da máscara)
    if (versao >= 7) {
      let r = versao;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const bits = (versao << 12) | r;
      for (let i = 0; i < 18; i++) {
        const b = bit(bits, i), a = tam - 11 + (i % 3), c = Math.floor(i / 3);
        poe(a, c, b); poe(c, a, b);
      }
    }

    // dados em zigue-zague, de baixo para cima, colunas em pares da direita
    let i = 0;
    for (let dir = tam - 1; dir >= 1; dir -= 2) {
      if (dir === 6) dir = 5;
      for (let v = 0; v < tam; v++) for (let j = 0; j < 2; j++) {
        const x = dir - j, subindo = ((dir + 1) & 2) === 0, y = subindo ? tam - 1 - v : v;
        if (!funcao[y][x] && i < codigos.length * 8) { m[y][x] = bit(codigos[i >>> 3], 7 - (i & 7)); i++; }
      }
    }

    const MASCARAS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
    ];
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (!funcao[y][x] && MASCARAS[mascara](x, y)) m[y][x] = !m[y][x];
    formato(m, funcao, tam, mascara, poe);
    return m;
  }

  // 15 bits de formato (nível M = 00 + máscara), com BCH e a máscara fixa 0x5412
  function formato(m, funcao, tam, mascara, poe) {
    const dados = (0 << 3) | mascara;
    let r = dados;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const bits = ((dados << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) poe(8, i, bit(bits, i));
    poe(8, 7, bit(bits, 6)); poe(8, 8, bit(bits, 7)); poe(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) poe(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) poe(tam - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) poe(8, tam - 15 + i, bit(bits, i));
    poe(8, tam - 8, true); // módulo escuro fixo
  }

  /* ---- penalidade (para escolher a máscara mais fácil de ler) ---- */
  function penalidade(m) {
    const tam = m.length;
    let p = 0, escuros = 0;
    const linhas = (ler) => {
      for (let a = 0; a < tam; a++) {
        let corrida = 1;
        for (let b = 1; b <= tam; b++) {
          if (b < tam && ler(a, b) === ler(a, b - 1)) { corrida++; continue; }
          if (corrida >= 5) p += 3 + (corrida - 5);
          corrida = 1;
        }
        // padrão parecido com o localizador: 1011101 com 4 claros de um lado
        for (let b = 0; b + 10 < tam; b++) {
          const s = Array.from({ length: 11 }, (_, k) => ler(a, b + k) ? 1 : 0).join('');
          if (s === '10111010000' || s === '00001011101') p += 40;
        }
      }
    };
    linhas((y, x) => m[y][x]);
    linhas((x, y) => m[y][x]);
    for (let y = 0; y < tam - 1; y++) for (let x = 0; x < tam - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    m.forEach(l => l.forEach(c => { if (c) escuros++; }));
    p += Math.floor(Math.abs(escuros * 20 - tam * tam * 10) / (tam * tam)) * 10;
    return p;
  }

  function matriz(texto, mascara) {
    const { versao, codigos } = codificar(texto);
    if (mascara != null) return montar(versao, codigos, mascara);
    let melhor = null, menor = Infinity;
    for (let k = 0; k < 8; k++) {
      const m = montar(versao, codigos, k), p = penalidade(m);
      if (p < menor) { menor = p; melhor = m; }
    }
    return melhor;
  }

  function svg(texto, { escuro = '#0b1229', claro = '#ffffff', margem = 4 } = {}) {
    const m = matriz(texto);
    const tam = m.length + margem * 2;
    let caminho = '';
    m.forEach((linha, y) => linha.forEach((c, x) => { if (c) caminho += `M${x + margem} ${y + margem}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${tam}" height="${tam}" fill="${claro}"/><path d="${caminho}" fill="${escuro}"/></svg>`;
  }

  window.EloQR = { svg, matriz };
})();
