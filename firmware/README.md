# ELO · Firmware da pochete

Código do dispositivo (ESP32), guardado aqui para a montagem e a finalização do projeto. Ele implementa todo o contrato com o servidor descrito em [backend/README.md](../backend/README.md#como-a-pochete-fala-com-o-servidor-contrato-do-dispositivo): o que a pochete manda, o que ela consulta e como confirma as mensagens do cuidador.

Partiu do código base de teste do GPS (TinyGPSPlus no `Serial2`, pinos 16 e 17), que continua igual por baixo.

```
firmware/
  pochete/
    pochete.ino           o programa (abra este na Arduino IDE)
    config.example.h      copie para config.h e preencha (Wi-Fi e chave da pochete)
    certificados.h        certificados raiz para o https com o servidor
  README.md               este arquivo
```

`config.h` fica fora do git (tem a senha do Wi-Fi e a chave da pochete). A pasta inteira fica fora do deploy da Vercel.

## O que a pochete faz

| Ação | O que acontece |
|---|---|
| **Botão vermelho** | Emergência. Avisa o cuidador na hora (painel, Telegram) e os familiares marcados para receber e-mail, com a localização. Depois manda a posição a cada 30 s por 10 min. Anel vermelho piscando. **Não liga para o SAMU**: quem decide é o cuidador. |
| **Botão amarelo** | Pede um carro. A corrida fica esperando a aprovação do cuidador no painel; a pochete avisa com luz e som quando o carro é chamado e quando o motorista está a caminho. Anel amarelo girando. |
| **Botão lateral, toque** | Repete a última mensagem do cuidador. |
| **Botão lateral, segurar 3 s** | Teste: o painel e o Telegram recebem "tudo funcionando". |
| **Mensagem do cuidador** | Toca no buzzer (ou com voz gravada, com o módulo de som) e o anel pisca azul. Repete a cada 30 s, até 10 vezes. A pessoa aperta **qualquer botão** e o painel mostra "ouviu". O vermelho continua sendo emergência mesmo com mensagem tocando (e também confirma a mensagem). Com mensagem tocando, o amarelo só confirma e não pede carro. |
| **GPS** | Manda a posição a cada 2 min se andou mais de 50 m, ou a cada 10 min parada. |
| **Bateria** | Mede a cada minuto; avisa com 20% e com 10% (uma vez cada, até carregar). |
| **Sem internet** | Guarda até 12 eventos e reenvia a cada 10 s quando a rede volta. Emergência fura a fila. Ponto laranja no anel. |
| **Travou?** | O cão de guarda reinicia a pochete depois de 30 s parada. |

Não há comando de voz: foi retirado do projeto.

O anel, em repouso, acende um ponto a cada 10 s: verde, tudo certo; laranja, sem internet; vermelho, bateria baixa.

## Peças e ligações (ESP32 DevKit V1)

| Peça | Pino da peça | ESP32 |
|---|---|---|
| GPS NEO-6M (ou similar, 9600 baud) | TX | GPIO **16** |
| | RX | GPIO **17** |
| | VCC / GND | 3V3 / GND |
| Botão vermelho | um lado / outro lado | GPIO **32** / GND |
| Botão amarelo | um lado / outro lado | GPIO **33** / GND |
| Botão lateral | um lado / outro lado | GPIO **27** / GND |
| Anel de LED WS2812 (12 LEDs) | DIN / 5V / GND | GPIO **4** / 5V / GND |
| Buzzer passivo | + / − | GPIO **25** / GND |
| Bateria Li-Po 3,7 V (medição) | divisor 100 kΩ + 100 kΩ entre bateria e GND, meio do divisor | GPIO **35** |
| DFPlayer Mini (opcional) | TX / RX (com resistor de 1 kΩ) | GPIO **26** / GPIO **14** |
| | VCC / GND / SPK1-SPK2 | 5V / GND / alto-falante |

Os botões não precisam de resistor: o código liga o pull-up interno. Para mudar um pino, troque o `#define` no topo do `pochete.ino`.

## Preparar a Arduino IDE

1. Placa: em **Preferências**, adicione `https://espressif.github.io/arduino-esp32/package_esp32_index.json`; em **Gerenciador de Placas**, instale **esp32** (Espressif). Testado com as versões **2.0.17** e **3.3.12**. Placa: **ESP32 Dev Module**.
2. Bibliotecas, pelo **Gerenciador de Bibliotecas**: **TinyGPSPlus** (Mikal Hart), **Adafruit NeoPixel**, **ArduinoJson** (versão 7) e, se for usar o módulo de som, **DFRobotDFPlayerMini**.
3. Copie `config.example.h` para `config.h` e preencha:
   - o nome e a senha do Wi-Fi (até 3 redes, tentadas em ordem: casa, celular roteando...);
   - `POCHETE_CHAVE`: no site, entre no **Painel → Pochete e avisos → Vincular uma pochete**. A chave `elo_…` aparece **uma vez**; se perder, use "Nova chave" (a antiga para de funcionar).
4. Compile e grave. Abra o Monitor Serial em **115200** para acompanhar (com `DEPURAR 1`).

O programa usa cerca de 85% da memória de programa no esquema padrão. Se um dia faltar espaço, escolha **Partition Scheme → Huge APP**.

## Módulo de som (opcional)

Com `USAR_DFPLAYER 1`, a pochete fala com voz gravada. Grave os áudios num cartão microSD, numa pasta chamada `mp3`, com estes nomes:

| Arquivo | O que diz |
|---|---|
| `0001.mp3` | "Estou a caminho." |
| `0002.mp3` | "Hora de tomar o remédio." |
| `0003.mp3` | "Me ligue quando puder." |
| `0004.mp3` | "Fique onde está, já vou buscar você." |
| `0005.mp3` | "Está tudo bem? Aperte um botão para me responder." |
| `0010.mp3` | "Você tem uma mensagem nova de quem cuida de você." |
| `0011.mp3` | "Pedido de ajuda enviado. Seu cuidador já foi avisado." |
| `0012.mp3` | "Sem internet agora. Vou tentar de novo sozinha." |
| `0013.mp3` | "Pedido de carro enviado. Espere a aprovação." |
| `0014.mp3` | "Seu carro foi chamado." |
| `0015.mp3` | "O motorista está a caminho." |
| `0016.mp3` | "O pedido de carro não foi aprovado." |
| `0017.mp3` | "Bateria baixa. Coloque a pochete para carregar." |
| `0018.mp3` | "Tudo funcionando." |

De 1 a 5 são as mensagens prontas do painel, **na mesma ordem** de `RECADOS_PRONTOS` em `backend/server.js`. Mudou o texto ou a ordem lá, regrave o áudio aqui. Mensagem escrita à mão no painel toca o `0010.mp3`: o texto livre não vira voz, porque o ESP32 não sintetiza fala.

Sem o módulo, tudo funciona com o buzzer, com um toque diferente para cada situação.

## Segurança

- A conversa com o servidor é **https com o certificado conferido** (`certificados.h`: Google Trust Services, que atende os domínios `*.vercel.app`, e Let's Encrypt, para domínio próprio). Ninguém num Wi-Fi público consegue se passar pelo servidor nem ler a chave.
- As raízes vencem a partir de 2035. Se o servidor mudar de provedor, troque o arquivo pelas raízes novas.
- A chave fica só no `config.h` (fora do git). Se uma pochete for perdida, gere "Nova chave" no painel: a antiga para na hora.

## Próximos passos para finalizar

- **Rede celular:** hoje a pochete usa Wi-Fi. Para funcionar na rua sem celular por perto, troque a parte de rede (função `pedir()`) por um módulo 4G com TLS 1.2, como o SIM7600 ou o A7670, usando a biblioteca TinyGSM. O SIM800L da lista de componentes não serve para o servidor da Vercel: ele não fala TLS 1.2.
- **Economia de bateria:** com 2000 mAh, o consumo do Wi-Fi ligado direto não chega às 48 h prometidas. O caminho é o *light sleep* do ESP32 entre as consultas, acordando pelos botões (são pinos RTC).
- **Calibrar a bateria:** meça a tensão real com um multímetro e ajuste `BATERIA_CALIBRACAO` no `config.h`.
