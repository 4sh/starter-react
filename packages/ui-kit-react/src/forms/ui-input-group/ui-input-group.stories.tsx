import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';
import { UiIcon } from '../../base/ui-icon';
import { UiCheckbox } from '../ui-checkbox';
import { UiInput } from '../ui-input';
import { UiInputNumber } from '../ui-input-number';
import { UiRadio } from '../ui-radio';
import { UiSelect } from '../ui-select';

import { UiInputGroup, UiInputGroupAddon } from './ui-input-group';

const VILLES = ['Bordeaux', 'Lille', 'Lyon', 'Marseille', 'Paris'];

const meta: Meta<typeof UiInputGroup> = {
  title: 'Components/ui/forms/ui-input-group',
  component: UiInputGroup,
  args: { size: 'default' },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'small'] },
    children: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--units-md)',
          width: 340,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiInputGroup>;

/** Une cellule d'icône, puis une de texte de chaque côté du contrôle. */
export const Default: Story = {
  render: (args) => (
    <>
      <UiInputGroup {...args}>
        <UiInputGroupAddon>
          <UiIcon name="user" size="sm" />
        </UiInputGroupAddon>
        <UiInput placeholder="Nom d’utilisateur" aria-label="Nom d’utilisateur" size={args.size} />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiInputGroupAddon>https://</UiInputGroupAddon>
        <UiInput placeholder="mon-site" aria-label="Adresse du site" size={args.size} />
        <UiInputGroupAddon>.com</UiInputGroupAddon>
      </UiInputGroup>
    </>
  ),
};

/** Plusieurs cellules s'accumulent de chaque côté sans se toucher. */
export const Multiple: Story = {
  render: (args) => (
    <UiInputGroup {...args}>
      <UiInputGroupAddon>
        <UiIcon name="clock" size="sm" />
      </UiInputGroupAddon>
      <UiInputGroupAddon>
        <UiIcon name="star" size="sm" />
      </UiInputGroupAddon>
      <UiInputNumber defaultValue={100} aria-label="Prix" size={args.size} />
      <UiInputGroupAddon>€</UiInputGroupAddon>
      <UiInputGroupAddon>,00</UiInputGroupAddon>
    </UiInputGroup>
  ),
};

/** Un bouton se pose d'un côté ou de l'autre, et garde sa largeur naturelle. */
export const WithButton: Story = {
  render: (args) => (
    <>
      <UiInputGroup {...args}>
        <UiButton label="Rechercher" size={args.size} />
        <UiInput placeholder="Mot-clé" aria-label="Mot-clé" size={args.size} />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiInput placeholder="Mot-clé" aria-label="Mot-clé" size={args.size} />
        <UiButton
          icon="magnifying-glass"
          aria-label="Rechercher"
          level="low"
          variant="outlined"
          size={args.size}
        />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiButton icon="check" aria-label="Valider" level="success" size={args.size} />
        <UiInput placeholder="Vote" aria-label="Vote" size={args.size} />
        <UiButton icon="xmark" aria-label="Annuler" level="error" size={args.size} />
      </UiInputGroup>
    </>
  ),
};

/** Une case à cocher ou un bouton radio se logent dans une cellule. */
export const WithSelection: Story = {
  render: (args) => (
    <>
      <UiInputGroup {...args}>
        <UiInputGroupAddon>
          <UiCheckbox aria-label="Mémoriser le nom d’utilisateur" />
        </UiInputGroupAddon>
        <UiInput placeholder="Nom d’utilisateur" aria-label="Nom d’utilisateur" size={args.size} />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiInput placeholder="Prix" aria-label="Prix" size={args.size} />
        <UiInputGroupAddon>
          <UiRadio name="mode-prix" value="ttc" aria-label="Prix TTC" />
        </UiInputGroupAddon>
      </UiInputGroup>
    </>
  ),
};

/** Une liste déroulante se colle comme n'importe quel autre contrôle. */
export const WithSelect: Story = {
  render: (args) => (
    <UiInputGroup {...args}>
      <UiInputGroupAddon>
        <UiIcon name="location-dot" size="sm" />
      </UiInputGroupAddon>
      <UiSelect
        options={VILLES}
        placeholder="Choisir une ville"
        aria-label="Ville"
        size={args.size}
      />
    </UiInputGroup>
  ),
};

/** Le groupe transmet sa taille aux cellules ; les contrôles gardent la leur. */
export const Small: Story = {
  args: { size: 'small' },
  render: (args) => (
    <UiInputGroup {...args}>
      <UiInputGroupAddon>
        <UiIcon name="user" size="sm" />
      </UiInputGroupAddon>
      <UiInput placeholder="Nom d’utilisateur" aria-label="Nom d’utilisateur" size="small" />
      <UiButton
        icon="magnifying-glass"
        aria-label="Rechercher"
        level="low"
        variant="outlined"
        size="small"
      />
    </UiInputGroup>
  ),
};
