import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiInput } from './ui-input';

const meta: Meta<typeof UiInput> = {
  title: 'Components/ui/forms/ui-input',
  component: UiInput,
  args: {
    label: 'Adresse e-mail',
    type: 'text',
    size: 'default',
    level: 'default',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    type: { control: 'select', options: ['text', 'password', 'email', 'tel', 'url', 'search'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    iconLeft: { control: 'text' },
    iconRight: { control: 'text' },
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
      <UiInput {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof UiInput>;

export const Default: Story = {};
export const WithPlaceholder: Story = { args: { placeholder: 'prenom.nom@4sh.fr' } };
export const WithHelper: Story = { args: { helperText: 'Nous ne la partagerons jamais.' } };
export const Required: Story = { args: { required: true } };
export const Small: Story = { args: { size: 'small' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'ada@4sh.fr' } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: 'ada@4sh.fr' } };

/** `errorText` remplace le texte d'aide dès que le champ passe en erreur. */
export const Invalid: Story = {
  args: {
    invalid: true,
    helperText: 'Nous ne la partagerons jamais.',
    errorText: 'Cette adresse est déjà utilisée.',
  },
};

export const WithIcons: Story = { args: { iconLeft: 'envelope', iconRight: 'circle-check' } };
export const WithUnit: Story = { args: { label: 'Remise', unit: '%', defaultValue: '15' } };

/**
 * L'icône de droite devient une **zone d'action** dès qu'elle porte un nom
 * accessible. C'est ce mécanisme qui sert à révéler un mot de passe ou à vider
 * une recherche, sans prop dédiée.
 */
// Les stories à état déclarent un vrai composant : `useState` dans un `render`
// enfreint les règles des hooks, et le linter a raison de le refuser : React
// n'a aucun moyen d'associer l'état à un composant qui n'en est pas un.
function PasswordDemo(args: React.ComponentProps<typeof UiInput>) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ width: 320 }}>
      <UiInput
        {...args}
        label="Mot de passe"
        type={revealed ? 'text' : 'password'}
        defaultValue="motdepasse"
        iconRight={revealed ? 'eye-slash' : 'eye'}
        iconRightAriaLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        onIconRightClick={() => setRevealed((r) => !r)}
      />
    </div>
  );
}

export const WithRightAction: Story = { render: (args) => <PasswordDemo {...args} /> };

export const FloatLabel: Story = { args: { floatLabel: 'on' } };
export const FloatLabelFilled: Story = { args: { floatLabel: 'on', defaultValue: 'ada@4sh.fr' } };

/**
 * **Contrôlé** : le parent détient la valeur. Le champ ne bouge que si le
 * parent lui en rend une nouvelle : ici en majuscules, pour rendre le contrat
 * visible.
 */
function ControlledDemo(args: React.ComponentProps<typeof UiInput>) {
  const [value, setValue] = useState('');
  return (
    <div style={{ width: 320 }}>
      <UiInput
        {...args}
        label="Code"
        value={value}
        onValueChange={(next) => setValue(next.toUpperCase())}
        helperText="Le parent met la saisie en majuscules."
      />
    </div>
  );
}

export const Controlled: Story = { render: (args) => <ControlledDemo {...args} /> };
