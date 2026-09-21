import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiSpinner } from './ui-spinner';

const meta: Meta<typeof UiSpinner> = {
  title: 'Components/ui/informative/ui-spinner',
  component: UiSpinner,
  args: {
    size: 'default',
    orientation: 'vertical',
    strokeWidth: 4,
    fill: 'none',
    animationDuration: '1.2s',
    delay: 0,
    imageAlt: '',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'small'] },
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    label: { control: 'text' },
    icon: { control: 'text' },
    image: { control: 'text' },
    strokeWidth: { control: 'number' },
    fill: { control: 'text' },
    animationDuration: { control: 'text' },
    delay: { control: 'number' },
    renderMark: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2171-3339',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiSpinner>;

export const Default: Story = {};

export const WithLabel: Story = { args: { label: 'Chargement des données' } };

export const Horizontal: Story = {
  args: { label: 'Chargement', orientation: 'horizontal' },
};

export const Small: Story = { args: { size: 'small' } };

/** Le marqueur se remplace par une icône, que le composant fait tourner. */
export const IconMark: Story = { args: { icon: 'circle-notch' } };

/** Un trait épais et un remplissage donnent un disque plutôt qu'un anneau. */
export const ThickRing: Story = { args: { strokeWidth: 8 } };

export const Slow: Story = { args: { animationDuration: '3s' } };

/**
 * Sous le délai de grâce, rien ne s'affiche : c'est ce qui évite de faire
 * clignoter un loader pour une attente de 200 ms.
 */
export const Delayed: Story = { args: { delay: 800, label: 'Après 800 ms' } };

/** `renderMark` remplace entièrement le marqueur. */
export const CustomMark: Story = {
  args: {
    label: 'Envoi',
    renderMark: () => <span style={{ fontSize: '1.5rem' }}>⏳</span>,
  },
};
