import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiDrawer } from './ui-drawer';

const tiroir = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('dialog') as HTMLDialogElement;

/** Un consommateur ordinaire : c'est lui qui possède l'état d'ouverture. */
function CycleDemo({ onHide, ...props }: Partial<React.ComponentProps<typeof UiDrawer>> = {}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <UiDrawer
        visible={open}
        onVisibleChange={setOpen}
        onHide={onHide}
        header="Filtres"
        contained
        {...props}
      >
        Corps
      </UiDrawer>
    </div>
  );
}

// La leçon de `ui-modal` : une propriété d'état ne dit rien de ce qui est à
// l'écran. Le `display: none` d'un dialogue fermé vient du style navigateur, que
// le `display: flex` du composant bat.
test('fermé, le tiroir n’occupe aucune place à l’écran', async () => {
  const screen = await render(<UiDrawer header="Filtres">Corps</UiDrawer>);
  const dialog = tiroir(screen);

  expect(dialog.open).toBe(false);
  expect(getComputedStyle(dialog).display).toBe('none');
  expect(dialog.getBoundingClientRect().width).toBe(0);
});

test('visible ouvre réellement une couche modale', async () => {
  const screen = await render(
    <UiDrawer visible header="Filtres">
      Corps
    </UiDrawer>,
  );

  await expect.poll(() => tiroir(screen).open).toBe(true);
  expect(tiroir(screen).matches(':modal')).toBe(true);
  expect(getComputedStyle(tiroir(screen)).display).toBe('flex');
});

// Le cycle vu de l'écran, qui est le test qui manquait sur `ui-modal`.
test('le tiroir s’ouvre, se ferme, puis se rouvre', async () => {
  const screen = await render(<CycleDemo />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => tiroir(screen).getBoundingClientRect().width).toBeGreaterThan(0);

  await screen.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => tiroir(screen).getBoundingClientRect().width).toBe(0);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => tiroir(screen).getBoundingClientRect().width).toBeGreaterThan(0);
});

test('onHide part quand le tiroir se ferme vraiment', async () => {
  const onHide = vi.fn();
  const screen = await render(<CycleDemo onHide={onHide} />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => tiroir(screen).open).toBe(true);

  await screen.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => tiroir(screen).open).toBe(false);

  expect(onHide).toHaveBeenCalledTimes(1);
});

test('le titre nomme le tiroir', async () => {
  const screen = await render(
    <UiDrawer visible header="Filtres de recherche">
      Corps
    </UiDrawer>,
  );

  await expect
    .element(screen.getByRole('dialog', { name: 'Filtres de recherche' }))
    .toBeInTheDocument();
});

test('sans en-tête, aria-label prend le relais', async () => {
  const screen = await render(
    <UiDrawer visible showHeader={false} aria-label="Panneau latéral">
      Corps
    </UiDrawer>,
  );

  await expect.element(screen.getByRole('dialog', { name: 'Panneau latéral' })).toBeInTheDocument();
});

// Trois insets à zéro et le quatrième à `auto` : c'est ce qui colle le tiroir
// au bord, et il faut le vérifier bord par bord.
//
// Mesuré en `offset*` et non en `getBoundingClientRect()` : le second inclut le
// `translate` de l'animation d'entrée, donc il rend une position en cours de
// route. Les `offset*` décrivent la BOÎTE DE MISE EN PAGE, qui est ce que les
// insets règlent, et ne bougent pas pendant le glissement.
test('chaque bord colle le tiroir du bon côté', async () => {
  const screen = await render(
    <div style={{ position: 'relative', width: 300, height: 200 }}>
      <UiDrawer visible contained position="right" header="Droite">
        Corps
      </UiDrawer>
    </div>,
  );
  const cadre = screen.container.firstElementChild as HTMLElement;
  const panneau = tiroir(screen);

  await expect.poll(() => panneau.offsetWidth).toBeGreaterThan(0);

  expect(panneau.offsetLeft + panneau.offsetWidth).toBe(cadre.clientWidth);
  expect(panneau.offsetHeight).toBe(cadre.clientHeight);
});

test('en bas, le tiroir prend la largeur et non la hauteur', async () => {
  const screen = await render(
    <div style={{ position: 'relative', width: 300, height: 200 }}>
      <UiDrawer visible contained position="bottom" header="Bas">
        Corps
      </UiDrawer>
    </div>,
  );
  const cadre = screen.container.firstElementChild as HTMLElement;
  const panneau = tiroir(screen);

  await expect.poll(() => panneau.offsetWidth).toBeGreaterThan(0);

  expect(panneau.offsetWidth).toBe(cadre.clientWidth);
  expect(panneau.offsetTop + panneau.offsetHeight).toBe(cadre.clientHeight);
  expect(panneau.offsetHeight).toBeLessThan(cadre.clientHeight);
});

test('fullScreen occupe tout le cadre', async () => {
  const screen = await render(
    <div style={{ position: 'relative', width: 300, height: 200 }}>
      <UiDrawer visible contained fullScreen header="Plein">
        Corps
      </UiDrawer>
    </div>,
  );
  const cadre = screen.container.firstElementChild as HTMLElement;
  const panneau = tiroir(screen);

  await expect.poll(() => panneau.offsetWidth).toBe(cadre.clientWidth);
  expect(panneau.offsetHeight).toBe(cadre.clientHeight);
});

test('closable=false retire le bouton de fermeture', async () => {
  const screen = await render(
    <UiDrawer visible header="Filtres" closable={false}>
      Corps
    </UiDrawer>,
  );

  expect(screen.container.querySelector('[aria-label="Fermer"]')).toBeNull();
});

test('closeOnEscape=false retient la fermeture par Échap', async () => {
  const onVisibleChange = vi.fn();
  const screen = await render(
    <UiDrawer visible header="Filtres" closeOnEscape={false} onVisibleChange={onVisibleChange}>
      Corps
    </UiDrawer>,
  );
  await expect.poll(() => tiroir(screen).open).toBe(true);

  const event = new Event('cancel', { cancelable: true });
  tiroir(screen).dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(onVisibleChange).not.toHaveBeenCalled();
});

test('le pied n’est rendu que s’il a du contenu', async () => {
  const screen = await render(
    <UiDrawer visible header="Filtres">
      Corps
    </UiDrawer>,
  );

  expect(screen.container.querySelector('.ui-drawer-footer')).toBeNull();
  expect(screen.container.querySelector('.ui-drawer-content')!.textContent).toBe('Corps');
});

test('le clic sur l’arrière-plan ferme quand c’est demandé', async () => {
  const onVisibleChange = vi.fn();
  const screen = await render(
    <UiDrawer visible header="Filtres" dismissableMask onVisibleChange={onVisibleChange}>
      Corps
    </UiDrawer>,
  );
  await expect.poll(() => tiroir(screen).open).toBe(true);

  tiroir(screen).dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(onVisibleChange).toHaveBeenCalledWith(false);
});

// Un tiroir cantonné n'a pas d'arrière-plan : son cadre est un ancêtre
// positionné, pas un masque.
test('cantonné, le clic sur le cadre ne ferme pas', async () => {
  const onVisibleChange = vi.fn();
  const screen = await render(
    <UiDrawer visible contained header="Filtres" dismissableMask onVisibleChange={onVisibleChange}>
      Corps
    </UiDrawer>,
  );
  await expect.poll(() => tiroir(screen).open).toBe(true);

  tiroir(screen).dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(onVisibleChange).not.toHaveBeenCalled();
});

// --- Entrée et sortie ------------------------------------------------------
test('la transition couvre display et overlay, sinon la sortie n’existe pas', async () => {
  const screen = await render(
    <UiDrawer visible contained header="Filtres">
      Corps
    </UiDrawer>,
  );
  const cs = getComputedStyle(tiroir(screen));

  expect(cs.transitionProperty).toContain('display');
  expect(cs.transitionProperty).toContain('overlay');
  expect(cs.transitionBehavior).toBe('allow-discrete');
  expect(parseFloat(cs.transitionDuration)).toBeGreaterThan(0);
});

// Un tiroir glisse depuis SON bord : la variable qui porte le décalage doit
// changer avec le bord, sinon les quatre bords entrent de la même façon.
test('le décalage de départ suit le bord', async () => {
  const screen = await render(
    <UiDrawer visible contained position="right" header="Droite">
      Corps
    </UiDrawer>,
  );

  expect(getComputedStyle(tiroir(screen)).getPropertyValue('--_motion-slide').trim()).toBe(
    '100% 0',
  );
});

test('motionDisabled met la durée à zéro pour ce tiroir seulement', async () => {
  const screen = await render(
    <UiDrawer visible contained header="Filtres" motionDisabled>
      Corps
    </UiDrawer>,
  );

  expect(parseFloat(getComputedStyle(tiroir(screen)).transitionDuration)).toBe(0);
});
