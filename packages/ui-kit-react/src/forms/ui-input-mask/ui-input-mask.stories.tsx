import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiInputMask } from './ui-input-mask';

const meta: Meta<typeof UiInputMask> = {
  title: 'Components/ui/forms/ui-input-mask',
  component: UiInputMask,
  args: {
    label: 'Date',
    mask: '99/99/9999',
    slotChar: '_',
    unmask: false,
    size: 'default',
    level: 'default',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    mask: { control: 'text' },
    ranges: { control: 'text' },
    slotChar: { control: 'text' },
    unmask: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    value: { control: false },
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
      <UiInputMask {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof UiInputMask>;

export const Date: Story = { args: { ranges: '1-31 1-12 1900-2100', defaultValue: '12092024' } };

/** Les bornes refusent à la frappe un chiffre qui ne mènerait à aucune heure valide. */
export const Time: Story = {
  args: { label: 'Heure', mask: '99:99', ranges: '0-23 0-59', defaultValue: '1430' },
};

export const Phone: Story = {
  args: { label: 'Téléphone', mask: '99 99 99 99 99', ranges: '', defaultValue: '0612345678' },
};

export const CreditCard: Story = {
  args: { label: 'Carte', mask: '9999 9999 9999 9999', defaultValue: '4242424242424242' },
};

/** Les lettres (`a`) et l'alphanumérique (`*`) cohabitent avec les chiffres. */
export const Licence: Story = {
  args: { label: 'Immatriculation', mask: 'aa-999-aa', defaultValue: 'AB123CD' },
};

export const CustomSlotChar: Story = { args: { slotChar: '•' } };
export const WithIcon: Story = { args: { iconLeft: 'calendar', defaultValue: '0101' } };
export const WithHelper: Story = { args: { helperText: 'Format attendu : jour, mois, année.' } };
export const Small: Story = { args: { size: 'small' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '12092024' } };

export const Invalid: Story = {
  args: {
    invalid: true,
    errorText: 'Cette date est antérieure à aujourd’hui.',
    defaultValue: '01012020',
  },
};

export const FloatLabel: Story = { args: { floatLabel: 'on', defaultValue: '12092024' } };
