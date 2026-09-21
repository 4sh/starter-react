import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiInputDate, type InputDateValue } from './ui-input-date';

const meta: Meta<typeof UiInputDate> = {
  title: 'Components/ui/forms/ui-input-date',
  component: UiInputDate,
  args: {
    label: 'Date de naissance',
    mode: 'date',
    valueType: 'date',
    showIcon: true,
    size: 'default',
    level: 'default',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    mode: { control: 'inline-radio', options: ['date', 'time', 'datetime'] },
    valueType: { control: 'inline-radio', options: ['date', 'iso'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    icon: { control: 'text' },
    iconAriaLabel: { control: 'text' },
    value: { control: false },
    defaultValue: { control: false },
    onValueChange: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <UiInputDate {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof UiInputDate>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: new Date(2026, 8, 14) } };
export const WithHelper: Story = {
  args: { helperText: 'Le sélecteur est celui de votre système.' },
};

export const Time: Story = { args: { label: 'Heure', mode: 'time', defaultValue: '09:30' } };
export const DateTime: Story = {
  args: { label: 'Rendez-vous', mode: 'datetime', defaultValue: '2026-09-14T09:30' },
};

export const Bounded: Story = {
  args: {
    label: 'Réservation',
    min: '2026-01-01',
    max: '2026-12-31',
    helperText: 'Hors bornes, le navigateur refuse la valeur.',
  },
};

export const CustomIcon: Story = {
  args: { label: 'Échéance', icon: 'calendar-day', helperText: "L'icône se remplace par `icon`." },
};
export const NoIcon: Story = { args: { label: 'Date', showIcon: false } };

export const FloatLabel: Story = { args: { floatLabel: 'on' } };
export const Small: Story = { args: { size: 'small', defaultValue: new Date(2026, 8, 14) } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true, defaultValue: new Date(1990, 4, 17) } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: new Date(1990, 4, 17) } };
export const Error: Story = {
  args: { invalid: true, errorText: 'Date obligatoire.', required: true },
};

function IsoDemo(args: React.ComponentProps<typeof UiInputDate>) {
  const [value, setValue] = useState<InputDateValue>('2026-09-14');
  return (
    <div style={{ width: 320 }}>
      <UiInputDate {...args} value={value} onValueChange={setValue} />
      <p style={{ marginTop: 12, fontFamily: 'monospace' }}>{JSON.stringify(value)}</p>
    </div>
  );
}

export const Iso: Story = {
  args: { label: 'Date (ISO)', valueType: 'iso' },
  render: (args) => <IsoDemo {...args} />,
};
