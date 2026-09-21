import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiAutocomplete } from './ui-autocomplete';

const VILLES = [
  'Bordeaux',
  'Bayonne',
  'Lyon',
  'Lille',
  'Nantes',
  'Nice',
  'Paris',
  'Pau',
  'Toulouse',
  'Tours',
];

const meta: Meta<typeof UiAutocomplete> = {
  title: 'Components/ui/forms/ui-autocomplete',
  component: UiAutocomplete,
  args: {
    label: 'Ville',
    placeholder: 'Commencez à taper',
    minLength: 1,
    delay: 300,
    size: 'default',
    level: 'default',
    multiple: false,
    unique: true,
    dropdown: false,
    forceSelection: false,
    completeOnFocus: false,
    showClear: false,
    loading: false,
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
    autoFlip: true,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    minLength: { control: 'number' },
    delay: { control: 'number' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    multiple: { control: 'boolean' },
    unique: { control: 'boolean' },
    dropdown: { control: 'boolean' },
    dropdownMode: { control: 'inline-radio', options: ['blank', 'current'] },
    forceSelection: { control: 'boolean' },
    completeOnFocus: { control: 'boolean' },
    showClear: { control: 'boolean' },
    loading: { control: 'boolean' },
    virtualScroll: { control: 'boolean' },
    suggestions: { control: false },
    value: { control: false },
    onComplete: { control: false },
    renderOption: { control: false },
    renderSelectedItem: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=125-2969',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiAutocomplete>;

// Le composant ne filtre rien : il émet une requête, et l'appelant répond en
// mettant `suggestions` à jour. C'est ce qui permet d'interroger un serveur, et
// toutes les stories passent donc par un vrai composant.
function Demo({
  source = VILLES,
  ...args
}: React.ComponentProps<typeof UiAutocomplete> & { source?: readonly string[] }) {
  const [suggestions, setSuggestions] = useState<readonly unknown[]>([]);

  return (
    <UiAutocomplete
      {...args}
      suggestions={suggestions}
      onComplete={(query) =>
        setSuggestions(
          query
            ? source.filter((v) => v.toLowerCase().startsWith(query.toLowerCase()))
            : [...source],
        )
      }
    />
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

/** Le bouton affiche toutes les suggestions, sans avoir à taper. */
export const WithDropdown: Story = {
  args: { dropdown: true },
  render: (args) => <Demo {...args} />,
};

/** `dropdownMode="current"` interroge avec la saisie au lieu d'une requête vide. */
export const DropdownFromCurrent: Story = {
  args: { dropdown: true, dropdownMode: 'current' },
  render: (args) => <Demo {...args} />,
};

/** Trois caractères avant d'interroger : de quoi épargner un serveur. */
export const MinLength: Story = {
  args: { minLength: 3, placeholder: 'Trois caractères minimum' },
  render: (args) => <Demo {...args} />,
};

/** `forceSelection` refuse le texte libre : à la sortie du champ, il est remis à zéro. */
export const ForceSelection: Story = {
  args: { forceSelection: true, dropdown: true },
  render: (args) => <Demo {...args} />,
};

/** Sélection multiple, rendue en puces retirables avec un focus glissant. */
export const Multiple: Story = {
  args: { multiple: true, dropdown: true },
  render: (args) => <Demo {...args} />,
};

/**
 * Puces presentes des le rendu. Une story qui demarre vide ne montre jamais la
 * structure des puces a axe : le controle y serait vide de sens.
 */
export const MultipleWithTags: Story = {
  args: { multiple: true, dropdown: true, defaultValue: ['Bordeaux', 'Lyon'] },
  render: (args) => <Demo {...args} />,
};

export const MultipleOverflow: Story = {
  args: { multiple: true, dropdown: true, maxSelectedLabels: 2 },
  render: (args) => <Demo {...args} />,
};

export const WithClear: Story = {
  args: { showClear: true, dropdown: true },
  render: (args) => <Demo {...args} />,
};

export const Loading: Story = { args: { loading: true }, render: (args) => <Demo {...args} /> };
export const Small: Story = {
  args: { size: 'small', dropdown: true },
  render: (args) => <Demo {...args} />,
};
export const Disabled: Story = {
  args: { disabled: true, dropdown: true },
  render: (args) => <Demo {...args} />,
};
export const Required: Story = { args: { required: true }, render: (args) => <Demo {...args} /> };
export const Error: Story = {
  args: { invalid: true, errorText: 'Ville inconnue' },
  render: (args) => <Demo {...args} />,
};
export const FloatLabel: Story = {
  args: { floatLabel: 'on', placeholder: undefined },
  render: (args) => <Demo {...args} />,
};

/** Objets en suggestions : `optionLabel` et `optionValue` disent où lire. */
function ObjectsDemo(args: React.ComponentProps<typeof UiAutocomplete>) {
  const source = VILLES.map((nom, i) => ({ id: i + 1, nom }));
  const [suggestions, setSuggestions] = useState<readonly unknown[]>([]);

  return (
    <UiAutocomplete
      {...args}
      optionLabel="nom"
      optionValue="id"
      dataKey="id"
      suggestions={suggestions}
      onComplete={(query) =>
        setSuggestions(
          query
            ? source.filter((v) => v.nom.toLowerCase().startsWith(query.toLowerCase()))
            : source,
        )
      }
    />
  );
}

export const ObjectSuggestions: Story = {
  args: { dropdown: true },
  render: (args) => <ObjectsDemo {...args} />,
};

/** Le panneau vit dans le calque supérieur : un ancêtre rogné ne le coupe pas. */
export const EscapesOverflow: Story = {
  render: (args) => (
    <div
      style={{
        width: 300,
        height: 110,
        overflow: 'hidden',
        border: '1px solid var(--global-border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--units-md)',
      }}
    >
      <Demo {...args} dropdown />
    </div>
  ),
};
