import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { useUiRipple, useUiRippleScope } from './ripple';

interface DemoProps {
  /** Retaille l'onde par les seuls crochets CSS `--ui-ripple-*`. */
  custom: boolean;
  /** Démarre l'onde au centre plutôt qu'au point de contact. */
  centered: boolean;
  /** Coupe l'effet sur les deux blocs. */
  disabled: boolean;
}

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'stretch',
  gap: 'var(--units-lg)',
};
const retuned = {
  '--ui-ripple-color': 'var(--actions-warning-surface-default)',
  '--ui-ripple-opacity': '0.5',
  '--ui-ripple-duration': '620ms',
  '--ui-ripple-scale': '1.15',
} as CSSProperties;
const tile: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--units-2xs)',
  minWidth: 180,
  padding: 'var(--units-xl)',
  border: 'var(--stroke-sm) solid var(--global-border-default)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--global-background-muted)',
  color: 'var(--global-text-default)',
  fontFamily: 'var(--fontfamily-base)',
  fontWeight: 'var(--weight-bold)' as CSSProperties['fontWeight'],
  cursor: 'pointer',
};
const hint: CSSProperties = {
  color: 'var(--global-text-muted)',
  fontWeight: 'var(--weight-regular)' as CSSProperties['fontWeight'],
  fontSize: 'var(--size-typography-text-sm)',
};
const group: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--units-md)',
  padding: 'var(--units-lg)',
  border: 'var(--stroke-sm) dashed var(--global-border-default)',
  borderRadius: 'var(--radius-md)',
};

/** Les deux activations locales côte à côte : un élément ciblé, et une portée. */
function RippleDemo({ custom, centered, disabled }: DemoProps) {
  const targeted = useUiRipple<HTMLButtonElement>({ enabled: !disabled, centered });
  const scope = useUiRippleScope<HTMLDivElement>({ enabled: !disabled, centered });

  return (
    <div style={custom ? { ...row, ...retuned } : row}>
      <button type="button" style={tile} {...targeted}>
        Élément ciblé
        <small style={hint}>useUiRipple()</small>
      </button>

      <div style={group} {...scope}>
        <UiButton label="Enregistrer" icon="check" />
        <UiButton label="Annuler" level="low" variant="outlined" />
        <div style={{ ...tile, cursor: 'default' }} data-ripple="on">
          Zone marquée
          <small style={hint}>data-ripple="on"</small>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof RippleDemo> = {
  title: 'Foundations/Ripple',
  component: RippleDemo,
  parameters: {
    layout: 'padded',
    // Ces stories portent leur propre activation : elles ignorent l'interrupteur
    // de la barre d'outils, qui poserait sinon `data-ripple="off"` sur <html>.
    ripple: 'always',
  },
  argTypes: {
    custom: { control: 'boolean' },
    centered: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { custom: false, centered: false, disabled: false },
};

export default meta;
type Story = StoryObj<typeof RippleDemo>;

/** Réglage par défaut : onde `currentColor`, au point de contact. */
export const Default: Story = {};

/** La même onde, retaillée par les seuls crochets CSS. */
export const Custom: Story = { args: { custom: true } };
