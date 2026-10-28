# Etapa 02 Persistence and Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar favoritos persistentes no Supabase ao Quadra em Foco e publicar versões reproduzíveis da aplicação no Docker Hub com todas as evidências da Etapa 02.

**Architecture:** O frontend permanece estático e consome duas fontes: NBA Rosters para busca e Supabase para o CRUD de favoritos. Regras puras ficam em `favorites.js`, acesso remoto em `supabase.js` e orquestração do DOM em `script.js`; Nginx serve os mesmos artefatos no container.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Node.js test runner, Supabase PostgreSQL/JS v2, Nginx Alpine, Docker Desktop e Docker Hub.

## Global Constraints

- Continuar no repositório `https://github.com/athoslira/bootcampII` e preservar o histórico da Etapa 01.
- Usar apenas a chave pública `sb_publishable_0C1cC-if_W26nwcbiTJMyg_dtOKz6Ke`; nunca usar `service_role`.
- Manter compatibilidade com GitHub Pages e com navegadores modernos sem etapa de build frontend.
- Criar, listar e excluir registros no banco real; `localStorage` é proibido.
- Manter RLS habilitado e documentar que as políticas abertas para `anon` são uma limitação acadêmica.
- Publicar `athoslira/bootcamp2-app:1.0`, `athoslira/bootcamp2-app:1.1` e `athoslira/bootcamp2-app:latest`.
- Produzir evidência real de dois containers simultâneos nas portas 8080 e 8081.
- Não iniciar a Etapa 03 antes da conclusão e validação desta etapa.

---

## File Map

- Create `favorites.js`: normalização, chave estável, payload e HTML seguro de favoritos.
- Create `supabase.js`: inicialização tardia do SDK e operações `listFavorites`, `createFavorite` e `deleteFavorite`.
- Create `supabase/schema.sql`: tabela, unicidade, RLS e políticas reproduzíveis.
- Modify `script.js`: busca existente, botões de favorito e coordenação do CRUD.
- Modify `index.html`: região “Meus favoritos” e mensagens acessíveis.
- Modify `style.css`: controles e layout dos favoritos.
- Create `tests/favorites.test.js`: testes unitários das regras novas.
- Modify `tests/script.test.js`: regressão do cartão de atleta com ação de favoritar.
- Create `Dockerfile`: imagem Nginx estática.
- Create `.dockerignore`: contexto mínimo de build.
- Create `evidencias/sq4-docker-ps.png`: captura baseada na execução real dos dois containers.
- Modify `README.md`: execução, persistência, Docker Hub e sidequests.

---

### Task 1: Regras de domínio e schema de favoritos

**Files:**
- Create: `favorites.js`
- Create: `supabase/schema.sql`
- Create: `tests/favorites.test.js`

**Interfaces:**
- Consumes: objetos normalizados `{ name, team, position, height, weight, college, image }` produzidos por `normalizeRosterPlayer`.
- Produces: `playerKey(player): string`, `toFavoriteRecord(player): object`, `favoriteCardMarkup(favorite): string`.

- [ ] **Step 1: Write the failing domain tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { favoriteCardMarkup, playerKey, toFavoriteRecord } from '../favorites.js';

const player = {
  name: 'Victor Wembanyama', team: 'San Antonio Spurs', position: 'FC',
  height: `7'4"`, weight: '235 lb', college: 'Não informado',
  image: 'https://cdn.example/victor.png',
};

test('playerKey cria uma chave estável a partir de nome e equipe', () => {
  assert.equal(playerKey(player), 'victor-wembanyama--san-antonio-spurs');
});

test('toFavoriteRecord traduz o atleta para as colunas do Supabase', () => {
  assert.deepEqual(toFavoriteRecord(player), {
    chave_atleta: 'victor-wembanyama--san-antonio-spurs', nome: 'Victor Wembanyama',
    equipe: 'San Antonio Spurs', posicao: 'FC', altura: `7'4"`, peso: '235 lb',
    faculdade: 'Não informado', imagem_url: 'https://cdn.example/victor.png',
  });
});

test('favoriteCardMarkup escapa conteúdo remoto e inclui ação de remoção', () => {
  const html = favoriteCardMarkup({ ...toFavoriteRecord(player), id: 7, nome: '<img onerror=alert(1)>' });
  assert.match(html, /data-remove-favorite="7"/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img onerror/);
});
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run: `node --test tests/favorites.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `favorites.js`.

- [ ] **Step 3: Implement the pure rules**

```js
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]
  ));
}

function slug(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function playerKey(player) {
  return `${slug(player.name)}--${slug(player.team)}`;
}

export function toFavoriteRecord(player) {
  return {
    chave_atleta: playerKey(player), nome: player.name, equipe: player.team,
    posicao: player.position || null, altura: player.height || null,
    peso: player.weight || null, faculdade: player.college || null,
    imagem_url: player.image || null,
  };
}

export function favoriteCardMarkup(favorite) {
  const image = favorite.imagem_url?.startsWith('https://')
    ? `<img src="${escapeHtml(favorite.imagem_url)}" alt="Foto de ${escapeHtml(favorite.nome)}">`
    : '<div class="avatar-fallback" aria-hidden="true">NBA</div>';
  return `<article class="favorite-row" data-favorite-key="${escapeHtml(favorite.chave_atleta)}">
    <div class="player-photo">${image}</div>
    <div class="favorite-copy"><p class="team-code">${escapeHtml(favorite.equipe)}</p>
      <h3>${escapeHtml(favorite.nome)}</h3><p>${escapeHtml(favorite.posicao || 'Posição não informada')}</p></div>
    <button class="button-secondary" type="button" data-remove-favorite="${escapeHtml(favorite.id)}">Remover</button>
  </article>`;
}
```

- [ ] **Step 4: Add the reproducible database schema**

```sql
create table if not exists public.favoritos (
  id bigint generated by default as identity primary key,
  criado_em timestamptz not null default now(),
  chave_atleta text not null unique,
  nome text not null,
  equipe text not null,
  posicao text,
  altura text,
  peso text,
  faculdade text,
  imagem_url text
);

alter table public.favoritos enable row level security;

drop policy if exists "anon pode listar favoritos" on public.favoritos;
drop policy if exists "anon pode criar favoritos" on public.favoritos;
drop policy if exists "anon pode excluir favoritos" on public.favoritos;

create policy "anon pode listar favoritos" on public.favoritos for select to anon using (true);
create policy "anon pode criar favoritos" on public.favoritos for insert to anon with check (true);
create policy "anon pode excluir favoritos" on public.favoritos for delete to anon using (true);
```

- [ ] **Step 5: Run all tests**

Run: `npm test`

Expected: 8 passing tests, 0 failures.

- [ ] **Step 6: Commit the domain and schema**

```bash
git add favorites.js supabase/schema.sql tests/favorites.test.js
git commit -m "Adiciona modelo persistente de favoritos"
```

---

### Task 2: Adaptador Supabase

**Files:**
- Create: `supabase.js`
- Test: `tests/favorites.test.js`

**Interfaces:**
- Consumes: record returned by `toFavoriteRecord(player)`.
- Produces: `listFavorites(): Promise<Favorite[]>`, `createFavorite(record): Promise<Favorite>`, `deleteFavorite(id): Promise<void>`.

- [ ] **Step 1: Add validation tests for repository inputs**

Add to `tests/favorites.test.js`:

```js
import { assertFavoriteRecord, assertFavoriteId } from '../supabase.js';

test('assertFavoriteRecord rejeita favorito sem chave', () => {
  assert.throws(() => assertFavoriteRecord({ nome: 'A' }), /chave_atleta/);
});

test('assertFavoriteId aceita somente identificador positivo', () => {
  assert.equal(assertFavoriteId(4), 4);
  assert.throws(() => assertFavoriteId(0), /identificador/);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/favorites.test.js`

Expected: FAIL because `supabase.js` does not exist.

- [ ] **Step 3: Implement the lazy Supabase adapter**

```js
const SUPABASE_URL = 'https://hzfnrtcgmbvkffujluab.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0C1cC-if_W26nwcbiTJMyg_dtOKz6Ke';
let clientPromise;

export function assertFavoriteRecord(record) {
  if (!record?.chave_atleta || !record?.nome || !record?.equipe) {
    throw new TypeError('Favorito precisa de chave_atleta, nome e equipe.');
  }
  return record;
}

export function assertFavoriteId(id) {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) throw new TypeError('Identificador de favorito inválido.');
  return value;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY));
  }
  return clientPromise;
}

export async function listFavorites() {
  const client = await getClient();
  const { data, error } = await client.from('favoritos').select('*').order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createFavorite(record) {
  const client = await getClient();
  const { data, error } = await client.from('favoritos').insert(assertFavoriteRecord(record)).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFavorite(id) {
  const client = await getClient();
  const { error } = await client.from('favoritos').delete().eq('id', assertFavoriteId(id));
  if (error) throw error;
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`

Expected: 10 passing tests, 0 failures; Node never loads the remote SDK because validation is synchronous.

- [ ] **Step 5: Commit the adapter**

```bash
git add supabase.js tests/favorites.test.js
git commit -m "Conecta favoritos ao Supabase"
```

---

### Task 3: Interface CRUD versão 1.0

**Files:**
- Modify: `index.html`
- Modify: `script.js`
- Modify: `style.css`
- Modify: `tests/script.test.js`

**Interfaces:**
- Consumes: functions from `favorites.js` and dynamic repository from `supabase.js`.
- Produces: result cards with `data-save-favorite`, favorites list with `data-remove-favorite`, live status and CRUD wired to events.

- [ ] **Step 1: Add the failing player-card action test**

Modify the existing markup test to include:

```js
assert.match(html, /data-save-favorite="aline--sparks"/);
assert.match(html, />Favoritar</);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/script.test.js`

Expected: FAIL because the card does not have the favorite action.

- [ ] **Step 3: Add semantic favorites markup to `index.html`**

Insert after `#result`:

```html
<section class="favorites-area" aria-labelledby="favorites-title">
  <div class="section-heading">
    <div><p class="kicker">Seu elenco</p><h2 id="favorites-title">Meus favoritos</h2></div>
    <span id="favorites-count">0 atletas</span>
  </div>
  <p id="favorites-status" class="status" role="status" aria-live="polite">Carregando favoritos...</p>
  <div id="favorites-list" class="favorites-list"></div>
</section>
```

- [ ] **Step 4: Extend card markup and wire CRUD in `script.js`**

At module top import:

```js
import { escapeHtml, favoriteCardMarkup, playerKey, toFavoriteRecord } from './favorites.js';
```

Replace the local `escapeHtml`, add this button inside each player row, and make `playerCardMarkup` use `playerKey(player)`:

```js
<button class="favorite-button" type="button" data-save-favorite="${escapeHtml(playerKey(player))}">Favoritar</button>
```

Inside `initialise`, maintain `let visiblePlayers = new Map(); let favorites = [];` and load the repository only in the browser:

```js
const repositoryPromise = import('./supabase.js');
const favoritesList = document.getElementById('favorites-list');
const favoritesStatus = document.getElementById('favorites-status');
const favoritesCount = document.getElementById('favorites-count');

function renderFavorites() {
  favoritesList.innerHTML = favorites.map(favoriteCardMarkup).join('');
  favoritesCount.textContent = `${favorites.length} ${favorites.length === 1 ? 'atleta' : 'atletas'}`;
  favoritesStatus.textContent = favorites.length ? '' : 'Nenhum favorito ainda. Pesquise e monte seu elenco.';
}

async function refreshFavorites() {
  try {
    favorites = await (await repositoryPromise).listFavorites();
    renderFavorites();
  } catch {
    favoritesStatus.textContent = 'Não foi possível carregar os favoritos. Tente recarregar a página.';
  }
}

result.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-save-favorite]');
  if (!button) return;
  const player = visiblePlayers.get(button.dataset.saveFavorite);
  if (!player) return;
  button.disabled = true;
  try {
    const saved = await (await repositoryPromise).createFavorite(toFavoriteRecord(player));
    favorites = [saved, ...favorites];
    renderFavorites();
  } catch (error) {
    favoritesStatus.textContent = error?.code === '23505' ? 'Esse atleta já está nos favoritos.' : 'Não foi possível salvar o atleta.';
  } finally { button.disabled = false; }
});

favoritesList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-remove-favorite]');
  if (!button) return;
  button.disabled = true;
  try {
    await (await repositoryPromise).deleteFavorite(button.dataset.removeFavorite);
    favorites = favorites.filter(({ id }) => String(id) !== button.dataset.removeFavorite);
    renderFavorites();
  } catch {
    favoritesStatus.textContent = 'Não foi possível remover o favorito.';
    button.disabled = false;
  }
});

refreshFavorites();
```

When matches are created, populate the map before rendering:

```js
visiblePlayers = new Map(matches.map((player) => [playerKey(player), player]));
```

- [ ] **Step 5: Add exact styles for actions and favorites**

Append to `style.css`:

```css
.player-row { position: relative; grid-template-columns: 80px minmax(180px,1fr) minmax(280px,1.2fr) auto; }
.favorite-button { justify-self: end; }
.favorites-area { margin-top: 5rem; border-top: 2px solid var(--ink); padding-top: 1rem; }
.section-heading { display: flex; justify-content: space-between; align-items: end; gap: 1rem; }
.section-heading h2 { font: 700 clamp(2rem, 5vw, 3.5rem)/1 Georgia, serif; }
.section-heading .kicker { margin: 0 0 .5rem; }
.section-heading span { color: var(--muted); font-size: .8rem; }
.favorites-list { border-bottom: 1px solid var(--rule); }
.favorite-row { display: grid; grid-template-columns: 80px 1fr auto; gap: 1.25rem; align-items: center; padding: 1rem 0; border-top: 1px solid var(--rule); }
.favorite-copy h3 { margin: 0; font: 700 1.35rem/1.1 Georgia, serif; }
.favorite-copy p:last-child { margin: .3rem 0 0; color: var(--muted); font-size: .85rem; }
.button-secondary { background: transparent; color: var(--ink); border: 1px solid var(--ink); }
.button-secondary:hover { background: var(--ink); color: var(--paper); }
button:disabled { cursor: wait; opacity: .55; }
@media(max-width:700px) { .player-row .favorite-button { grid-column:1/-1; justify-self:start; } .favorite-row { grid-template-columns:64px 1fr; } .favorite-row .button-secondary { grid-column:1/-1; justify-self:start; } }
```

- [ ] **Step 6: Run tests and browser smoke test**

Run: `npm test`

Expected: all tests pass.

Run a static server and verify no console error before applying the schema; the page must show a clear database error rather than break the athlete search.

- [ ] **Step 7: Commit version 1.0 application code**

```bash
git add index.html script.js style.css tests/script.test.js
git commit -m "Adiciona CRUD de atletas favoritos"
```

---

### Task 4: Apply Supabase schema and validate real persistence

**Files:**
- Use: `supabase/schema.sql`
- Modify only if a verified integration defect exists.

**Interfaces:**
- Consumes: authenticated Supabase dashboard SQL editor.
- Produces: public table `favoritos` with open academic RLS policies.

- [ ] **Step 1: Open the project SQL editor and run `supabase/schema.sql`**

Use project `hzfnrtcgmbvkffujluab`. Confirm that all statements succeed. If the policies already exist, inspect them and avoid duplicating names.

- [ ] **Step 2: Verify table access with the public client**

Open the app, search for `Wembanyama`, click **Favoritar**, and confirm a row appears in “Meus favoritos”.

- [ ] **Step 3: Verify persistence and deletion**

Reload the page and confirm the row remains. Click **Remover**, reload again, and confirm it stays deleted.

- [ ] **Step 4: Run regression tests**

Run: `npm test`

Expected: all tests pass.

---

### Task 5: Docker image 1.0 and SQ1

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: all static runtime files.
- Produces: local image `athoslira/bootcamp2-app:1.0` serving port 80.

- [ ] **Step 1: Install and start Docker Desktop**

Run in an elevated Windows session if required:

```powershell
winget install -e --id Docker.DockerDesktop
```

Restart/sign out only if the installer requires it. Confirm with `docker version` and require both Client and Server sections.

- [ ] **Step 2: Create the Nginx Dockerfile**

```dockerfile
FROM nginx:alpine
COPY index.html style.css script.js favorites.js supabase.js /usr/share/nginx/html/
EXPOSE 80
```

- [ ] **Step 3: Create `.dockerignore`**

```text
.git
.github
.vscode
docs
evidencias
supabase
tests
README.md
node_modules
npm-debug.log
```

- [ ] **Step 4: Build and run version 1.0**

Run:

```powershell
docker build -t athoslira/bootcamp2-app:1.0 .
docker run -d -p 8080:80 --name bootcamp2-v1 athoslira/bootcamp2-app:1.0
```

Expected: `docker ps` shows `bootcamp2-v1` with `0.0.0.0:8080->80/tcp`, and `http://localhost:8080` loads the app.

- [ ] **Step 5: Verify the container and tests**

Search for an athlete and verify the existing Supabase favorite list loads from inside the container. Run `npm test` and require zero failures.

- [ ] **Step 6: Commit and publish tag 1.0**

```powershell
git add Dockerfile .dockerignore
git commit -m "Empacota aplicacao na imagem Docker 1.0"
docker login
docker push athoslira/bootcamp2-app:1.0
```

Expected: the public tag is pullable without authentication.

---

### Task 6: User-visible improvement and Docker image 1.1/latest

**Files:**
- Modify: `script.js`
- Modify: `tests/favorites.test.js`
- Modify: `favorites.js`
- Modify: `style.css`

**Interfaces:**
- Consumes: current favorites and visible results.
- Produces: `favoriteKeySet(favorites): Set<string>` and result buttons whose label/disabled state reflects persistence.

- [ ] **Step 1: Add failing set test**

```js
import { favoriteKeySet } from '../favorites.js';

test('favoriteKeySet indexa as chaves já persistidas', () => {
  assert.deepEqual([...favoriteKeySet([{ chave_atleta: 'a--time' }, { chave_atleta: 'b--time' }])], ['a--time', 'b--time']);
});
```

- [ ] **Step 2: Run focused test and verify failure**

Run: `node --test tests/favorites.test.js`

Expected: FAIL because `favoriteKeySet` is not exported.

- [ ] **Step 3: Implement the set helper**

```js
export function favoriteKeySet(favorites) {
  return new Set(favorites.map(({ chave_atleta }) => chave_atleta));
}
```

- [ ] **Step 4: Render saved state in search results**

Import `favoriteKeySet`, make `playerCardMarkup(player, savedKeys = new Set())` choose label `Salvo` and attribute `disabled` when `savedKeys.has(playerKey(player))`, and re-render the last matches after create/delete. Keep `lastMatches = []` in `initialise` and centralize rendering:

```js
function renderMatches() {
  result.className = 'results list';
  result.innerHTML = lastMatches.map((player) => playerCardMarkup(player, favoriteKeySet(favorites))).join('');
}
```

- [ ] **Step 5: Run tests and browser verification**

Run: `npm test`

Expected: all tests pass. In the browser, saving changes the button to **Salvo**, prevents a second insert, updates the counter, and removing restores **Favoritar**.

- [ ] **Step 6: Commit and build version 1.1**

```powershell
git add favorites.js script.js style.css tests/favorites.test.js tests/script.test.js
git commit -m "Melhora estados e evita favoritos duplicados"
docker build -t athoslira/bootcamp2-app:1.1 -t athoslira/bootcamp2-app:latest .
docker push athoslira/bootcamp2-app:1.1
docker push athoslira/bootcamp2-app:latest
```

- [ ] **Step 7: Verify all three remote tags**

Confirm in Docker Hub that `1.0`, `1.1` and `latest` exist and the repository is public.

---

### Task 7: SQ3, SQ4 evidence and README

**Files:**
- Create: `evidencias/sq4-docker-ps.png`
- Modify: `README.md`

**Interfaces:**
- Consumes: public Docker Hub repository and actual running containers.
- Produces: evaluator-ready documentation and committed evidence.

- [ ] **Step 1: Fill the Docker Hub overview**

Set the overview to:

```markdown
# Quadra em Foco

Aplicação web para pesquisar atletas da NBA e manter uma lista persistente de favoritos no Supabase.

## Executar

docker run -d -p 8080:80 athoslira/bootcamp2-app:1.1

Código-fonte: https://github.com/athoslira/bootcampII
```

- [ ] **Step 2: Run two version 1.1 containers**

Remove only the known task containers if they exist, then run:

```powershell
docker rm -f bootcamp2-v1 bootcamp2-8080 bootcamp2-8081 2>$null
docker run -d -p 8080:80 --name bootcamp2-8080 athoslira/bootcamp2-app:1.1
docker run -d -p 8081:80 --name bootcamp2-8081 athoslira/bootcamp2-app:1.1
docker ps --filter "name=bootcamp2-" --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
```

Expected: two running rows, one mapping 8080 and one mapping 8081.

- [ ] **Step 3: Capture real SQ4 evidence**

Capture the terminal region containing the command and both rows to `evidencias/sq4-docker-ps.png`. Do not mock or manually type container output. Open the PNG and visually verify that names, image and ports are legible.

- [ ] **Step 4: Replace README with evaluator-ready content**

Include all of the following exact facts:

```markdown
- Repositório: https://github.com/athoslira/bootcampII
- Aplicação: https://athoslira.github.io/bootcampII/
- Docker Hub: https://hub.docker.com/r/athoslira/bootcamp2-app
- Execução: `docker run -d -p 8080:80 athoslira/bootcamp2-app:1.1`
- Banco: Supabase PostgreSQL, tabela `favoritos`, colunas e operações C/R/D.
- Limitação: políticas RLS abertas para `anon`; todos os visitantes compartilham os favoritos.
- SQ1: arquivos excluídos e efeito sobre contexto, imagem e cache do build.
- SQ2: diferença funcional entre `1.0`, `1.1` e `latest`.
- SQ3: conteúdo do overview e link do Docker Hub.
- SQ4: imagem `evidencias/sq4-docker-ps.png` e explicação de Kubernetes.
```

Use este parágrafo para a questão de 100 containers:

```markdown
Com 100 containers, eu usaria Kubernetes em vez de iniciar e acompanhar cada processo manualmente. Um cluster reúne as máquinas disponíveis; cada pod encapsula uma ou mais instâncias da aplicação; e um Deployment declara a quantidade desejada de réplicas. O controlador recria réplicas que falham, distribui a carga e permite atualizações graduais sem administrar container por container.
```

- [ ] **Step 5: Verify links, evidence and commands**

Open the local README preview, the PNG, GitHub Pages and Docker Hub. Pull and run `athoslira/bootcamp2-app:1.1` using the documented command.

- [ ] **Step 6: Commit evidence and documentation**

```bash
git add README.md evidencias/sq4-docker-ps.png
git commit -m "Documenta entrega e sidequests da etapa 02"
```

---

### Task 8: Final verification and delivery of Stage 02

**Files:**
- Verify all tracked files.

**Interfaces:**
- Consumes: completed Stage 02 repository.
- Produces: clean, pushed `main` with reproducible public deliverables.

- [ ] **Step 1: Run automated checks**

Run:

```powershell
npm test
git diff --check
git status --short --branch
```

Expected: all tests pass, no whitespace errors, no uncommitted files.

- [ ] **Step 2: Verify public delivery from a clean consumer path**

Run:

```powershell
docker pull athoslira/bootcamp2-app:1.1
docker image inspect athoslira/bootcamp2-app:1.0 --format '{{.RepoTags}}'
docker image inspect athoslira/bootcamp2-app:1.1 --format '{{.RepoTags}}'
```

Expected: both versioned images are available and `latest` resolves to the 1.1 build.

- [ ] **Step 3: Push the repository**

```bash
git push origin main
```

- [ ] **Step 4: Check remote commit and GitHub Pages**

Confirm GitHub `main` contains the final commit and the Pages URL loads search plus favorites without mixed-content or module errors.

- [ ] **Step 5: Report Stage 02 completion before starting Stage 03**

Provide test count, commit hash, GitHub link, Pages link, Docker Hub link, run command and any remaining credential/user action. Do not describe Stage 03 as delivered.
