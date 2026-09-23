import { useState } from 'react';
import { userEvent } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiEditor, type UiEditorProps } from './ui-editor';

afterEach(() => {
  vi.restoreAllMocks();
});

function Host(props: Partial<UiEditorProps>) {
  return (
    <div style={{ width: 720 }}>
      <UiEditor label="Description" {...props} />
    </div>
  );
}

const area = (root: ParentNode) => root.querySelector<HTMLDivElement>('.ui-editor-content')!;
const tick = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/** Sélectionne tout le contenu de la zone, comme un Ctrl+A. */
function selectAll(el: HTMLElement) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

// --- Champ ------------------------------------------------------------------------

test('la zone est un textbox multiligne, nommé par son libellé', async () => {
  const screen = await render(<Host />);
  const box = screen.getByRole('textbox', { name: 'Description' });

  await expect.element(box).toHaveAttribute('aria-multiline', 'true');
  await expect.element(box).toHaveAttribute('contenteditable', 'true');
  await expect.element(box).toHaveAttribute('tabindex', '0');
});

test('la valeur de départ est rendue, nettoyée', async () => {
  const screen = await render(
    <Host
      defaultValue={
        '<p>Du <strong>gras</strong></p><img src="x" onerror="window.__pwned=1"><a href="javascript:alert(1)">l</a>'
      }
    />,
  );
  const el = area(screen.container);

  expect(el.querySelector('strong')).toHaveTextContent('gras');
  expect(el.querySelector('img')!.hasAttribute('onerror')).toBe(false);
  expect(el.querySelector('a')!.getAttribute('href')).toBe('unsafe:javascript:alert(1)');
  await tick();
  expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
});

test('la frappe notifie le HTML, et le compteur compte le texte seul', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host showCount maxLength={200} onValueChange={onValueChange} />);
  const box = screen.getByRole('textbox', { name: 'Description' });

  await box.click();
  await userEvent.keyboard('Bonjour');

  await expect.poll(() => onValueChange.mock.lastCall?.[0]).toContain('Bonjour');
  const count = screen.container.querySelector('.ui-editor-count')!;
  expect(count.textContent).toBe('7 / 200');
  expect(box.element().getAttribute('aria-describedby')).toContain(count.id);
});

test('le texte indicatif disparaît dès qu’il y a du texte', async () => {
  const screen = await render(<Host placeholder="Rédigez votre texte…" />);
  expect(screen.container.querySelector('.ui-editor-placeholder')).toHaveTextContent(
    'Rédigez votre texte…',
  );

  await screen.getByRole('textbox').click();
  await userEvent.keyboard('a');

  await expect.poll(() => screen.container.querySelector('.ui-editor-placeholder')).toBeNull();
});

test("contrôlé : l'écho de la saisie ne réécrit pas le DOM, une valeur extérieure si", async () => {
  function Demo() {
    const [value, setValue] = useState('<p>Début</p>');
    return (
      <>
        <Host value={value} onValueChange={setValue} />
        <button type="button" onClick={() => setValue('<p>Remplacé</p>')}>
          Remplacer
        </button>
      </>
    );
  }
  const screen = await render(<Demo />);
  const el = area(screen.container);
  const paragraph = el.querySelector('p')!;

  // Écho : le paragraphe d'origine est toujours le même nœud, donc le curseur tient.
  const range = document.createRange();
  range.setStart(paragraph.firstChild!, 5);
  range.collapse(true);
  el.focus();
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  await userEvent.keyboard(' et suite');
  await expect.poll(() => el.textContent).toBe('Début et suite');
  expect(el.querySelector('p')).toBe(paragraph);

  await screen.getByRole('button', { name: 'Remplacer' }).click();
  await expect.poll(() => el.innerHTML).toBe('<p>Remplacé</p>');
});

// --- Outils -----------------------------------------------------------------------

test('Gras met en gras la sélection et reflète son état', async () => {
  const onValueChange = vi.fn();
  const onSelectionChange = vi.fn();
  const screen = await render(
    <Host
      defaultValue="<p>Bonjour</p>"
      onValueChange={onValueChange}
      onSelectionChange={onSelectionChange}
    />,
  );
  const bold = screen.getByRole('button', { name: 'Gras' });
  await expect.element(bold).toHaveAttribute('aria-pressed', 'false');

  selectAll(area(screen.container));
  await bold.click();

  await expect
    .poll(() => area(screen.container).querySelector('b, strong')?.textContent)
    .toBe('Bonjour');
  await expect.element(bold).toHaveAttribute('aria-pressed', 'true');
  expect(onValueChange.mock.lastCall![0]).toMatch(/<(b|strong)>Bonjour<\/(b|strong)>/);
  expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ bold: true }));
});

test('la police et la taille deviennent des classes adossées aux jetons', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host defaultValue="<p>Texte</p>" onValueChange={onValueChange} />);

  selectAll(area(screen.container));
  await screen.getByRole('combobox', { name: 'Police' }).click();
  // Les options portent le nom réel de chaque famille : la deuxième est `title`.
  await screen.getByRole('option').nth(1).click();

  await expect
    .poll(() => area(screen.container).querySelector('.ui-editor-font-title'))
    .not.toBeNull();
  expect(area(screen.container).querySelector('font')).toBeNull();

  selectAll(area(screen.container));
  await screen.getByRole('combobox', { name: 'Taille du texte' }).click();
  await screen.getByRole('option', { name: 'Grand' }).click();

  await expect
    .poll(() => area(screen.container).querySelector('.ui-editor-size-lg'))
    .not.toBeNull();
  expect(onValueChange.mock.lastCall![0]).toContain('ui-editor-size-lg');
});

test('les nuanciers posent une classe de couleur, et « aucune couleur » la retire', async () => {
  const screen = await render(
    <Host
      defaultValue="<p>Texte</p>"
      tools={['bold', 'separator', 'textColor', 'highlightColor']}
    />,
  );

  selectAll(area(screen.container));
  const couleur = screen.getByRole('button', { name: 'Couleur du texte' });
  await expect.element(couleur).toHaveAttribute('aria-haspopup', 'listbox');
  await couleur.click();
  await expect.element(couleur).toHaveAttribute('aria-expanded', 'true');
  await screen.container.ownerDocument
    .querySelector<HTMLElement>('.ui-swatch-picker [data-key="red-700"]')!
    .click();

  await expect
    .poll(() => area(screen.container).querySelector('.ui-editor-color-red-700'))
    .not.toBeNull();
  expect(area(screen.container).querySelector('font')).toBeNull();

  selectAll(area(screen.container));
  await screen.getByRole('button', { name: 'Couleur de surlignage' }).click();
  const surligneur = [
    ...document.querySelectorAll<HTMLElement>('.ui-swatch-picker [data-key="green-100"]'),
  ].at(-1)!;
  surligneur.click();
  await expect
    .poll(() => area(screen.container).querySelector('.ui-editor-highlight-green-100'))
    .not.toBeNull();
  expect(area(screen.container).querySelector('[style]')).toBeNull();
});

test('recolorer un paragraphe recolore aussi le mot qui avait déjà une couleur', async () => {
  const screen = await render(
    <Host
      defaultValue={'<p><span class="ui-editor-color-red-700">rouge</span> et normal</p>'}
      tools={['textColor']}
    />,
  );

  selectAll(area(screen.container));
  await screen.getByRole('button', { name: 'Couleur du texte' }).click();
  document.querySelector<HTMLElement>('.ui-swatch-picker [data-key="green-700"]')!.click();

  await expect
    .poll(() => area(screen.container).querySelector('.ui-editor-color-green-700'))
    .not.toBeNull();
  // La classe rouge, plus proche du texte, aurait gagné sur la verte.
  expect(area(screen.container).querySelector('.ui-editor-color-red-700')).toBeNull();
  expect(area(screen.container).querySelector('.ui-editor-color-green-700')).toHaveTextContent(
    'rouge et normal',
  );
});

test('après une police, la sélection reste : une seconde mise en forme suit sans resélectionner', async () => {
  const screen = await render(<Host defaultValue="<p>Texte</p>" />);

  selectAll(area(screen.container));
  await screen.getByRole('combobox', { name: 'Taille du texte' }).click();
  await screen.getByRole('option', { name: 'Grand' }).click();
  await expect
    .poll(() => area(screen.container).querySelector('.ui-editor-size-lg'))
    .not.toBeNull();

  expect(document.getSelection()!.toString()).toBe('Texte');
  await screen.getByRole('button', { name: 'Gras' }).click();
  await expect
    .poll(() => area(screen.container).querySelector('b, strong')?.textContent)
    .toBe('Texte');
});

test("l'alignement s'écrit en style, et survit à un aller-retour par la valeur", async () => {
  function Demo() {
    const [value, setValue] = useState('<p>Centré</p>');
    const [stored, setStored] = useState('');
    return (
      <>
        <Host value={value} onValueChange={setValue} />
        <button type="button" onClick={() => setStored(value)}>
          Enregistrer
        </button>
        <button type="button" onClick={() => setValue('<p>autre</p>')}>
          Vider
        </button>
        <button type="button" onClick={() => setValue(stored)}>
          Recharger
        </button>
      </>
    );
  }
  const screen = await render(<Demo />);

  selectAll(area(screen.container));
  await screen.getByRole('button', { name: 'Centrer' }).click();
  await expect
    .poll(() => area(screen.container).querySelector('p')?.style.textAlign)
    .toBe('center');

  await screen.getByRole('button', { name: 'Enregistrer' }).click();
  await screen.getByRole('button', { name: 'Vider' }).click();
  await expect.poll(() => area(screen.container).textContent).toBe('autre');
  await screen.getByRole('button', { name: 'Recharger' }).click();

  await expect
    .poll(() => area(screen.container).querySelector('p')?.style.textAlign)
    .toBe('center');
});

test('Bloc de code bascule le paragraphe en <pre>, et le lien passe par l’invite', async () => {
  vi.spyOn(window, 'prompt').mockReturnValue('https://example.org');
  const screen = await render(<Host defaultValue="<p>code</p>" />);

  selectAll(area(screen.container));
  await screen.getByRole('button', { name: 'Bloc de code' }).click();
  await expect.poll(() => area(screen.container).querySelector('pre')?.textContent).toBe('code');

  selectAll(area(screen.container));
  await screen.getByRole('button', { name: 'Lien' }).click();
  await expect
    .poll(() => area(screen.container).querySelector('a')?.getAttribute('href'))
    .toBe('https://example.org');
});

// --- Collage et limite --------------------------------------------------------------

test('le collage est ramené aux balises de l’éditeur, sans rien d’exécutable', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host onValueChange={onValueChange} />);
  const el = area(screen.container);
  el.focus();

  const data = new DataTransfer();
  data.setData(
    'text/html',
    '<h4 style="color:red" onclick="alert(1)">Titre</h4><p class="MsoNormal">Du <b data-x="1">gras</b></p><script>window.__pwned=1</script><table><tr><td>cellule</td></tr></table>',
  );
  el.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );

  await expect.poll(() => onValueChange.mock.lastCall?.[0]).toBeTruthy();
  expect(el.querySelector('script, table, h4, [onclick], [style], .MsoNormal')).toBeNull();
  expect(el.querySelector('b')).toHaveTextContent('gras');
  expect(el.textContent).toContain('cellule');
  expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
});

test('maxLength bloque les insertions, pas les suppressions', async () => {
  const screen = await render(<Host maxLength={3} showCount />);
  const box = screen.getByRole('textbox');

  await box.click();
  await userEvent.keyboard('abcdef');
  await expect.poll(() => area(screen.container).textContent).toBe('abc');

  await userEvent.keyboard('{Backspace}');
  await expect.poll(() => area(screen.container).textContent).toBe('ab');
});

test('le compteur passe en dépassement quand la valeur excède la limite', async () => {
  const screen = await render(<Host value="<p>trop long</p>" maxLength={3} showCount />);

  expect(screen.container.querySelector('.ui-editor-count')).toHaveClass('_over');
});

// --- États ----------------------------------------------------------------------

test('désactivé ou en lecture seule, la zone ne s’édite plus', async () => {
  const screen = await render(<Host disabled />);
  const box = area(screen.container);

  expect(box).toHaveAttribute('contenteditable', 'false');
  expect(box).toHaveAttribute('tabindex', '-1');
  expect(box).toHaveAttribute('aria-disabled', 'true');
  await expect.element(screen.getByRole('button', { name: 'Gras' })).toBeDisabled();

  await screen.rerender(<Host readOnly />);
  expect(area(screen.container)).toHaveAttribute('contenteditable', 'false');
  expect(area(screen.container)).toHaveAttribute('aria-readonly', 'true');
  expect(area(screen.container)).toHaveAttribute('tabindex', '0');
});

test('en erreur, la zone est marquée invalide', async () => {
  const screen = await render(<Host invalid errorText="Obligatoire" />);

  expect(area(screen.container)).toHaveAttribute('aria-invalid', 'true');
});

// --- Barre d'outils ---------------------------------------------------------------

test('la barre est un seul arrêt de tabulation, que les flèches parcourent', async () => {
  const screen = await render(<Host tools={['fontFamily', 'separator', 'bold', 'italic']} />);
  const toolbar = screen.getByRole('toolbar', { name: 'Mise en forme' });
  const police = screen.getByRole('combobox', { name: 'Police' });
  const gras = screen.getByRole('button', { name: 'Gras' });
  const italique = screen.getByRole('button', { name: 'Italique' });

  await expect.element(police).toHaveAttribute('tabindex', '0');
  await expect.element(gras).toHaveAttribute('tabindex', '-1');

  police.element().focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => document.activeElement).toBe(gras.element());
  await expect.element(gras).toHaveAttribute('tabindex', '0');
  await expect.element(police).toHaveAttribute('tabindex', '-1');

  await userEvent.keyboard('{End}');
  await expect.poll(() => document.activeElement).toBe(italique.element());
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => document.activeElement).toBe(police.element());
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => document.activeElement).toBe(area(screen.container));
  expect(toolbar.element()).toHaveAttribute('aria-orientation', 'horizontal');
});

test('tools réduit la barre, une liste vide rend le jeu par défaut', async () => {
  const screen = await render(<Host tools={['bold', 'italic']} />);
  expect(screen.container.querySelectorAll('.ui-editor-tool')).toHaveLength(2);

  await screen.rerender(<Host tools={[]} />);
  expect(screen.container.querySelectorAll('.ui-editor-tool').length).toBeGreaterThan(10);
});

test('toolbarPosition place la barre sous la zone', async () => {
  const screen = await render(<Host toolbarPosition="bottom" />);
  const editor = screen.container.querySelector('.ui-editor')!;

  expect(editor.lastElementChild).toHaveClass('ui-editor-toolbar', '_bottom');
});
