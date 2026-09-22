import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiTooltip } from './ui-tooltip';

function Demo(args: Partial<React.ComponentProps<typeof UiTooltip>>) {
  return (
    <UiTooltip
      content="Enregistre le document"
      showDelay={0}
      trigger={(props) => (
        <button type="button" {...props}>
          Enregistrer
        </button>
      )}
      {...args}
    />
  );
}

const bulle = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('.ui-tooltip') as HTMLElement;

// Survol RÉEL, et non un `PointerEvent` fabriqué : `pointerenter` ne remonte
// pas, alors React le déduit de `pointerover`. Un événement synthétique
// n'atteint donc jamais le gestionnaire, et le test prouverait le contraire de
// ce qu'il croit.
const survol = (screen: { getByRole: (r: string) => { hover: () => Promise<void> } }) =>
  screen.getByRole('button').hover();

// La propriété ne suffit pas : une bulle fermée doit aussi n'occuper AUCUNE
// place. Le `display: none` navigateur des popovers est de niveau UA, donc un
// `display` d'auteur le bat.
test('la bulle fermée n’occupe aucune place à l’écran', async () => {
  const screen = await render(<Demo showDelay={200} />);
  const el = bulle(screen);

  expect(el.matches(':popover-open')).toBe(false);
  expect(getComputedStyle(el).display).toBe('none');
  expect(el.getBoundingClientRect().width).toBe(0);
  expect(screen.container.querySelector('button')).not.toHaveAttribute('aria-describedby');
});

// Le calque supérieur est ce qui fait échapper la bulle au rognage d'un
// ancêtre en `overflow: hidden`.
test('le survol ouvre la bulle dans le calque supérieur', async () => {
  const screen = await render(<Demo showDelay={200} />);

  await survol(screen);

  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);
});

test('la bulle décrit le déclencheur pendant qu’elle est ouverte', async () => {
  const screen = await render(<Demo showDelay={200} />);
  const trigger = screen.container.querySelector('button')!;

  await survol(screen);

  await expect.poll(() => trigger.getAttribute('aria-describedby')).toBe(bulle(screen).id);
  expect(bulle(screen)).toHaveAttribute('role', 'tooltip');
});

test('quitter le déclencheur referme', async () => {
  const screen = await render(
    <div>
      <Demo />
      <button type="button">Ailleurs</button>
    </div>,
  );

  await screen.getByRole('button', { name: 'Enregistrer' }).hover();
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('button', { name: 'Ailleurs' }).hover();
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(false);
});

test('le focus clavier ouvre aussi la bulle', async () => {
  const screen = await render(<Demo showDelay={200} />);

  screen.container.querySelector('button')!.focus();

  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);
});

test('event=hover ignore le focus', async () => {
  const screen = await render(<Demo event="hover" />);

  screen.container.querySelector('button')!.focus();
  await new Promise((r) => setTimeout(r, 60));

  expect(bulle(screen).matches(':popover-open')).toBe(false);
});

test('event=focus ignore le survol', async () => {
  const screen = await render(<Demo event="focus" />);

  await survol(screen);
  await new Promise((r) => setTimeout(r, 60));

  expect(bulle(screen).matches(':popover-open')).toBe(false);
});

test('désactivée, la bulle ne s’ouvre pas', async () => {
  const screen = await render(<Demo disabled />);

  await survol(screen);
  await new Promise((r) => setTimeout(r, 60));

  expect(bulle(screen).matches(':popover-open')).toBe(false);
});

test('sans contenu, rien ne s’ouvre', async () => {
  const screen = await render(<Demo content={undefined} />);

  await survol(screen);
  await new Promise((r) => setTimeout(r, 60));

  expect(bulle(screen).matches(':popover-open')).toBe(false);
});

// WCAG 1.4.13 : une bulle déclenchée au survol doit pouvoir être rejetée sans
// déplacer le pointeur.
test('Échap referme la bulle', async () => {
  const screen = await render(<Demo showDelay={200} />);

  await survol(screen);
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(false);
});

test('hideOnEscape=false garde la bulle ouverte', async () => {
  const screen = await render(<Demo hideOnEscape={false} />);

  await survol(screen);
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));

  expect(bulle(screen).matches(':popover-open')).toBe(true);
});

// `life` assez long pour que la fenêtre « ouverte » soit observable : trop
// court, le test devient une course entre l'ouverture et la fermeture.
//
// L'attente de fermeture est large à dessein. Sous la charge d'une exécution
// complète, l'ouverture, le compte à rebours et le rendu se disputent le même
// fil : mesuré, ce test tombait une fois sur deux suites avec 2 s, jamais avec
// 5. Ce n'est pas la durée du `life` qu'il vérifie, c'est qu'il ferme seul.
test('life referme la bulle même sans quitter le déclencheur', async () => {
  const onHide = vi.fn();
  const screen = await render(<Demo life={800} onHide={onHide} />);

  await survol(screen);
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);

  await expect.poll(() => bulle(screen).matches(':popover-open'), { timeout: 5000 }).toBe(false);
  expect(onHide).toHaveBeenCalled();
});

// `manual` et non `auto` : une bulle ne se ferme pas au clic à côté, elle suit
// le survol et le focus.
test('la bulle est en mode manuel, pas en light-dismiss', async () => {
  const screen = await render(<Demo showDelay={200} />);

  expect(bulle(screen).getAttribute('popover')).toBe('manual');
});

test('autoHide=false rend la bulle survolable', async () => {
  const screen = await render(<Demo autoHide={false} />);

  expect(bulle(screen)).toHaveClass('_interactive');
  expect(getComputedStyle(bulle(screen)).pointerEvents).toBe('auto');
});

test('un clic sur le déclencheur efface la bulle', async () => {
  const screen = await render(<Demo showDelay={200} />);

  await survol(screen);
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('button', { name: 'Enregistrer' }).click();

  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(false);
});

// Le texte n'est tronqué qu'une fois rendu : la question se pose à l'affichage.
test('showOnEllipsis se tait quand le texte tient', async () => {
  const screen = await render(
    <UiTooltip
      content="Intitulé complet"
      showDelay={0}
      showOnEllipsis
      trigger={(props) => (
        <button
          {...props}
          type="button"
          style={{ display: 'block', width: 400, whiteSpace: 'nowrap' }}
        >
          Court
        </button>
      )}
    />,
  );

  await screen.getByRole('button').hover();
  await new Promise((r) => setTimeout(r, 60));

  expect(bulle(screen).matches(':popover-open')).toBe(false);
});

test('showOnEllipsis parle quand le texte est coupé', async () => {
  const screen = await render(
    <UiTooltip
      content="Intitulé complet"
      showDelay={0}
      showOnEllipsis
      trigger={(props) => (
        <button
          {...props}
          type="button"
          style={{
            display: 'block',
            width: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Un intitulé beaucoup trop long pour cette largeur
        </button>
      )}
    />,
  );

  await screen.getByRole('button').hover();

  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);
});

// --- Entrée et sortie ------------------------------------------------------
test('la transition couvre display et overlay, sinon la sortie n’existe pas', async () => {
  const screen = await render(<Demo showDelay={200} />);
  const cs = getComputedStyle(bulle(screen));

  expect(cs.transitionProperty).toContain('display');
  expect(cs.transitionProperty).toContain('overlay');
  expect(cs.transitionBehavior).toBe('allow-discrete');
});

test('le décalage de départ suit le côté de la bulle', async () => {
  const screen = await render(<Demo position="bottom" />);

  expect(getComputedStyle(bulle(screen)).getPropertyValue('--_motion-slide').trim()).not.toBe(
    '0 0',
  );
});

// `computePosition` est asynchrone : le panneau reste dans son état fermé, donc
// invisible, jusqu'à ce que sa position soit calculée. Les deux moitiés du
// contrat comptent, et pour des raisons opposées : sans la POSE, une image au
// mauvais endroit est peinte et le panneau paraît sauter en place ; sans le
// RELÂCHEMENT, le panneau reste invisible pour de bon.
test('la bulle attend sa position avant d’être peinte', async () => {
  const screen = await render(<Demo showDelay={200} />);

  // Au repos, le garde est POSÉ : c'est ce qui prouve qu'il est branché.
  expect(bulle(screen).hasAttribute('data-unpositioned')).toBe(true);

  await survol(screen);

  await expect.poll(() => bulle(screen).hasAttribute('data-unpositioned')).toBe(false);
  bulle(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(bulle(screen)).opacity).toBe('1');
});

// Le panneau du CDK d'Angular pose `pointer-events: none` sur le calque ; ici
// il n'y a pas de calque à part, donc la bulle doit le poser elle-même. Sans
// ça elle avale les clics de ce qu'elle surplombe, et avec `autoHide` elle
// clignote : le pointeur qui l'atteint quitte le déclencheur, elle se ferme, le
// pointeur retombe sur le déclencheur, elle se rouvre.
test('la bulle ne s’interpose pas entre le pointeur et la page', async () => {
  const screen = await render(<Demo showDelay={0} />);

  await survol(screen);
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);

  const el = bulle(screen);
  expect(getComputedStyle(el).pointerEvents).toBe('none');

  // Mesuré, et pas seulement déclaré : c'est ce que le navigateur retient sous
  // le pointeur qui décide.
  const box = el.getBoundingClientRect();
  const dessous = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  expect(el.contains(dessous)).toBe(false);
});

// Une bulle survolable doit au contraire reprendre le pointeur, sans quoi on ne
// pourrait pas aller cliquer un lien dedans (WCAG 1.4.13).
test('une bulle survolable reprend le pointeur', async () => {
  const screen = await render(<Demo showDelay={0} autoHide={false} />);

  await survol(screen);
  await expect.poll(() => bulle(screen).matches(':popover-open')).toBe(true);

  expect(getComputedStyle(bulle(screen)).pointerEvents).toBe('auto');
});
