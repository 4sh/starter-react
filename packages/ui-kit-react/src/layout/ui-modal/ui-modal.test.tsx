import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiModal } from './ui-modal';

/** Un consommateur ordinaire : c'est lui qui possède l'état d'ouverture. */
function CycleDemo({ onHide }: { onHide?: () => void } = {}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <UiModal visible={open} onVisibleChange={setOpen} onHide={onHide} header="Titre" contained motionDisabled>
        Corps
      </UiModal>
    </div>
  );
}

const dialogue = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('dialog') as HTMLDialogElement;

// Un <dialog> s'ouvre par une MÉTHODE : `open` posé en JSX rendrait le dialogue
// sans calque supérieur, sans arrière-plan et sans piège de focus.
test('visible ouvre réellement une couche modale', async () => {
  const screen = await render(
    <UiModal visible header="Titre">
      Corps
    </UiModal>,
  );

  await expect.poll(() => dialogue(screen).open).toBe(true);
  expect(dialogue(screen).matches(':modal')).toBe(true);
});

test('modal=false ouvre un dialogue sans calque supérieur', async () => {
  const screen = await render(
    <UiModal visible modal={false} header="Titre">
      Corps
    </UiModal>,
  );

  await expect.poll(() => dialogue(screen).open).toBe(true);
  expect(dialogue(screen).matches(':modal')).toBe(false);
});

// Vérifier `open` NE SUFFIT PAS, et c'est le bug qui l'a montré : la propriété
// était juste, et le dialogue restait affiché quand même. Le style navigateur
// `dialog:not([open]) { display: none }` est de niveau UA, donc un `display`
// d'auteur le bat. Ce test mesure ce que l'utilisateur voit.
test('fermé, le dialogue n’occupe aucune place à l’écran', async () => {
  const screen = await render(<UiModal header="Titre">Corps</UiModal>);
  const dialog = dialogue(screen);

  expect(dialog.open).toBe(false);
  expect(getComputedStyle(dialog).display).toBe('none');
  expect(dialog.getBoundingClientRect().width).toBe(0);
});

test('ouvert, le dialogue occupe une place à l’écran', async () => {
  const screen = await render(
    <UiModal visible contained header="Titre">
      Corps
    </UiModal>,
  );

  await expect.poll(() => dialogue(screen).getBoundingClientRect().width).toBeGreaterThan(0);
  expect(getComputedStyle(dialogue(screen)).display).toBe('flex');
});

// Le cycle vu de l'ÉCRAN, et non de la propriété : c'est la lecture qui
// manquait.
test('le dialogue disparaît de l’écran quand on le ferme', async () => {
  const screen = await render(<CycleDemo />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => dialogue(screen).getBoundingClientRect().width).toBeGreaterThan(0);

  await screen.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => dialogue(screen).getBoundingClientRect().width).toBe(0);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => dialogue(screen).getBoundingClientRect().width).toBeGreaterThan(0);
});

test('le titre nomme le dialogue', async () => {
  const screen = await render(
    <UiModal visible header="Confirmer la suppression">
      Corps
    </UiModal>,
  );

  await expect
    .element(screen.getByRole('dialog', { name: 'Confirmer la suppression' }))
    .toBeInTheDocument();
});

test('sans en-tête, aria-label prend le relais', async () => {
  const screen = await render(
    <UiModal visible showHeader={false} aria-label="Message">
      Corps
    </UiModal>,
  );

  await expect.element(screen.getByRole('dialog', { name: 'Message' })).toBeInTheDocument();
});

// Contrat contrôlé : le bouton DEMANDE la fermeture, le parent décide. Un
// parent qui ne bouge pas garde donc le dialogue ouvert, et c'est voulu. Le
// cycle réel est couvert par « le dialogue se ferme puis se rouvre ».
test('le bouton de fermeture demande la fermeture au parent', async () => {
  const onVisibleChange = vi.fn();
  const onHide = vi.fn();
  const screen = await render(
    <UiModal visible header="Titre" onVisibleChange={onVisibleChange} onHide={onHide}>
      Corps
    </UiModal>,
  );

  await screen.getByRole('button', { name: 'Fermer' }).click();

  expect(onVisibleChange).toHaveBeenCalledWith(false);
  expect(dialogue(screen).open).toBe(true);
  expect(onHide).not.toHaveBeenCalled();
});

test('onHide part quand le dialogue se ferme vraiment', async () => {
  const onHide = vi.fn();
  const screen = await render(<CycleDemo onHide={onHide} />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => dialogue(screen).open).toBe(true);

  await screen.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => dialogue(screen).open).toBe(false);

  expect(onHide).toHaveBeenCalledTimes(1);
});

test('closable=false retire le bouton de fermeture', async () => {
  const screen = await render(
    <UiModal visible header="Titre" closable={false}>
      Corps
    </UiModal>,
  );

  expect(screen.container.querySelector('[aria-label="Fermer"]')).toBeNull();
});

// Échap arrive par `cancel`. Le composant l'annule TOUJOURS et passe par
// l'état : une seule voie de fermeture, donc un seul endroit où l'état se met à
// jour. C'est aussi ce qui permet de retenir un dialogue non fermable.
test('closeOnEscape=false retient la fermeture par Échap', async () => {
  const onVisibleChange = vi.fn();
  const screen = await render(
    <UiModal visible header="Titre" closeOnEscape={false} onVisibleChange={onVisibleChange}>
      Corps
    </UiModal>,
  );
  await expect.poll(() => dialogue(screen).open).toBe(true);

  const event = new Event('cancel', { cancelable: true });
  dialogue(screen).dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(onVisibleChange).not.toHaveBeenCalled();
  expect(dialogue(screen).open).toBe(true);
});

test('Échap ferme par l’état, pas par le navigateur', async () => {
  const onVisibleChange = vi.fn();
  const screen = await render(
    <UiModal visible header="Titre" onVisibleChange={onVisibleChange}>
      Corps
    </UiModal>,
  );
  await expect.poll(() => dialogue(screen).open).toBe(true);

  const event = new Event('cancel', { cancelable: true });
  dialogue(screen).dispatchEvent(event);

  // Annulé côté navigateur, et redemandé par l'état : c'est ce qui garantit
  // qu'`onHide` part une seule fois et que l'état ne se désaligne pas.
  expect(event.defaultPrevented).toBe(true);
  expect(onVisibleChange).toHaveBeenCalledWith(false);
});

// Le cycle complet, qui est ce qui cassait : fermer puis rouvrir. Avec une
// fermeture pilotée par l'événement `close`, mis en file, l'état restait à
// `true` et le second `setOpen(true)` ne changeait rien.
test('le dialogue se ferme puis se rouvre', async () => {
  const screen = await render(<CycleDemo />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => dialogue(screen).open).toBe(true);

  await screen.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => dialogue(screen).open).toBe(false);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => dialogue(screen).open).toBe(true);
});

test('l’en-tête accueille un pied et un corps distincts', async () => {
  const screen = await render(
    <UiModal visible header="Titre" footer={<button type="button">Valider</button>}>
      Corps
    </UiModal>,
  );

  expect(screen.container.querySelector('.ui-modal-title')!.textContent).toBe('Titre');
  expect(screen.container.querySelector('.ui-modal-content')!.textContent).toBe('Corps');
  expect(screen.container.querySelector('.ui-modal-footer')!.textContent).toBe('Valider');
});

test('sans pied, aucun conteneur vide n’est rendu', async () => {
  const screen = await render(
    <UiModal visible header="Titre">
      Corps
    </UiModal>,
  );

  expect(screen.container.querySelector('.ui-modal-footer')).toBeNull();
});

test('la position compose sa classe', async () => {
  const screen = await render(
    <UiModal visible header="Titre" position="topright">
      Corps
    </UiModal>,
  );

  expect(dialogue(screen)).toHaveClass('_pos-topright');
});

test('agrandir bascule l’état et prévient', async () => {
  const onMaximizedChange = vi.fn();
  const screen = await render(
    <UiModal visible header="Titre" maximizable onMaximizedChange={onMaximizedChange}>
      Corps
    </UiModal>,
  );

  await screen.getByRole('button', { name: 'Agrandir' }).click();

  await expect.poll(() => dialogue(screen).classList.contains('_maximized')).toBe(true);
  expect(onMaximizedChange).toHaveBeenCalledWith(true);
});

test('la poignée de redimensionnement n’apparaît que si demandée', async () => {
  const screen = await render(
    <UiModal visible header="Titre" resizable>
      Corps
    </UiModal>,
  );

  expect(screen.container.querySelector('.ui-modal-resize-handle')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
});

// Un corps court ne doit pas ajouter d'arrêt de tabulation à tous les dialogues.
test('un corps qui ne déborde pas n’est pas focalisable', async () => {
  const screen = await render(
    <UiModal visible header="Titre">
      Court
    </UiModal>,
  );

  await expect
    .poll(() => screen.container.querySelector('.ui-modal-content')!.hasAttribute('tabindex'))
    .toBe(false);
});

test('un corps qui déborde sans rien de focalisable devient atteignable', async () => {
  const screen = await render(
    <UiModal visible header="Titre" style={{ height: 160 }}>
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>Paragraphe {i + 1} d’un contenu volontairement long.</p>
      ))}
    </UiModal>,
  );

  await expect
    .poll(() => screen.container.querySelector('.ui-modal-content')!.getAttribute('tabindex'))
    .toBe('0');
});

test('un corps qui déborde mais contient un bouton n’ajoute pas d’arrêt', async () => {
  const screen = await render(
    <UiModal visible header="Titre" style={{ height: 160 }}>
      <button type="button">Déjà atteignable</button>
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>Paragraphe {i + 1} d’un contenu volontairement long.</p>
      ))}
    </UiModal>,
  );

  await expect
    .poll(() => screen.container.querySelector('.ui-modal-content')!.hasAttribute('tabindex'))
    .toBe(false);
});

test('les largeurs par point de rupture posent une feuille de style', async () => {
  await render(
    <UiModal visible header="Titre" breakpoints={{ '960px': '75vw' }}>
      Corps
    </UiModal>,
  );

  await expect
    .poll(() =>
      [...document.head.querySelectorAll('style')].some((s) => s.textContent?.includes('75vw')),
    )
    .toBe(true);
});

// --- Entrée et sortie ------------------------------------------------------
// L'animation elle-même ne s'observe pas de façon fiable dans cet
// environnement (onglet en arrière-plan : les transitions ne progressent pas).
// On vérifie donc le CONTRAT CSS, qui est ce qui peut casser en silence : que
// `display` et `overlay` sont dans la transition, sans quoi la sortie n'a pas
// lieu du tout, l'élément disparaissant d'un coup.
test('la transition couvre display et overlay, sinon la sortie n’existe pas', async () => {
  const screen = await render(
    <UiModal visible contained header="Titre">
      Corps
    </UiModal>,
  );
  const cs = getComputedStyle(dialogue(screen));

  expect(cs.transitionProperty).toContain('display');
  expect(cs.transitionProperty).toContain('overlay');
  expect(cs.transitionProperty).toContain('opacity');
  expect(cs.transitionBehavior).toBe('allow-discrete');
  expect(parseFloat(cs.transitionDuration)).toBeGreaterThan(0);
});

test('le préréglage compose sa classe', async () => {
  const screen = await render(
    <UiModal visible contained header="Titre" motion="slide-up">
      Corps
    </UiModal>,
  );

  expect(dialogue(screen)).toHaveClass('_motion-slide-up');
  expect(dialogue(screen)).not.toHaveClass('_motion-zoom');
});

// Couper le mouvement passe par la DURÉE : la même variable sert au dialogue,
// à son arrière-plan et à tout ce qui s'y branche.
test('motionDisabled met la durée à zéro pour ce dialogue seulement', async () => {
  const screen = await render(
    <UiModal visible contained header="Titre" motionDisabled>
      Corps
    </UiModal>,
  );
  const dialog = dialogue(screen);

  expect(dialog.style.getPropertyValue('--ui-motion-duration')).toBe('0ms');
  expect(parseFloat(getComputedStyle(dialog).transitionDuration)).toBe(0);
});
