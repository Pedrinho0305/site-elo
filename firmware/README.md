# ELO · Firmware da pochete

Código do dispositivo (ESP32), guardado aqui para a montagem e a finalização do projeto. Ele implementa o contrato com o servidor descrito em [backend/README.md](../backend/README.md#como-a-pochete-fala-com-o-servidor-contrato-do-dispositivo): o que a pochete manda, o que ela consulta e como confirma as mensagens do cuidador.

Partiu dos códigos de teste da montagem: o do GPS (TinyGPSPlus no `Serial2`, pinos 16 e 17) e o dos botões com buzzer (preto no D18, vermelho no D22, buzzer no D23, pull-up interno).

```
firmware/
  pochete/
    pochete.ino           o programa (abra este na Arduino IDE)
    config.example.h      copie para config.h e preencha (Wi-Fi e chave da pochete)
    certificados.h        certificados raiz para o https com o servidor
  teste-gps/
    teste-gps.ino         só o GPS mandando a posição para o site (teste da montagem)
    config.example.h      igual ao da pochete: copie para config.h
    certificados.h        cópia do da pochete (a Arduino IDE só enxerga a pasta do sketch)
  README.md               este arquivo
```

`config.h` fica fora do git (tem a senha do Wi-Fi e a chave da pochete). A pasta inteira fica fora do deploy da Vercel.

## Teste do GPS com o site (`teste-gps/`)

O código de teste do GPS, agora conversando com o servidor. Serve para conferir o GPS, o Wi-Fi e a chave antes de montar o resto. A cada 2 s mostra a localização no Monitor Serial; a cada 30 s, se o GPS tiver sinal, manda `{ "tipo": "localizacao", "lat", "lng" }` para `POST /api/pochete/evento` (a mesma rota da pochete) e mostra a resposta do servidor. Com `201`, a posição aparece no **Painel → Onde está agora** e em **Relatórios**. Se der erro, o motivo que o servidor mandou aparece no Serial (por exemplo, chave inválida).

O GPS só tem sinal ao ar livre ou perto da janela; a primeira posição pode levar alguns minutos.

## O que a pochete faz

Os botões só valem se forem **segurados por 3 segundos**: um aperto rápido sem querer não dispara nada. Enquanto a pessoa segura, o buzzer dá um bipe a cada segundo; aos 3 s, toca o som da ação.

| Ação | O que acontece |
|---|---|
| **Botão vermelho, segurar 3 s** | Emergência. O servidor avisa o cuidador na hora (painel, Telegram) e os familiares marcados para receber e-mail, com a localização. Depois a pochete manda a posição a cada 30 s por 10 min. **Não liga para o SAMU**: quem decide é o cuidador. |
| **Botão preto, segurar 3 s** | Pede um Uber. A corrida fica esperando o cuidador aprovar no painel; a pochete apita quando o carro é chamado e quando o motorista está a caminho. Precisa do endereço de casa cadastrado na pochete (Painel → Pochete e avisos) e de uma posição do GPS (a atual ou a última que chegou ao servidor). |
| **Mensagem do cuidador** | Toca no buzzer e repete a cada 30 s, até 10 vezes. Um **toque curto em qualquer botão** confirma e o painel mostra "ouviu". Segurar o vermelho continua sendo emergência (e também confirma). Com mensagem tocando, segurar o preto só confirma: não pede carro sem querer. |
| **GPS** | Manda a posição a cada 2 min se andou mais de 50 m, ou a cada 10 min parada. |
| **Sem internet** | A emergência tenta de novo a cada 10 s até sair. O pedido de Uber não fica guardado (chegaria atrasado): a pochete toca o som de "sem internet" e a pessoa aperta de novo. |
| **Travou?** | O cão de guarda reinicia a pochete depois de 30 s parada. |

É o mesmo caminho do botão **"Testar sem a pochete"** do painel: `POST /api/pochete/evento` e `POST /api/pochetes/:id/simular` chamam a mesma função do servidor (`tratarEvento`). A diferença é só a identificação: a pochete usa a chave dela (`X-Pochete-Key`), o painel usa o login do cuidador. Por isso a pochete **não** usa o botão "Chamar Uber" do painel (`POST /api/corridas`), que exige login.

Os botões e o buzzer rodam numa tarefa separada do ESP32: a contagem dos 3 s e os sons continuam enquanto a pochete espera o servidor.

Não há comando de voz: foi retirado do projeto.

### Sons

| Som | Quando |
|---|---|
| Bipe grave (1000 Hz) / agudo (2500 Hz) | Cada segundo segurando o vermelho / o preto |
| Três bipes graves, o último longo | Emergência disparada |
| Dois bipes agudos | Pedido de Uber disparado |
| Duas notas subindo | Deu certo (o servidor recebeu, mensagem confirmada, pochete ligou) |
| Duas notas descendo | O servidor recusou (veja o motivo no Monitor Serial) ou o cuidador recusou o carro |
| Três notas descendo | Sem internet |
| Duas notas médias / três subindo | Carro chamado / motorista a caminho |
| Três notas subindo, rápidas | Mensagem do cuidador |

## Peças e ligações (ESP32 DevKit V1)

| Peça | Pino da peça | ESP32 |
|---|---|---|
| GPS NEO-6M (ou similar, 9600 baud) | TX | GPIO **16** |
| | RX | GPIO **17** |
| | VCC / GND | 3V3 / GND |
| Botão vermelho (emergência) | um lado / outro lado | **D22** / GND |
| Botão preto (Uber) | um lado / outro lado | **D18** / GND |
| Buzzer | + / − | **D23** / GND |

Os botões não precisam de resistor: o código liga o pull-up interno. Para mudar um pino, troque o `#define` no topo do `pochete.ino`.

## Preparar a Arduino IDE

1. Placa: em **Preferências**, adicione `https://espressif.github.io/arduino-esp32/package_esp32_index.json`; em **Gerenciador de Placas**, instale **esp32** (Espressif). Compila sem avisos com a versão **3.3.11**. Placa: **ESP32 Dev Module**.
2. Bibliotecas, pelo **Gerenciador de Bibliotecas**: **TinyGPSPlus** (Mikal Hart) e **ArduinoJson** (Benoit Blanchon, versão 7).
3. Copie `config.example.h` para `config.h` e preencha:
   - o nome e a senha do Wi-Fi (até 3 redes, tentadas em ordem: casa, celular roteando...);
   - `POCHETE_CHAVE`: no site, entre no **Painel → Pochete e avisos → Vincular uma pochete**. A chave `elo_…` aparece **uma vez**; se perder, use "Nova chave" (a antiga para de funcionar).
4. Compile e grave. Abra o Monitor Serial em **115200** para acompanhar (com `DEPURAR 1`): cada aperto, cada pedido ao servidor e a resposta dele aparecem ali.

O programa usa cerca de 83% da memória de programa no esquema padrão. Se um dia faltar espaço, escolha **Partition Scheme → Huge APP**.

## Testar

1. Ligue a pochete com o Monitor Serial aberto: ela toca duas notas e mostra "Procurando Wi-Fi e satélites".
2. Aperte rápido um botão: aparece "solto antes de 3 s" e nada é enviado.
3. Segure o vermelho 3 s: no painel aparece a emergência, e o Telegram do cuidador recebe o aviso.
4. Segure o preto 3 s: no painel aparece o pedido de transporte com Aprovar / Recusar. Aprove e a pochete toca "carro chamado".
5. Mande uma mensagem pelo painel: em até 15 s a pochete toca. Dê um toque curto num botão e o painel mostra "ouviu".

Se o servidor recusar algo, o motivo aparece no Monitor Serial (por exemplo: chave inválida, sem endereço de casa, já existe uma corrida).

## Segurança

- A conversa com o servidor é **https com o certificado conferido** (`certificados.h`: Google Trust Services, que atende os domínios `*.vercel.app`, e Let's Encrypt, para domínio próprio). Ninguém num Wi-Fi público consegue se passar pelo servidor nem ler a chave.
- As raízes vencem a partir de 2035. Se o servidor mudar de provedor, troque o arquivo pelas raízes novas.
- A chave fica só no `config.h` (fora do git). Se uma pochete for perdida, gere "Nova chave" no painel: a antiga para na hora.

## Próximos passos para finalizar

- **Rede celular:** hoje a pochete usa Wi-Fi. Para funcionar na rua sem celular por perto, troque a parte de rede (função `pedir()`) por um módulo 4G com TLS 1.2, como o SIM7600 ou o A7670, usando a biblioteca TinyGSM. O SIM800L da lista de componentes não serve para o servidor da Vercel: ele não fala TLS 1.2.
- **Bateria:** a montagem atual não mede a bateria, então o painel não mostra a porcentagem. Com um divisor de tensão (100 kΩ + 100 kΩ) num pino analógico, dá para ler a tensão e mandar o evento `bateria` (`{ tipo: "bateria", bateria: 0-100 }`).
- **Voz:** o servidor já manda o número do áudio de cada mensagem pronta (`audio`, de 1 a 5, na ordem de `RECADOS_PRONTOS` em `backend/server.js`). Com um módulo de som (DFPlayer Mini e cartão SD), a pochete pode falar a mensagem em vez de só apitar.
- **Economia de bateria:** com 2000 mAh, o consumo do Wi-Fi ligado direto não chega às 48 h prometidas. O caminho é o *light sleep* do ESP32 entre as consultas, acordando pelos botões.
