import type { Meta, StoryObj } from '@storybook/react-vite';

import type { UiLevel } from '../../core/types';

import { UiButton, type ButtonVariant } from './ui-button';

const LEVELS: UiLevel[] = ['high', 'low', 'success', 'warning', 'error'];

const meta: Meta<typeof UiButton> = {
  // Même arborescence que le Storybook Angular : invariant du Dual-Engine.
  title: 'Components/ui/actions/ui-button',
  component: UiButton,
  // Pas de `tags: ['autodocs']` : la page de doc est le MDX co-localisé.
  args: {
    label: 'Bouton',
    level: 'high',
    variant: 'filled',
    size: 'default',
    iconPos: 'left',
    iconOnly: false,
    loading: false,
    expanded: false,
    rounded: false,
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    level: { control: 'select', options: LEVELS },
    variant: { control: 'inline-radio', options: ['filled', 'outlined', 'ghost'] },
    onColor: { control: 'inline-radio', options: [null, 'dark', 'light'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    icon: { control: 'text' },
    iconPos: { control: 'inline-radio', options: ['left', 'right', 'top', 'bottom'] },
    iconOnly: { control: 'boolean' },
    loading: { control: 'boolean' },
    expanded: { control: 'boolean' },
    rounded: { control: 'boolean' },
    disabled: { control: 'boolean' },
    href: { control: 'text' },
    render: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiButton>;

// --- Niveaux ---------------------------------------------------------

export const High: Story = { args: { label: 'High', level: 'high' } };
export const Low: Story = { args: { label: 'Low', level: 'low' } };
export const Success: Story = { args: { label: 'Success', level: 'success' } };
export const Warning: Story = { args: { label: 'Warning', level: 'warning' } };
export const Error: Story = { args: { label: 'Error', level: 'error' } };

// --- Variantes -------------------------------------------------------

const row = (variant: ButtonVariant): Story => ({
  args: { variant },
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-sm)', flexWrap: 'wrap' }}>
      {LEVELS.map((level) => (
        <UiButton {...args} key={level} level={level} label={level} />
      ))}
    </div>
  ),
});

export const FilledLevels: Story = row('filled');
export const OutlinedLevels: Story = row('outlined');
export const GhostLevels: Story = row('ghost');

// --- onColor ---------------------------------------------------------

/**
 * Sur un fond de couleur, `onColor` épingle le chrome du bouton à la
 * luminosité du fond. Insensible au thème, par construction : un bandeau
 * violet reste violet en clair comme en sombre.
 */
export const OnColorDark: Story = {
  args: { onColor: 'dark' },
  render: (args) => (
    <div
      style={{
        background: 'var(--actions-high-surface-default)',
        padding: 'var(--units-xl)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: 'var(--units-sm)',
        flexWrap: 'wrap',
      }}
    >
      <UiButton {...args} label="Filled" variant="filled" />
      <UiButton {...args} label="Outlined" variant="outlined" />
      <UiButton {...args} label="Ghost" variant="ghost" />
    </div>
  ),
};

/**
 * Le même bandeau **sans** `onColor` : le bouton suit le thème et se fond dans
 * le fond. C'est la démonstration de ce que la prop sert à éviter.
 */
export const OnColorOmitted: Story = {
  parameters: {
    // Contre-exemple ASSUMÉ : cette story existe pour montrer le défaut que
    // `onColor` corrige, donc elle échoue au contraste exprès (1,75 mesuré
    // entre --primitives-primary-700 et --primitives-primary-500).
    //
    // C'est la seule raison acceptable de couper le contrôle sur une story.
    // Toute autre exemption est un bug déguisé : la corriger, pas la taire.
    a11y: { test: 'off' },
  },
  render: (args) => (
    <div
      style={{
        background: 'var(--actions-high-surface-default)',
        padding: 'var(--units-xl)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: 'var(--units-sm)',
      }}
    >
      <UiButton {...args} label="Filled" variant="filled" />
      <UiButton {...args} label="Outlined" variant="outlined" />
    </div>
  ),
};

// --- Tailles et icônes -----------------------------------------------

export const Small: Story = { args: { label: 'Small', size: 'small' } };

export const IconLeft: Story = { args: { label: 'Ajouter', icon: 'plus' } };
export const IconRight: Story = {
  args: { label: 'Suivant', icon: 'arrow-right', iconPos: 'right' },
};
export const IconTop: Story = { args: { label: 'Exporter', icon: 'download', iconPos: 'top' } };
export const IconBottom: Story = { args: { label: 'Importer', icon: 'upload', iconPos: 'bottom' } };

/** Sans texte visible, le mode icône seule est déduit : le bouton devient carré. */
export const IconOnly: Story = {
  args: { label: undefined, icon: 'plus', 'aria-label': 'Ajouter' },
};

/** `iconOnly` force le mode même quand un libellé est fourni : il devient le nom accessible. */
export const IconOnlyForced: Story = { args: { label: 'Ajouter', icon: 'plus', iconOnly: true } };

/**
 * Une icône peut aussi être un nœud, pas seulement un nom : c'est ce qui
 * remplace le `iconTemplate` de la version Angular.
 */
export const IconAsNode: Story = {
  args: {
    label: 'Personnalisée',
    icon: <span aria-hidden="true">🎨</span>,
  },
};

// --- États ------------------------------------------------------------

export const Loading: Story = { args: { label: 'Enregistrement…', loading: true } };
export const Disabled: Story = { args: { label: 'Disabled', disabled: true } };
export const Rounded: Story = { args: { label: 'Rounded', rounded: true } };
export const RoundedIconOnly: Story = {
  args: { label: undefined, icon: 'plus', rounded: true, 'aria-label': 'Ajouter' },
};

export const Expanded: Story = {
  args: { label: 'Pleine largeur', expanded: true },
  render: (args) => (
    <div style={{ width: 320 }}>
      <UiButton {...args} />
    </div>
  ),
};

// --- Mode lien --------------------------------------------------------

/** `href` fait rendre un vrai `<a>` : Cmd ou Ctrl clic, clic milieu, « ouvrir dans un nouvel onglet ». */
export const AsLink: Story = { args: { label: 'Vers la doc', href: '#doc' } };

export const AsExternalLink: Story = {
  args: {
    label: 'Site externe',
    href: 'https://example.org',
    target: '_blank',
    icon: 'up-right-from-square',
    iconPos: 'right',
  },
};

/** Un lien désactivé perd son `href`, passe en `tabindex="-1"` et annonce `aria-disabled`. */
export const AsLinkDisabled: Story = {
  args: { label: 'Lien désactivé', href: '#doc', disabled: true },
};

/**
 * `render` branche le composant de lien d'un routeur. Le kit n'en impose
 * aucun : il passe les props qu'il aurait posées sur son `<a>`, le projet
 * décide qui les porte. Ici un faux `Link` tient le rôle.
 */
export const AsRouterLink: Story = {
  args: {
    label: 'Lien de routeur',
    icon: 'route',
    render: (props, children) => (
      <a {...props} href="#route" data-router-link="true">
        {children}
      </a>
    ),
  },
};

// --- Contenu projeté ---------------------------------------------------

/** Le contenu passé en `children` cohabite avec `label`, ou le remplace. */
export const ProjectedContent: Story = {
  args: { label: undefined, icon: 'star' },
  render: (args) => (
    <UiButton {...args}>
      Contenu <strong>riche</strong>
    </UiButton>
  ),
};
