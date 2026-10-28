import { escapeHtml, favoriteCardMarkup, favoriteKeySet, playerKey, toFavoriteRecord } from './favorites.js';

const ROSTER_URL = 'https://raw.githubusercontent.com/A-V29/NBA.Rosters/main/2025-26.NBA.Roster.json';
let rosterPromise;

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

export function playerCardMarkup(player, savedKeys = new Set()) {
  const key = playerKey(player);
  const isSaved = savedKeys.has(key);
  const image = player.image?.startsWith('https://')
    ? `<img src="${escapeHtml(player.image)}" alt="Foto de ${escapeHtml(player.name)}">`
    : '<div class="avatar-fallback" aria-hidden="true">NBA</div>';
  return `<article class="player-row">
    <div class="player-photo">${image}</div>
    <div><p class="team-code">${escapeHtml(player.abbreviation || '')}</p><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(player.position)}</p></div>
    <dl><div><dt>Altura</dt><dd>${escapeHtml(player.height)}</dd></div><div><dt>Peso</dt><dd>${escapeHtml(player.weight || 'Não informado')}</dd></div><div><dt>Faculdade</dt><dd>${escapeHtml(player.college || player.nationality || 'Não informado')}</dd></div></dl>
    <button class="favorite-button" type="button" data-save-favorite="${escapeHtml(key)}"${isSaved ? ' disabled aria-pressed="true"' : ' aria-pressed="false"'}>${isSaved ? 'Salvo' : 'Favoritar'}</button>
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
  if (!form || !input || !result || !count || !favoritesList || !favoritesStatus || !favoritesCount) return;

  const repositoryPromise = import('./supabase.js');
  let visiblePlayers = new Map();
  let favorites = [];
  let lastMatches = [];

  function renderMatches() {
    if (!lastMatches.length) return;
    result.className = 'results list';
    const savedKeys = favoriteKeySet(favorites);
    result.innerHTML = lastMatches.map((player) => playerCardMarkup(player, savedKeys)).join('');
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

  refreshFavorites();
}

if (typeof document !== 'undefined') initialise();
