import { describe, expect, test } from 'vitest';

import { formatLabel } from './format-label';
import { createOptionResolver, normalizeText } from './option-resolver';

describe('createOptionResolver', () => {
  test('une option primitive est sa propre valeur et son propre libellé', () => {
    const r = createOptionResolver({});

    expect(r.toEntry('Bordeaux')).toEqual({
      value: 'Bordeaux',
      label: 'Bordeaux',
      disabled: false,
      original: 'Bordeaux',
    });
  });

  test('un nombre devient un libellé texte sans perdre sa valeur', () => {
    const r = createOptionResolver({});
    const entry = r.toEntry(42);

    expect(entry.value).toBe(42);
    expect(entry.label).toBe('42');
  });

  test('un objet utilise sa clé `label` par défaut', () => {
    const r = createOptionResolver({});

    expect(r.toEntry({ label: 'Nantes', id: 2 }).label).toBe('Nantes');
  });

  test('les accesseurs lisent des chemins pointés', () => {
    const r = createOptionResolver({
      optionValue: 'meta.id',
      optionLabel: 'meta.nom',
      optionDisabled: 'meta.inactif',
    });
    const entry = r.toEntry({ meta: { id: 7, nom: 'Lyon', inactif: true } });

    expect(entry.value).toBe(7);
    expect(entry.label).toBe('Lyon');
    expect(entry.disabled).toBe(true);
  });

  // Un chemin qui ne mène à rien ne doit pas jeter : une option mal formée est
  // un cas de données, pas une erreur de programmation.
  test('un chemin absent rend undefined sans lever', () => {
    const r = createOptionResolver({ optionLabel: 'a.b.c' });

    expect(r.getField({ a: 1 }, 'a.b.c')).toBeUndefined();
    expect(r.toEntry({ a: 1 }).label).toBe('');
  });

  test('null et undefined ne sont pas des textes', () => {
    const r = createOptionResolver({});

    expect(r.asText(null)).toBeNull();
    expect(r.asText(undefined)).toBeNull();
    expect(r.asText(0)).toBe('0');
    expect(r.asText('')).toBe('');
  });

  // Sans `dataKey`, deux objets distincts ne sont jamais égaux, même
  // identiques : c'est ce qui casse une sélection rechargée depuis un serveur.
  test('sans dataKey, l’égalité entre objets est stricte', () => {
    const r = createOptionResolver({});

    expect(r.equals({ id: 1 }, { id: 1 })).toBe(false);
  });

  test('avec dataKey, deux objets se comparent par leur clé', () => {
    const r = createOptionResolver({ dataKey: 'id' });

    expect(r.equals({ id: 1, nom: 'a' }, { id: 1, nom: 'b' })).toBe(true);
    expect(r.equals({ id: 1 }, { id: 2 })).toBe(false);
  });

  test('dataKey ne s’applique pas aux primitives', () => {
    const r = createOptionResolver({ dataKey: 'id' });

    expect(r.equals('a', 'a')).toBe(true);
    expect(r.equals('a', 'b')).toBe(false);
  });

  test('la clé `disabled` d’un objet est reconnue sans accesseur', () => {
    const r = createOptionResolver({});

    expect(r.toEntry({ label: 'x', disabled: true }).disabled).toBe(true);
  });
});

describe('normalizeText', () => {
  test('ignore la casse et les diacritiques', () => {
    expect(normalizeText('Élève')).toBe('eleve');
    expect(normalizeText('CRÊPE')).toBe('crepe');
  });

  test('laisse un texte déjà normalisé intact', () => {
    expect(normalizeText('bordeaux')).toBe('bordeaux');
  });
});

describe('formatLabel', () => {
  test('remplace le jeton par la valeur', () => {
    expect(formatLabel('(+{0} autres)', 3)).toBe('(+3 autres)');
  });

  test('remplace toutes les occurrences', () => {
    expect(formatLabel('{0} sur {0}', 2)).toBe('2 sur 2');
  });

  // `String.replace` interpréterait `$&` : c'est la raison du split/join.
  test('une valeur contenant un $ n’est pas interprétée', () => {
    expect(formatLabel('prix : {0}', '$&12')).toBe('prix : $&12');
  });

  test('un libellé sans jeton passe tel quel', () => {
    expect(formatLabel('aucun jeton', 5)).toBe('aucun jeton');
  });
});
