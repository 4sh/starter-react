import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiProgressBar } from './ui-progress-bar';

const meta: Meta<typeof UiProgressBar> = {
  title: 'Components/ui/informative/ui-progress-bar',
  component: UiProgressBar,
  args: {
    value: 60,
    mode: 'determinate',
    showValue: true,
    unit: '%',
    size: 'default',
    valuePosition: 'right',
    steps: 0,
    'aria-label': 'Progression du téléversement',
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    mode: { control: 'inline-radio', options: ['determinate', 'indeterminate'] },
    showValue: { control: 'boolean' },
    unit: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    valuePosition: { control: 'inline-radio', options: ['right', 'bottom', 'inside'] },
    steps: { control: 'number' },
    color: { control: 'color' },
    renderValue: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=177-2485',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiProgressBar>;

export const Default: Story = {};

export const ValuePosition: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-xl)' }}>
      {(['right', 'bottom', 'inside'] as const).map((position) => (
        <UiProgressBar {...args} key={position} valuePosition={position} />
      ))}
    </div>
  ),
};

/** Sans valeur suivie : la barre boucle tant que le traitement dure. */
export const Indeterminate: Story = { args: { mode: 'indeterminate' } };

/** Des segments discrets pour un parcours en étapes, avec « 3 / 5 » annoncé. */
export const Steps: Story = { args: { steps: 5, value: 60 } };

export const Small: Story = { args: { size: 'small' } };
export const WithoutValue: Story = { args: { showValue: false } };
export const CustomColor: Story = {
  args: { color: 'var(--informative-successhigh-surface-default)' },
};

/** `renderValue` remplace le libellé, par exemple pour afficher un volume. */
export const CustomLabel: Story = {
  args: {
    value: 42,
    renderValue: (value) => <strong>{Math.round((value / 100) * 250)} Mo sur 250</strong>,
  },
};

/** Écrêtage : une valeur hors bornes est ramenée dans l'intervalle 0-100. */
export const OutOfRange: Story = { args: { value: 140 } };
