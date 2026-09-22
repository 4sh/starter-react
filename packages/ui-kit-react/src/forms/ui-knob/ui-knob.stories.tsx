import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiKnob } from './ui-knob';

const meta: Meta<typeof UiKnob> = {
  title: 'Components/ui/forms/ui-knob',
  component: UiKnob,
  args: {
    defaultValue: 60,
    min: 0,
    max: 100,
    step: 1,
    size: 'default',
    strokeWidth: 14,
    showValue: true,
    valueTemplate: '{value}',
    disabled: false,
    readOnly: false,
    invalid: false,
    'aria-label': 'Volume',
  },
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    strokeWidth: { control: { type: 'range', min: 2, max: 40, step: 1 } },
    size: { control: 'inline-radio', options: ['small', 'default', 'large'] },
    showValue: { control: 'boolean' },
    valueTemplate: { control: 'text' },
    valueColor: { control: 'color' },
    rangeColor: { control: 'color' },
    textColor: { control: 'color' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    value: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3795-39721',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiKnob>;

/** Banc d'essai : le cadran, piloté par les contrôles. */
export const Default: Story = {};

export const Basic: Story = {
  args: { defaultValue: 35 },
};

/** Les bornes déplacent l'échelle : l'arc va toujours du minimum au maximum. */
export const MinMax: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <UiKnob {...args} min={0} max={10} defaultValue={7} aria-label="Note sur 10" />
      <UiKnob {...args} min={-50} max={50} defaultValue={-20} aria-label="Correction" />
    </div>
  ),
};

/** Le pas cale la valeur sur sa grille, au clavier comme au glissement. */
export const Step: Story = {
  args: { step: 10, defaultValue: 40 },
};

/** `valueTemplate` habille la valeur centrale. `{value}` est le substitut. */
export const Template: Story = {
  args: { valueTemplate: '{value}%', defaultValue: 72 },
};

/** L'épaisseur est en unités de viewBox, donc elle suit le diamètre. */
export const Stroke: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <UiKnob {...args} strokeWidth={4} aria-label="Trait fin" />
      <UiKnob {...args} strokeWidth={14} aria-label="Trait par défaut" />
      <UiKnob {...args} strokeWidth={30} aria-label="Trait épais" />
    </div>
  ),
};

export const Size: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <UiKnob {...args} size="small" aria-label="Petit" />
      <UiKnob {...args} size="default" aria-label="Par défaut" />
      <UiKnob {...args} size="large" aria-label="Grand" />
    </div>
  ),
};

/** Trois couleurs se règlent par prop, et posent les hooks `--ui-knob-*`. */
export const Color: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <UiKnob
        {...args}
        valueColor="var(--informative-successhigh-surface-default)"
        aria-label="Succès"
      />
      <UiKnob
        {...args}
        valueColor="var(--informative-warninghigh-surface-default)"
        rangeColor="var(--informative-warninglow-surface-default)"
        aria-label="Avertissement"
      />
      <UiKnob
        {...args}
        valueColor="var(--informative-errorhigh-surface-default)"
        textColor="var(--informative-errorhigh-surface-default)"
        aria-label="Erreur"
      />
    </div>
  ),
};

/** Le cadran affiche, deux boutons règlent : un cadran en lecture seule reste lisible. */
function CustomControlsDemo() {
  const [value, setValue] = useState(50);
  const bouger = (delta: number) =>
    setValue((current) => Math.min(100, Math.max(0, current + delta)));

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <UiKnob value={value} onValueChange={setValue} readOnly aria-label="Valeur" />
      <div style={{ display: 'flex', gap: 8 }}>
        <UiButton label="−10" level="low" onClick={() => bouger(-10)} />
        <UiButton label="+10" level="low" onClick={() => bouger(10)} />
      </div>
      <code>value = {value}</code>
    </div>
  );
}

export const CustomControls: Story = {
  render: () => <CustomControlsDemo />,
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: 45 },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 45 },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: 80 },
};

/** Sans la valeur au centre : le cadran devient une jauge. */
export const WithoutValue: Story = {
  args: { showValue: false, defaultValue: 30 },
};
