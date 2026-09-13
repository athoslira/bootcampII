import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlayer, selectBasketballPlayer } from '../script.js';

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
