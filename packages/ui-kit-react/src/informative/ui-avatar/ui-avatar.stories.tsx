import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiBadge } from '../ui-badge';

import { UiAvatar } from './ui-avatar';

// Portrait embarqué en data URI : une story ne doit pas dépendre du réseau,
// sinon elle échoue hors ligne et fait échouer le contrôle axe avec elle.
const PORTRAIT =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA5NiA5Nic+PHJlY3Qgd2lkdGg9Jzk2JyBoZWlnaHQ9Jzk2JyBmaWxsPScjN2MzYWVkJy8+PGNpcmNsZSBjeD0nNDgnIGN5PSczOCcgcj0nMTcnIGZpbGw9JyNlZGU5ZmUnLz48cGF0aCBkPSdNMTQgOTZjMC0xOSAxNS0zMCAzNC0zMHMzNCAxMSAzNCAzMHonIGZpbGw9JyNlZGU5ZmUnLz48L3N2Zz4=';

const meta: Meta<typeof UiAvatar> = {
  title: 'Components/ui/informative/ui-avatar',
  component: UiAvatar,
  args: {
    label: 'RL',
    icon: 'user',
    size: 'default',
    shape: 'circle',
  },
  argTypes: {
    image: { control: 'text' },
    alt: { control: 'text' },
    label: { control: 'text' },
    icon: { control: 'text' },
    size: { control: 'inline-radio', options: ['tiny', 'small', 'default', 'large'] },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
    badge: { control: false },
    onImageError: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiAvatar>;

export const Default: Story = {};

/** Le mode se déduit des props, dans l'ordre image, libellé, icône. */
export const Modes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-lg)' }}>
      <UiAvatar {...args} image={PORTRAIT} alt="Portrait de Camille" />
      <UiAvatar {...args} label="RL" />
      <UiAvatar {...args} label={undefined} aria-label="Utilisateur anonyme" />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-lg)' }}>
      {(['tiny', 'small', 'default', 'large'] as const).map((size) => (
        <UiAvatar {...args} key={size} size={size} />
      ))}
    </div>
  ),
};

export const Square: Story = { args: { shape: 'square' } };

/** Un `ui-badge` posé en haut à droite indique un statut. */
export const WithBadge: Story = {
  args: {
    image: PORTRAIT,
    alt: 'Portrait de Camille',
    badge: <UiBadge level="success" size="small" aria-label="En ligne" />,
  },
};

/**
 * Une image qui échoue à charger fait retomber l'avatar sur le mode suivant,
 * ici les initiales.
 */
export const BrokenImage: Story = {
  args: { image: 'https://exemple.invalid/absente.png', alt: 'Portrait', label: 'RL' },
};
