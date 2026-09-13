const API_BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=';

export function selectBasketballPlayer(players) {
  return players?.find((player) => player.strSport === 'Basketball') ?? players?.[0] ?? null;
}

export function normalizePlayer(player) {
  const value = (field) => player?.[field] || 'Não informado';

  return {
    name: value('strPlayer'),
    position: value('strPosition'),
    team: value('strTeam'),
    nationality: value('strNationality'),
    birthDate: value('dateBorn'),
    height: value('strHeight'),
    image: player?.strThumb || '',
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function detailMarkup(label, value) {
  return `<div class="player-detail"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

export function playerCardMarkup(player) {
  const photoUrl = safeImageUrl(player.image);
  const photo = photoUrl
    ? `<img class="player-image" src="${escapeHtml(photoUrl)}" alt="Foto de ${escapeHtml(player.name)}">`
    : '<div class="player-image placeholder" aria-hidden="true">🏀</div>';

  return `
    <article class="player-card">
      <div class="player-photo">${photo}</div>
      <div class="player-data">
        <p class="player-kicker">Perfil do atleta</p>
        <h2>${escapeHtml(player.name)}</h2>
        <dl class="player-details">
          ${detailMarkup('Posição', player.position)}
          ${detailMarkup('Time', player.team)}
          ${detailMarkup('Nacionalidade', player.nationality)}
          ${detailMarkup('Nascimento', player.birthDate)}
          ${detailMarkup('Altura', player.height)}
        </dl>
      </div>
    </article>
  `;
}

function getElements() {
  return {
    form: document.getElementById('player-form'),
    input: document.getElementById('player-name'),
    button: document.getElementById('search-button'),
    result: document.getElementById('result'),
  };
}

function setMessage(result, message, state, icon = '⌕') {
  result.className = `result ${state}`;
  result.innerHTML = `<span class="result-icon" aria-hidden="true">${icon}</span><p>${escapeHtml(message)}</p>`;
}

async function getPlayer(term) {
  const response = await fetch(`${API_BASE_URL}${encodeURIComponent(term)}`);

  if (!response.ok) {
    throw new Error('service-unavailable');
  }

  const data = await response.json();
  const selected = selectBasketballPlayer(data.player);

  if (!selected) {
    throw new Error('not-found');
  }

  return normalizePlayer(selected);
}

function initializeApp() {
  const { form, input, button, result } = getElements();

  if (!form || !input || !button || !result) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const term = input.value.trim();

    if (!term) {
      setMessage(result, 'Digite o nome de um atleta para começar a busca.', 'empty');
      input.focus();
      return;
    }

    button.disabled = true;
    setMessage(result, 'Buscando perfil do atleta...', 'loading', '◌');

    try {
      const player = await getPlayer(term);
      result.className = 'result player-result';
      result.innerHTML = playerCardMarkup(player);
    } catch (error) {
      const message = error.message === 'not-found'
        ? 'Não encontramos esse atleta. Tente digitar o nome completo.'
        : 'A base de dados está indisponível no momento. Tente novamente em instantes.';
      setMessage(result, message, 'error', '!');
    } finally {
      button.disabled = false;
    }
  });
}

if (typeof document !== 'undefined') {
  initializeApp();
}
