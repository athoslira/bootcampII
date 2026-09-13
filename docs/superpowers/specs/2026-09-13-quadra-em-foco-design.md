# Quadra em Foco — Especificação de Design

## Objetivo

Construir uma aplicação web estática e responsiva para consultar jogadores de basquete pelo nome. Ela deverá usar dados públicos, apresentar o perfil do atleta de modo claro e funcionar no GitHub Pages sem chave de API.

## Usuário e fluxo principal

1. A pessoa digita o nome de um jogador, por exemplo, `LeBron James`.
2. Ao clicar em **Buscar atleta** ou pressionar Enter, a interface mostra um estado de carregamento.
3. O navegador consulta a API TheSportsDB.
4. A aplicação exibe o primeiro perfil de basquete compatível, ou uma mensagem amigável se não houver resultado.

## Dados e integração

- API: [TheSportsDB](https://www.thesportsdb.com/documentation)
- Endpoint: `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p={nome}`
- Campos exibidos: foto, nome, posição, time, nacionalidade, data de nascimento e altura.
- A resposta será filtrada por `strSport === "Basketball"` quando houver mais de um resultado com o mesmo nome.

## Interface

- Fundo azul-marinho quase preto, com iluminação sutil em laranja, inspirado em uma quadra iluminada.
- Cabeçalho compacto com o nome **Quadra em Foco** e uma breve descrição.
- Busca em destaque, com campo acessível e botão laranja.
- Cartão de atleta responsivo: foto à esquerda (ou no topo em telas pequenas) e dados organizados à direita.
- Estados visuais distintos para carregamento, campo vazio, atleta não encontrado e indisponibilidade da API.

## Estrutura

- `index.html`: estrutura semântica, formulário e área dinâmica de resultado.
- `style.css`: tokens de cor, responsividade, foco de teclado e estilos dos estados.
- `script.js`: chamadas assíncronas, normalização dos dados recebidos e renderização segura.
- `tests/script.test.js`: testes de unidade com o executor nativo do Node para a seleção e normalização de jogadores.
- `README.md`: descrição, API, funcionalidades, execução local e campos para os futuros links do GitHub e GitHub Pages.

## Erros e acessibilidade

- O formulário terá `label` visível, suporte à tecla Enter e foco perceptível.
- A região de resultados usará `aria-live="polite"` para anunciar carregamento e erros.
- Dados ausentes serão apresentados como `Não informado`, sem quebrar o cartão.
- A API fora do ar e resultados inexistentes receberão mensagens específicas e acionáveis.

## Testes e validação

- Testar que a seleção prioriza perfis de basquete.
- Testar a normalização de campos ausentes e a preservação das informações válidas.
- Testar a busca de um atleta real no navegador, uma busca inexistente e o estado de falha de rede.
- Confirmar que os caminhos relativos permitem a publicação direta no GitHub Pages.

## Fora de escopo

- Autenticação, banco de dados, favoritos persistentes, comparação entre atletas e chaves privadas.
