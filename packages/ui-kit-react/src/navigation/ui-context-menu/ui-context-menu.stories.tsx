import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { UiTag } from '../../informative/ui-tag';
import type { UiMenuItem } from '../ui-menu';

import {
  UiContextMenu,
  type UiContextMenuProps,
  type UiContextMenuZoneProps,
} from './ui-context-menu';

const meta: Meta<UiContextMenuProps> = {
  title: 'Components/ui/navigation/ui-context-menu',
  component: UiContextMenu,
  args: {
    level: 'high',
    size: 'small',
    submenus: 'flyout',
    global: false,
    triggerEvent: 'contextmenu',
    motionDisabled: false,
  },
  argTypes: {
    items: { control: false },
    trigger: { control: false },
    renderItem: { control: false },
    renderHeader: { control: false },
    level: { control: 'inline-radio', options: ['high', 'low'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    submenus: { control: 'inline-radio', options: ['flyout', 'inline'] },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3094-10720',
    },
  },
};

export default meta;
type Story = StoryObj<UiContextMenuProps>;

const ZONE: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: '100%',
  minHeight: 160,
  padding: 'var(--units-lg)',
  border: '2px dashed var(--global-border-default)',
  borderRadius: 'var(--radius-default)',
  background: 'none',
  color: 'var(--global-text-subtle)',
  font: 'inherit',
};

/**
 * La zone de démonstration est un vrai `<button>`, et ce n'est pas cosmétique :
 * le navigateur n'émet `contextmenu` au clavier (`Maj+F10`, touche Menu) que
 * sur un élément focalisable. Une zone non focalisable rend le menu accessible
 * à la souris seulement.
 */
function Zone({ ref, label = 'Clic droit ici' }: UiContextMenuZoneProps & { label?: string }) {
  return (
    <button type="button" ref={ref} style={ZONE}>
      {label}
    </button>
  );
}

const ITEMS: UiMenuItem[] = [
  { label: 'Ouvrir', icon: 'folder-open' },
  { label: 'Renommer', icon: 'pen' },
  {
    label: 'Exporter',
    icon: 'file-export',
    items: [
      { label: 'PDF', icon: 'file-pdf' },
      { label: 'CSV', icon: 'file-csv' },
    ],
  },
  { separator: true },
  { label: 'Supprimer', icon: 'trash' },
];

/**
 * Clic droit dans la zone. Le panneau se pose sur le pointeur, et la zone est
 * focalisable : `Maj+F10` et la touche Menu ouvrent donc le menu au clavier,
 * l'événement `contextmenu` étant émis par le navigateur lui-même.
 */
export const Basic: Story = {
  render: (args) => (
    <UiContextMenu
      {...args}
      items={ITEMS}
      aria-label="Actions du fichier"
      trigger={(props) => <Zone {...props} />}
    />
  ),
  // Le menu est fermé au repos, donc invisible au contrôle d'accessibilité.
  // `play` tourne AVANT ce contrôle : l'ouvrir ici est donc ce qui met son
  // contenu sous ses yeux. Vérifié en y injectant une violation, qui a bien
  // fait échouer la story.
  play: async ({ canvasElement }) => {
    const zone = canvasElement.querySelector('button') as HTMLElement;
    const box = zone.getBoundingClientRect();
    zone.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: Math.round(box.left + 24),
        clientY: Math.round(box.top + 24),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
  },
};

/** `submenus="inline"` rend les groupes en sections dans le panneau. */
export const Inline: Story = {
  args: { submenus: 'inline' },
  render: (args) => (
    <UiContextMenu
      {...args}
      items={ITEMS}
      aria-label="Actions du fichier"
      trigger={(props) => <Zone {...props} />}
    />
  ),
};

/** `global` attache l'écouteur au document : le clic droit ouvre partout. */
export const Global: Story = {
  args: { global: true },
  render: (args) => (
    <div style={{ ...ZONE, borderStyle: 'solid' }}>
      Clic droit n&apos;importe où sur la page
      <UiContextMenu {...args} items={ITEMS} aria-label="Actions de la page" />
    </div>
  ),
};

/** Densité `default`, pour un menu contextuel de contenu plutôt que d'action. */
export const Default: Story = {
  args: { size: 'default' },
  render: (args) => (
    <UiContextMenu
      {...args}
      items={ITEMS}
      aria-label="Actions du fichier"
      trigger={(props) => <Zone {...props} />}
    />
  ),
};

/** `onItemClick` reçoit chaque activation, y compris celles des sous-menus. */
function CommandDemo(props: UiContextMenuProps) {
  const [dernier, setDernier] = useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: 'var(--units-md)' }}>
      <UiContextMenu
        {...props}
        items={ITEMS}
        aria-label="Actions du fichier"
        onItemClick={({ item }) => setDernier(item.label ?? null)}
        trigger={(zone) => <Zone {...zone} />}
      />
      {dernier ? <UiTag label={dernier} level="highlight" /> : <span>Aucune action</span>}
    </div>
  );
}

export const Command: Story = { render: (args) => <CommandDemo {...args} /> };
