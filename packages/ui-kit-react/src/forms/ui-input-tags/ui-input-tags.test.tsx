import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiInputTags, type UiInputTagsProps } from './ui-input-tags';

const VILLES = ['Bordeaux', 'Bayonne', 'Lyon'];

type Ecran = { container: HTMLElement };

const champ = (s: Ecran) => s.container.querySelector('.ui-input-tags-input') as HTMLInputElement;
const listeTags = (s: Ecran) =>
  s.container.querySelector('.ui-input-tags-list[role="listbox"]') as HTMLElement;
const tags = (s: Ecran) => [...s.container.querySelectorAll('.ui-input-tags-tag')] as HTMLElement[];
const panneau = (s: Ecran) => s.container.querySelector('.ui-input-tags-panel') as HTMLElement;
const optionsPanneau = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-input-tags-option')] as HTMLElement[];

function Demo(props: Partial<UiInputTagsProps<string>> = {}) {
  return <UiInputTags<string> label="Mots-clés" {...props} />;
}

function DemoControlee({
  initial = [],
  ...props
}: Partial<UiInputTagsProps<string>> & { initial?: string[] }) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <Demo
      {...props}
      value={v}
      onValueChange={(next) => {
        setV(next);
        props.onValueChange?.(next);
      }}
    />
  );
}

/** Frappe sur un `<input>` contrôlé par React : passer par le setter natif. */
async function taper(el: HTMLInputElement, texte: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, texte);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

// --- Sémantique ------------------------------------------------------------

test('les tags forment une listbox horizontale, chacun une option', async () => {
  const screen = await render(<Demo defaultValue={['un', 'deux']} />);

  expect(listeTags(screen)).toHaveAttribute('aria-orientation', 'horizontal');
  expect(tags(screen)).toHaveLength(2);
  expect(tags(screen)[0]).toHaveAttribute('role', 'option');
  expect(tags(screen)[0]).toHaveAttribute('aria-selected', 'true');
  expect(tags(screen)[0]).toHaveAttribute('aria-posinset', '1');
  expect(tags(screen)[0]).toHaveAttribute('aria-setsize', '2');
});

test('la listbox n’enveloppe que les tags, jamais le champ', async () => {
  const screen = await render(<Demo defaultValue={['un']} />);

  // Une `listbox` ne peut pas contenir de champ texte : c'est ce qui impose
  // l'enveloppe séparée, en `display: contents`.
  expect(listeTags(screen).contains(champ(screen))).toBe(false);
  expect(getComputedStyle(listeTags(screen)).display).toBe('contents');
});

test('sans typeahead, le champ n’est pas un combobox', async () => {
  const screen = await render(<Demo />);

  expect(champ(screen)).not.toHaveAttribute('role');
  expect(champ(screen)).not.toHaveAttribute('aria-expanded');
});

test('sans nom accessible, un avertissement est émis en développement', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await render(<UiInputTags<string> />);

  await expect.poll(() => warn.mock.calls.length).toBeGreaterThan(0);
  expect(warn.mock.calls[0]?.[0]).toContain('ui-input-tags');
  warn.mockRestore();
});

// --- Poser un tag ----------------------------------------------------------

test('Entrée transforme le texte tapé en tag', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee onValueChange={onValueChange} />);
  const el = champ(screen);

  el.focus();
  await taper(el, 'design');
  touche(el, 'Enter');

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['design']);
  // Le champ est vidé : le tag a pris la place du texte.
  await expect.poll(() => champ(screen).value).toBe('');
});

test('un delimiter verse chaque partie complète et garde le reste', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee delimiter="," onValueChange={onValueChange} />);
  const el = champ(screen);

  el.focus();
  await taper(el, 'un,deux,tro');

  // Deux tags posés d'un coup, et « tro » reste en cours de frappe.
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['un', 'deux']);
  await expect.poll(() => champ(screen).value).toBe('tro');
});

test('un doublon est refusé, sauf si allowDuplicate', async () => {
  const refuse = vi.fn();
  const screen = await render(<DemoControlee initial={['un']} onValueChange={refuse} />);
  champ(screen).focus();
  await taper(champ(screen), 'un');
  touche(champ(screen), 'Enter');
  await new Promise((r) => setTimeout(r, 80));
  expect(refuse).not.toHaveBeenCalled();

  const accepte = vi.fn();
  const s2 = await render(
    <DemoControlee initial={['un']} allowDuplicate onValueChange={accepte} />,
  );
  champ(s2).focus();
  await taper(champ(s2), 'un');
  touche(champ(s2), 'Enter');
  await expect.poll(() => accepte.mock.calls.at(-1)?.[0]).toEqual(['un', 'un']);
});

test('max ferme la saisie une fois atteint', async () => {
  const screen = await render(<Demo defaultValue={['un', 'deux']} max={2} />);

  // Le champ passe en lecture seule : plus rien ne peut être tapé.
  expect(champ(screen).readOnly).toBe(true);
});

test('max borne aussi un ajout multiple', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee delimiter="," max={2} onValueChange={onValueChange} />,
  );

  champ(screen).focus();
  await taper(champ(screen), 'a,b,c,');

  // Une SEULE écriture du modèle, bornée à deux : enchaîner un ajout par
  // partie ferait travailler chacun sur un état périmé.
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['a', 'b']);
  expect(onValueChange).toHaveBeenCalledTimes(1);
});

test('addOnTab pose le tag au lieu de quitter le champ', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee addOnTab onValueChange={onValueChange} />);

  champ(screen).focus();
  await taper(champ(screen), 'design');
  touche(champ(screen), 'Tab');

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['design']);
});

test('addOnBlur pose le tag quand le focus quitte le champ', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <>
      <DemoControlee addOnBlur onValueChange={onValueChange} />
      <button type="button">ailleurs</button>
    </>,
  );

  champ(screen).focus();
  await taper(champ(screen), 'design');
  await screen.getByRole('button', { name: 'ailleurs' }).click();

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['design']);
});

test('addOnPaste découpe le collage sur les séparateurs usuels', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee addOnPaste onValueChange={onValueChange} />);
  const el = champ(screen);

  const donnees = new DataTransfer();
  donnees.setData('text', 'un, deux ; trois');
  el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: donnees }));

  // Sans `delimiter`, un collage se découpe quand même : c'est l'intérêt de
  // coller une liste.
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['un', 'deux', 'trois']);
});

// --- Retirer un tag --------------------------------------------------------

test('Retour arrière sur un champ vide retire le dernier tag', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={['un', 'deux']} onValueChange={onValueChange} />,
  );

  champ(screen).focus();
  touche(champ(screen), 'Backspace');

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['un']);
});

test('Retour arrière ne retire rien tant qu’il reste du texte', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={['un']} onValueChange={onValueChange} />);

  champ(screen).focus();
  await taper(champ(screen), 'ab');
  touche(champ(screen), 'Backspace');
  await new Promise((r) => setTimeout(r, 80));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('la croix d’un tag le retire, sans être un contrôle imbriqué', async () => {
  const onTagRemove = vi.fn();
  const screen = await render(<DemoControlee initial={['un', 'deux']} onTagRemove={onTagRemove} />);

  const croix = tags(screen)[0]!.querySelector('.ui-input-tags-remove') as HTMLElement;
  // Un `<button>` ici serait un contrôle interactif IMBRIQUÉ dans une `option`
  // elle-même interactive, ce qu'axe refuse (`nested-interactive`). La croix est
  // donc une décoration hors de l'arbre d'accessibilité, et le chemin clavier
  // est Suppr sur l'option.
  expect(croix.tagName).toBe('SPAN');
  expect(croix).toHaveAttribute('aria-hidden', 'true');
  expect(tags(screen)[0]!.querySelector('button')).toBeNull();

  croix.click();

  await expect.poll(() => onTagRemove.mock.calls.at(-1)).toEqual(['un', 0]);
  await expect.poll(() => tags(screen)).toHaveLength(1);
});

test('désactivé ou en lecture seule, aucun tag ne se retire', async () => {
  const desactive = await render(<Demo defaultValue={['un']} disabled />);
  expect(desactive.container.querySelector('.ui-input-tags-remove')).toBeNull();

  const lecture = await render(<Demo defaultValue={['un']} readOnly />);
  expect(lecture.container.querySelector('.ui-input-tags-remove')).toBeNull();
});

// --- Focus glissant des tags ----------------------------------------------

test('la flèche gauche depuis un champ vide entre dans les tags', async () => {
  const screen = await render(<Demo defaultValue={['un', 'deux']} />);

  champ(screen).focus();
  touche(champ(screen), 'ArrowLeft');

  await expect.poll(() => document.activeElement).toBe(tags(screen)[1]);
});

test('les flèches parcourent les tags, et la droite ressort dans le champ', async () => {
  const screen = await render(<Demo defaultValue={['un', 'deux']} />);

  tags(screen)[1]!.focus();
  touche(tags(screen)[1]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(tags(screen)[0]);

  touche(tags(screen)[0]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(tags(screen)[1]);

  touche(tags(screen)[1]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(champ(screen));
});

test('Suppr sur un tag le retire et garde le focus cohérent', async () => {
  const screen = await render(<DemoControlee initial={['un', 'deux', 'trois']} />);

  tags(screen)[1]!.focus();
  touche(tags(screen)[1]!, 'Delete');

  await expect
    .poll(() => tags(screen).map((t) => t.getAttribute('aria-label')))
    .toEqual(['un', 'trois']);
  // Le focus reste sur un tag existant, à la même place.
  await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('trois');
});

test('retirer le dernier tag rend le focus au champ', async () => {
  const screen = await render(<DemoControlee initial={['un']} />);

  tags(screen)[0]!.focus();
  touche(tags(screen)[0]!, 'Backspace');

  await expect.poll(() => document.activeElement).toBe(champ(screen));
});

test('les tags n’ont qu’un seul arrêt de tabulation', async () => {
  const screen = await render(<Demo defaultValue={['un', 'deux', 'trois']} />);

  tags(screen)[1]!.focus();
  await expect.poll(() => tags(screen).filter((t) => t.tabIndex === 0)).toHaveLength(1);
});

// --- Suggestions -----------------------------------------------------------

function DemoTypeahead(props: Partial<UiInputTagsProps<string>> = {}) {
  const [v, setV] = useState<string[]>([]);
  const [sug, setSug] = useState<readonly unknown[]>([]);
  return (
    <UiInputTags<string>
      label="Villes"
      typeahead
      delay={0}
      suggestions={sug}
      value={v}
      onValueChange={setV}
      onComplete={(q) => setSug(VILLES.filter((c) => c.toLowerCase().includes(q.toLowerCase())))}
      {...props}
    />
  );
}

test('taper émet une requête et ouvre le panneau', async () => {
  const onComplete = vi.fn();
  const screen = await render(<DemoTypeahead onComplete={onComplete} suggestions={VILLES} />);

  champ(screen).focus();
  await taper(champ(screen), 'bo');

  await expect.poll(() => onComplete.mock.calls.at(-1)?.[0]).toBe('bo');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  expect(champ(screen)).toHaveAttribute('role', 'combobox');
  expect(champ(screen)).toHaveAttribute('aria-expanded', 'true');
});

test('minLength retient la requête tant que le texte est trop court', async () => {
  const onComplete = vi.fn();
  const screen = await render(
    <DemoTypeahead minLength={3} onComplete={onComplete} suggestions={VILLES} />,
  );

  champ(screen).focus();
  await taper(champ(screen), 'bo');
  await new Promise((r) => setTimeout(r, 120));

  expect(onComplete).not.toHaveBeenCalled();
});

test('choisir une suggestion la pose en tag et ferme le panneau', async () => {
  const screen = await render(<DemoTypeahead suggestions={VILLES} />);

  champ(screen).focus();
  await taper(champ(screen), 'bo');
  await expect.poll(() => optionsPanneau(screen).length).toBeGreaterThan(0);

  await optionsPanneau(screen)[0]!.click();

  await expect.poll(() => tags(screen)).toHaveLength(1);
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
});

test('une valeur déjà posée est cochée et désactivée dans le panneau', async () => {
  const screen = await render(<DemoTypeahead suggestions={VILLES} />);

  champ(screen).focus();
  await taper(champ(screen), 'b');
  await expect.poll(() => optionsPanneau(screen).length).toBeGreaterThan(0);
  await optionsPanneau(screen)[0]!.click();

  await taper(champ(screen), 'b');
  await expect.poll(() => optionsPanneau(screen).length).toBeGreaterThan(0);

  const presente = optionsPanneau(screen).find((o) => o.classList.contains('_present'));
  expect(presente).toBeDefined();
  expect(presente).toHaveAttribute('aria-disabled', 'true');
  expect(presente!.querySelector('.ui-input-tags-option-check')).not.toBeNull();
});

test('les flèches déplacent le focus visuel, désigné par aria-activedescendant', async () => {
  const screen = await render(<DemoTypeahead suggestions={VILLES} />);

  champ(screen).focus();
  await taper(champ(screen), 'b');
  await expect.poll(() => optionsPanneau(screen).length).toBeGreaterThan(1);

  touche(champ(screen), 'ArrowDown');

  // Motif combobox : le focus DOM ne quitte jamais le champ.
  await expect
    .poll(() => champ(screen).getAttribute('aria-activedescendant'))
    .toBe(optionsPanneau(screen)[0]?.id);
  expect(document.activeElement).toBe(champ(screen));
});

test('Entrée choisit la suggestion au focus visuel, sinon pose le texte', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoTypeahead suggestions={VILLES} onValueChange={onValueChange} />);

  champ(screen).focus();
  await taper(champ(screen), 'b');
  await expect.poll(() => optionsPanneau(screen).length).toBeGreaterThan(0);
  touche(champ(screen), 'ArrowDown');
  // Un tick entre les deux touches : deux appuis réels sont deux tâches, donc
  // React a re-rendu entre elles. Les enchaîner dans la même tâche ferait lire
  // au gestionnaire d'`Entrée` un `focusedOption` encore à -1.
  await expect.poll(() => champ(screen).getAttribute('aria-activedescendant')).toBeTruthy();
  touche(champ(screen), 'Enter');

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toEqual(['Bordeaux']);
});

test('Échap ferme le panneau, et ne remonte que quand elle n’a rien fermé', async () => {
  const surEchap = vi.fn();
  const screen = await render(
    /*
      eslint-disable-next-line jsx-a11y/no-static-element-interactions --
      Sondeur de test, pas une interface : il n'existe que pour observer si la
      touche remonte jusqu'a un parent, ce qui est le contrat verifie ici.
    */
    <div onKeyDown={(e) => e.key === 'Escape' && surEchap()}>
      <DemoTypeahead suggestions={VILLES} />
    </div>,
  );

  champ(screen).focus();
  touche(champ(screen), 'Escape');
  await expect.poll(() => surEchap.mock.calls.length).toBe(1);

  await taper(champ(screen), 'b');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  touche(champ(screen), 'Escape');
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
  expect(surEchap).toHaveBeenCalledTimes(1);
});

test('les groupes portent un en-tête hors du décompte des options', async () => {
  const screen = await render(
    <DemoTypeahead
      group
      suggestions={[
        { label: 'Sud-Ouest', items: ['Bordeaux', 'Bayonne'] },
        { label: 'Vide', items: [] },
      ]}
    />,
  );

  champ(screen).focus();
  await taper(champ(screen), 'b');
  await expect.poll(() => optionsPanneau(screen).length).toBe(2);

  const entetes = screen.container.querySelectorAll('.ui-input-tags-group');
  // Le groupe vide n'est pas rendu, et l'en-tête n'est pas une option.
  expect(entetes).toHaveLength(1);
  expect(entetes[0]).toHaveAttribute('role', 'presentation');
});

test('sans suggestion, le panneau affiche son message vide', async () => {
  const screen = await render(<DemoTypeahead suggestions={[]} emptyMessage="Rien trouvé" />);

  champ(screen).focus();
  await taper(champ(screen), 'zzz');

  await expect.poll(() => panneau(screen).textContent).toContain('Rien trouvé');
});

// --- Rendu -----------------------------------------------------------------

test('le texte indicatif s’efface dès le premier tag', async () => {
  const vide = await render(<Demo placeholder="Ajouter…" />);
  expect(champ(vide).placeholder).toBe('Ajouter…');

  const rempli = await render(<Demo placeholder="Ajouter…" defaultValue={['un']} />);
  expect(champ(rempli).placeholder).toBe('');
});

test('renderTag remplace le contenu, jamais le rôle d’option', async () => {
  const screen = await render(
    <Demo defaultValue={['design']} renderTag={({ label }) => <em data-tag>#{label}</em>} />,
  );

  const tag = tags(screen)[0]!;
  expect(tag).toHaveAttribute('role', 'option');
  expect(tag).toHaveAttribute('aria-label', 'design');
  expect(tag.querySelector('[data-tag]')?.textContent).toBe('#design');
});

test('un objet est étiqueté par optionLabel, et comparé par dataKey', async () => {
  const screen = await render(
    <UiInputTags<{ id: number; nom: string }>
      label="Villes"
      optionLabel="nom"
      dataKey="id"
      defaultValue={[{ id: 1, nom: 'Bordeaux' }]}
    />,
  );

  expect(tags(screen)[0]).toHaveAttribute('aria-label', 'Bordeaux');
});

// `computePosition` est asynchrone : le panneau reste dans son état fermé, donc
// invisible, jusqu'à ce que sa position soit calculée. Les deux moitiés du
// contrat comptent, et pour des raisons opposées : sans la POSE, une image au
// mauvais endroit est peinte et le panneau paraît sauter en place ; sans le
// RELÂCHEMENT, le panneau reste invisible pour de bon.
test('le panneau attend sa position avant d’être peint', async () => {
  const screen = await render(<DemoTypeahead suggestions={VILLES} />);

  // Au repos, le garde est POSÉ : c'est ce qui prouve qu'il est branché.
  expect(panneau(screen).hasAttribute('data-unpositioned')).toBe(true);

  champ(screen).focus();
  await taper(champ(screen), 'bo');

  await expect.poll(() => panneau(screen).hasAttribute('data-unpositioned')).toBe(false);
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau(screen)).opacity).toBe('1');
});
