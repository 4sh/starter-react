import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiTag } from '../ui-tag';

import { UiReadOnly } from './ui-read-only';

const meta: Meta<typeof UiReadOnly> = {
  title: 'Components/ui/informative/ui-read-only',
  component: UiReadOnly,
  args: {
    label: 'Adresse de facturation',
    value: '12 rue des Lilas, 33000 Bordeaux',
    layout: 'vertical',
    size: 'default',
    labelAlign: 'left',
    required: false,
    multiline: false,
    inline: false,
    matchField: false,
    fallback: '—',
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    fallback: { control: 'text' },
    emptyLabel: { control: 'text' },
    layout: { control: 'inline-radio', options: ['vertical', 'horizontal', 'grid'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    labelAlign: { control: 'inline-radio', options: ['left', 'right'] },
    labelWidth: { control: 'text' },
    required: { control: 'boolean' },
    multiline: { control: 'boolean' },
    inline: { control: 'boolean' },
    matchField: { control: 'boolean' },
    renderLabel: { control: false },
    children: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3205-2882',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 380 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiReadOnly>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: { layout: 'horizontal', labelWidth: '160px' },
};

/** Une valeur vide affiche le repli, et annonce le texte de `emptyLabel`. */
export const Empty: Story = {
  args: { value: null, emptyLabel: 'Non renseigné' },
};

export const Small: Story = { args: { size: 'small' } };
export const Required: Story = { args: { required: true } };

export const Multiline: Story = {
  args: {
    label: 'Commentaire',
    value: 'Première ligne.\nDeuxième ligne.\nTroisième ligne.',
    multiline: true,
  },
};

/** Une valeur riche remplace le texte : ici une étiquette de statut. */
export const RichValue: Story = {
  args: {
    label: 'Statut',
    value: undefined,
    children: <UiTag label="Validé" level="success" size="small" />,
  },
};

/** Sans libellé, le composant rend de simples div : un `dd` sans `dt` serait invalide. */
export const WithoutLabel: Story = {
  args: { label: undefined, value: 'Valeur seule, sans étiquette' },
};

/** `matchField` aligne la hauteur sur celle d'un champ de formulaire voisin. */
export const MatchField: Story = {
  args: { matchField: true },
};
