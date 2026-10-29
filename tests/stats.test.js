import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePlayerStats,
  createStatsIndex,
  normalizeStatsName,
  parseStatsCsv,
} from '../stats.js';

test('normalizeStatsName remove pontuação, acento e espaços extras', () => {
  assert.equal(normalizeStatsName("  D'Angelo   Russell  "), 'd angelo russell');
  assert.equal(normalizeStatsName('Nikola Jokić'), 'nikola jokic');
});

test('parseStatsCsv respeita vírgula dentro de campo entre aspas', () => {
  const [row] = parseStatsCsv('player_name,team,wins,losses\n"Smith, Jr.",BOS,2,1');
  assert.equal(row.player_name, 'Smith, Jr.');
  assert.equal(row.wins, 2);
});

test('calculatePlayerStats produz médias e percentuais', () => {
  const stats = calculatePlayerStats([{
    wins: 2, losses: 2, minutes_played: 120,
    one_point_made: 8, two_point_made: 20, two_point_attempted: 40,
    three_point_made: 4, three_point_attempted: 10,
    offensive_rebounds: 4, defensive_rebounds: 16,
    assists: 12, steals: 4, blocks: 2,
  }]);
  assert.deepEqual(stats, {
    games: 4, ppg: 15, rpg: 5, apg: 3, spg: 1, bpg: 0.5,
    mpg: 30, fgPct: 48, threePct: 40,
  });
});

test('calculatePlayerStats retorna null sem jogos e preserva divisão impossível', () => {
  assert.equal(calculatePlayerStats([{ wins: 0, losses: 0 }]), null);
});

test('createStatsIndex agrega linhas com o mesmo nome', () => {
  const index = createStatsIndex([
    { player_name: 'A.J. Lawson', wins: 1, losses: 0, one_point_made: 2 },
    { player_name: 'AJ Lawson', wins: 1, losses: 0, one_point_made: 4 },
  ]);
  assert.equal(index.size, 1);
  assert.equal(index.get('aj lawson').games, 2);
  assert.equal(index.get('aj lawson').ppg, 3);
});
