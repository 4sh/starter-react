import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';
import { UiTag } from '../../informative/ui-tag';

import { UiCard } from './ui-card';

const BANDEAU =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 90'><rect width='320' height='90' fill='%237c3aed'/></svg>";

const meta: Meta<typeof UiCard> = {
  title: 'Components/ui/layout/ui-card',
  component: UiCard,
  args: {
    header: 'Titre de la carte',
    subheader: 'Sous-titre explicatif',
    children: 'Le corps de la carte reçoit le contenu libre.',
    variant: 'outlined',
    fluid: false,
    contentFlush: false,
  },
  argTypes: {
    header: { control: 'text' },
    subheader: { control: 'text' },
    children: { control: 'text' },
    variant: { control: 'inline-radio', options: ['outlined', 'elevated', 'flat'] },
    fluid: { control: 'boolean' },
    contentFlush: { control: 'boolean' },
    contentClassName: { control: 'text' },
    media: { control: false },
    footer: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2033-36690',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiCard>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-lg)' }}>
      {(['outlined', 'elevated', 'flat'] as const).map((variant) => (
        <UiCard {...args} key={variant} variant={variant} header={variant} />
      ))}
    </div>
  ),
};

/** Chaque zone n'est rendue que si elle a du contenu : ici, les cinq. */
export const AllRegions: Story = {
  args: {
    media: <img src={BANDEAU} alt="" style={{ display: 'block', width: '100%' }} />,
    header: 'Forfait Équipe',
    subheader: '12 € par personne et par mois',
    children: 'Tout ce que contient le forfait Solo, plus le partage et les rôles.',
    footer: (
      <>
        <UiTag label="Populaire" level="highlight" size="small" />
        <UiButton label="Choisir" size="small" />
      </>
    ),
  },
};

/** Le corps seul : ni en-tête, ni visuel, ni pied, et aucun espacement fantôme. */
export const BodyOnly: Story = {
  args: { header: undefined, subheader: undefined },
};

/** `contentFlush` retire la gouttière pour que le contenu touche les bords. */
export const ContentFlush: Story = {
  args: {
    contentFlush: true,
    children: (
      <div style={{ background: 'var(--global-background-muted)', padding: 'var(--units-lg)' }}>
        Ce bloc touche les bords de la carte.
      </div>
    ),
  },
};

/**
 * Une rangée de cartes : leurs hauteurs s'alignent d'elles-mêmes, sans qu'aucune
 * n'ait à connaître les autres.
 */
export const EqualHeights: Story = {
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', gap: 'var(--units-lg)', width: 520, alignItems: 'stretch' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <>
      <UiCard {...args} fluid header="Courte" subheader={undefined}>
        Une ligne.
      </UiCard>
      <UiCard {...args} fluid header="Longue" subheader={undefined}>
        Un contenu nettement plus long, qui tient sur plusieurs lignes et pousse la carte à grandir
        sans que sa voisine ait à s'en occuper.
      </UiCard>
    </>
  ),
};
