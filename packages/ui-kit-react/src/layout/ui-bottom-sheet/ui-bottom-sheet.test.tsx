import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiBottomSheet, type UiBottomSheetProps } from './ui-bottom-sheet';

// `children` est repris explicitement : en JSX, ce qui est écrit entre les
// balises l'emporte sur un `children` passé par étalement, et le contenu de
// l'appelant serait silencieusement remplacé.
function Host({ children = 'Contenu du panneau', ...props }: Partial<UiBottomSheetProps>) {
  return (
    <UiBottomSheet defaultVisible header="Partager" {...props}>
      {children}
    </UiBottomSheet>
  );
}

const sheet = (root: ParentNode) => root.querySelector<HTMLDialogElement>('.ui-bottom-sheet')!;
const grab = (root: ParentNode) => root.querySelector<HTMLElement>('.ui-bottom-sheet-grab')!;
const handle = (root: ParentNode) => root.querySelector<HTMLElement>('.ui-bottom-sheet-handle')!;

/** Un geste complet sur la zone de préhension, en pixels verticaux. */
function glisser(zone: HTMLElement, from: number, to: number) {
  const init = { bubbles: true, cancelable: true, pointerId: 1, clientX: 100 };
  zone.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientY: from }));
  zone.dispatchEvent(new PointerEvent('pointermove', { ...init, clientY: to }));
  zone.dispatchEvent(new PointerEvent('pointerup', { ...init, clientY: to }));
}

// --- Ouverture -------------------------------------------------------------
// L'état est la source de vérité, et un `<dialog>` s'ouvre par une MÉTHODE :
// l'attribut `open` posé en JSX rendrait le panneau hors du calque supérieur.
test('le panneau modal s’ouvre dans le calque supérieur', async () => {
  const screen = await render(<Host />);

  await expect.poll(() => sheet(screen.container).open).toBe(true);
  expect(sheet(screen.container).matches(':modal')).toBe(true);
  expect(sheet(screen.container).tagName).toBe('DIALOG');
});

test('fermé, le panneau n’occupe aucune place', async () => {
  const screen = await render(<Host defaultVisible={false} />);

  expect(sheet(screen.container).open).toBe(false);
  expect(getComputedStyle(sheet(screen.container)).display).toBe('none');
});

test('le titre nomme le panneau', async () => {
  const screen = await render(<Host />);
  const el = sheet(screen.container);

  expect(el.getAttribute('aria-labelledby')).toBe(
    screen.container.querySelector('.ui-bottom-sheet-title')!.id,
  );
  expect(el).not.toHaveAttribute('aria-label');
});

test('sans titre, aria-label prend le relais', async () => {
  const screen = await render(<Host header={undefined} aria-label="Options" />);

  expect(sheet(screen.container)).toHaveAttribute('aria-label', 'Options');
  expect(sheet(screen.container)).not.toHaveAttribute('aria-labelledby');
});

// Non modal : pas de calque supérieur, donc pas d'arrière-plan à assombrir.
test('modal=false ouvre le panneau sans calque supérieur', async () => {
  const screen = await render(<Host modal={false} />);

  await expect.poll(() => sheet(screen.container).open).toBe(true);
  expect(sheet(screen.container).matches(':modal')).toBe(false);
  expect(getComputedStyle(sheet(screen.container), '::backdrop').backgroundColor).toBe(
    'rgba(0, 0, 0, 0)',
  );
});

test('contained pose le panneau dans son ancêtre, et le rend non modal', async () => {
  const screen = await render(
    <div style={{ position: 'relative', width: 300, height: 300 }}>
      <Host contained />
    </div>,
  );

  await expect.poll(() => sheet(screen.container).open).toBe(true);
  expect(sheet(screen.container).matches(':modal')).toBe(false);
  expect(getComputedStyle(sheet(screen.container)).position).toBe('absolute');
  expect(sheet(screen.container)).toHaveClass('_contained');
});

// --- Fermeture -------------------------------------------------------------
test('le bouton de fermeture referme', async () => {
  const onVisibleChange = vi.fn();
  const screen = await render(<Host closable onVisibleChange={onVisibleChange} />);

  await screen.getByRole('button', { name: 'Fermer' }).click();

  await expect.poll(() => sheet(screen.container).open).toBe(false);
  expect(onVisibleChange).toHaveBeenLastCalledWith(false);
});

// Échap arrive par `cancel`, annulable : on l'annule toujours et on passe par
// l'état, pour n'avoir qu'une seule voie de fermeture.
test('Échap referme, et closeOnEscape=false l’en empêche', async () => {
  const screen = await render(<Host />);
  sheet(screen.container).dispatchEvent(new Event('cancel', { cancelable: true }));
  await expect.poll(() => sheet(screen.container).open).toBe(false);

  const colle = await render(<Host closeOnEscape={false} />);
  sheet(colle.container).dispatchEvent(new Event('cancel', { cancelable: true }));
  await new Promise((r) => setTimeout(r, 40));
  expect(sheet(colle.container).open).toBe(true);
});

// Le panneau EST le dialogue : un clic dont la cible est le dialogue lui-même
// vient donc de l'arrière-plan, jamais du contenu.
test('le clic sur l’arrière-plan referme, et dismissableMask=false l’en empêche', async () => {
  const screen = await render(<Host />);
  sheet(screen.container).click();
  await expect.poll(() => sheet(screen.container).open).toBe(false);

  const colle = await render(<Host dismissableMask={false} />);
  sheet(colle.container).click();
  await new Promise((r) => setTimeout(r, 40));
  expect(sheet(colle.container).open).toBe(true);
});

test('un clic dans le contenu ne referme pas', async () => {
  const screen = await render(
    <Host>
      <button type="button">Action</button>
    </Host>,
  );

  await screen.getByRole('button', { name: 'Action' }).click();

  await new Promise((r) => setTimeout(r, 40));
  expect(sheet(screen.container).open).toBe(true);
});

// --- Paliers ---------------------------------------------------------------
test('les paliers nommés passent par leur classe', async () => {
  const moitie = await render(<Host height="half" />);
  const plein = await render(<Host height="full" />);

  expect(sheet(moitie.container)).toHaveClass('_half');
  expect(sheet(plein.container)).toHaveClass('_full');
  expect(sheet(moitie.container).style.height).toBe('');
});

// Une longueur libre ne peut pas passer par une classe : elle est écrite en
// ligne, et le crochet SCSS n'a alors rien à dire.
test('une longueur CSS libre est écrite en ligne', async () => {
  const screen = await render(<Host height="240px" />);

  expect(sheet(screen.container).style.height).toBe('240px');
  expect(sheet(screen.container).className).not.toMatch(/_auto|_half|_full/);
});

test('auto laisse la hauteur épouser le contenu, sous un plafond', async () => {
  const screen = await render(<Host height="auto" />);

  expect(sheet(screen.container)).toHaveClass('_auto');
  expect(getComputedStyle(sheet(screen.container)).maxHeight).not.toBe('none');
});

// --- Préhension ------------------------------------------------------------
test('la poignée est décorative sans mode palier', async () => {
  const screen = await render(<Host />);

  expect(handle(screen.container).tagName).toBe('DIV');
  expect(handle(screen.container)).toHaveAttribute('aria-hidden', 'true');
});

// En mode palier la poignée devient manipulable : elle doit donc être un vrai
// bouton, nommé, et assez grand pour être une cible (WCAG 2.5.8).
test('en mode palier, la poignée devient un bouton nommé', async () => {
  const screen = await render(<Host height="half" enableSnapping />);
  const el = handle(screen.container);

  expect(el.tagName).toBe('BUTTON');
  expect(el).toHaveAttribute('aria-label', 'Redimensionner le panneau');
  expect(el).toHaveAttribute('aria-expanded', 'false');
  expect(el).toHaveClass('_operable');
  expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
});

test('showHandle=false retire la poignée', async () => {
  const screen = await render(<Host showHandle={false} />);

  expect(screen.container.querySelector('.ui-bottom-sheet-handle')).toBeNull();
});

// Le geste possède l'axe vertical de la zone de préhension : sans ça le
// navigateur défilerait ou déclencherait son tirer-pour-rafraîchir.
test('la zone de préhension prend l’axe vertical', async () => {
  const screen = await render(<Host />);

  expect(grab(screen.container)).toHaveClass('_draggable');
  expect(getComputedStyle(grab(screen.container)).touchAction).toBe('none');
});

test('sans glissement ni palier, la zone n’est plus saisissable', async () => {
  const screen = await render(<Host enableDragToClose={false} />);

  expect(grab(screen.container)).not.toHaveClass('_draggable');
});

// --- Glissement ------------------------------------------------------------
test('un glissement vers le bas au-delà du seuil referme', async () => {
  const screen = await render(<Host dragThreshold={50} />);

  glisser(grab(screen.container), 100, 200);

  await expect.poll(() => sheet(screen.container).open).toBe(false);
});

test('un glissement trop court ramène le panneau en place', async () => {
  const screen = await render(<Host dragThreshold={100} />);

  glisser(grab(screen.container), 100, 130);

  await new Promise((r) => setTimeout(r, 60));
  expect(sheet(screen.container).open).toBe(true);
  expect(sheet(screen.container).style.translate).toBe('');
});

test('enableDragToClose=false ne referme pas au glissement', async () => {
  const screen = await render(<Host enableDragToClose={false} dragThreshold={50} />);

  glisser(grab(screen.container), 100, 300);

  await new Promise((r) => setTimeout(r, 60));
  expect(sheet(screen.container).open).toBe(true);
});

// Un contrôle posé dans la zone de préhension garde son propre geste : sans
// cette garde, le bouton de fermeture ouvrirait un glissement.
test('un contrôle de la zone de préhension garde son geste', async () => {
  const screen = await render(<Host closable dragThreshold={50} />);
  const fermeture = screen.container.querySelector<HTMLElement>('.ui-bottom-sheet-action')!;
  const init = { bubbles: true, cancelable: true, pointerId: 1, clientX: 100 };

  fermeture.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientY: 100 }));
  grab(screen.container).dispatchEvent(new PointerEvent('pointermove', { ...init, clientY: 300 }));

  expect(sheet(screen.container)).not.toHaveClass('_dragging');
  expect(sheet(screen.container).style.translate).toBe('');
});

// --- Paliers au glissement et au clavier -----------------------------------
test('tirer vers le haut fait passer un panneau half à full', async () => {
  const screen = await render(<Host height="half" enableSnapping dragThreshold={40} />);

  expect(sheet(screen.container)).toHaveClass('_half');

  glisser(grab(screen.container), 300, 100);

  await expect.poll(() => sheet(screen.container).className).toContain('_full');
  expect(handle(screen.container)).toHaveAttribute('aria-expanded', 'true');
});

// Depuis `full`, un panneau à palier redescend d'abord à `half` : le geste vers
// le bas ne referme qu'au second coup.
test('depuis full, le glissement vers le bas redescend à half avant de fermer', async () => {
  const screen = await render(<Host height="half" enableSnapping dragThreshold={40} />);

  glisser(grab(screen.container), 300, 100);
  await expect.poll(() => sheet(screen.container).className).toContain('_full');

  glisser(grab(screen.container), 100, 300);
  await expect.poll(() => sheet(screen.container).className).toContain('_half');
  expect(sheet(screen.container).open).toBe(true);

  glisser(grab(screen.container), 100, 300);
  await expect.poll(() => sheet(screen.container).open).toBe(false);
});

test('les flèches font au clavier ce que le glissement fait au doigt', async () => {
  const screen = await render(<Host height="half" enableSnapping />);
  const bouton = handle(screen.container);

  bouton.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  await expect.poll(() => sheet(screen.container).className).toContain('_full');

  bouton.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  await expect.poll(() => sheet(screen.container).className).toContain('_half');
});

// Le palier ne vaut que pour un panneau `half` : un `auto` ou un `full` n'a
// nulle part où grandir.
test('le mode palier ne s’applique qu’à un panneau half', async () => {
  const screen = await render(<Host height="auto" enableSnapping />);

  expect(handle(screen.container).tagName).toBe('DIV');
});

test('rouvrir repart du palier de départ', async () => {
  function Host2() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setOpen((v) => !v)}>
          Basculer
        </button>
        <UiBottomSheet
          visible={open}
          onVisibleChange={setOpen}
          header="Titres"
          height="half"
          enableSnapping
          dragThreshold={40}
        >
          Contenu
        </UiBottomSheet>
      </>
    );
  }
  const screen = await render(<Host2 />);

  glisser(grab(screen.container), 300, 100);
  await expect.poll(() => sheet(screen.container).className).toContain('_full');

  // Le bouton vit HORS du panneau, donc il est inerte tant que celui-ci est
  // modal : on referme par Échap, ce qui est de toute façon l'usage.
  sheet(screen.container).dispatchEvent(new Event('cancel', { cancelable: true }));
  await expect.poll(() => sheet(screen.container).open).toBe(false);

  await screen.getByRole('button', { name: 'Basculer' }).click();

  await expect.poll(() => sheet(screen.container).open).toBe(true);
  expect(sheet(screen.container).className).toContain('_half');
});

// --- Zones et focus --------------------------------------------------------
test('le pied n’est rendu que s’il a du contenu', async () => {
  const sans = await render(<Host />);
  const avec = await render(<Host footer={<button type="button">Valider</button>} />);

  expect(sans.container.querySelector('.ui-bottom-sheet-footer')).toBeNull();
  expect(avec.container.querySelector('.ui-bottom-sheet-footer')).not.toBeNull();
});

// Le corps défile seul : l'en-tête et le pied ne bougent pas.
test('le corps défile, pas le panneau', async () => {
  const screen = await render(<Host height="120px" />);
  const corps = screen.container.querySelector<HTMLElement>('.ui-bottom-sheet-content')!;

  expect(getComputedStyle(corps).overflowY).toBe('auto');
  expect(getComputedStyle(corps).overscrollBehaviorY).toBe('contain');
  expect(getComputedStyle(sheet(screen.container)).overflow).toBe('hidden');
});

test('autoFocusElement dirige le focus à l’ouverture', async () => {
  await render(
    <Host autoFocusElement="#champ-panneau">
      <input id="champ-panneau" aria-label="Recherche" />
    </Host>,
  );

  await expect.poll(() => (document.activeElement as HTMLElement | null)?.id).toBe('champ-panneau');
});

test('motionDisabled coupe la durée d’animation', async () => {
  const screen = await render(<Host motionDisabled />);

  expect(sheet(screen.container).style.getPropertyValue('--ui-motion-duration')).toBe('0ms');
});

test('safeArea réserve l’incrustation système', async () => {
  const avec = await render(<Host />);
  const sans = await render(<Host safeArea={false} />);

  expect(sheet(avec.container)).toHaveClass('_safe-area');
  expect(sheet(sans.container)).not.toHaveClass('_safe-area');
});
