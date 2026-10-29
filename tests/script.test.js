import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
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

  focus() { globalThis.document.activeElement = this; }
  contains(element) { return element === this || this.buttons.includes(element); }

  set innerHTML(value) {
    if (this.contains(globalThis.document?.activeElement)) globalThis.document.activeElement = globalThis.document.body;
    this.html = value;
    this.buttons = [...value.matchAll(/<button\b([^>]*)>/g)].map(([, attributes]) => {
      const button = new TestElement();
      button.dataset = Object.fromEntries([...attributes.matchAll(/data-([a-z-]+)="([^"]*)"/g)]
        .map(([, name, key]) => [name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), key]));
      button.disabled = attributes.includes(' disabled');
      return button;
    });
  }

  get innerHTML() { return this.html; }
  querySelectorAll(selector) {
    if (selector === 'button') return this.buttons;
    const attribute = selector.slice(6, -1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return this.buttons.filter((button) => Object.hasOwn(button.dataset, attribute));
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  async emit(type, dataset = {}) {
    const button = this.buttons.find((candidate) => Object.entries(dataset).every(([key, value]) => candidate.dataset[key] === value)) ?? { dataset, disabled: false };
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

// Intercepta somente o repositório externo das instâncias de integração.
// O hook é suportado pelo Node 20; os demais módulos usam seu código real.
const repositoryModule = `
  export const listFavorites = () => globalThis.testFavoriteRepository.listFavorites();
  export const createFavorite = (record) => globalThis.testFavoriteRepository.createFavorite(record);
  export const deleteFavorite = (id) => globalThis.testFavoriteRepository.deleteFavorite(id);
`;
register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === './supabase.js' && context.parentURL?.includes('?integration=')) {
      return { url: ${JSON.stringify(`data:text/javascript,${encodeURIComponent(repositoryModule)}`)}, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
`)}`, import.meta.url);

async function startApp(t, { comparison = true, statsResponse = async () => ({ ok: true, text: async () => STATS_CSV }), favoriteResponse = async (record) => ({ id: 1, ...record }) } = {}) {
  const ids = ['player-form', 'player-name', 'result', 'player-count', 'favorites-list', 'favorites-status', 'favorites-count'];
  if (comparison) ids.push('comparison', 'comparison-status', 'comparison-content');
  const elements = Object.fromEntries(ids.map((id) => [id, new TestElement()]));
  const originalDocument = globalThis.document;
  globalThis.document = { getElementById: (id) => elements[id] ?? null, body: new TestElement(), activeElement: null };
  globalThis.document.activeElement = globalThis.document.body;
  let favoriteRequests = 0;
  const originalRepository = globalThis.testFavoriteRepository;
  globalThis.testFavoriteRepository = {
    listFavorites: async () => [],
    createFavorite: (record) => { favoriteRequests += 1; return favoriteResponse(record); },
    deleteFavorite: async () => {},
  };
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalRepository === undefined) delete globalThis.testFavoriteRepository;
    else globalThis.testFavoriteRepository = originalRepository;
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
  await new Promise(setImmediate);
  return {
    elements,
    statsRequests: () => statsRequests,
    favoriteRequests: () => favoriteRequests,
    control: (attribute, key) => [...elements.result.buttons, ...(elements['comparison-content']?.buttons ?? [])]
      .find((button) => button.dataset[attribute] === String(key)),
    async search(term = 'Player') {
      elements['player-name'].value = term;
      await elements['player-form'].emit('submit');
    },
    add: (key) => elements.result.emit('click', { addComparison: key }),
    save: (key) => elements.result.emit('click', { saveFavorite: key }),
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
  assert.equal(elements.result.querySelectorAll('[data-add-comparison]').every((button) => button.disabled), true);
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

test('atualizações do duelo mantêm favorito pendente bloqueado e impedem salvamento duplicado', async (t) => {
  let resolveFavorite;
  let resolveStats;
  const saved = new Promise((resolve) => { resolveFavorite = resolve; });
  const stats = new Promise((resolve) => { resolveStats = resolve; });
  const app = await startApp(t, { favoriteResponse: () => saved, statsResponse: () => stats });
  await app.search();
  const firstSave = app.save('player-one--test-team');
  await new Promise(setImmediate);
  const selection = app.add('player-one--test-team');
  const blockedDuringLoad = app.control('saveFavorite', 'player-one--test-team').disabled;
  resolveStats({ ok: true, text: async () => STATS_CSV });
  await selection;
  const blockedAfterLoad = app.control('saveFavorite', 'player-one--test-team').disabled;
  await app.remove(0);
  const blockedAfterRemoval = app.control('saveFavorite', 'player-one--test-team').disabled;
  const secondSave = app.save('player-one--test-team');
  await new Promise(setImmediate);
  const pendingRequests = app.favoriteRequests();
  resolveFavorite({ id: 1, chave_atleta: 'player-one--test-team', nome: 'Player One', equipe: 'Test Team' });
  await Promise.all([firstSave, secondSave]);
  await app.save('player-one--test-team');
  assert.equal(blockedDuringLoad, true);
  assert.equal(blockedAfterLoad, true);
  assert.equal(blockedAfterRemoval, true);
  assert.equal(pendingRequests, 1);
  assert.equal(app.favoriteRequests(), 1);
  assert.equal(app.control('saveFavorite', 'player-one--test-team').disabled, true);
});

test('falha ao salvar favorito libera a chave pendente para nova tentativa', async (t) => {
  let rejectFavorite;
  const saved = new Promise((resolve, reject) => { rejectFavorite = reject; });
  saved.catch(() => {});
  const app = await startApp(t, { favoriteResponse: () => saved });
  await app.search();
  const firstSave = app.save('player-one--test-team');
  await new Promise(setImmediate);
  await app.add('player-one--test-team');
  rejectFavorite(new Error('offline'));
  await firstSave;
  assert.equal(app.control('saveFavorite', 'player-one--test-team').disabled, false);
  await app.save('player-one--test-team');
  assert.equal(app.favoriteRequests(), 2);
});

test('seleção transfere foco ao controle de remoção e remoção devolve à ação do atleta', async (t) => {
  const app = await startApp(t);
  await app.search();
  app.control('addComparison', 'player-one--test-team').focus();
  await app.add('player-one--test-team');
  assert.equal(globalThis.document.activeElement, app.control('removeComparison', 0));
  app.control('addComparison', 'player-two--test-team').focus();
  await app.add('player-two--test-team');
  assert.equal(globalThis.document.activeElement, app.control('removeComparison', 1));
  app.control('removeComparison', 0).focus();
  await app.remove(0);
  assert.equal(globalThis.document.activeElement, app.control('addComparison', 'player-one--test-team'));
});

test('conclusão assíncrona do CSV preserva foco no controle atual do comparador', async (t) => {
  let resolveStats;
  const stats = new Promise((resolve) => { resolveStats = resolve; });
  const app = await startApp(t, { statsResponse: () => stats });
  await app.search();
  app.control('addComparison', 'player-one--test-team').focus();
  const selection = app.add('player-one--test-team');
  const focusAfterSelection = globalThis.document.activeElement;
  const removeBeforeResponse = app.control('removeComparison', 0);
  removeBeforeResponse.focus();
  resolveStats({ ok: true, text: async () => STATS_CSV });
  await selection;
  assert.equal(focusAfterSelection, removeBeforeResponse);
  assert.equal(globalThis.document.activeElement, app.control('removeComparison', 0));
  assert.notEqual(globalThis.document.activeElement, removeBeforeResponse);
});

test('resposta do CSV não rouba foco movido pelo usuário para o campo de busca', async (t) => {
  let resolveStats;
  const stats = new Promise((resolve) => { resolveStats = resolve; });
  const app = await startApp(t, { statsResponse: () => stats });
  await app.search();
  app.control('addComparison', 'player-one--test-team').focus();
  const selection = app.add('player-one--test-team');
  app.elements['player-name'].focus();
  resolveStats({ ok: true, text: async () => STATS_CSV });
  await selection;
  assert.equal(globalThis.document.activeElement, app.elements['player-name']);
});

test('resposta do CSV preserva foco movido para a ação de favorito de outro atleta', async (t) => {
  let resolveStats;
  const stats = new Promise((resolve) => { resolveStats = resolve; });
  const app = await startApp(t, { statsResponse: () => stats });
  await app.search();
  app.control('addComparison', 'player-one--test-team').focus();
  const selection = app.add('player-one--test-team');
  app.control('saveFavorite', 'player-two--test-team').focus();
  resolveStats({ ok: true, text: async () => STATS_CSV });
  await selection;
  assert.equal(globalThis.document.activeElement, app.control('saveFavorite', 'player-two--test-team'));
});
