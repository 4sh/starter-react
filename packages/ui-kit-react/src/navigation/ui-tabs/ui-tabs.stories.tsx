import { useState, type ComponentProps, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';
import { UiTag } from '../../informative/ui-tag';

import { UiTab, UiTabList, UiTabPanel, UiTabPanels, UiTabs, type UiTabValue } from './ui-tabs';

const LOREM =
  'Viennese et half to cortado viennese. Americano steamed caffeine filter luwak skinny half and id spoon. Redeye extraction variety shot instant qui cream roast lungo body shot mazagran.';

const meta: Meta<typeof UiTabs> = {
  title: 'Components/ui/navigation/ui-tabs',
  component: UiTabs,
  args: {
    orientation: 'horizontal',
    scrollable: false,
    lazy: false,
    selectOnFocus: false,
    showNavigators: true,
    motion: true,
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    scrollable: { control: 'boolean' },
    lazy: { control: 'boolean' },
    selectOnFocus: { control: 'boolean' },
    showNavigators: { control: 'boolean' },
    motion: { control: 'boolean' },
    value: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 645 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiTabs>;

export const Default: Story = {
  render: (args) => (
    <UiTabs {...args} defaultValue="overview">
      <UiTabList aria-label="Sections">
        <UiTab value="overview">Aperçu</UiTab>
        <UiTab value="activity">Activité</UiTab>
        <UiTab value="settings">Paramètres</UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="overview">Aperçu : {LOREM}</UiTabPanel>
        <UiTabPanel value="activity">Activité : {LOREM}</UiTabPanel>
        <UiTabPanel value="settings">Paramètres : {LOREM}</UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  ),
};

const FOLDERS = [
  { value: 'inbox', label: 'Boîte de réception', body: 'Vos messages entrants.' },
  { value: 'sent', label: 'Envoyés', body: 'Les messages que vous avez envoyés.' },
  { value: 'drafts', label: 'Brouillons', body: 'Vos brouillons non finalisés.' },
  { value: 'trash', label: 'Corbeille', body: 'Éléments supprimés.' },
];

/** Onglets construits depuis un tableau : la `value` apparie l'onglet et son panneau. */
export const Dynamic: Story = {
  render: (args) => (
    <UiTabs {...args} defaultValue="inbox">
      <UiTabList aria-label="Dossiers">
        {FOLDERS.map((folder) => (
          <UiTab key={folder.value} value={folder.value}>
            {folder.label}
          </UiTab>
        ))}
      </UiTabList>
      <UiTabPanels>
        {FOLDERS.map((folder) => (
          <UiTabPanel key={folder.value} value={folder.value}>
            {folder.body}
          </UiTabPanel>
        ))}
      </UiTabPanels>
    </UiTabs>
  ),
};

/** `value` renseignée, l'onglet actif appartient à l'appelant. */
function ControlledDemo(args: ComponentProps<typeof UiTabs>) {
  const [active, setActive] = useState<UiTabValue>('b');

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--units-sm)', marginBottom: 'var(--units-md)' }}>
        {['a', 'b', 'c'].map((key) => (
          <UiButton
            key={key}
            size="small"
            level="low"
            label={`Aller à ${key.toUpperCase()}`}
            onClick={() => setActive(key)}
          />
        ))}
      </div>

      <UiTabs {...args} value={active} onValueChange={setActive}>
        <UiTabList aria-label="Sections contrôlées">
          <UiTab value="a">Section A</UiTab>
          <UiTab value="b">Section B</UiTab>
          <UiTab value="c">Section C</UiTab>
        </UiTabList>
        <UiTabPanels>
          <UiTabPanel value="a">Contenu A</UiTabPanel>
          <UiTabPanel value="b">Contenu B</UiTabPanel>
          <UiTabPanel value="c">Contenu C</UiTabPanel>
        </UiTabPanels>
      </UiTabs>

      <p style={{ marginTop: 'var(--units-md)', fontSize: 13 }}>
        Onglet actif : <strong>{active}</strong>
      </p>
    </>
  );
}

export const Controlled: Story = { render: (args) => <ControlledDemo {...args} /> };

const MANY = Array.from({ length: 12 }, (_, index) => `${index + 1}`);

/** Une bande trop longue défile, et ses deux navigateurs apparaissent. */
export const Scrollable: Story = {
  args: { scrollable: true },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <UiTabs {...args} defaultValue="1">
      <UiTabList aria-label="Nombreux onglets">
        {MANY.map((n) => (
          <UiTab key={n} value={n}>
            Onglet {n}
          </UiTab>
        ))}
      </UiTabList>
      <UiTabPanels>
        {MANY.map((n) => (
          <UiTabPanel key={n} value={n}>
            Contenu de l’onglet {n}.
          </UiTabPanel>
        ))}
      </UiTabPanels>
    </UiTabs>
  ),
};

/** Sur l'axe vertical, la bande passe sur le côté et les flèches changent d'axe. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <UiTabs {...args} defaultValue="general">
      <UiTabList aria-label="Réglages">
        <UiTab value="general" icon="sliders">
          Général
        </UiTab>
        <UiTab value="security" icon="lock">
          Sécurité
        </UiTab>
        <UiTab value="team" icon="users">
          Équipe
        </UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="general">Réglages généraux : {LOREM}</UiTabPanel>
        <UiTabPanel value="security">Sécurité : {LOREM}</UiTabPanel>
        <UiTabPanel value="team">Équipe : {LOREM}</UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  ),
};

/** Avec `selectOnFocus`, déplacer le focus au clavier active l'onglet atteint. */
export const SelectOnFocus: Story = {
  args: { selectOnFocus: true },
  render: (args) => (
    <UiTabs {...args} defaultValue="1">
      <UiTabList aria-label="Activation au focus">
        <UiTab value="1">Premier</UiTab>
        <UiTab value="2">Deuxième</UiTab>
        <UiTab value="3">Troisième</UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="1">
          Donnez le focus à la bande puis utilisez ←/→ : l’onglet s’active tout seul.
        </UiTabPanel>
        <UiTabPanel value="2">Deuxième panneau.</UiTabPanel>
        <UiTabPanel value="3">Troisième panneau.</UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  ),
};

/** Un panneau paresseux n'est construit qu'à la première activation de son onglet. */
export const Lazy: Story = {
  args: { lazy: true },
  render: (args) => (
    <UiTabs {...args} defaultValue="eager">
      <UiTabList aria-label="Chargement paresseux">
        <UiTab value="eager">Immédiat</UiTab>
        <UiTab value="lazy">Paresseux</UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="eager">Rendu dès l’affichage initial.</UiTabPanel>
        <UiTabPanel value="lazy">Ce contenu n’est construit qu’à l’activation.</UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  ),
};

/** Un onglet désactivé n'est ni sélectionnable ni atteignable au clavier. */
export const Disabled: Story = {
  render: (args) => (
    <UiTabs {...args} defaultValue="1">
      <UiTabList aria-label="Onglets avec état désactivé">
        <UiTab value="1">Actif</UiTab>
        <UiTab value="2" disabled>
          Désactivé
        </UiTab>
        <UiTab value="3">Disponible</UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="1">Premier panneau.</UiTabPanel>
        <UiTabPanel value="2">Panneau inaccessible.</UiTabPanel>
        <UiTabPanel value="3">Troisième panneau.</UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  ),
};

/** L'indicateur se retouche par ses deux hooks, sans toucher au composant. */
export const CustomIndicator: Story = {
  render: (args) => (
    <UiTabs
      {...args}
      defaultValue="design"
      style={
        {
          '--ui-tabs-indicator-color': 'var(--actions-success-surface-default)',
          '--ui-tabs-indicator-thickness': '4px',
        } as CSSProperties
      }
    >
      <UiTabList aria-label="Indicateur personnalisé">
        <UiTab value="design">Design</UiTab>
        <UiTab value="build">Développement</UiTab>
        <UiTab value="ship">Livraison</UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="design">Barre active plus épaisse, teinte succès.</UiTabPanel>
        <UiTabPanel value="build">Deuxième panneau.</UiTabPanel>
        <UiTabPanel value="ship">Troisième panneau.</UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  ),
};

/** Onglets et panneaux acceptent du contenu riche. */
export const RichContent: Story = {
  render: (args) => (
    <UiTabs {...args} defaultValue="profile">
      <UiTabList aria-label="Compte">
        <UiTab value="profile" icon="user">
          Profil
        </UiTab>
        <UiTab value="notifications" icon="bell">
          Notifications
        </UiTab>
        <UiTab value="billing" icon="credit-card">
          Facturation
        </UiTab>
      </UiTabList>
      <UiTabPanels>
        <UiTabPanel value="profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-sm)' }}>
            <strong>Profil</strong> <UiTag label="Vérifié" level="success" size="small" />
          </div>
          <p>{LOREM}</p>
        </UiTabPanel>
        <UiTabPanel value="notifications">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-sm)' }}>
            <strong>Notifications</strong>{' '}
            <UiTag label="3 nouvelles" level="highlight" size="small" />
          </div>
          <p>{LOREM}</p>
        </UiTabPanel>
        <UiTabPanel value="billing">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-sm)' }}>
            <strong>Facturation</strong>{' '}
            <UiTag label="Action requise" level="warning" size="small" />
          </div>
          <p>{LOREM}</p>
        </UiTabPanel>
      </UiTabPanels>
    </UiTabs>
  ),
};

/**
 * Menu de navigation : des onglets **sans panneaux**, le contenu venant d'une
 * route. Sans `UiTabPanels`, les onglets n'annoncent aucun `aria-controls`, qui
 * ne pointerait alors sur rien.
 */
function TabMenuDemo(args: ComponentProps<typeof UiTabs>) {
  const [route, setRoute] = useState<UiTabValue>('dashboard');

  return (
    <>
      <UiTabs {...args} value={route} onValueChange={setRoute}>
        <UiTabList aria-label="Navigation principale">
          <UiTab value="dashboard" icon="gauge">
            Tableau de bord
          </UiTab>
          <UiTab value="team" icon="users">
            Équipe
          </UiTab>
          <UiTab value="projects" icon="folder">
            Projets
          </UiTab>
          <UiTab value="reports" icon="chart-line">
            Rapports
          </UiTab>
        </UiTabList>
      </UiTabs>

      <div
        style={{
          marginTop: 'var(--units-md)',
          padding: 'var(--units-md)',
          border: '1px dashed var(--global-border-default)',
          borderRadius: 'var(--radius-default)',
          fontSize: 14,
        }}
      >
        Route active : <strong>/{route}</strong>
      </div>
    </>
  );
}

export const TabMenu: Story = { render: (args) => <TabMenuDemo {...args} /> };
