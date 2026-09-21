import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiSkeleton } from './ui-skeleton';

const meta: Meta<typeof UiSkeleton> = {
  title: 'Components/ui/informative/ui-skeleton',
  component: UiSkeleton,
  args: {
    shape: 'text',
    size: 'default',
    animation: 'wave',
  },
  argTypes: {
    shape: { control: 'inline-radio', options: ['text', 'circle', 'rectangle'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    animation: { control: 'inline-radio', options: ['wave', 'pulse', 'none'] },
    width: { control: 'text' },
    height: { control: 'text' },
    borderRadius: { control: 'text' },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=258-1585',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiSkeleton>;

export const Default: Story = {};

export const Shapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-lg)' }}>
      <UiSkeleton {...args} shape="circle" />
      <UiSkeleton {...args} shape="rectangle" />
      <UiSkeleton {...args} shape="text" />
    </div>
  ),
};

export const Pulse: Story = { args: { animation: 'pulse', shape: 'rectangle' } };
export const Static: Story = { args: { animation: 'none', shape: 'rectangle' } };
export const Small: Story = { args: { size: 'small', shape: 'circle' } };

/** `width`, `height` et `borderRadius` remplacent les dimensions de la forme. */
export const CustomSize: Story = {
  args: { shape: 'rectangle', width: '320px', height: '48px', borderRadius: '4px' },
};

/**
 * Un groupe de blocs esquisse la mise en page à venir. C'est le conteneur qui
 * porte `aria-busy` et le nom de la région, pas les blocs : eux sont masqués
 * aux lecteurs d'écran.
 */
export const CardPlaceholder: Story = {
  render: (args) => (
    <div
      // `role="status"` et pas un div nu : `aria-label` est interdit sur un
      // élément sans rôle, et le rôle fait en plus annoncer la fin d'attente.
      role="status"
      aria-busy="true"
      aria-label="Chargement du profil"
      style={{ display: 'flex', gap: 'var(--units-lg)', width: 360 }}
    >
      <UiSkeleton {...args} shape="circle" size="small" />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--units-sm)',
          flex: '1 1 auto',
        }}
      >
        <UiSkeleton {...args} shape="text" width="100%" />
        <UiSkeleton {...args} shape="text" width="60%" size="small" />
        <UiSkeleton {...args} shape="text" width="80%" size="small" />
      </div>
    </div>
  ),
};
