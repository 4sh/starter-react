import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiNudger } from './ui-nudger';

const meta: Meta<typeof UiNudger> = {
  title: 'Components/ui/forms/ui-nudger',
  component: UiNudger,
  args: {
    'aria-label': 'Quantité',
    defaultValue: 3,
    step: 1,
    size: 'default',
    level: 'high',
    variant: 'filled',
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    'aria-label': { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: {
      control: 'select',
      options: ['high', 'low', 'success', 'warning', 'error'],
    },
    variant: { control: 'inline-radio', options: ['filled', 'outlined', 'ghost'] },
    onColor: { control: 'inline-radio', options: [null, 'dark', 'light'] },
    value: { control: false },
    formatValue: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2119-3184',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiNudger>;

/** La valeur vive est affichée à côté : c'est ce qui rend le contrat visible. */
function Demo({
  initial = 3,
  ...props
}: React.ComponentProps<typeof UiNudger> & { initial?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-lg)' }}>
      <UiNudger {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>{value}</code>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

export const MinMax: Story = {
  args: { min: 0, max: 5 },
  render: (args) => <Demo {...args} />,
};

export const Step: Story = {
  args: { step: 5, min: 0, max: 50 },
  render: (args) => <Demo {...args} initial={10} />,
};

/** Au minimum, seul le bouton concerné est désactivé : l'état est **dérivé** de
 *  la valeur, jamais une prop. */
export const AtMin: Story = {
  args: { min: 0, max: 10 },
  render: (args) => <Demo {...args} initial={0} />,
};

export const AtMax: Story = {
  args: { min: 0, max: 10 },
  render: (args) => <Demo {...args} initial={10} />,
};

export const Small: Story = {
  args: { size: 'small' },
  render: (args) => <Demo {...args} />,
};

export const LevelLow: Story = {
  args: { level: 'low' },
  render: (args) => <Demo {...args} />,
};

export const Outlined: Story = {
  args: { variant: 'outlined' },
  render: (args) => <Demo {...args} />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} />,
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  render: (args) => <Demo {...args} />,
};

export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => <Demo {...args} />,
};

/** `formatValue` n'habille que l'affichage : le modèle reste un nombre. */
export const Formatted: Story = {
  args: { formatValue: (v: number) => `${v} kg`, min: 0, max: 20, step: 2 },
  render: (args) => <Demo {...args} initial={6} />,
};

/** Posé sur un fond de couleur : `onColor` accorde les deux boutons. */
export const OnColor: Story = {
  args: { onColor: 'dark', variant: 'outlined' },
  render: (args) => (
    <div
      style={{
        padding: 'var(--units-lg)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--actions-high-surface-default)',
      }}
    >
      <UiNudger {...args} defaultValue={3} />
    </div>
  ),
};
