import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiAccordion,
  UiAccordionPanel,
  type UiAccordionActiveValue,
  type UiAccordionProps,
} from './ui-accordion';

function Host({
  disableSecond = false,
  ...props
}: Partial<UiAccordionProps> & { disableSecond?: boolean }) {
  return (
    <UiAccordion defaultValue="a" {...props}>
      <UiAccordionPanel value="a" header="Un">
        Contenu A
      </UiAccordionPanel>
      <UiAccordionPanel value="b" header="Deux" disabled={disableSecond}>
        Contenu B
      </UiAccordionPanel>
      <UiAccordionPanel value="c" header="Trois">
        Contenu C
      </UiAccordionPanel>
    </UiAccordion>
  );
}

const headers = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>('.ui-accordion-header'),
];
const regions = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-accordion-content'),
];

// Le clavier est branché sur les EN-TÊTES, pas sur le groupe : la touche part
// donc du bouton.
const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

test('l’en-tête est un bouton natif lié à sa région', async () => {
  const screen = await render(<Host />);
  const first = headers(screen.container)[0]!;
  const region = regions(screen.container)[0]!;

  expect(first.tagName).toBe('BUTTON');
  expect(first).toHaveAttribute('type', 'button');
  expect(first).toHaveAttribute('aria-expanded', 'true');
  expect(first.getAttribute('aria-controls')).toBe(region.id);
  expect(region).toHaveAttribute('role', 'region');
  expect(region.getAttribute('aria-labelledby')).toBe(first.id);
});

// Ce qui est replié doit être invisible ET hors du parcours : `inert` couvre le
// second point, la hauteur nulle le premier, et l'état du formulaire survit aux
// deux puisque le nœud reste monté.
test('un panneau replié est inerte et de hauteur nulle, mais toujours monté', async () => {
  const screen = await render(<Host />);
  const second = regions(screen.container)[1]!;

  expect(second).toHaveAttribute('inert');
  expect(second.textContent).toContain('Contenu B');
  await expect.poll(() => second.getBoundingClientRect().height).toBe(0);
});

test('cliquer un en-tête ouvre son panneau et referme l’autre', async () => {
  const screen = await render(<Host />);

  await screen.getByRole('button', { name: 'Trois' }).click();

  const all = headers(screen.container);
  await expect.poll(() => all[2]!.getAttribute('aria-expanded')).toBe('true');
  expect(all[0]).toHaveAttribute('aria-expanded', 'false');
});

// En mode simple, recliquer l'en-tête actif referme : la valeur retombe à
// `null`, qui est le « rien d'ouvert » du kit React. `undefined` voudrait dire
// « non contrôlé », ce qui n'est pas la même chose.
test('recliquer l’en-tête actif referme, et la valeur retombe à null', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host onValueChange={onValueChange} />);

  await screen.getByRole('button', { name: 'Un' }).click();

  await expect
    .poll(() => headers(screen.container)[0]!.getAttribute('aria-expanded'))
    .toBe('false');
  expect(onValueChange).toHaveBeenLastCalledWith(null);
});

test('en mode multiple la valeur est un tableau et les panneaux s’accumulent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host multiple defaultValue={['a']} onValueChange={onValueChange} />);

  await screen.getByRole('button', { name: 'Trois' }).click();

  await expect.poll(() => headers(screen.container)[2]!.getAttribute('aria-expanded')).toBe('true');
  expect(headers(screen.container)[0]).toHaveAttribute('aria-expanded', 'true');
  expect(onValueChange).toHaveBeenLastCalledWith(['a', 'c']);
});

test('en mode multiple, refermer retire la valeur du tableau', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <Host multiple defaultValue={['a', 'c']} onValueChange={onValueChange} />,
  );

  await screen.getByRole('button', { name: 'Un' }).click();

  await expect.poll(() => onValueChange.mock.calls.length).toBe(1);
  expect(onValueChange).toHaveBeenLastCalledWith(['c']);
});

test('onPanelOpen et onPanelClose portent la valeur du panneau', async () => {
  const onPanelOpen = vi.fn();
  const onPanelClose = vi.fn();
  const screen = await render(<Host onPanelOpen={onPanelOpen} onPanelClose={onPanelClose} />);

  await screen.getByRole('button', { name: 'Trois' }).click();
  await screen.getByRole('button', { name: 'Trois' }).click();

  await expect.poll(() => onPanelClose.mock.calls.length).toBe(1);
  expect(onPanelOpen).toHaveBeenCalledWith(expect.objectContaining({ value: 'c' }));
  expect(onPanelClose).toHaveBeenCalledWith(expect.objectContaining({ value: 'c' }));
});

test('un panneau désactivé ne s’ouvre pas', async () => {
  const screen = await render(<Host disableSecond />);
  const second = headers(screen.container)[1]!;

  expect(second).toBeDisabled();
  expect(second).toHaveAttribute('aria-expanded', 'false');
});

test('les flèches déplacent le focus d’en-tête en en-tête, en boucle', async () => {
  const screen = await render(<Host />);
  const all = headers(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowDown');
  await expect.poll(() => document.activeElement).toBe(all[1]);

  touche(all[1]!, 'ArrowUp');
  await expect.poll(() => document.activeElement).toBe(all[0]);

  touche(all[0]!, 'ArrowUp');
  await expect.poll(() => document.activeElement).toBe(all[2]);
});

test('Début et Fin vont au premier et au dernier en-tête', async () => {
  const screen = await render(<Host />);
  const all = headers(screen.container);

  all[1]!.focus();
  touche(all[1]!, 'End');
  await expect.poll(() => document.activeElement).toBe(all[2]);

  touche(all[2]!, 'Home');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

test('les flèches sautent un en-tête désactivé', async () => {
  const screen = await render(<Host disableSecond />);
  const all = headers(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowDown');

  await expect.poll(() => document.activeElement).toBe(all[2]);
});

// Les flèches d'un groupe ne doivent pas emporter les en-têtes d'un accordéon
// imbriqué : sans le filtre par groupe, `querySelectorAll` les ramasse aussi.
test('les flèches ignorent les en-têtes d’un accordéon imbriqué', async () => {
  const screen = await render(
    <UiAccordion defaultValue="ext">
      <UiAccordionPanel value="ext" header="Extérieur">
        <UiAccordion defaultValue="int">
          <UiAccordionPanel value="int" header="Intérieur">
            Contenu
          </UiAccordionPanel>
        </UiAccordion>
      </UiAccordionPanel>
      <UiAccordionPanel value="ext2" header="Extérieur 2">
        Contenu
      </UiAccordionPanel>
    </UiAccordion>,
  );

  const exterieur = screen.container.querySelectorAll<HTMLButtonElement>(
    ':scope > .ui-accordion > .ui-accordion-panel > .ui-accordion-header',
  );
  exterieur[0]!.focus();
  touche(exterieur[0]!, 'ArrowDown');

  await expect.poll(() => document.activeElement).toBe(exterieur[1]);
});

test('selectOnFocus ouvre le panneau dès la prise de focus', async () => {
  const screen = await render(<Host selectOnFocus />);
  const third = headers(screen.container)[2]!;

  third.focus();

  await expect.poll(() => third.getAttribute('aria-expanded')).toBe('true');
});

test('le trait et le chevron suivent le défaut du groupe', async () => {
  const screen = await render(<Host separator={false} control={false} />);

  expect(screen.container.querySelector('.ui-accordion-separator')).toBeNull();
  expect(screen.container.querySelector('.ui-accordion-header-control')).toBeNull();
});

test('un panneau surcharge le défaut du groupe', async () => {
  const screen = await render(
    <UiAccordion defaultValue="a" separator={false} control={false}>
      <UiAccordionPanel value="a" header="Un" separator control>
        Contenu
      </UiAccordionPanel>
      <UiAccordionPanel value="b" header="Deux">
        Contenu
      </UiAccordionPanel>
    </UiAccordion>,
  );

  expect(screen.container.querySelectorAll('.ui-accordion-separator')).toHaveLength(1);
  expect(screen.container.querySelectorAll('.ui-accordion-header-control')).toHaveLength(1);
});

// Le chevron ne doit pas se lire : le sens passe par `aria-expanded`.
test('le chevron est décoratif et change au pliage', async () => {
  const screen = await render(<Host />);
  const control = screen.container.querySelector('.ui-accordion-header-control')!;

  expect(control).toHaveAttribute('aria-hidden', 'true');
  expect(control.querySelector('.ui-icon')).toHaveClass('fa-chevron-up');

  await screen.getByRole('button', { name: 'Un' }).click();

  await expect
    .poll(() => screen.container.querySelector('.ui-accordion-header-control .ui-icon')?.className)
    .toContain('fa-chevron-down');
});

// La coupure locale doit gagner sur la transition, sinon `motion={false}` ne
// fait rien de visible.
test('motion=false supprime la transition du corps', async () => {
  const screen = await render(<Host motion={false} />);
  const region = regions(screen.container)[0]!;

  expect(region).toHaveClass('_no-motion');
  expect(getComputedStyle(region).transitionProperty).toBe('none');
});

test('par défaut le corps est bien animé', async () => {
  const screen = await render(<Host />);
  const region = regions(screen.container)[0]!;

  expect(getComputedStyle(region).transitionProperty).toContain('grid-template-rows');
  expect(getComputedStyle(region).transitionProperty).toContain('opacity');
});

test('en mode contrôlé, la valeur de l’appelant gagne', async () => {
  function Controlled() {
    const [open, setOpen] = useState<UiAccordionActiveValue>('a');
    return (
      <>
        <button type="button" onClick={() => setOpen('c')}>
          Ouvrir Trois
        </button>
        <Host value={open} />
      </>
    );
  }
  const screen = await render(<Controlled />);

  // Le clic sur l'en-tête ne change rien : le parent n'a pas bougé.
  await screen.getByRole('button', { name: 'Trois' }).click();
  await expect
    .poll(() => headers(screen.container)[2]!.getAttribute('aria-expanded'))
    .toBe('false');

  await screen.getByRole('button', { name: 'Ouvrir Trois' }).click();
  await expect.poll(() => headers(screen.container)[2]!.getAttribute('aria-expanded')).toBe('true');
});

test('hors d’un UiAccordion, le panneau le dit', async () => {
  await expect(
    render(
      <UiAccordionPanel value="a" header="Orphelin">
        Contenu
      </UiAccordionPanel>,
    ),
  ).rejects.toThrow(/UiAccordion/);
});
