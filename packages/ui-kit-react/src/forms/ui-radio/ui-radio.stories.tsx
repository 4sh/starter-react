import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiRadio } from './ui-radio';

const meta: Meta<typeof UiRadio> = {
  title: 'Components/ui/forms/ui-radio',
  component: UiRadio,
  args: {
    label: 'Moyen',
    value: 'm',
    name: 'taille',
    required: false,
    disabled: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    value: { control: false },
    groupValue: { control: false },
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
type Story = StoryObj<typeof UiRadio>;

export const Default: Story = {};
export const Checked: Story = { args: { groupValue: 'm' } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { disabled: true, groupValue: 'm' } };
export const Invalid: Story = { args: { invalid: true, required: true } };

/** Sans libellé, le bouton doit porter un nom accessible explicite. */
export const WithoutLabel: Story = {
  args: { label: undefined, 'aria-label': 'Taille moyenne' },
};

/**
 * **Non contrôlé** : aucun état React. Le même `name` sur tous les membres
 * suffit : c'est le navigateur qui tient l'exclusivité, et la navigation aux
 * flèches vient avec.
 */
export const UncontrolledGroup: Story = {
  render: () => (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ marginBottom: 'var(--units-sm)' }}>Taille</legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
        <UiRadio name="taille-nc" value="s" label="Petit" defaultChecked />
        <UiRadio name="taille-nc" value="m" label="Moyen" />
        <UiRadio name="taille-nc" value="l" label="Grand" />
      </div>
    </fieldset>
  ),
};

/**
 * **Contrôlé** : le parent détient la valeur du groupe et la passe à chaque
 * membre. Le bouton dont la `value` lui est égale est sélectionné.
 */
function ControlledGroup() {
  const [taille, setTaille] = useState('m');
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ marginBottom: 'var(--units-sm)' }}>Taille, choix : {taille}</legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
        {[
          { value: 's', label: 'Petit' },
          { value: 'm', label: 'Moyen' },
          { value: 'l', label: 'Grand' },
        ].map((option) => (
          <UiRadio
            key={option.value}
            name="taille-c"
            value={option.value}
            label={option.label}
            groupValue={taille}
            onValueChange={setTaille}
          />
        ))}
      </div>
    </fieldset>
  );
}

export const Controlled: Story = { render: () => <ControlledGroup /> };
