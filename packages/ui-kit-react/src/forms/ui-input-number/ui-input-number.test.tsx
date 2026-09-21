import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiInputNumber } from './ui-input-number';

// La locale est TOUJOURS explicite dans ces tests : sans elle, Intl suit celle
// du navigateur et les séparateurs changent d'une machine à l'autre.

test('la frappe ne reformate pas le texte', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputNumber label="Quantité" locale="fr-FR" useGrouping onValueChange={onValueChange} />,
  );
  const input = screen.getByRole('spinbutton');

  await input.fill('1234');

  // Pas de « 1 234 » pendant la frappe : le curseur sauterait.
  await expect.element(input).toHaveValue('1234');
  expect(onValueChange).toHaveBeenLastCalledWith(1234);
});

test('le formatage riche s’applique à la sortie du champ', async () => {
  const screen = await render(<UiInputNumber label="Quantité" locale="en-US" useGrouping />);
  const input = screen.container.querySelector('input')!;

  input.focus();
  await screen.getByRole('spinbutton').fill('1234');
  input.blur();

  await expect.element(screen.getByRole('spinbutton')).toHaveValue('1,234');
});

test('la valeur est écrêtée à la sortie du champ', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputNumber label="Note" locale="en-US" min={0} max={10} onValueChange={onValueChange} />,
  );
  const input = screen.container.querySelector('input')!;

  input.focus();
  await screen.getByRole('spinbutton').fill('42');
  input.blur();

  await expect.element(screen.getByRole('spinbutton')).toHaveValue('10');
  expect(onValueChange).toHaveBeenLastCalledWith(10);
});

test('les flèches haut et bas incrémentent du pas', async () => {
  const screen = await render(
    <UiInputNumber label="Quantité" locale="en-US" defaultValue={10} step={5} />,
  );
  const input = screen.getByRole('spinbutton');

  await input.click();
  await input.fill('10');
  await userArrow(screen, 'ArrowUp');

  await expect.element(input).toHaveValue('15');
});

async function userArrow(screen: Awaited<ReturnType<typeof render>>, key: string) {
  const el = screen.container.querySelector('input')!;
  el.focus();
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await new Promise((r) => setTimeout(r, 30));
}

test('le pavé désactive ses boutons aux bornes', async () => {
  const screen = await render(
    <UiInputNumber label="Note" locale="en-US" defaultValue={10} min={0} max={10} />,
  );

  await expect.element(screen.getByRole('button', { name: 'Augmenter' })).toBeDisabled();
  await expect.element(screen.getByRole('button', { name: 'Diminuer' })).not.toBeDisabled();
});

test('le pavé reste hors du parcours clavier', async () => {
  const screen = await render(<UiInputNumber label="Quantité" locale="en-US" />);

  // Les flèches font déjà le travail : deux arrêts de tabulation par champ
  // alourdiraient tout formulaire.
  for (const button of screen.container.querySelectorAll('.ui-input-number-spinner button')) {
    expect(button).toHaveAttribute('tabindex', '-1');
  }
});

test('la devise remplace l’unité, elle ne s’y ajoute pas', async () => {
  const screen = await render(
    <UiInputNumber label="Prix" locale="en-US" currency="EUR" unit="kg" defaultValue={12} />,
  );

  expect(screen.container.querySelector('.ui-input-number-unit')).toBeNull();
  await expect.element(screen.getByRole('spinbutton')).toHaveValue('€12.00');
});

test('allowDecimals=false tronque la saisie', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputNumber
      label="Quantité"
      locale="en-US"
      allowDecimals={false}
      onValueChange={onValueChange}
    />,
  );

  await screen.getByRole('spinbutton').fill('3.7');

  expect(onValueChange).toHaveBeenLastCalledWith(3);
});

test('la saisie est permissive sur les séparateurs de la locale', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputNumber label="Prix" locale="fr-FR" onValueChange={onValueChange} />,
  );

  // Virgule décimale française, et un séparateur de milliers laissé par un
  // collage : les deux doivent passer.
  await screen.getByRole('spinbutton').fill('1 234,5');

  expect(onValueChange).toHaveBeenLastCalledWith(1234.5);
});

test('le champ s’annonce comme un spinbutton borné', async () => {
  const screen = await render(
    <UiInputNumber label="Note" locale="en-US" defaultValue={7} min={0} max={10} />,
  );
  const input = screen.container.querySelector('input')!;

  expect(input).toHaveAttribute('aria-valuenow', '7');
  expect(input).toHaveAttribute('aria-valuemin', '0');
  expect(input).toHaveAttribute('aria-valuemax', '10');
});

test('sans borne, aucun attribut de borne n’est posé', async () => {
  const screen = await render(<UiInputNumber label="Quantité" locale="en-US" />);
  const input = screen.container.querySelector('input')!;

  // Angular devait s'en garder : `numberAttribute(undefined)` y donne NaN, et
  // `aria-valuemin="NaN"` est une valeur ARIA invalide. En React, `undefined`
  // omet l'attribut tout seul.
  expect(input.hasAttribute('aria-valuemin')).toBe(false);
  expect(input.hasAttribute('aria-valuemax')).toBe(false);
});
