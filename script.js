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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

export function playerCardMarkup(player) {
  const image = player.image?.startsWith('https://')
    ? `<img src="${escapeHtml(player.image)}" alt="Foto de ${escapeHtml(player.name)}">`
    : '<div class="avatar-fallback" aria-hidden="true">NBA</div>';
  return `<article class="player-row"><div class="player-photo">${image}</div><div><p class="team-code">${escapeHtml(player.abbreviation || '')}</p><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.team)} · ${escapeHtml(player.position)}</p></div><dl><div><dt>Altura</dt><dd>${escapeHtml(player.height)}</dd></div><div><dt>Peso</dt><dd>${escapeHtml(player.weight || 'Não informado')}</dd></div><div><dt>Faculdade</dt><dd>${escapeHtml(player.college || player.nationality || 'Não informado')}</dd></div></dl></article>`;
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
  if (!form || !input || !result || !count) return;

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
      if (!matches.length) return setStatus(result, 'Nenhum atleta encontrado. Tente outro nome.', 'error');

      result.className = 'results list';
      result.innerHTML = matches.map(playerCardMarkup).join('');
    } catch {
      setStatus(result, 'Não foi possível carregar a base agora. Tente novamente.', 'error');
    }
  });
}

if (typeof document !== 'undefined') initialise();
