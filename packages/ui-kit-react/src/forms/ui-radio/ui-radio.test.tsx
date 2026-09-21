import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiRadio } from './ui-radio';

test('contrôlé : le bouton dont la value égale groupValue est sélectionné', async () => {
  const screen = await render(
    <>
      <UiRadio name="taille" value="s" label="Petit" groupValue="m" />
      <UiRadio name="taille" value="m" label="Moyen" groupValue="m" />
    </>,
  );

  await expect.element(screen.getByRole('radio', { name: 'Petit' })).not.toBeChecked();
  await expect.element(screen.getByRole('radio', { name: 'Moyen' })).toBeChecked();
});

test('contrôlé : le bouton ne bouge pas de lui-même, mais remonte SA value', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <>
      <UiRadio name="t2" value="s" label="Petit" groupValue="m" onValueChange={onValueChange} />
      <UiRadio name="t2" value="m" label="Moyen" groupValue="m" onValueChange={onValueChange} />
    </>,
  );

  await screen.getByRole('radio', { name: 'Petit' }).click();

  expect(onValueChange).toHaveBeenCalledWith('s');
  await expect.element(screen.getByRole('radio', { name: 'Petit' })).not.toBeChecked();
});

test('non contrôlé : c’est le navigateur qui tient l’exclusivité par le name', async () => {
  const screen = await render(
    <>
      <UiRadio name="t3" value="s" label="Petit" defaultChecked />
      <UiRadio name="t3" value="m" label="Moyen" />
    </>,
  );

  await screen.getByRole('radio', { name: 'Moyen' }).click();

  // Aucun état React ici : le groupe natif a désélectionné le premier tout seul.
  await expect.element(screen.getByRole('radio', { name: 'Moyen' })).toBeChecked();
  await expect.element(screen.getByRole('radio', { name: 'Petit' })).not.toBeChecked();
});

test('disabled bloque la sélection', async () => {
  const screen = await render(<UiRadio name="t4" value="s" label="Petit" disabled />);

  await expect.element(screen.getByRole('radio')).toBeDisabled();
});

test('readOnly laisse le bouton consultable mais refuse la sélection', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <>
      <UiRadio
        name="t5"
        value="s"
        label="Petit"
        groupValue="m"
        readOnly
        onValueChange={onValueChange}
      />
      <UiRadio name="t5" value="m" label="Moyen" groupValue="m" readOnly />
    </>,
  );

  const petit = screen.getByRole('radio', { name: 'Petit' });
  // Un `<input type="radio">` n'a pas de `readOnly` natif : il reste
  // focalisable. Et pas d'`aria-readonly` : la spécification ne le supporte pas
  // sur le rôle `radio`, l'annonce revient au `radiogroup` englobant.
  await expect.element(petit).not.toBeDisabled();
  await expect.element(petit).not.toHaveAttribute('aria-readonly');

  await petit.click();

  expect(onValueChange).not.toHaveBeenCalled();
  // Le navigateur avait déjà coché : la propriété du DOM doit avoir été remise,
  // sinon l'affichage divergerait du modèle sans que React re-rende.
  await expect.element(petit).not.toBeChecked();
  await expect.element(screen.getByRole('radio', { name: 'Moyen' })).toBeChecked();
});
