import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps, type FormEvent } from 'react';

import { UiButton } from '../../actions/ui-button';

import { UiFieldSign, type FieldSignValue } from './ui-field-sign';

/** Une signature courte, telle que le champ l'exporte lui-même (SVG, fond transparent). */
const SAMPLE_SIGNATURE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" width="320" height="160">' +
      '<g fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M40 110Q55 40 70 95Q80 130 95 80Q105 50 112 98Q120 120 135 90Q150 60 160 100Q170 125 190 85"/>' +
      '<path d="M200 92Q215 70 230 95Q240 112 255 88Q268 70 280 96"/>' +
      '<path d="M45 128L270 122"/>' +
      '</g></svg>',
  );

/** Une data URL d'image que le navigateur ne sait pas décoder. */
const BROKEN_SIGNATURE = 'data:image/png;base64,AAAA';

/** Les premiers caractères d'une data URL : assez pour voir ce que tient le formulaire. */
const preview = (value: FieldSignValue): string =>
  value ? `${value.slice(0, 30)}… (${value.length} caractères)` : 'null';

const meta: Meta<typeof UiFieldSign> = {
  title: 'Components/ui/forms/ui-field-sign',
  component: UiFieldSign,
  args: {
    label: 'Signature du client',
    format: 'png',
    exportColor: 'black',
    placeholder: 'Signez ici',
    clearable: true,
    size: 'default',
    level: 'default',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    format: { control: 'inline-radio', options: ['png', 'svg'] },
    exportColor: { control: 'color' },
    placeholder: { control: 'text' },
    clearable: { control: 'boolean' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    value: { control: false },
    defaultValue: { control: false },
    onValueChange: { control: false },
    onImageError: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=4219-1970',
    },
  },
  render: (args) => (
    <div style={{ width: 360 }}>
      <UiFieldSign {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof UiFieldSign>;

export const Default: Story = {};
export const WithHelper: Story = {
  args: { helperText: 'Signez avec le doigt, un stylet ou la souris.' },
};

/** Une valeur reçue s'affiche, et reste sous les nouveaux traits jusqu'à l'effacement. */
export const WithValue: Story = {
  args: {
    defaultValue: SAMPLE_SIGNATURE,
    helperText: 'La signature reçue reste sous les nouveaux traits.',
  },
};

export const Svg: Story = {
  args: {
    label: 'Signature (SVG)',
    format: 'svg',
    helperText: 'Émet une data URL `image/svg+xml`.',
  },
};

export const Required: Story = {
  args: { required: true, helperText: 'Obligatoire pour valider le bon de livraison.' },
};
export const Invalid: Story = {
  args: { invalid: true, errorText: 'Ce champ est requis.' },
};
export const Small: Story = { args: { label: 'Initiales', size: 'small' } };
export const ReadOnly: Story = { args: { defaultValue: SAMPLE_SIGNATURE, readOnly: true } };
export const Disabled: Story = { args: { defaultValue: SAMPLE_SIGNATURE, disabled: true } };

/** Une image reçue que le navigateur ne sait pas charger : montrée illisible, gardée comme valeur. */
export const Unreadable: Story = {
  args: { defaultValue: BROKEN_SIGNATURE, helperText: 'Effacez-la, ou signez par-dessus.' },
};

function ControlledDemo(props: ComponentProps<typeof UiFieldSign>) {
  const [value, setValue] = useState<FieldSignValue>(null);
  return (
    <div style={{ width: 360, display: 'grid', gap: 'var(--units-md)', justifyItems: 'start' }}>
      <UiFieldSign {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12 }}>value = {preview(value)}</code>
      <UiButton label="Recommencer" level="low" onClick={() => setValue(null)} />
    </div>
  );
}

/** Contrôlé : l'hôte tient la valeur, et la remet à `null` pour vider le champ. */
export const Controlled: Story = {
  args: { format: 'svg' },
  render: (args) => <ControlledDemo {...args} />,
};

function NativeFormDemo(props: ComponentProps<typeof UiFieldSign>) {
  const [sent, setSent] = useState<string>('rien encore');
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const signature = new FormData(event.currentTarget).get('signature');
    setSent(typeof signature === 'string' && signature ? preview(signature) : 'vide');
  };
  return (
    <form
      onSubmit={onSubmit}
      style={{ width: 360, display: 'grid', gap: 'var(--units-md)', justifyItems: 'start' }}
    >
      <UiFieldSign {...props} name="signature" />
      <UiButton type="submit" label="Envoyer" />
      <code style={{ fontSize: 12 }}>signature = {sent}</code>
    </form>
  );
}

/** `name` porte la valeur dans un `<input type="hidden">` : `FormData` la lit telle quelle. */
export const NativeForm: Story = {
  args: { format: 'svg' },
  render: (args) => <NativeFormDemo {...args} />,
};
