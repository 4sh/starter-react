import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiButton } from '../../actions/ui-button';
import { UiTag } from '../../informative/ui-tag';

import { UiMenu, type UiMenuItem, type UiMenuProps } from './ui-menu';

const meta: Meta<UiMenuProps> = {
  title: 'Components/ui/navigation/ui-menu',
  component: UiMenu,
  args: {
    level: 'high',
    size: 'default',
    submenus: 'inline',
    autoFlip: true,
    motionDisabled: false,
  },
  argTypes: {
    items: { control: false },
    trigger: { control: false },
    renderItem: { control: false },
    renderHeader: { control: false },
    expandedKeys: { control: false },
    defaultExpandedKeys: { control: false },
    start: { control: false },
    end: { control: false },
    level: { control: 'inline-radio', options: ['high', 'low'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    submenus: { control: 'inline-radio', options: ['inline', 'flyout'] },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3094-10720',
    },
  },
};

export default meta;
type Story = StoryObj<UiMenuProps>;

/** Encadre le menu : sans largeur, un panneau en ligne prend celle de la page. */
function Box({ children, width = 280 }: { children: React.ReactNode; width?: number }) {
  return <div style={{ maxWidth: width }}>{children}</div>;
}

// --- Basic ---------------------------------------------------------------
const BASIC_ITEMS: UiMenuItem[] = [
  {
    label: 'Documents',
    items: [
      { label: 'Nouveau', icon: 'plus' },
      { label: 'Rechercher', icon: 'magnifying-glass' },
    ],
  },
  { separator: true },
  {
    label: 'Profil',
    items: [
      { label: 'Paramètres', icon: 'gear' },
      { label: 'Messages', icon: 'inbox' },
      { label: 'Déconnexion', icon: 'right-from-bracket' },
    ],
  },
];

/** Sections titrées, séparées par un filet. Un groupe de premier niveau n'est pas repliable. */
export const Basic: Story = {
  render: (args) => (
    <Box>
      <UiMenu {...args} items={BASIC_ITEMS} aria-label="Menu principal" />
    </Box>
  ),
};

// --- Group ---------------------------------------------------------------
/** Les icônes des entrées sont DÉDUITES du modèle : le `command` bascule l'état. */
function GroupDemo(props: UiMenuProps) {
  const [vus, setVus] = useState<string[]>(['brouillons']);
  const [tri, setTri] = useState('date');

  const bascule = (id: string) =>
    setVus((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const items: UiMenuItem[] = [
    {
      label: 'Afficher',
      items: [
        { id: 'brouillons', label: 'Brouillons' },
        { id: 'archives', label: 'Archives' },
      ].map((entry) => ({
        ...entry,
        icon: vus.includes(entry.id) ? 'square-check' : 'square',
        command: () => bascule(entry.id),
      })),
    },
    { separator: true },
    {
      label: 'Trier par',
      items: [
        { id: 'date', label: 'Date' },
        { id: 'nom', label: 'Nom' },
      ].map((entry) => ({
        ...entry,
        icon: tri === entry.id ? 'circle-dot' : 'circle',
        command: () => setTri(entry.id),
      })),
    },
  ];

  return (
    <Box>
      <UiMenu {...props} items={items} aria-label="Affichage" />
      <p style={{ marginTop: 'var(--units-md)', display: 'flex', gap: 'var(--units-xs)' }}>
        {vus.map((id) => (
          <UiTag key={id} label={id} level="highlight" />
        ))}
        <UiTag label={`tri : ${tri}`} />
      </p>
    </Box>
  );
}

export const Group: Story = { render: (args) => <GroupDemo {...args} /> };

// --- Toggleable ----------------------------------------------------------
const TOGGLEABLE_ITEMS: UiMenuItem[] = [
  {
    id: 'fichiers',
    label: 'Fichiers',
    icon: 'folder',
    // Un groupe racine n'est pas repliable par défaut : ici on le force.
    toggleable: true,
    expanded: true,
    items: [
      { label: 'Récents', icon: 'clock-rotate-left' },
      {
        id: 'partages',
        label: 'Partagés',
        icon: 'users',
        // Un groupe imbriqué est repliable par défaut : ici on le fige ouvert.
        toggleable: false,
        items: [{ label: 'Par moi' }, { label: 'Avec moi' }],
      },
      { label: 'Corbeille', icon: 'trash', disabled: true },
    ],
  },
  {
    id: 'equipe',
    label: 'Équipe',
    icon: 'building',
    toggleable: true,
    items: [{ label: 'Membres' }, { label: 'Invitations' }],
  },
];

/** `toggleable` force le comportement par entrée, dans les deux sens. */
export const Toggleable: Story = {
  render: (args) => (
    <Box>
      <UiMenu {...args} items={TOGGLEABLE_ITEMS} aria-label="Espace de travail" />
    </Box>
  ),
};

// --- Popup ---------------------------------------------------------------
const POPUP_ITEMS: UiMenuItem[] = [
  { label: 'Renommer', icon: 'pen' },
  { label: 'Dupliquer', icon: 'copy' },
  { separator: true },
  { label: 'Supprimer', icon: 'trash' },
];

/** Le panneau vit dans le calque supérieur, ancré au déclencheur. */
export const Popup: Story = {
  args: { popup: true },
  render: (args) => (
    <div style={{ minHeight: 220 }}>
      <UiMenu
        {...args}
        items={POPUP_ITEMS}
        aria-label="Actions du document"
        trigger={(props) => <UiButton {...props} label="Actions" icon="ellipsis" iconPos="right" />}
      />
    </div>
  ),
  // Le panneau est fermé au repos, donc invisible au contrôle d'accessibilité.
  // `play` tourne avant ce contrôle, et PAS sur la page de doc : le panneau est
  // donc examiné par axe sans flotter par-dessus le reste de la page.
  play: async ({ canvasElement }) => {
    (canvasElement.querySelector('.ui-button') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 50));
  },
};

// --- Flyout --------------------------------------------------------------
const FLYOUT_ITEMS: UiMenuItem[] = [
  {
    id: 'exporter',
    label: 'Exporter',
    icon: 'file-export',
    items: [
      { label: 'PDF', icon: 'file-pdf' },
      { label: 'CSV', icon: 'file-csv' },
      {
        id: 'image',
        label: 'Image',
        items: [{ label: 'PNG' }, { label: 'SVG' }],
      },
    ],
  },
  {
    label: 'Partager',
    icon: 'share-nodes',
    items: [{ label: 'Par lien' }, { label: 'Par courriel' }],
  },
  { separator: true },
  { label: 'Imprimer', icon: 'print' },
];

/** `submenus="flyout"` : tout groupe devient un panneau latéral en cascade. */
export const Flyout: Story = {
  args: { submenus: 'flyout' },
  render: (args) => (
    <div style={{ minHeight: 220 }}>
      <Box width={220}>
        <UiMenu {...args} items={FLYOUT_ITEMS} aria-label="Document" />
      </Box>
    </div>
  ),
  // Ouvre la cascade pour le contrôle d'accessibilité. Un panneau du calque
  // supérieur laissé ouvert au repos flotterait par-dessus toute la page de doc,
  // et resterait où il a été posé : `autoUpdate` ne voit pas une ancre déplacée
  // par la mise en page.
  play: async ({ canvasElement }) => {
    const parent = [...canvasElement.querySelectorAll('.ui-menu-action')].find((entry) =>
      entry.textContent?.trim().startsWith('Exporter'),
    ) as HTMLElement;
    parent.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
  },
};

// --- Compact -------------------------------------------------------------
/** Densité réduite, pour un menu d'actions de ligne ou de cellule. */
export const Compact: Story = {
  args: { size: 'small' },
  render: (args) => (
    <Box width={200}>
      <UiMenu {...args} items={POPUP_ITEMS} aria-label="Actions de la ligne" />
    </Box>
  ),
};

// --- Slots ---------------------------------------------------------------
/** `renderItem`, `renderHeader`, et les zones `start` / `end` autour de la liste. */
export const Slots: Story = {
  render: (args) => (
    <Box>
      <UiMenu
        {...args}
        items={[
          {
            label: 'Notifications',
            items: [
              { id: 'mentions', label: 'Mentions', icon: 'at' },
              { id: 'reponses', label: 'Réponses', icon: 'reply' },
            ],
          },
        ]}
        aria-label="Notifications"
        renderHeader={(item) => (
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
        )}
        renderItem={(item) => (
          <>
            <span className="ui-menu-item-label">{item.label}</span>
            <UiTag label={item.id === 'mentions' ? '3' : '12'} level="highlight" size="small" />
          </>
        )}
        start={<strong>Boîte de réception</strong>}
        end={<small>Mis à jour à l&apos;instant</small>}
      />
    </Box>
  ),
};

// --- Command -------------------------------------------------------------
/** `command` par entrée, `onItemClick` pour tout le menu. */
function CommandDemo(props: UiMenuProps) {
  const [journal, setJournal] = useState<string[]>([]);
  const items: UiMenuItem[] = [
    {
      label: 'Enregistrer',
      icon: 'floppy-disk',
      command: () => setJournal((l) => ['Enregistrer', ...l]),
    },
    { label: 'Publier', icon: 'paper-plane', command: () => setJournal((l) => ['Publier', ...l]) },
    { label: 'Verrouillé', icon: 'lock', disabled: true },
  ];
  return (
    <Box>
      <UiMenu {...props} items={items} aria-label="Document" />
      <pre style={{ marginTop: 'var(--units-md)', fontSize: 12 }}>
        {journal.slice(0, 3).join('\n') || 'Aucune commande'}
      </pre>
    </Box>
  );
}

export const Command: Story = { render: (args) => <CommandDemo {...args} /> };

// --- Links ---------------------------------------------------------------
const LINK_ITEMS: UiMenuItem[] = [
  {
    label: 'Navigation',
    items: [
      // `render` remplace `routerLink` : le kit n'impose aucun routeur.
      {
        label: 'Tableau de bord',
        icon: 'chart-line',
        active: true,
        render: (props, children) => (
          <a {...props} href="#tableau-de-bord">
            {children}
          </a>
        ),
      },
      {
        label: 'Rapports',
        icon: 'file-lines',
        render: (props, children) => (
          <a {...props} href="#rapports">
            {children}
          </a>
        ),
      },
      {
        label: 'Documentation',
        icon: 'book',
        url: 'https://developer.mozilla.org',
        target: '_blank',
      },
    ],
  },
];

/** `url` pour une ancre native, `render` pour le composant de lien du projet. */
export const Links: Story = {
  render: (args) => (
    <Box>
      <UiMenu {...args} items={LINK_ITEMS} aria-label="Sections" />
    </Box>
  ),
};

// --- Controlled ----------------------------------------------------------
/** `expandedKeys` pilote les groupes repliables depuis l'extérieur. */
function ControlledDemo(props: UiMenuProps) {
  const [keys, setKeys] = useState<Record<string, boolean>>({ fichiers: true });
  return (
    <Box>
      <div style={{ display: 'flex', gap: 'var(--units-sm)', marginBottom: 'var(--units-md)' }}>
        <UiButton
          label="Tout ouvrir"
          size="small"
          variant="outlined"
          onClick={() => setKeys({ fichiers: true, equipe: true, partages: true })}
        />
        <UiButton label="Tout fermer" size="small" variant="outlined" onClick={() => setKeys({})} />
      </div>
      <UiMenu
        {...props}
        items={TOGGLEABLE_ITEMS}
        aria-label="Espace de travail"
        expandedKeys={keys}
        onExpandedKeysChange={setKeys}
      />
      <pre style={{ marginTop: 'var(--units-md)', fontSize: 12 }}>{JSON.stringify(keys)}</pre>
    </Box>
  );
}

export const Controlled: Story = { render: (args) => <ControlledDemo {...args} /> };

// --- Low -----------------------------------------------------------------
/** Famille de couleur `low`, pour un menu posé sur une surface déjà teintée. */
export const Low: Story = {
  args: { level: 'low' },
  render: (args) => (
    <Box>
      <UiMenu {...args} items={BASIC_ITEMS} aria-label="Menu secondaire" />
    </Box>
  ),
};
