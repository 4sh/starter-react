import type { Meta, StoryObj } from '@storybook/react-vite';

import type { UiFeedbackLevel } from '../../core/types';

import { UiHelper } from './ui-helper';

const LEVELS: UiFeedbackLevel[] = ['default', 'highlight', 'success', 'warning', 'error'];

const meta: Meta<typeof UiHelper> = {
  title: 'Components/ui/informative/ui-helper',
  component: UiHelper,
  args: {
    message: 'Huit caractères minimum, dont un chiffre.',
    level: 'default',
    size: 'default',
    showIcon: true,
    ariaLive: 'off',
  },
  argTypes: {
    message: { control: 'text' },
    level: { control: 'select', options: LEVELS },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    showIcon: { control: 'boolean' },
    icon: { control: 'text' },
    ariaLive: { control: 'inline-radio', options: ['off', 'polite', 'assertive'] },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiHelper>;

export const Default: Story = {};

export const Levels: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      {LEVELS.map((level) => (
        <UiHelper {...args} key={level} level={level} message={`Niveau ${level}`} />
      ))}
    </div>
  ),
};

export const WithoutIcon: Story = { args: { showIcon: false } };
export const CustomIcon: Story = { args: { icon: 'lightbulb', message: 'Astuce du jour.' } };
export const Small: Story = { args: { size: 'small' } };

/**
 * Un retour qui apparaît ou change en cours de saisie doit être annoncé :
 * sans `ariaLive`, un lecteur d'écran ne le verra jamais.
 */
export const LiveError: Story = {
  args: { level: 'error', message: 'Cette adresse est déjà utilisée.', ariaLive: 'assertive' },
};
