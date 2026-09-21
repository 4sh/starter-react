import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiButton } from '../../actions/ui-button';

import { UiDrawer, type DrawerPosition } from './ui-drawer';

const POSITIONS: DrawerPosition[] = ['left', 'right', 'top', 'bottom'];

const meta: Meta<typeof UiDrawer> = {
  title: 'Components/ui/layout/ui-drawer',
  component: UiDrawer,
  args: {
    header: 'Filtres',
    children: 'Le corps du tiroir reçoit un contenu libre : un formulaire, une liste, du texte.',
    position: 'left',
    modal: true,
    dismissableMask: true,
    closable: true,
    closeOnEscape: true,
    showHeader: true,
    fullScreen: false,
    motionDisabled: false,
    // Cantonné : le tiroir reste dans le cadre de la story au lieu de recouvrir
    // toute la documentation.
    contained: true,
  },
  argTypes: {
    header: { control: 'text' },
    children: { control: 'text' },
    position: { control: 'inline-radio', options: POSITIONS },
    modal: { control: 'boolean' },
    dismissableMask: { control: 'boolean' },
    closable: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    showHeader: { control: 'boolean' },
    fullScreen: { control: 'boolean' },
    contained: { control: 'boolean' },
    motionDisabled: { control: 'boolean' },
    visible: { control: false },
    footer: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=672-219',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiDrawer>;

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 440,
        height: 260,
        overflow: 'hidden',
        border: '1px solid var(--global-border-subtle)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--global-background-muted)',
      }}
    >
      {children}
    </div>
  );
}

// Les stories démarrent FERMÉES : un tiroir ouvert au montage masque son propre
// déclencheur, et sur une page de doc tous les exemples s'ouvriraient ensemble.
function Demo(args: React.ComponentProps<typeof UiDrawer>) {
  const [open, setOpen] = useState(false);

  return (
    <Cadre>
      <div style={{ padding: 'var(--units-lg)' }}>
        <UiButton label="Ouvrir le tiroir" onClick={() => setOpen(true)} />
      </div>
      <UiDrawer {...args} visible={open} onVisibleChange={setOpen} />
    </Cadre>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

/** Le seul exemple ouvert d'emblée, pour montrer l'anatomie du tiroir. */
export const Opened: Story = {
  args: {
    footer: (
      <>
        <UiButton label="Réinitialiser" level="low" size="small" />
        <UiButton label="Appliquer" size="small" />
      </>
    ),
  },
  render: (args) => (
    <Cadre>
      <UiDrawer {...args} defaultVisible />
    </Cadre>
  ),
};

export const Positions: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-lg)', flexWrap: 'wrap' }}>
      {POSITIONS.map((position) => (
        <Cadre key={position}>
          <UiDrawer
            {...args}
            defaultVisible
            position={position}
            header={position}
            footer={undefined}
          />
        </Cadre>
      ))}
    </div>
  ),
};

export const Right: Story = { args: { position: 'right' }, render: (args) => <Demo {...args} /> };
export const Bottom: Story = { args: { position: 'bottom' }, render: (args) => <Demo {...args} /> };

export const FullScreen: Story = {
  args: { fullScreen: true, header: 'Plein écran' },
  render: (args) => <Demo {...args} />,
};

/** Sans en-tête : le tiroir a besoin d'un `aria-label` pour rester nommé. */
export const WithoutHeader: Story = {
  args: { showHeader: false, header: undefined, 'aria-label': 'Panneau latéral' },
  render: (args) => <Demo {...args} />,
};

/**
 * Non cantonné : le vrai tiroir, sur toute la hauteur de l'écran, avec son
 * arrière-plan assombri. Cliquez à côté pour le refermer.
 */
export const RealModal: Story = {
  args: { contained: false, position: 'right' },
  render: (args) => <Demo {...args} />,
};

/** Animation coupée pour ce tiroir seulement, sans toucher au réglage global. */
export const MotionDisabled: Story = {
  args: { motionDisabled: true, contained: false, position: 'right' },
  render: (args) => <Demo {...args} />,
};

/** Non modal : la page derrière reste utilisable, et rien n'est assombri. */
export const NonModal: Story = {
  args: { modal: false, contained: false, header: 'Tiroir non modal' },
  render: (args) => <Demo {...args} />,
};

/** Un corps long défile à l'intérieur du tiroir, l'en-tête et le pied restant fixes. */
export const LongContent: Story = {
  args: {
    header: 'Conditions',
    footer: <UiButton label="Accepter" size="small" />,
    children: Array.from({ length: 14 }, (_, i) => (
      <p key={i} style={{ marginTop: 0 }}>
        Paragraphe {i + 1}. Un contenu volontairement long, pour que le corps déborde et se mette à
        défiler à l'intérieur du tiroir.
      </p>
    )),
  },
  render: (args) => <Demo {...args} />,
};
