import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiIcon } from '../../base/ui-icon';

import {
  UiToggleButton,
  type ToggleButtonValue,
  type UiToggleButtonProps,
} from './ui-toggle-button';

const FORMATS = [
  { value: 'bold', icon: 'bold', ariaLabel: 'Gras' },
  { value: 'italic', icon: 'italic', ariaLabel: 'Italique' },
  { value: 'underline', icon: 'underline', ariaLabel: 'Souligné' },
];

const JOURS = [
  { value: 'lun', label: 'Lun' },
  { value: 'mar', label: 'Mar' },
  { value: 'mer', label: 'Mer' },
  { value: 'jeu', label: 'Jeu' },
  { value: 'ven', label: 'Ven' },
  { value: 'sam', label: 'Sam', disabled: true },
];

const meta: Meta<UiToggleButtonProps<boolean>> = {
  title: 'Components/ui/forms/ui-toggle-button',
  component: UiToggleButton,
  args: {
    label: 'Notifications',
    icon: 'bell',
    iconPos: 'left',
    level: 'high',
    variant: 'outlined',
    size: 'default',
    fluid: false,
    rounded: false,
    allowEmpty: true,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    onLabel: { control: 'text' },
    offLabel: { control: 'text' },
    icon: { control: 'text' },
    iconPos: { control: 'inline-radio', options: ['left', 'right'] },
    level: { control: 'select', options: ['high', 'low', 'success', 'warning', 'error'] },
    variant: { control: 'inline-radio', options: ['outlined', 'filled', 'ghost'] },
    size: { control: 'inline-radio', options: ['default', 'small', 'large'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    options: { control: false },
    value: { control: false },
    defaultValue: { control: false },
    renderIcon: { control: false },
    renderContent: { control: false },
    renderItem: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2119-3189',
    },
  },
};

export default meta;
type Story = StoryObj<UiToggleButtonProps<boolean>>;

/** Mode simple : le modèle est un booléen, ou la paire trueValue / falseValue. */
function Demo({ initial = false, ...props }: UiToggleButtonProps<boolean> & { initial?: boolean }) {
  const [value, setValue] = useState<ToggleButtonValue<boolean>>(initial);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-lg)' }}>
      <UiToggleButton<boolean> {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>{String(value)}</code>
    </div>
  );
}

/** Mode groupe : le modèle est le tableau des valeurs pressées. */
function DemoGroupe({
  initial = [],
  ...props
}: UiToggleButtonProps<string> & { initial?: string[] }) {
  const [value, setValue] = useState<ToggleButtonValue<string>>(initial);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--units-md)',
      }}
    >
      <UiToggleButton<string> {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>
        [{Array.isArray(value) ? value.join(', ') : ''}]
      </code>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

export const Pressed: Story = { render: (args) => <Demo {...args} initial /> };

/** Libellé et icône peuvent différer selon l'état. */
export const StateLabels: Story = {
  args: {
    label: undefined,
    onLabel: 'Activé',
    offLabel: 'Désactivé',
    onIcon: 'bell',
    offIcon: 'bell-slash',
    'aria-label': 'Notifications',
  },
  render: (args) => <Demo {...args} />,
};

/** Icône seule : un `aria-label` devient indispensable. */
export const IconOnly: Story = {
  args: { label: undefined, icon: 'star', 'aria-label': 'Mettre en favori' },
  render: (args) => <Demo {...args} />,
};

export const IconRight: Story = {
  args: { iconPos: 'right' },
  render: (args) => <Demo {...args} initial />,
};

export const Filled: Story = {
  args: { variant: 'filled' },
  render: (args) => <Demo {...args} />,
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
  render: (args) => <Demo {...args} />,
};

export const LevelSuccess: Story = {
  args: { level: 'success' },
  render: (args) => <Demo {...args} initial />,
};

export const Rounded: Story = {
  args: { rounded: true },
  render: (args) => <Demo {...args} initial />,
};

export const Small: Story = {
  args: { size: 'small' },
  render: (args) => <Demo {...args} initial />,
};

export const Large: Story = {
  args: { size: 'large' },
  render: (args) => <Demo {...args} initial />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} initial />,
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  render: (args) => <Demo {...args} initial />,
};

export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => <Demo {...args} />,
};

/** `allowEmpty={false}` : une fois pressé, le bouton ne se relâche plus. */
export const NoEmpty: Story = {
  args: { allowEmpty: false },
  render: (args) => <Demo {...args} initial />,
};

/**
 * Mode groupe : `options` bascule la racine en `role="group"`, et le modèle
 * devient un tableau. Toujours multi-sélection : un choix exclusif est le
 * travail de `ui-segment-control`.
 */
export const Group: Story = {
  render: () => <DemoGroupe options={JOURS} aria-label="Jours ouvrés" initial={['lun', 'mar']} />,
};

/** Groupe en icônes seules : chaque option porte son propre `ariaLabel`. */
export const GroupIconOnly: Story = {
  render: () => (
    <DemoGroupe options={FORMATS} aria-label="Mise en forme" initial={['bold']} rounded />
  ),
};

export const GroupVertical: Story = {
  render: () => (
    <DemoGroupe options={JOURS.slice(0, 3)} orientation="vertical" aria-label="Jours" />
  ),
};

export const GroupFluid: Story = {
  render: () => (
    <div style={{ width: 420 }}>
      <DemoGroupe options={JOURS.slice(0, 4)} fluid aria-label="Jours" initial={['mer']} />
    </div>
  ),
};

/** `renderContent` remplace tout le contenu, jamais le bouton. */
export const CustomContent: Story = {
  args: {
    label: undefined,
    'aria-label': 'Favori',
    renderContent: ({ checked }) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--units-xs)' }}>
        <UiIcon name={checked ? 'star' : 'star'} type={checked ? 'solid' : 'outline'} size="sm" />
        {checked ? 'Dans vos favoris' : 'Ajouter aux favoris'}
      </span>
    ),
  },
  render: (args) => <Demo {...args} />,
};
