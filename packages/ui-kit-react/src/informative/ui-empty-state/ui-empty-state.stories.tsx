import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiEmptyState } from './ui-empty-state';

const meta: Meta<typeof UiEmptyState> = {
  title: 'Components/ui/informative/ui-empty-state',
  component: UiEmptyState,
  args: {
    title: 'Aucun résultat',
    description: "Essayez d'élargir vos filtres ou de reformuler la recherche.",
    icon: 'magnifying-glass',
    iconType: 'solid',
    size: 'default',
    showMedia: true,
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    showMedia: { control: 'boolean' },
    media: { control: false },
    actions: { control: false },
    children: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=155-5961',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiEmptyState>;

export const Default: Story = {};

/** Un état vide sans issue est une impasse : proposer la suite. */
export const WithActions: Story = {
  args: {
    actions: (
      <>
        <UiButton label="Réinitialiser les filtres" level="low" />
        <UiButton label="Nouvelle recherche" />
      </>
    ),
  },
};

/** `media` remplace le raccourci `icon` par une illustration libre. */
export const WithIllustration: Story = {
  args: {
    media: (
      <img
        src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'><rect width='120' height='80' rx='8' fill='%23ede9fe'/><circle cx='60' cy='36' r='16' fill='%237c3aed'/></svg>"
        alt=""
        width="120"
      />
    ),
    title: 'Boîte vide',
    description: 'Tout est traité. Rien ne vous attend ici.',
  },
};

export const TextOnly: Story = { args: { showMedia: false } };
export const Small: Story = { args: { size: 'small' } };

/** Le contenu libre se glisse entre la description et les actions. */
export const WithBody: Story = {
  args: {
    children: (
      <p style={{ margin: 0, fontSize: 'var(--size-typography-text-md)' }}>
        Les filtres actifs : <strong>2024</strong>, <strong>Bordeaux</strong>.
      </p>
    ),
    actions: <UiButton label="Tout effacer" level="low" size="small" />,
  },
};
