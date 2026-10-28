<div align="center">

[English](README_en.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](../../README.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · **Português (Brasil)** · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md)

</div>

# Opus

App Android sob medida para ouvir sua música a partir de um servidor [Navidrome](https://www.navidrome.org/) (API Subsonic).
Tema escuro com cor ajustável, animações GSAP, letras sincronizadas, modo offline e controle do deemix pelo app.
Empacotado como APK com [Capacitor](https://capacitorjs.com/), com layout adaptado ao Galaxy Z Fold (dobrado / aberto).

## Novidades da v6
- **Player nativo do Android (ExoPlayer/Media3), como o Subtracks**: a fila é tocada por um serviço do Android, e não mais pela página web. A música passa de faixa em faixa com a tela apagada ou o app em segundo plano, e a notificação (play/pause/anterior/próxima) controla o player de verdade.
- Limitações do modo nativo: sem equalizador nem crossfade (substituídos pela reprodução sem pausas do player nativo).

## Novidades da v4
- Uma faixa não começa mais pela metade: a posição antiga de retomada só é aplicada à faixa a que pertence.
- Reprodução em segundo plano reforçada (bloqueio de CPU/Wi-Fi durante a reprodução, passagem para a próxima faixa monitorada). Configurações › Reprodução em segundo plano: botão para remover a restrição de bateria.
- Offline: ordenação de artistas, álbuns e playlists (A→Z, recentes, mais faixas, mais pesados) e menu ⋯ › "Baixar todas as minhas playlists".
- O APK é compilado automaticamente pelo GitHub Actions a cada atualização (aba Releases).

## Baixar o APK

➡️ **[Baixar o Opus v6 (`opus.apk`)](https://github.com/apk-fold/opus/raw/main/opus.apk)**, 4,6 MB. O arquivo também aparece
na lista de arquivos do repositório.

Soma SHA-256 para verificar o arquivo: `63dc6c04ec14fc8d3ec5ed4c77b54b1d70bf6199b5b57f6256a27404fc1c16af`

Instalação no Android:
1. Baixe `opus.apk` diretamente no celular.
2. Abra o arquivo. O Android pede para permitir a instalação a partir desta fonte (navegador ou gerenciador de arquivos): aceite.
3. Toque em **Instalar**.

Observações:
- É um APK de **debug** (assinado com a chave de depuração do Android Studio). Se você já tem uma versão do Opus assinada de outro jeito,
  desinstale-a primeiro.
- No Android 13+, permita as notificações do Opus (controles de mídia na tela de bloqueio) e coloque a bateria do app em
  "Sem restrições" para que a reprodução continue com a tela apagada.
- O celular precisa conseguir acessar o seu servidor Navidrome (por exemplo via Tailscale).

## Principais recursos

### Novidades da v3
- **Gestos estilo iPhone** (Configurações › Gestos e atalhos): puxar para baixo no topo de uma página abre o menu ⋯ dela, deslizar
  para baixo no player abre o menu da faixa, para cima a fila, toque duplo na capa = curtir,
  toque longo numa faixa, álbum, playlist ou artista = o menu dele, deslizar uma faixa para a direita = tocar a seguir, para a esquerda =
  adicionar à fila. Tudo é configurável.
- **Temas**: escuro, AMOLED (preto puro) e claro.
- **Fold aberto**: biblioteca à esquerda, player fixo à direita com a letra (ou a fila) embaixo. Dobrado, o app
  volta ao normal.
- **Pastas de playlists**: organização local no celular (o Navidrome não tem pastas).
- **Importação de playlists do Spotify, YouTube e YouTube Music** por link, sem chave de API: as faixas são encontradas na
  biblioteca, as que faltam podem ir para o deemix, e a playlist pode ser recriada no Navidrome.
- **Detecção de duplicatas**: a mesma faixa em várias cópias ou qualidades, a melhor qualidade primeiro.
- **deemix caso a caso**: qualidade (FLAC, 320, 128) e playlist de destino escolhidas a cada download.
- **Android**: atalhos no ícone do app (Flow, Offline, Busca) e widget da tela inicial.

### Escuta e descoberta
- **Flow** (mix infinito com base no seu gosto, com humores), **Mix do dia**, **rádios** a partir de uma faixa ou de um artista.
- **Pérolas esquecidas**, **Neste dia**, **Novidades dos seus artistas**, **Teste cego**, **Histórico**, **Replay**.
- Letras sincronizadas e tocáveis, fila, timer para dormir, equalizador, ReplayGain, crossfade, modo carro.
- Modo offline por abas (Faixas, Artistas, Álbuns, Playlists).
- Mais de 40 recursos que podem ser ligados ou desligados em Configurações › Recursos.

## Configuração

Na primeira abertura, informe o endereço do seu servidor Navidrome (por exemplo `http://mon-serveur:4533`), seu usuário e
sua senha. A cor do tema é alterada em Configurações › Aparência.

### deemix (opcional)
O Opus pode controlar um pequeno serviço instalado no seu servidor (pasta `server/`, veja `server/README-serveur.md`) para
baixar faixas do Deezer na pasta de músicas do Navidrome. O ARL do Deezer é informado no app.
Atenção: esse uso vai contra os termos de uso do Deezer.

## Compilar você mesmo (Windows)

Pré-requisitos: Node.js 20+, Android Studio com o SDK do Android, e **JDK 21** (o Gradle 8.14 ainda não lê classes
compiladas pelo Java 27 ou superior).

```
npm install
npm run android:add     # cria a pasta android/ e aplica as correções
npm run sync            # build web + sincronização do Capacitor
cd android
gradlew.bat assembleDebug
```

O APK é gerado em `android/app/build/outputs/apk/debug/app-debug.apk`.

Se o Gradle usar o Java errado, defina `JAVA_HOME` para o JDK 21 antes de compilar:

```
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.12.1
set PATH=%JAVA_HOME%\bin;%PATH%
```

Para testar sem servidor: `npm run mock` (Navidrome falso, credenciais `test` / `test`) e depois `npm run dev`.

## Limitações conhecidas
- A importação do Spotify / YouTube lê as páginas públicas desses sites, cujo formato muda com frequência. Se falhar, colar
  uma lista "Artista - Título" sempre funciona. Sem conta, só as 100 primeiras faixas são lidas.
- O modo Fold, o widget e os gestos foram verificados por simulação, ainda não em todos os aparelhos.
- O visualizador é decorativo.
- O equalizador exige que o seu servidor permita CORS nos fluxos de áudio (`Access-Control-Allow-Origin`).
