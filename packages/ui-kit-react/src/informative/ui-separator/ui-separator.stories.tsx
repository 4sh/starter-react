import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiSeparator } from './ui-separator';

const meta: Meta<typeof UiSeparator> = {
  title: 'Components/ui/informative/ui-separator',
  component: UiSeparator,
  args: {
    orientation: 'horizontal',
    variant: 'solid',
    size: 'default',
    labelAlign: 'start',
  },
  argTypes: {
    label: { control: 'text' },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'inline-radio', options: ['solid', 'dashed'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    labelAlign: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=159-4394',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiSeparator>;

export const Default: Story = {};

export const Labelled: Story = { args: { label: 'ou' } };

export const LabelAlign: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-lg)' }}>
      {(['start', 'center', 'end'] as const).map((align) => (
        <UiSeparator {...args} key={align} labelAlign={align} label={align} />
      ))}
    </div>
  ),
};

export const Dashed: Story = { args: { variant: 'dashed' } };
export const Small: Story = { args: { size: 'small' } };

/** En vertical, le filet prend la hauteur de son parent : il lui en faut une. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--units-md)', height: 80 }}>
      <span>Avant</span>
      <UiSeparator {...args} />
      <span>Après</span>
    </div>
  ),
};
