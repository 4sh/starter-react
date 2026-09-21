import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiIcon } from '../../base/ui-icon';

import { UiField } from './ui-field';

const meta: Meta<typeof UiField> = {
  title: 'Components/ui/forms/ui-field',
  component: UiField,
  args: {
    label: 'Adresse e-mail',
    htmlFor: 'demo-field',
    size: 'default',
    level: 'default',
    required: false,
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    message: { control: 'text' },
    prefix: { control: false },
    suffix: { control: false },
    footer: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
  // La coquille ne détient aucune valeur : le contrôle est toujours projeté.
  // Ici un `<input>` nu, pour montrer qu'elle n'en sait rien.
  render: (args) => (
    <div style={{ width: 320 }}>
      <UiField {...args}>
        <input id="demo-field" className="ui-input-native" type="email" />
      </UiField>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof UiField>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const WithMessage: Story = {
  args: { message: 'Nous ne la partagerons jamais.', messageId: 'demo-field-message' },
};
export const Error: Story = {
  args: { level: 'error', message: 'Adresse invalide.', messageId: 'demo-field-message' },
};
export const Success: Story = {
  args: { level: 'success', message: 'Adresse vérifiée.', messageId: 'demo-field-message' },
};
export const Small: Story = { args: { size: 'small' } };
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { readOnly: true } };

/** `prefix` et `suffix` encadrent le contrôle à l'intérieur de la boîte. */
export const WithAffixes: Story = {
  args: {
    prefix: <UiIcon className="ui-input-icon" name="envelope" size="md" />,
    suffix: <span className="ui-input-unit">@4sh.fr</span>,
  },
};

/** Le libellé descend dans la boîte et se relève au focus, ou dès que `filled`. */
export const FloatLabelOver: Story = { args: { floatLabel: 'over' } };
export const FloatLabelIn: Story = { args: { floatLabel: 'in' } };
export const FloatLabelOn: Story = { args: { floatLabel: 'on' } };
export const FloatLabelFilled: Story = { args: { floatLabel: 'on', filled: true } };

/** Le pied accueille ce que le message ne dit pas : un compteur, par exemple. */
export const WithFooter: Story = {
  args: {
    message: 'Deux cents caractères au maximum.',
    messageId: 'demo-field-message',
    footer: <span className="ui-helper _small">0 / 200</span>,
  },
};
