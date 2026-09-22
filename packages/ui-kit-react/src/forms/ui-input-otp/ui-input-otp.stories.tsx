import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiInputOtp } from './ui-input-otp';

const meta: Meta<typeof UiInputOtp> = {
  title: 'Components/ui/forms/ui-input-otp',
  component: UiInputOtp,
  args: {
    length: 4,
    mask: false,
    integerOnly: false,
    size: 'default',
    disabled: false,
    readOnly: false,
    invalid: false,
    'aria-label': 'Code de vérification',
  },
  argTypes: {
    length: { control: { type: 'number', min: 1, max: 8 } },
    size: { control: 'inline-radio', options: ['small', 'default', 'large'] },
    mask: { control: 'boolean' },
    integerOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    value: { control: false },
    renderCell: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3614-33400',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiInputOtp>;

/** Banc d'essai : le champ seul, piloté par les contrôles. */
export const Default: Story = {};

/** Quatre cases, sans contrainte de caractère. */
export const Basic: Story = {
  args: { defaultValue: '12' },
};

/** `value` renseignée, le code appartient à l'appelant. */
function ControlledDemo() {
  const [code, setCode] = useState('');
  const [valide, setValide] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <UiInputOtp
        value={code}
        onValueChange={setCode}
        onComplete={setValide}
        length={6}
        integerOnly
        aria-label="Code de vérification"
      />
      <p style={{ margin: 0, color: 'var(--global-text-muted)' }}>
        Saisi : <strong>{code || '(vide)'}</strong>
        {valide && ` · complet : ${valide}`}
      </p>
      <UiButton label="Effacer" level="low" size="small" onClick={() => setCode('')} />
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

/** Les caractères sont masqués, comme dans un champ de mot de passe. */
export const Mask: Story = {
  args: { mask: true, defaultValue: '1234' },
};

/** Seuls les chiffres passent, et le clavier virtuel s'ouvre en numérique. */
export const IntegerOnly: Story = {
  args: { integerOnly: true, length: 6 },
};

/** Trois tailles de case. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <UiInputOtp {...args} size="small" defaultValue="12" aria-label="Code, petit" />
      <UiInputOtp {...args} size="default" defaultValue="12" aria-label="Code, par défaut" />
      <UiInputOtp {...args} size="large" defaultValue="12" aria-label="Code, grand" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '1234' },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: '1234' },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: '12' },
};

/** `renderCell` remplace le contrôle. Il doit rester un `<input>`, c'est lui que le focus suit. */
const CELL_STYLE: CSSProperties = {
  width: '3rem',
  height: '3.25rem',
  margin: 0,
  padding: 0,
  border: 'none',
  borderBottom: '2px solid var(--form-high-stroke-default)',
  background: 'transparent',
  textAlign: 'center',
  fontFamily: 'var(--fontfamily-base)',
  fontSize: 'var(--size-typography-text-xl)',
  fontWeight: 'var(--weight-bold)',
  color: 'var(--form-high-content-default)',
  outline: 'none',
  caretColor: 'var(--form-high-content-default)',
};

export const CustomCell: Story = {
  args: {
    integerOnly: true,
    length: 4,
    renderCell: ({ index, value, tabIndex, ...handlers }) => (
      <input
        {...handlers}
        value={value}
        tabIndex={tabIndex}
        maxLength={1}
        inputMode="numeric"
        aria-label={`Chiffre ${index + 1}`}
        style={CELL_STYLE}
      />
    ),
  },
};

/** Un écran complet : titre, code à six chiffres coupé en deux, et une action. */
function SampleDemo() {
  const [code, setCode] = useState('');
  const complet = code.length === 6;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '26rem',
      }}
    >
      <div>
        <h2
          style={{
            margin: '0 0 .25rem',
            fontFamily: 'var(--fontfamily-base)',
            color: 'var(--global-text-default)',
          }}
        >
          Vérifiez votre compte
        </h2>
        <p style={{ margin: 0, color: 'var(--form-low-content-default)' }}>
          Saisissez le code envoyé sur votre téléphone.
        </p>
      </div>

      <UiInputOtp
        value={code}
        onValueChange={setCode}
        integerOnly
        length={6}
        aria-label="Code d'authentification"
        renderCell={({ index, value, tabIndex, ...handlers }) => (
          <>
            {index === 3 && (
              <span aria-hidden="true" style={{ color: 'var(--form-low-content-default)' }}>
                ·
              </span>
            )}
            <input
              {...handlers}
              value={value}
              tabIndex={tabIndex}
              maxLength={1}
              inputMode="numeric"
              aria-label={`Chiffre ${index + 1}`}
              style={CELL_STYLE}
            />
          </>
        )}
      />

      <UiButton label="Valider" disabled={!complet} />
    </div>
  );
}

export const Sample: Story = {
  render: () => <SampleDemo />,
};
