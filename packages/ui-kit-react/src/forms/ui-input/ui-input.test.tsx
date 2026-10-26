import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiInput } from './ui-input';

test('non contrôlé : la frappe met à jour le champ et notifie', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInput label="Nom" onValueChange={onValueChange} />);
  const input = screen.getByRole('textbox');

  await input.fill('Ada');

  await expect.element(input).toHaveValue('Ada');
  expect(onValueChange).toHaveBeenLastCalledWith('Ada');
});

test('contrôlé : le champ reste sur la valeur du parent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInput label="Nom" value="imposé" onValueChange={onValueChange} />);
  const input = screen.getByRole('textbox');

  await input.fill('Ada');

  // Le parent n'a rien rendu de nouveau : le champ ne bouge pas de lui-même.
  await expect.element(input).toHaveValue('imposé');
  expect(onValueChange).toHaveBeenCalled();
});

// --- Saisie automatique du navigateur -------------------------------------

/** Écrit comme le navigateur (setter natif, que React ne voit pas), puis émet `evenements`. */
function remplir(el: HTMLInputElement, texte: string, ...evenements: string[]) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, texte);
  for (const type of evenements) {
    el.dispatchEvent(
      type === 'animationstart'
        ? new AnimationEvent(type, { animationName: 'ui-browser-fill', bubbles: true })
        : new Event(type, { bubbles: true }),
    );
  }
}

test('une valeur préremplie sans événement est prise en compte et survit au rendu suivant', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInput label="Nom" onValueChange={onValueChange} />);
  const input = screen.container.querySelector('input')!;

  remplir(input, 'Ada', 'animationstart');
  await expect.element(input).toHaveValue('Ada');
  await screen.rerender(<UiInput label="Nom" onValueChange={onValueChange} />);

  await expect.element(input).toHaveValue('Ada');
  expect(onValueChange.mock.calls).toEqual([['Ada']]);
});

test("un remplissage annoncé par l'animation puis par change ne notifie qu'une fois", async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInput label="Nom" onValueChange={onValueChange} />);
  const input = screen.container.querySelector('input')!;

  remplir(input, 'Ada', 'animationstart');
  await expect.element(input).toHaveValue('Ada');
  remplir(input, 'Ada', 'change');

  await expect.poll(() => onValueChange.mock.calls).toEqual([['Ada']]);
});

test('contrôlé : un remplissage sans événement remonte au parent', async () => {
  function Parent() {
    const [nom, setNom] = useState('');
    return (
      <>
        <UiInput label="Nom" value={nom} onValueChange={setNom} />
        <output>{nom}</output>
      </>
    );
  }
  const screen = await render(<Parent />);
  const input = screen.container.querySelector('input')!;

  remplir(input, 'Ada', 'animationstart');

  await expect.element(screen.container.querySelector('output')!).toHaveTextContent('Ada');
  await expect.element(input).toHaveValue('Ada');
});

test("l'animation d'autofill de l'appelant reste appelée", async () => {
  const onAnimationStart = vi.fn();
  const screen = await render(<UiInput label="Nom" onAnimationStart={onAnimationStart} />);

  remplir(screen.container.querySelector('input')!, 'Ada', 'animationstart');

  expect(onAnimationStart).toHaveBeenCalledOnce();
});
