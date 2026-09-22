import { useEffect, useId, useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiToast } from './ui-toast';
import { UiToastContainer } from './ui-toast-container';
import { uiToast } from './ui-toast-store';
import { UI_TOAST_POSITIONS, type UiToastPosition } from './ui-toast.types';

/** Cadre positionné : `contained` y ancre la pile, qui reste dans le canevas. */
const BOX: CSSProperties = {
  position: 'relative',
  minHeight: 240,
  padding: 16,
  border: '1px dashed var(--global-border-default)',
  borderRadius: 12,
  overflow: 'hidden',
};

/**
 * Un canal par démonstration, vidé au démontage : le magasin est un singleton
 * de module, donc sans ça un toast affiché ici réapparaîtrait dans la story
 * suivante.
 */
function useDemoChannel(): string {
  const channel = useId();
  useEffect(() => () => uiToast.clear(channel), [channel]);
  return channel;
}

const meta: Meta<typeof UiToast> = {
  title: 'Components/ui/informative/ui-toast',
  component: UiToast,
  args: {
    title: 'Toast title',
    text: 'Toast text',
    level: 'default',
    subLevel: 'high',
    icon: true,
    closable: true,
    expanded: false,
  },
  argTypes: {
    level: {
      control: 'inline-radio',
      options: ['default', 'highlight', 'success', 'warning', 'error'],
    },
    subLevel: { control: 'inline-radio', options: ['high', 'low'] },
    icon: { control: 'text' },
    closable: { control: 'boolean' },
    expanded: { control: 'boolean' },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiToast>;

/** Banc d'essai : la carte seule, pilotée par les contrôles. */
export const Default: Story = {};

/** Usage nominal : un bouton pousse un message dans le magasin. */
function BasicDemo() {
  const channel = useDemoChannel();
  const [count, setCount] = useState(0);

  return (
    <div style={BOX}>
      <UiButton
        label="Afficher un toast"
        onClick={() => {
          setCount((n) => n + 1);
          uiToast.add({
            channel,
            title: 'Notification',
            text: `Ceci est le toast n°${count + 1}.`,
          });
        }}
      />
      <UiToastContainer channel={channel} position="top-right" contained life={4000} />
    </div>
  );
}

export const Basic: Story = {
  render: () => <BasicDemo />,
  parameters: { layout: 'padded' },
};

/** Les cinq niveaux sémantiques, en cartes posées. */
export const Levels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 360 }}>
      <UiToast level="default" title="Information" text="Message d'information neutre." />
      <UiToast level="highlight" title="À noter" text="Information mise en avant." />
      <UiToast level="success" title="Succès" text="L'opération a réussi." />
      <UiToast level="warning" title="Attention" text="Vérifiez avant de continuer." />
      <UiToast level="error" title="Erreur" text="Une erreur est survenue." />
    </div>
  ),
};

/** Intensité basse : les mêmes niveaux, en plus discret. */
export const SubLevelLow: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 360 }}>
      <UiToast level="default" subLevel="low" title="Information" text="Variante subtile." />
      <UiToast level="success" subLevel="low" title="Succès" text="Variante subtile." />
      <UiToast level="error" subLevel="low" title="Erreur" text="Variante subtile." />
    </div>
  ),
};

/** Un message « en cours » remplacé par son résultat : le motif des opérations asynchrones. */
function PromiseDemo() {
  const channel = useDemoChannel();
  const [busy, setBusy] = useState(false);

  const run = () => {
    if (busy) return;
    setBusy(true);
    const id = uiToast.add({
      channel,
      level: 'highlight',
      title: 'Traitement…',
      text: 'Enregistrement en cours.',
      icon: 'circle-notch',
      sticky: true,
      closable: false,
    });
    setTimeout(() => {
      uiToast.remove(id);
      uiToast.add({
        channel,
        level: 'success',
        title: 'Enregistré',
        text: 'Vos données ont bien été sauvegardées.',
      });
      setBusy(false);
    }, 1800);
  };

  return (
    <div style={BOX}>
      <UiButton label="Enregistrer (async)" loading={busy} onClick={run} />
      <UiToastContainer channel={channel} position="top-right" contained />
    </div>
  );
}

export const Promise: Story = {
  render: () => <PromiseDemo />,
  parameters: { layout: 'padded' },
};

/** `sticky` : jamais de disparition automatique, c'est l'utilisateur qui ferme. */
function StickyDemo() {
  const channel = useDemoChannel();

  return (
    <div style={BOX}>
      <UiButton
        label="Toast persistant"
        onClick={() =>
          uiToast.add({
            channel,
            level: 'warning',
            title: 'Action requise',
            text: 'Ce message reste affiché jusqu’à fermeture manuelle.',
            sticky: true,
          })
        }
      />
      <UiToastContainer channel={channel} position="top-right" contained />
    </div>
  );
}

export const Sticky: Story = {
  render: () => <StickyDemo />,
  parameters: { layout: 'padded' },
};

/** `renderToast` remplace le corps de la carte, et reçoit la charge `data`. */
interface Activity {
  name: string;
  action: string;
  at: string;
}

function CustomDemo() {
  const channel = useDemoChannel();

  return (
    <div style={BOX}>
      <UiButton
        label="Afficher un toast personnalisé"
        onClick={() =>
          uiToast.add({
            channel,
            level: 'highlight',
            sticky: true,
            data: {
              name: 'Camille Durand',
              action: 'a commenté votre demande',
              at: 'il y a quelques secondes',
            } satisfies Activity,
          })
        }
      />
      <UiToastContainer
        channel={channel}
        position="top-right"
        contained
        renderToast={(message) => {
          const activity = message.data as Activity;
          return (
            <>
              <span style={{ fontWeight: 700 }}>{activity.name}</span>
              <span style={{ fontSize: '0.875rem' }}>{activity.action}</span>
              <span style={{ marginTop: 4, fontSize: '0.75rem', opacity: 0.75 }}>
                {activity.at}
              </span>
            </>
          );
        }}
      />
    </div>
  );
}

export const Custom: Story = {
  render: () => <CustomDemo />,
  parameters: { layout: 'padded' },
};

/** Les sept ancrages. Le préréglage de mouvement suit le bord choisi. */
function PositionDemo() {
  const channel = useDemoChannel();
  const [position, setPosition] = useState<UiToastPosition>('top-right');

  return (
    <div style={{ ...BOX, minHeight: 320 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {UI_TOAST_POSITIONS.map((candidate) => (
          <UiButton
            key={candidate}
            label={candidate}
            size="small"
            level={candidate === position ? 'high' : 'low'}
            onClick={() => {
              setPosition(candidate);
              uiToast.clear(channel);
              uiToast.add({ channel, title: candidate, text: 'Pile ancrée ici.', sticky: true });
            }}
          />
        ))}
      </div>
      <UiToastContainer channel={channel} position={position} contained />
    </div>
  );
}

export const Position: Story = {
  render: () => <PositionDemo />,
  parameters: { layout: 'padded' },
};

/** Mode bannière : la carte occupe toute la largeur de la pile. */
function ExpandedDemo() {
  const channel = useDemoChannel();

  return (
    <div style={BOX}>
      <UiButton
        label="Afficher une bannière"
        onClick={() =>
          uiToast.add({
            channel,
            level: 'success',
            title: 'Synchronisation terminée',
            text: 'Les 128 fiches ont été mises à jour.',
            sticky: true,
          })
        }
      />
      <UiToastContainer channel={channel} position="top-center" contained expanded />
    </div>
  );
}

export const ExpandedMode: Story = {
  render: () => <ExpandedDemo />,
  parameters: { layout: 'padded' },
};

/** Un message porteur d'actions doit être `sticky` : il ne part pas sous le doigt. */
function ActionDemo() {
  const channel = useDemoChannel();

  return (
    <div style={BOX}>
      <UiButton
        label="Supprimer l'élément"
        onClick={() =>
          uiToast.add({
            channel,
            level: 'default',
            title: 'Élément supprimé',
            sticky: true,
            data: 'action',
          })
        }
      />
      <UiToastContainer
        channel={channel}
        position="bottom-right"
        contained
        renderToast={(message, { close }) => (
          <>
            <span style={{ fontWeight: 700 }}>{message.title}</span>
            <UiButton label="Annuler" size="small" level="low" onClick={close} />
          </>
        )}
      />
    </div>
  );
}

export const Action: Story = {
  render: () => <ActionDemo />,
  parameters: { layout: 'padded' },
};

/** Plafond de cartes visibles, écart resserré, et doublons écartés. */
function StackingDemo() {
  const channel = useDemoChannel();
  const [count, setCount] = useState(0);

  return (
    <div style={{ ...BOX, minHeight: 320 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <UiButton
          label="Empiler"
          onClick={() => {
            setCount((n) => n + 1);
            uiToast.add({
              channel,
              title: `Message ${count + 1}`,
              text: 'Trois au plus restent visibles.',
              sticky: true,
            });
          }}
        />
        <UiButton
          label="Doublon"
          level="low"
          onClick={() =>
            uiToast.add({ channel, title: 'Doublon', text: 'Toujours le même.', sticky: true })
          }
        />
        <UiButton label="Vider" level="low" onClick={() => uiToast.clear(channel)} />
      </div>
      <UiToastContainer
        channel={channel}
        position="top-right"
        contained
        stackVisibleLimit={3}
        stackGap={4}
        preventDuplicates
      />
    </div>
  );
}

export const Stacking: Story = {
  render: () => <StackingDemo />,
  parameters: { layout: 'padded' },
};

/** Mouvement coupé : les cartes paraissent et partent net. */
function MotionOffDemo() {
  const channel = useDemoChannel();

  return (
    <div style={BOX}>
      <UiButton
        label="Afficher un toast"
        onClick={() => uiToast.add({ channel, title: 'Sans animation', text: 'Apparition nette.' })}
      />
      <UiToastContainer channel={channel} position="top-right" contained motionDisabled />
    </div>
  );
}

export const MotionOff: Story = {
  render: () => <MotionOffDemo />,
  parameters: { layout: 'padded' },
};
