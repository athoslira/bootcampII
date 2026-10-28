import test from 'node:test';
import assert from 'node:assert/strict';
import { favoriteCardMarkup, playerKey, toFavoriteRecord } from '../favorites.js';
import { assertFavoriteId, assertFavoriteRecord } from '../supabase.js';

const player = {
  name: 'Victor Wembanyama',
  team: 'San Antonio Spurs',
  position: 'FC',
  height: `7'4"`,
  weight: '235 lb',
  college: 'Não informado',
  image: 'https://cdn.example/victor.png',
};

test('playerKey cria uma chave estável a partir de nome e equipe', () => {
  assert.equal(playerKey(player), 'victor-wembanyama--san-antonio-spurs');
});

test('toFavoriteRecord traduz o atleta para as colunas do Supabase', () => {
  assert.deepEqual(toFavoriteRecord(player), {
    chave_atleta: 'victor-wembanyama--san-antonio-spurs',
    nome: 'Victor Wembanyama',
    equipe: 'San Antonio Spurs',
    posicao: 'FC',
    altura: `7'4"`,
    peso: '235 lb',
    faculdade: 'Não informado',
    imagem_url: 'https://cdn.example/victor.png',
  });
});

test('favoriteCardMarkup escapa conteúdo remoto e inclui ação de remoção', () => {
  const html = favoriteCardMarkup({
    ...toFavoriteRecord(player),
    id: 7,
    nome: '<img onerror=alert(1)>',
  });

  assert.match(html, /data-remove-favorite="7"/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img onerror/);
});

test('assertFavoriteRecord rejeita favorito sem chave', () => {
  assert.throws(() => assertFavoriteRecord({ nome: 'A' }), /chave_atleta/);
});

test('assertFavoriteId aceita somente identificador positivo', () => {
  assert.equal(assertFavoriteId(4), 4);
  assert.throws(() => assertFavoriteId(0), /identificador/i);
});
