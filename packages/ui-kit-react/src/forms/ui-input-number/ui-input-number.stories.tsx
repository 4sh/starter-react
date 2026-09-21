import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiInputNumber } from './ui-input-number';

const meta: Meta<typeof UiInputNumber> = {
  title: 'Components/ui/forms/ui-input-number',
  component: UiInputNumber,
  args: {
    label: 'Quantité',
    locale: 'fr-FR',
    step: 1,
    allowDecimals: true,
    showButtons: true,
    useGrouping: true,
    size: 'default',
    level: 'default',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    allowDecimals: { control: 'boolean' },
    showButtons: { control: 'boolean' },
    useGrouping: { control: 'boolean' },
    unit: { control: 'text' },
    currency: { control: 'text' },
    locale: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    value: { control: false },
    onValueChange: { control: false },
    formatValue: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <UiInputNumber {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof UiInputNumber>;

export const Default: Story = { args: { defaultValue: 12 } };

/** Le formatage riche apparaît à la sortie du champ, pas pendant la frappe. */
export const Grouped: Story = { args: { defaultValue: 1234567 } };

export const MinMax: Story = {
  args: { label: 'Note', min: 0, max: 10, defaultValue: 7, helperText: 'De 0 à 10.' },
};

export const Step: Story = { args: { label: 'Portions', step: 5, defaultValue: 10 } };
export const WithUnit: Story = { args: { label: 'Poids', unit: 'kg', defaultValue: 72.5 } };

/** La devise porte déjà son symbole : `unit` est alors ignorée. */
export const Currency: Story = {
  args: { label: 'Prix', currency: 'EUR', minFractionDigits: 2, defaultValue: 1299.9 },
};

export const IntegersOnly: Story = {
  args: { label: 'Personnes', allowDecimals: false, min: 1, defaultValue: 2 },
};

export const WithoutButtons: Story = { args: { showButtons: false, defaultValue: 12 } };
export const Small: Story = { args: { size: 'small', defaultValue: 12 } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 12 } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: 12 } };

export const Invalid: Story = {
  args: { label: 'Note', min: 0, max: 10, invalid: true, errorText: 'La note est obligatoire.' },
};

export const FloatLabel: Story = { args: { floatLabel: 'on', defaultValue: 12 } };

/** `formatValue` remplace entièrement le formatage d'affichage. */
export const CustomFormat: Story = {
  args: {
    label: 'Durée',
    defaultValue: 95,
    formatValue: (n) => `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, '0')}`,
    helperText: 'Saisie en minutes, affichage en heures.',
  },
};

/** L'anglais groupe par virgule et sépare les décimales par un point. */
export const EnglishLocale: Story = {
  args: { locale: 'en-US', defaultValue: 1234.56, maxFractionDigits: 2 },
};
