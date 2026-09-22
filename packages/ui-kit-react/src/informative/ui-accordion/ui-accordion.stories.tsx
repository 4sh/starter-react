import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiTag } from '../ui-tag';

import { UiAccordion, UiAccordionPanel, type UiAccordionActiveValue } from './ui-accordion';

const LOREM =
  'Viennese et half to cortado viennese. Americano steamed caffeine filter luwak skinny half and id spoon. Redeye extraction variety shot instant qui cream roast lungo body shot mazagran.';

const meta: Meta<typeof UiAccordion> = {
  title: 'Components/ui/informative/ui-accordion',
  component: UiAccordion,
  args: {
    multiple: false,
    selectOnFocus: false,
    separator: true,
    control: true,
    motion: true,
    expandIcon: 'chevron-down',
    collapseIcon: 'chevron-up',
  },
  argTypes: {
    multiple: { control: 'boolean' },
    selectOnFocus: { control: 'boolean' },
    separator: { control: 'boolean' },
    control: { control: 'boolean' },
    motion: { control: 'boolean' },
    expandIcon: { control: 'text' },
    collapseIcon: { control: 'text' },
    value: { control: false },
    children: { control: false },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2037-3151',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiAccordion>;

const SECTIONS = ['Section I', 'Section II', 'Section III'];

const panels = SECTIONS.map((label, index) => (
  <UiAccordionPanel key={label} value={String(index)} header={label}>
    {LOREM}
  </UiAccordionPanel>
));

export const Default: Story = {
  render: (args) => (
    <UiAccordion {...args} defaultValue="0">
      {panels}
    </UiAccordion>
  ),
};

/** Plusieurs panneaux ouverts en même temps : la valeur devient un tableau. */
export const Multiple: Story = {
  args: { multiple: true },
  render: (args) => (
    <UiAccordion {...args} defaultValue={['0', '2']}>
      {panels}
    </UiAccordion>
  ),
};

/** Le panneau s'ouvre dès que son en-tête reçoit le focus. */
export const SelectOnFocus: Story = {
  args: { selectOnFocus: true },
  render: (args) => (
    <UiAccordion {...args} defaultValue="0">
      {panels}
    </UiAccordion>
  ),
};

/** Un panneau désactivé : ni repliable, ni atteint par les flèches. */
export const DisabledPanel: Story = {
  render: (args) => (
    <UiAccordion {...args} defaultValue="0">
      <UiAccordionPanel value="0" header="Actif">
        {LOREM}
      </UiAccordionPanel>
      <UiAccordionPanel value="1" header="Désactivé" disabled>
        {LOREM}
      </UiAccordionPanel>
      <UiAccordionPanel value="2" header="Actif">
        {LOREM}
      </UiAccordionPanel>
    </UiAccordion>
  ),
};

/** L'en-tête accepte n'importe quel nœud : titre, icône, `ui-tag`… */
export const RichHeader: Story = {
  render: (args) => (
    <UiAccordion {...args} defaultValue="0">
      <UiAccordionPanel
        value="0"
        header={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Facturation <UiTag label="À jour" level="success" size="small" />
          </span>
        }
      >
        {LOREM}
      </UiAccordionPanel>
      <UiAccordionPanel
        value="1"
        header={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Sécurité <UiTag label="Action requise" level="warning" size="small" />
          </span>
        }
      >
        {LOREM}
      </UiAccordionPanel>
    </UiAccordion>
  ),
};

/** Sans trait ni chevron : une surface épurée. */
export const Minimal: Story = {
  args: { separator: false, control: false },
  render: (args) => (
    <UiAccordion {...args} defaultValue="0">
      {panels}
    </UiAccordion>
  ),
};

/** Bascule instantanée. */
export const MotionOff: Story = {
  args: { motion: false },
  render: (args) => (
    <UiAccordion {...args} defaultValue="0">
      {panels}
    </UiAccordion>
  ),
};

/** `value` renseignée, le panneau ouvert appartient à l'appelant. */
function ControlledDemo(args: ComponentProps<typeof UiAccordion>) {
  const [open, setOpen] = useState<UiAccordionActiveValue>('1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--units-default)' }}>
      <p style={{ margin: 0 }}>
        Panneau ouvert : <strong>{open === null ? 'aucun' : String(open)}</strong>
      </p>
      <UiAccordion {...args} value={open} onValueChange={setOpen}>
        {panels}
      </UiAccordion>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
