import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiIcon } from '../../base/ui-icon';
import { UiLink } from '../../actions/ui-link';

import { UiBreadcrumb, type UiBreadcrumbItem } from './ui-breadcrumb';

const ITEMS: UiBreadcrumbItem[] = [
  { icon: 'house', ariaLabel: 'Accueil', url: '#' },
  { label: 'Électronique', url: '#' },
  { label: 'Ordinateurs', url: '#' },
  { label: 'Accessoires' },
];

const meta: Meta<typeof UiBreadcrumb> = {
  title: 'Components/ui/navigation/ui-breadcrumb',
  component: UiBreadcrumb,
  args: {
    items: ITEMS,
    size: 'default',
    separator: '/',
    ellipsisAriaLabel: 'Afficher les éléments masqués',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'small'] },
    separator: { control: 'text' },
    maxItems: { control: 'number' },
    items: { control: 'object' },
    renderItem: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2088-2784',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiBreadcrumb>;

/** Hiérarchie de navigation : le dernier maillon est la page courante. */
export const Basic: Story = {};

/** Densité resserrée. */
export const Small: Story = { args: { size: 'small' } };

/** Chaque maillon rend l'élément natif qui correspond à sa sémantique. */
export const Links: Story = {
  args: {
    items: [
      { icon: 'house', ariaLabel: 'Accueil', url: '#' },
      { label: 'Documentation', url: 'https://react.dev', target: '_blank' },
      { label: 'Retour', command: () => undefined },
      { label: 'Archivé', url: '#', disabled: true },
      { label: 'Page courante' },
    ],
  },
};

/** `render` reverse les props du maillon sur le lien du routeur du projet. */
export const Router: Story = {
  args: {
    items: [
      {
        icon: 'house',
        ariaLabel: 'Accueil',
        render: (props, children) => (
          <a {...props} href="#accueil" data-route="/">
            {children}
          </a>
        ),
      },
      {
        label: 'Catalogue',
        render: (props, children) => (
          <a {...props} href="#catalogue" data-route="/catalogue">
            {children}
          </a>
        ),
      },
      { label: 'Clavier sans fil' },
    ],
  },
};

/** N'importe quel nœud fait un séparateur. */
export const CustomSeparator: Story = {
  args: { separator: <UiIcon name="chevron-right" size="sm" /> },
};

/** Au-delà de `maxItems`, le milieu se replie derrière un bouton. */
export const Ellipsis: Story = {
  args: {
    maxItems: 3,
    items: [
      { icon: 'house', ariaLabel: 'Accueil', url: '#' },
      { label: 'Électronique', url: '#' },
      { label: 'Ordinateurs', url: '#' },
      { label: 'Périphériques', url: '#' },
      { label: 'Claviers', url: '#' },
      { label: 'Accessoires' },
    ],
  },
};

/** `renderItem` remplace le contenu d'un maillon. */
export const CustomItem: Story = {
  args: {
    renderItem: (item, { last }) =>
      last ? (
        <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--global-text-default)' }}>
          {item.label}
        </span>
      ) : (
        <UiLink
          label={item.label}
          aria-label={item.ariaLabel}
          iconLeft={item.icon}
          href={item.url}
          size="small"
        />
      ),
  },
};
