import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiLink } from './ui-link';

const meta: Meta<typeof UiLink> = {
  title: 'Components/ui/actions/ui-link',
  component: UiLink,
  args: {
    label: 'Consulter la documentation',
    href: '#',
    size: 'default',
    external: false,
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    href: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    iconLeft: { control: 'text' },
    iconRight: { control: 'text' },
    external: { control: 'boolean' },
    disabled: { control: 'boolean' },
    target: { control: 'text' },
    rel: { control: 'text' },
    render: { control: false },
    children: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiLink>;

export const Default: Story = {};

export const WithIcons: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      <UiLink {...args} iconLeft="arrow-left" label="Revenir à la liste" />
      <UiLink {...args} iconRight="arrow-right" label="Étape suivante" />
    </div>
  ),
};

/** `external` pose `target="_blank"` et le `rel` qui protège la page d'origine. */
export const External: Story = {
  args: {
    external: true,
    label: 'Ouvrir le site 4SH',
    href: 'https://www.4sh.fr',
    iconRight: 'arrow-up-right-from-square',
  },
};

export const Small: Story = { args: { size: 'small' } };

/** Un lien désactivé perd son `href` : c'est ce qui le sort vraiment du parcours. */
export const Disabled: Story = { args: { disabled: true } };

/** Sans texte, l'icône porte le sens : elle a besoin d'un nom accessible. */
export const IconOnly: Story = {
  args: { label: undefined, iconLeft: 'circle-info', 'aria-label': "Plus d'informations" },
};

/** Dans une phrase, le lien se pose au fil du texte sans casser la ligne. */
export const InProse: Story = {
  render: (args) => (
    <p
      style={{
        maxWidth: '40ch',
        fontFamily: 'var(--fontfamily-base)',
        color: 'var(--global-text-default)',
      }}
    >
      Les jetons sont partagés entre les deux stacks. Le détail vit dans{' '}
      <UiLink {...args} label="la page Dual-Engine" />, qui décrit aussi les divergences déclarées.
    </p>
  ),
};

/**
 * `render` branche le lien d'un routeur sans que le kit en connaisse aucun. Ici
 * une simple ancre reçoit les props, mais ce serait `<Link>` de Next ou de
 * React Router à l'identique.
 */
export const CustomRouter: Story = {
  args: {
    label: 'Lien rendu par le routeur',
    render: (props, children) => (
      <a {...props} href="/fiche/12" data-router="exemple">
        {children}
      </a>
    ),
  },
};
