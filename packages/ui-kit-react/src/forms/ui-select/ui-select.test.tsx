import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiSelect } from './ui-select';

const VILLES = ['Bordeaux', 'Lyon', 'Nantes'];
const OBJETS = [
  { id: 1, nom: 'Bordeaux' },
  { id: 2, nom: 'Lyon', disabled: true },
  { id: 3, nom: 'Nantes' },
];

const panneau = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('.ui-select-panel') as HTMLElement;
const declencheur = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('[role="combobox"]') as HTMLElement;
const optionsRendues = (screen: { container: HTMLElement }) =>
  [...screen.container.querySelectorAll('[role="option"]')] as HTMLElement[];

function Demo(props: Partial<React.ComponentProps<typeof UiSelect>> = {}) {
  return <UiSelect label="Ville" options={VILLES} placeholder="Choisir" {...props} />;
}

// --- Panneau ---------------------------------------------------------------

test('fermé, le panneau n’occupe aucune place à l’écran', async () => {
  const screen = await render(<Demo />);

  expect(panneau(screen).matches(':popover-open')).toBe(false);
  expect(getComputedStyle(panneau(screen)).display).toBe('none');
  expect(panneau(screen).getBoundingClientRect().width).toBe(0);
});

test('le déclencheur ouvre le panneau dans le calque supérieur', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('combobox').click();

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  expect(declencheur(screen)).toHaveAttribute('aria-expanded', 'true');
});

test('le cycle ouvrir, fermer, rouvrir tient', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('combobox').click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('option', { name: 'Lyon' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);

  await screen.getByRole('combobox').click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
});

// --- Options ---------------------------------------------------------------

test('les options primitives sont rendues avec leur libellé', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('combobox').click();
  await expect.poll(() => optionsRendues(screen).length).toBe(3);

  expect(optionsRendues(screen).map((o) => o.textContent)).toEqual(VILLES);
});

test('les options objets lisent leurs accesseurs', async () => {
  const screen = await render(<Demo options={OBJETS} optionLabel="nom" optionValue="id" />);

  await screen.getByRole('combobox').click();
  await expect.poll(() => optionsRendues(screen).length).toBe(3);

  expect(optionsRendues(screen).map((o) => o.textContent)).toEqual(['Bordeaux', 'Lyon', 'Nantes']);
});

test('une option désactivée est annoncée comme telle', async () => {
  const screen = await render(<Demo options={OBJETS} optionLabel="nom" optionValue="id" />);

  await screen.getByRole('combobox').click();
  await expect.poll(() => optionsRendues(screen).length).toBe(3);

  expect(optionsRendues(screen)[1]).toHaveAttribute('aria-disabled', 'true');
});

test('chaque option porte sa position dans la liste', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('combobox').click();
  await expect.poll(() => optionsRendues(screen).length).toBe(3);

  expect(optionsRendues(screen)[0]).toHaveAttribute('aria-posinset', '1');
  expect(optionsRendues(screen)[0]).toHaveAttribute('aria-setsize', '3');
});

// --- Sélection -------------------------------------------------------------

test('cliquer une option la sélectionne et ferme le panneau', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo onValueChange={onValueChange} />);

  await screen.getByRole('combobox').click();
  await screen.getByRole('option', { name: 'Nantes' }).click();

  expect(onValueChange).toHaveBeenCalledWith('Nantes');
  await expect.poll(() => declencheur(screen).textContent).toBe('Nantes');
});

test('en multiple, le panneau reste ouvert et la valeur est un tableau', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo multiple onValueChange={onValueChange} />);

  await screen.getByRole('combobox').click();
  await screen.getByRole('option', { name: 'Lyon' }).click();

  expect(onValueChange).toHaveBeenCalledWith(['Lyon']);
  expect(panneau(screen).matches(':popover-open')).toBe(true);
});

test('en multiple, recliquer une option la retire', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <Demo multiple defaultValue={['Lyon']} onValueChange={onValueChange} />,
  );

  await screen.getByRole('combobox').click();
  await screen.getByRole('option', { name: 'Lyon' }).click();

  expect(onValueChange).toHaveBeenCalledWith([]);
});

test('la liste est annoncée comme multi-sélectionnable', async () => {
  const screen = await render(<Demo multiple />);

  await screen.getByRole('combobox').click();

  await expect.element(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
});

// Sans `dataKey`, deux objets identiques restent distincts : c'est ce qui casse
// une sélection rechargée depuis un serveur.
test('dataKey permet de retrouver une valeur objet', async () => {
  const screen = await render(
    <Demo
      options={OBJETS}
      optionLabel="nom"
      dataKey="id"
      defaultValue={{ id: 3, nom: 'Nantes' }}
    />,
  );

  expect(declencheur(screen).textContent).toBe('Nantes');
});

test('au-delà de maxSelectedLabels, le reste est replié', async () => {
  const screen = await render(
    <Demo multiple maxSelectedLabels={2} defaultValue={['Bordeaux', 'Lyon', 'Nantes']} />,
  );

  expect(declencheur(screen).textContent).toBe('Bordeaux, Lyon (+1 autres)');
});

// --- Clavier ---------------------------------------------------------------

const touche = (el: Element, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(event);
  return event;
};

test('la flèche bas ouvre le panneau et pose le focus visuel', async () => {
  const screen = await render(<Demo />);

  touche(declencheur(screen), 'ArrowDown');

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  await expect
    .poll(() => declencheur(screen).getAttribute('aria-activedescendant'))
    .toBe(optionsRendues(screen)[0]!.id);
});

// Le focus reste sur le déclencheur : c'est le motif combobox, et c'est ce qui
// permet de taper dans la recherche tout en naviguant.
test('le focus ne quitte jamais le déclencheur', async () => {
  const screen = await render(<Demo />);
  const trigger = declencheur(screen);
  trigger.focus();

  touche(trigger, 'ArrowDown');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  touche(trigger, 'ArrowDown');

  expect(document.activeElement).toBe(trigger);
});

test('la navigation clavier saute les options désactivées', async () => {
  const screen = await render(<Demo options={OBJETS} optionLabel="nom" optionValue="id" />);
  const trigger = declencheur(screen);

  touche(trigger, 'ArrowDown'); // ouvre + première option
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  touche(trigger, 'ArrowDown'); // saute Lyon, désactivée

  await expect
    .poll(() => trigger.getAttribute('aria-activedescendant'))
    .toBe(optionsRendues(screen)[2]!.id);
});

test('Entrée sélectionne l’option au focus visuel', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo onValueChange={onValueChange} />);
  const trigger = declencheur(screen);

  touche(trigger, 'ArrowDown');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  touche(trigger, 'Enter');

  expect(onValueChange).toHaveBeenCalledWith('Bordeaux');
});

test('Fin va à la dernière option, Début à la première', async () => {
  const screen = await render(<Demo />);
  const trigger = declencheur(screen);

  touche(trigger, 'ArrowDown');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  touche(trigger, 'End');
  await expect
    .poll(() => trigger.getAttribute('aria-activedescendant'))
    .toBe(optionsRendues(screen)[2]!.id);

  touche(trigger, 'Home');
  await expect
    .poll(() => trigger.getAttribute('aria-activedescendant'))
    .toBe(optionsRendues(screen)[0]!.id);
});

// Échap est consommée SEULEMENT parce qu'elle ferme : sinon elle fermerait
// aussi le `ui-modal` qui contient le champ.
test('Échap ferme le panneau et la touche est consommée', async () => {
  const screen = await render(<Demo />);
  const trigger = declencheur(screen);

  touche(trigger, 'ArrowDown');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  const event = touche(trigger, 'Escape');
  expect(event.defaultPrevented).toBe(true);

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
});

test('Échap n’est pas consommée quand le panneau est fermé', async () => {
  const screen = await render(<Demo />);

  const event = touche(declencheur(screen), 'Escape');

  expect(event.defaultPrevented).toBe(false);
});

test('la frappe rapide amène l’option qui commence par la lettre', async () => {
  const screen = await render(<Demo />);
  const trigger = declencheur(screen);

  touche(trigger, 'n');

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  await expect
    .poll(() => trigger.getAttribute('aria-activedescendant'))
    .toBe(optionsRendues(screen)[2]!.id);
});

test('en multiple, Retour arrière retire la dernière valeur', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <Demo multiple defaultValue={['Bordeaux', 'Lyon']} onValueChange={onValueChange} />,
  );

  touche(declencheur(screen), 'Backspace');

  expect(onValueChange).toHaveBeenCalledWith(['Bordeaux']);
});

// --- Filtre ----------------------------------------------------------------

test('le filtre réduit la liste', async () => {
  const screen = await render(<Demo filter />);

  await screen.getByRole('combobox').click();
  await expect.poll(() => optionsRendues(screen).length).toBe(3);

  await screen.getByRole('searchbox').fill('na');

  await expect.poll(() => optionsRendues(screen).length).toBe(1);
  expect(optionsRendues(screen)[0]!.textContent).toBe('Nantes');
});

// Un filtre qui échoue sur les accents est inutilisable en français.
test('le filtre ignore la casse et les accents', async () => {
  const screen = await render(<Demo filter options={['Élève', 'Écolier', 'Enseignant']} />);

  await screen.getByRole('combobox').click();
  await screen.getByRole('searchbox').fill('ELE');

  await expect.poll(() => optionsRendues(screen).length).toBe(1);
  expect(optionsRendues(screen)[0]!.textContent).toBe('Élève');
});

test('un filtre sans résultat affiche son propre message', async () => {
  const screen = await render(<Demo filter emptyFilterMessage="Rien trouvé" />);

  await screen.getByRole('combobox').click();
  await screen.getByRole('searchbox').fill('zzz');

  await expect.poll(() => screen.container.textContent).toContain('Rien trouvé');
});

test('une liste vide affiche le message par défaut', async () => {
  const screen = await render(<Demo options={[]} emptyMessage="Aucune option" />);

  await screen.getByRole('combobox').click();

  await expect.poll(() => screen.container.textContent).toContain('Aucune option');
});

// --- Groupes ---------------------------------------------------------------

test('les groupes rendent leur en-tête, hors de l’espace des options', async () => {
  const screen = await render(
    <Demo
      group
      options={[
        { label: 'Sud', items: ['Bordeaux', 'Toulouse'] },
        { label: 'Nord', items: ['Lille'] },
      ]}
    />,
  );

  await screen.getByRole('combobox').click();
  await expect.poll(() => optionsRendues(screen).length).toBe(3);

  expect(screen.container.querySelectorAll('.ui-select-group')).toHaveLength(2);
  // Les en-têtes ne comptent pas dans `aria-setsize` : ce ne sont pas des options.
  expect(optionsRendues(screen)[0]).toHaveAttribute('aria-setsize', '3');
});

test('un groupe dont aucune option ne passe le filtre disparaît', async () => {
  const screen = await render(
    <Demo
      group
      filter
      options={[
        { label: 'Sud', items: ['Bordeaux'] },
        { label: 'Nord', items: ['Lille'] },
      ]}
    />,
  );

  await screen.getByRole('combobox').click();
  await screen.getByRole('searchbox').fill('bord');

  await expect.poll(() => screen.container.querySelectorAll('.ui-select-group').length).toBe(1);
});

// --- Effacement et états ---------------------------------------------------

test('le bouton d’effacement vide la sélection', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo showClear defaultValue="Lyon" onValueChange={onValueChange} />);

  await screen.getByRole('button', { name: 'Effacer la sélection' }).click();

  expect(onValueChange).toHaveBeenCalledWith(null);
});

test('sans valeur, il n’y a rien à effacer', async () => {
  const screen = await render(<Demo showClear />);

  expect(screen.container.querySelector('.ui-select-clear')).toBeNull();
});

test('désactivé, le déclencheur n’ouvre rien', async () => {
  const screen = await render(<Demo disabled />);

  touche(declencheur(screen), 'ArrowDown');

  expect(panneau(screen).matches(':popover-open')).toBe(false);
});

test('en lecture seule, le panneau ne s’ouvre pas', async () => {
  const screen = await render(<Demo readOnly />);

  touche(declencheur(screen), 'ArrowDown');

  expect(panneau(screen).matches(':popover-open')).toBe(false);
});

test('le champ est nommé et décrit par son message', async () => {
  const screen = await render(<Demo invalid errorText="Sélection obligatoire" />);

  await expect.element(screen.getByRole('combobox', { name: 'Ville' })).toBeInTheDocument();
  expect(declencheur(screen)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.container.textContent).toContain('Sélection obligatoire');
});

// --- Mode éditable ---------------------------------------------------------

test('en éditable, taper devient la valeur et filtre la liste', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo editable onValueChange={onValueChange} />);

  await screen.getByRole('combobox').fill('na');

  expect(onValueChange).toHaveBeenCalledWith('na');
  await expect.poll(() => optionsRendues(screen).length).toBe(1);
});

// En mode éditable le chevron est la seule façon d'ouvrir à la souris : il doit
// donc être un vrai bouton, atteignable au clavier.
test('en éditable, le chevron est un bouton nommé', async () => {
  const screen = await render(<Demo editable />);

  await expect
    .element(screen.getByRole('button', { name: 'Afficher les options' }))
    .toBeInTheDocument();
});

// --- Contrôlé --------------------------------------------------------------

function Controle() {
  const [value, setValue] = useState<unknown>('Bordeaux');

  return (
    <div>
      <UiSelect label="Ville" options={VILLES} value={value} onValueChange={setValue} />
      <output>{String(value)}</output>
    </div>
  );
}

test('contrôlé, la valeur vient du parent', async () => {
  const screen = await render(<Controle />);

  expect(declencheur(screen).textContent).toBe('Bordeaux');

  await screen.getByRole('combobox').click();
  await screen.getByRole('option', { name: 'Nantes' }).click();

  await expect.poll(() => screen.container.querySelector('output')!.textContent).toBe('Nantes');
});

// --- Défilement virtuel ----------------------------------------------------

test('mille options ne rendent qu’une fenêtre', async () => {
  const screen = await render(
    <Demo virtualScroll options={Array.from({ length: 1000 }, (_, i) => `Option ${i + 1}`)} />,
  );

  await screen.getByRole('combobox').click();

  await expect.poll(() => optionsRendues(screen).length).toBeGreaterThan(0);
  expect(optionsRendues(screen).length).toBeLessThan(40);
});

// --- Mouvement -------------------------------------------------------------

test('la transition du panneau couvre display et overlay', async () => {
  const screen = await render(<Demo />);
  const cs = getComputedStyle(panneau(screen));

  expect(cs.transitionProperty).toContain('display');
  expect(cs.transitionProperty).toContain('overlay');
  expect(cs.transitionBehavior).toBe('allow-discrete');
});

// L'ancre du panneau est la BOÎTE du champ, pas le déclencheur : s'ancrer sur
// le bouton donnait un panneau plus étroit que le champ.
test('le panneau prend la largeur du champ', async () => {
  const screen = await render(
    <div style={{ width: 320 }}>
      <Demo />
    </div>,
  );

  await screen.getByRole('combobox').click();
  await expect.poll(() => panneau(screen).getBoundingClientRect().width).toBeGreaterThan(0);

  const boite = screen.container.querySelector('.ui-field-box')!.getBoundingClientRect();
  expect(Math.round(panneau(screen).getBoundingClientRect().width)).toBe(Math.round(boite.width));
});

// `panelWidth` impose la largeur, mais le panneau reste plafonné par la
// gouttière laissée au viewport : un panneau plus large que l'écran serait
// inutilisable, et c'est la SCSS qui l'empêche.
test('panelWidth impose une largeur, plafonnée par le viewport', async () => {
  const screen = await render(<Demo panelWidth="480px" />);

  await screen.getByRole('combobox').click();
  await expect.poll(() => panneau(screen).getBoundingClientRect().width).toBeGreaterThan(0);

  expect(panneau(screen).style.width).toBe('480px');

  const rendue = panneau(screen).getBoundingClientRect().width;
  const plafond = Number.parseFloat(getComputedStyle(panneau(screen)).maxWidth);
  expect(Math.round(rendue)).toBe(Math.round(Math.min(480, plafond)));
});

// --- Intégration dans le champ --------------------------------------------

// La boîte du champ n'a aucun inset : chaque enfant direct porte le sien. Sans
// ça les puces se collent à la bordure.
test('en multiple avec des puces, les valeurs ne touchent pas la bordure', async () => {
  const screen = await render(
    <Demo
      multiple
      defaultValue={['Bordeaux', 'Lyon']}
      renderSelectedItem={({ option }) => <span>{String(option)}</span>}
    />,
  );

  const valeurs = screen.container.querySelector('.ui-select-values')!;
  expect(parseFloat(getComputedStyle(valeurs).paddingInlineStart)).toBeGreaterThan(0);
});

// `field-affix` est écrit pour une icône : un `<button>` garderait ses styles
// navigateur, ses marges et sa hauteur de contenu.
test('en éditable, le bouton de bascule remplit la hauteur du champ, collé à droite', async () => {
  const screen = await render(<Demo editable />);

  const boite = screen.container.querySelector('.ui-field-box') as HTMLElement;
  const bouton = screen.container.querySelector('.ui-select-toggle') as HTMLElement;
  const cs = getComputedStyle(bouton);

  expect(cs.alignSelf).toBe('stretch');
  expect(cs.borderTopWidth).toBe('0px');
  expect(cs.paddingRight).toBe('0px');
  expect(Math.round(bouton.getBoundingClientRect().height)).toBe(Math.round(boite.clientHeight));
  expect(Math.round(bouton.getBoundingClientRect().right)).toBe(
    Math.round(
      boite.getBoundingClientRect().right - parseFloat(getComputedStyle(boite).borderRightWidth),
    ),
  );
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

  await screen.getByRole('combobox').click();

  await expect.poll(() => panneau(screen).hasAttribute('data-unpositioned')).toBe(false);
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau(screen)).opacity).toBe('1');
});

test('tabIndex va au déclencheur, pour une barre d’outils à arrêt unique', async () => {
  const screen = await render(
    <UiSelect aria-label="Police" options={['Inter', 'Mono']} tabIndex={-1} />,
  );

  await expect
    .element(screen.getByRole('combobox', { name: 'Police' }))
    .toHaveAttribute('tabindex', '-1');
});
