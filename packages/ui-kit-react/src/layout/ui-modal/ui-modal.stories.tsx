import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiButton } from '../../actions/ui-button';

import { UiModal, type ModalMotion, type ModalPosition } from './ui-modal';

const meta: Meta<typeof UiModal> = {
  title: 'Components/ui/layout/ui-modal',
  component: UiModal,
  args: {
    header: 'Confirmer la suppression',
    children: 'Cette action est définitive. Les données ne pourront pas être récupérées.',
    modal: true,
    closable: true,
    closeOnEscape: true,
    dismissableMask: false,
    showHeader: true,
    position: 'center',
    draggable: false,
    resizable: false,
    maximizable: false,
    motion: 'zoom',
    motionDisabled: false,
    // Cantonné : le dialogue reste dans le cadre de la story au lieu de
    // recouvrir tout Storybook, ce qui rend la doc lisible.
    contained: true,
  },
  argTypes: {
    header: { control: 'text' },
    children: { control: 'text' },
    modal: { control: 'boolean' },
    closable: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    dismissableMask: { control: 'boolean' },
    showHeader: { control: 'boolean' },
    draggable: { control: 'boolean' },
    resizable: { control: 'boolean' },
    maximizable: { control: 'boolean' },
    contained: { control: 'boolean' },
    motionDisabled: { control: 'boolean' },
    motion: {
      control: 'select',
      options: [
        'zoom',
        'fade',
        'slide-up',
        'slide-down',
        'slide-left',
        'slide-right',
      ] satisfies ModalMotion[],
    },
    position: {
      control: 'select',
      options: [
        'center',
        'top',
        'bottom',
        'left',
        'right',
        'topleft',
        'topright',
        'bottomleft',
        'bottomright',
      ] satisfies ModalPosition[],
    },
    visible: { control: false },
    footer: { control: false },
    breakpoints: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=278-2826',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiModal>;

// Un cadre borné : `contained` cale le dialogue sur le premier ancêtre
// positionné, ce qui garde chaque exemple dans sa vignette.
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

// Les stories à état déclarent un vrai composant : `useState` dans un `render`
// enfreint les règles des hooks.
//
// Elles démarrent FERMÉES, et c'est important. Un dialogue ouvert au montage
// masque son propre déclencheur, et sur une page de doc les onze exemples
// s'ouvrent en même temps : on croit alors que le dialogue « ne se ferme
// jamais », alors qu'on en ferme un parmi onze. Il revient en plus à chaque
// remontage de la story.
function Demo(args: React.ComponentProps<typeof UiModal>) {
  const [open, setOpen] = useState(false);

  return (
    <Cadre>
      <div style={{ padding: 'var(--units-lg)' }}>
        <UiButton label="Ouvrir le dialogue" onClick={() => setOpen(true)} />
      </div>
      <UiModal {...args} visible={open} onVisibleChange={setOpen} />
    </Cadre>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

/**
 * Le seul exemple ouvert d'emblée, pour montrer l'anatomie : en-tête avec son
 * titre et son bouton de fermeture, corps, et pied quand il y en a un.
 */
export const Opened: Story = {
  args: {
    footer: (
      <>
        <UiButton label="Annuler" level="low" />
        <UiButton label="Supprimer" level="error" />
      </>
    ),
  },
  render: (args) => (
    <Cadre>
      <UiModal {...args} defaultVisible />
    </Cadre>
  ),
};

export const WithFooter: Story = {
  args: {
    footer: (
      <>
        <UiButton label="Annuler" level="low" />
        <UiButton label="Supprimer" level="error" />
      </>
    ),
  },
  render: (args) => <Demo {...args} />,
};

/** Sans en-tête : le dialogue a besoin d'un `aria-label` pour rester nommé. */
export const WithoutHeader: Story = {
  args: { showHeader: false, 'aria-label': 'Message', header: undefined },
  render: (args) => <Demo {...args} />,
};

export const Positions: Story = {
  args: { position: 'topright', header: 'En haut à droite' },
  render: (args) => <Demo {...args} />,
};

const MOTIONS = [
  'zoom',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
] satisfies ModalMotion[];

// Un seul dialogue, dont le préréglage suit le bouton cliqué : six dialogues
// cantonnés côte à côte tiendraient mal, et l'intérêt est de comparer les
// mouvements en les enchaînant.
function DemoMotions(args: React.ComponentProps<typeof UiModal>) {
  const [motion, setMotion] = useState<ModalMotion | null>(null);

  return (
    <Cadre>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--units-sm)',
          padding: 'var(--units-lg)',
        }}
      >
        {MOTIONS.map((m) => (
          <UiButton key={m} label={m} size="small" level="low" onClick={() => setMotion(m)} />
        ))}
      </div>
      <UiModal
        {...args}
        motion={motion ?? 'zoom'}
        header={motion ?? 'zoom'}
        visible={motion !== null}
        onVisibleChange={(open) => !open && setMotion(null)}
      />
    </Cadre>
  );
}

export const Motions: Story = {
  args: { children: 'Le même dialogue, entré avec le préréglage choisi.' },
  render: (args) => <DemoMotions {...args} />,
};

/**
 * `motionDisabled` met la durée du mouvement à zéro pour ce dialogue : il
 * apparaît et disparaît d'un coup. Même effet, à l'échelle du kit, avec
 * `data-motion="off"` ou la préférence système de mouvement réduit.
 */
export const MotionDisabled: Story = {
  args: { motionDisabled: true, header: 'Sans animation' },
  render: (args) => <Demo {...args} />,
};

/**
 * Le clic sur l'arrière-plan ferme, en plus du bouton et de la touche Échap.
 *
 * Cet exemple n'est **pas** cantonné : `dismissableMask` a besoin d'un vrai
 * arrière-plan, que seul `showModal()` fournit. Ouvrez-le, puis cliquez à côté.
 */
export const DismissableMask: Story = {
  args: { dismissableMask: true, contained: false },
  render: (args) => <Demo {...args} />,
};

/** Non modal : l'arrière-plan reste actif, et rien n'est assombri. */
export const NonModal: Story = {
  args: { modal: false, contained: false, header: 'Panneau non modal' },
  render: (args) => <Demo {...args} />,
};

export const Draggable: Story = {
  args: { draggable: true, header: 'Glissez-moi par l’en-tête' },
  render: (args) => <Demo {...args} />,
};

export const Resizable: Story = {
  args: { resizable: true, header: 'Coin inférieur droit' },
  render: (args) => <Demo {...args} />,
};

export const Maximizable: Story = {
  args: { maximizable: true, header: 'Agrandissable' },
  render: (args) => <Demo {...args} />,
};

/**
 * Un corps qui déborde défile. Il ne devient un arrêt de tabulation que s'il ne
 * contient lui-même rien de focalisable.
 */
export const LongContent: Story = {
  args: {
    header: 'Conditions générales',
    children: Array.from({ length: 12 }, (_, i) => (
      <p key={i} style={{ marginTop: 0 }}>
        Paragraphe {i + 1}. Un contenu volontairement long, pour que la zone de corps déborde et se
        mette à défiler à l'intérieur du dialogue.
      </p>
    )),
  },
  render: (args) => <Demo {...args} />,
};
