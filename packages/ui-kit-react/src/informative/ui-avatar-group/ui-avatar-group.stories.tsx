import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiAvatar, type AvatarSize } from '../ui-avatar';

import { UiAvatarGroup, type UiAvatarGroupProps } from './ui-avatar-group';

const SIZES: AvatarSize[] = ['tiny', 'small', 'default', 'large'];

/** `size` n'est pas une prop du groupe : la barre d'outils la passe aux avatars. */
type GroupArgs = UiAvatarGroupProps & { size: AvatarSize };

const meta: Meta<GroupArgs> = {
  title: 'Components/ui/informative/ui-avatar-group',
  component: UiAvatarGroup,
  args: { size: 'default' },
  argTypes: {
    size: { control: 'inline-radio', options: SIZES },
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
type Story = StoryObj<GroupArgs>;

export const Default: Story = {
  render: ({ size }) => (
    <UiAvatarGroup aria-label="Membres du projet">
      <UiAvatar size={size} image="https://i.pravatar.cc/128?img=11" alt="Alice" />
      <UiAvatar size={size} image="https://i.pravatar.cc/128?img=12" alt="Bob" />
      <UiAvatar size={size} image="https://i.pravatar.cc/128?img=13" alt="Carol" />
      <UiAvatar size={size} image="https://i.pravatar.cc/128?img=14" alt="Dan" />
    </UiAvatarGroup>
  ),
};

/** Le débordement s'écrit comme un avatar de plus : rien n'est calculé ici. */
export const WithOverflow: Story = {
  render: ({ size }) => (
    <UiAvatarGroup aria-label="Membres du projet">
      <UiAvatar size={size} image="https://i.pravatar.cc/128?img=15" alt="Alice" />
      <UiAvatar size={size} image="https://i.pravatar.cc/128?img=16" alt="Bob" />
      <UiAvatar size={size} image="https://i.pravatar.cc/128?img=17" alt="Carol" />
      <UiAvatar size={size} label="+5" aria-label="5 autres membres" />
    </UiAvatarGroup>
  ),
};

/** Les trois modes d'avatar cohabitent dans un même groupe. */
export const Mixed: Story = {
  render: ({ size }) => (
    <UiAvatarGroup aria-label="Participants">
      <UiAvatar size={size} label="AL" aria-label="Alice" />
      <UiAvatar size={size} label="BO" aria-label="Bob" />
      <UiAvatar size={size} icon="user" aria-label="Invité" />
    </UiAvatarGroup>
  ),
};

/** Le chevauchement est un hook : il se règle par groupe, sans toucher au kit. */
export const CustomOverlap: Story = {
  render: ({ size }) => (
    <UiAvatarGroup aria-label="Équipe" style={{ '--ui-avatar-group-overlap': '4px' } as never}>
      <UiAvatar size={size} label="AL" aria-label="Alice" />
      <UiAvatar size={size} label="BO" aria-label="Bob" />
      <UiAvatar size={size} label="CA" aria-label="Carol" />
    </UiAvatarGroup>
  ),
};
