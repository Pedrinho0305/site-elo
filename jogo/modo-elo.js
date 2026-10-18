// ELO: escolhe o modo do jogo (pc ou mobile) sem passar pela cena "Escolha-Modo".
// Carregado no index.html do GDevelop depois de data.js e antes do script que cria
// o jogo; reexportou o jogo? Coloque esta linha de volta (veja LEIA-ME.txt).
//   pages/jogo.html manda ?modo=pc ou ?modo=mobile; sem o parâmetro, decide pelo aparelho.
(function () {
  var dados = window.gdjs && gdjs.projectData;
  if (!dados) return;

  var ua = navigator.userAgent || '';
  var celular = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
                (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var pedido = new URLSearchParams(location.search).get('modo');
  var modo = pedido === 'pc' || pedido === 'mobile' ? pedido : (celular ? 'mobile' : 'pc');

  // VarModo é a variável global que as fases leem para mostrar os controles de toque
  var variavel = dados.variables.find(function (v) { return v.name === 'VarModo'; });
  if (variavel) variavel.value = modo;
  if (dados.layouts.some(function (l) { return l.name === 'Inicio-Jogo'; })) {
    dados.firstLayout = 'Inicio-Jogo';
  }

  if (modo !== 'mobile') return;

  // O mesmo que o botão "Celular" da Escolha-Modo fazia: no primeiro toque, tela cheia
  // na horizontal (o navegador só permite logo depois de um toque; o iPhone não tem).
  var d = document;
  var travar = function () {
    try {
      if ((d.fullscreenElement || d.webkitFullscreenElement) && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function () {});
      }
    } catch (e) {}
  };
  window.__auraToque = true;   // a cena original instala o mesmo toque; evita dois
  d.addEventListener('touchend', function () {
    if (d.fullscreenElement || d.webkitFullscreenElement) { travar(); return; }
    var el = d.documentElement;
    var pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!pedir) return;
    try {
      var p = pedir.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(travar).catch(function () {}); else setTimeout(travar, 300);
    } catch (e) {}
  }, { passive: true });
  d.addEventListener('fullscreenchange', travar);
  d.addEventListener('webkitfullscreenchange', travar);
})();
