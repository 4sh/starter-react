import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiSwatchPicker, type UiSwatch, type UiSwatchGroup } from './ui-swatch-picker';

const meta: Meta<typeof UiSwatchPicker> = {
  title: 'Components/ui/forms/ui-swatch-picker',
  component: UiSwatchPicker,
  args: {
    size: 'small',
    allowClear: true,
    popup: false,
    'aria-label': 'Couleur du texte',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'small'] },
    allowClear: { control: 'boolean' },
    popup: { control: false },
    palette: { control: false },
    trigger: { control: false },
    value: { control: false },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3727-36720',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiSwatchPicker>;

/** La palette par défaut, posée dans la page. */
export const Default: Story = {
  args: { size: 'default', allowClear: false, defaultValue: 'primary-500' },
};

/** Densité resserrée, pour une barre d'outils. */
export const Small: Story = {
  args: { allowClear: false, defaultValue: 'red-700' },
};

/** Une pastille « aucune couleur » en tête de grille, qui vaut `null`. */
export const WithClear: Story = {
  args: { allowClear: true, defaultValue: null },
};

/** Une palette maison : chaque pastille pointe une variable, jamais une valeur en dur. */
const MARQUE: UiSwatchGroup[] = [
  {
    label: 'Marque',
    swatches: [
      { key: 'primary', cssVar: '--primitives-primary-500', label: 'Primaire' },
      { key: 'secondary', cssVar: '--primitives-secondary-500', label: 'Secondaire' },
      { key: 'green', cssVar: '--primitives-green-500', label: 'Vert' },
      { key: 'orange', cssVar: '--primitives-orange-500', label: 'Orange' },
    ],
  },
];

export const CustomPalette: Story = {
  args: { palette: MARQUE, allowClear: true, defaultValue: 'green' },
};

/** Le composant ne rend pas son déclencheur : `trigger` reçoit les props à reverser. */
function PopupDemo() {
  const [choisie, setChoisie] = useState<UiSwatch | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <UiSwatchPicker
        popup
        aria-label="Couleur du texte"
        onSwatchSelect={setChoisie}
        trigger={(props) => <UiButton {...props} label="Couleur" icon="palette" />}
      />
      <p style={{ margin: 0 }}>
        Dernière sélection : <strong>{choisie?.label ?? 'aucune'}</strong>
      </p>
    </div>
  );
}

export const Popup: Story = {
  render: () => <PopupDemo />,
};
