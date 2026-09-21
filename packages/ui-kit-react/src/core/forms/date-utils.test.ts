import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  finalizeParsed,
  firstOfMonth,
  isSameDay,
  normalizeDateInput,
  parseIsoDate,
  parseIsoDateTime,
  startOfDay,
  toIsoDate,
  toIsoDateTime,
} from './date-utils';

describe('startOfDay', () => {
  it('remet l’heure a zero sans muter son entree', () => {
    const entree = new Date(2024, 5, 15, 13, 45, 30, 500);
    const resultat = startOfDay(entree);
    expect(resultat.getHours()).toBe(0);
    expect(resultat.getMinutes()).toBe(0);
    expect(resultat.getSeconds()).toBe(0);
    expect(resultat.getMilliseconds()).toBe(0);
    expect(resultat.getDate()).toBe(15);
    expect(entree.getHours()).toBe(13);
  });
});

describe('firstOfMonth', () => {
  it('renvoie le 1er du mois de la date donnee', () => {
    const resultat = firstOfMonth(new Date(2024, 5, 15));
    expect([resultat.getFullYear(), resultat.getMonth(), resultat.getDate()]).toEqual([2024, 5, 1]);
  });
});

describe('isSameDay', () => {
  it('est vrai pour deux dates du meme jour, quelle que soit l’heure', () => {
    expect(isSameDay(new Date(2024, 5, 15, 1), new Date(2024, 5, 15, 23))).toBe(true);
  });

  it('est faux pour deux jours differents', () => {
    expect(isSameDay(new Date(2024, 5, 15), new Date(2024, 5, 16))).toBe(false);
  });

  it('est faux des qu’un cote est absent', () => {
    expect(isSameDay(null, new Date())).toBe(false);
    expect(isSameDay(new Date(), undefined)).toBe(false);
    expect(isSameDay(null, undefined)).toBe(false);
  });
});

describe('addDays', () => {
  it('ajoute des jours sans muter son entree', () => {
    const entree = new Date(2024, 0, 30);
    const resultat = addDays(entree, 3);
    expect(resultat.getMonth()).toBe(1);
    expect(resultat.getDate()).toBe(2);
    expect(entree.getDate()).toBe(30);
  });

  it('accepte un decalage negatif', () => {
    const resultat = addDays(new Date(2024, 0, 1), -1);
    expect([resultat.getFullYear(), resultat.getMonth(), resultat.getDate()]).toEqual([
      2023, 11, 31,
    ]);
  });
});

describe('addMonths', () => {
  // Ancre sur le 1er justement pour eviter l'ambiguite du debordement JS :
  // « 31 janvier + 1 mois » basculerait en mars, pas en fevrier.
  it('renvoie le 1er du mois vise', () => {
    const resultat = addMonths(new Date(2024, 0, 31), 1);
    expect([resultat.getFullYear(), resultat.getMonth(), resultat.getDate()]).toEqual([2024, 1, 1]);
  });

  it('franchit la limite d’annee', () => {
    const resultat = addMonths(new Date(2024, 11, 1), 1);
    expect([resultat.getFullYear(), resultat.getMonth()]).toEqual([2025, 0]);
  });
});

describe('finalizeParsed', () => {
  it('construit une date a partir de composantes valides', () => {
    const r = finalizeParsed(2024, 5, 15, 13, 30);
    expect(r).not.toBeNull();
    expect([r?.getFullYear(), r?.getMonth(), r?.getDate(), r?.getHours(), r?.getMinutes()]).toEqual(
      [2024, 5, 15, 13, 30],
    );
  });

  it('refuse une composante hors bornes', () => {
    expect(finalizeParsed(2024, 12, 1, 0, 0)).toBeNull();
    expect(finalizeParsed(2024, 0, 32, 0, 0)).toBeNull();
    expect(finalizeParsed(2024, 0, 1, 24, 0)).toBeNull();
    expect(finalizeParsed(2024, 0, 1, 0, 60)).toBeNull();
  });

  // `new Date(2024, 1, 31)` bascule en silence au 2 mars : la relecture des
  // composantes est ce qui rattrape le debordement.
  it('refuse un jour qui deborde sur le mois suivant (31 fevrier)', () => {
    expect(finalizeParsed(2024, 1, 31, 0, 0)).toBeNull();
  });
});

describe('toIsoDate / toIsoDateTime', () => {
  it('serialise depuis les composantes locales, sur deux chiffres', () => {
    expect(toIsoDate(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(toIsoDateTime(new Date(2024, 0, 5, 9, 5))).toBe('2024-01-05T09:05');
  });

  // Le piege que `toIsoString()` poserait : minuit local un 1er janvier tombe
  // la veille en UTC des que le fuseau est a l'est de Greenwich.
  it('ne decale pas le jour, quel que soit le fuseau', () => {
    expect(toIsoDate(new Date(2024, 0, 1, 0, 0))).toBe('2024-01-01');
    expect(toIsoDate(new Date(2024, 0, 1, 23, 59))).toBe('2024-01-01');
  });
});

describe('parseIsoDate', () => {
  it('lit une chaine "yyyy-MM-dd" bien formee', () => {
    const r = parseIsoDate('2024-06-15');
    expect([r?.getFullYear(), r?.getMonth(), r?.getDate()]).toEqual([2024, 5, 15]);
  });

  it('renvoie null pour une chaine malformee', () => {
    expect(parseIsoDate('15/06/2024')).toBeNull();
    expect(parseIsoDate('not-a-date')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  it('renvoie null pour une date qui deborde', () => {
    expect(parseIsoDate('2024-02-30')).toBeNull();
  });

  it('fait l’aller-retour avec toIsoDate', () => {
    const date = new Date(2024, 5, 15);
    expect(parseIsoDate(toIsoDate(date))?.getTime()).toBe(startOfDay(date).getTime());
  });
});

describe('parseIsoDateTime', () => {
  it('lit une chaine "yyyy-MM-ddTHH:mm" bien formee', () => {
    const r = parseIsoDateTime('2024-06-15T09:05');
    expect([r?.getHours(), r?.getMinutes()]).toEqual([9, 5]);
  });

  it('renvoie null sans partie horaire, ou hors bornes', () => {
    expect(parseIsoDateTime('2024-06-15')).toBeNull();
    expect(parseIsoDateTime('2024-06-15T25:00')).toBeNull();
  });
});

describe('normalizeDateInput', () => {
  it('rend une Date telle quelle', () => {
    const date = new Date(2024, 5, 15);
    expect(normalizeDateInput(date)).toBe(date);
  });

  it('lit une chaine ISO valide', () => {
    expect(normalizeDateInput('2024-06-15')?.getFullYear()).toBe(2024);
  });

  it('degrade en null sans lever, pour une entree vide ou illisible', () => {
    expect(normalizeDateInput(null)).toBeNull();
    expect(normalizeDateInput(undefined)).toBeNull();
    expect(normalizeDateInput('')).toBeNull();
    expect(normalizeDateInput('not-a-date')).toBeNull();
  });
});
