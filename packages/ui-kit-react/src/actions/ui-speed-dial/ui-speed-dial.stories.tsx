import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiSpeedDial, type UiSpeedDialItem } from './ui-speed-dial';

const ITEMS: UiSpeedDialItem[] = [
  { label: 'Modifier', icon: 'pen' },
  { label: 'Dupliquer', icon: 'copy' },
  { label: 'Partager', icon: 'share-nodes' },
  { label: 'Supprimer', icon: 'trash' },
];

/** Les actions déployées débordent largement de la boîte du déclencheur. */
const SCENE: CSSProperties = {
  minHeight: 240,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const meta: Meta<typeof UiSpeedDial> = {
  title: 'Components/ui/actions/ui-speed-dial',
  component: UiSpeedDial,
  args: {
    items: ITEMS,
    defaultOpen: true,
    type: 'linear',
    direction: 'up',
    level: 'high',
    itemLevel: 'low',
    variant: 'filled',
    size: 'default',
    'aria-label': 'Actions',
  },
  argTypes: {
    type: {
      control: 'inline-radio',
      options: ['linear', 'circle', 'semi-circle', 'quarter-circle'],
    },
    direction: {
      control: 'select',
      options: ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'],
    },
    level: { control: 'inline-radio', options: ['high', 'medium', 'low'] },
    itemLevel: { control: 'inline-radio', options: ['high', 'medium', 'low'] },
    size: { control: 'inline-radio', options: ['small', 'default', 'large'] },
    radius: { control: 'number' },
    mask: { control: 'boolean' },
    showTooltips: { control: 'boolean' },
    motion: { control: 'boolean' },
    disabled: { control: 'boolean' },
    items: { control: false },
    open: { control: false },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3707-4991',
    },
  },
  decorators: [
    (Story) => (
      <div style={SCENE}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiSpeedDial>;

/** Rendu ouvert, pour que les actions déployées se voient dans la doc. */
export const Default: Story = {};

/** `linear` empile les actions le long de `direction`, la plus proche en premier. */
export const Directions: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 64, padding: 64 }}>
      <UiSpeedDial {...args} direction="up" aria-label="Actions vers le haut" />
      <UiSpeedDial {...args} direction="down" aria-label="Actions vers le bas" />
      <UiSpeedDial {...args} direction="left" aria-label="Actions vers la gauche" />
      <UiSpeedDial {...args} direction="right" aria-label="Actions vers la droite" />
    </div>
  ),
  decorators: [(Story) => <Story />],
};

/** L'anneau entier. `radius` remplace le rayon par défaut. */
export const Circle: Story = {
  args: { type: 'circle' },
};

/** Une moitié d'arc, centrée sur `direction`. */
export const SemiCircle: Story = {
  args: { type: 'semi-circle', direction: 'up' },
};

/** Un quart d'arc, dans le coin nommé par `direction`. */
export const QuarterCircle: Story = {
  args: { type: 'quarter-circle', direction: 'up-right' },
};

/** Le masque assombrit la page, et le clic dessus referme. */
export const Mask: Story = {
  args: { mask: true },
};

/** Chaque action annonce son libellé en bulle d'aide. */
export const Tooltips: Story = {
  args: { showTooltips: true, direction: 'right' },
};

/** Le niveau des actions se règle à part de celui du déclencheur. */
export const ItemLevel: Story = {
  args: { itemLevel: 'high' },
};

/** Une icône dédiée à l'état ouvert, au lieu de faire pivoter celle de départ. */
export const CustomIcons: Story = {
  args: { showIcon: 'bars', hideIcon: 'xmark' },
};

/** Une action peut être désactivée, et le clavier la saute. */
export const DisabledItem: Story = {
  args: {
    items: [
      { label: 'Modifier', icon: 'pen' },
      { label: 'Dupliquer', icon: 'copy', disabled: true },
      { label: 'Supprimer', icon: 'trash' },
    ],
  },
};

/** Le composant entier désactivé. */
export const Disabled: Story = {
  args: { disabled: true, defaultOpen: false },
};

/** Fermé : les actions ne sont pas rendues, donc ni lues ni atteignables. */
export const Closed: Story = {
  args: { defaultOpen: false },
};
