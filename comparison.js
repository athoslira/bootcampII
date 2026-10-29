import { escapeHtml, playerKey } from './favorites.js';
import { normalizeStatsName } from './stats.js';

const METRICS = [
  { key: 'ppg', label: 'Pontos/jogo' },
  { key: 'rpg', label: 'Rebotes/jogo' },
  { key: 'apg', label: 'Assistências/jogo' },
  { key: 'spg', label: 'Roubos/jogo' },
  { key: 'bpg', label: 'Bloqueios/jogo' },
  { key: 'mpg', label: 'Minutos/jogo' },
  { key: 'fgPct', label: 'Aproveitamento de quadra', kind: 'percent' },
  { key: 'threePct', label: 'Aproveitamento de três', kind: 'percent' },
];

export function addPlayerToComparison(slots, player) {
  const next = [...slots];
  if (next.some((entry) => entry && playerKey(entry) === playerKey(player))) {
    return { slots: next, reason: 'duplicate' };
  }
  const emptyIndex = next.findIndex((entry) => entry == null);
  if (emptyIndex === -1) return { slots: next, reason: 'full' };
  next[emptyIndex] = player;
  return { slots: next, reason: null };
}

export function removePlayerFromComparison(slots, slotIndex) {
  return slots.map((player, index) => index === slotIndex ? null : player);
}

export function comparisonLeader(left, right, key) {
  const leftValue = left?.[key];
  const rightValue = right?.[key];
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return null;
  if (leftValue === rightValue) return 'tie';
  return leftValue > rightValue ? 'left' : 'right';
}

export function formatStat(value, kind = 'decimal') {
  if (!Number.isFinite(value)) return '—';
  const digits = kind === 'integer' ? 0 : 1;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return kind === 'percent' ? `${formatted}%` : formatted;
}

function profileMarkup(player, stats, slotIndex) {
  if (!player) {
    return `<div class="comparison-placeholder"><p>Selecione um atleta para o duelo</p></div>`;
  }
  const image = player.image?.startsWith('https://')
    ? `<img src="${escapeHtml(player.image)}" alt="Foto de ${escapeHtml(player.name)}">`
    : '<div class="avatar-fallback" aria-hidden="true">NBA</div>';
  return `<article class="comparison-profile">
    <div class="player-photo">${image}</div>
    <p class="team-code">${escapeHtml(player.team)}</p>
    <h3>${escapeHtml(player.name)}</h3>
    <p>${escapeHtml(player.position || 'Posição não informada')}</p>
    ${stats ? '' : '<p class="comparison-no-data">Sem dados na temporada</p>'}
    <button class="button-secondary" type="button" data-remove-comparison="${slotIndex}" aria-label="Remover ${escapeHtml(player.name)} do duelo">Remover</button>
  </article>`;
}

export function comparisonMarkup(slots, statsIndex) {
  const players = [slots[0] ?? null, slots[1] ?? null];
  const stats = players.map((player) => player ? statsIndex.get(normalizeStatsName(player.name)) ?? null : null);
  const profiles = players.map((player, index) => profileMarkup(player, stats[index], index)).join('');
  const rows = METRICS.map(({ key, label, kind }) => {
    const leader = comparisonLeader(stats[0], stats[1], key);
    const values = stats.map((entry) => entry?.[key]);
    const comparable = values.every(Number.isFinite);
    const maximum = comparable ? Math.max(0, ...values) : 0;
    const valueCell = (index, side) => {
      const width = maximum > 0 ? Math.min(100, Math.max(0, values[index] / maximum * 100)) : 0;
      const bar = comparable ? `<span class="metric-bar" aria-hidden="true" style="width:${width}%"></span>` : '';
      return `<td${leader === side ? ' class="is-leading"' : ''}>${formatStat(values[index], kind)}${bar}</td>`;
    };
    return `<tr><th scope="row">${label}</th>${valueCell(0, 'left')}${valueCell(1, 'right')}</tr>`;
  }).join('');
  return `<div class="comparison-profiles">${profiles}</div>
    <table class="comparison-table">
      <caption>Estatísticas da temporada por atleta</caption>
      <thead><tr><th scope="col">Estatística</th><th scope="col">${escapeHtml(players[0]?.name || 'Atleta 1')}</th><th scope="col">${escapeHtml(players[1]?.name || 'Atleta 2')}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
