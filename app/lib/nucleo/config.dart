/// Endereços que o app usa. São os mesmos do site publicado: o backend
/// (contas, pochete, Uber, Telegram, mensagens) em /api e a Eloá em
/// /api/eloa. Para apontar para outro servidor sem mudar o código:
///   flutter run --dart-define=ELO_SITE=http://10.0.2.2:3000
library;

const String siteBase = String.fromEnvironment('ELO_SITE', defaultValue: 'https://site-elo-pi.vercel.app');
const String apiBase = String.fromEnvironment('ELO_API', defaultValue: '$siteBase/api');
const String eloaUrl = String.fromEnvironment('ELOA_API', defaultValue: '$siteBase/api/eloa/perguntar');

/// Modelo 3D da pochete (2 MB): baixado só quando a pessoa pede.
const String modelo3dUrl = '$siteBase/assets/3d/pochete.glb';

/// O jogo: a mesma exportação HTML5 da página Jogo do site (pasta jogo/), só o
/// jogo, sem a interface do gd.games. ?modo=mobile liga os controles de toque.
const String jogoUrl = '$siteBase/jogo/index.html?modo=mobile';

/// A partida gravada da página Jogo do site (14 MB): tocada do site, não vai no APK.
const String jogoVideoUrl = '$siteBase/assets/video/jogo-gameplay.mp4';
const String jogoVideoCapaUrl = '$siteBase/assets/img/jogo-gameplay-capa.jpg';

/// Preço: o mesmo da home e da página Produto do site (mude junto).
const String precoAVista = 'R\$ 997';
const String precoParcelado = '12× de R\$ 89,90';
