import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiIcon } from '../../base/ui-icon';

import { UiToggle } from './ui-toggle';

const meta: Meta<typeof UiToggle> = {
  title: 'Components/ui/forms/ui-toggle',
  component: UiToggle,
  args: {
    label: 'Notifications',
    labelPosition: 'after',
    size: 'default',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    labelPosition: { control: 'inline-radio', options: ['before', 'after'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    value: { control: false },
    onValueChange: { control: false },
    renderHandle: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiToggle>;

export const Default: Story = {};
export const On: Story = { args: { defaultValue: true } };
export const Small: Story = { args: { size: 'small', defaultValue: true } };
export const LabelBefore: Story = { args: { labelPosition: 'before' } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledOn: Story = { args: { disabled: true, defaultValue: true } };
export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: true, label: 'Verrouillé' },
};
export const Invalid: Story = { args: { invalid: true, required: true } };

/** Sans libellé, l'interrupteur doit porter un nom accessible explicite. */
export const WithoutLabel: Story = {
  args: { label: undefined, 'aria-label': 'Activer les notifications' },
};

/**
 * La pastille accepte un rendu personnalisé, qui reçoit l'état : c'est ce qui
 * remplace le `<ng-template>` à contexte de la version Angular.
 */
export const CustomHandle: Story = {
  args: {
    defaultValue: true,
    renderHandle: ({ checked }) => (
      <UiIcon
        name={checked ? 'check' : 'xmark'}
        size="sm"
        style={{ ['--ui-icon-size' as string]: '10px' }}
      />
    ),
  },
};

/** Le modèle n'est pas forcément booléen, comme pour `ui-checkbox`. */
export const CustomValues: Story = {
  args: { label: 'Mode', trueValue: 'on', falseValue: 'off', defaultValue: 'on' },
};
