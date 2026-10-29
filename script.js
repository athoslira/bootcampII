import { escapeHtml, favoriteCardMarkup, favoriteKeySet, playerKey, toFavoriteRecord } from './favorites.js';
import { addPlayerToComparison, comparisonMarkup, removePlayerFromComparison } from './comparison.js';
import { createStatsIndex, parseStatsCsv } from './stats.js';

const ROSTER_URL = 'https://raw.githubusercontent.com/A-V29/NBA.Rosters/main/2025-26.NBA.Roster.json';
const STATS_URL = 'https://raw.githubusercontent.com/EasySportsApps/nba_api_25_26_data/refs/heads/main/nba_players_regular_season_25_26_wide_data.csv';
let rosterPromise;
let statsPromise;

export function selectBasketballPlayer(players) {
  return players?.find((player) => player.strSport === 'Basketball') ?? players?.[0] ?? null;
}

export function normalizePlayer(player) {
  const value = (field) => player?.[field] || 'Não informado';
  return { name: value('strPlayer'), position: value('strPosition'), team: value('strTeam'), nationality: value('strNationality'), birthDate: value('dateBorn'), height: value('strHeight'), image: player?.strThumb || '' };
}

export function normalizeRosterPlayer(player, teams) {
  const team = teams.find((item) => item.tid === player.tid);
  const feet = Math.floor(player.hgt / 12);
  const inches = player.hgt % 12;
  return {
    name: player.name || 'Não informado',
    position: player.pos || 'Não informado',
    team: team ? `${team.region} ${team.name}` : 'Agente livre',
    abbreviation: team?.abbrev || 'FA',
    height: Number.isFinite(player.hgt) ? `${feet}'${inches}"` : 'Não informado',
    weight: player.weight ? `${player.weight} lb` : 'Não informado',
    college: player.college || 'Não informado',
    image: player.imgURL || '',
  };
}

export function playerCardMarkup(player, savedKeys = new Set(), selectedKeys = new Set()) {
  const key = playerKey(player);
  const isSaved = savedKeys.has(key);
  const isSelected = selectedKeys.has(key);
  const image = player.image?.startsWith('https://')
    ? `<img src="${escapeHtml(player.image)}" alt="Foto de ${escapeHtml(player.name)}">`
    : '<div class="avatar-fallback" aria-hidden="true">NBA</div>';
  return `<article class="player-row">
    <div class="player-photo">${image}</div>
    <div><p class="team-code">${escapeHtml(player.abbreviation || '')}</p><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(player.position)}</p></div>
    <dl><div><dt>Altura</dt><dd>${escapeHtml(player.height)}</dd></div><div><dt>Peso</dt><dd>${escapeHtml(player.weight || 'Não informado')}</dd></div><div><dt>Faculdade</dt><dd>${escapeHtml(player.college || player.nationality || 'Não informado')}</dd></div></dl>
    <div class="player-actions">
      <button class="favorite-button" type="button" data-save-favorite="${escapeHtml(key)}"${isSaved ? ' disabled aria-pressed="true"' : ' aria-pressed="false"'}>${isSaved ? 'Salvo' : 'Favoritar'}</button>
      <button class="button-secondary" type="button" data-add-comparison="${escapeHtml(key)}"${isSelected ? ' disabled aria-pressed="true"' : ' aria-pressed="false"'}>${isSelected ? 'No duelo' : 'Adicionar ao duelo'}</button>
    </div>
  </article>`;
}

async function loadRoster() {
  if (!rosterPromise) {
    rosterPromise = fetch(ROSTER_URL).then((response) => {
      if (!response.ok) throw new Error('network');
      return response.json();
    });
  }
  return rosterPromise;
}

async function loadStats() {
  if (!statsPromise) {
    statsPromise = fetch(STATS_URL).then((response) => {
      if (!response.ok) throw new Error('network');
      return response.text();
    }).then((csv) => createStatsIndex(parseStatsCsv(csv)));
  }
  return statsPromise;
}

function setStatus(result, message, kind = 'status') {
  result.className = `results ${kind}`;
  result.textContent = message;
}

function initialise() {
  const form = document.getElementById('player-form');
  const input = document.getElementById('player-name');
  const result = document.getElementById('result');
  const count = document.getElementById('player-count');
  const favoritesList = document.getElementById('favorites-list');
  const favoritesStatus = document.getElementById('favorites-status');
  const favoritesCount = document.getElementById('favorites-count');
  const comparison = document.getElementById('comparison');
  const comparisonStatus = document.getElementById('comparison-status');
  const comparisonContent = document.getElementById('comparison-content');
  if (!form || !input || !result || !count || !favoritesList || !favoritesStatus || !favoritesCount) return;

  const repositoryPromise = import('./supabase.js');
  let visiblePlayers = new Map();
  let favorites = [];
  let lastMatches = [];
  let comparisonSlots = [null, null];
  let statsIndex = new Map();
  let statsLoading = false;
  let statsLoaded = false;
  let statsError = '';
  const hasComparison = comparison && comparisonStatus && comparisonContent;

  function renderMatches() {
    if (!lastMatches.length) return;
    result.className = 'results list';
    const savedKeys = favoriteKeySet(favorites);
    const selectedKeys = new Set(comparisonSlots.filter(Boolean).map(playerKey));
    result.innerHTML = lastMatches.map((player) => playerCardMarkup(player, savedKeys, selectedKeys)).join('');
    if (statsLoading) {
      result.querySelectorAll('[data-add-comparison]').forEach((button) => { button.disabled = true; });
    }
  }

  function renderComparison() {
    if (!hasComparison) return;
    comparisonContent.innerHTML = comparisonMarkup(comparisonSlots, statsIndex);
    const selectedCount = comparisonSlots.filter(Boolean).length;
    comparisonStatus.textContent = statsLoading
      ? 'Carregando estatísticas da temporada...'
      : selectedCount && statsError
        ? statsError
        : selectedCount === 2
          ? 'Duelo pronto. Compare as estatísticas abaixo.'
          : selectedCount === 1
            ? 'Adicione mais um atleta encontrado pela busca.'
            : 'Adicione dois atletas encontrados pela busca.';
    renderMatches();
  }

  function renderFavorites() {
    favoritesList.innerHTML = favorites.map(favoriteCardMarkup).join('');
    favoritesCount.textContent = `${favorites.length} ${favorites.length === 1 ? 'atleta' : 'atletas'}`;
    favoritesStatus.textContent = favorites.length
      ? ''
      : 'Nenhum favorito ainda. Pesquise e monte seu elenco.';
    renderMatches();
  }

  async function refreshFavorites() {
    try {
      favorites = await (await repositoryPromise).listFavorites();
      renderFavorites();
    } catch {
      favoritesStatus.textContent = 'Não foi possível carregar os favoritos. Tente recarregar a página.';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const term = input.value.trim().toLocaleLowerCase('pt-BR');
    lastMatches = [];
    visiblePlayers = new Map();
    if (!term) return setStatus(result, 'Digite pelo menos parte do nome de um atleta.', 'error');

    setStatus(result, 'Carregando elenco e filtrando atletas...', 'loading');
    try {
      const roster = await loadRoster();
      const matches = roster.players
        .filter((player) => player.name?.toLocaleLowerCase('pt-BR').includes(term))
        .slice(0, 12)
        .map((player) => normalizeRosterPlayer(player, roster.teams));

      count.textContent = `${roster.players.length.toLocaleString('pt-BR')} atletas catalogados`;
      lastMatches = matches;
      visiblePlayers = new Map(lastMatches.map((player) => [playerKey(player), player]));
      if (!matches.length) return setStatus(result, 'Nenhum atleta encontrado. Tente outro nome.', 'error');

      renderMatches();
    } catch {
      setStatus(result, 'Não foi possível carregar a base agora. Tente novamente.', 'error');
    }
  });

  result.addEventListener('click', async (event) => {
    const comparisonButton = event.target.closest?.('[data-add-comparison]');
    if (comparisonButton) {
      if (!hasComparison || statsLoading) return;
      const player = visiblePlayers.get(comparisonButton.dataset.addComparison);
      if (!player) return;
      const selection = addPlayerToComparison(comparisonSlots, player);
      if (selection.reason) {
        if (selection.reason === 'full') comparisonStatus.textContent = 'Remova um atleta do duelo para adicionar outro.';
        return;
      }
      comparisonSlots = selection.slots;
      if (statsLoaded || statsError) return renderComparison();
      statsLoading = true;
      renderComparison();
      try {
        statsIndex = await loadStats();
        statsLoaded = true;
      } catch {
        statsError = 'Não foi possível carregar as estatísticas. Tente recarregar a página.';
      } finally {
        statsLoading = false;
        renderComparison();
      }
      return;
    }

    const button = event.target.closest?.('[data-save-favorite]');
    if (!button) return;
    const player = visiblePlayers.get(button.dataset.saveFavorite);
    if (!player) return;

    button.disabled = true;
    try {
      const saved = await (await repositoryPromise).createFavorite(toFavoriteRecord(player));
      favorites = [saved, ...favorites];
      renderFavorites();
    } catch (error) {
      favoritesStatus.textContent = error?.code === '23505'
        ? 'Esse atleta já está nos favoritos.'
        : 'Não foi possível salvar o atleta.';
    } finally {
      button.disabled = false;
    }
  });

  comparison?.addEventListener('click', (event) => {
    if (!hasComparison) return;
    const button = event.target.closest?.('[data-remove-comparison]');
    if (!button) return;
    const slot = Number(button.dataset.removeComparison);
    if (!Number.isInteger(slot) || slot < 0 || slot > 1) return;
    comparisonSlots = removePlayerFromComparison(comparisonSlots, slot);
    renderComparison();
  });

  favoritesList.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-remove-favorite]');
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

  renderComparison();
  refreshFavorites();
}

if (typeof document !== 'undefined') initialise();
