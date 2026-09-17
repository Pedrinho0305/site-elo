// Esquema 3D: liga os pontos do modelo à legenda.
// Tocar num ponto destaca o item; tocar num item destaca o ponto.
document.addEventListener('DOMContentLoaded', () => {
  const stage = document.querySelector('.scheme-model');
  const items = [...document.querySelectorAll('.scheme-item')];
  if (!stage || !items.length) return;

  const hotspots = [...stage.querySelectorAll('.hotspot')];

  const select = (n) => {
    items.forEach(item => item.classList.toggle('is-active', item.dataset.hotspot === n));
    hotspots.forEach(h => h.classList.toggle('is-active', h.dataset.target === 'f' + n));
  };

  hotspots.forEach(h => {
    h.addEventListener('click', () => {
      const n = h.dataset.target.replace('f', '');
      select(n);
      document.getElementById(h.dataset.target)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });

  items.forEach(item => {
    item.tabIndex = 0;
    const activate = () => select(item.dataset.hotspot);
    item.addEventListener('click', activate);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  });

  select('1');
});
