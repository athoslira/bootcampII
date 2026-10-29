import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPlayerToComparison,
  comparisonLeader,
  comparisonMarkup,
  formatStat,
  removePlayerFromComparison,
} from '../comparison.js';

const left = { name: 'Nikola Jokić', team: 'Denver Nuggets', position: 'C', image: '' };
const right = { name: 'Luka Dončić', team: 'Los Angeles Lakers', position: 'G', image: '' };
const stats = new Map([
  ['nikola jokic', { games: 4, ppg: 20, rpg: 10, apg: 8, spg: 1, bpg: 1, mpg: 30, fgPct: 60, threePct: 40 }],
  ['luka doncic', { games: 4, ppg: 25, rpg: 8, apg: 9, spg: 1, bpg: 0.5, mpg: 34, fgPct: 55, threePct: 38 }],
]);

test('addPlayerToComparison preenche slots sem duplicar ou substituir', () => {
  const original = [null, null];
  const first = addPlayerToComparison(original, left);
  const second = addPlayerToComparison(first.slots, right);
  assert.deepEqual(original, [null, null]);
  assert.deepEqual(first.slots, [left, null]);
  assert.equal(first.reason, null);
  assert.deepEqual(second.slots, [left, right]);
  const duplicate = addPlayerToComparison(second.slots, { ...left, name: 'Nikola Jokic' });
  assert.equal(duplicate.reason, 'duplicate');
  assert.deepEqual(duplicate.slots, [left, right]);
  const full = addPlayerToComparison(second.slots, { name: 'A', team: 'B' });
  assert.equal(full.reason, 'full');
  assert.deepEqual(full.slots, [left, right]);
});

test('addPlayerToComparison reaproveita somente o slot vazio', () => {
  assert.deepEqual(addPlayerToComparison([null, right], left).slots, [left, right]);
});

test('removePlayerFromComparison limpa somente o slot solicitado sem mutar a entrada', () => {
  const slots = [left, right];
  assert.deepEqual(removePlayerFromComparison(slots, 0), [null, right]);
  assert.deepEqual(removePlayerFromComparison(slots, 1), [left, null]);
  assert.deepEqual(slots, [left, right]);
  assert.deepEqual(removePlayerFromComparison(slots, -1), slots);
  assert.deepEqual(removePlayerFromComparison(slots, 2), slots);
});

test('comparisonLeader identifica os dois líderes, empate e zero válido', () => {
  assert.equal(comparisonLeader({ ppg: 20 }, { ppg: 10 }, 'ppg'), 'left');
  assert.equal(comparisonLeader({ ppg: 10 }, { ppg: 20 }, 'ppg'), 'right');
  assert.equal(comparisonLeader({ ppg: 10 }, { ppg: 10 }, 'ppg'), 'tie');
  assert.equal(comparisonLeader({ ppg: 0 }, { ppg: 0 }, 'ppg'), 'tie');
});

test('comparisonLeader não declara vencedor quando falta um número finito', () => {
  for (const value of [null, undefined, NaN, Infinity, '20']) {
    assert.equal(comparisonLeader({ ppg: value }, { ppg: 10 }, 'ppg'), null);
    assert.equal(comparisonLeader({ ppg: 10 }, { ppg: value }, 'ppg'), null);
  }
  assert.equal(comparisonLeader(null, { ppg: 10 }, 'ppg'), null);
  assert.equal(comparisonLeader({ ppg: 10 }, null, 'ppg'), null);
});

test('formatStat aplica decimal, percentual, inteiro e zero', () => {
  assert.equal(formatStat(12.34), '12,3');
  assert.equal(formatStat(48, 'percent'), '48,0%');
  assert.equal(formatStat(4, 'integer'), '4');
  assert.equal(formatStat(0), '0,0');
});

test('formatStat usa traço para valores ausentes ou não finitos', () => {
  for (const value of [null, undefined, NaN, Infinity, '20']) {
    assert.equal(formatStat(value), '—');
    assert.equal(formatStat(value, 'percent'), '—');
  }
});

test('comparisonMarkup mostra perfis, oito métricas e vencedor de cada linha', () => {
  const html = comparisonMarkup([left, right], stats);
  assert.match(html, /Nikola Jokić/);
  assert.match(html, /Luka Dončić/);
  assert.match(html, /Denver Nuggets/);
  assert.match(html, /data-remove-comparison="0"/);
  assert.match(html, /data-remove-comparison="1"/);
  for (const label of ['Pontos/jogo', 'Rebotes/jogo', 'Assistências/jogo', 'Roubos/jogo', 'Bloqueios/jogo', 'Minutos/jogo', 'Aproveitamento de quadra', 'Aproveitamento de três']) {
    assert.ok(html.includes(label), label);
  }
  assert.equal((html.match(/<tbody>[\s\S]*<\/tbody>/)?.[0].match(/<tr>/g) ?? []).length, 8);
  assert.match(html, /class="is-leading">25,0<\/td>/);
  assert.match(html, /class="is-leading">10,0<\/td>/);
  assert.match(html, /60,0%/);
  assert.equal((html.match(/class="is-leading"/g) ?? []).length, 7);
  assert.doesNotMatch(html, /Sem dados na temporada/);
});

test('comparisonMarkup renderiza slots vazios sem remoção ou vencedor', () => {
  const html = comparisonMarkup([null, null], stats);
  assert.equal((html.match(/comparison-placeholder/g) ?? []).length, 2);
  assert.doesNotMatch(html, /data-remove-comparison|is-leading/);
});

test('comparisonMarkup mantém ausência de dados explícita sem declarar vencedor', () => {
  const html = comparisonMarkup([left, right], new Map([['nikola jokic', stats.get('nikola jokic')]]));
  assert.match(html, /Sem dados na temporada/);
  assert.match(html, /20,0/);
  assert.match(html, /—/);
  assert.doesNotMatch(html, /is-leading/);
});

test('comparisonMarkup escapa todos os campos remotos e atributos de imagem', () => {
  const html = comparisonMarkup([{
    name: '<img onerror=alert(1)>',
    team: '<script>bad()</script>',
    position: '\" autofocus onfocus=alert(1)',
    image: 'https://cdn.example/a\" onerror=\"alert(1)',
  }, right], stats);
  assert.match(html, /&lt;img onerror/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot; autofocus/);
  assert.match(html, /src="https:\/\/cdn.example\/a&quot; onerror=&quot;alert\(1\)"/);
  assert.doesNotMatch(html, /<img onerror|<script>|src="[^"]*" onerror=/);
});

test('comparisonMarkup rejeita esquema de imagem inseguro', () => {
  const html = comparisonMarkup([{ ...left, image: 'javascript:alert(1)' }, null], stats);
  assert.doesNotMatch(html, /javascript:|<img/);
  assert.match(html, /avatar-fallback/);
});
