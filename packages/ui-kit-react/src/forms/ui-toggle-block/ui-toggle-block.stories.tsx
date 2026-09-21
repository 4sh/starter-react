import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiLink } from '../../actions/ui-link';

import { UiToggleBlock, type UiToggleBlockProps } from './ui-toggle-block';

const meta: Meta<UiToggleBlockProps<boolean>> = {
  title: 'Components/ui/forms/ui-toggle-block',
  component: UiToggleBlock,
  args: {
    label: 'Notifications par courriel',
    description: 'Un résumé quotidien de votre activité.',
    indicator: 'checkbox',
    indicatorPosition: 'start',
    align: 'center',
    size: 'default',
    hideIndicator: false,
    fluid: false,
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    indicator: { control: 'inline-radio', options: ['checkbox', 'radio', 'toggle'] },
    indicatorPosition: { control: 'inline-radio', options: ['start', 'end'] },
    align: { control: 'inline-radio', options: ['center', 'start'] },
    size: { control: 'inline-radio', options: ['default', 'small', 'large'] },
    value: { control: false },
    defaultValue: { control: false },
    blockValue: { control: false },
    children: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2119-3187',
    },
  },
};

export default meta;
type Story = StoryObj<UiToggleBlockProps<boolean>>;

// `<UiToggleBlock<boolean>>` explicite : sans le paramètre, TypeScript déduit
// `T` du setter d'état et se retrouve avec `SetStateAction<boolean>`.
function Demo({ initial = false, ...props }: UiToggleBlockProps<boolean> & { initial?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ width: 360 }}>
      <UiToggleBlock<boolean> {...props} fluid value={value} onValueChange={(v) => setValue(v)} />
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

export const Checked: Story = { render: (args) => <Demo {...args} initial /> };

export const Toggle: Story = {
  args: { indicator: 'toggle' },
  render: (args) => <Demo {...args} initial />,
};

/** L'indicateur à droite : le bloc s'inverse, la zone de clic reste entière. */
export const IndicatorEnd: Story = {
  args: { indicatorPosition: 'end', indicator: 'toggle' },
  render: (args) => <Demo {...args} />,
};

export const Small: Story = {
  args: { size: 'small' },
  render: (args) => <Demo {...args} initial />,
};

export const Large: Story = {
  args: { size: 'large' },
  render: (args) => <Demo {...args} initial />,
};

export const Required: Story = {
  args: { required: true },
  render: (args) => <Demo {...args} />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} initial />,
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  render: (args) => <Demo {...args} initial />,
};

export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => <Demo {...args} />,
};

export const LabelOnly: Story = {
  args: { description: undefined },
  render: (args) => <Demo {...args} />,
};

/**
 * `align="start"` cale l'indicateur en haut : c'est ce qu'il faut dès que le
 * corps fait plusieurs lignes.
 */
export const AlignStart: Story = {
  args: {
    align: 'start',
    description:
      'Un résumé quotidien de votre activité, envoyé chaque matin, avec les nouveautés, les rappels et tout ce que vous avez manqué la veille.',
  },
  render: (args) => <Demo {...args} />,
};

/**
 * `hideIndicator` en fait une carte de sélection : le contrôle reste
 * focalisable et activable, seulement hors de vue.
 */
export const SelectionCard: Story = {
  args: { indicator: 'radio', hideIndicator: true, align: 'start' },
  render: () => {
    const Groupe = () => {
      const [formule, setFormule] = useState<string>('standard');
      const options = [
        { value: 'standard', label: 'Standard', description: '9 € par mois, 5 projets.' },
        { value: 'pro', label: 'Pro', description: '19 € par mois, projets illimités.' },
      ];
      return (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)', width: 360 }}
        >
          {options.map((o) => (
            <UiToggleBlock<string>
              key={o.value}
              fluid
              indicator="radio"
              hideIndicator
              align="start"
              name="formule"
              blockValue={o.value}
              value={formule}
              onValueChange={setFormule}
              label={o.label}
              description={o.description}
            />
          ))}
        </div>
      );
    };
    return <Groupe />;
  },
};

/** Un groupe de radios : même `name`, même modèle. */
export const RadioGroup: Story = {
  render: () => {
    const Groupe = () => {
      const [taille, setTaille] = useState<string>('m');
      return (
        <div
          role="radiogroup"
          aria-label="Taille"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)', width: 360 }}
        >
          {[
            { v: 's', l: 'Petit' },
            { v: 'm', l: 'Moyen' },
            { v: 'l', l: 'Grand' },
          ].map((o) => (
            <UiToggleBlock<string>
              key={o.v}
              fluid
              indicator="radio"
              name="taille"
              blockValue={o.v}
              value={taille}
              onValueChange={setTaille}
              label={o.l}
            />
          ))}
        </div>
      );
    };
    return <Groupe />;
  },
};

/**
 * Un contenu projeté reste **opérable** : le lien garde son propre clic au lieu
 * de sélectionner le bloc.
 */
export const WithProjectedLink: Story = {
  args: { description: undefined, align: 'start' },
  render: (args) => (
    <Demo {...args}>
      <span style={{ fontSize: 12, color: 'var(--form-low-content-default)' }}>
        Voir les <UiLink href="#detail">détails de la formule</UiLink> avant de choisir.
      </span>
    </Demo>
  ),
};
