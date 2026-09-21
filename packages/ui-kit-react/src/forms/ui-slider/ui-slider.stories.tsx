import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiSlider, type SliderValue } from './ui-slider';

const meta: Meta<typeof UiSlider> = {
  title: 'Components/ui/forms/ui-slider',
  component: UiSlider,
  args: {
    'aria-label': 'Volume',
    min: 0,
    max: 100,
    step: 1,
    range: false,
    marks: false,
    orientation: 'horizontal',
    minStepsBetweenHandles: 0,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    'aria-label': { control: 'text' },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    minStepsBetweenHandles: { control: { type: 'number', min: 0, max: 20 } },
    value: { control: false },
    defaultValue: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2119-3186',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiSlider>;

/** Un curseur n'a pas de largeur propre : il remplit ce qu'on lui donne. */
function Demo({
  initial,
  ...props
}: React.ComponentProps<typeof UiSlider> & { initial?: SliderValue }) {
  const [value, setValue] = useState<SliderValue>(initial ?? (props.range ? [20, 60] : 40));
  const vertical = props.orientation === 'vertical';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'row' : 'column',
        alignItems: vertical ? 'flex-end' : 'stretch',
        gap: 'var(--units-lg)',
        width: vertical ? 'fit-content' : 320,
      }}
    >
      <UiSlider {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>
        {Array.isArray(value) ? value.join(' – ') : value}
      </code>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

export const WithMarks: Story = {
  args: { marks: true, step: 10 },
  render: (args) => <Demo {...args} />,
};

export const Step: Story = {
  args: { step: 25, marks: true },
  render: (args) => <Demo {...args} initial={50} />,
};

/** Un pas décimal : l'arrondi suit sa précision, pas de dérive flottante. */
export const DecimalStep: Story = {
  args: { min: 0, max: 1, step: 0.1, marks: true },
  render: (args) => <Demo {...args} initial={0.4} />,
};

export const MinMax: Story = {
  args: { min: -50, max: 50 },
  render: (args) => <Demo {...args} initial={0} />,
};

/** Deux poignées : le modèle devient un tableau `[début, fin]`. */
export const Range: Story = {
  args: {
    range: true,
    ariaLabelStart: 'Prix minimum',
    ariaLabelEnd: 'Prix maximum',
  },
  render: (args) => <Demo {...args} initial={[20, 60]} />,
};

/** `minStepsBetweenHandles` empêche les deux poignées de se croiser. */
export const RangeWithGap: Story = {
  args: {
    range: true,
    minStepsBetweenHandles: 10,
    marks: true,
    step: 5,
    ariaLabelStart: 'Début',
    ariaLabelEnd: 'Fin',
  },
  render: (args) => <Demo {...args} initial={[25, 75]} />,
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => <Demo {...args} initial={60} />,
};

export const VerticalRange: Story = {
  args: {
    orientation: 'vertical',
    range: true,
    ariaLabelStart: 'Bas',
    ariaLabelEnd: 'Haut',
  },
  render: (args) => <Demo {...args} initial={[30, 70]} />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} />,
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  render: (args) => <Demo {...args} />,
};

export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => <Demo {...args} />,
};
