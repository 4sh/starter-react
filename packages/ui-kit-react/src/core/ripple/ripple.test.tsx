import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiRippleProvider, useUiRipple, useUiRippleScope } from './ripple';
import { launchRipple } from './ripple-engine';

afterEach(() => {
  delete document.documentElement.dataset['motion'];
});

const box: React.CSSProperties = { display: 'block', width: 120, height: 40 };

function press(el: Element, clientX?: number, clientY?: number) {
  const rect = el.getBoundingClientRect();
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      isPrimary: true,
      button: 0,
      clientX: clientX ?? rect.left + 30,
      clientY: clientY ?? rect.top + 20,
    }),
  );
}

/** Ondes vivantes sur un élément, `null` quand il n'a jamais reçu de couche. */
function inks(el: Element): number | null {
  const layer = el.querySelector(':scope > .ui-ripple-layer');
  return layer ? layer.childElementCount : null;
}

function Harness({
  targetedOn = true,
  scopeOn = true,
}: {
  targetedOn?: boolean;
  scopeOn?: boolean;
}) {
  const targeted = useUiRipple<HTMLButtonElement>({ enabled: targetedOn });
  const scope = useUiRippleScope<HTMLDivElement>({ enabled: scopeOn });
  const own = useUiRipple<HTMLButtonElement>();
  return (
    <>
      <button type="button" className="targeted" style={box} {...targeted}>
        Ciblé
      </button>
      <div className="scope" {...scope}>
        <button type="button" className="inside" style={box} data-ripple="on">
          Délégué
        </button>
        <button type="button" className="inside-disabled" style={box} data-ripple="on" disabled>
          Désactivé
        </button>
        <button type="button" className="inside-own" style={box} {...own}>
          Liaison interne
        </button>
        <div className="opted-out" data-ripple="off">
          <button type="button" className="inside-opted-out" style={box} data-ripple="on">
            Exclu
          </button>
        </div>
        <span className="plain" style={box}>
          Non interactif
        </span>
      </div>
    </>
  );
}

const q = (root: ParentNode, selector: string) => root.querySelector<HTMLElement>(selector)!;

test('useUiRipple pose une couche masquée et une onde, taillée sur le coin le plus lointain', async () => {
  const screen = await render(<Harness />);
  const target = q(screen.container, '.targeted');
  const rect = target.getBoundingClientRect();

  press(target, rect.left + 30, rect.top + 20);

  const layer = target.querySelector(':scope > .ui-ripple-layer')!;
  expect(layer.getAttribute('aria-hidden')).toBe('true');
  expect(inks(target)).toBe(1);
  // Coin le plus lointain de (30, 20) dans une boîte de 120 × 40 : hypot(90, 20).
  const radius = Math.hypot(rect.width - 30, rect.height - 20);
  const ink = layer.firstElementChild as HTMLElement;
  expect(Number.parseFloat(ink.style.width)).toBeCloseTo(radius * 2, 3);
  expect(Number.parseFloat(ink.style.left)).toBeCloseTo(30 - radius, 3);
});

test('une portée fait onduler le descendant pressé, jamais le conteneur', async () => {
  const screen = await render(<Harness />);
  const inside = q(screen.container, '.inside');

  press(inside);

  expect(inks(inside)).toBe(1);
  expect(inks(q(screen.container, '.scope'))).toBeNull();
});

test('un descendant non déclaré reste immobile tant qu’il n’est pas marqué', async () => {
  const screen = await render(<Harness />);
  const plain = q(screen.container, '.plain');

  press(plain);
  expect(inks(plain)).toBeNull();

  plain.dataset['ripple'] = 'on';
  press(plain);
  expect(inks(plain)).toBe(1);
});

test('une portée et une liaison qui se chevauchent ne produisent qu’une onde', async () => {
  const screen = await render(<Harness />);
  const own = q(screen.container, '.inside-own');

  press(own);

  expect(inks(own)).toBe(1);
  expect(inks(q(screen.container, '.scope'))).toBeNull();
});

test('un contrôle désactivé et un sous-arbre data-ripple="off" n’ondulent pas', async () => {
  const screen = await render(<Harness />);

  press(q(screen.container, '.inside-disabled'));
  press(q(screen.container, '.inside-opted-out'));

  expect(inks(q(screen.container, '.inside-disabled'))).toBeNull();
  expect(inks(q(screen.container, '.inside-opted-out'))).toBeNull();
});

test('enabled à faux retire l’élément, et marque le sous-arbre pour les portées englobantes', async () => {
  const screen = await render(<Harness targetedOn={false} scopeOn={false} />);
  const target = q(screen.container, '.targeted');
  const inside = q(screen.container, '.inside');

  press(target);
  press(inside);

  expect(target.getAttribute('data-ripple')).toBe('off');
  expect(q(screen.container, '.scope').getAttribute('data-ripple')).toBe('off');
  expect(inks(target)).toBeNull();
  expect(inks(inside)).toBeNull();
});

test('les réglages suivent le dernier rendu, sans relier', async () => {
  function Toggle() {
    const [on, setOn] = useState(false);
    const ripple = useUiRipple<HTMLButtonElement>({ enabled: on });
    return (
      <>
        <button type="button" className="t" style={box} {...ripple}>
          Cible
        </button>
        <button type="button" onClick={() => setOn(true)}>
          Activer
        </button>
      </>
    );
  }
  const screen = await render(<Toggle />);
  const target = q(screen.container, '.t');

  press(target);
  expect(inks(target)).toBeNull();

  await screen.getByRole('button', { name: 'Activer' }).click();
  press(target);
  expect(inks(target)).toBe(1);
});

test('rien sous l’interrupteur data-motion="off" du kit', async () => {
  document.documentElement.dataset['motion'] = 'off';
  const screen = await render(<Harness />);
  const target = q(screen.container, '.targeted');

  press(target);

  expect(inks(target)).toBeNull();
});

test('une pression frénétique ne garde que quatre ondes vivantes', async () => {
  const screen = await render(<Harness />);
  const target = q(screen.container, '.targeted');

  for (let i = 0; i < 7; i++) press(target);

  expect(inks(target)).toBe(4);
});

test('launchRipple fait onduler depuis le centre, sans pression', async () => {
  const screen = await render(<Harness />);
  const target = q(screen.container, '.targeted');
  const rect = target.getBoundingClientRect();

  launchRipple(target);

  const ink = target.querySelector<HTMLElement>('.ui-ripple-ink')!;
  const radius = Math.hypot(rect.width / 2, rect.height / 2);
  expect(Number.parseFloat(ink.style.left)).toBeCloseTo(rect.width / 2 - radius, 3);
});

// --- Activation globale ------------------------------------------------------------

test('UiRippleProvider fait onduler un contrôle marqué, sans rien d’autre', async () => {
  const screen = await render(
    <UiRippleProvider>
      <button type="button" className="kit" style={box} data-ripple="on">
        Du kit
      </button>
      <button type="button" className="app" style={box}>
        De l’application
      </button>
    </UiRippleProvider>,
  );

  press(q(screen.container, '.kit'));
  press(q(screen.container, '.app'));

  expect(inks(q(screen.container, '.kit'))).toBe(1);
  expect(inks(q(screen.container, '.app'))).toBeNull();
});

test('le sélecteur élargi fait onduler les contrôles de l’application, data-ripple="off" compris en retrait', async () => {
  const screen = await render(
    <UiRippleProvider selector="button">
      <button type="button" className="app" style={box}>
        De l’application
      </button>
      <div data-ripple="off">
        <button type="button" className="off" style={box}>
          Retiré
        </button>
      </div>
    </UiRippleProvider>,
  );

  press(q(screen.container, '.app'));
  press(q(screen.container, '.off'));

  expect(inks(q(screen.container, '.app'))).toBe(1);
  expect(inks(q(screen.container, '.off'))).toBeNull();
});

test('global à faux ne fait que poser le sélecteur des portées', async () => {
  function Scoped() {
    const scope = useUiRippleScope<HTMLDivElement>();
    return (
      <div {...scope}>
        <span className="tile" style={box}>
          Tuile
        </span>
      </div>
    );
  }
  const screen = await render(
    <UiRippleProvider global={false} selector=".tile">
      <button type="button" className="outside" style={box} data-ripple="on">
        Hors portée
      </button>
      <Scoped />
    </UiRippleProvider>,
  );

  press(q(screen.container, '.outside'));
  press(q(screen.container, '.tile'));

  expect(inks(q(screen.container, '.outside'))).toBeNull();
  expect(inks(q(screen.container, '.tile'))).toBe(1);
});

test('deux fournisseurs dans la page répondent par une seule onde', async () => {
  const screen = await render(
    <UiRippleProvider>
      <UiRippleProvider>
        <button type="button" className="kit" style={box} data-ripple="on">
          Du kit
        </button>
      </UiRippleProvider>
    </UiRippleProvider>,
  );

  press(q(screen.container, '.kit'));

  expect(inks(q(screen.container, '.kit'))).toBe(1);
});

test('le démontage du fournisseur retire l’écouteur global', async () => {
  const screen = await render(
    <UiRippleProvider>
      <span />
    </UiRippleProvider>,
  );
  await screen.unmount();

  const orphan = document.createElement('button');
  orphan.dataset['ripple'] = 'on';
  Object.assign(orphan.style, { display: 'block', width: '120px', height: '40px' });
  document.body.append(orphan);
  press(orphan);

  expect(inks(orphan)).toBeNull();
  orphan.remove();
});
