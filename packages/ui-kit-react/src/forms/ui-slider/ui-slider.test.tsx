import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiSlider, type SliderValue } from './ui-slider';

type Ecran = { container: HTMLElement };

const racine = (s: Ecran) => s.container.querySelector('.ui-slider') as HTMLElement;
const poignees = (s: Ecran) =>
  [...s.container.querySelectorAll('[role="slider"]')] as HTMLElement[];
const portion = (s: Ecran) => s.container.querySelector('.ui-slider-range') as HTMLElement;
const reperes = (s: Ecran) => [...s.container.querySelectorAll('.ui-slider-mark')] as HTMLElement[];

function Demo(props: Partial<React.ComponentProps<typeof UiSlider>> = {}) {
  return <UiSlider aria-label="Volume" {...props} />;
}

function DemoControlee({
  initial,
  ...props
}: Partial<React.ComponentProps<typeof UiSlider>> & { initial?: SliderValue }) {
  const [value, setValue] = useState<SliderValue>(initial ?? (props.range ? [20, 60] : 40));
  return (
    <Demo
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

const touche = (el: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));

/** Presse la racine à une position relative (0 = début, 1 = fin). */
function presser(el: HTMLElement, ratio: number, vertical = false) {
  const r = el.getBoundingClientRect();
  const init: PointerEventInit = {
    bubbles: true,
    pointerId: 1,
    clientX: vertical ? r.left + r.width / 2 : r.left + r.width * ratio,
    clientY: vertical ? r.bottom - r.height * ratio : r.top + r.height / 2,
  };
  el.dispatchEvent(new PointerEvent('pointerdown', init));
  return init;
}

// --- Sémantique ------------------------------------------------------------

test('chaque poignée est un slider ARIA complet', async () => {
  const screen = await render(<Demo defaultValue={40} min={0} max={100} />);

  const [p] = poignees(screen);
  expect(poignees(screen)).toHaveLength(1);
  expect(p).toHaveAttribute('aria-valuemin', '0');
  expect(p).toHaveAttribute('aria-valuemax', '100');
  expect(p).toHaveAttribute('aria-valuenow', '40');
  expect(p).toHaveAttribute('aria-orientation', 'horizontal');
  expect(p).toHaveAttribute('aria-label', 'Volume');
  expect(p!.tabIndex).toBe(0);
});

test('en range, deux poignées portent deux noms distincts', async () => {
  const screen = await render(
    <Demo defaultValue={[20, 60]} range ariaLabelStart="Minimum" ariaLabelEnd="Maximum" />,
  );

  const [debut, fin] = poignees(screen);
  expect(poignees(screen)).toHaveLength(2);
  expect(debut).toHaveAttribute('aria-label', 'Minimum');
  expect(fin).toHaveAttribute('aria-label', 'Maximum');
  expect(debut).toHaveAttribute('aria-valuenow', '20');
  expect(fin).toHaveAttribute('aria-valuenow', '60');
});

test('sans nom accessible, un avertissement est émis en développement', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiSlider defaultValue={10} />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('ui-slider');
  warn.mockRestore();
});

test('en range sans noms de poignées, l’avertissement le dit', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiSlider aria-label="Prix" range defaultValue={[10, 20]} />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('range');
  warn.mockRestore();
});

test('désactivé, la poignée sort du parcours de tabulation', async () => {
  const screen = await render(<Demo defaultValue={40} disabled />);

  expect(poignees(screen)[0]!.tabIndex).toBe(-1);
  expect(poignees(screen)[0]).toHaveAttribute('aria-disabled', 'true');
});

test('en lecture seule, la poignée reste atteignable mais l’annonce', async () => {
  const screen = await render(<Demo defaultValue={40} readOnly />);

  expect(poignees(screen)[0]!.tabIndex).toBe(0);
  expect(poignees(screen)[0]).toHaveAttribute('aria-readonly', 'true');
});

// --- Position --------------------------------------------------------------

test('la portion remplie décrit la valeur', async () => {
  const screen = await render(<Demo defaultValue={40} min={0} max={100} />);

  expect(portion(screen).style.width).toBe('40%');
  expect(portion(screen).style.insetInlineStart).toBe('0%');
  expect(poignees(screen)[0]!.style.insetInlineStart).toBe('40%');
});

test('en range, la portion part de la première poignée', async () => {
  const screen = await render(<Demo defaultValue={[20, 60]} range />);

  expect(portion(screen).style.insetInlineStart).toBe('20%');
  expect(portion(screen).style.width).toBe('40%');
});

test('la position tient compte de min et max, pas seulement de la valeur', async () => {
  const screen = await render(<Demo defaultValue={0} min={-50} max={50} />);

  // 0 au milieu de [-50, 50].
  expect(poignees(screen)[0]!.style.insetInlineStart).toBe('50%');
});

test('en vertical, la position passe par bottom et l’orientation est annoncée', async () => {
  const screen = await render(<Demo defaultValue={60} orientation="vertical" />);

  expect(poignees(screen)[0]).toHaveAttribute('aria-orientation', 'vertical');
  expect(poignees(screen)[0]!.style.bottom).toBe('60%');
  expect(portion(screen).style.height).toBe('60%');
});

// --- Clavier ---------------------------------------------------------------

test('les flèches déplacent la poignée d’un pas', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={40} step={5} onValueChange={onValueChange} />,
  );

  touche(poignees(screen)[0]!, 'ArrowRight');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(45);

  touche(poignees(screen)[0]!, 'ArrowLeft');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(40);
});

test('Page haut et Page bas avancent de dix pas', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={40} step={2} onValueChange={onValueChange} />,
  );

  touche(poignees(screen)[0]!, 'PageUp');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(60);
});

test('Début et Fin vont aux bornes', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={40} min={10} max={90} onValueChange={onValueChange} />,
  );

  touche(poignees(screen)[0]!, 'End');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(90);

  touche(poignees(screen)[0]!, 'Home');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(10);
});

test('en vertical, les flèches haut et bas font le même travail', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={40} orientation="vertical" onValueChange={onValueChange} />,
  );

  touche(poignees(screen)[0]!, 'ArrowUp');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(41);
});

test('la valeur ne franchit jamais les bornes', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={100} max={100} onValueChange={onValueChange} />,
  );

  touche(poignees(screen)[0]!, 'ArrowRight');
  await new Promise((r) => setTimeout(r, 60));

  // À la borne, rien n'est émis plutôt qu'une valeur identique.
  expect(onValueChange).not.toHaveBeenCalled();
});

test('un pas décimal n’introduit pas de dérive flottante', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={0.4} min={0} max={1} step={0.1} onValueChange={onValueChange} />,
  );

  touche(poignees(screen)[0]!, 'ArrowRight');
  // Sans l'arrondi à la précision du pas, 0.4 + 0.1 vaudrait 0.5000000000000001.
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(0.5);
});

test('désactivé ou en lecture seule, le clavier ne bouge rien', async () => {
  const surDesactive = vi.fn();
  const desactive = await render(
    <DemoControlee initial={40} disabled onValueChange={surDesactive} />,
  );
  touche(poignees(desactive)[0]!, 'ArrowRight');

  const surLecture = vi.fn();
  const lecture = await render(<DemoControlee initial={40} readOnly onValueChange={surLecture} />);
  touche(poignees(lecture)[0]!, 'ArrowRight');

  await new Promise((r) => setTimeout(r, 80));
  expect(surDesactive).not.toHaveBeenCalled();
  expect(surLecture).not.toHaveBeenCalled();
});

// --- Range -----------------------------------------------------------------

test('en range, chaque poignée bouge indépendamment', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee
      initial={[20, 60]}
      range
      step={5}
      ariaLabelStart="A"
      ariaLabelEnd="B"
      onValueChange={onValueChange}
    />,
  );

  touche(poignees(screen)[1]!, 'ArrowRight');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual([20, 65]);

  touche(poignees(screen)[0]!, 'ArrowLeft');
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual([15, 65]);
});

test('minStepsBetweenHandles empêche les poignées de se croiser', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee
      initial={[40, 50]}
      range
      step={5}
      minStepsBetweenHandles={2}
      ariaLabelStart="A"
      ariaLabelEnd="B"
      onValueChange={onValueChange}
    />,
  );

  // L'écart minimal vaut 2 pas de 5, donc 10 : la poignée de début est déjà
  // à sa limite et ne doit pas avancer.
  touche(poignees(screen)[0]!, 'ArrowRight');
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

// --- Pointeur --------------------------------------------------------------

test('une pression sur la piste saisit la valeur pointée', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={10} step={1} onValueChange={onValueChange} />,
  );

  presser(racine(screen), 0.75);

  await expect.poll(() => onValueChange.mock.calls.length).toBeGreaterThan(0);
  const emis = onValueChange.mock.calls.at(-1)?.[0] as number;
  expect(emis).toBeGreaterThan(60);
  expect(emis).toBeLessThan(90);
});

test('en range, une pression saisit la poignée la plus proche', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee
      initial={[20, 80]}
      range
      ariaLabelStart="A"
      ariaLabelEnd="B"
      onValueChange={onValueChange}
    />,
  );

  // Pression près du début : c'est la première poignée qui doit suivre.
  presser(racine(screen), 0.1);

  await expect.poll(() => onValueChange.mock.calls.length).toBeGreaterThan(0);
  const emis = onValueChange.mock.calls.at(-1)?.[0] as number[];
  expect(emis[1]).toBe(80);
  expect(emis[0]).toBeLessThan(20);
});

test('la fin du glissement est notifiée une seule fois', async () => {
  const onSlideEnd = vi.fn();
  const screen = await render(<DemoControlee initial={10} onSlideEnd={onSlideEnd} />);
  const el = racine(screen);

  const init = presser(el, 0.5);
  el.dispatchEvent(new PointerEvent('pointerup', init));
  await new Promise((r) => setTimeout(r, 60));

  expect(onSlideEnd).toHaveBeenCalledTimes(1);
});

test('saisir une poignée ne fait pas défiler la page sous le curseur', async () => {
  // Le `focus()` pose sur la poignee faisait defiler la vue, ce qui decalait le
  // rectangle de la piste : `valueFromPointer` mappait alors le meme `clientX`
  // sur une valeur toute autre. Mesure de l'epoque : `left` passait de 16 a
  // -192 au premier appui, et un glissement vers 70 arrivait a 100.
  const onValueChange = vi.fn();
  const screen = await render(
    <div style={{ width: 200, overflowX: 'scroll' }}>
      <div style={{ width: 800 }}>
        <DemoControlee initial={40} onValueChange={onValueChange} />
      </div>
    </div>,
  );

  const el = racine(screen);
  const avant = Math.round(el.getBoundingClientRect().left);
  presser(el, 0.7);
  await new Promise((r) => setTimeout(r, 80));

  expect(Math.round(el.getBoundingClientRect().left)).toBe(avant);
  expect(document.activeElement).toBe(poignees(screen)[0]);
  const emis = onValueChange.mock.calls.at(-1)?.[0] as number;
  expect(emis).toBeGreaterThan(60);
  expect(emis).toBeLessThan(80);
});

test('désactivé, une pression sur la piste ne fait rien', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={10} disabled onValueChange={onValueChange} />,
  );

  presser(racine(screen), 0.75);
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

// --- Repères ---------------------------------------------------------------

test('marks rend un repère par pas, et marque ceux qui sont atteints', async () => {
  const screen = await render(<Demo defaultValue={40} step={10} marks />);

  // 11 repères pour 10 pas de 0 à 100.
  expect(reperes(screen)).toHaveLength(11);
  expect(reperes(screen).filter((m) => m.classList.contains('_active'))).toHaveLength(5);
  // Décoratifs : ils ne doivent pas entrer dans l'arbre d'accessibilité.
  expect(screen.container.querySelector('.ui-slider-marks')).toHaveAttribute('aria-hidden', 'true');
});

test('un pas trop fin n’inonde pas le DOM de repères', async () => {
  const screen = await render(<Demo defaultValue={40} min={0} max={1000} step={1} marks />);

  // 1001 repères seraient absurdes : au-delà de 100, aucun n'est rendu.
  expect(reperes(screen)).toHaveLength(0);
});

// --- Valeur ----------------------------------------------------------------

test('non contrôlé, le curseur garde sa valeur lui-même', async () => {
  const screen = await render(<Demo defaultValue={40} step={10} />);

  touche(poignees(screen)[0]!, 'ArrowRight');

  await expect.poll(() => poignees(screen)[0]?.getAttribute('aria-valuenow')).toBe('50');
});

test('en range non contrôlé, le défaut couvre toute la plage', async () => {
  const screen = await render(<Demo range min={10} max={90} ariaLabelStart="A" ariaLabelEnd="B" />);

  expect(poignees(screen)[0]).toHaveAttribute('aria-valuenow', '10');
  expect(poignees(screen)[1]).toHaveAttribute('aria-valuenow', '90');
});
