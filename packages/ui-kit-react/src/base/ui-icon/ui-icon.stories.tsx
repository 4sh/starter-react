import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiIcon, type UiIconSize } from './ui-icon';

const SIZES: UiIconSize[] = ['sm', 'md', 'default', 'lg', 'xl'];

const meta: Meta<typeof UiIcon> = {
  // Même arborescence que le Storybook Angular : c'est un invariant du
  // Dual-Engine, la doc des deux stacks doit se lire au même endroit.
  title: 'Components/ui/base/ui-icon',
  component: UiIcon,
  // Pas de `tags: ['autodocs']` : la page de doc est le MDX co-localisé.
  // Les deux ensemble produisent deux entrées de doc au même identifiant,
  // et Storybook échoue à l'indexation.
  // ⚠️ Un `argTypes` sans `args` correspondant laisse la prop à `undefined`
  // dans le rendu : c'est la valeur par défaut déclarée dans la signature du
  // composant qui reprend la main. On déclare donc systématiquement les deux.
  args: {
    name: 'circle-user',
    size: 'default',
    type: 'solid',
    decorative: true,
  },
  argTypes: {
    name: { control: 'text' },
    size: { control: 'select', options: SIZES },
    type: { control: 'inline-radio', options: ['solid', 'outline'] },
    decorative: { control: 'boolean' },
    family: { control: 'text' },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiIcon>;

export const Solid: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-lg)' }}>
      {SIZES.map((size) => (
        <UiIcon {...args} key={size} size={size} />
      ))}
    </div>
  ),
};

/**
 * Une icône qui porte du sens à elle seule sort du mode décoratif et reçoit un
 * nom accessible : elle rend alors `role="img"` au lieu de `aria-hidden`.
 */
export const Meaningful: Story = {
  args: {
    name: 'triangle-exclamation',
    decorative: false,
    'aria-label': 'Attention',
  },
};

/**
 * `--ui-icon-size` pousse un exemplaire hors de l'échelle, sans toucher à son
 * `size`. C'est le point d'extension qu'un composant parent utilise pour
 * dimensionner l'icône qu'on lui projette.
 */
export const CustomSize: Story = {
  args: { name: 'star' },
  render: (args) => (
    <UiIcon
      {...args}
      style={{ ['--ui-icon-size' as string]: '64px', color: 'var(--actions-high-surface-default)' }}
    />
  ),
};
