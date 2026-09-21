import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiPopover } from './ui-popover';

function Demo(args: Partial<React.ComponentProps<typeof UiPopover>>) {
  const [open, setOpen] = useState(false);

  return (
    <UiPopover
      aria-label="Détails"
      open={open}
      onOpenChange={setOpen}
      trigger={(props) => (
        <button type="button" {...props}>
          Ouvrir
        </button>
      )}
      {...args}
    >
      <button type="button">Action</button>
    </UiPopover>
  );
}

const panneau = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('.ui-popover') as HTMLElement;

test('le panneau fermé n’occupe aucune place à l’écran', async () => {
  const screen = await render(<Demo />);
  const el = panneau(screen);

  expect(el.matches(':popover-open')).toBe(false);
  expect(getComputedStyle(el).display).toBe('none');
  expect(el.getBoundingClientRect().width).toBe(0);
});

// Le calque supérieur est ce qui fait échapper le panneau au rognage d'un
// ancêtre en `overflow: hidden`.
test('le déclencheur ouvre le panneau dans le calque supérieur', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
});

test('le déclencheur reflète l’état d’ouverture', async () => {
  const screen = await render(<Demo />);
  const trigger = screen.container.querySelector('button')!;

  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).not.toHaveAttribute('aria-controls');

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).toBe(panneau(screen).id);
});

test('un second clic referme', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
});

test('le focus se pose dans le panneau à l’ouverture', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => document.activeElement?.textContent).toBe('Action');
});

test('focusOnShow=false laisse le focus au déclencheur', async () => {
  const screen = await render(<Demo focusOnShow={false} />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  expect(document.activeElement?.textContent).toBe('Ouvrir');
});

// `auto` donne la fermeture au clic extérieur et sur Échap ; `manual` ne ferme
// que sur demande explicite.
test('dismissable choisit le mode de fermeture natif', async () => {
  const screen = await render(<Demo />);

  expect(panneau(screen).getAttribute('popover')).toBe('auto');
});

test('dismissable=false passe le panneau en manuel', async () => {
  const screen = await render(<Demo dismissable={false} />);

  expect(panneau(screen).getAttribute('popover')).toBe('manual');
});

test('la fermeture native remet l’état à jour et prévient', async () => {
  const onHide = vi.fn();
  const screen = await render(<Demo onHide={onHide} />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  // Fermeture par le navigateur, comme le ferait un clic extérieur réel.
  panneau(screen).hidePopover();

  await expect
    .poll(() => screen.container.querySelector('button')!.getAttribute('aria-expanded'))
    .toBe('false');
  expect(onHide).toHaveBeenCalled();
});

test('le panneau est nommé et porte le rôle de dialogue', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.element(screen.getByRole('dialog', { name: 'Détails' })).toBeInTheDocument();
});

test('modal rend un dialogue, pas un panneau popover', async () => {
  const screen = await render(<Demo modal />);

  expect(panneau(screen).tagName).toBe('DIALOG');
  expect(panneau(screen)).not.toHaveAttribute('popover');
});

test('modal enferme le focus', async () => {
  const screen = await render(<Demo modal />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => (panneau(screen) as HTMLDialogElement).open).toBe(true);

  const trigger = screen.container.querySelector('button')!;
  trigger.focus();
  expect(document.activeElement).not.toBe(trigger);
});

// La flèche suit le côté RETENU, pas celui demandé : demander « au-dessus »
// sans place au-dessus retourne le panneau, et la flèche doit suivre, sinon
// elle pointerait dans le vide.
test('sans place au-dessus, le panneau se retourne et la flèche suit', async () => {
  const screen = await render(<Demo position="top" />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  const trigger = screen.container.querySelector('button')!.getBoundingClientRect();
  expect(trigger.top).toBeLessThan(200); // pas de place au-dessus dans ce cadre

  await expect.poll(() => panneau(screen).className).toContain('_bottom');
});

test('le panneau demandé en dessous y reste, flèche décorative', async () => {
  const screen = await render(<Demo position="bottom" />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => panneau(screen).className).toContain('_bottom');
  expect(screen.container.querySelector('.ui-popover-arrow')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
});

test('showArrow=false masque la flèche', async () => {
  const screen = await render(<Demo showArrow={false} />);

  expect(panneau(screen)).toHaveClass('_no-arrow');
  expect(screen.container.querySelector('.ui-popover-arrow')).toBeNull();
});

test('le panneau se place à côté de son ancre', async () => {
  const screen = await render(<Demo position="bottom" />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  const trigger = screen.container.querySelector('button')!.getBoundingClientRect();
  const panel = panneau(screen).getBoundingClientRect();

  await expect.poll(() => panel.width > 0).toBe(true);
  expect(panneau(screen).getBoundingClientRect().top).toBeGreaterThanOrEqual(trigger.top);
});

// --- Entrée et sortie ------------------------------------------------------
test('la transition couvre display et overlay, sinon la sortie n’existe pas', async () => {
  const screen = await render(<Demo />);
  const cs = getComputedStyle(panneau(screen));

  expect(cs.transitionProperty).toContain('display');
  expect(cs.transitionProperty).toContain('overlay');
  expect(cs.transitionBehavior).toBe('allow-discrete');
  expect(parseFloat(cs.transitionDuration)).toBeGreaterThan(0);
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

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => panneau(screen).hasAttribute('data-unpositioned')).toBe(false);
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau(screen)).opacity).toBe('1');
});

// En modal le panneau est un `<dialog>`, pas un `[popover]` : le même garde doit
// s'y appliquer, `utils.overlay-motion` couvrant les deux familles.
test('le panneau modal attend aussi sa position', async () => {
  const screen = await render(<Demo modal />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => panneau(screen).hasAttribute('data-unpositioned')).toBe(false);
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau(screen)).opacity).toBe('1');
});
