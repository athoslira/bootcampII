import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlayer, normalizeRosterPlayer, playerCardMarkup, selectBasketballPlayer } from '../script.js';

test('selectBasketballPlayer prioriza atleta de basquete entre perfis com o mesmo nome', () => {
  const player = selectBasketballPlayer([
    { strPlayer: 'Jordan Smith', strSport: 'Football' },
    { strPlayer: 'Jordan Smith', strSport: 'Basketball' },
  ]);

  assert.equal(player.strSport, 'Basketball');
});

test('normalizePlayer substitui campo ausente por texto legível', () => {
  const player = normalizePlayer({ strPlayer: 'Aline', strPosition: null });

  assert.equal(player.name, 'Aline');
  assert.equal(player.position, 'Não informado');
  assert.equal(player.team, 'Não informado');
});

test('playerCardMarkup exibe nome, posição e time do atleta', () => {
  const html = playerCardMarkup({
    name: 'Aline',
    position: 'Guard',
    team: 'Sparks',
    nationality: 'Brasil',
    birthDate: '2000-01-01',
    height: '1.70m',
    image: '',
  });

  assert.match(html, /Aline/);
  assert.match(html, /Guard/);
  assert.match(html, /Sparks/);
  assert.match(html, /data-save-favorite="aline--sparks"/);
  assert.match(html, />Favoritar</);
});

test('playerCardMarkup escapa texto recebido da API', () => {
  const html = playerCardMarkup({
    name: '<img src=x onerror=alert(1)>',
    position: 'Guard',
    team: 'Sparks',
    nationality: 'Brasil',
    birthDate: '2000-01-01',
    height: '1.70m',
    image: '',
  });

  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img src=x onerror/);
});

test('playerCardMarkup desabilita atleta já persistido', () => {
  const html = playerCardMarkup({
    name: 'Aline',
    position: 'Guard',
    team: 'Sparks',
    height: '1.70m',
    image: '',
  }, new Set(['aline--sparks']));

  assert.match(html, />Salvo</);
  assert.match(html, /data-save-favorite="aline--sparks" disabled/);
});

test('normalizeRosterPlayer associa atleta à equipe e mantém dados do elenco', () => {
  const player = normalizeRosterPlayer(
    { name: 'Evan Mobley', pos: 'FC', hgt: 83, weight: 215, tid: 5, college: 'USC', imgURL: 'https://cdn.example/evan.png' },
    [{ tid: 5, region: 'Cleveland', name: 'Cavaliers', abbrev: 'CLE' }],
  );

  assert.equal(player.name, 'Evan Mobley');
  assert.equal(player.team, 'Cleveland Cavaliers');
  assert.equal(player.position, 'FC');
  assert.equal(player.height, "6'11\"");
});

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

// O DOM e a rede são as fronteiras simuladas; parser, estado e HTML são reais.
class TestElement {
  listeners = new Map();
  textContent = '';
  className = '';
  value = '';
  html = '';
  buttons = [];

  set innerHTML(value) {
    this.html = value;
    this.buttons = [...value.matchAll(/<button\b[^>]*data-add-comparison="([^"]+)"([^>]*)>/g)]
      .map(([, key, attributes]) => ({ dataset: { addComparison: key }, disabled: attributes.includes('disabled') }));
  }

  get innerHTML() { return this.html; }
  querySelectorAll() { return this.buttons; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  async emit(type, dataset = {}) {
    const button = { dataset, disabled: false };
    return this.listeners.get(type)?.({
      preventDefault() {},
      target: { closest: (selector) => {
        const attribute = selector.slice(6, -1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        return Object.hasOwn(dataset, attribute) ? button : null;
      } },
    });
  }
}

const STATS_SOURCE = 'https://raw.githubusercontent.com/EasySportsApps/nba_api_25_26_data/refs/heads/main/nba_players_regular_season_25_26_wide_data.csv';
const STATS_CSV = 'player_name,wins,losses,one_point_made,two_point_made,three_point_made\nPlayer One,2,2,8,20,4\nPlayer Two,1,1,2,5,0';
let appInstance = 0;

async function startApp(t, { comparison = true, statsResponse = async () => ({ ok: true, text: async () => STATS_CSV }) } = {}) {
  const ids = ['player-form', 'player-name', 'result', 'player-count', 'favorites-list', 'favorites-status', 'favorites-count'];
  if (comparison) ids.push('comparison', 'comparison-status', 'comparison-content');
  const elements = Object.fromEntries(ids.map((id) => [id, new TestElement()]));
  const originalDocument = globalThis.document;
  globalThis.document = { getElementById: (id) => elements[id] ?? null };
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  });
  let statsRequests = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url === STATS_SOURCE) {
      statsRequests += 1;
      return statsResponse();
    }
    assert.equal(url, 'https://raw.githubusercontent.com/A-V29/NBA.Rosters/main/2025-26.NBA.Roster.json');
    return { ok: true, json: async () => ({
      teams: [{ tid: 1, region: 'Test', name: 'Team', abbrev: 'TT' }],
      players: ['One', 'Two', 'Three'].map((name) => ({ name: `Player ${name}`, pos: 'G', hgt: 72, weight: 200, tid: 1, college: 'Test', imgURL: '' })),
    }) };
  });
  await import(`../script.js?integration=${++appInstance}`);
  // O import remoto do cliente Supabase não é suportado pelo Node; a falha
  // existente é tratada pela app e não participa dos cliques do comparador.
  await new Promise(setImmediate);
  return {
    elements,
    statsRequests: () => statsRequests,
    async search(term = 'Player') {
      elements['player-name'].value = term;
      await elements['player-form'].emit('submit');
    },
    add: (key) => elements.result.emit('click', { addComparison: key }),
    remove: (slot) => elements.comparison?.emit('click', { removeComparison: String(slot) }),
  };
}

test('duelo carrega CSV sob demanda, bloqueia seleção durante carga e reutiliza o índice', async (t) => {
  let resolveStats;
  const response = new Promise((resolve) => { resolveStats = resolve; });
  const app = await startApp(t, { statsResponse: () => response });
  const { elements } = app;
  assert.equal(app.statsRequests(), 0);
  await app.search();
  assert.equal(app.statsRequests(), 0);

  const firstSelection = app.add('player-one--test-team');
  assert.match(elements['comparison-status'].textContent, /Carregando/);
  assert.equal(elements.result.buttons.every((button) => button.disabled), true);
  await app.add('player-two--test-team');
  assert.equal(app.statsRequests(), 1);
  resolveStats({ ok: true, text: async () => STATS_CSV });
  await firstSelection;
  assert.match(elements['comparison-content'].innerHTML, /15,0/);
  assert.doesNotMatch(elements['comparison-content'].innerHTML, /Player Two/);
  assert.match(elements.result.innerHTML, /data-add-comparison="player-one--test-team" disabled/);
  assert.equal(elements.result.buttons.find((button) => button.dataset.addComparison === 'player-two--test-team').disabled, false);

  await app.search('Two');
  await app.add('player-two--test-team');
  assert.match(elements['comparison-content'].innerHTML, /Player One/);
  assert.match(elements['comparison-content'].innerHTML, /Player Two/);
  assert.equal(app.statsRequests(), 1);
});

test('duelo recusa atleta invisível, duplicata e terceiro sem substituir; remoção libera o slot', async (t) => {
  const app = await startApp(t);
  const board = app.elements['comparison-content'];
  await app.search();
  const emptyMarkup = board.innerHTML;
  await app.add('inventado--test-team');
  assert.equal(board.innerHTML, emptyMarkup);
  assert.equal(app.statsRequests(), 0);
  await app.add('player-one--test-team');
  await app.add('player-one--test-team');
  assert.equal((board.innerHTML.match(/data-remove-comparison=/g) ?? []).length, 1);
  await app.add('player-two--test-team');
  const fullMarkup = board.innerHTML;
  await app.add('player-three--test-team');
  assert.equal(board.innerHTML, fullMarkup);
  assert.match(app.elements['comparison-status'].textContent, /[Rr]emova/);
  await app.remove(0);
  assert.doesNotMatch(board.innerHTML, /Player One/);
  assert.match(board.innerHTML, /Player Two/);
  assert.equal(app.elements.result.buttons.find((button) => button.dataset.addComparison === 'player-one--test-team').disabled, false);
  await app.add('player-three--test-team');
  assert.match(board.innerHTML, /Player Three/);
  assert.match(board.innerHTML, /Sem dados na temporada/);
  assert.equal(app.statsRequests(), 1);
});

for (const failure of ['http', 'network']) {
  test(`falha de CSV (${failure}) fica restrita ao comparador e preserva a busca`, async (t) => {
    let rejectStats;
    const response = new Promise((resolve, reject) => { rejectStats = failure === 'http' ? () => resolve({ ok: false, text: async () => STATS_CSV }) : () => reject(new Error('offline')); });
    response.catch(() => {});
    const app = await startApp(t, { statsResponse: () => response });
    await app.search();
    const favoritesStatus = app.elements['favorites-status'].textContent;
    const selection = app.add('player-one--test-team');
    rejectStats();
    await selection;
    assert.match(app.elements['comparison-status'].textContent, /Não foi possível/);
    assert.equal(app.elements['favorites-status'].textContent, favoritesStatus);
    assert.match(app.elements.result.innerHTML, /Player One/);
    assert.match(app.elements['comparison-content'].innerHTML, /Player One/);
    assert.equal(app.elements.result.buttons.find((button) => button.dataset.addComparison === 'player-two--test-team').disabled, false);
    await app.search('Three');
    assert.match(app.elements.result.innerHTML, /Player Three/);
    assert.doesNotMatch(app.elements.result.innerHTML, /Player One/);
    await app.add('player-one--test-team');
    assert.equal(app.statsRequests(), 1);
  });
}

test('ausência dos elementos do comparador preserva busca e não carrega estatísticas', async (t) => {
  const app = await startApp(t, { comparison: false });
  await app.search('Two');
  assert.match(app.elements.result.innerHTML, /Player Two/);
  await app.add('player-two--test-team');
  assert.equal(app.statsRequests(), 0);
});

test('resposta de estatísticas não restaura resultados apagados por uma busca vazia', async (t) => {
  let resolveStats;
  const response = new Promise((resolve) => { resolveStats = resolve; });
  const app = await startApp(t, { statsResponse: () => response });
  await app.search();
  const selection = app.add('player-one--test-team');
  await app.search('');
  const searchStatus = app.elements.result.textContent;
  const searchClass = app.elements.result.className;
  resolveStats({ ok: true, text: async () => STATS_CSV });
  await selection;
  assert.equal(app.elements.result.className, searchClass);
  assert.equal(app.elements.result.textContent, searchStatus);
  const board = app.elements['comparison-content'].innerHTML;
  await app.add('player-two--test-team');
  assert.equal(app.elements['comparison-content'].innerHTML, board);
});
