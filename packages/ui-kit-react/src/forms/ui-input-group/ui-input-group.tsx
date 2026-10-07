'use client';

import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { joinIds, type FieldLevel, type FieldSize } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiHelper } from '../../informative/ui-helper';
import { UiLabel } from '../ui-label';

import './ui-input-group.scss';

/** Taille partagée par le groupe avec ses cellules. */
const UiInputGroupContext = createContext<FieldSize>('default');

export interface UiInputGroupProps extends ComponentPropsWithRef<'div'> {
  /** Taille transmise au libellé et aux `UiInputGroupAddon`. Les contrôles gardent la leur. */
  size?: FieldSize;
  /** Libellé au-dessus du groupe. Il nomme le groupe, pas ses contrôles. */
  label?: string;
  /** Astérisque sur le libellé, visuel seulement : les contrôles obligatoires portent `required`. */
  required?: boolean;
  /** Message sous le groupe (aide ou erreur), relié par `aria-describedby`. */
  message?: string;
  /**
   * Statut de validation : teinte le message et les bordures des champs et cellules.
   * Prime sur le `level` propre des contrôles.
   */
  level?: FieldLevel;
  /** Préfixe le message d'une icône décorative. */
  showMessageIcon?: boolean;
  /** Remplace le glyphe déduit du `level`. N'allume pas l'icône à lui seul. */
  messageIcon?: string;
  /** Une seule boîte autour de la rangée : ni trait entre les items, un seul anneau de focus. */
  merged?: boolean;
  children?: ReactNode;
}

/**
 * ui-input-group : colle un contrôle et ses cellules en un seul champ visuel.
 *
 * Chaque enfant garde son API et ses états ; le groupe les aligne, carre les coins
 * intérieurs et fond les bordures voisines. `label` et `message` le rendent comme
 * `ui-field` et en font un `role="group"`. `merged` dessine une boîte autour de la rangée.
 */
export function UiInputGroup({
  size = 'default',
  label,
  required = false,
  message,
  level = 'default',
  showMessageIcon = false,
  messageIcon,
  merged = false,
  className,
  role,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  children,
  ...rest
}: UiInputGroupProps) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const messageId = `${uid}-message`;
  // Sans libellé ni message, le groupe reste une enveloppe de mise en page, sans rôle.
  const isField = Boolean(label) || Boolean(message);

  return (
    <div
      {...rest}
      className={cx(
        'ui-input-group',
        `_${level}`,
        size !== 'default' && `_${size}`,
        merged && '_merged',
        className,
      )}
      role={role ?? (isField ? 'group' : undefined)}
      aria-labelledby={ariaLabelledBy ?? (label ? labelId : undefined)}
      aria-describedby={joinIds(message && messageId, ariaDescribedBy)}
    >
      {label && (
        <UiLabel
          className="ui-input-group-label"
          id={labelId}
          label={label}
          required={required}
          size={size}
        />
      )}

      <div className="ui-input-group-row">
        <UiInputGroupContext.Provider value={size}>{children}</UiInputGroupContext.Provider>
      </div>

      {message && (
        <UiHelper
          className="ui-input-group-message"
          id={messageId}
          message={message}
          level={level}
          showIcon={showMessageIcon}
          icon={messageIcon}
          size="small"
        />
      )}
    </div>
  );
}

export interface UiInputGroupAddonProps extends ComponentPropsWithRef<'div'> {
  /** Taille de la cellule. Par défaut, celle du groupe. */
  size?: FieldSize;
  children?: ReactNode;
}

/**
 * ui-input-group-addon : cellule non interactive d'un `UiInputGroup` (texte,
 * icône, case à cocher, bouton radio).
 *
 * Elle rend son contenu dans une boîte alignée sur la hauteur de champ.
 */
export function UiInputGroupAddon({ size, className, children, ...rest }: UiInputGroupAddonProps) {
  const groupSize = useContext(UiInputGroupContext);
  const resolved = size ?? groupSize;

  return (
    <div
      {...rest}
      className={cx('ui-input-group-addon', resolved !== 'default' && `_${resolved}`, className)}
    >
      {children}
    </div>
  );
}
