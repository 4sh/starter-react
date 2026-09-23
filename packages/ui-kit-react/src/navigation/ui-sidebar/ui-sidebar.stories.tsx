import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';
import { UiIcon } from '../../base/ui-icon';

import {
  UiSidebar,
  UiSidebarProvider,
  getUiSidebarTriggerProps,
  useUiSidebar,
  useUiSidebarTrigger,
  type UiSidebarProps,
} from './ui-sidebar';
import { UiSidebarMenu, type UiSidebarMenuItem } from './ui-sidebar-menu';

// `tooltips` est une prop de `UiSidebarMenu`, exposée ici comme contrôle.
type SidebarArgs = UiSidebarProps & { tooltips: boolean };

const meta: Meta<SidebarArgs> = {
  title: 'Components/ui/navigation/ui-sidebar',
  component: UiSidebar,
  parameters: {
    layout: 'fullscreen',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
  argTypes: {
    side: { control: 'inline-radio', options: ['left', 'right'] },
    mode: { control: 'inline-radio', options: ['static', 'overlay'] },
    collapsible: { control: 'boolean' },
    defaultCollapsed: { control: 'boolean' },
    defaultVisible: { control: 'boolean' },
    openOnHover: { control: 'boolean' },
    backdrop: { control: 'boolean' },
    dismissable: { control: 'boolean' },
    responsive: { control: 'boolean' },
    breakpoint: { control: 'text' },
    contained: { control: 'boolean' },
    'aria-label': { control: 'text' },
    tooltips: { control: 'boolean' },
    collapsed: { control: false },
    visible: { control: false },
    header: { control: false },
    footer: { control: false },
  },
};

export default meta;
type Story = StoryObj<SidebarArgs>;

// --- Décor commun ---------------------------------------------------------------

const frame = (height: number): CSSProperties => ({
  position: 'relative',
  display: 'flex',
  height,
  overflow: 'hidden',
  border: '1px solid var(--global-border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--global-background-default)',
});
// Pas de défilement : un contenu de démonstration qui défile sans rien de
// focalisable n'est pas atteignable au clavier (règle axe `scrollable-region-focusable`).
const main: CSSProperties = { flex: '1 1 auto', minWidth: 0, padding: 'var(--units-xl)' };
const title: CSSProperties = {
  margin: 'var(--units-lg) 0 var(--units-sm)',
  color: 'var(--global-text-default)',
};
const text: CSSProperties = {
  color: 'var(--global-text-muted)',
  maxWidth: '52ch',
  lineHeight: 1.6,
};
const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  lineHeight: 1.2,
  minWidth: 0,
};

function Content({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <>
      <h2 style={title}>{heading}</h2>
      <p style={text}>{children}</p>
    </>
  );
}

/** Le bouton de la barre d'application : il lit l'état de la barre pour son libellé. */
function MenuButton({ label }: { label?: string }) {
  const sidebar = useUiSidebar();
  const trigger = useUiSidebarTrigger();
  const overlay = sidebar?.isOverlay ?? false;
  const collapsed = sidebar ? !sidebar.expanded : false;
  return (
    <UiButton
      {...trigger}
      level="low"
      size="small"
      icon={overlay ? 'bars' : collapsed ? 'angles-right' : 'angles-left'}
      label={label ?? (overlay ? 'Ouvrir' : collapsed ? 'Déplier' : 'Replier')}
    />
  );
}

const PLAYGROUND_ITEMS: UiSidebarMenuItem[] = [
  { label: 'Tableau de bord', icon: 'gauge', active: true },
  { label: 'Projets', icon: 'folder-open' },
  { label: 'Calendrier', icon: 'calendar-days' },
  { label: 'Messages', icon: 'envelope', badge: '3', badgeLevel: 'highlight' },
  { label: 'Paramètres', icon: 'gear' },
];

/**
 * Terrain de jeu. `side`, `mode`, `collapsible`, le repli, `openOnHover` et le
 * voile se combinent. La barre est cantonnée (`contained`) dans une zone bornée
 * pour l'aperçu.
 */
export const Variants: Story = {
  args: {
    side: 'left',
    mode: 'static',
    collapsible: true,
    defaultCollapsed: false,
    defaultVisible: false,
    openOnHover: false,
    backdrop: true,
    dismissable: true,
    contained: true,
    'aria-label': 'Navigation de démonstration',
    tooltips: true,
  },
  render: ({ tooltips, ...args }) => (
    <UiSidebarProvider>
      <div style={frame(460)}>
        <UiSidebar
          key={`${args.mode}-${args.defaultCollapsed}-${args.defaultVisible}`}
          {...args}
          header={(sb) => (
            <>
              <UiIcon name="bolt" size="lg" />
              {!sb.collapsed && <strong>App</strong>}
            </>
          )}
          footer={(sb) => (
            <>
              <UiIcon name="circle-user" size="lg" />
              {!sb.collapsed && <span>Jane Doe</span>}
            </>
          )}
        >
          <UiSidebarMenu items={PLAYGROUND_ITEMS} tooltips={tooltips} aria-label="Sections" />
        </UiSidebar>

        <main style={main}>
          <MenuButton />
          <Content heading="Contenu">
            La barre pousse cet espace en mode statique, et flotte par-dessus en mode superposé.
            Essayez le repli, le survol et le voile avec les contrôles.
          </Content>
        </main>
      </div>
    </UiSidebarProvider>
  ),
};

const WORKSPACE_NAV: UiSidebarMenuItem[] = [
  {
    label: 'Espace de travail',
    items: [
      { label: 'Vue d’ensemble', icon: 'house', active: true },
      { label: 'Analytique', icon: 'chart-line' },
      { label: 'Rapports', icon: 'file-lines', badge: '5', badgeLevel: 'highlight' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { label: 'Équipe', icon: 'users' },
      { label: 'Facturation', icon: 'credit-card' },
      { label: 'Intégrations', icon: 'plug' },
    ],
  },
  { separator: true },
  { label: 'Aide et support', icon: 'circle-question' },
];

const switcher: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--units-sm)',
  width: '100%',
  padding: 'var(--units-xs)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--global-background-muted)',
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',
};

/**
 * Un chrome d'application complet : sélecteur d'espace de travail en en-tête,
 * navigation groupée, carte utilisateur en pied. Le déclencheur replie la barre
 * en rail d'icônes.
 */
export const WithMenu: Story = {
  render: () => (
    <UiSidebarProvider>
      <div style={frame(520)}>
        <UiSidebar
          aria-label="Navigation de l'espace de travail"
          header={(sb) => (
            <button
              type="button"
              {...getUiSidebarTriggerProps(sb)}
              aria-label="Basculer la navigation"
              style={switcher}
            >
              <UiIcon name="layer-group" size="lg" />
              {!sb.collapsed && (
                <>
                  <span style={stack}>
                    <strong>App</strong>
                    <small style={{ color: 'var(--global-text-muted)' }}>Espace Pro</small>
                  </span>
                  <UiIcon name="angles-up-down" size="sm" style={{ marginLeft: 'auto' }} />
                </>
              )}
            </button>
          )}
          footer={(sb) => (
            <>
              <UiIcon name="circle-user" size="lg" />
              {!sb.collapsed && (
                <>
                  <span style={stack}>
                    <strong>Jane Doe</strong>
                    <small style={{ color: 'var(--global-text-muted)' }}>jane@acme.io</small>
                  </span>
                  <UiIcon name="right-from-bracket" size="sm" style={{ marginLeft: 'auto' }} />
                </>
              )}
            </>
          )}
        >
          <UiSidebarMenu items={WORKSPACE_NAV} tooltips aria-label="Sections principales" />
        </UiSidebar>

        <main style={main}>
          <MenuButton />
          <Content heading="Vue d’ensemble">
            Repliez la barre : libellés, en-têtes de section et badges disparaissent, il ne reste
            que la colonne d’icônes.
          </Content>
        </main>
      </div>
    </UiSidebarProvider>
  ),
};

/**
 * Sous 1024px, la barre devient un panneau superposé ; au-dessus, elle reste un
 * rail d’icônes qui pousse le contenu. Redimensionnez l’aperçu pour voir la
 * bascule.
 */
export const Responsive: Story = {
  render: () => (
    <UiSidebarProvider>
      <div style={frame(520)}>
        <UiSidebar
          responsive
          breakpoint="1024px"
          defaultCollapsed
          contained
          aria-label="Navigation adaptative"
          header={(sb) => (
            <>
              <UiIcon name="compass" size="lg" />
              {!sb.collapsed && <strong>App</strong>}
            </>
          )}
        >
          <UiSidebarMenu items={PLAYGROUND_ITEMS} aria-label="Sections" />
        </UiSidebar>

        <main style={main}>
          <MenuButton label="Menu" />
          <Content heading="Adaptatif">
            Sur écran large, un rail d’icônes borde le contenu. Sous 1024px, le bouton Menu ouvre un
            panneau par-dessus.
          </Content>
        </main>
      </div>
    </UiSidebarProvider>
  ),
};

const RAIL_NAV: UiSidebarMenuItem[] = [
  { label: 'Accueil', icon: 'house', active: true },
  { label: 'Base de données', icon: 'database' },
  { label: 'Recherche', icon: 'magnifying-glass' },
  { label: 'Journaux', icon: 'table-list' },
  { label: 'Domaines', icon: 'globe' },
  { label: 'API', icon: 'code' },
];

const SETTINGS_NAV: UiSidebarMenuItem[] = [
  {
    label: 'Configuration',
    items: [
      { label: 'Général', active: true },
      { label: 'Calcul et disque' },
      { label: 'Infrastructure' },
      { label: 'Intégrations' },
      { label: 'Clés API' },
      { label: 'Clés JWT' },
      { label: 'Journaux exportés' },
      { label: 'Modules' },
    ],
  },
  {
    label: 'Intégrations',
    items: [
      { label: 'Data API', external: true },
      { label: 'Coffre', badge: 'BETA' },
    ],
  },
  {
    label: 'Facturation',
    items: [
      { label: 'Abonnement', external: true },
      { label: 'Usage', external: true },
    ],
  },
];

const brand: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--actions-high-surface-default)',
  color: 'var(--actions-high-content-default)',
};
const placeholder = (height: number): CSSProperties => ({
  height,
  borderRadius: 'var(--radius-md)',
  background: 'var(--global-background-muted)',
});

/**
 * Deux niveaux, façon console d'administration : un rail d'icônes permanent
 * comme navigation primaire, accolé à une barre secondaire qui liste les
 * sections d'un module. Deux barres statiques côte à côte, sans panneau superposé.
 */
export const DualSidebar: Story = {
  render: () => (
    <div style={{ ...frame(640), position: 'static' }}>
      <UiSidebar
        collapsed
        collapsible={false}
        aria-label="Navigation principale"
        header={
          <span style={brand}>
            <UiIcon name="bolt" />
          </span>
        }
        footer={<UiIcon name="gear" size="lg" />}
      >
        <UiSidebarMenu items={RAIL_NAV} tooltips aria-label="Sections de l'application" />
      </UiSidebar>

      <UiSidebar
        collapsible={false}
        aria-label="Réglages du projet"
        header={
          <strong style={{ fontSize: 'var(--size-typography-title-default)' }}>Réglages</strong>
        }
      >
        <UiSidebarMenu items={SETTINGS_NAV} aria-label="Sections des réglages" />
      </UiSidebar>

      <main style={main}>
        <h2 style={{ ...title, marginTop: 0 }}>Éditeur de table</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-md)' }}>
          <div style={placeholder(120)} />
          <div style={placeholder(220)} />
        </div>
      </main>
    </div>
  ),
};

const NESTED_NAV: UiSidebarMenuItem[] = [
  { label: 'Tableau de bord', icon: 'gauge' },
  {
    label: 'Catalogue',
    icon: 'box-archive',
    toggleable: true,
    items: [
      { label: 'Produits', icon: 'tag' },
      {
        label: 'Collections',
        icon: 'layer-group',
        items: [
          { label: 'Nouveautés', icon: 'star' },
          { label: 'Promotions', icon: 'percent', active: true },
          { label: 'Archives', icon: 'box' },
        ],
      },
      { label: 'Fournisseurs', icon: 'truck' },
    ],
  },
  {
    label: 'Clients',
    icon: 'users',
    toggleable: true,
    items: [
      { label: 'Comptes', icon: 'address-card' },
      { label: 'Segments', icon: 'chart-pie' },
    ],
  },
  { separator: true },
  { label: 'Paramètres', icon: 'gear' },
];

/**
 * Les entrées deviennent des groupes repliables sur plusieurs niveaux. Un groupe
 * qui contient l'entrée courante se déplie d'office : ici « Promotions », sous
 * « Collections ».
 */
export const NestedMenu: Story = {
  render: () => (
    <div style={{ ...frame(560), position: 'static' }}>
      <UiSidebar
        collapsible={false}
        aria-label="Navigation imbriquée"
        header={
          <>
            <UiIcon name="store" size="lg" />
            <strong>Boutique</strong>
          </>
        }
      >
        <UiSidebarMenu items={NESTED_NAV} aria-label="Sections imbriquées" />
      </UiSidebar>

      <main style={main}>
        <Content heading="Arborescence profonde">
          Cliquez sur « Catalogue » ou « Clients » pour déplier ou replier les sous-menus. Les
          sous-arbres s’indentent et s’animent en hauteur.
        </Content>
      </main>
    </div>
  ),
};
