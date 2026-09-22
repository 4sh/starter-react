import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiToast } from './ui-toast';
import { UiToastContainer } from './ui-toast-container';
import { uiToast } from './ui-toast-store';

// Le magasin est un singleton de module : sans ce nettoyage, un test hériterait
// des messages du précédent.
afterEach(() => uiToast.clear());

// Le pointeur de Playwright reste où le test précédent l'a laissé, et une carte
// qui paraît dessous se croit survolée : son compte à rebours ne démarre alors
// jamais. C'est le bon comportement, mais il rend toute mesure de durée fausse
// si on ne gare pas le pointeur d'abord. Coin bas gauche, où aucune pile de ces
// tests ne s'ancre.
beforeEach(async () => {
  const parking = document.createElement('div');
  parking.style.cssText = 'position:fixed; left:0; bottom:0; width:8px; height:8px;';
  document.body.append(parking);
  await page.elementLocator(parking).hover();
  parking.remove();
});

const cards = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.ui-toast')];
const region = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.ui-toast-region')!;

// --- La carte --------------------------------------------------------------
test('la carte s’annonce, et son urgence suit le niveau', async () => {
  const screen = await render(
    <>
      <UiToast level="success" title="Ok" />
      <UiToast level="error" title="Raté" />
    </>,
  );
  const [calme, urgent] = cards(screen.container);

  expect(calme).toHaveAttribute('role', 'status');
  expect(calme).toHaveAttribute('aria-live', 'polite');
  expect(calme).toHaveAttribute('aria-atomic', 'true');
  expect(urgent).toHaveAttribute('role', 'alert');
  expect(urgent).toHaveAttribute('aria-live', 'assertive');
});

test('l’icône de tête se déduit du niveau, et se coupe', async () => {
  const screen = await render(<UiToast level="warning" title="Attention" />);
  expect(screen.container.querySelector('.ui-toast-icon .ui-icon')).toHaveClass('fa-warning');

  const sans = await render(<UiToast level="warning" title="Attention" icon={false} />);
  expect(sans.container.querySelector('.ui-toast-icon')).toBeNull();
});

test('la fermeture est un bouton nommé', async () => {
  const onClose = vi.fn();
  const screen = await render(<UiToast title="Titre" onClose={onClose} />);

  await screen.getByRole('button', { name: 'Fermer' }).click();

  expect(onClose).toHaveBeenCalledOnce();
});

// --- Le magasin ------------------------------------------------------------
test('le magasin rend un identifiant, et le retrait s’en sert', async () => {
  const screen = await render(<UiToastContainer contained />);

  const id = uiToast.add({ title: 'Un', sticky: true });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  uiToast.remove(id);
  await expect.poll(() => cards(screen.container)).toHaveLength(0);
});

// Le canal remplace le `key` d'Angular, que React réserve pour l'identité d'un
// élément : une prop nommée `key` n'atteindrait jamais le composant.
test('une pile ne prend que les messages de son canal', async () => {
  const screen = await render(
    <>
      <UiToastContainer contained />
      <UiToastContainer contained channel="lateral" data-testid="lateral" />
    </>,
  );

  uiToast.add({ title: 'Sans canal', sticky: true });
  uiToast.add({ channel: 'lateral', title: 'Latéral', sticky: true });

  await expect.poll(() => cards(screen.container)).toHaveLength(2);
  const lateral = screen.container.querySelector<HTMLElement>('[data-testid="lateral"]')!;
  expect(lateral.querySelectorAll('.ui-toast')).toHaveLength(1);
  expect(lateral.textContent).toContain('Latéral');
});

test('clear vide tout, ou seulement un canal', async () => {
  await render(
    <>
      <UiToastContainer contained />
      <UiToastContainer contained channel="lateral" />
    </>,
  );

  uiToast.addAll([{ title: 'Un' }, { channel: 'lateral', title: 'Deux' }]);
  expect(uiToast.getMessages()).toHaveLength(2);

  uiToast.clear('lateral');
  expect(uiToast.getMessages()).toHaveLength(1);

  uiToast.clear();
  expect(uiToast.getMessages()).toHaveLength(0);
});

// --- Disparition automatique ----------------------------------------------
test('un message non persistant disparaît au bout de son life', async () => {
  const screen = await render(<UiToastContainer contained life={200} />);

  uiToast.add({ title: 'Éphémère' });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  await expect.poll(() => cards(screen.container), { timeout: 2000 }).toHaveLength(0);
  expect(uiToast.getMessages()).toHaveLength(0);
});

test('le life du message gagne sur celui de la pile', async () => {
  const screen = await render(<UiToastContainer contained life={5000} />);

  uiToast.add({ title: 'Court', life: 150 });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  await expect.poll(() => cards(screen.container), { timeout: 2000 }).toHaveLength(0);
});

test('un message persistant ne part jamais seul', async () => {
  const screen = await render(<UiToastContainer contained life={100} />);

  uiToast.add({ title: 'Persistant', sticky: true });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  await new Promise((r) => setTimeout(r, 400));
  expect(cards(screen.container)).toHaveLength(1);
});

// WCAG « assez de temps » : la lecture ne doit pas courir contre le compte à
// rebours. Survol RÉEL, et non un événement fabriqué.
test('le survol suspend le compte à rebours, et le quitter le reprend', async () => {
  const screen = await render(<UiToastContainer contained life={300} />);

  uiToast.add({ title: 'Lisible' });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  await screen.getByRole('status').hover();
  await new Promise((r) => setTimeout(r, 600));
  expect(cards(screen.container)).toHaveLength(1);

  await screen.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => cards(screen.container)).toHaveLength(0);
});

test('le bouton de fermeture retire le message du magasin', async () => {
  const screen = await render(<UiToastContainer contained />);

  uiToast.add({ title: 'À fermer', sticky: true });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  await screen.getByRole('button', { name: 'Fermer' }).click();

  await expect.poll(() => uiToast.getMessages()).toHaveLength(0);
});

// --- Empilement ------------------------------------------------------------
test('stackVisibleLimit plafonne les cartes visibles', async () => {
  const screen = await render(<UiToastContainer contained stackVisibleLimit={2} />);

  uiToast.addAll([
    { title: 'Un', sticky: true },
    { title: 'Deux', sticky: true },
    { title: 'Trois', sticky: true },
  ]);

  await expect.poll(() => cards(screen.container)).toHaveLength(2);
  expect(screen.container.textContent).not.toContain('Un');
  expect(uiToast.getMessages()).toHaveLength(3);
});

// Le message en attente ne brûle pas son temps caché : il doit rester lisible
// quand il paraît enfin. La pile montre les N plus RÉCENTS, donc c'est le plus
// ancien qui patiente.
test('un message en attente ne démarre son compte à rebours qu’en paraissant', async () => {
  const screen = await render(<UiToastContainer contained stackVisibleLimit={1} life={250} />);

  uiToast.add({ title: 'Patient' });
  const devant = uiToast.add({ title: 'Devant', sticky: true });

  await expect.poll(() => screen.container.textContent).toContain('Devant');
  expect(screen.container.textContent).not.toContain('Patient');

  // Bien plus que son `life`, et pourtant il est toujours là.
  await new Promise((r) => setTimeout(r, 600));
  expect(uiToast.getMessages()).toHaveLength(2);

  uiToast.remove(devant);
  await expect.poll(() => screen.container.textContent).toContain('Patient');
  await expect.poll(() => uiToast.getMessages(), { timeout: 2000 }).toHaveLength(0);
});

test('preventDuplicates écarte le message qui répète un message vivant', async () => {
  const screen = await render(<UiToastContainer contained preventDuplicates />);

  uiToast.add({ title: 'Doublon', text: 'Pareil', sticky: true });
  uiToast.add({ title: 'Doublon', text: 'Pareil', sticky: true });
  uiToast.add({ title: 'Autre', text: 'Différent', sticky: true });

  await expect.poll(() => cards(screen.container)).toHaveLength(2);
  // Écarté du MAGASIN, sinon il y resterait sans carte ni compte à rebours.
  await expect.poll(() => uiToast.getMessages()).toHaveLength(2);
});

// Le même piège que sur `ui-tooltip` : ce qui flotte au-dessus de la page ne
// doit rien lui prendre. La bande d'une carte fait toute la largeur de la pile.
test('la bande ne prend pas les clics de la page à côté de la carte', async () => {
  const screen = await render(<UiToastContainer contained />);

  uiToast.add({ title: 'Étroite', sticky: true });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  const bande = screen.container.querySelector<HTMLElement>('.ui-toast-region-item')!;
  const [card] = cards(screen.container);
  const bandeBox = bande.getBoundingClientRect();
  const cardBox = card!.getBoundingClientRect();
  // Il y a bien du vide à gauche de la carte, sinon le test ne mesure rien.
  expect(cardBox.left - bandeBox.left).toBeGreaterThan(20);

  const dessous = document.elementFromPoint(bandeBox.left + 4, bandeBox.top + bandeBox.height / 2);
  expect(bande.contains(dessous)).toBe(false);
  // La carte, elle, reprend bien le pointeur.
  expect(card!.contains(document.elementFromPoint(cardBox.left + 4, cardBox.top + 4))).toBe(true);
});

test('stackGap resserre l’espacement de la pile', async () => {
  const screen = await render(<UiToastContainer contained stackGap={4} />);

  expect(getComputedStyle(region(screen.container)).rowGap).toBe('4px');
});

// --- Position et calque ----------------------------------------------------
test('la position pose sa classe d’ancrage', async () => {
  const screen = await render(<UiToastContainer contained position="bottom-left" />);
  const el = region(screen.container);

  expect(el).toHaveClass('_bottom-left');
  // Ancrée en bas, la pile pousse vers le haut.
  expect(el).toHaveClass('_reverse');
  expect(getComputedStyle(el).flexDirection).toBe('column-reverse');
});

test('contained ancre la pile dans son ancêtre, sans calque supérieur', async () => {
  const screen = await render(<UiToastContainer contained />);
  const el = region(screen.container);

  expect(el.hasAttribute('popover')).toBe(false);
  expect(getComputedStyle(el).position).toBe('absolute');
});

// `ui-modal` est un `<dialog>` NATIF : il vit dans le calque supérieur, qu'aucun
// z-index n'atteint. Une pile posée en `fixed` serait donc enterrée pendant
// qu'un dialogue est ouvert, ce qui est précisément le moment où l'on notifie.
test('aucun z-index ne passe devant la pile', async () => {
  const screen = await render(
    <>
      <div
        data-testid="voile"
        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'transparent' }}
      />
      <UiToastContainer position="top-right" />
    </>,
  );

  uiToast.add({ title: 'Par-dessus', sticky: true });
  await expect.poll(() => cards(document.body)).toHaveLength(1);

  // Mesuré, et pas seulement déclaré : c'est ce que le navigateur retient sous
  // le pointeur qui dit qui est devant.
  const [card] = cards(document.body);
  const box = card!.getBoundingClientRect();
  const devant = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  expect(card!.contains(devant)).toBe(true);
  expect(screen.container.querySelector('[data-testid="voile"]')).not.toBe(devant);
});

// Le calque empile dans l'ordre d'AFFICHAGE : la pile s'y remontre à chaque
// nouveau message, sans quoi un dialogue ouvert entre-temps passerait devant.
// Le reste du document est alors inerte, la pile comprise : elle reste lisible,
// et redevient manipulable à la fermeture du dialogue.
test('la pile se remontre au-dessus d’un dialogue ouvert', async () => {
  const screen = await render(
    <>
      <dialog>Dialogue</dialog>
      <UiToastContainer position="top-right" />
    </>,
  );
  const dialog = screen.container.querySelector('dialog')!;
  dialog.showModal();

  uiToast.add({ title: 'Par-dessus', sticky: true });

  await expect.poll(() => cards(document.body)).toHaveLength(1);
  const el = region(document.body);
  expect(el).toHaveAttribute('popover', 'manual');
  await expect.poll(() => el.matches(':popover-open')).toBe(true);
  expect(el.checkVisibility()).toBe(true);

  dialog.close();
});

// --- Mouvement -------------------------------------------------------------
test('la carte entre avec le préréglage de sa position', async () => {
  const screen = await render(<UiToastContainer contained position="bottom-right" />);

  uiToast.add({ title: 'Glissée', sticky: true });

  await expect
    .poll(() => screen.container.querySelector('.ui-toast-region-item')?.className)
    .toContain('ui-motion-slide-up-enter');
});

// Toute la raison d'être de `useUiMotion` : sans lui, la carte quitterait le
// DOM à l'instant du retrait et il n'y aurait plus rien à animer.
test('la carte retirée reste rendue le temps de sa sortie', async () => {
  const screen = await render(<UiToastContainer contained position="top-right" />);

  const id = uiToast.add({ title: 'Sortante', sticky: true });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  uiToast.remove(id);
  expect(uiToast.getMessages()).toHaveLength(0);

  // Toujours rendue, et déjà en train de sortir.
  await expect
    .poll(() => screen.container.querySelector('.ui-toast-region-item')?.className)
    .toContain('ui-motion-slide-down-leave');

  await expect.poll(() => screen.container.querySelector('.ui-toast-region-item')).toBeNull();
});

test('motionDisabled retire les classes de mouvement', async () => {
  const screen = await render(<UiToastContainer contained motionDisabled />);

  uiToast.add({ title: 'Nette', sticky: true });

  await expect.poll(() => cards(screen.container)).toHaveLength(1);
  expect(screen.container.querySelector('.ui-toast-region-item')!.className).toBe(
    'ui-toast-region-item',
  );
});

// --- Contenu sur mesure ----------------------------------------------------
test('renderToast remplace le corps et reçoit de quoi fermer', async () => {
  const screen = await render(
    <UiToastContainer
      contained
      renderToast={(message, { close }) => (
        <button type="button" onClick={close}>
          Annuler {String(message.data)}
        </button>
      )}
    />,
  );

  uiToast.add({ title: 'Ignoré', text: 'Ignoré aussi', data: 42, sticky: true });
  await expect.poll(() => cards(screen.container)).toHaveLength(1);

  expect(screen.container.querySelector('.ui-toast-title')).toBeNull();
  expect(screen.container.querySelector('.ui-toast-text')).toBeNull();

  await screen.getByRole('button', { name: 'Annuler 42' }).click();

  await expect.poll(() => uiToast.getMessages()).toHaveLength(0);
});

test('expanded étire les cartes sur la largeur de la pile', async () => {
  const screen = await render(<UiToastContainer contained expanded />);

  uiToast.add({ title: 'Bannière', sticky: true });

  await expect.poll(() => cards(screen.container)).toHaveLength(1);
  const [card] = cards(screen.container);
  expect(card).toHaveClass('_expanded');
  expect(Math.round(card!.getBoundingClientRect().width)).toBe(
    Math.round(region(screen.container).getBoundingClientRect().width),
  );
});
