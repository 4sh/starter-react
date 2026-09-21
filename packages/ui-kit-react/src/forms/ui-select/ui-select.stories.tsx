import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiChip } from '../../informative/ui-chip';

import { UiSelect } from './ui-select';

const VILLES = ['Bordeaux', 'Lyon', 'Nantes', 'Paris', 'Toulouse'];

const OBJETS = [
  { id: 1, nom: 'Bordeaux', region: 'Nouvelle-Aquitaine' },
  { id: 2, nom: 'Lyon', region: 'Auvergne-Rhône-Alpes' },
  { id: 3, nom: 'Nantes', region: 'Pays de la Loire' },
  { id: 4, nom: 'Paris', region: 'Île-de-France', disabled: true },
  { id: 5, nom: 'Toulouse', region: 'Occitanie' },
];

const GROUPES = [
  { label: 'Nouvelle-Aquitaine', items: ['Bordeaux', 'Bayonne', 'La Rochelle'] },
  { label: 'Occitanie', items: ['Toulouse', 'Montpellier', 'Nîmes'] },
];

const meta: Meta<typeof UiSelect> = {
  title: 'Components/ui/forms/ui-select',
  component: UiSelect,
  args: {
    label: 'Ville',
    options: VILLES,
    placeholder: 'Choisir une ville',
    size: 'default',
    level: 'default',
    multiple: false,
    filter: false,
    showClear: false,
    checkmark: false,
    checkbox: false,
    editable: false,
    loading: false,
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
    autoFlip: true,
    focusOnHover: true,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    multiple: { control: 'boolean' },
    filter: { control: 'boolean' },
    showClear: { control: 'boolean' },
    checkmark: { control: 'boolean' },
    checkbox: { control: 'boolean' },
    editable: { control: 'boolean' },
    loading: { control: 'boolean' },
    virtualScroll: { control: 'boolean' },
    options: { control: false },
    value: { control: false },
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
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiSelect>;

export const Default: Story = {};

export const WithValue: Story = { args: { defaultValue: 'Lyon' } };

/** Les options peuvent être des objets : `optionLabel` et `optionValue` disent où lire. */
export const ObjectOptions: Story = {
  args: {
    options: OBJETS,
    optionLabel: 'nom',
    optionValue: 'id',
    defaultValue: 2,
  },
};

/** Sans `dataKey`, deux objets identiques restent distincts : la sélection se perdrait. */
export const ObjectValues: Story = {
  args: { options: OBJETS, optionLabel: 'nom', dataKey: 'id', defaultValue: OBJETS[2] },
};

export const Groups: Story = {
  args: { options: GROUPES, group: true, label: 'Ville par région' },
};

export const Multiple: Story = {
  args: { multiple: true, checkbox: true, defaultValue: ['Lyon', 'Nantes'] },
};

/** Au-delà de `maxSelectedLabels`, le reste est replié derrière un compteur. */
export const MultipleOverflow: Story = {
  args: {
    multiple: true,
    checkbox: true,
    maxSelectedLabels: 2,
    defaultValue: ['Bordeaux', 'Lyon', 'Nantes', 'Paris'],
  },
};

export const WithCheckmark: Story = { args: { checkmark: true, defaultValue: 'Nantes' } };

export const WithFilter: Story = {
  args: { filter: true, filterPlaceholder: 'Rechercher une ville' },
};

/** Le filtre ignore la casse et les accents : « ele » trouve « Élève ». */
export const FilterAccents: Story = {
  args: { filter: true, options: ['Élève', 'Écolier', 'Étudiant', 'Enseignant'], label: 'Statut' },
};

export const WithClear: Story = { args: { showClear: true, defaultValue: 'Paris' } };

export const Disabled: Story = { args: { disabled: true, defaultValue: 'Lyon' } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: 'Lyon' } };
export const Required: Story = { args: { required: true } };
export const Error: Story = { args: { invalid: true, errorText: 'Sélection obligatoire' } };
export const Small: Story = { args: { size: 'small' } };
export const Loading: Story = { args: { loading: true } };
export const FloatLabel: Story = { args: { floatLabel: 'on', placeholder: undefined } };

/** Options désactivées : la navigation clavier les saute. */
export const DisabledOptions: Story = {
  args: { options: OBJETS, optionLabel: 'nom', optionValue: 'id' },
};

/** Saisie libre : ce qui est tapé devient la valeur, et filtre la liste. */
export const Editable: Story = { args: { editable: true, showClear: true } };

/** Mille options : seule une fenêtre est rendue. */
export const VirtualScroll: Story = {
  args: {
    options: Array.from({ length: 1000 }, (_, i) => `Option ${i + 1}`),
    virtualScroll: true,
    filter: true,
    label: 'Mille options',
  },
};

// Les stories à état déclarent un vrai composant : `useState` dans un `render`
// enfreint les règles des hooks.
function ChipsDemo(args: React.ComponentProps<typeof UiSelect>) {
  const [value, setValue] = useState<unknown>(['Bordeaux', 'Lyon']);

  return (
    <UiSelect
      {...args}
      multiple
      value={value}
      onValueChange={setValue}
      renderSelectedItem={({ option, remove }) => (
        <UiChip
          label={String(option)}
          size="small"
          removable
          removeTabIndex={-1}
          removeAriaLabel={`Retirer ${String(option)}`}
          onRemove={remove}
        />
      )}
    />
  );
}

/**
 * Valeurs rendues en puces retirables. Elles vivent **hors** du bouton : leurs
 * propres boutons ne peuvent pas s'imbriquer dans un bouton.
 */
export const SelectedAsChips: Story = { render: (args) => <ChipsDemo {...args} /> };

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
      <UiSelect {...args} />
    </div>
  ),
};
