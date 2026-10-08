import type { CSSProperties } from 'react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { UiButton } from '../../actions/ui-button';
import { UiInput } from '../ui-input';
import { UiSelect } from '../ui-select';

import { UiInputGroup, UiInputGroupAddon } from './ui-input-group';

const items = (container: HTMLElement, index = 0) => [
  ...(container.querySelectorAll('.ui-input-group-row')[index]!
    .children as HTMLCollectionOf<HTMLElement>),
];

/** Couleur calculée d'un jeton, pour la comparer à une bordure peinte. */
function tokenColor(token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/**
 * Pose le pointeur dans un coin vide : un clic d'un test précédent le laisse là où
 * la boîte suivante se rend, et une couleur au repos se lirait alors au survol.
 */
async function parkPointer() {
  const spot = document.createElement('div');
  spot.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 4px; height: 4px;';
  document.body.append(spot);
  await userEvent.hover(spot);
  spot.remove();
}

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

test('--ui-input-group-item-flex remplace la largeur que le groupe donne à un item', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiSelect
        aria-label="Devise"
        options={['EUR', 'USD']}
        defaultValue="EUR"
        style={{ '--ui-input-group-item-flex': 'none' } as CSSProperties}
      />
      <UiInput aria-label="Montant" />
    </UiInputGroup>,
  );
  const [select, field] = items(screen.container);

  expect(getComputedStyle(select!).flexGrow).toBe('0');
  expect(getComputedStyle(select!).flexBasis).toBe('auto');
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

// --- Libellé et message ------------------------------------------------------

test('sans libellé ni message, le groupe reste une enveloppe sans rôle', async () => {
  const screen = await render(
    <UiInputGroup>
      <UiInput aria-label="Numéro" />
    </UiInputGroup>,
  );
  const group = screen.container.querySelector('.ui-input-group')!;

  expect(group).not.toHaveAttribute('role');
  expect(group).not.toHaveAttribute('aria-labelledby');
  expect(group).not.toHaveAttribute('aria-describedby');
  expect(group.querySelector('.ui-label')).toBeNull();
  expect(group.querySelector('.ui-helper')).toBeNull();
});

test('avec un libellé, le groupe est un role="group" nommé par lui', async () => {
  const screen = await render(
    <UiInputGroup label="Téléphone" required>
      <UiInputGroupAddon>+33</UiInputGroupAddon>
      <UiInput aria-label="Numéro" />
    </UiInputGroup>,
  );
  const group = screen.container.querySelector('.ui-input-group')!;
  const label = group.querySelector<HTMLLabelElement>('.ui-input-group-label')!;

  expect(group).toHaveAttribute('role', 'group');
  expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  expect(label).not.toHaveAttribute('for');
  // L'astérisque est masqué : il ne doit pas entrer dans le nom du groupe.
  expect(label.querySelector('.ui-label-marker')).toHaveAttribute('aria-hidden', 'true');
  await expect.element(screen.getByRole('group', { name: 'Téléphone', exact: true })).toBe(group);
});

test('le message décrit le groupe et prend la couleur du level', async () => {
  const screen = await render(
    <UiInputGroup message="Numéro invalide" level="error">
      <UiInput aria-label="Numéro" invalid />
    </UiInputGroup>,
  );
  const group = screen.container.querySelector('.ui-input-group')!;
  const helper = group.querySelector<HTMLElement>('.ui-input-group-message')!;

  expect(group).toHaveAttribute('role', 'group');
  expect(group).not.toHaveAttribute('aria-labelledby');
  expect(group.getAttribute('aria-describedby')).toBe(helper.id);
  expect(helper).toHaveTextContent('Numéro invalide');
  expect(helper).toHaveClass('_error');
  expect(group).toHaveClass('_error');
});

test('deux groupes ont chacun leurs identifiants', async () => {
  const screen = await render(
    <>
      <UiInputGroup label="Téléphone" message="Aide">
        <UiInput aria-label="Numéro" />
      </UiInputGroup>
      <UiInputGroup label="Autre" message="Autre aide">
        <UiInput aria-label="Autre champ" />
      </UiInputGroup>
    </>,
  );
  const [first, second] = [...screen.container.querySelectorAll('.ui-input-group')];

  expect(first!.getAttribute('aria-labelledby')).not.toBe(second!.getAttribute('aria-labelledby'));
  expect(first!.getAttribute('aria-describedby')).not.toBe(
    second!.getAttribute('aria-describedby'),
  );
});

test('le libellé et le message restent hors de la rangée', async () => {
  const screen = await render(
    <UiInputGroup label="Téléphone" message="Aide">
      <UiInputGroupAddon>+33</UiInputGroupAddon>
      <UiInput aria-label="Numéro" />
    </UiInputGroup>,
  );
  const row = screen.container.querySelector('.ui-input-group-row')!;

  expect(row.children).toHaveLength(2);
  expect(row.querySelector('.ui-label, .ui-helper')).toBeNull();
});

// Le statut du groupe porte sur la valeur composée : il prime sur celui des contrôles.
test('le level teinte les bordures des champs et des cellules', async () => {
  await parkPointer();
  const screen = await render(
    <UiInputGroup level="error" message="Numéro invalide">
      <UiInputGroupAddon>+33</UiInputGroupAddon>
      <UiInput aria-label="Numéro" level="success" />
    </UiInputGroup>,
  );
  const error = tokenColor('--form-error-stroke-default');
  const addon = screen.container.querySelector<HTMLElement>('.ui-input-group-addon')!;
  const box = screen.container.querySelector<HTMLElement>('.ui-field-box')!;

  expect(getComputedStyle(addon).borderTopColor).toBe(error);
  expect(getComputedStyle(box).borderTopColor).toBe(error);
});

// --- Boîte unique ------------------------------------------------------------

test('merged pose la classe _merged et dessine une seule boîte', async () => {
  await parkPointer();
  const screen = await render(
    <>
      <UiInputGroup>
        <UiInput aria-label="Seul" />
      </UiInputGroup>
      <UiInputGroup merged>
        <UiInputGroupAddon>https://</UiInputGroupAddon>
        <UiInput aria-label="Site" />
      </UiInputGroup>
    </>,
  );
  const [plain, merged] = [...screen.container.querySelectorAll<HTMLElement>('.ui-input-group')];
  const row = merged!.querySelector<HTMLElement>('.ui-input-group-row')!;
  const addon = merged!.querySelector<HTMLElement>('.ui-input-group-addon')!;
  const box = merged!.querySelector<HTMLElement>('.ui-field-box')!;

  expect(plain).not.toHaveClass('_merged');
  expect(merged).toHaveClass('_merged');
  expect(getComputedStyle(addon).borderTopColor).toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(box).borderTopColor).toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(row, '::after').borderTopColor).toBe(
    tokenColor('--form-high-stroke-default'),
  );
  // Une seule boîte, mais la hauteur d'un champ seul.
  expect(row.getBoundingClientRect().height).toBe(
    plain!.querySelector('.ui-field-box')!.getBoundingClientRect().height,
  );
});

test('en merged, l’anneau de focus entoure le groupe et pas le champ', async () => {
  const screen = await render(
    <UiInputGroup merged>
      <UiInputGroupAddon>https://</UiInputGroupAddon>
      <UiInput aria-label="Site" />
    </UiInputGroup>,
  );
  const row = screen.container.querySelector<HTMLElement>('.ui-input-group-row')!;
  const box = screen.container.querySelector<HTMLElement>('.ui-field-box')!;

  await screen.getByRole('textbox', { name: 'Site' }).click();

  await expect.poll(() => getComputedStyle(row, '::after').boxShadow).not.toBe('none');
  // Coupé par sa largeur, pas par une couleur transparente qui peindrait du noir.
  expect(getComputedStyle(box).boxShadow).toMatch(/0px 0px 0px 0px|^none$/);
});

test('en merged, seuls les côtés partagés par deux contrôles se resserrent', async () => {
  const screen = await render(
    <>
      <UiInputGroup>
        <UiInput aria-label="Hors fusion" />
      </UiInputGroup>
      <UiInputGroup merged>
        <UiInput aria-label="Montant" />
        <UiInput aria-label="Centimes" />
        <UiInputGroupAddon>€</UiInputGroupAddon>
      </UiInputGroup>
    </>,
  );
  const native = (name: string) =>
    getComputedStyle(screen.getByRole('textbox', { name }).element());
  const inset = native('Hors fusion').paddingInlineStart;

  expect(native('Hors fusion').paddingInlineEnd).toBe(inset);
  expect(native('Montant').paddingInlineStart).toBe(inset);
  expect(parseFloat(native('Montant').paddingInlineEnd)).toBeLessThan(parseFloat(inset));
  expect(parseFloat(native('Centimes').paddingInlineStart)).toBeLessThan(parseFloat(inset));
  // Une cellule garde son inset : son fond marque la séparation.
  expect(native('Centimes').paddingInlineEnd).toBe(inset);
});

test('le resserrement ne descend pas dans le panneau d’une liste', async () => {
  const screen = await render(
    <>
      <UiSelect aria-label="Seule" options={['a', 'b']} filter />
      <UiInputGroup merged>
        <UiSelect aria-label="Dans le groupe" options={['a', 'b']} filter />
        <UiInput aria-label="Voisin" />
      </UiInputGroup>
    </>,
  );
  const [alone, grouped] = [
    ...screen.container.querySelectorAll<HTMLElement>('.ui-select-filter-input'),
  ];

  expect(getComputedStyle(grouped!).paddingInlineEnd).toBe(
    getComputedStyle(alone!).paddingInlineEnd,
  );
});
