import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { useUiMotion, type UiMotionOptions } from './use-ui-motion';

function Hote({ initial = false, ...options }: UiMotionOptions & { initial?: boolean }) {
  const [open, setOpen] = useState(initial);
  // Destructuré en tête : le linter des hooks refuse qu'on lise les propriétés
  // d'un résultat contenant une ref de rappel au fil du rendu.
  const { present, ref, className, style } = useUiMotion(open, options);

  return (
    <>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        basculer
      </button>
      {present && (
        <div ref={ref} data-testid="panneau" className={className} style={style}>
          contenu
        </div>
      )}
    </>
  );
}

const panneau = (screen: { container: HTMLElement }) =>
  screen.container.querySelector<HTMLElement>('[data-testid="panneau"]');

test('fermé, rien n’est rendu', async () => {
  const screen = await render(<Hote />);

  expect(panneau(screen)).toBeNull();
});

// L'élément doit être là dès la PREMIÈRE image : monté dans un effet, son
// entrée partirait une image trop tard, et ça se voit.
test('l’ouverture rend l’élément tout de suite, avec sa classe d’entrée', async () => {
  const screen = await render(<Hote preset="slide-up" />);

  await screen.getByRole('button', { name: 'basculer' }).click();

  await expect.poll(() => panneau(screen)?.className).toBe('ui-motion-slide-up-enter');
});

// Le cœur de la brique : là où Angular retient le nœud sortant avec
// `animate.leave`, c'est `present` qui le retient ici.
test('la fermeture garde l’élément le temps de sa sortie', async () => {
  const screen = await render(<Hote initial preset="fade" duration="300ms" />);

  await screen.getByRole('button', { name: 'basculer' }).click();

  await expect.poll(() => panneau(screen)?.className).toBe('ui-motion-fade-leave');
  await expect.poll(() => panneau(screen), { timeout: 2000 }).toBeNull();
});

test('onExited prévient une fois la sortie finie', async () => {
  const onExited = vi.fn();
  const screen = await render(<Hote initial duration="120ms" onExited={onExited} />);

  await screen.getByRole('button', { name: 'basculer' }).click();

  await expect.poll(() => onExited.mock.calls.length, { timeout: 2000 }).toBe(1);
  expect(panneau(screen)).toBeNull();
});

// Une sortie interrompue ne doit pas démonter l'élément après coup : l'animation
// annulée REJETTE sa promesse, d'où `allSettled` et le drapeau d'annulation.
test('rouvrir pendant la sortie annule le démontage', async () => {
  const screen = await render(<Hote initial duration="300ms" />);
  const bouton = screen.getByRole('button', { name: 'basculer' });

  await bouton.click();
  await expect.poll(() => panneau(screen)?.className).toBe('ui-motion-fade-leave');
  await bouton.click();

  await expect.poll(() => panneau(screen)?.className).toBe('ui-motion-fade-enter');
  // Largement plus que la durée de sortie : si le démontage passait quand même,
  // il serait arrivé ici.
  await new Promise((resolve) => setTimeout(resolve, 500));
  expect(panneau(screen)).not.toBeNull();
});

// Sans animation à attendre, le démontage est immédiat : c'est ce qui rend le
// mouvement réduit et le coupe-circuit global gratuits.
test('mouvement coupé : aucune classe, et la sortie est instantanée', async () => {
  const screen = await render(<Hote initial disabled />);

  expect(panneau(screen)?.className).toBe('');
  await screen.getByRole('button', { name: 'basculer' }).click();

  await expect.poll(() => panneau(screen)).toBeNull();
});

test('les réglages de l’exemplaire passent par les custom properties', async () => {
  const screen = await render(
    <Hote
      initial
      preset="zoom"
      duration="120ms"
      delay="40ms"
      easing="linear"
      leaveEasing="ease-in"
      distance="12px"
      scale={0.9}
    />,
  );
  const style = panneau(screen)!.style;

  expect(style.getPropertyValue('--ui-motion-duration')).toBe('120ms');
  expect(style.getPropertyValue('--ui-motion-delay')).toBe('40ms');
  expect(style.getPropertyValue('--ui-motion-easing-enter')).toBe('linear');
  // `leaveEasing` gagne sur `easing`, qui ne sert alors qu'à l'entrée.
  expect(style.getPropertyValue('--ui-motion-easing-leave')).toBe('ease-in');
  expect(style.getPropertyValue('--ui-motion-distance')).toBe('12px');
  expect(style.getPropertyValue('--ui-motion-scale')).toBe('0.9');
});

// La durée n'est jamais devinée : elle est LUE sur l'animation, donc un réglage
// d'exemplaire est réellement celui qui décide du moment du démontage.
test('la durée réglée est celle de l’animation jouée', async () => {
  const screen = await render(<Hote initial preset="slide-down" duration="250ms" />);
  const element = panneau(screen)!;

  const animation = element
    .getAnimations()
    .find((a) => String((a as CSSAnimation).animationName).startsWith('ui-motion-'));

  expect(animation).toBeDefined();
  expect(animation!.effect!.getTiming().duration).toBe(250);
});
