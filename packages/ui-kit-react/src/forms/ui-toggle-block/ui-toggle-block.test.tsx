import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiToggleBlock, type UiToggleBlockProps } from './ui-toggle-block';

type Ecran = { container: HTMLElement };

const bloc = (s: Ecran) => s.container.querySelector('.ui-toggle-block') as HTMLElement;
const hit = (s: Ecran) => s.container.querySelector('.ui-toggle-block-hit') as HTMLLabelElement;
const corps = (s: Ecran) => s.container.querySelector('.ui-toggle-block-body') as HTMLElement;
const entree = (s: Ecran) => s.container.querySelector('input') as HTMLInputElement;

function Demo(props: Partial<UiToggleBlockProps<boolean>> = {}) {
  return <UiToggleBlock<boolean> label="Notifications" {...props} />;
}

function DemoControlee({
  initial = false,
  ...props
}: Partial<UiToggleBlockProps<boolean>> & { initial?: boolean }) {
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

// --- La surface cliquable --------------------------------------------------

test('la zone de clic est un label étiré qui pointe vers le contrôle', async () => {
  const screen = await render(<Demo />);

  // C'est ce `for` qui rend toute la surface activante, sans un seul
  // gestionnaire de clic.
  expect(hit(screen).htmlFor).toBe(entree(screen).id);
  expect(hit(screen).textContent).toBe('');
});

test('cliquer n’importe où sur le bloc sélectionne le contrôle', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee onValueChange={onValueChange} />);

  await hit(screen).click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(true);
  await expect.poll(() => entree(screen).checked).toBe(true);
});

test('en lecture seule, le label perd son for et n’active plus rien', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee readOnly onValueChange={onValueChange} />);

  expect(hit(screen).htmlFor).toBe('');
  await hit(screen).click();
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
  expect(entree(screen).checked).toBe(false);
});

// --- Nom accessible -------------------------------------------------------

test('le corps du bloc nomme le contrôle', async () => {
  const screen = await render(<Demo description="Un résumé quotidien." />);

  // N'importe quel balisage peut être projeté sans être enveloppé dans un
  // `<label>` : c'est `aria-labelledby` qui fait le lien.
  expect(entree(screen).getAttribute('aria-labelledby')).toBe(corps(screen).id);
  expect(corps(screen).textContent).toContain('Notifications');
});

test('un aria-label explicite remplace le corps, sans le doubler', async () => {
  const screen = await render(<Demo aria-label="Recevoir les notifications" />);

  // `aria-labelledby` primerait sur `aria-label` : les deux sont exclusifs.
  expect(entree(screen)).toHaveAttribute('aria-label', 'Recevoir les notifications');
  expect(entree(screen)).not.toHaveAttribute('aria-labelledby');
});

test('un aria-labelledby explicite prime sur le corps', async () => {
  const screen = await render(
    <>
      <span id="ext">Étiquette externe</span>
      <Demo aria-labelledby="ext" />
    </>,
  );

  expect(entree(screen)).toHaveAttribute('aria-labelledby', 'ext');
});

test('sans aucun nom, un avertissement est émis en développement', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiToggleBlock<boolean> />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('ui-toggle-block');
  warn.mockRestore();
});

test('en mode radio sans blockValue, l’avertissement le dit', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiToggleBlock<string> indicator="radio" label="Petit" />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('blockValue');
  warn.mockRestore();
});

// --- Les trois indicateurs ------------------------------------------------

test('checkbox est l’indicateur par défaut', async () => {
  const screen = await render(<Demo />);

  expect(entree(screen).type).toBe('checkbox');
  expect(screen.container.querySelector('.ui-checkbox')).not.toBeNull();
});

test('l’indicateur toggle est une vraie instance de ui-toggle', async () => {
  const screen = await render(<Demo indicator="toggle" />);

  // Il garde l'allure et le rôle qu'il a seul.
  expect(screen.container.querySelector('.ui-toggle')).not.toBeNull();
  expect(entree(screen)).toHaveAttribute('role', 'switch');
});

test('l’indicateur radio porte sa propre valeur et suit le modèle', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiToggleBlock<string>
      indicator="radio"
      name="taille"
      blockValue="m"
      value="m"
      label="Moyen"
      onValueChange={onValueChange}
    />,
  );

  expect(entree(screen).type).toBe('radio');
  expect(entree(screen).checked).toBe(true);
  expect(bloc(screen).classList.contains('_checked')).toBe(true);
});

test('un groupe de radios n’en garde qu’un de sélectionné', async () => {
  const Groupe = () => {
    const [t, setT] = useState('m');
    return (
      <>
        {['s', 'm'].map((v) => (
          <UiToggleBlock<string>
            key={v}
            indicator="radio"
            name="taille"
            blockValue={v}
            value={t}
            onValueChange={setT}
            label={v}
          />
        ))}
      </>
    );
  };
  const screen = await render(<Groupe />);

  const entrees = [...screen.container.querySelectorAll('input')] as HTMLInputElement[];
  expect(entrees[1]!.checked).toBe(true);

  await screen.getByRole('radio', { name: 's' }).click();

  await expect.poll(() => entrees[0]!.checked).toBe(true);
  expect(entrees[1]!.checked).toBe(false);
});

test('trueValue et falseValue portent un modèle non booléen', async () => {
  const onValueChange = vi.fn();
  const Demo2 = () => {
    const [v, setV] = useState<string>('non');
    return (
      <UiToggleBlock<string>
        label="Accord"
        trueValue="oui"
        falseValue="non"
        value={v}
        onValueChange={(next) => {
          setV(next);
          onValueChange(next);
        }}
      />
    );
  };
  const screen = await render(<Demo2 />);

  await hit(screen).click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe('oui');
});

// --- États et rendu -------------------------------------------------------

test('l’indicateur masqué reste opérable, juste hors de vue', async () => {
  const screen = await render(<Demo hideIndicator />);

  // Carte de sélection : le contrôle doit rester focalisable et activable.
  expect(bloc(screen).classList.contains('_hide-indicator')).toBe(true);
  expect(entree(screen).disabled).toBe(false);
  const zone = screen.container.querySelector('.ui-toggle-block-control') as HTMLElement;
  expect(getComputedStyle(zone).opacity).toBe('0');
  expect(Math.round(zone.getBoundingClientRect().width)).toBe(1);
});

test('désactivé, le contrôle et la surface sont inertes', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee disabled onValueChange={onValueChange} />);

  expect(entree(screen).disabled).toBe(true);
  await hit(screen).click();
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('invalide, le bloc et le contrôle le signalent', async () => {
  const screen = await render(<Demo invalid />);

  expect(bloc(screen).classList.contains('_invalid')).toBe(true);
  expect(entree(screen)).toHaveAttribute('aria-invalid', 'true');
});

test('requis pose l’attribut natif et le marqueur visuel', async () => {
  const screen = await render(<Demo required />);

  expect(entree(screen).required).toBe(true);
  expect(screen.container.querySelector('.ui-toggle-block-required')?.textContent).toBe('*');
  // Décoratif : l'astérisque ne doit pas être lu deux fois.
  expect(screen.container.querySelector('.ui-toggle-block-required')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
});

test('les modifiers de disposition sont posés sur la racine', async () => {
  const screen = await render(<Demo indicatorPosition="end" align="start" size="large" fluid />);

  const classes = bloc(screen).classList;
  expect(classes.contains('_indicator-end')).toBe(true);
  expect(classes.contains('_align-start')).toBe(true);
  expect(classes.contains('_large')).toBe(true);
  expect(classes.contains('_fluid')).toBe(true);
});

test('un contenu projeté interactif garde son propre clic', async () => {
  const surLien = vi.fn();
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee onValueChange={onValueChange}>
      <a
        href="#detail"
        onClick={(e) => {
          e.preventDefault();
          surLien();
        }}
      >
        Détails
      </a>
    </DemoControlee>,
  );

  await screen.getByRole('link', { name: 'Détails' }).click();

  // Le lien est élevé au-dessus de la zone de clic : il ne doit pas
  // sélectionner le bloc au passage.
  await expect.poll(() => surLien.mock.calls.length).toBe(1);
  expect(onValueChange).not.toHaveBeenCalled();
});

test('le focus au clavier cerne le bloc, un clic non', async () => {
  const screen = await render(<Demo />);

  entree(screen).focus();
  await new Promise((r) => setTimeout(r, 60));

  // Un focus programmatique n'est pas `:focus-visible` sur une case : la classe
  // ne doit donc pas être posée.
  expect(bloc(screen).classList.contains('_focus-visible')).toBe(false);
  // La bordure, elle, répond toujours au focus, par `:focus-within`.
  expect(bloc(screen).matches(':focus-within')).toBe(true);
});
