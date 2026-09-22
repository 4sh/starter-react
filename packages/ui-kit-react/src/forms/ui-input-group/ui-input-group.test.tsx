import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiButton } from '../../actions/ui-button';
import { UiInput } from '../ui-input';

import { UiInputGroup, UiInputGroupAddon } from './ui-input-group';

const items = (container: HTMLElement) => [
  ...(container.querySelector('.ui-input-group')!.children as HTMLCollectionOf<HTMLElement>),
];

test('la cellule rend son contenu dans une boîte à la hauteur du champ', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiInputGroupAddon>https://</UiInputGroupAddon>
      <UiInput aria-label="Site" />
    </UiInputGroup>,
  );
  const addon = screen.container.querySelector<HTMLElement>('.ui-input-group-addon')!;
  const box = screen.container.querySelector<HTMLElement>('.ui-field-box')!;

  expect(addon.textContent).toBe('https://');
  expect(addon.getBoundingClientRect().height).toBe(box.getBoundingClientRect().height);
});

test('la taille du groupe descend sur ses cellules', async () => {
  const screen = await render(
    <UiInputGroup size="small">
      <UiInputGroupAddon>€</UiInputGroupAddon>
      <UiInput aria-label="Prix" size="small" />
    </UiInputGroup>,
  );

  expect(screen.container.querySelector('.ui-input-group-addon')).toHaveClass('_small');
});

test('une cellule peut contredire la taille du groupe', async () => {
  const screen = await render(
    <UiInputGroup size="small">
      <UiInputGroupAddon size="default">€</UiInputGroupAddon>
      <UiInput aria-label="Prix" />
    </UiInputGroup>,
  );

  expect(screen.container.querySelector('.ui-input-group-addon')).not.toHaveClass('_small');
});

// Le reformage est en CSS pur : seuls les bords du groupe gardent un coin rond,
// et c'est une CUSTOM PROPERTY héritée qui le dit à chaque enfant.
test('seuls les items de bord gardent un coin arrondi', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiInputGroupAddon>a</UiInputGroupAddon>
      <UiInput aria-label="Milieu" />
      <UiInputGroupAddon>z</UiInputGroupAddon>
    </UiInputGroup>,
  );
  const [first, , last] = items(screen.container);
  // Le rayon se lit sur la boîte PEINTE, pas sur la custom property : une
  // valeur héritée peut être juste sans que rien ne la lise.
  const box = screen.container.querySelector<HTMLElement>('.ui-field-box')!;

  expect(getComputedStyle(first!).borderRadius).toMatch(/^\S+ 0px 0px \S+$/);
  expect(getComputedStyle(box).borderRadius).toBe('0px');
  expect(getComputedStyle(last!).borderRadius).toMatch(/^0px \S+ \S+ 0px$/);
});

test('seul dans le groupe, un item garde ses quatre coins', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiInputGroupAddon>seul</UiInputGroupAddon>
    </UiInputGroup>,
  );
  const only = items(screen.container)[0]!;
  const radius = getComputedStyle(only).borderRadius;

  expect(radius).not.toBe('0px');
  // Un seul rayon, donc les quatre coins : la forme normale, hors groupe.
  expect(radius.split(' ')).toHaveLength(1);
});

// La bordure partagée ne doit pas doubler : le voisin remonte d'exactement sa
// largeur de trait. Une marge nulle laisserait un trait deux fois trop épais.
test('les items voisins recouvrent leur bordure partagée', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiInputGroupAddon>a</UiInputGroupAddon>
      <UiInput aria-label="Site" />
    </UiInputGroup>,
  );
  const [first, second] = items(screen.container);

  expect(getComputedStyle(first!).marginInlineStart).toBe('0px');
  expect(parseFloat(getComputedStyle(second!).marginInlineStart)).toBeLessThan(0);
});

test('une cellule et un bouton gardent leur largeur, le contrôle prend le reste', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiInputGroupAddon>a</UiInputGroupAddon>
      <UiInput aria-label="Mot-clé" />
      <UiButton icon="magnifying-glass" aria-label="Rechercher" />
    </UiInputGroup>,
  );
  const [addon, field, button] = items(screen.container);

  expect(getComputedStyle(addon!).flexGrow).toBe('0');
  expect(getComputedStyle(button!).flexGrow).toBe('0');
  expect(getComputedStyle(field!).flexGrow).toBe('1');
});

// Le recouvrement fait passer le voisin par-dessus : sans ce relèvement,
// l'anneau de focus du champ serait rogné par la cellule qui le suit.
test('l’item focalisé passe au-dessus de ses voisins', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiInput aria-label="Mot-clé" />
      <UiInputGroupAddon>z</UiInputGroupAddon>
    </UiInputGroup>,
  );
  const field = items(screen.container)[0]!;

  expect(getComputedStyle(field).zIndex).toBe('auto');
  await screen.getByRole('textbox', { name: 'Mot-clé' }).click();

  await expect.poll(() => getComputedStyle(field).zIndex).toBe('1');
});

test('className et rest atterrissent sur la racine', async () => {
  const screen = await render(
    <UiInputGroup className="maison" data-test="x">
      <UiInputGroupAddon>a</UiInputGroupAddon>
    </UiInputGroup>,
  );
  const group = screen.container.querySelector('.ui-input-group')!;

  expect(group).toHaveClass('maison');
  expect(group).toHaveAttribute('data-test', 'x');
});
