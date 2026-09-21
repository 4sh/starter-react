import type { Meta, StoryObj } from '@storybook/react-vite';

import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';

import { UiBadge } from './ui-badge';

const LEVELS: UiFeedbackLevel[] = ['default', 'highlight', 'success', 'warning', 'error'];
const SUBLEVELS: UiSubLevel[] = ['high', 'low'];

const meta: Meta<typeof UiBadge> = {
  title: 'Components/ui/informative/ui-badge',
  component: UiBadge,
  args: {
    value: 12,
    level: 'default',
    subLevel: 'high',
    size: 'default',
  },
  argTypes: {
    value: { control: 'text' },
    level: { control: 'select', options: LEVELS },
    subLevel: { control: 'inline-radio', options: SUBLEVELS },
    size: { control: 'inline-radio', options: ['default', 'small', 'large'] },
    icon: { control: 'text' },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=139-6769',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiBadge>;

export const Default: Story = {};

export const Levels: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      {SUBLEVELS.map((subLevel) => (
        <div key={subLevel} style={{ display: 'flex', gap: 'var(--units-sm)' }}>
          {LEVELS.map((level) => (
            <UiBadge {...args} key={level} level={level} subLevel={subLevel} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-sm)' }}>
      {(['small', 'default', 'large'] as const).map((size) => (
        <UiBadge {...args} key={size} size={size} />
      ))}
    </div>
  ),
};

/** Un caractère unique rend une pastille carrée, et non une capsule étirée. */
export const SingleGlyph: Story = { args: { value: 3, level: 'error' } };

export const WithIcon: Story = { args: { icon: 'check', value: 'Validé', level: 'success' } };

/** Sans texte, l'icône porte le sens : elle a besoin d'un nom accessible. */
export const IconOnly: Story = {
  args: { value: undefined, icon: 'bell', level: 'highlight', 'aria-label': '3 notifications' },
};

/** Ni texte ni icône : la pastille devient un point de notification. */
export const Dot: Story = {
  args: { value: undefined, level: 'error', 'aria-label': 'Non lu' },
};
