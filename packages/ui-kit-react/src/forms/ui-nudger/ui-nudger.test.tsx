import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiNudger } from './ui-nudger';

type Ecran = { container: HTMLElement };

const boutons = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-nudger-button')] as HTMLButtonElement[];
const moins = (s: Ecran) => boutons(s)[0]!;
const plus = (s: Ecran) => boutons(s)[1]!;
const valeur = (s: Ecran) => s.container.querySelector('.ui-nudger-value')!.textContent;

function Demo(props: Partial<React.ComponentProps<typeof UiNudger>> = {}) {
  return <UiNudger aria-label="Quantité" {...props} />;
}

function DemoControlee({
  initial = 3,
  ...props
}: Partial<React.ComponentProps<typeof UiNudger>> & { initial?: number }) {
  const [value, setValue] = useState(initial);
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

test('les deux boutons portent un nom accessible, dans un groupe nommé', async () => {
  const screen = await render(<Demo defaultValue={3} />);

  expect(screen.container.querySelector('[role="group"]')).toHaveAttribute(
    'aria-label',
    'Quantité',
  );
  expect(moins(screen)).toHaveAttribute('aria-label', 'Diminuer');
  expect(plus(screen)).toHaveAttribute('aria-label', 'Augmenter');
});

test('la valeur est une région vive, pour être annoncée à chaque cran', async () => {
  const screen = await render(<Demo defaultValue={3} />);

  expect(screen.container.querySelector('.ui-nudger-value')).toHaveAttribute('aria-live', 'polite');
});

test('les deux boutons avancent et reculent d’un pas', async () => {
  const screen = await render(<DemoControlee initial={3} step={2} />);

  await plus(screen).click();
  await expect.poll(() => valeur(screen)).toBe('5');

  await moins(screen).click();
  await expect.poll(() => valeur(screen)).toBe('3');
});

test('aux bornes, seul le bouton concerné est désactivé', async () => {
  const auMin = await render(<Demo defaultValue={0} min={0} max={10} />);
  expect(moins(auMin).disabled).toBe(true);
  expect(plus(auMin).disabled).toBe(false);

  const auMax = await render(<Demo defaultValue={10} min={0} max={10} />);
  expect(moins(auMax).disabled).toBe(false);
  expect(plus(auMax).disabled).toBe(true);
});

test('un pas qui dépasserait la borne est ramené dessus, pas au-delà', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={8} min={0} max={10} step={5} onValueChange={onValueChange} />,
  );

  await plus(screen).click();

  await expect.poll(() => valeur(screen)).toBe('10');
  expect(onValueChange).toHaveBeenLastCalledWith(10);
});

test('à la borne, un clic n’émet rien plutôt qu’une valeur identique', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={10} min={0} max={10} onValueChange={onValueChange} />,
  );

  // Le bouton est désactivé : rien ne part, et surtout pas un doublon.
  plus(screen).click();
  await new Promise((r) => setTimeout(r, 60));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('désactivé ou en lecture seule, les deux boutons sont figés', async () => {
  const desactive = await render(<Demo defaultValue={3} disabled />);
  expect(moins(desactive).disabled).toBe(true);
  expect(plus(desactive).disabled).toBe(true);

  const lecture = await render(<Demo defaultValue={3} readOnly />);
  expect(moins(lecture).disabled).toBe(true);
  expect(plus(lecture).disabled).toBe(true);
});

test('formatValue n’habille que l’affichage', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={3} formatValue={(v) => `${v} kg`} onValueChange={onValueChange} />,
  );

  expect(valeur(screen)).toBe('3 kg');

  await plus(screen).click();

  expect(onValueChange).toHaveBeenLastCalledWith(4);
  await expect.poll(() => valeur(screen)).toBe('4 kg');
});

test('non contrôlé, le compteur garde sa valeur lui-même', async () => {
  const screen = await render(<Demo defaultValue={7} />);

  await plus(screen).click();

  await expect.poll(() => valeur(screen)).toBe('8');
});

test('un name rend la valeur soumissible par un formulaire', async () => {
  const screen = await render(<Demo defaultValue={4} name="quantite" />);

  const cache = screen.container.querySelector('input[type="hidden"]') as HTMLInputElement;
  expect(cache.name).toBe('quantite');
  expect(cache.value).toBe('4');
});

test('sans nom accessible, un avertissement est émis en développement', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiNudger defaultValue={1} />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('ui-nudger');
  warn.mockRestore();
});

test('le focus qui passe d’un bouton à l’autre ne quitte pas le compteur', async () => {
  const onBlur = vi.fn();
  const screen = await render(<Demo defaultValue={3} onBlur={onBlur} />);

  moins(screen).focus();
  plus(screen).focus();
  await new Promise((r) => setTimeout(r, 60));

  expect(onBlur).not.toHaveBeenCalled();
});
