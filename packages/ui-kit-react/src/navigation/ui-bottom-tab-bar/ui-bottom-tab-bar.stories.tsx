import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiBadge } from '../../informative/ui-badge';

import {
  UiBottomTab,
  UiBottomTabAction,
  UiBottomTabBar,
  type UiBottomTabValue,
} from './ui-bottom-tab-bar';

/**
 * Maquette de téléphone : un ancêtre positionné qui donne à la barre `contained`
 * un bas d'écran où se poser, et au contenu de quoi passer dessous.
 */
function Phone({ children, height = 260 }: { children: ReactNode; height?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 340,
        height,
        overflow: 'hidden',
        border: '1px solid var(--global-border-default)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--global-background-muted)',
      }}
    >
      <div
        style={{
          padding: 'var(--units-lg)',
          fontSize: 'var(--size-typography-text-sm)',
          color: 'var(--global-text-muted)',
        }}
      >
        Contenu de l'écran. La barre se pose au bas de ce cadre.
      </div>
      {children}
    </div>
  );
}

const meta: Meta<typeof UiBottomTabBar> = {
  title: 'Components/ui/navigation/ui-bottom-tab-bar',
  component: UiBottomTabBar,
  args: {
    'aria-label': 'Navigation principale',
    showLabels: true,
    safeArea: true,
    contained: true,
  },
  argTypes: {
    showLabels: { control: 'boolean' },
    safeArea: { control: 'boolean' },
    contained: { control: 'boolean' },
    value: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3767-4454',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiBottomTabBar>;

/** Quatre destinations, icône et libellé, la première active. */
export const Basic: Story = {
  render: (args) => (
    <Phone>
      <UiBottomTabBar {...args} defaultValue="home">
        <UiBottomTab value="home" icon="house" label="Accueil" />
        <UiBottomTab value="search" icon="magnifying-glass" label="Recherche" />
        <UiBottomTab value="library" icon="bookmark" label="Bibliothèque" />
        <UiBottomTab value="settings" icon="gear" label="Réglages" />
      </UiBottomTabBar>
    </Phone>
  ),
};

/**
 * En icônes seules : `showLabels={false}` masque tous les libellés, et chaque
 * onglet garde son `label` comme nom accessible. Un onglet peut aussi omettre
 * `label` et porter un `aria-label`.
 */
export const NoLabel: Story = {
  args: { showLabels: false },
  render: (args) => (
    <Phone>
      <UiBottomTabBar {...args} defaultValue="home">
        <UiBottomTab value="home" icon="house" label="Accueil" />
        <UiBottomTab value="search" icon="magnifying-glass" label="Recherche" />
        <UiBottomTab value="profile" icon="user" aria-label="Profil" />
      </UiBottomTabBar>
    </Phone>
  ),
};

/** L'icône change à l'activation, contour au repos et pleine une fois choisie. */
export const ActiveIcon: Story = {
  render: (args) => (
    <Phone>
      <UiBottomTabBar {...args} defaultValue="favourites">
        <UiBottomTab value="home" icon="house" label="Accueil" />
        <UiBottomTab
          value="favourites"
          icon="heart"
          iconType="outline"
          activeIcon="heart"
          activeIconType="solid"
          label="Favoris"
        />
        <UiBottomTab value="settings" icon="gear" label="Réglages" />
      </UiBottomTabBar>
    </Phone>
  ),
};

/** L'action surélevée, une commande et non une destination. */
export const FloatAction: Story = {
  render: (args) => (
    <Phone>
      <UiBottomTabBar {...args} defaultValue="home">
        <UiBottomTab value="home" icon="house" label="Accueil" />
        <UiBottomTab value="search" icon="magnifying-glass" label="Recherche" />
        <UiBottomTabAction aria-label="Nouveau message" />
        <UiBottomTab value="inbox" icon="envelope" label="Messages" />
        <UiBottomTab value="settings" icon="gear" label="Réglages" />
      </UiBottomTabBar>
    </Phone>
  ),
};

/** L'ornement projeté se pose sur l'icône, et ne prend jamais le pointeur. */
export const Adornment: Story = {
  render: (args) => (
    <Phone>
      <UiBottomTabBar {...args} defaultValue="home">
        <UiBottomTab value="home" icon="house" label="Accueil" />
        <UiBottomTab value="inbox" icon="envelope" label="Messages">
          <UiBadge value="3" level="error" size="small" />
        </UiBottomTab>
        <UiBottomTab value="settings" icon="gear" label="Réglages" />
      </UiBottomTabBar>
    </Phone>
  ),
};

/** Un onglet désactivé, et un lien externe. */
export const States: Story = {
  render: (args) => (
    <Phone>
      <UiBottomTabBar {...args} defaultValue="home">
        <UiBottomTab value="home" icon="house" label="Accueil" />
        <UiBottomTab value="archive" icon="box-archive" label="Archives" disabled />
        <UiBottomTab value="docs" icon="book" label="Docs" href="#docs" />
      </UiBottomTabBar>
    </Phone>
  ),
};

/** `value` renseignée, la destination appartient à l'appelant. */
function ControlledDemo(args: Partial<React.ComponentProps<typeof UiBottomTabBar>>) {
  const [route, setRoute] = useState<UiBottomTabValue>('home');

  return (
    <Phone height={300}>
      <div style={{ padding: 'var(--units-lg)', paddingTop: 0 }}>
        Route courante : <strong>{String(route)}</strong>
      </div>
      <UiBottomTabBar {...args} value={route} onValueChange={setRoute}>
        <UiBottomTab value="home" icon="house" label="Accueil" />
        <UiBottomTab value="search" icon="magnifying-glass" label="Recherche" />
        <UiBottomTab value="settings" icon="gear" label="Réglages" />
      </UiBottomTabBar>
    </Phone>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
