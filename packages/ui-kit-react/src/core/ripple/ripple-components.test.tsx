import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiButton } from '../../actions/ui-button';
import { UiAutocomplete } from '../../forms/ui-autocomplete';
import { UiDatepicker } from '../../forms/ui-datepicker';
import { UiFileUpload } from '../../forms/ui-file-upload';
import { UiSegmentControl } from '../../forms/ui-segment-control';
import { UiSelect } from '../../forms/ui-select';
import { UiToggleBlock } from '../../forms/ui-toggle-block';
import { UiToggleButton } from '../../forms/ui-toggle-button';
import { UiBottomTab, UiBottomTabAction, UiBottomTabBar } from '../../navigation/ui-bottom-tab-bar';
import { UiContextMenu } from '../../navigation/ui-context-menu';
import { UiMenu } from '../../navigation/ui-menu';
import { UiSidebarMenu } from '../../navigation/ui-sidebar';
import { UiTab, UiTabList, UiTabs } from '../../navigation/ui-tabs';
import { UiPaginator } from '../../table/ui-paginator';

import { UiRippleProvider } from './ripple';

// Le contrat de l'onde à travers le kit : les quatorze composants équipés
// posent `data-ripple="on"` sur leurs cibles par défaut, et `"off"` avec
// `ripple={false}`. Même tableau que la documentation Angular, pour la parité.

type Case = {
  name: string;
  /** Le composant, avec ou sans onde. */
  el: (ripple: boolean) => ReactElement;
  /** Les cibles à vérifier, dans le document (certaines vivent dans le calque supérieur). */
  targets: string;
  /** Ce qu'il faut faire pour que les cibles existent. */
  reveal?: (root: HTMLElement) => Promise<void> | void;
};

const pick = (root: HTMLElement) => {
  const input = root.querySelector<HTMLInputElement>('.ui-file-upload-input')!;
  const data = new DataTransfer();
  data.items.add(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
  input.files = data.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const CASES: Case[] = [
  { name: 'ui-button', el: (r) => <UiButton label="Valider" ripple={r} />, targets: '.ui-button' },
  {
    name: 'ui-menu',
    el: (r) => (
      <UiMenu
        aria-label="Menu"
        items={[{ label: 'A' }, { label: 'B', items: [{ label: 'C' }] }]}
        ripple={r}
      />
    ),
    targets: '.ui-menu-action',
  },
  {
    name: 'ui-context-menu',
    el: (r) => (
      <UiContextMenu
        aria-label="Actions"
        items={[{ label: 'Ouvrir' }]}
        ripple={r}
        trigger={(zone) => (
          <button type="button" className="zone" {...zone} style={{ width: 200, height: 80 }}>
            Zone
          </button>
        )}
      />
    ),
    targets: '.ui-context-menu .ui-menu-action',
    reveal: (root) => {
      const zone = root.querySelector('.zone')!;
      const box = zone.getBoundingClientRect();
      zone.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: box.left + 10,
          clientY: box.top + 10,
        }),
      );
    },
  },
  {
    name: 'ui-sidebar-menu',
    el: (r) => (
      <UiSidebarMenu
        aria-label="Sections"
        ripple={r}
        items={[
          { label: 'Accueil', url: '/' },
          { label: 'Projets' },
          { label: 'Groupe', toggleable: true, items: [{ label: 'X' }] },
        ]}
      />
    ),
    targets: '.ui-sidebar-menu-action',
  },
  {
    name: 'ui-tabs',
    el: (r) => (
      <UiTabs defaultValue="un" ripple={r}>
        <UiTabList aria-label="Sections">
          <UiTab value="un">Un</UiTab>
          <UiTab value="deux">Deux</UiTab>
        </UiTabList>
      </UiTabs>
    ),
    targets: '[role="tab"]',
  },
  {
    name: 'ui-bottom-tab-bar',
    el: (r) => (
      <UiBottomTabBar defaultValue="a" ripple={r} contained>
        <UiBottomTab value="a" label="Accueil" icon="house" />
        <UiBottomTab value="b" label="Profil" icon="user" />
      </UiBottomTabBar>
    ),
    targets: '.ui-bottom-tab',
  },
  {
    name: 'ui-paginator',
    el: (r) => <UiPaginator totalRecords={120} ripple={r} />,
    targets: '.ui-paginator-page, .ui-paginator-control',
  },
  {
    name: 'ui-select',
    el: (r) => <UiSelect aria-label="Ville" options={['Lyon', 'Nantes']} ripple={r} />,
    targets: '.ui-select-option',
    reveal: async (root) => root.querySelector<HTMLElement>('[role="combobox"]')!.click(),
  },
  {
    name: 'ui-autocomplete',
    el: (r) => (
      <UiAutocomplete label="Villes" multiple defaultValue={['Lyon', 'Nantes']} ripple={r} />
    ),
    targets: '.ui-autocomplete-tag',
  },
  {
    name: 'ui-datepicker',
    el: (r) => <UiDatepicker inline valueType="date" locale="fr-FR" aria-label="Date" ripple={r} />,
    targets: '.ui-datepicker-nav, .ui-datepicker-day',
  },
  {
    name: 'ui-toggle-button',
    el: (r) => <UiToggleButton label="Notifications" ripple={r} />,
    targets: '.ui-toggle-button-item',
  },
  {
    name: 'ui-segment-control',
    el: (r) => <UiSegmentControl aria-label="Affichage" options={['Liste', 'Grille']} ripple={r} />,
    targets: '.ui-segment-control-option',
  },
  {
    name: 'ui-toggle-block',
    el: (r) => <UiToggleBlock label="Option" ripple={r} />,
    targets: '.ui-toggle-block',
  },
  {
    name: 'ui-file-upload',
    el: (r) => <UiFileUpload mode="drag" ripple={r} />,
    targets: '.ui-file-upload-zone, .ui-file-upload-toolbar .ui-button',
    reveal: pick,
  },
];

for (const c of CASES) {
  test(`${c.name} : ses cibles portent data-ripple="on", et "off" avec ripple={false}`, async () => {
    for (const ripple of [true, false]) {
      const screen = await render(c.el(ripple));
      await c.reveal?.(screen.container);

      const expected = ripple ? 'on' : 'off';
      await expect.poll(() => document.querySelectorAll(c.targets).length).toBeGreaterThan(0);
      const markers = [...document.querySelectorAll(c.targets)].map((el) =>
        el.getAttribute('data-ripple'),
      );
      expect(
        markers.every((m) => m === expected),
        `${c.name}: ${markers.join(',')}`,
      ).toBe(true);

      await screen.unmount();
    }
  });
}

test('ui-bottom-tab-bar : la prop de la barre coupe les onglets, pas l’action surélevée', async () => {
  const screen = await render(
    <UiBottomTabBar defaultValue="a" ripple={false} contained>
      <UiBottomTab value="a" label="Accueil" icon="house" />
      <UiBottomTabAction aria-label="Nouveau" />
    </UiBottomTabBar>,
  );

  expect(screen.container.querySelector('.ui-bottom-tab')).toHaveAttribute('data-ripple', 'off');
  expect(screen.container.querySelector('.ui-bottom-tab-action')).toHaveAttribute(
    'data-ripple',
    'on',
  );
});

test('ui-toggle-block : désactivé ou en lecture seule, le bloc ne réclame plus d’onde', async () => {
  const screen = await render(<UiToggleBlock label="Option" disabled />);
  expect(screen.container.querySelector('.ui-toggle-block')).toHaveAttribute('data-ripple', 'off');

  await screen.rerender(<UiToggleBlock label="Option" readOnly />);
  expect(screen.container.querySelector('.ui-toggle-block')).toHaveAttribute('data-ripple', 'off');
});

test('de bout en bout : sous UiRippleProvider, une pression sur un UiButton fait une onde sur son <button>', async () => {
  const screen = await render(
    <UiRippleProvider>
      <UiButton label="Valider" />
      <UiButton label="Sans onde" ripple={false} />
    </UiRippleProvider>,
  );
  const [avec, sans] = [
    ...screen.container.querySelectorAll<HTMLButtonElement>('button.ui-button'),
  ];

  for (const el of [avec!, sans!]) {
    const box = el.getBoundingClientRect();
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        button: 0,
        clientX: box.left + 5,
        clientY: box.top + 5,
      }),
    );
  }

  expect(avec!.querySelector(':scope > .ui-ripple-layer > .ui-ripple-ink')).not.toBeNull();
  expect(sans!.querySelector('.ui-ripple-layer')).toBeNull();
});
