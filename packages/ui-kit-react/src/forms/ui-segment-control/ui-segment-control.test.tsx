import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiSegmentControl,
  type SegmentControlValue,
  type UiSegmentControlProps,
} from './ui-segment-control';

const VUES = ['Liste', 'Grille', 'Tableau'];

type Ecran = { container: HTMLElement };

const groupe = (s: Ecran) => s.container.querySelector('.ui-segment-control') as HTMLElement;
const segments = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-segment-control-option')] as HTMLButtonElement[];
const pouce = (s: Ecran) =>
  s.container.querySelector('.ui-segment-control-thumb') as HTMLElement | null;

function Demo(props: Partial<UiSegmentControlProps<string>> = {}) {
  return <UiSegmentControl<string> aria-label="Affichage" options={VUES} {...props} />;
}

function DemoControlee({
  initial = 'Liste',
  ...props
}: Partial<UiSegmentControlProps<string>> & { initial?: SegmentControlValue<string> }) {
  const [value, setValue] = useState<SegmentControlValue<string>>(initial);
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

const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

// --- Sémantique ------------------------------------------------------------

test('le groupe est un radiogroup, ses segments des radios', async () => {
  const screen = await render(<Demo defaultValue="Liste" />);

  expect(groupe(screen)).toHaveAttribute('role', 'radiogroup');
  expect(groupe(screen)).toHaveAttribute('aria-label', 'Affichage');
  expect(segments(screen)).toHaveLength(3);
  expect(segments(screen)[0]).toHaveAttribute('role', 'radio');
  expect(segments(screen)[0]).toHaveAttribute('aria-checked', 'true');
  expect(segments(screen)[1]).toHaveAttribute('aria-checked', 'false');
});

test('en multiple, le groupe change de sémantique pour aria-pressed', async () => {
  const screen = await render(<Demo multiple defaultValue={['Liste']} />);

  // Une case cochable n'est pas un radio : le motif change entièrement.
  expect(groupe(screen)).toHaveAttribute('role', 'group');
  expect(segments(screen)[0]).not.toHaveAttribute('role');
  expect(segments(screen)[0]).toHaveAttribute('aria-pressed', 'true');
  expect(segments(screen)[0]).not.toHaveAttribute('aria-checked');
});

test('chaque segment est un vrai bouton natif', async () => {
  const screen = await render(<Demo defaultValue="Liste" />);

  expect(segments(screen)[0]!.tagName).toBe('BUTTON');
  expect(segments(screen)[0]!.type).toBe('button');
});

test('sans nom accessible, un avertissement est émis en développement', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiSegmentControl<string> options={VUES} />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('ui-segment-control');
  warn.mockRestore();
});

test('une icône seule sans ariaLabel est signalée', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(
    <UiSegmentControl<string>
      aria-label="Alignement"
      options={[{ value: 'left', icon: 'align-left' }]}
    />,
  );

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('icône seule');
  warn.mockRestore();
});

// --- Sélection -------------------------------------------------------------

test('cliquer un segment le choisit', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee onValueChange={onValueChange} />);

  await segments(screen)[1]!.click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe('Grille');
  await expect.poll(() => segments(screen)[1]?.getAttribute('aria-checked')).toBe('true');
});

test('recliquer le segment choisi vide la sélection', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee onValueChange={onValueChange} />);

  await segments(screen)[0]!.click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(null);
});

test('allowEmpty à faux garde toujours un segment choisi', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee allowEmpty={false} onValueChange={onValueChange} />);

  segments(screen)[0]!.click();
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('en multiple, les segments s’ajoutent et se retirent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee multiple initial={['Liste']} onValueChange={onValueChange} />,
  );

  await segments(screen)[2]!.click();
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['Liste', 'Tableau']);

  await segments(screen)[0]!.click();
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['Tableau']);
});

test('en multiple, allowEmpty à faux garde le dernier choisi', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee multiple allowEmpty={false} initial={['Liste']} onValueChange={onValueChange} />,
  );

  segments(screen)[0]!.click();
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('onOptionClick rapporte l’option d’origine, même sans changement', async () => {
  const onOptionClick = vi.fn();
  const screen = await render(
    <UiSegmentControl<number>
      aria-label="Période"
      options={[{ id: 1, nom: 'Jour' }] as never}
      optionLabel="nom"
      optionValue="id"
      defaultValue={1}
      onOptionClick={onOptionClick}
    />,
  );

  await segments(screen)[0]!.click();

  await expect.poll(() => onOptionClick.mock.calls.length).toBe(1);
  const charge = onOptionClick.mock.calls[0]?.[0];
  expect(charge.value).toBe(1);
  expect(charge.index).toBe(0);
  // L'option telle qu'elle a été passée, pas sa forme normalisée.
  expect(charge.option).toEqual({ id: 1, nom: 'Jour' });
});

// --- Options objet ---------------------------------------------------------

test('optionLabel, optionValue et optionDisabled lisent des objets', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiSegmentControl<number>
      aria-label="Période"
      options={
        [
          { id: 1, nom: 'Jour' },
          { id: 2, nom: 'Semaine' },
          { id: 3, nom: 'Mois', inactif: true },
        ] as never
      }
      optionLabel="nom"
      optionValue="id"
      optionDisabled="inactif"
      defaultValue={1}
      onValueChange={onValueChange}
    />,
  );

  expect(segments(screen).map((s) => s.textContent)).toEqual(['Jour', 'Semaine', 'Mois']);
  expect(segments(screen)[2]!.disabled).toBe(true);

  await segments(screen)[1]!.click();
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(2);
});

test('la forme riche honore sa clé value, sans optionValue', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiSegmentControl<string>
      aria-label="Affichage"
      options={[
        { value: 'list', label: 'Liste', icon: 'list' },
        { value: 'grid', label: 'Grille', icon: 'table-cells' },
      ]}
      defaultValue="grid"
      onValueChange={onValueChange}
    />,
  );

  // Le résolveur partagé renverrait l'option ENTIÈRE, donc la sélection ne se
  // retrouverait pas, et le modèle recevrait un objet là où l'appelant attend
  // une chaîne.
  expect(segments(screen)[1]).toHaveAttribute('aria-checked', 'true');

  await segments(screen)[0]!.click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe('list');
});

test('dataKey retrouve une valeur objet rechargée depuis un serveur', async () => {
  const options = [
    { code: 'a', nom: 'A' },
    { code: 'b', nom: 'B' },
  ];
  const screen = await render(
    <UiSegmentControl<{ code: string; nom: string }>
      aria-label="Choix"
      options={options}
      optionLabel="nom"
      dataKey="code"
      // Un objet équivalent mais pas identique : sans `dataKey`, JavaScript les
      // considère distincts et la sélection ne se retrouve pas.
      defaultValue={{ code: 'b', nom: 'B' }}
    />,
  );

  expect(segments(screen)[1]).toHaveAttribute('aria-checked', 'true');
});

// --- Clavier ---------------------------------------------------------------

test('en mode simple, les flèches déplacent ET sélectionnent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee onValueChange={onValueChange} />);

  segments(screen)[0]!.focus();
  touche(groupe(screen), 'ArrowRight');

  // Motif radio de l'APG : la flèche ne fait pas que déplacer le focus.
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe('Grille');
  await expect.poll(() => document.activeElement).toBe(segments(screen)[1]);
});

test('en multiple, les flèches déplacent sans sélectionner', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee multiple initial={['Liste']} onValueChange={onValueChange} />,
  );

  segments(screen)[0]!.focus();
  touche(groupe(screen), 'ArrowRight');

  await expect.poll(() => document.activeElement).toBe(segments(screen)[1]);
  expect(onValueChange).not.toHaveBeenCalled();
});

test('Début et Fin vont aux extrémités, et la navigation boucle', async () => {
  const screen = await render(<DemoControlee />);

  segments(screen)[0]!.focus();
  touche(groupe(screen), 'End');
  await expect.poll(() => document.activeElement).toBe(segments(screen)[2]);

  touche(groupe(screen), 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(segments(screen)[0]);

  touche(groupe(screen), 'Home');
  await expect.poll(() => document.activeElement).toBe(segments(screen)[0]);
});

test('en vertical, ce sont les flèches haut et bas qui naviguent', async () => {
  const screen = await render(<DemoControlee orientation="vertical" />);

  segments(screen)[0]!.focus();
  touche(groupe(screen), 'ArrowDown');
  await expect.poll(() => document.activeElement).toBe(segments(screen)[1]);

  // La flèche de l'autre axe ne doit rien faire : elle reste au curseur.
  touche(groupe(screen), 'ArrowRight');
  await new Promise((r) => setTimeout(r, 60));
  expect(document.activeElement).toBe(segments(screen)[1]);
});

test('les flèches sautent les segments désactivés', async () => {
  const screen = await render(
    <UiSegmentControl<string>
      aria-label="Choix"
      options={[
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C' },
      ]}
      defaultValue="a"
    />,
  );

  segments(screen)[0]!.focus();
  touche(groupe(screen), 'ArrowRight');

  await expect.poll(() => document.activeElement).toBe(segments(screen)[2]);
});

test('le groupe n’a qu’un arrêt de tabulation, et c’est le segment choisi', async () => {
  const screen = await render(<Demo defaultValue="Tableau" />);

  const stops = segments(screen).filter((s) => s.tabIndex === 0);
  expect(stops).toHaveLength(1);
  // Un Tab entrant doit tomber sur l'actif, pas sur le premier.
  expect(stops[0]).toBe(segments(screen)[2]);
});

test('sans sélection, l’arrêt de tabulation retombe sur le premier actif', async () => {
  const screen = await render(
    <UiSegmentControl<string>
      aria-label="Choix"
      options={[
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B' },
      ]}
      defaultValue={null}
    />,
  );

  expect(segments(screen)[0]!.tabIndex).toBe(-1);
  expect(segments(screen)[1]!.tabIndex).toBe(0);
});

// --- Indicateur glissant ---------------------------------------------------

test('l’indicateur se cale sur la géométrie du segment choisi', async () => {
  const screen = await render(<Demo defaultValue="Grille" />);

  await expect.poll(() => pouce(screen)).not.toBeNull();
  const cible = segments(screen)[1]!;
  const p = pouce(screen)!;
  expect(Math.round(p.getBoundingClientRect().width)).toBe(
    Math.round(cible.getBoundingClientRect().width),
  );
  expect(p.style.transform).toContain(`${cible.offsetLeft}px`);
  // Décoratif : la sélection est déjà portée par `aria-checked`.
  expect(p).toHaveAttribute('aria-hidden', 'true');
});

test('l’indicateur suit la sélection', async () => {
  const screen = await render(<DemoControlee />);

  const avant = pouce(screen)!.style.transform;
  await segments(screen)[2]!.click();

  await expect.poll(() => pouce(screen)?.style.transform).not.toBe(avant);
});

test('en multiple, il n’y a pas d’indicateur', async () => {
  const screen = await render(<Demo multiple defaultValue={['Liste']} />);

  // Chaque segment choisi peint sa propre surface : un indicateur unique
  // n'aurait aucun sens.
  expect(pouce(screen)).toBeNull();
});

test('sans sélection, il n’y a pas d’indicateur non plus', async () => {
  const screen = await render(<Demo defaultValue={null} />);

  expect(pouce(screen)).toBeNull();
});

// --- Dimensionnement -------------------------------------------------------

/** Largeur utile de la piste : ses segments plus son inset. */
const largeurNecessaire = (s: Ecran) => {
  const g = groupe(s);
  const cs = getComputedStyle(g);
  const somme = segments(s).reduce((a, seg) => a + seg.getBoundingClientRect().width, 0);
  return somme + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
};

test('la piste se tient à son contenu, même dans un parent qui l’étire', async () => {
  const screen = await render(
    <div style={{ display: 'flex', flexDirection: 'column', width: 420 }}>
      <Demo defaultValue="Liste" />
    </div>,
  );

  // Un parent flex ou grid BLOQUIFIE ses enfants et les étire dans l'axe
  // transverse : `inline-flex` ne suffit donc pas à tenir la promesse. Sans
  // largeur explicite, la piste partait à 420 px pour 326 px de contenu.
  const piste = groupe(screen).getBoundingClientRect().width;
  expect(Math.round(piste)).toBe(Math.round(largeurNecessaire(screen)));
  expect(piste).toBeLessThan(420);
});

test('la piste se tient à son contenu dans une grille aussi', async () => {
  const screen = await render(
    <div style={{ display: 'grid', width: 500 }}>
      <Demo defaultValue="Liste" />
    </div>,
  );

  const piste = groupe(screen).getBoundingClientRect().width;
  expect(Math.round(piste)).toBe(Math.round(largeurNecessaire(screen)));
  expect(piste).toBeLessThan(500);
});

test('fluid remplit le parent, et les segments se partagent la largeur', async () => {
  const screen = await render(
    <div style={{ display: 'flex', flexDirection: 'column', width: 420 }}>
      <Demo defaultValue="Liste" fluid />
    </div>,
  );

  expect(Math.round(groupe(screen).getBoundingClientRect().width)).toBe(420);
  const largeurs = segments(screen).map((s) => Math.round(s.getBoundingClientRect().width));
  // Partage égal : trois segments de même largeur, quel que soit leur texte.
  expect(new Set(largeurs).size).toBe(1);
});

// --- États -----------------------------------------------------------------

test('désactivé, tous les segments le sont et le groupe l’annonce', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee disabled onValueChange={onValueChange} />);

  expect(groupe(screen)).toHaveAttribute('aria-disabled', 'true');
  expect(segments(screen).every((s) => s.disabled)).toBe(true);

  segments(screen)[1]!.click();
  await new Promise((r) => setTimeout(r, 80));
  expect(onValueChange).not.toHaveBeenCalled();
});

test('en lecture seule, les segments restent atteignables mais rien ne change', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee readOnly onValueChange={onValueChange} />);

  expect(segments(screen).some((s) => s.disabled)).toBe(false);
  segments(screen)[1]!.click();
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('invalide, le groupe le signale à l’assistance', async () => {
  const screen = await render(<Demo invalid defaultValue={null} />);

  expect(groupe(screen)).toHaveAttribute('aria-invalid', 'true');
});

// --- Rendu -----------------------------------------------------------------

test('le libellé réserve sa largeur en gras, pour ne pas décaler la piste', async () => {
  const screen = await render(<Demo defaultValue="Liste" />);

  // Le fantôme est un `::after` alimenté par `data-label`.
  const label = screen.container.querySelector('.ui-segment-control-label') as HTMLElement;
  expect(label).toHaveAttribute('data-label', 'Liste');
});

test('renderItem remplace le contenu, jamais le bouton', async () => {
  const screen = await render(
    <Demo
      defaultValue="Liste"
      renderItem={({ option, selected }) => (
        <em data-item>
          {String(option)}
          {selected ? ' (choisi)' : ''}
        </em>
      )}
    />,
  );

  expect(segments(screen)[0]!.tagName).toBe('BUTTON');
  expect(segments(screen)[0]!.querySelector('[data-item]')?.textContent).toBe('Liste (choisi)');
  // Le rôle et l'état restent portés par le bouton.
  expect(segments(screen)[0]).toHaveAttribute('aria-checked', 'true');
});

test('un segment en icône seule n’affiche aucun texte parasite', async () => {
  const screen = await render(
    <Demo
      options={[
        { value: 'left', icon: 'align-left', ariaLabel: 'Aligner à gauche' },
        { value: 'right', icon: 'align-right', ariaLabel: 'Aligner à droite' },
      ]}
      defaultValue="left"
    />,
  );

  // Le résolveur partagé retomberait sur `String(option)`, donc sur
  // « [object Object] » : c'est acceptable dans une liste d'options, pas ici.
  expect(segments(screen).map((s) => s.textContent)).toEqual(['', '']);
  expect(screen.container.querySelector('.ui-segment-control-label')).toBeNull();
  // Le nom accessible vient de l'option, faute de texte.
  expect(segments(screen)[0]).toHaveAttribute('aria-label', 'Aligner à gauche');
});

test('une icône est rendue à côté du libellé', async () => {
  const screen = await render(
    <Demo options={[{ value: 'a', label: 'A', icon: 'list' }]} defaultValue="a" />,
  );

  expect(screen.container.querySelector('.ui-segment-control-icon')).not.toBeNull();
  expect(segments(screen)[0]!.textContent).toContain('A');
});
