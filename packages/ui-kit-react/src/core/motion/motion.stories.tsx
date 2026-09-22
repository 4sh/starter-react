import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UI_MOTION_PRESETS, useUiMotion, type UiMotionPreset } from './use-ui-motion';

interface MotionDemoProps {
  preset?: UiMotionPreset;
  /** Durée de cet exemplaire. Vide, c'est celle du jeton. */
  duration?: string;
  /** Coupe le mouvement : l'élément apparaît et disparaît net. */
  disabled?: boolean;
}

/**
 * Banc d'essai des préréglages : un bouton qui bascule, et une boîte qui entre
 * et sort avec le préréglage choisi. C'est la SORTIE qui se regarde, l'entrée
 * étant gratuite en React et la sortie étant tout l'objet du crochet.
 */
function MotionDemo({ preset = 'fade', duration, disabled = false }: MotionDemoProps) {
  const [visible, setVisible] = useState(true);
  // Destructuré en tête : le résultat contient une ref de rappel.
  const { present, ref, className, style } = useUiMotion(visible, {
    preset,
    duration: duration || undefined,
    disabled,
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--units-md)',
        alignItems: 'flex-start',
      }}
    >
      <UiButton
        size="small"
        level="low"
        icon={visible ? 'eye-slash' : 'eye'}
        label={visible ? 'Masquer' : 'Afficher'}
        onClick={() => setVisible((value) => !value)}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 96 }}>
        {present && (
          <div
            ref={ref}
            className={className}
            style={{
              ...style,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--actions-high-surface-default)',
              color: 'var(--actions-high-content-default)',
              boxShadow: 'var(--shadow-default-md)',
            }}
          >
            <span
              style={{
                display: 'block',
                padding: 'var(--units-lg) var(--units-xl)',
                fontFamily: 'var(--fontfamily-base)',
                fontWeight: 'var(--weight-bold)',
              }}
            >
              {preset}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const meta: Meta<typeof MotionDemo> = {
  title: 'Foundations/Motion',
  component: MotionDemo,
  args: { preset: 'fade', duration: '', disabled: false },
  argTypes: {
    preset: { control: 'select', options: UI_MOTION_PRESETS },
    duration: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof MotionDemo>;

/** Choisissez le préréglage, la durée et la coupure dans les contrôles. */
export const Playground: Story = {};

export const Fade: Story = { args: { preset: 'fade' } };
export const SlideUp: Story = { args: { preset: 'slide-up' } };
export const SlideDown: Story = { args: { preset: 'slide-down' } };
export const SlideLeft: Story = { args: { preset: 'slide-left' } };
export const SlideRight: Story = { args: { preset: 'slide-right' } };
export const Zoom: Story = { args: { preset: 'zoom' } };
export const Collapse: Story = { args: { preset: 'collapse' } };

/** Coupé, l'élément apparaît et disparaît net, et rien n'attend une animation. */
export const Disabled: Story = { args: { disabled: true } };
