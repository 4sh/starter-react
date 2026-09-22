import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';
import { UiInput } from '../../forms/ui-input';

import { UiBottomSheet, type UiBottomSheetProps } from './ui-bottom-sheet';

/** Cadre positionné : `contained` y ancre le panneau, qui reste dans le canevas. */
const PHONE: CSSProperties = {
  position: 'relative',
  width: 340,
  height: 420,
  overflow: 'hidden',
  border: '1px solid var(--global-border-default)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--global-background-muted)',
};

/**
 * Chaque exemple ouvre son propre panneau. Il se pose au bas du canevas de la
 * story, qui est une fenêtre à lui seul : c'est bien le panneau modal réel, avec
 * son arrière-plan et son piège de focus.
 */
function Demo({
  label = 'Ouvrir',
  children,
  ...props
}: Partial<UiBottomSheetProps> & { label?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <UiButton label={label} onClick={() => setOpen(true)} />
      <UiBottomSheet visible={open} onVisibleChange={setOpen} {...props}>
        {children}
      </UiBottomSheet>
    </>
  );
}

const meta: Meta<typeof UiBottomSheet> = {
  title: 'Components/ui/layout/ui-bottom-sheet',
  component: UiBottomSheet,
  args: {
    height: 'auto',
    modal: true,
    dismissableMask: true,
    closeOnEscape: true,
    enableDragToClose: true,
    dragThreshold: 96,
    enableSnapping: false,
    showHandle: true,
    closable: false,
    safeArea: true,
  },
  argTypes: {
    height: { control: 'text' },
    modal: { control: 'boolean' },
    dismissableMask: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    enableDragToClose: { control: 'boolean' },
    dragThreshold: { control: 'number' },
    enableSnapping: { control: 'boolean' },
    showHandle: { control: 'boolean' },
    closable: { control: 'boolean' },
    safeArea: { control: 'boolean' },
    visible: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=269-2273',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiBottomSheet>;

/** Le cas nominal : un titre, un corps, et la hauteur qui épouse le contenu. */
export const Basic: Story = {
  render: (args) => (
    <Demo {...args} header="Partager" closable>
      Choisissez une application pour partager ce contenu.
    </Demo>
  ),
};

/** Les trois paliers, plus n'importe quelle longueur CSS. */
export const Heights: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Demo {...args} label="auto" height="auto" header="Auto">
        La hauteur épouse le contenu, sous un plafond qui laisse voir la page.
      </Demo>
      <Demo {...args} label="half" height="half" header="Moitié">
        La moitié de la hauteur du conteneur.
      </Demo>
      <Demo {...args} label="full" height="full" header="Plein">
        Toute la hauteur du conteneur.
      </Demo>
      <Demo {...args} label="70%" height="70%" header="Sur mesure">
        N'importe quelle longueur CSS fait un palier.
      </Demo>
    </div>
  ),
};

/** `autoFocusElement` dirige le focus sur le champ plutôt que sur la première cible. */
export const Search: Story = {
  render: (args) => (
    <Demo
      {...args}
      label="Rechercher"
      height="half"
      header="Recherche"
      autoFocusElement="#recherche-panneau"
    >
      <UiInput id="recherche-panneau" label="Mot-clé" placeholder="Nom, référence…" />
    </Demo>
  ),
};

/** Un pied d'actions, qui reste en place pendant que le corps défile. */
export const Actions: Story = {
  render: (args) => (
    <Demo
      {...args}
      label="Confirmer"
      header="Supprimer l'élément"
      footer={
        <>
          <UiButton label="Annuler" level="low" />
          <UiButton label="Supprimer" level="high" />
        </>
      }
    >
      Cette action est définitive.
    </Demo>
  ),
};

/** Le corps défile seul : l'en-tête et le pied ne bougent pas. */
export const ScrollingContent: Story = {
  render: (args) => (
    <Demo {...args} label="Voir la liste" height="half" header="Historique">
      <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
        {Array.from({ length: 30 }, (_, index) => (
          <li key={index} style={{ padding: '4px 0' }}>
            Opération numéro {index + 1}
          </li>
        ))}
      </ul>
    </Demo>
  ),
};

/** Un panneau `half` qu'on tire vers le haut pour le passer à `full`, et retour. */
export const Snapping: Story = {
  render: (args) => (
    <Demo {...args} label="Ouvrir" height="half" enableSnapping header="Titres">
      Tirez la poignée vers le haut pour agrandir le panneau, vers le bas pour le réduire. Au
      clavier, les flèches haut et bas font la même chose.
    </Demo>
  ),
};

/** Sans arrière-plan : le panneau ne bloque plus la page derrière lui. */
export const NoBackdrop: Story = {
  render: (args) => (
    <Demo {...args} label="Ouvrir" modal={false} header="Lecture en cours">
      La page reste utilisable pendant que le panneau est ouvert.
    </Demo>
  ),
};

/** Sans poignée ni glissement : le panneau ne se ferme que par ses contrôles. */
export const NoDrag: Story = {
  render: (args) => (
    <Demo
      {...args}
      label="Ouvrir"
      showHandle={false}
      enableDragToClose={false}
      dismissableMask={false}
      header="Conditions"
      closable
      footer={<UiButton label="J'accepte" />}
    >
      Ce panneau ne se referme ni au glissement ni au clic à côté.
    </Demo>
  ),
};

/**
 * `contained` cantonne le panneau au premier ancêtre positionné, pour l'embarquer
 * dans un cadre borné. Il devient alors **non modal** : pas d'arrière-plan
 * assombri, pas de piège de focus, pas de blocage du défilement, puisque le
 * calque supérieur est toujours relatif à la fenêtre.
 */
function ContainedDemo(args: Partial<UiBottomSheetProps>) {
  const [open, setOpen] = useState(true);

  return (
    <div style={PHONE}>
      <div style={{ padding: 'var(--units-lg)' }}>
        <UiButton label="Ouvrir" onClick={() => setOpen(true)} />
      </div>
      <UiBottomSheet {...args} contained visible={open} onVisibleChange={setOpen} header="Filtres">
        Le panneau se pose au bas de ce cadre, et non au bas de la fenêtre.
      </UiBottomSheet>
    </div>
  );
}

export const Contained: Story = {
  args: { height: 'half', closable: true },
  render: (args) => <ContainedDemo {...args} />,
};
