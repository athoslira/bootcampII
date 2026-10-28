export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]
  ));
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function playerKey(player) {
  return `${slug(player.name)}--${slug(player.team)}`;
}

export function toFavoriteRecord(player) {
  return {
    chave_atleta: playerKey(player),
    nome: player.name,
    equipe: player.team,
    posicao: player.position || null,
    altura: player.height || null,
    peso: player.weight || null,
    faculdade: player.college || null,
    imagem_url: player.image || null,
  };
}

export function favoriteKeySet(favorites) {
  return new Set(favorites.map(({ chave_atleta: key }) => key));
}

export function favoriteCardMarkup(favorite) {
  const image = favorite.imagem_url?.startsWith('https://')
    ? `<img src="${escapeHtml(favorite.imagem_url)}" alt="Foto de ${escapeHtml(favorite.nome)}">`
    : '<div class="avatar-fallback" aria-hidden="true">NBA</div>';

  return `<article class="favorite-row" data-favorite-key="${escapeHtml(favorite.chave_atleta)}">
    <div class="player-photo">${image}</div>
    <div class="favorite-copy">
      <p class="team-code">${escapeHtml(favorite.equipe)}</p>
      <h3>${escapeHtml(favorite.nome)}</h3>
      <p>${escapeHtml(favorite.posicao || 'Posição não informada')}</p>
    </div>
    <button class="button-secondary" type="button" data-remove-favorite="${escapeHtml(favorite.id)}">Remover</button>
  </article>`;
}
