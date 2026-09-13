import test from 'node:test';
import assert from 'node:assert/strict';
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
