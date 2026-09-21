import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiCheckbox } from './ui-checkbox';

const meta: Meta<typeof UiCheckbox> = {
  title: 'Components/ui/forms/ui-checkbox',
  component: UiCheckbox,
  args: {
    label: 'J’accepte les conditions',
    indeterminate: false,
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    indeterminate: { control: 'boolean' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    checkIcon: { control: 'text' },
    value: { control: false },
    onValueChange: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiCheckbox>;

export const Default: Story = {};
export const Checked: Story = { args: { defaultValue: true } };

/**
 * L'état indéterminé est purement **visuel** : le modèle garde sa valeur, et
 * l'état ne se déduit jamais tout seul. C'est au parent de savoir que sa
 * sélection est partielle.
 */
export const Indeterminate: Story = { args: { indeterminate: true, label: 'Tout sélectionner' } };

export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { disabled: true, defaultValue: true } };

/** La case reste focalisable mais ne bascule plus, et l'annonce par `aria-readonly`. */
export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: true, label: 'Verrouillé' },
};

export const Invalid: Story = { args: { invalid: true, required: true } };

/** Sans libellé, la case doit porter un nom accessible explicite. */
export const WithoutLabel: Story = {
  args: { label: undefined, 'aria-label': 'Sélectionner cette ligne' },
};

/** Une icône différente, sans toucher au comportement. */
export const CustomIcon: Story = { args: { checkIcon: 'star', defaultValue: true } };

/**
 * Le modèle n'est pas forcément booléen : `trueValue` et `falseValue` lui font
 * porter n'importe quelle paire. C'est la raison pour laquelle la prop s'appelle
 * `value` et non `checked`.
 */
export const CustomValues: Story = {
  args: { label: 'Newsletter', trueValue: 'oui', falseValue: 'non', defaultValue: 'oui' },
};

/** Plusieurs cases partageant un `name` : le formulaire natif les regroupe. */
export const Group: Story = {
  render: () => (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ marginBottom: 'var(--units-sm)' }}>Centres d’intérêt</legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
        <UiCheckbox name="interets" label="Design" defaultValue />
        <UiCheckbox name="interets" label="Développement" />
        <UiCheckbox name="interets" label="Accessibilité" />
      </div>
    </fieldset>
  ),
};
