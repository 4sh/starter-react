import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiButton } from '../../actions/ui-button';

import { UiPopover, type PopoverPosition } from './ui-popover';

const POSITIONS: PopoverPosition[] = ['top', 'bottom', 'left', 'right'];

const meta: Meta<typeof UiPopover> = {
  title: 'Components/ui/layout/ui-popover',
  component: UiPopover,
  args: {
    position: 'bottom',
    showArrow: true,
    dismissable: true,
    modal: false,
    focusOnShow: true,
    'aria-label': 'Détails du produit',
    children: 'Le panneau reçoit un contenu libre : du texte, un formulaire, une liste.',
  },
  argTypes: {
    position: { control: 'inline-radio', options: POSITIONS },
    showArrow: { control: 'boolean' },
    dismissable: { control: 'boolean' },
    modal: { control: 'boolean' },
    focusOnShow: { control: 'boolean' },
    children: { control: 'text' },
    trigger: { control: false },
    open: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3623-35631',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 'var(--units-4xl)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiPopover>;

const withTrigger = (label: string) => (args: React.ComponentProps<typeof UiPopover>) => (
  <UiPopover {...args} trigger={(props) => <UiButton {...props} label={label} level="low" />} />
);

export const Default: Story = { render: withTrigger('Détails') };

export const Positions: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-2xl)', flexWrap: 'wrap' }}>
      {POSITIONS.map((position) => (
        <UiPopover
          {...args}
          key={position}
          position={position}
          aria-label={`Panneau ${position}`}
          trigger={(props) => <UiButton {...props} label={position} level="low" />}
        />
      ))}
    </div>
  ),
};

export const WithoutArrow: Story = {
  args: { showArrow: false },
  render: withTrigger('Sans flèche'),
};

/** Non renvoyable : ni le clic extérieur ni Échap ne ferment, seul le contenu décide. */
export const NotDismissable: Story = {
  args: { dismissable: false },
  render: (args) => <NotDismissableDemo {...args} />,
};

function NotDismissableDemo(args: React.ComponentProps<typeof UiPopover>) {
  const [open, setOpen] = useState(false);

  return (
    <UiPopover
      {...args}
      open={open}
      onOpenChange={setOpen}
      trigger={(props) => <UiButton {...props} label="Ouvrir" level="low" />}
    >
      <p style={{ marginTop: 0 }}>Ce panneau ne se ferme que par son bouton.</p>
      <UiButton label="Fermer" size="small" onClick={() => setOpen(false)} />
    </UiPopover>
  );
}

/** Modal : le fond devient inerte et le focus est enfermé dans le panneau. */
export const Modal: Story = {
  args: { modal: true, 'aria-label': 'Confirmation' },
  render: (args) => (
    <UiPopover {...args} trigger={(props) => <UiButton {...props} label="Confirmer" level="low" />}>
      <p style={{ marginTop: 0 }}>Cette action demande une confirmation.</p>
      <UiButton label="D’accord" size="small" />
    </UiPopover>
  ),
};

/** Un panneau qui contient un formulaire : le focus se pose sur le premier champ. */
export const WithForm: Story = {
  args: { 'aria-label': 'Filtrer la liste' },
  render: (args) => (
    <UiPopover {...args} trigger={(props) => <UiButton {...props} label="Filtrer" level="low" />}>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
        <label htmlFor="popover-recherche">Recherche</label>
        <input id="popover-recherche" type="search" />
        <UiButton label="Appliquer" size="small" />
      </form>
    </UiPopover>
  ),
};

/**
 * Le panneau vit dans le calque supérieur : un ancêtre en `overflow: hidden` ne
 * le rogne pas, là où un panneau posé dans le flux serait coupé.
 */
export const EscapesOverflow: Story = {
  render: (args) => (
    <div
      style={{
        width: 220,
        height: 90,
        overflow: 'hidden',
        border: '1px solid var(--global-border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--units-md)',
      }}
    >
      <UiPopover
        {...args}
        aria-label="Panneau qui déborde"
        trigger={(props) => <UiButton {...props} label="Déborder" level="low" size="small" />}
      />
    </div>
  ),
};
