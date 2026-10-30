# Etapa 03 — Comparador de Estatísticas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao Quadra em Foco um duelo entre dois atletas com médias reais da temporada 2025–26, integrar CI obrigatório em Pull Request e publicar a versão 2.0 no Pages e no Docker Hub.

**Architecture:** `stats.js` transforma o CSV externo em um índice de médias por nome normalizado; `comparison.js` mantém o estado dos dois slots e gera a apresentação segura. `script.js` coordena rede e DOM, preservando busca e favoritos. Funções puras ficam isoladas para testes com `node:test`.

**Tech Stack:** HTML5, CSS3, JavaScript ES Modules, Node.js 20 `node:test`, Supabase, GitHub Actions, GitHub Pages, nginx e Docker.

## Global Constraints

- Manter o projeto sem framework e sem dependências de produção.
- Consumir o elenco 2025–26 já usado e o CSV 2025–26 definido na especificação.
- Calcular médias a partir de totais; não representar dado ausente como zero.
- Escapar todo conteúdo remoto inserido em HTML.
- Preservar busca, favoritos no Supabase, responsividade, teclado e `aria-live`.
- Trabalhar somente na branch `feature/comparador-estatisticas` até o merge por Pull Request.
- Registrar apenas evidências reais; não inventar integrantes, aprovações ou conflitos.

---

### Task 1: Domínio de estatísticas da temporada

**Files:**
- Create: `stats.js`
- Create: `tests/stats.test.js`

**Interfaces:**
- Produces: `normalizeStatsName(value: unknown): string`
- Produces: `parseStatsCsv(csv: string): Array<Record<string, string | number>>`
- Produces: `calculatePlayerStats(rows: Array<object>): PlayerStats | null`
- Produces: `createStatsIndex(rows: Array<object>): Map<string, PlayerStats>`
- `PlayerStats`: `{ games, ppg, rpg, apg, spg, bpg, mpg, fgPct, threePct }`, com métricas indisponíveis como `null`.

- [ ] **Step 1: Escrever testes falhando para nome, CSV e cálculos**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePlayerStats,
  createStatsIndex,
  normalizeStatsName,
  parseStatsCsv,
} from '../stats.js';

test('normalizeStatsName remove pontuação, acento e espaços extras', () => {
  assert.equal(normalizeStatsName("  D'Angelo   Russell  "), 'd angelo russell');
  assert.equal(normalizeStatsName('Nikola Jokić'), 'nikola jokic');
});

test('parseStatsCsv respeita vírgula dentro de campo entre aspas', () => {
  const [row] = parseStatsCsv('player_name,team,wins,losses\n"Smith, Jr.",BOS,2,1');
  assert.equal(row.player_name, 'Smith, Jr.');
  assert.equal(row.wins, 2);
});

test('calculatePlayerStats produz médias e percentuais', () => {
  const stats = calculatePlayerStats([{
    wins: 2, losses: 2, minutes_played: 120,
    one_point_made: 8, two_point_made: 20, two_point_attempted: 40,
    three_point_made: 4, three_point_attempted: 10,
    offensive_rebounds: 4, defensive_rebounds: 16,
    assists: 12, steals: 4, blocks: 2,
  }]);
  assert.deepEqual(stats, {
    games: 4, ppg: 15, rpg: 5, apg: 3, spg: 1, bpg: 0.5,
    mpg: 30, fgPct: 48, threePct: 40,
  });
});

test('calculatePlayerStats retorna null sem jogos e preserva divisão impossível', () => {
  assert.equal(calculatePlayerStats([{ wins: 0, losses: 0 }]), null);
});

test('createStatsIndex agrega linhas com o mesmo nome', () => {
  const index = createStatsIndex([
    { player_name: 'A.J. Lawson', wins: 1, losses: 0, one_point_made: 2 },
    { player_name: 'AJ Lawson', wins: 1, losses: 0, one_point_made: 4 },
  ]);
  assert.equal(index.size, 1);
  assert.equal(index.get('aj lawson').games, 2);
  assert.equal(index.get('aj lawson').ppg, 3);
});
```

- [ ] **Step 2: Executar o teste e confirmar falha por módulo ausente**

Run: `node --test tests/stats.test.js`

Expected: FAIL com `ERR_MODULE_NOT_FOUND` para `stats.js`.

- [ ] **Step 3: Implementar parsing, normalização, agregação e médias**

Implementar `parseCsvLine` como máquina de estados para aspas duplas; converter as colunas numéricas do CSV com `Number`. Em `normalizeStatsName`, aplicar NFD, remover diacríticos e pontuação, tratar `A.J.` e `AJ` como `aj`, e reduzir espaços. Em `createStatsIndex`, agrupar por nome normalizado, somar campos de totais e chamar `calculatePlayerStats` uma vez por grupo.

O aproveitamento de quadra deve considerar cestas de dois e três pontos. `safeRate(numerator, denominator)` retorna `null` quando `denominator <= 0`.

- [ ] **Step 4: Executar teste focado e suíte completa**

Run: `node --test tests/stats.test.js && npm test`

Expected: todos os testes PASS.

- [ ] **Step 5: Commitar o domínio de estatísticas**

```bash
git add stats.js tests/stats.test.js
git commit -m "Adiciona calculo de estatisticas da temporada"
```

---

### Task 2: Estado e apresentação segura do duelo

**Files:**
- Create: `comparison.js`
- Create: `tests/comparison.test.js`

**Interfaces:**
- Consumes: `normalizeStatsName` de `stats.js`; `escapeHtml` e `playerKey` de `favorites.js`.
- Produces: `addPlayerToComparison(slots: Array, player: object): { slots, reason }`
- Produces: `removePlayerFromComparison(slots: Array, slotIndex: number): Array`
- Produces: `comparisonLeader(left: PlayerStats | null, right: PlayerStats | null, key: string): 'left' | 'right' | 'tie' | null`
- Produces: `formatStat(value: number | null, kind?: 'decimal' | 'percent' | 'integer'): string`
- Produces: `comparisonMarkup(slots: Array, statsIndex: Map): string`

- [ ] **Step 1: Escrever testes falhando para slots, líderes e HTML**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPlayerToComparison,
  comparisonLeader,
  comparisonMarkup,
  formatStat,
  removePlayerFromComparison,
} from '../comparison.js';

const left = { name: 'Nikola Jokić', team: 'Denver Nuggets', position: 'C', image: '' };
const right = { name: 'Luka Dončić', team: 'Los Angeles Lakers', position: 'G', image: '' };

test('addPlayerToComparison preenche slots sem duplicar ou substituir', () => {
  const first = addPlayerToComparison([null, null], left);
  const second = addPlayerToComparison(first.slots, right);
  assert.deepEqual(second.slots, [left, right]);
  assert.equal(addPlayerToComparison(second.slots, left).reason, 'duplicate');
  assert.equal(addPlayerToComparison(second.slots, { name: 'A', team: 'B' }).reason, 'full');
});

test('removePlayerFromComparison limpa somente o slot solicitado', () => {
  assert.deepEqual(removePlayerFromComparison([left, right], 0), [null, right]);
});

test('comparisonLeader identifica líder, empate e ausência', () => {
  assert.equal(comparisonLeader({ ppg: 20 }, { ppg: 10 }, 'ppg'), 'left');
  assert.equal(comparisonLeader({ ppg: 10 }, { ppg: 10 }, 'ppg'), 'tie');
  assert.equal(comparisonLeader(null, { ppg: 10 }, 'ppg'), null);
});

test('formatStat aplica decimal, percentual e traço para ausência', () => {
  assert.equal(formatStat(12.34), '12,3');
  assert.equal(formatStat(48, 'percent'), '48,0%');
  assert.equal(formatStat(null), '—');
});

test('comparisonMarkup escapa dados remotos e exibe estatísticas', () => {
  const stats = new Map([
    ['nikola jokic', { games: 4, ppg: 20, rpg: 10, apg: 8, spg: 1, bpg: 1, mpg: 30, fgPct: 60, threePct: 40 }],
    ['luka doncic', { games: 4, ppg: 25, rpg: 8, apg: 9, spg: 1, bpg: 0.5, mpg: 34, fgPct: 55, threePct: 38 }],
  ]);
  const html = comparisonMarkup([{ ...left, name: '<img onerror=alert(1)>' }, right], stats);
  assert.match(html, /Pontos\/jogo/);
  assert.match(html, /data-remove-comparison="0"/);
  assert.doesNotMatch(html, /<img onerror/);
});
```

- [ ] **Step 2: Executar e confirmar falha por módulo ausente**

Run: `node --test tests/comparison.test.js`

Expected: FAIL com `ERR_MODULE_NOT_FOUND` para `comparison.js`.

- [ ] **Step 3: Implementar estado e marcação do comparador**

Usar uma constante de métricas com chaves `ppg`, `rpg`, `apg`, `spg`, `bpg`, `mpg`, `fgPct` e `threePct`. O HTML deve renderizar dois perfis, as oito linhas, classes `is-leading` somente para vencedor numérico e `data-remove-comparison` para cada slot ocupado. Atleta sem índice recebe o texto “Sem dados na temporada”.

- [ ] **Step 4: Executar teste focado e suíte completa**

Run: `node --test tests/comparison.test.js && npm test`

Expected: todos os testes PASS.

- [ ] **Step 5: Commitar o comparador puro**

```bash
git add comparison.js tests/comparison.test.js
git commit -m "Cria dominio do duelo entre atletas"
```

---

### Task 3: Integrar seleção e carregamento sob demanda

**Files:**
- Modify: `script.js`
- Modify: `tests/script.test.js`

**Interfaces:**
- Consumes: `addPlayerToComparison`, `removePlayerFromComparison`, `comparisonMarkup`.
- Consumes: `parseStatsCsv`, `createStatsIndex`.
- Produces no novo acesso externo; mantém `playerCardMarkup(player, savedKeys, selectedKeys)` testável.

- [ ] **Step 1: Atualizar teste do cartão para exigir ação de duelo**

Adicionar aos testes de `playerCardMarkup`:

```js
test('playerCardMarkup oferece seleção para o duelo', () => {
  const html = playerCardMarkup({
    name: 'Evan Mobley', team: 'Cleveland Cavaliers', position: 'FC',
    height: "6'11\"", image: '',
  });
  assert.match(html, /data-add-comparison="evan-mobley--cleveland-cavaliers"/);
  assert.match(html, />Adicionar ao duelo</);
});

test('playerCardMarkup marca atleta que já está no duelo', () => {
  const html = playerCardMarkup({
    name: 'Evan Mobley', team: 'Cleveland Cavaliers', position: 'FC',
    height: "6'11\"", image: '',
  }, new Set(), new Set(['evan-mobley--cleveland-cavaliers']));
  assert.match(html, /data-add-comparison=.* disabled/);
  assert.match(html, />No duelo</);
});
```

- [ ] **Step 2: Executar o teste e confirmar a ausência do novo botão**

Run: `node --test tests/script.test.js`

Expected: FAIL nas duas novas asserções.

- [ ] **Step 3: Implementar a integração em `script.js`**

Adicionar `STATS_URL` e um `statsPromise` que faz `fetch`, valida `response.ok`, lê `response.text()`, chama `parseStatsCsv` e `createStatsIndex`. Estender `playerCardMarkup` com um grupo de ações contendo “Favoritar” e “Adicionar ao duelo”.

No `initialise`, obter `comparison`, `comparison-status` e `comparison-content`. Manter `comparisonSlots = [null, null]` e `statsIndex = new Map()`. No clique de `[data-add-comparison]`, validar o atleta visível, atualizar slots, mostrar carregamento, buscar estatísticas somente na primeira seleção e renderizar. No clique de `[data-remove-comparison]`, limpar o slot e renderizar. Falha do CSV deve atualizar apenas `comparison-status`.

- [ ] **Step 4: Executar suíte completa**

Run: `npm test`

Expected: todos os testes PASS.

- [ ] **Step 5: Commitar a integração de comportamento**

```bash
git add script.js tests/script.test.js
git commit -m "Integra selecao de atletas ao comparador"
```

---

### Task 4: Construir a faixa visual do duelo

**Files:**
- Modify: `index.html`
- Modify: `style.css`

**Interfaces:**
- `#comparison-status`: região `role="status"` e `aria-live="polite"`.
- `#comparison-content`: recebe somente a saída escapada de `comparisonMarkup`.

- [ ] **Step 1: Inserir a seção semântica depois dos resultados**

Adicionar ao `index.html`, antes de favoritos:

```html
<section id="comparison" class="comparison-area" aria-labelledby="comparison-title">
  <div class="section-heading">
    <div>
      <p class="kicker">Frente a frente</p>
      <h2 id="comparison-title">Duelo de atletas</h2>
    </div>
    <span>Temporada regular 2025–26</span>
  </div>
  <p id="comparison-status" class="status" role="status" aria-live="polite">
    Adicione dois atletas encontrados pela busca.
  </p>
  <div id="comparison-content" class="comparison-board"></div>
</section>
```

- [ ] **Step 2: Criar tokens e layout do placar editorial**

Manter a paleta existente e adicionar `--scoreboard:#161615`, `--scoreboard-ink:#f1efe8` e `--winner:#d95532`. Estilizar `.comparison-shell` com cabeçalho em duas colunas, faixa central de métricas, `.comparison-metric`, `.metric-bar`, `.is-leading` e botões secundários. Evitar sombras, gradientes e bordas arredondadas grandes.

- [ ] **Step 3: Implementar responsividade e acessibilidade de movimento**

Em até 700 px, manter os dois perfis lado a lado com fotos de 56 px e rótulos compactos; permitir quebra de nomes. Adicionar `@media (prefers-reduced-motion: reduce)` removendo transições das barras. Confirmar foco visível em todos os botões.

- [ ] **Step 4: Verificar marcação e testes**

Run: `npm test`

Run: `Select-String -Path index.html -Pattern 'comparison-status','comparison-content','aria-live'`

Expected: suíte verde e os três seletores presentes.

- [ ] **Step 5: Commitar a interface**

```bash
git add index.html style.css
git commit -m "Adiciona placar visual do comparador"
```

---

### Task 5: Validar a aplicação real e corrigir regressões

**Files:**
- Modify if required: `script.js`, `comparison.js`, `stats.js`, `style.css`
- Modify if required: corresponding files under `tests/`

- [ ] **Step 1: Iniciar servidor local**

Run: `python -m http.server 8080`

Expected: servidor disponível em `http://127.0.0.1:8080/`.

- [ ] **Step 2: Executar fluxo real no navegador**

Pesquisar “Jokic”, adicionar ao duelo; pesquisar “Doncic”, adicionar; confirmar valores, destaques, remoção e nova seleção. Recarregar e confirmar que favoritos continuam vindo do Supabase. Testar largura desktop e móvel.

- [ ] **Step 3: Inspecionar console e rede**

Expected: JSON e CSV retornam 200; não há erro JavaScript; o CSV é requisitado uma única vez.

- [ ] **Step 4: Corrigir qualquer falha com teste de regressão primeiro**

Para cada falha: adicionar um caso em `tests/stats.test.js`, `tests/comparison.test.js` ou `tests/script.test.js`; executar para observar FAIL; aplicar correção mínima; executar para observar PASS.

- [ ] **Step 5: Verificar e commitir somente se houver correção**

Run: `npm test && git diff --check`

Se houver arquivos alterados:

```bash
git add script.js comparison.js stats.js style.css tests
git commit -m "Corrige integracao do comparador"
```

---

### Task 6: Preparar CI, Docker 2.0 e documentação individual

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `Dockerfile`
- Modify: `README.md`

- [ ] **Step 1: Criar workflow Node 20**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
```

Como o projeto ainda não possui `package-lock.json`, executar `npm install --package-lock-only` e versionar o lockfile para que `npm ci` seja reproduzível.

- [ ] **Step 2: Incluir os novos módulos na imagem**

Alterar o `COPY` do Dockerfile para:

```dockerfile
COPY index.html style.css script.js favorites.js supabase.js stats.js comparison.js /usr/share/nginx/html/
```

- [ ] **Step 3: Atualizar README**

Documentar comparador, fonte do CSV, cálculos, execução, testes, workflow, realização individual autorizada, responsabilidade de Athos Lira Araújo, matrícula `22307894`, usuário `athoslira`, Docker `2.0` e `latest`, e a evidência `evidencias/etapa-03-ci-bloqueado.png`. A seção de conflitos deve dizer “Não houve conflito de merge nesta entrega individual”. A URL real da PR será adicionada na Task 7, imediatamente depois que o GitHub atribuir o número.

- [ ] **Step 4: Rodar testes e construir imagem local**

Run: `npm test`

Run: `docker build -t athoslira/bootcamp2-app:2.0 .`

Run: `docker run --rm -d --name bootcamp2-v2-check -p 8082:80 athoslira/bootcamp2-app:2.0`

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8082/`

Expected: testes verdes e HTTP 200 contendo “Duelo de atletas”. Depois executar `docker stop bootcamp2-v2-check`.

- [ ] **Step 5: Commitar infraestrutura e documentação**

```bash
git add .github/workflows/ci.yml package-lock.json Dockerfile README.md
git commit -m "Prepara CI e entrega Docker da etapa 03"
```

---

### Task 7: Abrir PR, provar bloqueio do CI e corrigir

**Files:**
- Modify: `tests/comparison.test.js`
- Create: `evidencias/etapa-03-ci-bloqueado.png`
- Modify: `README.md` para registrar a URL real retornada pelo GitHub.

- [ ] **Step 1: Publicar a branch e abrir a Pull Request**

Run: `git push -u origin feature/comparador-estatisticas`

Run: `gh pr create --base main --head feature/comparador-estatisticas --title "Adiciona comparador de estatísticas" --body "## Entrega\n- compara dois atletas com médias 2025–26\n- adiciona testes automatizados e CI\n- prepara imagem Docker 2.0\n\n## Verificação\n- npm test\n- fluxo real no navegador"`

Registrar a URL retornada na tabela do README, commitá-la com `git commit -m "Documenta PR principal da etapa 03"`, executar `git push` e aguardar o primeiro check `test` ficar verde.

- [ ] **Step 2: Proteger a `main` após o primeiro check existir**

Usar `gh api` com JSON para configurar proteção da branch: `required_status_checks.strict = true`, contexto `test`, `enforce_admins = true`, PR obrigatório com zero aprovações por ser entrega individual, sem `force push` e sem exclusão:

```powershell
$protection = @{
  required_status_checks = @{ strict = $true; contexts = @('test') }
  enforce_admins = $true
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $false
    require_code_owner_reviews = $false
    required_approving_review_count = 0
  }
  restrictions = $null
  required_linear_history = $false
  allow_force_pushes = $false
  allow_deletions = $false
  block_creations = $false
  required_conversation_resolution = $true
  lock_branch = $false
  allow_fork_syncing = $false
} | ConvertTo-Json -Depth 5
$protection | gh api --method PUT repos/athoslira/bootcampII/branches/main/protection --input -
gh api repos/athoslira/bootcampII/branches/main/protection
```

Confirmar na resposta `enforce_admins.enabled: true`, contexto `test`, `required_pull_request_reviews` presente e bloqueios de força/exclusão.

- [ ] **Step 3: Criar falha controlada e real em teste útil**

Em `tests/comparison.test.js`, alterar temporariamente a expectativa do primeiro caso de líder de `'left'` para `'right'`.

Run: `node --test tests/comparison.test.js`

Expected: exatamente uma falha mostrando `actual: 'left'` e `expected: 'right'`.

```bash
git add tests/comparison.test.js
git commit -m "test: demonstra bloqueio do CI"
git push
```

- [ ] **Step 4: Verificar bloqueio e capturar evidência**

Aguardar o check falhar. Abrir a PR e capturar a área que mostre o check vermelho e o merge bloqueado. Salvar como `evidencias/etapa-03-ci-bloqueado.png` e confirmar visualmente que repositório, PR e falha estão legíveis.

- [ ] **Step 5: Corrigir a expectativa e publicar a evidência**

Restaurar a expectativa para `'left'`.

Run: `npm test`

Expected: zero falhas.

```bash
git add tests/comparison.test.js evidencias/etapa-03-ci-bloqueado.png README.md
git commit -m "Corrige teste e registra bloqueio do CI"
git push
```

- [ ] **Step 6: Confirmar check verde e merge permitido**

Run: `gh pr checks --watch`

Expected: job `test` com conclusão `pass`. Confirmar na PR que o bloqueio do check desapareceu.

---

### Task 8: Integrar, publicar e verificar a entrega final

**Files:**
- No source changes expected after merge.

- [ ] **Step 1: Fazer merge da PR e apagar a branch remota**

Run: `gh pr merge --merge --delete-branch`

Expected: merge aceito somente com o check obrigatório verde.

- [ ] **Step 2: Atualizar a cópia local da `main`**

Run: `git switch main && git pull --ff-only origin main`

Run: `npm test`

Expected: suíte completa verde no commit integrado.

- [ ] **Step 3: Publicar Docker 2.0 e latest**

```bash
docker build -t athoslira/bootcamp2-app:2.0 -t athoslira/bootcamp2-app:latest .
docker push athoslira/bootcamp2-app:2.0
docker push athoslira/bootcamp2-app:latest
```

Ler os manifests remotos e confirmar que `2.0` e `latest` apontam para o mesmo digest.

- [ ] **Step 4: Verificar GitHub Pages**

Abrir `https://athoslira.github.io/bootcampII/`, pesquisar dois atletas e completar um duelo. Confirmar que a versão pública contém “Duelo de atletas”, estatísticas e remoção dos slots.

- [ ] **Step 5: Auditoria final da entrega**

Run: `git status --short --branch`

Run: `git diff --check HEAD^ HEAD`

Run: `git ls-remote origin refs/heads/main`

Run: `gh pr view --json url,state,mergeCommit,statusCheckRollup`

Expected: árvore limpa, hashes local/remoto iguais, PR `MERGED` e checks verdes.

