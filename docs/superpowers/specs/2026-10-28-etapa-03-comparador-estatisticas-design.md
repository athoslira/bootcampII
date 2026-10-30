# Etapa 03 — Comparador de Estatísticas: Design

## Contexto

Quadra em Foco já permite pesquisar mais de mil atletas da NBA e manter favoritos persistentes no Supabase. A Etapa 03 evolui a aplicação com um comparador de dois atletas, estatísticas reais da temporada 2025–26, testes em GitHub Actions e entrega por Pull Request.

A atividade será realizada individualmente por autorização informada pelo aluno. O projeto não inventará integrantes, revisões, aprovações ou conflitos. O README registrará essa condição e apresentará somente evidências reais.

## Objetivo

Permitir que uma pessoa selecione dois atletas encontrados pela busca e compare lado a lado suas médias de pontos, rebotes, assistências, roubos, bloqueios, minutos e aproveitamentos de arremessos na temporada regular 2025–26.

## Fontes de dados

### Elenco e perfis

O JSON já utilizado permanece responsável por nome, foto, equipe, posição, altura, peso e formação:

`https://raw.githubusercontent.com/A-V29/NBA.Rosters/main/2025-26.NBA.Roster.json`

### Estatísticas

O comparador consumirá o CSV público:

`https://raw.githubusercontent.com/EasySportsApps/nba_api_25_26_data/refs/heads/main/nba_players_regular_season_25_26_wide_data.csv`

O conjunto foi gerado a partir da API oficial de estatísticas da NBA. Cada linha representa um atleta na temporada regular 2025–26 e contém minutos, vitórias, derrotas, cestas, rebotes, assistências, roubos e bloqueios.

## Cálculos

O total de jogos será `wins + losses`. As médias serão calculadas apenas quando o total de jogos for maior que zero:

- Pontos por jogo: `(one_point_made + 2 * two_point_made + 3 * three_point_made) / games`.
- Rebotes por jogo: `(offensive_rebounds + defensive_rebounds) / games`.
- Assistências por jogo: `assists / games`.
- Roubos por jogo: `steals / games`.
- Bloqueios por jogo: `blocks / games`.
- Minutos por jogo: `minutes_played / games`.
- Aproveitamento de quadra: `(two_point_made + three_point_made) / (two_point_attempted + three_point_attempted) * 100`.
- Aproveitamento de três: `three_point_made / three_point_attempted * 100`.

Divisões cujo denominador seja zero produzirão `null`, exibido como “—”. Valores médios terão uma casa decimal; percentuais serão exibidos com o sufixo `%`.

## Correspondência de atletas

Os nomes das duas fontes serão normalizados com remoção de acentos, pontuação, espaços extras e diferenças de maiúsculas. A correspondência principal será feita pelo nome normalizado. Quando houver mais de uma linha para o mesmo atleta, os totais serão agregados antes do cálculo das médias.

Um atleta encontrado no elenco, mas ausente do CSV, continuará selecionável. O comparador mostrará “Sem dados na temporada” e não transformará ausência em zero.

## Arquitetura

### `stats.js`

Responsável por analisar o CSV, normalizar nomes, agregar linhas e calcular as médias. Não acessa o DOM. Exportará funções puras testáveis para parsing, normalização, cálculo e criação de índice por nome.

### `comparison.js`

Responsável pelo estado do duelo e pela apresentação independente do acesso à rede. Exportará funções puras que determinam o líder de cada indicador, formatam valores e produzem o HTML seguro do comparador.

### `script.js`

Continuará coordenando carregamento, busca e favoritos. Passará a carregar as estatísticas sob demanda na primeira seleção, manter os dois slots do duelo e atualizar a seção comparativa.

### `index.html` e `style.css`

Receberão a seção “Duelo de atletas”, os controles de seleção/remoção e o layout responsivo. A estrutura existente será preservada; não haverá framework ou dependência de interface.

## Interface

Cada resultado de busca terá a ação “Adicionar ao duelo”. O primeiro clique ocupa o slot A e o segundo ocupa o slot B. Com dois atletas selecionados, a comparação é exibida automaticamente. Selecionar um terceiro atleta quando os dois slots estiverem ocupados exibirá orientação para remover ou trocar um atleta, sem substituir silenciosamente uma escolha.

O comparador terá:

- Atleta A à esquerda e atleta B à direita.
- Foto, nome, equipe e posição no cabeçalho.
- Linhas centrais de pontos, rebotes, assistências, roubos, bloqueios, minutos, aproveitamento de quadra e de três.
- Barras proporcionais discretas e destaque laranja no maior valor de cada linha.
- Empates sem destaque de vencedor.
- Botão “Remover do duelo” em cada slot.
- Mensagens de carregamento, falha da fonte e ausência de estatísticas.

O visual continuará escuro, esportivo e editorial. A assinatura será uma faixa central inspirada no placar de uma transmissão de basquete. Não serão usados gradientes decorativos, cards flutuantes ou gráficos de radar.

No celular, os perfis permanecem em duas colunas compactas e cada estatística ocupa uma linha legível. Foco por teclado, regiões `aria-live` e `prefers-reduced-motion` serão preservados.

## Erros e estados

- A falha do CSV não interrompe busca ou favoritos; somente o comparador mostra a indisponibilidade.
- Durante o carregamento, os controles de seleção ficam desabilitados para evitar requisições duplicadas.
- O CSV será armazenado em memória depois do primeiro carregamento.
- Conteúdo vindo das duas fontes será escapado antes de entrar no HTML.
- Um clique repetido no mesmo atleta não duplicará a seleção.

## Testes

O test runner nativo do Node.js continuará sendo usado. A suíte acrescentará casos para:

- Parsing de CSV com cabeçalho e valores numéricos.
- Normalização equivalente de nomes com pontuação e acentos.
- Cálculo de jogos, pontos, rebotes, assistências, roubos, bloqueios, minutos e percentuais.
- Divisões por zero e atleta sem estatísticas.
- Agregação de múltiplas linhas do mesmo atleta.
- Líder, empate e valor ausente em cada indicador.
- Escape do HTML produzido pelo comparador.
- Prevenção de atleta duplicado nos slots.

## Fluxo GitHub e CI

O trabalho será realizado na branch `feature/comparador-estatisticas` e integrado por Pull Request. O workflow `.github/workflows/ci.yml` executará `npm install` e `npm test` com Node.js 20 em pushes para `main` e em Pull Requests.

Para produzir a evidência exigida, a PR receberá primeiro um teste controladamente incompatível com o resultado correto. O GitHub Actions deverá falhar e bloquear a integração; essa tela será capturada em `evidencias/etapa-03-ci-bloqueado.png`. Em seguida, o teste será corrigido, o mesmo workflow deverá ficar verde e somente então a PR poderá ser integrada.

A proteção da `main` exigirá Pull Request e o check de testes. Como a entrega é individual, não será configurada aprovação de colega nem será declarada uma aprovação inexistente.

## Entrega

Após o merge serão verificados:

- `npm test` sem falhas.
- GitHub Actions verde na PR e na `main`.
- Comparador funcional no GitHub Pages.
- Nova imagem Docker pública com tag `2.0` e `latest`.
- README com autor, matrícula, responsabilidade, PR principal, fontes, banco, testes, Docker, execução local, evidência do CI e nota transparente sobre a realização individual.

