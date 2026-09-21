import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';
import type { UiFeedbackLevel } from '../../core/types';

import { UiAlert } from './ui-alert';

const LEVELS: UiFeedbackLevel[] = ['default', 'highlight', 'success', 'warning', 'error'];

const meta: Meta<typeof UiAlert> = {
  title: 'Components/ui/informative/ui-alert',
  component: UiAlert,
  args: {
    title: 'Titre du message',
    text: 'Corps du message.',
    level: 'default',
    subLevel: 'high',
    size: 'default',
    icon: true,
    closable: true,
  },
  argTypes: {
    title: { control: 'text' },
    text: { control: 'text' },
    level: { control: 'select', options: LEVELS },
    subLevel: { control: 'inline-radio', options: ['high', 'low'] },
    size: { control: 'inline-radio', options: ['default', 'large'] },
    icon: { control: 'text' },
    closable: { control: 'boolean' },
    closeIcon: { control: 'text' },
    closeAriaLabel: { control: 'text' },
    life: { control: 'number' },
    open: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=148-921',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiAlert>;

export const Default: Story = {};

/** Le niveau porte la sévérité : famille de couleur et icône par défaut. */
export const Levels: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      {LEVELS.map((level) => (
        <UiAlert {...args} key={level} level={level} title={level} />
      ))}
    </div>
  ),
};

/** `subLevel` module l'intensité : `high` soutenue, `low` discrète. */
export const SubLevelLow: Story = {
  args: { level: 'error', subLevel: 'low', title: 'Erreur', text: 'Variante discrète.' },
};

export const Large: Story = {
  args: { level: 'success', size: 'large', title: 'Succès', text: 'Taille large.' },
};

/** Un titre seul se centre : il n'y a pas de ligne de texte sur quoi s'aligner. */
export const TitleOnly: Story = { args: { text: undefined, title: 'Import terminé' } };

/** `icon` prend un nom pour surcharger le défaut du niveau, `false` pour le masquer. */
export const CustomIcon: Story = {
  args: { level: 'highlight', icon: 'bell', title: 'Notification', text: 'Icône surchargée.' },
};

export const NoIcon: Story = {
  args: { level: 'success', icon: false, title: 'Sans icône', text: 'Icône masquée.' },
};

/** Le contenu projeté se range sous le message : une action, un lien, une liste. */
export const WithContent: Story = {
  args: {
    level: 'warning',
    title: 'Quota bientôt atteint',
    text: 'Il reste 12 % de votre espace de stockage.',
    children: (
      <div style={{ marginTop: 'var(--units-sm)' }}>
        <UiButton label="Gérer le stockage" size="small" level="low" />
      </div>
    ),
  },
};

/** Sans bouton de fermeture, le message reste tant que l'appelant l'affiche. */
export const NotClosable: Story = {
  args: {
    level: 'error',
    closable: false,
    title: 'Le formulaire contient des erreurs',
    text: 'Corrigez les champs signalés avant de continuer.',
  },
};

/**
 * Une pile de messages : chacun se retire de la liste à sa fermeture, ce qui
 * est le mode **contrôlé** (`open` renseigné, le parent possède l'état).
 */
const STACK = [
  { id: 1, level: 'success' as const, title: 'Succès', text: 'Fichier importé.' },
  { id: 2, level: 'warning' as const, title: 'Attention', text: 'Quota bientôt atteint.' },
  { id: 3, level: 'error' as const, title: 'Erreur', text: 'Second fichier refusé.' },
];

function StackDemo() {
  const [messages, setMessages] = useState(STACK);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      {messages.map((m) => (
        <UiAlert
          key={m.id}
          open
          level={m.level}
          title={m.title}
          text={m.text}
          onClose={() => setMessages((list) => list.filter((x) => x.id !== m.id))}
        />
      ))}
      {messages.length === 0 && (
        <UiButton label="Tout réafficher" level="low" onClick={() => setMessages(STACK)} />
      )}
    </div>
  );
}

export const Stack: Story = { render: () => <StackDemo /> };

/** `life` fait disparaître le message tout seul. Le bouton en remonte un neuf. */
function LifeDemo() {
  // La clé remonte un composant neuf, donc un délai neuf : réafficher le même
  // exemplaire ne relancerait rien tant que `life` n'a pas changé.
  const [key, setKey] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      <UiButton label="Réafficher (3 s)" icon="bell" onClick={() => setKey((k) => k + 1)} />
      <UiAlert
        key={key}
        level="success"
        title="Enregistré"
        text="Ce message disparaît après 3 secondes."
        life={3000}
      />
    </div>
  );
}

export const Life: Story = { render: () => <LifeDemo /> };
