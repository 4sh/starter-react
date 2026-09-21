import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiToggleButton,
  type ToggleButtonValue,
  type UiToggleButtonProps,
} from './ui-toggle-button';

const JOURS = [
  { value: 'lun', label: 'Lun' },
  { value: 'mar', label: 'Mar' },
  { value: 'mer', label: 'Mer', disabled: true },
];

type Ecran = { container: HTMLElement };

const racine = (s: Ecran) => s.container.querySelector('.ui-toggle-button') as HTMLElement;
const boutons = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-toggle-button-item')] as HTMLButtonElement[];
const bouton = (s: Ecran) => boutons(s)[0]!;

function Demo(props: Partial<UiToggleButtonProps<boolean>> = {}) {
  return <UiToggleButton<boolean> label="Notifications" {...props} />;
}

function DemoControlee({
  initial = false,
  ...props
}: Partial<UiToggleButtonProps<boolean>> & { initial?: boolean }) {
  const [value, setValue] = useState<ToggleButtonValue<boolean>>(initial);
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

function DemoGroupe({
  initial = [],
  ...props
}: Partial<UiToggleButtonProps<string>> & { initial?: string[] }) {
  const [value, setValue] = useState<ToggleButtonValue<string>>(initial);
  return (
    <UiToggleButton<string>
      aria-label="Jours"
      options={JOURS}
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

// --- Mode simple -----------------------------------------------------------

test('le bouton porte son état pressé en ARIA', async () => {
  const screen = await render(<Demo defaultValue={false} />);

  expect(bouton(screen).tagName).toBe('BUTTON');
  expect(bouton(screen).type).toBe('button');
  expect(bouton(screen)).toHaveAttribute('aria-pressed', 'false');
  // Pas de `role="group"` : en simple, la racine n'est qu'un conteneur.
  expect(racine(screen)).not.toHaveAttribute('role');
});

test('cliquer bascule la paire trueValue et falseValue', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee onValueChange={onValueChange} />);

  await bouton(screen).click();
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(true);
  await expect.poll(() => bouton(screen).getAttribute('aria-pressed')).toBe('true');

  await bouton(screen).click();
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(false);
});

test('une paire non booléenne traverse le modèle telle quelle', async () => {
  const onValueChange = vi.fn();
  const Demo2 = () => {
    const [v, setV] = useState<ToggleButtonValue<string>>('non');
    return (
      <UiToggleButton<string>
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

  await bouton(screen).click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe('oui');
});

test('allowEmpty à faux empêche de relâcher un bouton pressé', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial allowEmpty={false} onValueChange={onValueChange} />,
  );

  bouton(screen).click();
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('le libellé et l’icône suivent l’état', async () => {
  const screen = await render(
    <DemoControlee
      label={undefined}
      onLabel="Activé"
      offLabel="Désactivé"
      onIcon="bell"
      offIcon="bell-slash"
      aria-label="Notifications"
    />,
  );

  expect(bouton(screen).textContent).toBe('Désactivé');
  expect(screen.container.querySelector('.fa-bell-slash')).not.toBeNull();

  await bouton(screen).click();

  await expect.poll(() => bouton(screen).textContent).toBe('Activé');
  await expect.poll(() => !!screen.container.querySelector('.fa-bell')).toBe(true);
});

test('un nom explicite reste stable quand le libellé change', async () => {
  const screen = await render(
    <DemoControlee
      label={undefined}
      onLabel="Activé"
      offLabel="Désactivé"
      aria-label="Notifications"
    />,
  );

  // Un nom qui change avec l'état ferait sonner le contrôle comme un bouton
  // différent selon sa valeur, à chaque prise de focus.
  expect(bouton(screen)).toHaveAttribute('aria-label', 'Notifications');
  await bouton(screen).click();
  await expect.poll(() => bouton(screen).getAttribute('aria-label')).toBe('Notifications');
});

test('deux libellés d’état sans nom stable sont signalés', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiToggleButton<boolean> onLabel="Activé" offLabel="Désactivé" />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('indépendant de l’état');
  warn.mockRestore();
});

test('en icône seule, le bouton devient carré et prend un nom', async () => {
  const screen = await render(<Demo label={undefined} icon="star" aria-label="Favori" />);

  expect(bouton(screen).classList.contains('_icon-only')).toBe(true);
  expect(bouton(screen)).toHaveAttribute('aria-label', 'Favori');
  const r = bouton(screen).getBoundingClientRect();
  expect(Math.round(r.width)).toBe(Math.round(r.height));
});

test('une icône seule sans nom est signalée', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiToggleButton<boolean> icon="star" />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('icône seule');
  warn.mockRestore();
});

test('invalide ne pose pas aria-invalid, que la spécification refuse ici', async () => {
  const screen = await render(<Demo invalid />);

  // `aria-invalid` n'est pas supporté sur le rôle `button` : la validité porte
  // sur une saisie, pas sur une commande. Seul le rendu change.
  expect(bouton(screen)).not.toHaveAttribute('aria-invalid');
  expect(racine(screen).classList.contains('_invalid')).toBe(true);
});

test('désactivé et lecture seule refusent la bascule', async () => {
  const surDesactive = vi.fn();
  const desactive = await render(<DemoControlee disabled onValueChange={surDesactive} />);
  expect(bouton(desactive).disabled).toBe(true);
  bouton(desactive).click();

  const surLecture = vi.fn();
  const lecture = await render(<DemoControlee readOnly onValueChange={surLecture} />);
  // En lecture seule le bouton reste atteignable au clavier.
  expect(bouton(lecture).disabled).toBe(false);
  bouton(lecture).click();

  await new Promise((r) => setTimeout(r, 80));
  expect(surDesactive).not.toHaveBeenCalled();
  expect(surLecture).not.toHaveBeenCalled();
});

// --- Mode groupe -----------------------------------------------------------

test('options bascule la racine en groupe, et le modèle en tableau', async () => {
  const screen = await render(<DemoGroupe initial={['lun']} />);

  expect(racine(screen)).toHaveAttribute('role', 'group');
  expect(racine(screen)).toHaveAttribute('aria-label', 'Jours');
  expect(boutons(screen)).toHaveLength(3);
  expect(boutons(screen)[0]).toHaveAttribute('aria-pressed', 'true');
  expect(boutons(screen)[1]).toHaveAttribute('aria-pressed', 'false');
  expect(boutons(screen)[2]!.disabled).toBe(true);
});

test('le groupe est toujours multi-sélection', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoGroupe initial={['lun']} onValueChange={onValueChange} />);

  // Un choix exclusif serait le travail de `ui-segment-control`, qui le dit
  // avec une sémantique `radiogroup`.
  await boutons(screen)[1]!.click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['lun', 'mar']);
});

test('recliquer une option la relâche', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoGroupe initial={['lun', 'mar']} onValueChange={onValueChange} />,
  );

  await boutons(screen)[0]!.click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['mar']);
});

test('allowEmpty à faux garde la dernière option pressée', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoGroupe initial={['lun']} allowEmpty={false} onValueChange={onValueChange} />,
  );

  boutons(screen)[0]!.click();
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('onOptionClick rapporte l’option et son état APRÈS le clic', async () => {
  const onOptionClick = vi.fn();
  const screen = await render(<DemoGroupe onOptionClick={onOptionClick} />);

  await boutons(screen)[1]!.click();

  await expect.poll(() => onOptionClick.mock.calls.length).toBe(1);
  const charge = onOptionClick.mock.calls[0]?.[0];
  expect(charge.value).toBe('mar');
  expect(charge.index).toBe(1);
  expect(charge.selected).toBe(true);
  expect(charge.option).toEqual({ value: 'mar', label: 'Mar' });
});

test('la forme riche honore sa clé value, sans optionValue', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoGroupe onValueChange={onValueChange} />);

  await boutons(screen)[0]!.click();

  // Sans la variante « forme riche » du résolveur, le modèle recevrait l'objet.
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['lun']);
});

test('une option objet sans clé label reste sans texte', async () => {
  const screen = await render(
    <DemoGroupe
      options={[
        { value: 'bold', icon: 'bold', ariaLabel: 'Gras' },
        { value: 'italic', icon: 'italic', ariaLabel: 'Italique' },
      ]}
      aria-label="Mise en forme"
    />,
  );

  // Le résolveur de liste retomberait sur « [object Object] ».
  expect(boutons(screen).map((b) => b.textContent)).toEqual(['', '']);
  expect(boutons(screen)[0]!.classList.contains('_icon-only')).toBe(true);
  expect(boutons(screen)[0]).toHaveAttribute('aria-label', 'Gras');
});

test('selectedIcon substitue l’icône pendant que l’option est pressée', async () => {
  const screen = await render(
    <DemoGroupe
      options={[{ value: 'fav', icon: 'star', selectedIcon: 'heart', ariaLabel: 'Favori' }]}
      aria-label="Actions"
    />,
  );

  expect(screen.container.querySelector('.fa-star')).not.toBeNull();

  await boutons(screen)[0]!.click();

  await expect.poll(() => !!screen.container.querySelector('.fa-heart')).toBe(true);
});

test('optionLabel, optionValue et optionDisabled lisent des objets', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiToggleButton<number>
      aria-label="Jours"
      options={
        [
          { id: 1, nom: 'Lundi' },
          { id: 2, nom: 'Mardi', ferme: true },
        ] as never
      }
      optionLabel="nom"
      optionValue="id"
      optionDisabled="ferme"
      defaultValue={[]}
      onValueChange={onValueChange}
    />,
  );

  expect(boutons(screen).map((b) => b.textContent)).toEqual(['Lundi', 'Mardi']);
  expect(boutons(screen)[1]!.disabled).toBe(true);

  await boutons(screen)[0]!.click();
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual([1]);
});

test('un groupe sans nom accessible est signalé', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiToggleButton<string> options={JOURS} />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('Groupe');
  warn.mockRestore();
});

test('une option en icône seule sans ariaLabel est signalée', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(
    <UiToggleButton<string> aria-label="Actions" options={[{ value: 'a', icon: 'bold' }]} />,
  );

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('icône seule');
  warn.mockRestore();
});

// --- Rendu -----------------------------------------------------------------

test('les modifiers d’apparence sont posés sur la racine', async () => {
  const screen = await render(<Demo level="success" variant="ghost" size="large" rounded fluid />);

  const c = racine(screen).classList;
  expect(c.contains('_success')).toBe(true);
  expect(c.contains('_ghost')).toBe(true);
  expect(c.contains('_large')).toBe(true);
  expect(c.contains('_rounded')).toBe(true);
  expect(c.contains('_fluid')).toBe(true);
});

test('renderContent remplace le contenu, jamais le bouton', async () => {
  const screen = await render(
    <DemoControlee
      label={undefined}
      aria-label="Favori"
      renderContent={({ checked }) => <em data-contenu>{checked ? 'oui' : 'non'}</em>}
    />,
  );

  expect(bouton(screen).tagName).toBe('BUTTON');
  expect(bouton(screen).querySelector('[data-contenu]')?.textContent).toBe('non');
  expect(bouton(screen)).toHaveAttribute('aria-pressed', 'false');

  await bouton(screen).click();
  await expect.poll(() => bouton(screen).querySelector('[data-contenu]')?.textContent).toBe('oui');
});

test('renderItem remplace le contenu d’un bouton du groupe', async () => {
  const screen = await render(
    <DemoGroupe
      initial={['lun']}
      renderItem={({ option, selected, index }) => (
        <em data-item>
          {(option as unknown as { label: string }).label}
          {selected ? '*' : ''}
          {index}
        </em>
      )}
    />,
  );

  expect(boutons(screen)[0]!.querySelector('[data-item]')?.textContent).toBe('Lun*0');
  expect(boutons(screen)[1]!.querySelector('[data-item]')?.textContent).toBe('Mar1');
});

test('fluid fait partager la largeur aux boutons du groupe', async () => {
  const screen = await render(
    <div style={{ width: 420 }}>
      <DemoGroupe fluid />
    </div>,
  );

  const largeurs = boutons(screen).map((b) => Math.round(b.getBoundingClientRect().width));
  expect(new Set(largeurs).size).toBe(1);
  expect(Math.round(racine(screen).getBoundingClientRect().width)).toBe(420);
});
