const NUMERIC_COLUMNS = new Set([
  'wins', 'losses', 'minutes_played', 'one_point_made', 'one_point_attempted',
  'two_point_made', 'two_point_attempted', 'three_point_made',
  'three_point_attempted', 'offensive_rebounds', 'defensive_rebounds',
  'assists', 'steals', 'blocks',
]);

export function normalizeStatsName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b([a-z])\s+([a-z])\b/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

export function parseStatsCsv(csv) {
  const lines = String(csv ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => {
      const value = values[index] ?? '';
      if (NUMERIC_COLUMNS.has(header) && value.trim() !== '') {
        const number = Number(value);
        return [header, Number.isNaN(number) ? value : number];
      }
      return [header, value];
    }));
  });
}

function safeRate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function sum(rows, fields) {
  let foundValue = false;
  const total = rows.reduce((sumTotal, row) => sumTotal + fields.reduce((part, field) => {
    const rawValue = row[field];
    if (rawValue === undefined || rawValue === null || rawValue === '') return part;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return part;
    foundValue = true;
    return part + value;
  }, 0), 0);
  return foundValue ? total : null;
}

function calculateFromTotals(totals) {
  const games = totals.wins + totals.losses;
  if (games <= 0) return null;
  const points = sum([totals], ['one_point_made', 'two_point_made', 'three_point_made']);
  const twoMade = sum([totals], ['two_point_made']);
  const threeMade = sum([totals], ['three_point_made']);
  const twoAttempted = sum([totals], ['two_point_attempted']);
  const threeAttempted = sum([totals], ['three_point_attempted']);
  const rebound = sum([totals], ['offensive_rebounds', 'defensive_rebounds']);
  const perGame = (value) => value === null ? null : value / games;
  const fgMade = twoMade === null || threeMade === null ? null : twoMade + threeMade;
  const fgAttempted = twoAttempted === null || threeAttempted === null ? null : twoAttempted + threeAttempted;
  const fgRate = fgMade === null || fgAttempted === null ? null : safeRate(fgMade, fgAttempted);
  const threeRate = threeMade === null || threeAttempted === null ? null : safeRate(threeMade, threeAttempted);
  return {
    games,
    ppg: points === null ? null : ((totals.one_point_made ?? 0) + 2 * (twoMade ?? 0) + 3 * (threeMade ?? 0)) / games,
    rpg: perGame(rebound),
    apg: perGame(totals.assists),
    spg: perGame(totals.steals),
    bpg: perGame(totals.blocks),
    mpg: perGame(totals.minutes_played),
    fgPct: fgRate === null ? null : fgRate * 100,
    threePct: threeRate === null ? null : threeRate * 100,
  };
}

export function calculatePlayerStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const fields = ['wins', 'losses', 'minutes_played', 'one_point_made', 'two_point_made', 'two_point_attempted', 'three_point_made', 'three_point_attempted', 'offensive_rebounds', 'defensive_rebounds', 'assists', 'steals', 'blocks'];
  const totals = Object.fromEntries(fields.map((field) => [field, sum(rows, [field])]));
  totals.wins ??= 0;
  totals.losses ??= 0;
  return calculateFromTotals(totals);
}

export function createStatsIndex(rows) {
  const groups = new Map();
  for (const row of rows ?? []) {
    const name = normalizeStatsName(row.player_name);
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  return new Map([...groups].map(([name, group]) => [name, calculatePlayerStats(group)]).filter(([, stats]) => stats !== null));
}
