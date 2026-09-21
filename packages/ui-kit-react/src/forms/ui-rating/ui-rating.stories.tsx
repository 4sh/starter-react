import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiIcon } from '../../base/ui-icon';

import { UiRating } from './ui-rating';

const meta: Meta<typeof UiRating> = {
  title: 'Components/ui/forms/ui-rating',
  component: UiRating,
  args: {
    'aria-label': 'Note',
    defaultValue: 3,
    stars: 5,
    size: 'default',
    allowHalf: false,
    cancel: true,
    orientation: 'horizontal',
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    'aria-label': { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'default', 'lg', 'xl'] },
    stars: { control: { type: 'number', min: 1, max: 10 } },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    value: { control: false },
    renderOnIcon: { control: false },
    renderOffIcon: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2119-3185',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiRating>;

function Demo({
  initial = 3,
  ...props
}: React.ComponentProps<typeof UiRating> & { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--units-lg)' }}>
      <UiRating {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>{value ?? 'null'}</code>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

/** Demi-étoiles : le clic sur la première moitié d'une étoile vaut `x,5`. */
export const AllowHalf: Story = {
  args: { allowHalf: true },
  render: (args) => <Demo {...args} initial={3.5} />,
};

/**
 * Une moyenne poussée par l'hôte est ramenée au pas : 4,3 rend 4 étoiles, pas
 * un remplissage que personne n'aurait pu choisir.
 */
export const HalfReadOnly: Story = {
  args: { allowHalf: true, readOnly: true },
  render: (args) => <Demo {...args} initial={4.3} />,
};

/** `cancel` à faux : recliquer la valeur courante ne la retire plus. */
export const NoCancel: Story = {
  args: { cancel: false },
  render: (args) => <Demo {...args} />,
};

export const TenStars: Story = {
  args: { stars: 10, size: 'sm' },
  render: (args) => <Demo {...args} initial={7} />,
};

export const SizeXL: Story = {
  args: { size: 'xl' },
  render: (args) => <Demo {...args} />,
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => <Demo {...args} />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} />,
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  render: (args) => <Demo {...args} initial={4} />,
};

export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => <Demo {...args} initial={2} />,
};

export const Empty: Story = { render: (args) => <Demo {...args} initial={null} /> };

/**
 * `renderOnIcon` et `renderOffIcon` remplacent le glyphe. Le découpage à la
 * portion remplie continue de fonctionner : la demi-note marche avec n'importe
 * quelle famille d'icônes.
 */
export const CustomIcons: Story = {
  args: {
    allowHalf: true,
    renderOnIcon: () => <UiIcon name="heart" type="solid" size="lg" />,
    renderOffIcon: () => <UiIcon name="heart" type="outline" size="lg" />,
  },
  render: (args) => <Demo {...args} initial={2.5} />,
};
