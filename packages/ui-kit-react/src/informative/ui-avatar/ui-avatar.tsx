'use client';

import {
  useEffect,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { cx } from '../../core/utils';

import './ui-avatar.scss';

export type AvatarSize = 'tiny' | 'small' | 'default' | 'large';
export type AvatarShape = 'circle' | 'square';
export type AvatarMode = 'image' | 'label' | 'icon';

const ICON_SIZES: Record<AvatarSize, UiIconSize> = {
  tiny: 'default',
  small: 'md',
  default: 'default',
  large: 'lg',
};

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

export interface UiAvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Source de l'image. Prioritaire sur `label` et `icon`. */
  image?: string;
  /** Texte alternatif de l'image, qui lui sert de nom accessible. */
  alt?: string;
  /** Texte court ou initiales, utilisé à défaut d'image. */
  label?: string;
  /** Nom d'icône, utilisé à défaut d'image et de libellé. */
  icon?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  /** Nom accessible explicite. Recommandé en mode image et en mode icône. */
  'aria-label'?: string;
  /** Indicateur de statut posé en haut à droite, typiquement un `ui-badge`. */
  badge?: ReactNode;
  /** Appelé quand l'image échoue à charger : l'avatar bascule sur libellé ou icône. */
  onImageError?: (event: SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * ui-avatar : représente une personne ou une entité.
 *
 * Le mode se déduit des props, dans l'ordre image, libellé, icône. Une image qui
 * échoue à charger fait retomber l'avatar sur le mode suivant.
 */
export function UiAvatar({
  image,
  alt,
  label,
  icon = 'user',
  size = 'default',
  shape = 'circle',
  badge,
  onImageError,
  className,
  ...rest
}: UiAvatarProps) {
  const ariaLabel = rest['aria-label'];

  // On mémorise la source EN ÉCHEC, pas un booléen : changer d'image réactive
  // le mode image sans effet de remise à zéro.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const mode: AvatarMode = image && failedSrc !== image ? 'image' : label ? 'label' : 'icon';

  const accessibleName = ariaLabel ?? (mode === 'label' ? label : undefined);
  const isDecorative = mode === 'icon' && !accessibleName;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (mode === 'image' && !alt && !ariaLabel) {
      const key = image ?? 'image';
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(
        `[ui-avatar] Avatar en image sans nom accessible : renseignez \`alt\` ou \`aria-label\`.`,
      );
    }
  }, [mode, alt, ariaLabel, image]);

  return (
    <span
      {...rest}
      className={cx(
        'ui-avatar',
        `_${mode}`,
        size !== 'default' && `_${size}`,
        shape !== 'circle' && `_${shape}`,
        className,
      )}
      // En mode image, c'est l'`alt` qui nomme : doubler d'un role="img" sur le
      // parent ferait annoncer l'avatar deux fois.
      role={mode !== 'image' && accessibleName ? 'img' : undefined}
      aria-label={mode !== 'image' ? accessibleName : undefined}
      aria-hidden={isDecorative || undefined}
    >
      {mode === 'image' ? (
        <img
          className="ui-avatar-image"
          src={image}
          alt={alt ?? ariaLabel ?? ''}
          onError={(event) => {
            setFailedSrc(image ?? null);
            onImageError?.(event);
          }}
        />
      ) : mode === 'label' ? (
        <span className="ui-avatar-label" aria-hidden="true">
          {label}
        </span>
      ) : (
        <UiIcon className="ui-avatar-icon" name={icon} size={ICON_SIZES[size]} />
      )}

      {badge && <span className="ui-avatar-badge">{badge}</span>}
    </span>
  );
}
