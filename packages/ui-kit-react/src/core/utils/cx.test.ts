import { expect, test } from 'vitest';

import { cx } from './cx';

test('concatène en ignorant les valeurs fausses', () => {
  expect(cx('ui-button', '_high')).toBe('ui-button _high');
  expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  expect(cx()).toBe('');
});

test('un conditionnel s’écrit avec &&', () => {
  const loading = true;
  const disabled = false;
  expect(cx('ui-button', loading && '_loading', disabled && '_disabled')).toBe(
    'ui-button _loading',
  );
});

test('aplatit les tableaux, à toute profondeur', () => {
  expect(cx(['a', ['b', ['c']]], 'd')).toBe('a b c d');
  expect(cx(['a', false, ['', null]], 'b')).toBe('a b');
});

test('garde le zéro, qui est une classe légitime', () => {
  // Le piège classique d'une implémentation naïve : `0` est faux, mais `_0`
  // est un nom de classe valide (une échelle qui commence à zéro).
  expect(cx('col', 0)).toBe('col 0');
});

test('la classe de l’appelant passe en dernier, donc elle gagne', () => {
  expect(cx('ui-icon', '_lg', 'ma-classe')).toBe('ui-icon _lg ma-classe');
});
