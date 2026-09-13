# Quadra em Foco Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma aplicação estática e responsiva para pesquisar jogadores de basquete e publicar no GitHub Pages.

**Architecture:** O HTML fornece formulário e área de resultado; o JavaScript mantém funções puras, exportadas e testáveis para selecionar e normalizar dados, além de conectar o formulário à API. O CSS implementa o tema escuro esportivo sem dependências.

**Tech Stack:** HTML5, CSS3, JavaScript ES Modules, Fetch API e Node.js test runner.

## Global Constraints

- Usar somente a API pública TheSportsDB, sem chave.
- Consultar `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p={nome}`.
- Exibir foto, nome, posição, time, nacionalidade, nascimento e altura quando disponíveis.
- Priorizar resultados com `strSport === "Basketball"`.
- Manter `index.html`, `style.css` e `script.js` separados na raiz.
- Usar caminhos relativos e criar pelo menos cinco commits descritivos.

---

## File Structure

- `index.html`: estrutura semântica, formulário e área viva de resultados.
- `style.css`: identidade visual, estados e responsividade.
- `script.js`: funções de dados e integração com DOM/API.
- `tests/script.test.js`: testes unitários executados com Node.
- `package.json`: comando `npm test`, sem dependências.
- `README.md`: documentação de entrega.

### Task 1: Criar a interface da busca

**Files:**
- Create: `index.html`
- Create: `style.css`

**Produces:** Os elementos `#player-form`, `#player-name`, `#search-button` e `#result`.

- [ ] **Step 1: Criar o HTML semântico com label, campo obrigatório e região viva**

```html
<form id="player-form" novalidate>
  <label for="player-name">Nome do atleta</label>
  <input id="player-name" name="player-name" type="search" required>
  <button id="search-button" type="submit">Buscar atleta</button>
</form>
<section id="result" class="result empty" aria-live="polite">
  Pesquise pelo nome completo de um jogador.
</section>
```

- [ ] **Step 2: Criar o CSS-base escuro e responsivo**

```css
:root { --ink: #07101f; --surface: #0e1b2e; --accent: #f97316; --text: #f8fafc; }
.player-card { display: grid; grid-template-columns: 180px 1fr; gap: 1.5rem; }
@media (max-width: 620px) { .player-card { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Abrir a página e confirmar foco de teclado, formulário e mensagem inicial**
- [ ] **Step 4: Commitar**

```bash
git add index.html style.css
git commit -m "Cria estrutura da busca de atletas"
```

### Task 2: Testar e implementar a transformação de dados

**Files:**
- Create: `package.json`
- Create: `tests/script.test.js`
- Create: `script.js`

**Produces:** `selectBasketballPlayer(players)` e `normalizePlayer(player)`, ambas exportadas por `script.js`.

- [ ] **Step 1: Escrever o teste de preferência por basquete**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBasketballPlayer } from '../script.js';

test('selectBasketballPlayer prioriza atleta de basquete', () => {
  const player = selectBasketballPlayer([
    { strPlayer: 'Jordan Smith', strSport: 'Football' },
    { strPlayer: 'Jordan Smith', strSport: 'Basketball' },
  ]);
  assert.equal(player.strSport, 'Basketball');
});
```

- [ ] **Step 2: Executar e confirmar a falha pela exportação inexistente**

Run: `node --test tests/script.test.js`

- [ ] **Step 3: Implementar a seleção mínima**

```js
export function selectBasketballPlayer(players) {
  return players?.find((player) => player.strSport === 'Basketball') ?? players?.[0] ?? null;
}
```

- [ ] **Step 4: Escrever o teste de campos ausentes**

```js
import { normalizePlayer } from '../script.js';

test('normalizePlayer substitui campo ausente por texto legível', () => {
  const player = normalizePlayer({ strPlayer: 'Aline', strPosition: null });
  assert.equal(player.position, 'Não informado');
  assert.equal(player.name, 'Aline');
});
```

- [ ] **Step 5: Executar e confirmar a falha pela exportação inexistente**

Run: `node --test tests/script.test.js`

- [ ] **Step 6: Implementar normalização e o comando de teste**

```js
export function normalizePlayer(player) {
  const value = (field) => player?.[field] || 'Não informado';
  return { name: value('strPlayer'), position: value('strPosition'), team: value('strTeam'), nationality: value('strNationality'), birthDate: value('dateBorn'), height: value('strHeight'), image: player?.strThumb || '' };
}
```

```json
{ "type": "module", "scripts": { "test": "node --test" } }
```

- [ ] **Step 7: Executar todos os testes**

Run: `npm test`

- [ ] **Step 8: Commitar**

```bash
git add package.json script.js tests/script.test.js
git commit -m "Adiciona seleção de jogadores de basquete"
```

### Task 3: Testar e integrar a consulta

**Files:**
- Modify: `script.js`
- Modify: `tests/script.test.js`

**Consumes:** Elementos do Task 1 e as funções exportadas do Task 2.
**Produces:** `playerCardMarkup(player)` e fluxo de busca com estados de carregamento, vazio, ausência e erro.

- [ ] **Step 1: Escrever o teste do cartão**

```js
import { playerCardMarkup } from '../script.js';

test('playerCardMarkup exibe nome, posição e time', () => {
  const html = playerCardMarkup({ name: 'Aline', position: 'Guard', team: 'Sparks', nationality: 'Brasil', birthDate: '2000-01-01', height: '1.70m', image: '' });
  assert.match(html, /Aline/);
  assert.match(html, /Guard/);
  assert.match(html, /Sparks/);
});
```

- [ ] **Step 2: Executar e confirmar falha por função inexistente**

Run: `node --test tests/script.test.js`

- [ ] **Step 3: Implementar cartão e requisição segura**

```js
const endpoint = (term) =>
  `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(term)}`;
const response = await fetch(endpoint(term));
if (!response.ok) throw new Error('service-unavailable');
const player = selectBasketballPlayer((await response.json()).player);
```

- [ ] **Step 4: No envio do formulário, validar o termo, mostrar carregamento, desabilitar botão e restaurá-lo em `finally`**
- [ ] **Step 5: Executar testes e verificar manualmente uma busca real, busca inválida e falha de rede**

Run: `npm test`

- [ ] **Step 6: Commitar**

```bash
git add script.js tests/script.test.js
git commit -m "Implementa consulta à API de jogadores"
```

### Task 4: Finalizar aparência e README

**Files:**
- Modify: `style.css`
- Create: `README.md`

**Consumes:** Classes `loading`, `error`, `empty`, `player-card` e `player-image`.
**Produces:** Acabamento visual acessível e documentação para entrega.

- [ ] **Step 1: Estilizar cartão, erros, carregamento e foco visível**

```css
.result.error { border-color: #fb7185; color: #fecdd3; }
.result.loading { color: #fed7aa; }
button:focus-visible, input:focus-visible { outline: 3px solid #fbbf24; outline-offset: 3px; }
```

- [ ] **Step 2: Criar README com autor, descrição, API, funcionalidades, execução e campos de links**

```markdown
# Quadra em Foco
## Autor
Seu nome completo — Matrícula 0000000
## Links
- **Aplicação no ar (GitHub Pages):** https://SEU-USUARIO.github.io/quadra-em-foco/
- **Repositório:** https://github.com/SEU-USUARIO/quadra-em-foco
```

- [ ] **Step 3: Executar testes, testar todos os estados no navegador e confirmar caminhos relativos**
- [ ] **Step 4: Commitar o estilo**

```bash
git add style.css
git commit -m "Estiliza cartão com tema esportivo escuro"
```

- [ ] **Step 5: Commitar README**

```bash
git add README.md
git commit -m "Escreve README com instruções do projeto"
```

### Task 5: Publicar após definir a conta GitHub

**Files:**
- Modify: `README.md` apenas para trocar os dois links-modelo pelas URLs reais.

- [ ] **Step 1: Criar o repositório público e adicionar o remoto**

```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/quadra-em-foco.git
git push -u origin main
```

- [ ] **Step 2: Ativar GitHub Pages em Settings > Pages > Deploy from a branch > main > / (root)**
- [ ] **Step 3: Trocar links do README, commitar e enviar**
- [ ] **Step 4: Testar a URL em aba anônima, com uma busca válida e outra inválida**

