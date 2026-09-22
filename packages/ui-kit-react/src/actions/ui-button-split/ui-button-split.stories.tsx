import type { Meta, StoryObj } from '@storybook/react-vite';

import type { UiLevel } from '../../core/types';
import type { UiMenuItem } from '../../navigation/ui-menu';

import { UiButtonSplit } from './ui-button-split';

const LEVELS: UiLevel[] = ['high', 'low', 'success', 'warning', 'error'];

const BASIC_ITEMS: UiMenuItem[] = [
  { label: 'Mettre à jour' },
  { label: 'Dupliquer' },
  { separator: true },
  { label: 'Documentation', url: 'https://react.dev', target: '_blank' },
  { label: 'Supprimer' },
];

const ICON_ITEMS: UiMenuItem[] = [
  { label: 'Mettre à jour', icon: 'rotate' },
  { label: 'Dupliquer', icon: 'copy' },
  { separator: true },
  {
    label: 'Documentation',
    icon: 'arrow-up-right-from-square',
    url: 'https://react.dev',
    target: '_blank',
  },
  { label: 'Supprimer', icon: 'trash' },
];

const NESTED_ITEMS: UiMenuItem[] = [
  {
    label: 'Fichier',
    icon: 'folder',
    toggleable: true,
    items: [
      { label: 'Nouveau', icon: 'plus' },
      { label: 'Ouvrir', icon: 'folder-open' },
      { label: 'Imprimer', icon: 'print' },
    ],
  },
  {
    label: 'Partager',
    icon: 'share-nodes',
    toggleable: true,
    items: [
      { label: 'Copier le lien', icon: 'link' },
      { label: 'Par e-mail', icon: 'envelope' },
    ],
  },
  { separator: true },
  { label: 'Exporter', icon: 'file-export' },
];

const meta: Meta<typeof UiButtonSplit> = {
  title: 'Components/ui/actions/ui-button-split',
  component: UiButtonSplit,
  args: {
    label: 'Enregistrer',
    items: BASIC_ITEMS,
    level: 'high',
    size: 'default',
    variant: 'filled',
    disabled: false,
    buttonDisabled: false,
    menuButtonDisabled: false,
    menuAriaLabel: 'Autres actions',
  },
  argTypes: {
    label: { control: 'text' },
    icon: { control: 'text' },
    iconPos: { control: 'inline-radio', options: ['left', 'right', 'top', 'bottom'] },
    dropdownIcon: { control: 'text' },
    level: { control: 'select', options: LEVELS },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    variant: { control: 'inline-radio', options: ['filled', 'outlined', 'ghost'] },
    onColor: { control: 'inline-radio', options: [null, 'dark', 'light'] },
    menuLevel: { control: 'inline-radio', options: ['high', 'low'] },
    items: { control: false },
    children: { control: false },
    open: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiButtonSplit>;

export const Default: Story = {};

/** Le bouton d'action et les options acceptent des icônes. */
export const WithIcons: Story = {
  args: { icon: 'floppy-disk', items: ICON_ITEMS },
};

/** Les options se groupent en sous-menus repliables. */
export const Nested: Story = {
  args: { label: 'Fichier', icon: 'folder', items: NESTED_ITEMS },
};

export const Levels: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-md)', flexWrap: 'wrap' }}>
      {LEVELS.map((level) => (
        <UiButtonSplit
          {...args}
          key={level}
          level={level}
          label={level}
          menuAriaLabel={`Autres actions ${level}`}
        />
      ))}
    </div>
  ),
};

export const Outlined: Story = { args: { variant: 'outlined' } };
export const Small: Story = { args: { size: 'small' } };

/** Les deux moitiés se désactivent ensemble, ou chacune de son côté. */
export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-md)', flexWrap: 'wrap' }}>
      <UiButtonSplit {...args} label="Tout" disabled menuAriaLabel="Autres actions 1" />
      <UiButtonSplit {...args} label="Action" buttonDisabled menuAriaLabel="Autres actions 2" />
      <UiButtonSplit
        {...args}
        label="Déroulant"
        menuButtonDisabled
        menuAriaLabel="Autres actions 3"
      />
    </div>
  ),
};

/**
 * Le panneau est fermé au repos, donc invisible au contrôle d'accessibilité.
 * `play` tourne avant ce contrôle : c'est ce qui le soumet à axe.
 */
export const Opened: Story = {
  args: { items: ICON_ITEMS },
  play: async ({ canvasElement }) => {
    (canvasElement.querySelector('.ui-button-split-trigger') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 50));
  },
};
