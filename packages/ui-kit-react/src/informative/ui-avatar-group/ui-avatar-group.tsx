import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../core/utils';

import './ui-avatar-group.scss';

export interface UiAvatarGroupProps extends ComponentPropsWithRef<'div'> {
  /** Les `UiAvatar` à empiler, dans l'ordre d'affichage. */
  children?: ReactNode;
}

/**
 * ui-avatar-group : empile des `ui-avatar` en les faisant se chevaucher.
 *
 * Aide de mise en page, rien de plus : il range ce qu'on lui donne. Le
 * débordement (« +5 ») s'écrit comme un avatar de plus, en mode libellé, et
 * n'est donc pas calculé ici.
 */
export function UiAvatarGroup({ className, children, ...rest }: UiAvatarGroupProps) {
  return (
    <div {...rest} className={cx('ui-avatar-group', className)} role="group">
      {children}
    </div>
  );
}
