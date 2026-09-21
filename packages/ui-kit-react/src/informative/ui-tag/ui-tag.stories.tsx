import type { Meta, StoryObj } from '@storybook/react-vite';

import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';

import { UiTag } from './ui-tag';

const LEVELS: UiFeedbackLevel[] = ['default', 'highlight', 'success', 'warning', 'error'];
const SUBLEVELS: UiSubLevel[] = ['high', 'low'];

const meta: Meta<typeof UiTag> = {
  title: 'Components/ui/informative/ui-tag',
  component: UiTag,
  args: {
    label: 'Brouillon',
    level: 'default',
    subLevel: 'high',
    size: 'default',
    rounded: true,
  },
  argTypes: {
    label: { control: 'text' },
    level: { control: 'select', options: LEVELS },
    subLevel: { control: 'inline-radio', options: SUBLEVELS },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    iconLeft: { control: 'text' },
    iconRight: { control: 'text' },
    rounded: { control: 'boolean' },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=125-1740',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiTag>;

export const Default: Story = {};

export const Levels: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      {SUBLEVELS.map((subLevel) => (
        <div key={subLevel} style={{ display: 'flex', gap: 'var(--units-sm)' }}>
          {LEVELS.map((level) => (
            <UiTag {...args} key={level} level={level} subLevel={subLevel} label={level} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  args: { iconLeft: 'circle-check', label: 'Publié', level: 'success' },
};

export const Square: Story = { args: { rounded: false } };
export const Small: Story = { args: { size: 'small' } };

/** Sans libellé, l'icône porte le sens : elle a besoin d'un nom accessible. */
export const IconOnly: Story = {
  args: { label: undefined, iconLeft: 'lock', 'aria-label': 'Verrouillé' },
};
