import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiDatepicker, type DatepickerValue } from './ui-datepicker';

/** Une date fixe : un test parti de « aujourd'hui » se casserait un 31 du mois. */
const JUILLET = new Date(2026, 6, 8);

type Ecran = { container: HTMLElement };

const panneau = (s: Ecran) => s.container.querySelector('.ui-datepicker-panel') as HTMLElement;
const champ = (s: Ecran) => s.container.querySelector('.ui-datepicker-input') as HTMLInputElement;
const bascule = (s: Ecran) => s.container.querySelector('.ui-datepicker-toggle') as HTMLElement;
const jours = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-datepicker-day')] as HTMLButtonElement[];
const jour = (s: Ecran, texte: string) =>
  jours(s).find((j) => j.textContent === texte && !j.classList.contains('_other-month'))!;
const titre = (s: Ecran) => s.container.querySelector('.ui-datepicker-title') as HTMLButtonElement;
const cellules = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-datepicker-cell')] as HTMLButtonElement[];

function Demo(props: Partial<React.ComponentProps<typeof UiDatepicker>> = {}) {
  return <UiDatepicker label="Date" valueType="date" locale="fr-FR" {...props} />;
}

/** Harnais controle : c'est ce qui rend le cycle de valeur observable. */
function DemoControlee({
  initial = null,
  ...props
}: Partial<React.ComponentProps<typeof UiDatepicker>> & { initial?: DatepickerValue }) {
  const [value, setValue] = useState<DatepickerValue>(initial);
  return (
    <Demo
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

/**
 * Frappe sur un `<input>` controle par React : passer par le setter natif,
 * sinon React ne voit jamais le changement (il compare a sa propre valeur).
 */
async function taper(el: HTMLInputElement, texte: string, curseur?: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, texte);
  const pos = curseur ?? texte.length;
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// --- Panneau ---------------------------------------------------------------

test('fermé, le panneau n’occupe aucune place à l’écran', async () => {
  const screen = await render(<Demo />);

  expect(panneau(screen).hasAttribute('open')).toBe(false);
  // La VISIBILITÉ, pas seulement l'état : le `display: none` d'un `<dialog>`
  // fermé est de niveau navigateur, qu'un `display` d'auteur bat en silence.
  expect(getComputedStyle(panneau(screen)).display).toBe('none');
  expect(panneau(screen).getBoundingClientRect().width).toBe(0);
});

test('la bascule ouvre le panneau, et le cycle ouvrir / fermer / rouvrir tient', async () => {
  const screen = await render(<Demo />);

  await bascule(screen).click();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);
  expect(champ(screen)).toHaveAttribute('aria-expanded', 'true');

  await bascule(screen).click();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(false);

  await bascule(screen).click();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);
});

test('le panneau modal porte aria-modal et piège le focus dans la grille', async () => {
  const screen = await render(<Demo defaultValue={JUILLET} />);

  await bascule(screen).click();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);

  expect(panneau(screen)).toHaveAttribute('aria-modal', 'true');
  // Ouvert par l'icône : « je veux la grille », donc le focus y file.
  await expect
    .poll(() => document.activeElement?.classList.contains('ui-datepicker-day'))
    .toBe(true);
});

test('showOnFocus rend le panneau non modal et le laisse hors du flux de focus', async () => {
  const screen = await render(<Demo showOnFocus />);

  // Un popover, pas un dialogue : le champ reste vivant dessous.
  expect(panneau(screen).tagName).toBe('DIV');
  expect(panneau(screen)).not.toHaveAttribute('aria-modal');

  await champ(screen).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  // Le focus n'a pas bougé : ouvrir en conséquence d'un focus et déplacer ce
  // focus serait un changement de contexte au sens de WCAG 3.2.1.
  expect(document.activeElement).toBe(champ(screen));
});

test('un focus programmatique n’ouvre pas le panneau de showOnFocus', async () => {
  const screen = await render(<Demo showOnFocus />);

  champ(screen).focus();
  await new Promise((r) => setTimeout(r, 50));

  expect(panneau(screen).matches(':popover-open')).toBe(false);
});

// --- Valeur et types -------------------------------------------------------

test('en valueType date, la valeur émise est une Date ramenée à minuit', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={JUILLET} onValueChange={onValueChange} />);

  await bascule(screen).click();
  await jour(screen, '15').click();

  const emis = onValueChange.mock.calls.at(-1)?.[0];
  expect(emis).toBeInstanceOf(Date);
  expect((emis as Date).getHours()).toBe(0);
  expect((emis as Date).getDate()).toBe(15);
});

test('en valueType iso, la valeur émise est une chaîne yyyy-MM-dd', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee valueType="iso" initial="2026-07-08" onValueChange={onValueChange} />,
  );

  await bascule(screen).click();
  await jour(screen, '15').click();

  expect(onValueChange.mock.calls.at(-1)?.[0]).toBe('2026-07-15');
});

test('l’entrée accepte une Date même en valueType iso', async () => {
  const screen = await render(<Demo valueType="iso" defaultValue={JUILLET} />);

  expect(champ(screen).value).toContain('08');
  expect(champ(screen).value).toContain('2026');
});

test('la valeur émise n’est jamais la référence interne', async () => {
  const onValueChange = vi.fn();
  const origine = new Date(2026, 6, 8);
  const screen = await render(<DemoControlee initial={origine} onValueChange={onValueChange} />);

  await bascule(screen).click();
  await jour(screen, '15').click();

  const emis = onValueChange.mock.calls.at(-1)?.[0] as Date;
  // Muter ce qui sort ne doit pas pouvoir désynchroniser le composant.
  emis.setFullYear(1999);
  await expect.poll(() => champ(screen).value).toContain('2026');
});

// --- Amorçage de la vue ----------------------------------------------------

test('un calendrier en ligne affiche le mois de sa valeur, pas le mois courant', async () => {
  const screen = await render(<Demo inline defaultValue={JUILLET} />);

  // Sans amorçage depuis la valeur, un calendrier en ligne resterait sur le
  // mois du jour : il ne passe par aucune ouverture, seul autre point d'amorce.
  expect(titre(screen).textContent).toBe('Juillet 2026');
  expect(
    screen.container.querySelector('.ui-datepicker-day._selected')?.getAttribute('aria-label'),
  ).toBe('8 juillet 2026');
});

// --- Saisie manuelle -------------------------------------------------------

test('le masque insère les « / » pendant la construction d’une date', async () => {
  const screen = await render(<DemoControlee />);
  const el = champ(screen);

  el.focus();
  for (const [texte, curseur] of [
    ['0', 1],
    ['08', 2],
    ['08/0', 4],
    ['08/07', 5],
    ['08/07/2', 7],
    ['08/07/20', 8],
    ['08/07/202', 9],
    ['08/07/2026', 10],
  ] as [string, number][]) {
    await taper(el, texte, curseur);
    await new Promise((r) => setTimeout(r, 20));
  }

  await expect.poll(() => el.value).toBe('08/07/2026');
});

test('éditer un segment sur place ne décale pas les chiffres qui suivent', async () => {
  const screen = await render(<DemoControlee />);
  const el = champ(screen);

  el.focus();
  await taper(el, '08072026');
  await expect.poll(() => el.value).toBe('08/07/2026');

  // On remplace le mois « 07 » par un seul « 1 ». Sans la suspension du
  // masque, « 08/07/2026 » devenait « 08/12/026 » : l'année perdait un chiffre.
  await taper(el, '08/1/2026', 4);

  await expect.poll(() => el.value).toBe('08/1/2026');
});

test('le masque se réarme dès que le champ se lit vide', async () => {
  const screen = await render(<DemoControlee />);
  const el = champ(screen);

  el.focus();
  await taper(el, '08072026');
  await expect.poll(() => el.value).toBe('08/07/2026');

  await taper(el, '', 0);
  await expect.poll(() => el.value).toBe('');

  // Pas de flou entre les deux : le rearmement ne doit pas attendre un
  // enregistrement qui peut ne jamais venir.
  await taper(el, '0', 1);
  await taper(el, '15', 2);
  await expect.poll(() => el.value).toBe('15/');
});

test('le texte tapé est lu au flou, et une saisie illisible revient en arrière', async () => {
  const screen = await render(<DemoControlee initial={JUILLET} />);
  const el = champ(screen);
  const affiche = el.value;

  el.focus();
  await taper(el, 'pas une date');
  el.blur();

  await expect.poll(() => champ(screen).value).toBe(affiche);
});

test('range se tape dans un seul champ, et les dates sont remises dans l’ordre', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee selectionMode="range" onValueChange={onValueChange} />,
  );
  const el = champ(screen);

  el.focus();
  // Tapées à l'envers : la fin avant le début.
  await taper(el, '18/07/2026 - 08/07/2026');
  el.blur();

  await expect.poll(() => Array.isArray(onValueChange.mock.calls.at(-1)?.[0])).toBe(true);
  const emis = onValueChange.mock.calls.at(-1)?.[0] as Date[];
  expect(emis).toHaveLength(2);
  expect(emis[0]!.getDate()).toBe(8);
  expect(emis[1]!.getDate()).toBe(18);
});

test('multiple se tape en liste, doublons fondus', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee selectionMode="multiple" onValueChange={onValueChange} />,
  );
  const el = champ(screen);

  el.focus();
  await taper(el, '08/07/2026, 15/07/2026, 08/07/2026');
  el.blur();

  await expect.poll(() => (onValueChange.mock.calls.at(-1)?.[0] as Date[])?.length).toBe(2);
});

test('un champ tapable n’ouvre pas le panneau au clic, l’icône et le clavier le font', async () => {
  const screen = await render(<Demo />);

  // Le panneau avalerait les clics suivants sur le champ : corriger un segment
  // à la souris deviendrait impossible.
  await champ(screen).click();
  await new Promise((r) => setTimeout(r, 80));
  expect(panneau(screen).hasAttribute('open')).toBe(false);

  await bascule(screen).click();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);
});

test('un champ non tapable, lui, ouvre au clic : il est le bouton', async () => {
  const screen = await render(<Demo allowInput={false} />);

  await champ(screen).click();

  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);
});

// --- Sélection -------------------------------------------------------------

test('range : un premier clic pose le début sans dessiner de zone', async () => {
  const screen = await render(
    <DemoControlee
      selectionMode="range"
      inline
      initial={[new Date(2026, 6, 8), new Date(2026, 6, 18)]}
    />,
  );

  expect(panneau(screen).classList.contains('_range-complete')).toBe(true);

  await jour(screen, '22').click();

  // Un début seul n'est pas une zone : la bande doit disparaître, sinon elle
  // filerait vers une fin qui n'existe pas encore.
  await expect.poll(() => panneau(screen).classList.contains('_range-complete')).toBe(false);
  expect(jours(screen).filter((j) => j.classList.contains('_in-range'))).toHaveLength(0);
});

test('multiple : un clic sur une date déjà choisie la retire', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee
      selectionMode="multiple"
      inline
      initial={[new Date(2026, 6, 8), new Date(2026, 6, 15)]}
      onValueChange={onValueChange}
    />,
  );

  await jour(screen, '15').click();

  await expect.poll(() => (onValueChange.mock.calls.at(-1)?.[0] as Date[])?.length).toBe(1);
});

test('les contraintes désactivent les cellules, en Date comme en ISO', async () => {
  const screen = await render(
    <Demo inline defaultValue={JUILLET} minDate="2026-07-05" maxDate={new Date(2026, 6, 20)} />,
  );

  expect(jour(screen, '3').disabled).toBe(true);
  expect(jour(screen, '10').disabled).toBe(false);
  expect(jour(screen, '25').disabled).toBe(true);
});

test('disabledDays désactive tous les jours de la semaine visés', async () => {
  const screen = await render(<Demo inline defaultValue={JUILLET} disabledDays={[0, 6]} />);

  // 4 et 5 juillet 2026 = samedi et dimanche.
  expect(jour(screen, '4').disabled).toBe(true);
  expect(jour(screen, '5').disabled).toBe(true);
  expect(jour(screen, '6').disabled).toBe(false);
});

// --- Forage ----------------------------------------------------------------

test('le titre fore jour → mois → année, et confie le focus à la grille', async () => {
  const screen = await render(<Demo inline defaultValue={JUILLET} />);

  await titre(screen).click();
  await expect
    .poll(() => !!screen.container.querySelector('.ui-datepicker-picker._month'))
    .toBe(true);
  expect(titre(screen).textContent).toBe('2026');
  expect(cellules(screen)).toHaveLength(12);

  await titre(screen).click();
  await expect
    .poll(() => !!screen.container.querySelector('.ui-datepicker-picker._year'))
    .toBe(true);
  expect(titre(screen).textContent).toBe('2020 - 2029');
  expect(cellules(screen)).toHaveLength(10);
  // Dernier niveau : le titre passe `disabled`, donc le focus qu'il tenait
  // tomberait sur `<body>` et la grille ne répondrait à aucune flèche.
  expect(titre(screen).disabled).toBe(true);
  await expect
    .poll(() => document.activeElement?.classList.contains('ui-datepicker-cell'))
    .toBe(true);
});

test('les grilles mois et année enveloppent leurs cellules dans des role="row"', async () => {
  const screen = await render(<Demo inline view="month" defaultValue={JUILLET} />);

  // Un `role="grid"` exige que ses `gridcell` soient dans une ligne : sans
  // elles la grille entière est de l'ARIA invalide.
  const lignes = screen.container.querySelectorAll('.ui-datepicker-picker-row[role="row"]');
  expect(lignes.length).toBe(4);
  expect(screen.container.querySelectorAll('[role="gridcell"]')).toHaveLength(12);
});

// --- Clavier ---------------------------------------------------------------

test('la flèche bas ouvre le panneau et entre dans la grille', async () => {
  const screen = await render(<Demo defaultValue={JUILLET} />);

  champ(screen).focus();
  champ(screen).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);
  await expect
    .poll(() => document.activeElement?.classList.contains('ui-datepicker-day'))
    .toBe(true);
});

test('Échap ferme, et ne remonte que quand elle n’a rien fermé', async () => {
  const surEchap = vi.fn();
  const screen = await render(
    /*
      eslint-disable-next-line jsx-a11y/no-static-element-interactions --
      Sondeur de test, pas une interface : il n'existe que pour observer si la
      touche remonte jusqu'a un parent, ce qui est le contrat verifie ici.
    */
    <div onKeyDown={(e) => e.key === 'Escape' && surEchap()}>
      <Demo defaultValue={JUILLET} />
    </div>,
  );

  const envoyerEchap = () =>
    champ(screen).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  // Panneau fermé : la touche remonte, pour qu'un dialogue parent reste
  // atteignable par la même touche.
  champ(screen).focus();
  envoyerEchap();
  await expect.poll(() => surEchap.mock.calls.length).toBe(1);

  await bascule(screen).click();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);
  envoyerEchap();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(false);
  // Consommée cette fois : elle a vraiment fermé quelque chose.
  expect(surEchap).toHaveBeenCalledTimes(1);
});

test('Alt+flèche haut ferme le panneau', async () => {
  const screen = await render(<Demo defaultValue={JUILLET} />);

  await bascule(screen).click();
  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(true);

  champ(screen).focus();
  champ(screen).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }),
  );

  await expect.poll(() => panneau(screen).hasAttribute('open')).toBe(false);
});

test('les flèches déplacent le focus rotatif dans la grille des jours', async () => {
  const screen = await render(<Demo inline defaultValue={JUILLET} />);
  const grille = screen.container.querySelector('.ui-datepicker-months') as HTMLElement;

  const focusable = () =>
    screen.container.querySelector('.ui-datepicker-day._focusable')?.getAttribute('aria-label');

  expect(focusable()).toBe('8 juillet 2026');

  grille.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await expect.poll(focusable).toBe('9 juillet 2026');

  grille.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  await expect.poll(focusable).toBe('16 juillet 2026');

  // Un seul arrêt de tabulation pour toute la grille.
  expect(jours(screen).filter((j) => j.tabIndex === 0)).toHaveLength(1);
});

test('PageDown change de mois, Shift+PageDown d’année', async () => {
  const screen = await render(<Demo inline defaultValue={JUILLET} />);
  const grille = screen.container.querySelector('.ui-datepicker-months') as HTMLElement;

  grille.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
  await expect.poll(() => titre(screen).textContent).toBe('Août 2026');

  grille.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'PageDown', shiftKey: true, bubbles: true }),
  );
  await expect.poll(() => titre(screen).textContent).toBe('Août 2027');
});

// --- Heure -----------------------------------------------------------------

test('les compteurs d’heure suivent le motif spinbutton', async () => {
  const screen = await render(<Demo inline showTime defaultValue={new Date(2026, 6, 8, 14, 30)} />);

  const compteurs = [...screen.container.querySelectorAll('[role="spinbutton"]')];
  expect(compteurs).toHaveLength(2);
  expect(compteurs[0]).toHaveAttribute('aria-valuenow', '14');
  expect(compteurs[1]).toHaveAttribute('aria-valuenow', '30');
  expect(compteurs[0]).toHaveAttribute('aria-valuemax', '23');
});

test('les flèches d’un compteur d’heure font tourner la valeur', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee
      inline
      showTime
      initial={new Date(2026, 6, 8, 23, 30)}
      onValueChange={onValueChange}
    />,
  );

  const heures = screen.container.querySelector('[role="spinbutton"]') as HTMLInputElement;
  heures.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

  // 23 h + 1 boucle sur 0, pas sur 24.
  await expect.poll(() => (onValueChange.mock.calls.at(-1)?.[0] as Date)?.getHours()).toBe(0);
});

test('stepMinute ne pilote que les flèches, la frappe reste exacte', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee
      inline
      showTime
      stepMinute={15}
      initial={new Date(2026, 6, 8, 14, 0)}
      onValueChange={onValueChange}
    />,
  );

  const minutes = screen.container.querySelectorAll('[role="spinbutton"]')[1] as HTMLInputElement;
  minutes.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  await expect.poll(() => (onValueChange.mock.calls.at(-1)?.[0] as Date)?.getMinutes()).toBe(15);

  minutes.focus();
  await taper(minutes, '07');
  await expect.poll(() => (onValueChange.mock.calls.at(-1)?.[0] as Date)?.getMinutes()).toBe(7);
});

test('un compteur d’heure refuse une frappe qui ne peut jamais être dans les bornes', async () => {
  const screen = await render(<Demo inline showTime defaultValue={new Date(2026, 6, 8, 14, 30)} />);

  const heures = screen.container.querySelector('[role="spinbutton"]') as HTMLInputElement;
  heures.focus();
  await taper(heures, '33');

  await expect.poll(() => heures.value).toBe('14');
});

test('en 12 h, une troisième unité AM/PM apparaît', async () => {
  const screen = await render(
    <Demo inline showTime hourFormat="12" defaultValue={new Date(2026, 6, 8, 14, 30)} />,
  );

  const compteurs = [...screen.container.querySelectorAll('[role="spinbutton"]')];
  expect(compteurs).toHaveLength(3);
  expect(compteurs[0]).toHaveAttribute('aria-valuenow', '2');
  expect(compteurs[2]).toHaveAttribute('aria-valuetext', 'PM');
});

test('timeOnly masque la grille et garde la ligne d’heure', async () => {
  const screen = await render(
    <Demo inline timeOnly showTime defaultValue={new Date(2026, 6, 8, 9, 5)} />,
  );

  expect(screen.container.querySelector('.ui-datepicker-months')).toBeNull();
  expect(screen.container.querySelector('.ui-datepicker-time')).not.toBeNull();
});

// --- Accessibilité et affordances -----------------------------------------

test('le format attendu est annoncé, chaîné au message et jamais à sa place', async () => {
  const screen = await render(<Demo helperText="Une aide." />);

  const decrit = champ(screen).getAttribute('aria-describedby') ?? '';
  const ids = decrit.split(' ').filter(Boolean);
  expect(ids).toHaveLength(2);

  const textes = ids.map((id) => screen.container.querySelector(`#${id}`)?.textContent);
  expect(textes).toContain('Une aide.');
  expect(textes.some((t) => t?.startsWith('Format attendu'))).toBe(true);
});

test('un déclencheur non tapable n’annonce aucun format', async () => {
  const screen = await render(<Demo allowInput={false} />);

  expect(screen.container.querySelector('.ui-datepicker-format-hint')).toBeNull();
});

test('formatHintLabel vide retire l’annonce', async () => {
  const screen = await render(<Demo formatHintLabel="" />);

  expect(screen.container.querySelector('.ui-datepicker-format-hint')).toBeNull();
});

test('chaque cellule jour porte sa date complète comme nom accessible', async () => {
  const screen = await render(<Demo inline defaultValue={JUILLET} />);

  expect(jour(screen, '8')).toHaveAttribute('aria-label', '8 juillet 2026');
  expect(jour(screen, '8')).toHaveAttribute('aria-selected', 'true');
});

test('les en-têtes de colonne portent le jour en entier, pas seulement l’abrégé', async () => {
  const screen = await render(<Demo inline defaultValue={JUILLET} />);

  const entetes = [...screen.container.querySelectorAll('[role="columnheader"]')];
  expect(entetes).toHaveLength(7);
  expect(entetes[0]).toHaveAttribute('aria-label', 'Lundi');
  expect(entetes[0]?.textContent).toBe('Lun.');
});

test('la croix d’effacement ne remplace la bascule que si showIcon est coupé', async () => {
  const avecIcone = await render(<Demo defaultValue={JUILLET} showClear />);
  expect(avecIcone.container.querySelector('.ui-datepicker-toggle')).toHaveAttribute(
    'aria-label',
    'Ouvrir le calendrier',
  );

  const sansIcone = await render(<Demo defaultValue={JUILLET} showClear showIcon={false} />);
  expect(sansIcone.container.querySelector('.ui-datepicker-toggle')).toHaveAttribute(
    'aria-label',
    'Effacer',
  );
});

test('le placeholder automatique décrit le format que le champ accepte vraiment', async () => {
  const parDefaut = await render(<Demo />);
  expect(champ(parDefaut).placeholder).toBe('jj/mm/aaaa');

  const plage = await render(<Demo selectionMode="range" />);
  expect(champ(plage).placeholder).toBe('jj/mm/aaaa - jj/mm/aaaa');

  const liste = await render(<Demo selectionMode="multiple" />);
  expect(champ(liste).placeholder).toBe('jj/mm/aaaa, ...');
});

test('un dateFormat personnalisé fournit son propre placeholder', async () => {
  const screen = await render(
    <Demo
      locale="en-US"
      dateFormat={(d) =>
        new Intl.DateTimeFormat('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(d)
      }
    />,
  );

  // Le jeton numérique de la locale décrirait un format que rien ne produit ni
  // n'accepte : c'est la sortie du formateur pour une date témoin qui sert.
  expect(champ(screen).placeholder).toBe('Nov 22, 2023');
});

test('l’ordre des champs tapé suit celui que le dateFormat écrit, pas celui de la locale', async () => {
  const onValueChange = vi.fn();
  // Formateur français sous une locale anglaise : il écrit jour d'abord.
  const screen = await render(
    <DemoControlee
      locale="en-US"
      dateFormat={(d) => new Intl.DateTimeFormat('fr-FR').format(d)}
      onValueChange={onValueChange}
    />,
  );
  const el = champ(screen);

  el.focus();
  await taper(el, '08/07/2026');
  el.blur();

  // Lu jour d'abord : 8 juillet. Lu mois d'abord, ce serait le 7 août.
  await expect.poll(() => (onValueChange.mock.calls.at(-1)?.[0] as Date)?.getMonth()).toBe(6);
  expect((onValueChange.mock.calls.at(-1)?.[0] as Date).getDate()).toBe(8);
});

// --- États -----------------------------------------------------------------

test('désactivé, ni la bascule ni le clavier n’ouvrent le panneau', async () => {
  const screen = await render(<Demo disabled defaultValue={JUILLET} />);

  expect(champ(screen).disabled).toBe(true);
  // Un `<button disabled>` n'emet rien : le clic natif est simplement inerte.
  expect((bascule(screen) as HTMLButtonElement).disabled).toBe(true);
  bascule(screen).click();
  await new Promise((r) => setTimeout(r, 80));

  expect(panneau(screen).hasAttribute('open')).toBe(false);
});

test('en lecture seule, le champ n’est pas tapable et le panneau reste fermé', async () => {
  const screen = await render(<Demo readOnly defaultValue={JUILLET} />);

  expect(champ(screen).readOnly).toBe(true);
  await champ(screen).click();
  await new Promise((r) => setTimeout(r, 80));

  expect(panneau(screen).hasAttribute('open')).toBe(false);
});

test('invalide, le champ le signale à l’assistance', async () => {
  const screen = await render(<Demo invalid errorText="Date invalide." />);

  expect(champ(screen)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.container.textContent).toContain('Date invalide.');
});

// --- Composition -----------------------------------------------------------

test('numberOfMonths rend autant de panneaux, un seul jeu de flèches', async () => {
  const screen = await render(<Demo inline numberOfMonths={2} defaultValue={JUILLET} />);

  expect(screen.container.querySelectorAll('.ui-datepicker-month')).toHaveLength(2);
  const navs = screen.container.querySelectorAll('.ui-datepicker-nav');
  expect(navs).toHaveLength(2); // précédent sur le premier, suivant sur le dernier
  expect(screen.container.querySelectorAll('.ui-datepicker-nav-spacer')).toHaveLength(2);
});

test('une date montrée dans deux panneaux ne donne qu’un arrêt de tabulation', async () => {
  const screen = await render(
    <Demo inline numberOfMonths={2} defaultValue={new Date(2026, 6, 31)} />,
  );

  expect(jours(screen).filter((j) => j.tabIndex === 0)).toHaveLength(1);
});

test('renderButtonBar reçoit les deux actions', async () => {
  const screen = await render(
    <Demo
      inline
      renderButtonBar={({ today, clear }) => (
        <>
          <button type="button" onClick={today}>
            Ce jour
          </button>
          <button type="button" onClick={clear}>
            Vider
          </button>
        </>
      )}
    />,
  );

  expect(screen.container.querySelector('.ui-datepicker-buttonbar')).not.toBeNull();
  await screen.getByRole('button', { name: 'Ce jour' }).click();
  await expect
    .poll(() => !!screen.container.querySelector('.ui-datepicker-day._selected'))
    .toBe(true);
});

test('renderDay remplace le contenu de la cellule, jamais la cellule', async () => {
  const screen = await render(
    <Demo inline defaultValue={JUILLET} renderDay={(d) => <em>{d.day}</em>} />,
  );

  const cellule = jour(screen, '8');
  expect(cellule.tagName).toBe('BUTTON');
  expect(cellule.querySelector('em')?.textContent).toBe('8');
  // Le nom accessible reste la date complète, pas le contenu projeté.
  expect(cellule).toHaveAttribute('aria-label', '8 juillet 2026');
});

// `computePosition` est asynchrone : le panneau reste dans son état fermé, donc
// invisible, jusqu'à ce que sa position soit calculée. Les deux moitiés du
// contrat comptent, et pour des raisons opposées : sans la POSE, une image au
// mauvais endroit est peinte et le panneau paraît sauter en place ; sans le
// RELÂCHEMENT, le panneau reste invisible pour de bon.
test('le panneau attend sa position avant d’être peint', async () => {
  const screen = await render(<Demo />);

  // Au repos, le garde est POSÉ : c'est ce qui prouve qu'il est branché.
  expect(panneau(screen).hasAttribute('data-unpositioned')).toBe(true);

  await bascule(screen).click();

  await expect.poll(() => panneau(screen).hasAttribute('data-unpositioned')).toBe(false);
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau(screen)).opacity).toBe('1');
});
