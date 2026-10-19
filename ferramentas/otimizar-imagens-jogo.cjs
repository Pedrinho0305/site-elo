// ELO · Deixa o jogo leve: troca os PNG de jogo/ por WebP e aponta o data.js para eles.
//
// O GDevelop exporta as artes em PNG pouco comprimido (várias de 1920 px e 5 MB), e o
// navegador baixa tudo antes de cada fase. Aqui:
//   · sprite pequeno (até 300 KB): WebP sem perda, conferido pixel a pixel;
//   · arte grande: WebP qualidade 90; se a fidelidade (PSNR) ficar abaixo de 38 dB, 95;
//     abaixo disso ainda, sem perda. As dimensões não mudam, então nada muda de tamanho
//     dentro do jogo.
// O nome do arquivo continua com o hash do GDevelop na frente (o cache longo do
// vercel.json depende disso); só a extensão muda.
//
// Uso, depois de copiar uma exportação nova para jogo/ (ver jogo/LEIA-ME.txt):
//   cd ferramentas && npm install && node otimizar-imagens-jogo.cjs
// Rodar de novo não faz mal: o que já é WebP fica como está.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const JOGO = path.join(__dirname, '..', 'jogo');
const LIMITE_PEQUENO = 300 * 1024;
const PSNR_MINIMO = 38;
sharp.concurrency(2);

// Fidelidade da arte grande, só onde há algo visível (cor ponderada pelo alfa)
function psnr(a, b) {
  let soma = 0, n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 8 && b[i + 3] < 8) continue;
    for (let k = 0; k < 3; k++) {
      const d = (a[i + k] * a[i + 3] - b[i + k] * b[i + 3]) / 255;
      soma += d * d; n++;
    }
    const da = a[i + 3] - b[i + 3]; soma += da * da; n++;
  }
  return n ? 10 * Math.log10((255 * 255) / (soma / n || 1e-9)) : 99;
}

// Sem perda: todo pixel visível igual (a cor escondida sob alfa 0 não aparece)
function identico(a, b) {
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] === 0 && b[i + 3] === 0) continue;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) return false;
  }
  return true;
}

const pixels = buf => sharp(buf).ensureAlpha().raw().toBuffer();

async function converter(nome) {
  const original = fs.readFileSync(path.join(JOGO, nome));
  const ref = await pixels(original);
  const tentativas = original.length <= LIMITE_PEQUENO
    ? [{ lossless: true }]
    : [{ quality: 90 }, { quality: 95 }, { lossless: true }];
  for (const t of tentativas) {
    const webp = await sharp(original).webp({ ...t, alphaQuality: 100, smartSubsample: true, effort: 6 }).toBuffer();
    if (webp.length >= original.length) return null;          // não compensa: fica o PNG
    const novo = await pixels(webp);
    if (t.lossless ? identico(ref, novo) : psnr(ref, novo) >= PSNR_MINIMO) return webp;
  }
  return null;
}

(async () => {
  const dataJs = path.join(JOGO, 'data.js');
  let dados = fs.readFileSync(dataJs, 'utf8');
  const pngs = fs.readdirSync(JOGO).filter(f => /\.png$/i.test(f));
  let antes = 0, depois = 0;
  const trocados = [];   // os PNG só são apagados no fim, com o data.js já gravado
  const fila = [...pngs];

  await Promise.all(Array.from({ length: 4 }, async () => {
    while (fila.length) {
      const nome = fila.shift();
      const tamanho = fs.statSync(path.join(JOGO, nome)).size;
      antes += tamanho;
      const referencia = `"file":${JSON.stringify(nome)}`;
      if (!dados.includes(referencia)) { depois += tamanho; console.warn('fora do data.js, mantido:', nome); continue; }
      const webp = await converter(nome);
      if (!webp) { depois += tamanho; continue; }
      const novoNome = nome.replace(/\.png$/i, '.webp');
      fs.writeFileSync(path.join(JOGO, novoNome), webp);
      dados = dados.split(referencia).join(`"file":${JSON.stringify(novoNome)}`);
      depois += webp.length; trocados.push(nome);
    }
  }));

  fs.writeFileSync(dataJs, dados);
  for (const nome of trocados) fs.unlinkSync(path.join(JOGO, nome));
  console.log(`${trocados.length} de ${pngs.length} PNG viraram WebP: ${(antes / 1e6).toFixed(1)} MB → ${(depois / 1e6).toFixed(1)} MB`);
})().catch(e => { console.error(e); process.exit(1); });
