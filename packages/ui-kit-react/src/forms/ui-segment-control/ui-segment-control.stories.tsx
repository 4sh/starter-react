import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiIcon } from '../../base/ui-icon';

import {
  UiSegmentControl,
  type SegmentControlValue,
  type UiSegmentControlProps,
} from './ui-segment-control';

const VUES = ['Liste', 'Grille', 'Tableau'];

const AVEC_ICONES = [
  { value: 'list', label: 'Liste', icon: 'list' },
  { value: 'grid', label: 'Grille', icon: 'table-cells' },
  { value: 'map', label: 'Carte', icon: 'map' },
];

const ICONES_SEULES = [
  { value: 'left', icon: 'align-left', ariaLabel: 'Aligner à gauche' },
  { value: 'center', icon: 'align-center', ariaLabel: 'Centrer' },
  { value: 'right', icon: 'align-right', ariaLabel: 'Aligner à droite' },
];

const OBJETS = [
  { id: 1, nom: 'Jour' },
  { id: 2, nom: 'Semaine' },
  { id: 3, nom: 'Mois', inactif: true },
];

const meta: Meta<UiSegmentControlProps<string>> = {
  title: 'Components/ui/forms/ui-segment-control',
  component: UiSegmentControl,
  args: {
    'aria-label': 'Affichage',
    options: VUES,
    multiple: false,
    allowEmpty: true,
    size: 'default',
    orientation: 'horizontal',
    fluid: false,
    motion: true,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    'aria-label': { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    options: { control: false },
    value: { control: false },
    defaultValue: { control: false },
    renderItem: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2119-3188',
    },
  },
};

export default meta;
type Story = StoryObj<UiSegmentControlProps<string>>;

function Demo({
  initial = 'Liste',
  ...props
}: UiSegmentControlProps<string> & { initial?: SegmentControlValue<string> }) {
  const [value, setValue] = useState<SegmentControlValue<string>>(initial);
  return (
    // Parent en colonne VOLONTAIREMENT : c'est le cas qui étirait la piste, et
    // le composant doit s'y tenir à son contenu de lui-même.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--units-md)',
        width: 420,
      }}
    >
      <UiSegmentControl<string> {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>
        {Array.isArray(value) ? `[${value.join(', ')}]` : (value ?? 'null')}
      </code>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

export const WithIcons: Story = {
  args: { options: AVEC_ICONES },
  render: (args) => <Demo {...args} initial="grid" />,
};

/** Icône seule : `ariaLabel` sur l'option devient indispensable. */
export const IconOnly: Story = {
  args: { options: ICONES_SEULES, 'aria-label': 'Alignement' },
  render: (args) => <Demo {...args} initial="center" />,
};

/** Options objet : `optionLabel` et `optionValue` disent comment les lire. */
export const ObjectOptions: Story = {
  args: {
    options: OBJETS as never,
    optionLabel: 'nom',
    optionValue: 'id',
    optionDisabled: 'inactif',
    'aria-label': 'Période',
  },
  render: (args) => <Demo {...args} initial={2 as never} />,
};

/** `multiple` : le modèle devient un tableau, et l'indicateur cède la place. */
export const Multiple: Story = {
  args: { multiple: true, options: AVEC_ICONES },
  render: (args) => <Demo {...args} initial={['list', 'map']} />,
};

/** `allowEmpty={false}` : recliquer le segment choisi ne le vide plus. */
export const NoEmpty: Story = {
  args: { allowEmpty: false },
  render: (args) => <Demo {...args} />,
};

export const Small: Story = {
  args: { size: 'small' },
  render: (args) => <Demo {...args} />,
};

export const Fluid: Story = {
  args: { fluid: true },
  render: (args) => <Demo {...args} />,
};

/** En vertical, ce sont les flèches haut et bas qui naviguent. */
export const Vertical: Story = {
  args: { orientation: 'vertical', options: AVEC_ICONES },
  render: (args) => <Demo {...args} initial="list" />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} />,
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  render: (args) => <Demo {...args} />,
};

export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => <Demo {...args} initial={null} />,
};

/** Sans animation : l'indicateur saute au lieu de glisser. */
export const NoMotion: Story = {
  args: { motion: false },
  render: (args) => <Demo {...args} />,
};

/** `renderItem` remplace le contenu, jamais le bouton. */
export const CustomItem: Story = {
  args: {
    options: AVEC_ICONES,
    renderItem: ({ option, selected }) => {
      const o = option as unknown as (typeof AVEC_ICONES)[number];
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--units-xs)' }}>
          <UiIcon name={o.icon} size="sm" />
          <span style={{ fontWeight: selected ? 700 : 400 }}>{o.label}</span>
          {selected && <UiIcon name="check" size="sm" />}
        </span>
      );
    },
  },
  render: (args) => <Demo {...args} initial="grid" />,
};
