# App ELO (Flutter · Android e iOS)

O site inteiro da ELO como aplicativo, em Dart/Flutter. Fala com **o mesmo backend e a mesma Eloá do site publicado** (`https://site-elo-pi.vercel.app`), então as contas, pochetes, avisos, corridas e mensagens são as mesmas nos dois.

## O que tem

| Área | O que faz | Equivalente no site |
|---|---|---|
| **Início** | Hero com a pochete flutuando e os chips do app, os 6 recursos, diferencial, público, objetivo e o preço | `index.html` |
| **Produto** | Embalagem, componentes com custos, o que vem na caixa, preço e o **formulário de pedido** (`POST /api/mensagens`, tipo `pedido`) | `pages/produtos.html` |
| **Eloá** | A assistente, pela mesma API (`/api/eloa/perguntar`), com o histórico da conversa | `pages/eloa.html` |
| **Painel** (com login) | Estado da pochete, **Chamar Uber**, ações rápidas, corrida com aprovar/recusar/cancelar, vincular pochete (chave), Telegram, testar os botões sem a pochete, perfil | `pages/painel.html` |
| **Entrar** (sem login) | Login e cadastro — **só entra quem o backend reconhece** | `pages/login.html`, `cadastro.html` |
| **Mais** | Instruções (com a pochete em 3D sob demanda), Quem Somos (equipe e **contato**), Referências, Jogo (gd.games), Relatórios, tema, sair | as outras páginas |
| **Relatórios** | Período, os 4 números com comparação, **mapa do Google** da pochete e o registro | `pages/relatorios.html` |
| **Avisos** | O mesmo card do site em qualquer tela: emergência (com "Ligar 192"), pedido de carro, bateria, teste; consulta a cada 15 s | `js/avisos.js` |

Tema escuro (padrão) e claro com os mesmos tokens do `css/header.css`; fontes Unbounded + Figtree.

**Regras do site que valem aqui:** o botão vermelho **não** chama o SAMU (avisa o cuidador, que decide ligar 192); sem credencial da Uber, "Chamar Uber" abre o **link universal** do Uber; login só com backend; o preço está em `lib/nucleo/config.dart` (mude junto com a home e o produto do site).

## Estrutura

```
lib/
  main.dart                 app, temas, camada de avisos
  nucleo/  config.dart      endereços (site, API, Eloá) e preço
           tema.dart        cores (Noite/Gelo), raios, fontes
           sessao.dart      sessão { token, cuidador } + tema (shared_preferences)
           api.dart         chamadas ao backend (Bearer, { erro })
           avisos.dart      central de avisos (consulta /api/eventos)
  telas/   casca.dart (navegação) · inicio · produto · eloa · entrar · painel · relatorios · instrucoes · quem_somos · referencias · jogo
  widgets/ comum.dart (botões, cartões, mapa do Google) · cartao_aviso.dart · formulario.dart · quadro_web*.dart (WebView/iframe)
assets/    img/ (fotos do produto, Eloá, jogo) · equipe/ · icone/
```

## Rodar e compilar (Windows, nesta máquina)

O Flutter e o Android SDK ficam em `C:\Users\ph030\dev` (fora do repositório):

```bash
set PATH=C:\Users\ph030\dev\flutter\bin;%PATH%
set ANDROID_HOME=C:\Users\ph030\dev\android-sdk
cd app
flutter pub get
flutter run                    # com um celular Android ligado por USB (depuração USB ativa)
flutter build apk --release    # gera build\app\outputs\flutter-apk\app-release.apk
```

**Instalar no Android:** copie o `app-release.apk` para o celular e abra (o Android pede para permitir "instalar apps desconhecidos"). Ou, com o celular no cabo: `flutter install`.

Apontar para outro backend (ex.: o `npm start` da máquina, visto do emulador): `flutter run --dart-define=ELO_SITE=http://10.0.2.2:3000` (a API fica em `ELO_SITE/api`; `ELO_API` e `ELOA_API` sobrescrevem cada um).

Ver o app no navegador (só para desenvolver; mapas e jogo viram `<iframe>`): `flutter run -d chrome`.

## Na nuvem (GitHub Actions)

`.github/workflows/app.yml` compila a cada push na `main` que mexa em `app/` (ou manualmente, em *Actions → App ELO → Run workflow*):

- **elo-android**: `app-release.apk` (instalar direto) e `app-release.aab` (Play Store).
- **elo-ios**: `elo-ios-sem-assinatura.ipa`, compilado num Mac da nuvem. Serve para provar que compila; **para instalar em iPhones é preciso assinar** (abaixo).

### Assinar o Android (Play Store)

Hoje o release é assinado com a chave de depuração (instala direto, mas a Play Store recusa). Para a loja:

```bash
keytool -genkey -v -keystore elo-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias elo
```

Na máquina: coloque o `.jks` em `android/app/` e crie `android/key.properties` (`storeFile=elo-release.jks`, `storePassword`, `keyAlias=elo`, `keyPassword`) — os dois ficam fora do git. Na nuvem: os segredos `ANDROID_KEYSTORE_BASE64` (o `.jks` em base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. **Guarde o `.jks` e as senhas**: sem eles não dá para publicar atualizações.

### iOS

O Windows não compila iOS; a Apple exige macOS + Xcode. O caminho:

1. **Conta Apple Developer** (US$ 99/ano) — sem ela, só dá para testar no próprio iPhone de quem tem um Mac, por 7 dias.
2. **Com um Mac:** `cd app && flutter build ipa` → abrir `ios/Runner.xcworkspace` no Xcode, escolher o *Team* em *Signing & Capabilities*, e *Product → Archive → Distribute* (TestFlight ou App Store). Bundle id: `com.elocompany.elo`.
3. **Sem Mac:** o Codemagic (plano grátis) compila e assina na nuvem com a conta Apple conectada e manda direto para o TestFlight; ou estenda o workflow com os certificados como segredos.

## Pendências

- **Notificações com o app fechado**: hoje os avisos chegam com o app aberto (consulta a cada 15 s). Com o app fechado, quem avisa é o **Telegram**. Push de verdade exigiria Firebase Cloud Messaging no backend.
- **Foto do perfil**: o app mostra a foto da conta, mas trocar a foto ainda é pelo site.
- **Localização do celular no "Chamar Uber"**: o app manda a posição da pochete; sem ela, o link do Uber usa "minha localização" do próprio app do Uber.
