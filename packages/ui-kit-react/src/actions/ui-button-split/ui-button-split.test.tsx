import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UiMenuItem } from '../../navigation/ui-menu';

import { UiButtonSplit } from './ui-button-split';

const ITEMS: UiMenuItem[] = [{ label: 'Dupliquer' }, { label: 'Supprimer' }];

const action = (c: HTMLElement) => c.querySelector<HTMLButtonElement>('.ui-button-split-action')!;
const trigger = (c: HTMLElement) => c.querySelector<HTMLButtonElement>('.ui-button-split-trigger')!;

test('rend deux vrais boutons, l’action et le déclencheur', async () => {
  const screen = await render(
    <UiButtonSplit label="Enregistrer" items={ITEMS} menuAriaLabel="Autres actions" />,
  );

  expect(action(screen.container).tagName).toBe('BUTTON');
  expect(action(screen.container).textContent).toContain('Enregistrer');
  expect(trigger(screen.container)).toHaveAttribute('aria-haspopup', 'menu');
  expect(trigger(screen.container)).toHaveAttribute('aria-label', "Plus d'options");
});

test('le clic sur l’action ne touche pas au panneau', async () => {
  const onButtonClick = vi.fn();
  const screen = await render(
    <UiButtonSplit
      label="Enregistrer"
      items={ITEMS}
      menuAriaLabel="Autres actions"
      onButtonClick={onButtonClick}
    />,
  );

  await screen.getByRole('button', { name: 'Enregistrer' }).click();

  expect(onButtonClick).toHaveBeenCalledTimes(1);
  expect(trigger(screen.container)).toHaveAttribute('aria-expanded', 'false');
});

test('le déclencheur ouvre le panneau et l’annonce', async () => {
  const onDropdownClick = vi.fn();
  const screen = await render(
    <UiButtonSplit
      label="Enregistrer"
      items={ITEMS}
      menuAriaLabel="Autres actions"
      onDropdownClick={onDropdownClick}
    />,
  );

  await screen.getByRole('button', { name: "Plus d'options" }).click();

  await expect.poll(() => trigger(screen.container).getAttribute('aria-expanded')).toBe('true');
  await expect.element(screen.getByRole('menuitem', { name: 'Dupliquer' })).toBeInTheDocument();
  expect(onDropdownClick).toHaveBeenCalledTimes(1);
});

test('activer une option prévient l’appelant', async () => {
  const onItemClick = vi.fn();
  const screen = await render(
    <UiButtonSplit
      label="Enregistrer"
      items={ITEMS}
      menuAriaLabel="Autres actions"
      onItemClick={onItemClick}
    />,
  );

  await screen.getByRole('button', { name: "Plus d'options" }).click();
  await screen.getByRole('menuitem', { name: 'Supprimer' }).click();

  await expect.poll(() => onItemClick.mock.calls.length).toBe(1);
  expect(onItemClick.mock.calls[0]![0].item.label).toBe('Supprimer');
});

// Le cas courant est une action indisponible dont les options restent utiles :
// les deux moitiés doivent donc se désactiver séparément.
test('les deux moitiés se désactivent séparément', async () => {
  const screen = await render(
    <UiButtonSplit
      label="Enregistrer"
      items={ITEMS}
      menuAriaLabel="Autres actions"
      buttonDisabled
    />,
  );

  expect(action(screen.container).disabled).toBe(true);
  expect(trigger(screen.container).disabled).toBe(false);
});

test('disabled coupe les deux', async () => {
  const screen = await render(
    <UiButtonSplit label="Enregistrer" items={ITEMS} menuAriaLabel="Autres actions" disabled />,
  );

  expect(action(screen.container).disabled).toBe(true);
  expect(trigger(screen.container).disabled).toBe(true);
});

// Les coins intérieurs se carrent par le crochet que `ui-button` expose déjà :
// la valeur doit être PEINTE, pas seulement héritée.
test('les coins intérieurs sont carrés, les extérieurs arrondis', async () => {
  const screen = await render(
    <UiButtonSplit label="Enregistrer" items={ITEMS} menuAriaLabel="Autres actions" />,
  );

  expect(getComputedStyle(action(screen.container)).borderRadius).toMatch(/^\S+ 0px 0px \S+$/);
  expect(getComputedStyle(trigger(screen.container)).borderRadius).toMatch(/^0px \S+ \S+ 0px$/);
});

test('les deux boutons recouvrent leur bordure partagée', async () => {
  const screen = await render(
    <UiButtonSplit label="Enregistrer" items={ITEMS} menuAriaLabel="Autres actions" />,
  );

  expect(parseFloat(getComputedStyle(trigger(screen.container)).marginLeft)).toBeLessThan(0);
});

test('le niveau et la taille descendent sur les deux boutons', async () => {
  const screen = await render(
    <UiButtonSplit
      label="Enregistrer"
      items={ITEMS}
      menuAriaLabel="Autres actions"
      level="error"
      size="small"
    />,
  );

  for (const button of [action(screen.container), trigger(screen.container)]) {
    expect(button).toHaveClass('_error', '_small');
  }
  expect(screen.container.querySelector('.ui-button-split')).toHaveClass('_error', '_small');
});

// La racine est un `<div>` sans rôle : un nom accessible y serait refusé par
// axe, il appartient au bouton d'action.
test('aria-label nomme le bouton d’action, pas la racine', async () => {
  const screen = await render(
    <UiButtonSplit
      icon="floppy-disk"
      items={ITEMS}
      menuAriaLabel="Autres actions"
      aria-label="Enregistrer le document"
    />,
  );

  expect(screen.container.querySelector('.ui-button-split')).not.toHaveAttribute('aria-label');
  await expect
    .element(screen.getByRole('button', { name: 'Enregistrer le document' }))
    .toBeInTheDocument();
});

test('className et rest atterrissent sur la racine', async () => {
  const screen = await render(
    <UiButtonSplit
      label="Enregistrer"
      items={ITEMS}
      menuAriaLabel="Autres actions"
      className="maison"
      data-test="x"
    />,
  );
  const root = screen.container.querySelector('.ui-button-split')!;

  expect(root).toHaveClass('maison');
  expect(root).toHaveAttribute('data-test', 'x');
});
