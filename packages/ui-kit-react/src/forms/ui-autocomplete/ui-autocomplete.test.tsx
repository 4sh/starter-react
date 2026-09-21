import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { normalizeText } from '../../core/forms';

import { UiAutocomplete } from './ui-autocomplete';

const VILLES = ['Bordeaux', 'Bayonne', 'Lyon', 'Nantes'];

const panneau = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('.ui-autocomplete-panel') as HTMLElement;
const champ = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('[role="combobox"]') as HTMLInputElement;
const optionsRendues = (screen: { container: HTMLElement }) =>
  [...screen.container.querySelectorAll('.ui-autocomplete-option')] as HTMLElement[];

/**
 * Un consommateur ordinaire : c'est lui qui filtre, comme le veut le contrat.
 *
 * `onComplete` du test est **composé** avec celui qui alimente les suggestions,
 * jamais substitué : un test qui espionne la requête doit quand même voir la
 * liste arriver.
 */
function Demo({
  source = VILLES,
  onComplete,
  ...props
}: Partial<React.ComponentProps<typeof UiAutocomplete>> & { source?: readonly string[] } = {}) {
  const [suggestions, setSuggestions] = useState<readonly unknown[]>([]);

  return (
    <UiAutocomplete
      label="Ville"
      delay={0}
      {...props}
      suggestions={suggestions}
      onComplete={(query) => {
        onComplete?.(query);
        // Insensible aux accents, comme le ferait un vrai appelant : sinon
        // « eleve » ne ramènerait jamais « Élève », et le test mesurerait le
        // harnais au lieu du composant.
        setSuggestions(
          query
            ? source.filter((v) => normalizeText(v).startsWith(normalizeText(query)))
            : [...source],
        );
      }}
    />
  );
}

/**
 * Clique une SUGGESTION du panneau.
 *
 * Le nom seul ne suffit pas en mode multiple : la puce sélectionnée est aussi
 * une `option`, d'une AUTRE liste, et c'est voulu. Deux listes, deux espaces
 * d'options.
 */
const cliquerSuggestion = (screen: { container: HTMLElement }, label: string) => {
  const cible = optionsRendues(screen).find((o) => o.textContent === label);
  expect(cible, `suggestion « ${label} » absente`).toBeTruthy();
  cible!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const touche = (el: Element, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(event);
  return event;
};

// --- Panneau ---------------------------------------------------------------

test('fermé, le panneau n’occupe aucune place à l’écran', async () => {
  const screen = await render(<Demo />);

  expect(panneau(screen).matches(':popover-open')).toBe(false);
  expect(getComputedStyle(panneau(screen)).display).toBe('none');
  expect(panneau(screen).getBoundingClientRect().width).toBe(0);
});

// Le composant ne filtre rien : il émet une requête et attend que l'appelant
// mette `suggestions` à jour. C'est le contrat central.
test('taper émet une requête, et l’appelant fournit les suggestions', async () => {
  const onComplete = vi.fn();
  const screen = await render(<Demo onComplete={onComplete} />);

  await champ(screen).focus();
  await screen.getByRole('combobox').fill('ba');

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  expect(onComplete).toHaveBeenCalledWith('ba');
  expect(optionsRendues(screen).map((o) => o.textContent)).toEqual(['Bayonne']);
});

test('sous minLength, aucune requête ne part', async () => {
  const onComplete = vi.fn();
  const screen = await render(<Demo minLength={3} onComplete={onComplete} />);

  await screen.getByRole('combobox').fill('ba');
  await new Promise((r) => setTimeout(r, 80));

  expect(onComplete).not.toHaveBeenCalled();
  expect(panneau(screen).matches(':popover-open')).toBe(false);
});

test('vider le champ referme le panneau', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('combobox').fill('ba');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('combobox').fill('');

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
});

// --- Valeur ----------------------------------------------------------------

test('la saisie libre devient la valeur', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo onValueChange={onValueChange} />);

  await screen.getByRole('combobox').fill('Bor');

  expect(onValueChange).toHaveBeenCalledWith('Bor');
});

test('choisir une suggestion pose sa valeur et son libellé', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo onValueChange={onValueChange} />);

  await screen.getByRole('combobox').fill('ba');
  await expect.poll(() => optionsRendues(screen).length).toBe(1);
  await screen.getByRole('option', { name: 'Bayonne' }).click();

  expect(onValueChange).toHaveBeenCalledWith('Bayonne');
  await expect.poll(() => champ(screen).value).toBe('Bayonne');
  expect(panneau(screen).matches(':popover-open')).toBe(false);
});

// `forceSelection` existe pour que le modèle ne contienne JAMAIS de texte libre.
test('forceSelection ne commet pas la saisie libre', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo forceSelection onValueChange={onValueChange} />);

  await screen.getByRole('combobox').fill('Bor');

  expect(onValueChange).not.toHaveBeenCalled();
});

// Le bouton de sortie est placé AVANT le champ : ouvert, le panneau du calque
// supérieur recouvre ce qui se trouve dessous, et un vrai clic ne l'atteint pas.
test('forceSelection remet le champ à zéro sur un texte inconnu', async () => {
  const screen = await render(
    <div>
      <button type="button">ailleurs</button>
      <Demo forceSelection />
    </div>,
  );

  await screen.getByRole('combobox').fill('Zzz');
  await screen.getByRole('button', { name: 'ailleurs' }).click();

  await expect.poll(() => champ(screen).value).toBe('');
});

test('forceSelection accepte un texte qui correspond, aux accents près', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <div>
      <button type="button">ailleurs</button>
      <Demo forceSelection source={['Élève', 'Étudiant']} onValueChange={onValueChange} />
    </div>,
  );

  await screen.getByRole('combobox').fill('eleve');
  await expect.poll(() => optionsRendues(screen).length).toBeGreaterThan(0);
  await screen.getByRole('button', { name: 'ailleurs' }).click();

  await expect.poll(() => onValueChange.mock.calls.length).toBeGreaterThan(0);
  expect(onValueChange).toHaveBeenCalledWith('Élève');
});

// --- Bouton de liste -------------------------------------------------------

test('le bouton de liste affiche toutes les suggestions', async () => {
  const onComplete = vi.fn();
  const screen = await render(<Demo dropdown onComplete={onComplete} />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();

  await expect.poll(() => optionsRendues(screen).length).toBe(4);
  expect(onComplete).toHaveBeenCalledWith('');
});

test('dropdownMode=current interroge avec la saisie', async () => {
  const onComplete = vi.fn();
  const screen = await render(<Demo dropdown dropdownMode="current" onComplete={onComplete} />);

  await screen.getByRole('combobox').fill('ba');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();

  expect(onComplete).toHaveBeenLastCalledWith('ba');
});

// Un clic sur le bouton déplace le focus dans le champ, ce qui déclenche
// `completeOnFocus` : sans le garde, deux requêtes partiraient pour un clic.
test('avec completeOnFocus, un clic sur le bouton n’émet qu’une requête', async () => {
  const onComplete = vi.fn();
  const screen = await render(<Demo dropdown completeOnFocus onComplete={onComplete} />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();

  await expect.poll(() => onComplete.mock.calls.length).toBe(1);
});

test('le bouton de liste remplit la hauteur du champ, collé au bord', async () => {
  const screen = await render(<Demo dropdown />);

  const boite = screen.container.querySelector('.ui-field-box') as HTMLElement;
  const bouton = screen.container.querySelector('.ui-autocomplete-dropdown') as HTMLElement;
  const cs = getComputedStyle(bouton);

  expect(cs.alignSelf).toBe('stretch');
  expect(cs.borderTopWidth).toBe('0px');
  expect(Math.round(bouton.getBoundingClientRect().height)).toBe(Math.round(boite.clientHeight));
});

// En mode multiple la boîte porte un inset vertical, que l'action doit franchir
// pour couvrir toute la hauteur. Et sa largeur ne peut pas venir d'un
// `aspect-ratio` : la hauteur étant imposée par l'étirement, aucun axe n'est
// `auto`, et le bouton retombait à la largeur de son icône (20 px, sous le
// minimum de cible de WCAG 2.5.8).
test('en multiple, le bouton couvre toute la hauteur et garde une cible suffisante', async () => {
  const screen = await render(<Demo multiple dropdown defaultValue={['Bordeaux']} />);

  const boite = screen.container.querySelector('.ui-field-box') as HTMLElement;
  const bouton = screen.container.querySelector('.ui-autocomplete-dropdown') as HTMLElement;
  const rb = boite.getBoundingClientRect();
  const rt = bouton.getBoundingClientRect();
  const bord = parseFloat(getComputedStyle(boite).borderTopWidth);

  expect(parseFloat(getComputedStyle(boite).paddingTop)).toBeGreaterThan(0); // inset présent
  expect(Math.round(rt.height)).toBe(Math.round(rb.height - 2 * bord));
  expect(Math.round(rt.top - (rb.top + bord))).toBe(0);
  expect(rt.width).toBeGreaterThanOrEqual(24);
});

// --- Clavier ---------------------------------------------------------------

test('la flèche bas pose le focus visuel sans quitter le champ', async () => {
  const screen = await render(<Demo dropdown />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => optionsRendues(screen).length).toBe(4);

  const input = champ(screen);
  input.focus();
  touche(input, 'ArrowDown');

  await expect
    .poll(() => input.getAttribute('aria-activedescendant'))
    .toBe(optionsRendues(screen)[0]!.id);
  expect(document.activeElement).toBe(input);
});

test('Entrée choisit la suggestion au focus visuel', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo dropdown onValueChange={onValueChange} />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => optionsRendues(screen).length).toBe(4);

  const input = champ(screen);
  touche(input, 'ArrowDown');
  await expect.poll(() => input.getAttribute('aria-activedescendant')).toBeTruthy();
  touche(input, 'Enter');

  expect(onValueChange).toHaveBeenCalledWith('Bordeaux');
});

test('Échap ferme, et la touche n’est consommée que dans ce cas', async () => {
  const screen = await render(<Demo dropdown />);
  const input = champ(screen);

  expect(touche(input, 'Escape').defaultPrevented).toBe(false);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  expect(touche(input, 'Escape').defaultPrevented).toBe(true);
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
});

// Début et Fin appartiennent au curseur du champ quand le panneau est fermé.
test('Début et Fin restent au curseur quand le panneau est fermé', async () => {
  const screen = await render(<Demo />);

  expect(touche(champ(screen), 'Home').defaultPrevented).toBe(false);
  expect(touche(champ(screen), 'End').defaultPrevented).toBe(false);
});

// --- Sélection multiple ----------------------------------------------------

test('en multiple, chaque valeur devient une option de la liste de puces', async () => {
  const screen = await render(<Demo multiple dropdown />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => optionsRendues(screen).length).toBe(4);
  cliquerSuggestion(screen, 'Lyon');

  await expect.poll(() => screen.container.querySelectorAll('.ui-autocomplete-tag').length).toBe(1);
  const puce = screen.container.querySelector('.ui-autocomplete-tag')!;
  expect(puce).toHaveAttribute('role', 'option');
  expect(puce).toHaveAttribute('aria-posinset', '1');
});

test('en multiple, la requête consommée vide le champ', async () => {
  const screen = await render(<Demo multiple />);

  await screen.getByRole('combobox').fill('ly');
  await expect.poll(() => optionsRendues(screen).length).toBe(1);
  cliquerSuggestion(screen, 'Lyon');

  await expect.poll(() => champ(screen).value).toBe('');
});

test('unique refuse deux fois la même valeur', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo multiple dropdown onValueChange={onValueChange} />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => optionsRendues(screen).length).toBe(4);
  cliquerSuggestion(screen, 'Lyon');

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => optionsRendues(screen).length).toBe(4);
  cliquerSuggestion(screen, 'Lyon');

  await expect.poll(() => onValueChange.mock.lastCall?.[0]).toEqual(['Lyon']);
});

// Un seul arrêt de tabulation pour toute la liste de puces : c'est le motif
// que `useRovingTabIndex` sert.
test('les puces ne comptent que pour un arrêt de tabulation', async () => {
  const screen = await render(<Demo multiple defaultValue={['Bordeaux', 'Lyon', 'Nantes']} />);

  const puces = screen.container.querySelectorAll('.ui-autocomplete-tag');
  expect(puces.length).toBe(3);
  expect(screen.container.querySelectorAll('.ui-autocomplete-tag[tabindex="0"]').length).toBe(0);
});

test('Retour arrière sur un champ vide retire la dernière puce', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <Demo multiple defaultValue={['Bordeaux', 'Lyon']} onValueChange={onValueChange} />,
  );

  touche(champ(screen), 'Backspace');

  expect(onValueChange).toHaveBeenCalledWith(['Bordeaux']);
});

test('la croix d’une puce la retire, sans être un contrôle imbriqué', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <Demo multiple defaultValue={['Bordeaux', 'Lyon']} onValueChange={onValueChange} />,
  );

  const puces = [...screen.container.querySelectorAll('.ui-autocomplete-tag')] as HTMLElement[];
  const croix = puces[1]!.querySelector('.ui-autocomplete-remove') as HTMLElement;
  // Un `<button>` ici serait un contrôle interactif IMBRIQUÉ dans une `option`
  // elle-même interactive, ce qu'axe refuse (`nested-interactive`).
  expect(croix.tagName).toBe('SPAN');
  expect(croix).toHaveAttribute('aria-hidden', 'true');
  expect(puces[1]!.querySelector('button')).toBeNull();

  croix.click();

  expect(onValueChange).toHaveBeenCalledWith(['Bordeaux']);
});

test('au-delà de maxSelectedLabels, le surplus est replié', async () => {
  const screen = await render(
    <Demo multiple maxSelectedLabels={2} defaultValue={['Bordeaux', 'Lyon', 'Nantes']} />,
  );

  expect(screen.container.querySelectorAll('.ui-autocomplete-tag').length).toBe(2);
  expect(screen.container.querySelector('.ui-autocomplete-overflow')!.textContent).toBe(
    '(+1 autres)',
  );
});

// Les suggestions changent à chaque requête : sans cache, la puce perdrait son
// libellé dès la requête suivante et n'afficherait plus que sa valeur brute.
test('une puce garde son libellé après une nouvelle requête', async () => {
  const source = [
    { id: 1, nom: 'Bordeaux' },
    { id: 2, nom: 'Lyon' },
  ];

  function ObjetsDemo() {
    const [suggestions, setSuggestions] = useState<readonly unknown[]>([]);
    return (
      <UiAutocomplete
        label="Ville"
        delay={0}
        multiple
        dropdown
        optionLabel="nom"
        optionValue="id"
        suggestions={suggestions}
        onComplete={(query) =>
          setSuggestions(query ? source.filter((s) => s.nom.startsWith(query)) : source)
        }
      />
    );
  }

  const screen = await render(<ObjetsDemo />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => optionsRendues(screen).length).toBe(2);
  cliquerSuggestion(screen, 'Lyon');

  await expect
    .poll(() => screen.container.querySelector('.ui-autocomplete-tag')!.textContent)
    .toContain('Lyon');

  // Une requête qui ne ramène PAS Lyon : la puce doit garder son libellé.
  await screen.getByRole('combobox').fill('Bor');
  await expect.poll(() => optionsRendues(screen).length).toBe(1);

  expect(screen.container.querySelector('.ui-autocomplete-tag')!.textContent).toContain('Lyon');
});

// --- États -----------------------------------------------------------------

test('le champ est nommé et décrit par son message', async () => {
  const screen = await render(<Demo invalid errorText="Ville inconnue" />);

  await expect.element(screen.getByRole('combobox', { name: 'Ville' })).toBeInTheDocument();
  expect(champ(screen)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.container.textContent).toContain('Ville inconnue');
});

test('désactivé, aucune requête ne part', async () => {
  const onComplete = vi.fn();
  const screen = await render(<Demo disabled onComplete={onComplete} />);

  touche(champ(screen), 'ArrowDown');
  await new Promise((r) => setTimeout(r, 60));

  expect(onComplete).not.toHaveBeenCalled();
});

test('sans suggestion, le message vide s’affiche', async () => {
  const screen = await render(<Demo dropdown source={[]} emptyMessage="Rien" />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();

  await expect.poll(() => screen.container.textContent).toContain('Rien');
});

test('showEmptyMessage=false laisse le panneau muet', async () => {
  const screen = await render(<Demo dropdown source={[]} showEmptyMessage={false} />);

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  expect(screen.container.querySelector('.ui-autocomplete-empty')).toBeNull();
});

test('le bouton d’effacement vide la saisie et la valeur', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Demo showClear onValueChange={onValueChange} />);

  await screen.getByRole('combobox').fill('Bor');
  await screen.getByRole('button', { name: 'Effacer la saisie' }).click();

  await expect.poll(() => champ(screen).value).toBe('');
  expect(onValueChange).toHaveBeenLastCalledWith(null);
});

// --- Panneau et mouvement --------------------------------------------------

test('le panneau prend la largeur du champ', async () => {
  const screen = await render(
    <div style={{ width: 340 }}>
      <Demo dropdown />
    </div>,
  );

  await screen.getByRole('button', { name: 'Afficher les suggestions' }).click();
  await expect.poll(() => panneau(screen).getBoundingClientRect().width).toBeGreaterThan(0);

  const boite = screen.container.querySelector('.ui-field-box')!.getBoundingClientRect();
  expect(Math.round(panneau(screen).getBoundingClientRect().width)).toBe(Math.round(boite.width));
});

test('la transition du panneau couvre display et overlay', async () => {
  const screen = await render(<Demo />);
  const cs = getComputedStyle(panneau(screen));

  expect(cs.transitionProperty).toContain('display');
  expect(cs.transitionProperty).toContain('overlay');
  expect(cs.transitionBehavior).toBe('allow-discrete');
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

  await champ(screen).focus();
  await screen.getByRole('combobox').fill('ba');

  await expect.poll(() => panneau(screen).hasAttribute('data-unpositioned')).toBe(false);
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau(screen)).opacity).toBe('1');
});
