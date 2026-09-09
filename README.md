# GC Creator

Crie lower thirds (GCs), personalize texto, imagens e formas e exiba tudo no OBS com fundo transparente.

## O que você precisa

- OBS Studio instalado.
- Os arquivos deste projeto mantidos juntos na mesma pasta.
- Um navegador com acesso à internet caso o GC use fontes do Google Fonts.

## Colocando o GC no OBS

### 1. Crie o visual

1. Abra o arquivo `index.html` no navegador.
2. Monte o GC no editor e clique em **Gerar .gc**.
3. Guarde o arquivo `.gc` gerado. Ele é o pacote visual que será usado na transmissão.

### 2. Adicione a tela de exibição

1. No OBS, abra a cena em que o GC deve aparecer.
2. Em **Fontes**, clique em **+** e selecione **Fonte de navegador**.
3. Dê um nome como `GC - Exibição` e confirme.
4. Marque **Arquivo local** e escolha o arquivo `exibicao.html` desta pasta.
5. Defina **Largura** como `1920` e **Altura** como `1080`.
6. Deixe a fonte acima das câmeras, vídeos e demais itens que devem ficar atrás do GC.
7. Clique em **OK**. A fonte ficará transparente enquanto nenhum GC estiver ativo.

## Abrindo o painel de controle

O arquivo `painel.html` é onde você escolhe o pacote, digita nome e descrição e manda o GC entrar ou sair da tela.

No OBS, abra-o em um **Dock de navegador personalizado**:

1. Acesse **Exibir → Docks → Docks de navegador personalizados**.
2. Clique em **Adicionar novo dock**.
3. Use um nome como `Controle de GC`.
4. No campo de URL, informe o caminho local do painel no formato `file:///`, por exemplo:

   ```text
   file:///C:/GC-Creator/painel.html
   ```


5. Confirme. O painel aparecerá como uma aba lateral dentro do OBS.

> Mantenha `painel.html` e `exibicao.html` na mesma pasta. Eles se comunicam para enviar o conteúdo à fonte de navegador.

## Exibindo durante a transmissão

1. No painel, clique em **Configurações**.
2. Em **Gerenciar Pacotes .gc**, escolha **Importar .gc** e selecione o arquivo gerado pelo editor.
3. Feche as configurações e escolha o GC em **GC Ativo**.
4. Preencha **Nome** e **Descrição**.
5. Ative a chave em **Transmissão**. O GC deve aparecer imediatamente na fonte de navegador da cena.
6. Desative a chave para escondê-lo.

Em **Tempo em Tela**, use `0` para controlar manualmente a saída. Qualquer outro valor faz o GC desaparecer automaticamente depois do tempo escolhido, em milissegundos.

## Se não aparecer

- Confira se a fonte `GC - Exibição` está visível na cena e acima das demais fontes.
- Confirme que a fonte aponta para `exibicao.html`, não para `painel.html`.
- Importe o pacote `.gc` no painel e selecione-o em **GC Ativo** antes de ativar a transmissão.
- Atualize a fonte de navegador no OBS ou feche e abra o dock do painel depois de mover a pasta do projeto.
- Mantenha os arquivos do projeto juntos; mover apenas um dos HTMLs pode impedir a comunicação entre painel e exibição.

## Apoie o projeto

Pague uma coxinha pro dev | pix: victorgabrielferreirapinto@gmail.com
