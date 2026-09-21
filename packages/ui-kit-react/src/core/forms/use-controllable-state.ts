'use client';

import { useCallback, useState } from 'react';

export interface UiControllableStateOptions<T> {
  /** Valeur imposée par l'appelant. Renseignée, le composant est **contrôlé**. */
  value?: T;
  /** Valeur de départ quand le composant est non contrôlé. */
  defaultValue: T;
  /** Notifié à chaque changement, dans les deux modes. */
  onChange?: (next: T) => void;
}

/**
 * Le couple contrôlé / non contrôlé, résolu une fois pour tout le kit.
 *
 * `value` renseignée : contrôlé, l'état interne n'est jamais lu. Absente : non
 * contrôlé, `defaultValue` amorce. `onChange` est appelé dans les deux modes.
 *
 * Vit ici et non dans chaque composant : une vingtaine de champs doivent se
 * comporter exactement pareil. Détail et interop react-hook-form dans la page
 * de doc de `ui-input`.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UiControllableStateOptions<T>): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const resolved = isControlled ? value : internal;

  const setValue = useCallback(
    (next: T) => {
      // En mode contrôlé l'état interne n'est même pas écrit : le garder à jour
      // « au cas où » créerait deux sources de vérité, et c'est exactement le
      // bug qu'on voit quand un champ contrôlé se met à diverger de son parent.
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [resolved, setValue];
}
