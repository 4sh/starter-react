import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';
import { UiTag } from '../../informative/ui-tag';

import {
  UiStep,
  UiStepItem,
  UiStepList,
  UiStepPanel,
  UiStepPanels,
  UiStepper,
  useUiStepper,
  type UiStepValue,
} from './ui-stepper';

const BOX: CSSProperties = { maxWidth: 720 };

const meta: Meta<typeof UiStepper> = {
  title: 'Components/ui/navigation/ui-stepper',
  component: UiStepper,
  args: {
    orientation: 'horizontal',
    linear: false,
    lazy: false,
    motion: true,
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    linear: { control: 'boolean' },
    lazy: { control: 'boolean' },
    motion: { control: 'boolean' },
    completedIcon: { control: 'text' },
    value: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2085-3935',
    },
  },
  decorators: [
    (Story) => (
      <div style={BOX}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiStepper>;

/** Trois étapes : la bande au-dessus, un panneau par étape en dessous. */
export const Basic: Story = {
  render: (args) => (
    <UiStepper {...args} defaultValue={1}>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Compte</UiStep>
        <UiStep value={2}>Profil</UiStep>
        <UiStep value={3}>Confirmation</UiStep>
      </UiStepList>
      <UiStepPanels>
        <UiStepPanel value={1}>Créez votre compte pour commencer.</UiStepPanel>
        <UiStepPanel value={2}>Complétez votre profil.</UiStepPanel>
        <UiStepPanel value={3}>Vérifiez et confirmez vos informations.</UiStepPanel>
      </UiStepPanels>
    </UiStepper>
  ),
};

/** En vertical, chaque `UiStepItem` porte son en-tête et son panneau, juste dessous. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <UiStepper {...args} defaultValue={2} aria-label="Commande">
      <UiStepItem value={1}>
        <UiStep>Panier</UiStep>
        <UiStepPanel>Trois articles, 74,90 €.</UiStepPanel>
      </UiStepItem>
      <UiStepItem value={2}>
        <UiStep>Livraison</UiStep>
        <UiStepPanel>Choisissez une adresse et un mode de livraison.</UiStepPanel>
      </UiStepItem>
      <UiStepItem value={3}>
        <UiStep>Paiement</UiStep>
        <UiStepPanel>Renseignez votre moyen de paiement.</UiStepPanel>
      </UiStepItem>
    </UiStepper>
  ),
};

/** `linear` désactive les étapes à venir : on avance avec les boutons du panneau. */
function Suivant() {
  const { next, prev, isFirst, isLast } = useUiStepper();

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <UiButton label="Précédent" level="low" size="small" disabled={isFirst} onClick={prev} />
      <UiButton label="Suivant" size="small" disabled={isLast} onClick={next} />
    </div>
  );
}

export const Linear: Story = {
  args: { linear: true, completedIcon: 'check' },
  render: (args) => (
    <UiStepper {...args} defaultValue={1}>
      <UiStepList aria-label="Inscription">
        <UiStep value={1}>Compte</UiStep>
        <UiStep value={2}>Profil</UiStep>
        <UiStep value={3}>Confirmation</UiStep>
      </UiStepList>
      <UiStepPanels>
        <UiStepPanel value={1}>
          Créez votre compte.
          <Suivant />
        </UiStepPanel>
        <UiStepPanel value={2}>
          Complétez votre profil.
          <Suivant />
        </UiStepPanel>
        <UiStepPanel value={3}>
          Tout est prêt.
          <Suivant />
        </UiStepPanel>
      </UiStepPanels>
    </UiStepper>
  ),
};

/** Sans panneaux, la bande seule fait un indicateur d'avancement. */
export const StepsOnly: Story = {
  args: { completedIcon: 'check' },
  render: (args) => (
    <UiStepper {...args} defaultValue={2}>
      <UiStepList aria-label="Progression">
        <UiStep value={1}>Devis</UiStep>
        <UiStep value={2}>Validation</UiStep>
        <UiStep value={3}>Production</UiStep>
        <UiStep value={4}>Livraison</UiStep>
      </UiStepList>
    </UiStepper>
  ),
};

/** Marqueurs sur mesure et panneaux au balisage libre. */
export const CustomMarkers: Story = {
  args: { completedIcon: 'check' },
  render: (args) => (
    <UiStepper {...args} defaultValue={2}>
      <UiStepList aria-label="Publication">
        <UiStep value={1} icon="pen">
          Rédaction
        </UiStep>
        <UiStep value={2} icon="eye">
          Relecture
        </UiStep>
        <UiStep value={3} icon="rocket">
          Publication
        </UiStep>
      </UiStepList>
      <UiStepPanels>
        <UiStepPanel value={1}>
          <UiTag label="Terminé" level="success" size="small" /> Le brouillon est prêt.
        </UiStepPanel>
        <UiStepPanel value={2}>
          <UiTag label="En cours" level="warning" size="small" /> Deux relecteurs sur trois.
        </UiStepPanel>
        <UiStepPanel value={3}>
          <UiTag label="À venir" size="small" /> La mise en ligne est planifiée.
        </UiStepPanel>
      </UiStepPanels>
    </UiStepper>
  ),
};

/** Une étape désactivée reste visible mais n'est pas atteignable. */
export const DisabledStep: Story = {
  render: (args) => (
    <UiStepper {...args} defaultValue={1}>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Compte</UiStep>
        <UiStep value={2} disabled>
          Facturation
        </UiStep>
        <UiStep value={3}>Confirmation</UiStep>
      </UiStepList>
      <UiStepPanels>
        <UiStepPanel value={1}>Créez votre compte.</UiStepPanel>
        <UiStepPanel value={2}>Cette étape ne vous concerne pas.</UiStepPanel>
        <UiStepPanel value={3}>Vérifiez vos informations.</UiStepPanel>
      </UiStepPanels>
    </UiStepper>
  ),
};

/** `value` renseignée, l'étape courante appartient à l'appelant. */
function ControlledDemo(args: Partial<React.ComponentProps<typeof UiStepper>>) {
  const [step, setStep] = useState<UiStepValue>(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0 }}>
        Étape courante : <strong>{String(step)}</strong>
      </p>
      <UiStepper {...args} value={step} onValueChange={setStep} completedIcon="check">
        <UiStepList aria-label="Étapes">
          <UiStep value={1}>Compte</UiStep>
          <UiStep value={2}>Profil</UiStep>
          <UiStep value={3}>Confirmation</UiStep>
        </UiStepList>
        <UiStepPanels>
          <UiStepPanel value={1}>Créez votre compte.</UiStepPanel>
          <UiStepPanel value={2}>Complétez votre profil.</UiStepPanel>
          <UiStepPanel value={3}>Vérifiez vos informations.</UiStepPanel>
        </UiStepPanels>
      </UiStepper>
      <UiButton label="Revenir au début" level="low" size="small" onClick={() => setStep(1)} />
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
