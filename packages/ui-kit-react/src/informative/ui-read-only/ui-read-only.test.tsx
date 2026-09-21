import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiReadOnly } from './ui-read-only';

// Une paire étiquette-valeur est exactement ce que dl/dt/dd décrit : le
// balisage relie les deux sans qu'aucun aria n'ait à le faire.
test('avec un libellé, la racine est une liste de définition', async () => {
  const screen = await render(<UiReadOnly label="Ville" value="Bordeaux" />);
  const root = screen.container.querySelector('.ui-read-only')!;

  expect(root.tagName).toBe('DL');
  expect(root.querySelector('dt')).toBeInTheDocument();
  expect(root.querySelector('dd')!.textContent).toBe('Bordeaux');
});

test('sans libellé, la racine reste un div', async () => {
  const screen = await render(<UiReadOnly value="Bordeaux" />);
  const root = screen.container.querySelector('.ui-read-only')!;

  expect(root.tagName).toBe('DIV');
  expect(root.querySelector('dd')).toBeNull();
});

test('une valeur vide affiche le repli, en atténué', async () => {
  const screen = await render(<UiReadOnly label="Ville" value={null} />);
  const value = screen.container.querySelector('.ui-read-only-value')!;

  expect(value).toHaveClass('_fallback');
  expect(value.textContent).toBe('—');
});

test('une chaîne vide compte comme vide', async () => {
  const screen = await render(<UiReadOnly label="Ville" value="" />);

  expect(screen.container.querySelector('.ui-read-only-value')).toHaveClass('_fallback');
});

test('zéro est une valeur, pas un vide', async () => {
  const screen = await render(<UiReadOnly label="Solde" value={0} />);
  const value = screen.container.querySelector('.ui-read-only-value')!;

  expect(value).not.toHaveClass('_fallback');
  expect(value.textContent).toBe('0');
});

// Le symbole de repli ne veut rien dire à l'oreille : il est masqué, et le
// texte de emptyLabel est annoncé à sa place.
test('emptyLabel est annoncé, le symbole reste décoratif', async () => {
  const screen = await render(<UiReadOnly label="Ville" value={null} emptyLabel="Non renseigné" />);
  const value = screen.container.querySelector('.ui-read-only-value')!;

  expect(value.querySelector('[aria-hidden="true"]')!.textContent).toBe('—');
  expect(value.querySelector('.ui-read-only-sr')!.textContent).toBe('Non renseigné');
});

test('un contenu riche remplace la valeur texte', async () => {
  const screen = await render(
    <UiReadOnly label="Statut" value="ignorée">
      <b>Validé</b>
    </UiReadOnly>,
  );

  expect(screen.container.querySelector('.ui-read-only-projected')!.textContent).toBe('Validé');
  expect(screen.container.querySelector('.ui-read-only-value')).toBeNull();
});

test('labelWidth passe par la variable CSS', async () => {
  const screen = await render(
    <UiReadOnly label="Ville" value="Bordeaux" layout="horizontal" labelWidth="160px" />,
  );
  const root = screen.container.querySelector('.ui-read-only') as HTMLElement;

  expect(root.style.getPropertyValue('--ui-read-only-label-width')).toBe('160px');
  expect(root.querySelector('.ui-read-only-label')!.getBoundingClientRect().width).toBe(160);
});

test('renderLabel remplace le libellé par défaut', async () => {
  const screen = await render(
    <UiReadOnly label="Ville" value="Bordeaux" renderLabel={() => <em>Sur mesure</em>} />,
  );
  const cell = screen.container.querySelector('dt')!;

  expect(cell.textContent).toBe('Sur mesure');
  expect(cell.querySelector('.ui-label')).toBeNull();
});

test('les classes de disposition sont transmises telles quelles', async () => {
  const screen = await render(
    <UiReadOnly
      label="Ville"
      value="Bordeaux"
      layout="grid"
      rowClassName="flex-x"
      labelClassName="cell"
      valueClassName="cell auto"
    />,
  );

  expect(screen.container.querySelector('.ui-read-only')).toHaveClass('_grid', 'flex-x');
  expect(screen.container.querySelector('dt')).toHaveClass('ui-read-only-label', 'cell');
  expect(screen.container.querySelector('dd')).toHaveClass('ui-read-only-value-cell', 'auto');
});

test('inline fait épouser le contenu au lieu de remplir', async () => {
  const screen = await render(<UiReadOnly label="Ville" value="Bordeaux" inline />);
  const root = screen.container.querySelector('.ui-read-only')!;

  expect(getComputedStyle(root).display).toBe('inline-flex');
});
