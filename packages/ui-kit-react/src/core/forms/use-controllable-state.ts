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
 * Interop react-hook-form : page de doc de `ui-input`.
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
      // Contrôlé, l'état interne n'est pas écrit : ce serait une seconde source de vérité.
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [resolved, setValue];
}
