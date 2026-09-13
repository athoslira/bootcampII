# Quadra em Foco

## Autor

Seu nome completo — Matrícula 0000000

## Descrição

Quadra em Foco é uma aplicação web para pesquisar jogadores de basquete pelo nome e consultar seus dados em um único cartão. É útil para quem quer conhecer rapidamente informações de atletas sem precisar procurar em várias páginas.

## API utilizada

- [TheSportsDB](https://www.thesportsdb.com/documentation) — API pública de dados esportivos.
- Endpoint consumido: `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p={nome-do-jogador}`

## Funcionalidades

- Busca atletas pelo nome completo.
- Exibe foto, nome, posição, time, nacionalidade, data de nascimento e altura.
- Prioriza perfis de jogadores ligados ao basquete.
- Mostra mensagens amigáveis durante o carregamento, quando não há resultado e quando a API está indisponível.
- Adapta o layout para telas de computador e celular.

## Como executar localmente

1. Clone o repositório:

   ```bash
   git clone https://github.com/SEU-USUARIO/quadra-em-foco.git
   ```

2. Entre na pasta criada:

   ```bash
   cd quadra-em-foco
   ```

3. Abra o arquivo `index.html` no navegador ou use a extensão Live Server no VS Code.

4. Opcionalmente, rode os testes da lógica:

   ```bash
   npm test
   ```

## Links

- **Aplicação no ar (GitHub Pages):** https://SEU-USUARIO.github.io/quadra-em-foco/
- **Repositório:** https://github.com/SEU-USUARIO/quadra-em-foco

> Antes de entregar, substitua `SEU-USUARIO`, seu nome e sua matrícula pelos dados reais. Depois de ativar o GitHub Pages, teste os dois links em uma aba anônima.

