import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiSpeedDial, type UiSpeedDialItem, type UiSpeedDialProps } from './ui-speed-dial';

const ITEMS: UiSpeedDialItem[] = [
  { label: 'Modifier', icon: 'pen' },
  { label: 'Dupliquer', icon: 'copy' },
  { label: 'Supprimer', icon: 'trash' },
];

/**
 * Les actions se déploient vers le HAUT par défaut : sans cette marge, elles
 * sortent de la fenêtre et Playwright refuse de cliquer ce qu'il ne voit pas.
 */
function Host(props: Partial<UiSpeedDialProps>) {
  return (
    <div style={{ paddingTop: 220 }}>
      <UiSpeedDial items={ITEMS} aria-label="Actions" {...props} />
    </div>
  );
}

const trigger = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('.ui-speed-dial-trigger')!;
const list = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.ui-speed-dial-list');
const actions = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-speed-dial-item'),
];

const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

// --- Déclencheur -----------------------------------------------------------
test('le déclencheur annonce le déploiement', async () => {
  const screen = await render(<Host />);
  const bouton = trigger(screen.container);

  expect(bouton).toHaveAttribute('aria-haspopup', 'true');
  expect(bouton).toHaveAttribute('aria-expanded', 'false');
  expect(bouton).toHaveAttribute('aria-label', 'Actions');
  expect(bouton).not.toHaveAttribute('aria-controls');
});

// Fermé, rien n'est rendu : ni lu par un lecteur d'écran, ni atteignable au
// clavier, donc aucun `aria-hidden` ni `inert` à tenir à jour.
test('fermé, aucune action n’est rendue', async () => {
  const screen = await render(<Host />);

  expect(list(screen.container)).toBeNull();
  expect(actions(screen.container)).toHaveLength(0);
});

test('le clic sur le déclencheur déploie, puis referme', async () => {
  const onOpenChange = vi.fn();
  const onTriggerClick = vi.fn();
  const screen = await render(<Host onOpenChange={onOpenChange} onTriggerClick={onTriggerClick} />);

  await screen.getByRole('button', { name: 'Actions' }).click();

  await expect.poll(() => actions(screen.container)).toHaveLength(3);
  expect(trigger(screen.container)).toHaveAttribute('aria-expanded', 'true');
  expect(trigger(screen.container).getAttribute('aria-controls')).toBe(list(screen.container)!.id);
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  expect(onTriggerClick).toHaveBeenCalledOnce();

  await screen.getByRole('button', { name: 'Actions' }).click();
  await expect.poll(() => onOpenChange.mock.lastCall?.[0]).toBe(false);
});

test('désactivé, le déclencheur ne déploie rien', async () => {
  const onOpenChange = vi.fn();
  const screen = await render(<Host disabled onOpenChange={onOpenChange} />);

  expect(trigger(screen.container)).toBeDisabled();
  await new Promise((r) => setTimeout(r, 30));
  expect(onOpenChange).not.toHaveBeenCalled();
});

// Sans `hideIcon`, l'icône PIVOTE au lieu d'être échangée : c'est ce qui rend
// le passage de la croix au plus continu.
test('l’icône du déclencheur pivote, ou se remplace', async () => {
  const pivot = await render(<Host defaultOpen />);
  expect(trigger(pivot.container)).toHaveClass('_rotate');
  expect(getComputedStyle(pivot.container.querySelector('.ui-button-icon')!).rotate).toBe('45deg');

  const remplace = await render(<Host defaultOpen hideIcon="xmark" />);
  expect(trigger(remplace.container)).not.toHaveClass('_rotate');
  expect(remplace.container.querySelector('.ui-speed-dial-trigger .ui-icon')).toHaveClass(
    'fa-xmark',
  );
});

test('rotateAnimation=false laisse l’icône en place', async () => {
  const screen = await render(<Host defaultOpen rotateAnimation={false} />);

  expect(trigger(screen.container)).not.toHaveClass('_rotate');
});

// --- Actions ---------------------------------------------------------------
test('les actions forment un menu, chacune un item nommé', async () => {
  const screen = await render(<Host defaultOpen />);

  expect(list(screen.container)).toHaveAttribute('role', 'menu');
  expect(list(screen.container)).toHaveAttribute('aria-label', 'Actions');
  const noms = actions(screen.container).map((a) => a.getAttribute('aria-label'));
  expect(noms).toEqual(['Modifier', 'Dupliquer', 'Supprimer']);
  for (const action of actions(screen.container)) {
    expect(action).toHaveAttribute('role', 'menuitem');
  }
});

test('activer une action appelle sa commande, puis referme', async () => {
  const command = vi.fn();
  const onItemClick = vi.fn();
  const screen = await render(
    <Host
      defaultOpen
      items={[{ label: 'Modifier', icon: 'pen', command }, ...ITEMS.slice(1)]}
      onItemClick={onItemClick}
    />,
  );

  await screen.getByRole('menuitem', { name: 'Modifier' }).click();

  await expect.poll(() => command.mock.calls.length).toBe(1);
  expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ item: expect.anything() }));
  await expect.poll(() => trigger(screen.container).getAttribute('aria-expanded')).toBe('false');
});

test('une action désactivée n’agit pas, et le clavier la saute', async () => {
  const command = vi.fn();
  const screen = await render(
    <Host
      defaultOpen
      items={[
        { label: 'Modifier', icon: 'pen' },
        { label: 'Dupliquer', icon: 'copy', disabled: true, command },
        { label: 'Supprimer', icon: 'trash' },
      ]}
    />,
  );
  const all = actions(screen.container);

  expect(all[1]).toBeDisabled();

  all[0]!.focus();
  touche(all[0]!, 'ArrowRight');

  await expect.poll(() => document.activeElement).toBe(all[2]);
  expect(command).not.toHaveBeenCalled();
});

test('une action avec url rend une ancre', async () => {
  const screen = await render(
    <Host defaultOpen items={[{ label: 'Aide', icon: 'circle-question', url: '#aide' }]} />,
  );

  expect(actions(screen.container)[0]!.tagName).toBe('A');
  expect(actions(screen.container)[0]).toHaveAttribute('href', '#aide');
});

test('render branche le lien du projet', async () => {
  const screen = await render(
    <Host
      defaultOpen
      items={[
        {
          label: 'Fiche',
          icon: 'file',
          render: (props, children) => (
            <a {...props} href="#fiche" data-route="/fiche">
              {children}
            </a>
          ),
        },
      ]}
    />,
  );

  expect(screen.container.querySelector('[data-route]')).toHaveClass('ui-speed-dial-item');
});

// --- Clavier ---------------------------------------------------------------
// Les actions comptent pour UN arrêt de tabulation : `Tab` traverse le lot, les
// flèches circulent dedans.
test('un seul arrêt de tabulation parmi les actions', async () => {
  const screen = await render(<Host defaultOpen />);

  expect(actions(screen.container).map((a) => a.tabIndex)).toEqual([0, -1, -1]);
});

test('les flèches bouclent d’une action à l’autre', async () => {
  const screen = await render(<Host defaultOpen />);
  const all = actions(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(all[1]);

  touche(all[1]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[0]);

  // Une couronne d'actions boucle, contrairement à une grille.
  touche(all[0]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[2]);
});

test('Début et Fin vont à la première et à la dernière action', async () => {
  const screen = await render(<Host defaultOpen />);
  const all = actions(screen.container);

  all[1]!.focus();
  touche(all[1]!, 'End');
  await expect.poll(() => document.activeElement).toBe(all[2]);

  touche(all[2]!, 'Home');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

// Une flèche sur le déclencheur fermé déploie ET entre dans les actions : c'est
// le motif menu de l'APG.
test('une flèche sur le déclencheur déploie et entre dans les actions', async () => {
  const screen = await render(<Host />);

  trigger(screen.container).focus();
  touche(trigger(screen.container), 'ArrowUp');

  await expect.poll(() => actions(screen.container)).toHaveLength(3);
  await expect
    .poll(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label'))
    .toBe('Modifier');
});

test('Échap referme et rend le focus au déclencheur', async () => {
  const screen = await render(<Host defaultOpen />);
  const premiere = actions(screen.container)[0]!;

  premiere.focus();
  touche(premiere, 'Escape');

  await expect.poll(() => trigger(screen.container).getAttribute('aria-expanded')).toBe('false');
  await expect.poll(() => document.activeElement).toBe(trigger(screen.container));
});

// --- Masque et clic extérieur ----------------------------------------------
test('le masque assombrit la page et referme au clic', async () => {
  const screen = await render(<Host defaultOpen mask />);
  const masque = screen.container.querySelector<HTMLElement>('.ui-speed-dial-mask')!;

  expect(masque).toHaveAttribute('aria-hidden', 'true');
  expect(getComputedStyle(masque).position).toBe('fixed');
  expect(getComputedStyle(masque).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

  masque.click();

  await expect.poll(() => trigger(screen.container).getAttribute('aria-expanded')).toBe('false');
});

test('un clic en dehors referme, et hideOnClickOutside le désactive', async () => {
  const screen = await render(
    <>
      <Host defaultOpen />
      <button type="button">Ailleurs</button>
    </>,
  );

  await screen.getByRole('button', { name: 'Ailleurs' }).click();
  await expect.poll(() => trigger(screen.container).getAttribute('aria-expanded')).toBe('false');

  const colle = await render(
    <>
      <Host defaultOpen hideOnClickOutside={false} />
      <button type="button">Ailleurs aussi</button>
    </>,
  );
  await colle.getByRole('button', { name: 'Ailleurs aussi' }).click();
  await new Promise((r) => setTimeout(r, 50));
  expect(trigger(colle.container)).toHaveAttribute('aria-expanded', 'true');
});

// --- Dispositions ----------------------------------------------------------
test('la disposition et la direction posent leurs modifieurs', async () => {
  const empile = await render(<Host defaultOpen type="linear" direction="right" />);
  const anneau = await render(<Host defaultOpen type="circle" />);

  expect(empile.container.querySelector('.ui-speed-dial')).toHaveClass('_linear', '_right');
  expect(anneau.container.querySelector('.ui-speed-dial')).toHaveClass('_circle');
  // La direction n'a pas de sens sur un anneau entier.
  expect(anneau.container.querySelector('.ui-speed-dial')).not.toHaveClass('_up');
});

// Sur un arc, chaque action porte sa place angulaire en `transform` : la
// première est en haut, la suivante décalée d'un pas.
test('sur un arc, chaque action porte sa place angulaire', async () => {
  const screen = await render(<Host defaultOpen type="circle" />);
  const all = actions(screen.container);

  for (const action of all) expect(action.style.transform).toContain('var(--_radius)');
  // Le tout premier slot est plein nord : sin(0) = 0, -cos(0) = -1.
  expect(all[0]!.style.transform).toContain('calc(0 * var(--_radius))');
  expect(all[0]!.style.transform).toContain('calc(-1 * var(--_radius))');
  expect(all[1]!.style.transform).not.toBe(all[0]!.style.transform);
});

test('empilées, les actions n’ont aucune transformation', async () => {
  const screen = await render(<Host defaultOpen type="linear" />);

  for (const action of actions(screen.container)) expect(action.style.transform).toBe('');
});

test('radius pose le rayon sur la racine', async () => {
  const screen = await render(<Host defaultOpen type="circle" radius={120} />);

  expect(
    screen.container
      .querySelector<HTMLElement>('.ui-speed-dial')!
      .style.getPropertyValue('--_radius'),
  ).toBe('120px');
});

// La boîte de la liste recouvre le déclencheur sur un arc : sans retrait du
// pointeur, elle avalerait ses clics.
test('la liste ne prend pas les clics du déclencheur', async () => {
  const screen = await render(<Host defaultOpen type="circle" />);

  expect(getComputedStyle(list(screen.container)!).pointerEvents).toBe('none');
  expect(getComputedStyle(actions(screen.container)[0]!).pointerEvents).toBe('auto');
});

// --- Mouvement -------------------------------------------------------------
test('les actions entrent avec le préréglage de leur disposition', async () => {
  const empile = await render(<Host defaultOpen type="linear" direction="up" />);
  const anneau = await render(<Host defaultOpen type="circle" />);

  expect(actions(empile.container)[0]!.className).toContain('ui-motion-slide-up-enter');
  // Sur un arc, seul un fondu peut cohabiter avec la `transform` de position.
  expect(actions(anneau.container)[0]!.className).toContain('ui-motion-fade-enter');
});

test('l’entrée des actions est décalée selon leur rang', async () => {
  const screen = await render(<Host defaultOpen />);
  const all = actions(screen.container);

  expect(all.map((a) => a.style.getPropertyValue('--_stagger-index'))).toEqual(['0', '1', '2']);
  expect(getComputedStyle(all[0]!).getPropertyValue('--ui-motion-delay').trim()).not.toBe(
    getComputedStyle(all[2]!).getPropertyValue('--ui-motion-delay').trim(),
  );
});

// Toute la raison d'être du crochet : sans lui, la liste quitterait le DOM à
// l'instant de la fermeture et il n'y aurait plus rien à animer.
test('la liste reste rendue le temps de sa sortie', async () => {
  const screen = await render(<Host defaultOpen />);

  await screen.getByRole('button', { name: 'Actions' }).click();

  await expect.poll(() => list(screen.container)?.className).toContain('ui-motion-fade-leave');
  await expect.poll(() => list(screen.container)).toBeNull();
});

test('motion=false retire les classes de mouvement', async () => {
  const screen = await render(<Host defaultOpen motion={false} />);

  expect(list(screen.container)!.className).toBe('ui-speed-dial-list');
  expect(actions(screen.container)[0]!.className).not.toContain('ui-motion');
});

// --- Contrôlé --------------------------------------------------------------
test('en mode contrôlé, l’ouverture appartient à l’appelant', async () => {
  function Controlled() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Ouvrir
        </button>
        <Host open={open} />
      </>
    );
  }
  const screen = await render(<Controlled />);

  await screen.getByRole('button', { name: 'Actions' }).click();
  await new Promise((r) => setTimeout(r, 50));
  expect(actions(screen.container)).toHaveLength(0);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => actions(screen.container)).toHaveLength(3);
});

test('showTooltips donne son libellé en bulle à chaque action', async () => {
  const screen = await render(<Host defaultOpen showTooltips />);

  expect(screen.container.querySelectorAll('.ui-tooltip')).toHaveLength(3);
});
