import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiKnob, type UiKnobProps } from './ui-knob';

function Host(props: Partial<UiKnobProps>) {
  return <UiKnob aria-label="Volume" {...props} />;
}

const knob = (container: HTMLElement) => container.querySelector<HTMLElement>('.ui-knob')!;
const arc = (container: HTMLElement) => container.querySelector<SVGPathElement>('.ui-knob-value')!;

const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

/** Le point d'arrivée de l'arc rempli, lu dans le `d` du tracé. */
function arcEnd(container: HTMLElement): [number, number] {
  const d = arc(container).getAttribute('d')!;
  const parts = d.trim().split(/\s+/);
  return [Number(parts[parts.length - 2]), Number(parts[parts.length - 1])];
}

test('le cadran est un curseur qui annonce ses bornes et sa valeur', async () => {
  const screen = await render(<Host min={0} max={200} defaultValue={50} />);
  const el = knob(screen.container);

  expect(el).toHaveAttribute('role', 'slider');
  expect(el).toHaveAttribute('aria-valuemin', '0');
  expect(el).toHaveAttribute('aria-valuemax', '200');
  expect(el).toHaveAttribute('aria-valuenow', '50');
  expect(el).toHaveAttribute('aria-label', 'Volume');
  expect(el.tabIndex).toBe(0);
});

test('la valeur est bornée à l’intervalle', async () => {
  const trop = await render(<Host min={0} max={10} defaultValue={99} />);
  const pasAssez = await render(<Host min={5} max={10} defaultValue={-3} />);

  expect(knob(trop.container)).toHaveAttribute('aria-valuenow', '10');
  expect(knob(pasAssez.container)).toHaveAttribute('aria-valuenow', '5');
});

// Le dessin est décoratif : la valeur est portée par le rôle, sinon elle serait
// annoncée deux fois, ou pas du tout.
test('le dessin est décoratif', async () => {
  const screen = await render(<Host />);

  expect(screen.container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.container.querySelector('.ui-knob-text')).toHaveAttribute('aria-hidden', 'true');
});

test('les flèches déplacent la valeur d’un pas', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host defaultValue={50} step={5} onValueChange={onValueChange} />);
  const el = knob(screen.container);

  touche(el, 'ArrowRight');
  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('55');

  touche(el, 'ArrowDown');
  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('50');

  expect(onValueChange).toHaveBeenCalledTimes(2);
});

test('Page haut et Page bas déplacent de dix pas', async () => {
  const screen = await render(<Host defaultValue={50} step={2} />);
  const el = knob(screen.container);

  touche(el, 'PageUp');
  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('70');

  touche(el, 'PageDown');
  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('50');
});

test('Début et Fin vont aux bornes', async () => {
  const screen = await render(<Host min={10} max={90} defaultValue={50} />);
  const el = knob(screen.container);

  touche(el, 'End');
  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('90');

  touche(el, 'Home');
  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('10');
});

test('le clavier s’arrête aux bornes', async () => {
  const screen = await render(<Host min={0} max={3} defaultValue={3} />);
  const el = knob(screen.container);

  touche(el, 'ArrowRight');
  await new Promise((r) => setTimeout(r, 30));

  expect(el).toHaveAttribute('aria-valuenow', '3');
});

// Un pas décimal ne doit pas laisser filer la dérive flottante : 0,1 + 0,2 vaut
// 0,30000000000000004 si on ne rattrape pas la précision.
test('un pas décimal reste propre', async () => {
  const screen = await render(<Host min={0} max={1} step={0.1} defaultValue={0.2} />);
  const el = knob(screen.container);

  touche(el, 'ArrowRight');

  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('0.3');
});

test('la valeur se cale sur la grille du pas', async () => {
  const screen = await render(<Host defaultValue={12} step={10} />);
  const el = knob(screen.container);

  // 12 n'est pas sur la grille : la première touche l'y ramène.
  touche(el, 'ArrowRight');

  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('20');
});

test('l’arc rempli suit la valeur', async () => {
  const screen = await render(<Host defaultValue={0} />);
  const depart = arcEnd(screen.container);

  touche(knob(screen.container), 'End');

  await expect.poll(() => arcEnd(screen.container)).not.toEqual(depart);
});

// Le trait épais doit rester dans la boîte : le rayon de l'arc se rétracte de
// la moitié de l'épaisseur, sinon le trait déborde sur l'anneau de focus.
test('un trait épais rentre dans la boîte', async () => {
  const fin = await render(<Host strokeWidth={4} defaultValue={100} />);
  const epais = await render(<Host strokeWidth={40} defaultValue={100} />);

  // `getBBox` rend la géométrie SANS le trait : c'est la ligne médiane. On
  // l'élargit donc de la demi-épaisseur, qui est ce qui déborderait.
  const encombrement = (container: HTMLElement, strokeWidth: number) => {
    const box = arc(container).getBBox();
    const marge = strokeWidth / 2;
    return [box.x - marge, box.y - marge, box.x + box.width + marge, box.y + box.height + marge];
  };

  for (const [x1, y1, x2, y2] of [
    encombrement(fin.container, 4),
    encombrement(epais.container, 40),
  ]) {
    expect(x1).toBeGreaterThanOrEqual(0);
    expect(y1!).toBeGreaterThanOrEqual(0);
    expect(x2!).toBeLessThanOrEqual(100);
    expect(y2!).toBeLessThanOrEqual(100);
  }
});

test('le gabarit habille la valeur centrale, et elle est alors annoncée', async () => {
  const screen = await render(<Host valueTemplate="{value}%" defaultValue={42} />);

  expect(screen.container.querySelector('.ui-knob-text')).toHaveTextContent('42%');
  expect(knob(screen.container)).toHaveAttribute('aria-valuetext', '42%');
});

// Sans gabarit, `aria-valuetext` répéterait la valeur brute : autant l'omettre.
test('sans gabarit, aucun aria-valuetext', async () => {
  const screen = await render(<Host defaultValue={42} />);

  expect(knob(screen.container)).not.toHaveAttribute('aria-valuetext');
});

test('showValue=false retire la valeur centrale', async () => {
  const screen = await render(<Host showValue={false} />);

  expect(screen.container.querySelector('.ui-knob-text')).toBeNull();
});

test('désactivé, le cadran sort du parcours clavier et ne bouge plus', async () => {
  const screen = await render(<Host disabled defaultValue={50} />);
  const el = knob(screen.container);

  expect(el).toHaveClass('_disabled');
  expect(el).toHaveAttribute('aria-disabled', 'true');
  expect(el.tabIndex).toBe(-1);

  touche(el, 'ArrowRight');
  await new Promise((r) => setTimeout(r, 30));
  expect(el).toHaveAttribute('aria-valuenow', '50');
});

// En lecture seule le cadran reste atteignable et lisible : c'est la saisie qui
// est fermée, pas la consultation.
test('en lecture seule, le cadran reste focalisable mais ne bouge plus', async () => {
  const screen = await render(<Host readOnly defaultValue={50} />);
  const el = knob(screen.container);

  expect(el).toHaveClass('_readonly');
  expect(el).toHaveAttribute('aria-readonly', 'true');
  expect(el.tabIndex).toBe(0);

  touche(el, 'ArrowRight');
  await new Promise((r) => setTimeout(r, 30));
  expect(el).toHaveAttribute('aria-valuenow', '50');
});

test('en erreur, le modifieur est posé', async () => {
  const screen = await render(<Host invalid />);

  expect(knob(screen.container)).toHaveClass('_invalid');
});

test('les couleurs passées en prop posent leurs crochets', async () => {
  const screen = await render(<Host valueColor="rgb(1, 2, 3)" rangeColor="rgb(4, 5, 6)" />);
  const el = knob(screen.container);

  expect(el.style.getPropertyValue('--ui-knob-value-color')).toBe('rgb(1, 2, 3)');
  expect(getComputedStyle(arc(screen.container)).stroke).toBe('rgb(1, 2, 3)');
});

test('le style de l’appelant survit aux couleurs', async () => {
  const screen = await render(<Host style={{ opacity: 0.5 }} valueColor="red" />);

  expect(knob(screen.container).style.opacity).toBe('0.5');
});

/**
 * Presse le cadran à une position, en coordonnées relatives au centre :
 * `(1, 0)` est plein est, `(0, -1)` plein sud. `pointerId: 1` n'est pas
 * décoratif : la capture de pointeur refuse l'identifiant 0.
 */
function presser(el: HTMLElement, dx: number, dy: number) {
  const r = el.getBoundingClientRect();
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      clientX: r.left + r.width * (0.5 + dx / 2),
      clientY: r.top + r.height * (0.5 - dy / 2),
    }),
  );
}

test('le glissement change la valeur', async () => {
  const screen = await render(<Host defaultValue={0} />);
  const el = knob(screen.container);

  // Plein est : les quatre cinquièmes de la course, l'arc partant du bas à
  // gauche.
  presser(el, 1, 0);

  await expect.poll(() => Number(el.getAttribute('aria-valuenow'))).toBe(80);
});

// L'ouverture du bas ne correspond à aucune valeur : un clic dedans ne doit pas
// faire sauter le cadran à une borne.
test('un appui dans l’ouverture du bas ne change rien', async () => {
  const screen = await render(<Host defaultValue={50} />);
  const el = knob(screen.container);

  presser(el, 0, -1);

  await new Promise((r) => setTimeout(r, 30));
  expect(el).toHaveAttribute('aria-valuenow', '50');
});

test('désactivé, le pointeur ne change rien non plus', async () => {
  const screen = await render(<Host disabled defaultValue={50} />);
  const el = knob(screen.container);

  presser(el, 1, 0);

  await new Promise((r) => setTimeout(r, 30));
  expect(el).toHaveAttribute('aria-valuenow', '50');
});

test('en mode contrôlé, la valeur de l’appelant gagne', async () => {
  function Controlled() {
    const [value, setValue] = useState(20);
    return (
      <>
        <button type="button" onClick={() => setValue(80)}>
          Imposer
        </button>
        <Host value={value} />
      </>
    );
  }
  const screen = await render(<Controlled />);
  const el = knob(screen.container);

  // Le parent ne suit pas la touche : rien ne bouge.
  touche(el, 'ArrowRight');
  await new Promise((r) => setTimeout(r, 30));
  expect(el).toHaveAttribute('aria-valuenow', '20');

  await screen.getByRole('button', { name: 'Imposer' }).click();
  await expect.poll(() => el.getAttribute('aria-valuenow')).toBe('80');
});

test('les tailles changent le diamètre', async () => {
  const petit = await render(<Host size="small" />);
  const grand = await render(<Host size="large" />);

  expect(knob(petit.container).getBoundingClientRect().width).toBeLessThan(
    knob(grand.container).getBoundingClientRect().width,
  );
});
