import { expect, test } from 'vitest';

import { getFieldPath } from './get-field-path';

test('lit un champ simple', () => {
  expect(getFieldPath({ nom: 'Bordeaux' }, 'nom')).toBe('Bordeaux');
});

test('lit un chemin pointé', () => {
  expect(getFieldPath({ ville: { pays: { code: 'FR' } } }, 'ville.pays.code')).toBe('FR');
});

test('un segment manquant rend undefined plutôt que de lever', () => {
  expect(getFieldPath({ ville: null }, 'ville.pays.code')).toBeUndefined();
  expect(getFieldPath({}, 'a.b')).toBeUndefined();
});

test('une cible non objet ou un chemin vide rendent undefined', () => {
  expect(getFieldPath('Bordeaux', 'length')).toBeUndefined();
  expect(getFieldPath(null, 'nom')).toBeUndefined();
  expect(getFieldPath({ nom: 'x' }, undefined)).toBeUndefined();
});

// Une valeur fausse n'est pas une valeur absente : le tri et l'égalité en
// dépendent.
test('une valeur falsy est rendue telle quelle', () => {
  expect(getFieldPath({ n: 0 }, 'n')).toBe(0);
  expect(getFieldPath({ b: false }, 'b')).toBe(false);
  expect(getFieldPath({ s: '' }, 's')).toBe('');
});
