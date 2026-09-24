import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiLabel } from './ui-label';

const meta: Meta<typeof UiLabel> = {
  title: 'Components/ui/forms/ui-label',
  component: UiLabel,
  args: { label: 'Adresse e-mail', required: false, size: 'default', disabled: false },
  argTypes: {
    label: { control: 'text' },
    required: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    disabled: { control: 'boolean' },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiLabel>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Small: Story = { args: { size: 'small' } };
export const Disabled: Story = { args: { disabled: true } };

/**
 * La couleur du texte lit `--ui-label-color` en premier : un composant parent
 * pilote l'état du libellé sans avoir à écrire de sélecteur qui le traverse.
 *
 * ⚠️ Un jeton de **contenu**, pas de **surface** : le contrôle axe a refusé la
 * première version de cette story, qui posait une couleur de fond comme couleur
 * de texte. Les jetons `*-surface-*` ne sont pas calibrés pour porter du texte.
 */
export const DrivenByParent: Story = {
  render: (args) => (
    <div style={{ ['--ui-label-color' as string]: 'var(--informative-errorlow-content-default)' }}>
      <UiLabel {...args} />
    </div>
  ),
};
