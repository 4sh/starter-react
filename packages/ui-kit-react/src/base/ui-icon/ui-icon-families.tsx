'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

/** Variante visuelle d'une icône, interprétée par chaque famille (plein / contour). */
export type UiIconType = 'solid' | 'outline';

/**
 * Décrit comment une fonte d'icônes transforme un nom et une variante en
 * balisage, pour que `ui-icon` puisse rendre n'importe quelle fonte
 * (FontAwesome, Material Symbols, Bootstrap Icons…).
 */
export interface UiIconFamily {
  /** Classes CSS posées sur le `<i>`. */
  classes: (name: string, type: UiIconType) => string;
  /**
   * Contenu textuel du `<i>`. Les fontes à ligatures (Material Symbols) y
   * mettent le nom ; les fontes à classes (FontAwesome) ne définissent rien.
   */
  content?: (name: string, type: UiIconType) => string | null;
}

/** Famille FontAwesome Free intégrée (celle par défaut). */
export const fontAwesomeFamily: UiIconFamily = {
  classes: (name, type) => `${type === 'outline' ? 'fa-regular' : 'fa-solid'} fa-${name}`,
};

/** Familles toujours disponibles, par clé. Les familles déclarées se posent par-dessus. */
export const UI_ICON_BUILTIN_FAMILIES: Record<string, UiIconFamily> = {
  fontawesome: fontAwesomeFamily,
};

interface UiIconFamilyContextValue {
  families: Record<string, UiIconFamily>;
  defaultFamily: string;
}

const UiIconFamilyContext = createContext<UiIconFamilyContextValue>({
  families: UI_ICON_BUILTIN_FAMILIES,
  defaultFamily: 'fontawesome',
});

export interface UiIconFamilyProviderProps {
  children: ReactNode;
  /** Familles déclarées, par clé. Elles gagnent sur les familles intégrées en cas de collision. */
  families?: Record<string, UiIconFamily>;
  /** Clé de la famille appliquée aux icônes qui ne précisent pas `family`. */
  defaultFamily?: string;
}

/**
 * Déclare des familles d'icônes, et la famille par défaut d'un sous-arbre.
 *
 * Un provider imbriqué complète le registre du parent au lieu de le remplacer :
 * une page change la famille par défaut sans redéclarer celles d'au-dessus.
 */
export function UiIconFamilyProvider({
  children,
  families,
  defaultFamily,
}: UiIconFamilyProviderProps) {
  const parent = useContext(UiIconFamilyContext);

  const value = useMemo<UiIconFamilyContextValue>(
    () => ({
      families: families ? { ...parent.families, ...families } : parent.families,
      defaultFamily: defaultFamily ?? parent.defaultFamily,
    }),
    [parent, families, defaultFamily],
  );

  return <UiIconFamilyContext.Provider value={value}>{children}</UiIconFamilyContext.Provider>;
}

/** @internal Registre visible depuis l'emplacement de rendu. */
export function useUiIconFamilies(): UiIconFamilyContextValue {
  return useContext(UiIconFamilyContext);
}
