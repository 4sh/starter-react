import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiTooltip, type TooltipPosition } from './ui-tooltip';

const POSITIONS: TooltipPosition[] = ['top', 'bottom', 'left', 'right'];

const meta: Meta<typeof UiTooltip> = {
  title: 'Components/ui/informative/ui-tooltip',
  component: UiTooltip,
  args: {
    content: 'Enregistre le document',
    position: 'top',
    event: 'both',
    showDelay: 150,
    hideDelay: 0,
    autoHide: true,
    hideOnEscape: true,
    flip: true,
    disabled: false,
    life: 0,
    showOnEllipsis: false,
  },
  argTypes: {
    content: { control: 'text' },
    position: { control: 'inline-radio', options: POSITIONS },
    event: { control: 'inline-radio', options: ['hover', 'focus', 'both'] },
    showDelay: { control: 'number' },
    hideDelay: { control: 'number' },
    life: { control: 'number' },
    autoHide: { control: 'boolean' },
    hideOnEscape: { control: 'boolean' },
    flip: { control: 'boolean' },
    disabled: { control: 'boolean' },
    showOnEllipsis: { control: 'boolean' },
    trigger: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=243-7110',
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
type Story = StoryObj<typeof UiTooltip>;

export const Default: Story = {
  render: (args) => (
    <UiTooltip {...args} trigger={(props) => <UiButton {...props} label="Enregistrer" />} />
  ),
};

export const Positions: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--units-2xl)', flexWrap: 'wrap' }}>
      {POSITIONS.map((position) => (
        <UiTooltip
          {...args}
          key={position}
          position={position}
          content={`Bulle ${position}`}
          trigger={(props) => <UiButton {...props} label={position} level="low" />}
        />
      ))}
    </div>
  ),
};

/** Contenu riche : `content` accepte n'importe quel nœud, pas seulement du texte. */
export const RichContent: Story = {
  args: {
    content: (
      <span>
        <strong>Raccourci</strong>
        <br />
        Ctrl + S
      </span>
    ),
  },
  render: (args) => (
    <UiTooltip {...args} trigger={(props) => <UiButton {...props} label="Enregistrer" />} />
  ),
};

/** `autoHide={false}` garde la bulle ouverte tant qu'on la survole : on peut y cliquer. */
export const Interactive: Story = {
  args: {
    autoHide: false,
    content: (
      <span>
        Voir la <a href="#documentation">documentation</a>
      </span>
    ),
  },
  render: (args) => (
    <UiTooltip {...args} trigger={(props) => <UiButton {...props} label="Aide" level="low" />} />
  ),
};

export const FocusOnly: Story = {
  args: { event: 'focus', content: 'Révélée au focus clavier seulement' },
  render: (args) => (
    <UiTooltip {...args} trigger={(props) => <UiButton {...props} label="Focus" level="low" />} />
  ),
};

export const SlowToAppear: Story = {
  args: { showDelay: 700, content: 'Après 700 ms de survol' },
  render: (args) => (
    <UiTooltip
      {...args}
      trigger={(props) => <UiButton {...props} label="Patienter" level="low" />}
    />
  ),
};

// Un déclencheur de bulle doit être atteignable au clavier : c'est donc un
// bouton, pas un `<span tabindex="0">` que `jsx-a11y` refuse à juste titre.
const tronque: React.CSSProperties = {
  display: 'block',
  width: 160,
  padding: 0,
  border: 0,
  background: 'none',
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** N'apparaît que si le texte du déclencheur est réellement tronqué. */
export const OnEllipsis: Story = {
  args: { showOnEllipsis: true, content: 'Un intitulé beaucoup trop long pour la colonne' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-md)' }}>
      <UiTooltip
        {...args}
        trigger={(props) => (
          <button {...props} type="button" style={tronque}>
            Un intitulé beaucoup trop long pour la colonne
          </button>
        )}
      />
      <UiTooltip
        {...args}
        content="Celui-ci tient : pas de bulle"
        trigger={(props) => (
          <button {...props} type="button" style={tronque}>
            Court
          </button>
        )}
      />
    </div>
  ),
};

/**
 * Le calque supérieur fait échapper la bulle au rognage d'un ancêtre en
 * `overflow: hidden`.
 */
export const EscapesOverflow: Story = {
  render: (args) => (
    <div
      style={{
        width: 200,
        height: 70,
        overflow: 'hidden',
        border: '1px solid var(--global-border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--units-md)',
      }}
    >
      <UiTooltip
        {...args}
        position="bottom"
        content="Je déborde du cadre sans être coupée"
        trigger={(props) => <UiButton {...props} label="Survoler" level="low" size="small" />}
      />
    </div>
  ),
};
