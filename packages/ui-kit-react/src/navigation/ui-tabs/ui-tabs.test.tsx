import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiTab,
  UiTabList,
  UiTabPanel,
  UiTabPanels,
  UiTabs,
  type TabsOrientation,
  type UiTabValue,
} from './ui-tabs';

interface HostProps {
  value?: UiTabValue | null;
  defaultValue?: UiTabValue | null;
  orientation?: TabsOrientation;
  disableThird?: boolean;
  selectOnFocus?: boolean;
  onValueChange?: (value: UiTabValue) => void;
}

function Host({
  value,
  defaultValue = 'un',
  orientation = 'horizontal',
  disableThird = false,
  selectOnFocus = false,
  onValueChange,
}: HostProps) {
  return (
    <UiTabs
      value={value}
      defaultValue={defaultValue}
      orientation={orientation}
      selectOnFocus={selectOnFocus}
      onValueChange={onValueChange}
    >
      <UiTabList aria-label="Sections">
        <UiTab value="un">Un</UiTab>
        <UiTab value="deux">Deux</UiTab>
        <UiTab value="trois" disabled={disableThird}>
          Trois
        </UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="un">Contenu 1</UiTabPanel>
        <UiTabPanel value="deux">Contenu 2</UiTabPanel>
        <UiTabPanel value="trois">Contenu 3</UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  );
}

const tabsOf = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
];

// Le clavier d'un motif à focus glissant est branché sur les ENTRÉES : la
// touche part donc du bouton, pas de la bande.
const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

test('la bande porte le rôle tablist, son nom et son axe', async () => {
  const screen = await render(<Host />);
  const strip = screen.container.querySelector('[role="tablist"]')!;

  expect(strip).toHaveAttribute('aria-label', 'Sections');
  expect(strip).toHaveAttribute('aria-orientation', 'horizontal');
  // Le nom accessible ne peut pas vivre sur la racine, qui n'a pas de rôle.
  expect(screen.container.querySelector('.ui-tab-list')).not.toHaveAttribute('aria-label');
});

test('chaque onglet est apparié à son panneau', async () => {
  const screen = await render(<Host />);

  for (const tab of tabsOf(screen.container)) {
    const panel = screen.container.querySelector(
      `#${CSS.escape(tab.getAttribute('aria-controls')!)}`,
    )!;
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  }
});

test('seul le panneau actif est visible, les autres restent montés', async () => {
  const screen = await render(<Host />);
  const panels = [...screen.container.querySelectorAll('.ui-tab-panel')];

  expect(panels).toHaveLength(3);
  expect(panels[0]).not.toHaveAttribute('hidden');
  expect(panels[1]).toHaveAttribute('hidden');
  expect(getComputedStyle(panels[1]!).display).toBe('none');
});

test('un clic active l’onglet et son panneau', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host onValueChange={onValueChange} />);

  await screen.getByRole('tab', { name: 'Deux' }).click();

  await expect
    .element(screen.getByRole('tab', { name: 'Deux' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect.element(screen.getByRole('tabpanel')).toHaveTextContent('Contenu 2');
  expect(onValueChange).toHaveBeenCalledWith('deux');
});

test('onTabChange rapporte l’événement d’origine', async () => {
  const onTabChange = vi.fn();
  const screen = await render(
    <UiTabs defaultValue="un" onTabChange={onTabChange}>
      <UiTabList aria-label="Sections">
        <UiTab value="un">Un</UiTab>
        <UiTab value="deux">Deux</UiTab>
      </UiTabList>
    </UiTabs>,
  );

  await screen.getByRole('tab', { name: 'Deux' }).click();

  expect(onTabChange).toHaveBeenCalledTimes(1);
  expect(onTabChange.mock.calls[0]![0]).toMatchObject({ value: 'deux' });
  expect(onTabChange.mock.calls[0]![0].originalEvent.type).toBe('click');
});

// `value` renseignée, l'onglet actif appartient au parent : le composant
// signale le clic, il ne bascule pas de lui-même.
test('contrôlé, l’onglet ne change que si le parent le veut', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host value="un" onValueChange={onValueChange} />);

  await screen.getByRole('tab', { name: 'Deux' }).click();

  expect(onValueChange).toHaveBeenCalledWith('deux');
  expect(tabsOf(screen.container)[0]).toHaveAttribute('aria-selected', 'true');
});

test('l’onglet actif est le seul arrêt de tabulation', async () => {
  const screen = await render(<Host />);
  const tabs = tabsOf(screen.container);

  expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
});

// Sans onglet actif, tous seraient à -1 et la bande deviendrait inatteignable
// au clavier : l'APG veut alors le premier onglet.
test('sans onglet actif, l’arrêt de tabulation retombe sur le premier', async () => {
  const screen = await render(<Host value={null} />);

  expect(tabsOf(screen.container).map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
});

test('la flèche suivante déplace le focus sans activer', async () => {
  const screen = await render(<Host />);
  const tabs = tabsOf(screen.container);

  tabs[0]!.focus();
  touche(tabs[0]!, 'ArrowRight');

  await expect.poll(() => document.activeElement).toBe(tabs[1]);
  expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
});

test('les flèches bouclent aux deux extrémités', async () => {
  const screen = await render(<Host />);
  const tabs = tabsOf(screen.container);

  tabs[2]!.focus();
  touche(tabs[2]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(tabs[0]);

  touche(tabs[0]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(tabs[2]);
});

test('Origine et Fin sautent au premier et au dernier onglet', async () => {
  const screen = await render(<Host />);
  const tabs = tabsOf(screen.container);

  tabs[1]!.focus();
  touche(tabs[1]!, 'End');
  await expect.poll(() => document.activeElement).toBe(tabs[2]);

  touche(tabs[2]!, 'Home');
  await expect.poll(() => document.activeElement).toBe(tabs[0]);
});

test('un onglet désactivé est sauté par les flèches', async () => {
  const screen = await render(<Host disableThird />);
  const tabs = tabsOf(screen.container);

  tabs[1]!.focus();
  touche(tabs[1]!, 'ArrowRight');

  await expect.poll(() => document.activeElement).toBe(tabs[0]);
});

test('sur l’axe vertical, ce sont les flèches verticales qui naviguent', async () => {
  const screen = await render(<Host orientation="vertical" />);
  const tabs = tabsOf(screen.container);

  tabs[0]!.focus();
  touche(tabs[0]!, 'ArrowDown');
  await expect.poll(() => document.activeElement).toBe(tabs[1]);

  // La flèche de l'autre axe ne consomme rien : elle doit rester au texte.
  touche(tabs[1]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(tabs[1]);
});

test('selectOnFocus active l’onglet atteint au clavier', async () => {
  const screen = await render(<Host selectOnFocus />);
  const tabs = tabsOf(screen.container);

  tabs[0]!.focus();
  touche(tabs[0]!, 'ArrowRight');

  await expect
    .element(screen.getByRole('tab', { name: 'Deux' }))
    .toHaveAttribute('aria-selected', 'true');
});

// L'indicateur est mesuré sur l'onglet actif : `offsetLeft` / `offsetWidth`,
// que les transformations ne touchent pas, contrairement à un rectangle.
test('l’indicateur se cale sur l’onglet actif', async () => {
  const screen = await render(<Host />);
  const bar = screen.container.querySelector<HTMLElement>('.ui-tab-list-active-bar')!;
  const second = tabsOf(screen.container)[1]!;

  await expect.poll(() => bar.style.width).toBe(`${tabsOf(screen.container)[0]!.offsetWidth}px`);

  await screen.getByRole('tab', { name: 'Deux' }).click();

  await expect.poll(() => bar.style.transform).toBe(`translateX(${second.offsetLeft}px)`);
  expect(bar.style.width).toBe(`${second.offsetWidth}px`);
});

test('sans panneaux, aucun onglet n’annonce d’aria-controls', async () => {
  const screen = await render(
    <UiTabs defaultValue="un">
      <UiTabList aria-label="Navigation">
        <UiTab value="un">Un</UiTab>
        <UiTab value="deux">Deux</UiTab>
      </UiTabList>
    </UiTabs>,
  );

  const tabs = tabsOf(screen.container);
  expect(tabs.map((tab) => tab.textContent)).toEqual(['Un', 'Deux']);
  for (const tab of tabs) expect(tab).not.toHaveAttribute('aria-controls');
});

test('un panneau paresseux n’est construit qu’à sa première activation', async () => {
  const screen = await render(
    <UiTabs defaultValue="un" lazy>
      <UiTabList aria-label="Sections">
        <UiTab value="un">Un</UiTab>
        <UiTab value="deux">Deux</UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="un">Contenu 1</UiTabPanel>
        <UiTabPanel value="deux">
          <b data-testid="tardif">Contenu 2</b>
        </UiTabPanel>
      </UiTabPanels>
    </UiTabs>,
  );

  expect(screen.container.querySelector('[data-testid="tardif"]')).toBeNull();

  await screen.getByRole('tab', { name: 'Deux' }).click();
  await expect.poll(() => screen.container.querySelector('[data-testid="tardif"]')).not.toBeNull();

  // Une fois construit, il reste monté : en sortir ne doit pas perdre son état.
  await screen.getByRole('tab', { name: 'Un' }).click();
  await expect.poll(() => screen.container.querySelector('[data-testid="tardif"]')).not.toBeNull();
});

// L'APG ne rend un panneau focalisable que s'il n'a rien à tabuler dedans :
// un arrêt de plus devant un contenu déjà atteignable n'encombre que le clavier.
test('un panneau sans contenu focalisable est lui-même un arrêt de tabulation', async () => {
  const screen = await render(<Host />);

  await expect
    .poll(() => screen.container.querySelector('.ui-tab-panel')!.getAttribute('tabindex'))
    .toBe('0');
});

test('un panneau au contenu focalisable ne l’est pas', async () => {
  const screen = await render(
    <UiTabs defaultValue="un">
      <UiTabList aria-label="Sections">
        <UiTab value="un">Un</UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="un">
          <button type="button">Agir</button>
        </UiTabPanel>
      </UiTabPanels>
    </UiTabs>,
  );

  await expect
    .poll(() => screen.container.querySelector('.ui-tab-panel')!.getAttribute('tabindex'))
    .toBe('-1');
});

// Sur l'axe vertical la bande est un frère du contenu : la laisser rétrécir
// l'écrasait à la largeur de ses icônes, libellés rognés (mesuré : 50 px pour
// 131 de contenu). Le défaut vient de la SCSS reprise, donc il est là côté
// Angular aussi.
test('sur l’axe vertical, la bande garde sa largeur de contenu', async () => {
  const screen = await render(
    <div style={{ width: 645 }}>
      <UiTabs defaultValue="general" orientation="vertical">
        <UiTabList aria-label="Réglages">
          <UiTab value="general" icon="sliders">
            Général
          </UiTab>
          <UiTab value="security" icon="lock">
            Sécurité
          </UiTab>
        </UiTabList>
        <UiTabPanels>
          <UiTabPanel value="general">{'Un paragraphe long. '.repeat(40)}</UiTabPanel>
          <UiTabPanel value="security">Court.</UiTabPanel>
        </UiTabPanels>
      </UiTabs>
    </div>,
  );

  const label = screen.container.querySelector<HTMLElement>('.ui-tab-label')!;

  // Le libellé est en `nowrap` : écrasé, sa boîte tombe à zéro alors que son
  // contenu garde sa largeur. Comparer les deux dit s'il est rogné, sans
  // figer une mesure en pixels.
  await expect.poll(() => label.clientWidth).toBe(label.scrollWidth);
  expect(label.scrollWidth).toBeGreaterThan(0);
});

test('la bande défilante n’active ses navigateurs que là où elle peut aller', async () => {
  const screen = await render(
    <div style={{ width: 240 }}>
      <UiTabs defaultValue="1" scrollable>
        <UiTabList aria-label="Nombreux onglets">
          {Array.from({ length: 10 }, (_, index) => `${index + 1}`).map((n) => (
            <UiTab key={n} value={n}>
              Onglet {n}
            </UiTab>
          ))}
        </UiTabList>
      </UiTabs>
    </div>,
  );

  const prev = screen.container.querySelector<HTMLButtonElement>('.ui-tab-list-nav._prev')!;
  const next = screen.container.querySelector<HTMLButtonElement>('.ui-tab-list-nav._next')!;

  await expect.poll(() => prev.disabled).toBe(true);
  await expect.poll(() => next.disabled).toBe(false);
});

test('composé hors de son conteneur, un onglet le dit', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await expect(async () => {
      await render(<UiTab value="orphelin">Seul</UiTab>);
    }).rejects.toThrow('ui-tabs');
  } finally {
    error.mockRestore();
  }
});

// Un onglet non contrôlé garde son état : c'est le contrat non contrôlé du kit.
test('non contrôlé, le conteneur bascule tout seul', async () => {
  function Uncontrolled() {
    const [renders, setRenders] = useState(0);
    return (
      <>
        <button type="button" onClick={() => setRenders((n) => n + 1)}>
          Rendre à nouveau ({renders})
        </button>
        <Host />
      </>
    );
  }

  const screen = await render(<Uncontrolled />);
  await screen.getByRole('tab', { name: 'Trois' }).click();
  await screen.getByRole('button', { name: /Rendre à nouveau/ }).click();

  await expect
    .element(screen.getByRole('tab', { name: 'Trois' }))
    .toHaveAttribute('aria-selected', 'true');
});
