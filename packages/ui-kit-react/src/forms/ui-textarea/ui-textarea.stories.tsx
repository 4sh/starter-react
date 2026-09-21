import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiTextarea } from './ui-textarea';

const meta: Meta<typeof UiTextarea> = {
  title: 'Components/ui/forms/ui-textarea',
  component: UiTextarea,
  args: {
    label: 'Commentaire',
    rows: 3,
    resize: 'vertical',
    autoResize: false,
    showCount: false,
    size: 'default',
    level: 'default',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    rows: { control: { type: 'number', min: 1, max: 12 } },
    resize: { control: 'inline-radio', options: ['none', 'vertical', 'horizontal', 'both'] },
    autoResize: { control: 'boolean' },
    showCount: { control: 'boolean' },
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
    <div style={{ width: 360 }}>
      <UiTextarea {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof UiTextarea>;

export const Default: Story = {};
export const WithHelper: Story = { args: { helperText: 'Dites-nous ce que vous en pensez.' } };
export const WithPlaceholder: Story = { args: { placeholder: 'Votre message…' } };

/** Le compteur se pose dans le pied de la coquille, à côté du message. */
export const WithCount: Story = {
  args: { showCount: true, maxLength: 200, helperText: 'Deux cents caractères au maximum.' },
};

/** La boîte grandit avec le contenu, et la poignée manuelle disparaît. */
export const AutoResize: Story = {
  args: {
    autoResize: true,
    defaultValue: 'Une première ligne.\nUne deuxième.\nUne troisième, pour voir la boîte grandir.',
  },
};

export const NoResize: Story = { args: { resize: 'none' } };
export const Rows6: Story = { args: { rows: 6 } };
export const Small: Story = { args: { size: 'small' } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Non modifiable.' } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: 'Lecture seule.' } };

export const Invalid: Story = {
  args: {
    invalid: true,
    helperText: 'Dites-nous ce que vous en pensez.',
    errorText: 'Le commentaire est obligatoire.',
  },
};

export const FloatLabel: Story = { args: { floatLabel: 'on' } };
