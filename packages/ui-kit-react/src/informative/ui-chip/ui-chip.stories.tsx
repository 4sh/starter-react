import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import type { UiFeedbackLevel } from '../../core/types';

import { UiChip } from './ui-chip';

const LEVELS: UiFeedbackLevel[] = ['default', 'highlight', 'success', 'warning', 'error'];

const PORTRAIT =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='16' fill='%237c3aed'/></svg>";

const meta: Meta<typeof UiChip> = {
  title: 'Components/ui/informative/ui-chip',
  component: UiChip,
  args: {
    label: 'Bordeaux',
    level: 'default',
    subLevel: 'low',
    size: 'default',
    rounded: true,
    removable: false,
    selectable: false,
    disabled: false,
    removeIcon: 'xmark',
    selectedIcon: 'check',
    removeAriaLabel: 'Supprimer',
  },
  argTypes: {
    label: { control: 'text' },
    level: { control: 'select', options: LEVELS },
    subLevel: { control: 'inline-radio', options: ['high', 'low'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    icon: { control: 'text' },
    image: { control: 'text' },
    rounded: { control: 'boolean' },
    removable: { control: 'boolean' },
    selectable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    selected: { control: false },
    onRemove: { control: false },
    onChipClick: { control: false },
    children: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiChip>;

export const Default: Story = {};

export const Levels: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-sm)', flexWrap: 'wrap' }}>
      {LEVELS.map((level) => (
        <UiChip {...args} key={level} level={level} label={level} />
      ))}
    </div>
  ),
};

export const WithIcon: Story = { args: { icon: 'location-dot' } };
export const WithImage: Story = { args: { image: PORTRAIT, label: 'Camille' } };
export const Small: Story = { args: { size: 'small' } };
export const Square: Story = { args: { rounded: false } };

/** L'action de retrait est un vrai bouton : Tab l'atteint, Entrée et Espace l'activent. */
export const Removable: Story = { args: { removable: true } };

/** Une puce sélectionnable est un `<button aria-pressed>` : la puce entière bascule. */
export const Selectable: Story = { args: { selectable: true, label: 'Disponible' } };

export const Disabled: Story = { args: { removable: true, disabled: true } };

/** Non contrôlée, la puce gère sa sélection ; `onSelectedChange` prévient quand même. */
export const FilterBar: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-sm)', flexWrap: 'wrap' }}>
      {['Bordeaux', 'Nantes', 'Lyon', 'Paris'].map((ville) => (
        <UiChip {...args} key={ville} label={ville} selectable defaultSelected={ville === 'Lyon'} />
      ))}
    </div>
  ),
};

// Les stories à état déclarent un vrai composant : `useState` dans un `render`
// enfreint les règles des hooks, et le linter a raison de le refuser.
function TagListDemo(args: React.ComponentProps<typeof UiChip>) {
  const [tags, setTags] = useState(['conception', 'jetons', 'accessibilité']);

  return (
    <div style={{ display: 'flex', gap: 'var(--units-sm)', flexWrap: 'wrap', minHeight: 32 }}>
      {tags.map((tag) => (
        <UiChip
          {...args}
          key={tag}
          label={tag}
          removable
          removeAriaLabel={`Retirer ${tag}`}
          onRemove={() => setTags((current) => current.filter((t) => t !== tag))}
        />
      ))}
      {tags.length === 0 && <span>Toutes les étiquettes ont été retirées.</span>}
    </div>
  );
}

/** Le parent possède la liste : retirer une puce la retire pour de bon. */
export const RemovableList: Story = { render: (args) => <TagListDemo {...args} /> };
