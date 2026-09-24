'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/** Mode clair / sombre. Correspond à l'axe `theme` des jetons sémantiques. */
export type UiThemeMode = 'light' | 'dark';

/** Marque active. Correspond à l'axe `brand` des jetons primitifs. */
export type UiBrandId = 'brand1' | 'brand2' | 'brand3';

const STORAGE_KEY_THEME = 'ui-kit-theme';
const STORAGE_KEY_BRAND = 'ui-kit-brand';

const THEMES: readonly UiThemeMode[] = ['light', 'dark'];
const BRANDS: readonly UiBrandId[] = ['brand1', 'brand2', 'brand3'];

/**
 * `useLayoutEffect` pose l'attribut avant la peinture, mais avertit au rendu
 * serveur : `useEffect` y prend sa place.
 */
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Préférence lue comme une source externe, via `useSyncExternalStore` : la valeur
 * mémorisée n'existe que dans le navigateur, et un instantané serveur distinct évite
 * l'écart d'hydratation sans `setState` dans un effet. Une chaîne se compare par
 * valeur : aucun cache d'instantané n'est nécessaire.
 */
function createPreferenceStore<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  persist: boolean,
) {
  const listeners = new Set<() => void>();
  let memory: T = fallback;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const read = (): T => {
    if (!persist) return memory;
    try {
      const value = localStorage.getItem(key);
      return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
    } catch {
      // Stockage indisponible (navigation privée, cookies bloqués) : pas une erreur.
      return fallback;
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      // `storage` ne se déclenche QUE dans les autres onglets : l'écriture
      // locale passe donc par `notify()`, jamais par cet écouteur.
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) listener();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => fallback,
    write(value: T) {
      memory = value;
      if (persist) {
        try {
          localStorage.setItem(key, value);
        } catch {
          /* voir read() */
        }
      }
      notify();
    },
  };
}

interface UiThemeContextValue {
  theme: UiThemeMode;
  brand: UiBrandId;
  setTheme: (theme: UiThemeMode) => void;
  setBrand: (brand: UiBrandId) => void;
  toggleTheme: () => void;
}

const UiThemeContext = createContext<UiThemeContextValue | null>(null);

export interface UiThemeProviderProps {
  children: ReactNode;
  /** Mode imposé par le projet. Renseigné, le provider devient contrôlé. */
  theme?: UiThemeMode;
  /** Mode initial quand le provider est non contrôlé. */
  defaultTheme?: UiThemeMode;
  /** Marque imposée par le projet. Renseignée, le provider devient contrôlé. */
  brand?: UiBrandId;
  /** Marque initiale quand le provider est non contrôlé. */
  defaultBrand?: UiBrandId;
  /** Appelé à chaque changement de mode, y compris en mode contrôlé. */
  onThemeChange?: (theme: UiThemeMode) => void;
  /** Appelé à chaque changement de marque, y compris en mode contrôlé. */
  onBrandChange?: (brand: UiBrandId) => void;
  /**
   * Mémorise le choix dans `localStorage`. Coupez-le si le projet porte déjà sa
   * propre persistance (préférence serveur, cookie, profil utilisateur).
   */
  persist?: boolean;
  /**
   * Élément qui porte `data-theme` / `data-brand`. Par défaut `<html>`, ce que
   * les jetons générés attendent (`:root` et `[data-theme='dark']`). À changer
   * uniquement pour isoler un sous-arbre, par exemple un aperçu côte à côte.
   */
  target?: () => HTMLElement | null;
}

/**
 * Pose le mode et la marque actifs sur le document, et les expose aux
 * composants. Un projet qui stocke la préférence côté serveur passe `theme`
 * (mode contrôlé) et garde la main.
 */
export function UiThemeProvider({
  children,
  theme: themeProp,
  defaultTheme = 'light',
  brand: brandProp,
  defaultBrand = 'brand1',
  onThemeChange,
  onBrandChange,
  persist = true,
  target,
}: UiThemeProviderProps) {
  // Un magasin par provider : `persist` et les replis en font partie, et deux
  // providers imbriqués (un aperçu isolé) ne se marchent pas dessus.
  const themeStore = useMemo(
    () => createPreferenceStore(STORAGE_KEY_THEME, THEMES, defaultTheme, persist),
    [defaultTheme, persist],
  );
  const brandStore = useMemo(
    () => createPreferenceStore(STORAGE_KEY_BRAND, BRANDS, defaultBrand, persist),
    [defaultBrand, persist],
  );

  const storedTheme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );
  const storedBrand = useSyncExternalStore(
    brandStore.subscribe,
    brandStore.getSnapshot,
    brandStore.getServerSnapshot,
  );

  const theme = themeProp ?? storedTheme;
  const brand = brandProp ?? storedBrand;

  useIsomorphicLayoutEffect(() => {
    const root = target?.() ?? document.documentElement;
    if (!root) return;

    // `light` est l'état par défaut des jetons (`:root`) : l'attribut est retiré, pas posé.
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');

    if (brand === 'brand1') root.removeAttribute('data-brand');
    else root.setAttribute('data-brand', brand);
  }, [theme, brand, target]);

  const setTheme = useCallback(
    (next: UiThemeMode) => {
      themeStore.write(next);
      onThemeChange?.(next);
    },
    [themeStore, onThemeChange],
  );

  const setBrand = useCallback(
    (next: UiBrandId) => {
      brandStore.write(next);
      onBrandChange?.(next);
    },
    [brandStore, onBrandChange],
  );

  const toggleTheme = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, setTheme],
  );

  const value = useMemo<UiThemeContextValue>(
    () => ({ theme, brand, setTheme, setBrand, toggleTheme }),
    [theme, brand, setTheme, setBrand, toggleTheme],
  );

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>;
}

function useUiThemeContext(hook: string): UiThemeContextValue {
  const context = useContext(UiThemeContext);
  if (!context) {
    throw new Error(
      `${hook}() est appelé hors de <UiThemeProvider>. Enveloppez la racine de ` +
        `l'application avec ce provider : c'est lui qui pose data-theme et data-brand.`,
    );
  }
  return context;
}

/** Mode clair / sombre actif, et de quoi le changer. */
export function useUiTheme() {
  const { theme, setTheme, toggleTheme } = useUiThemeContext('useUiTheme');
  return { theme, setTheme, toggleTheme };
}

/** Marque active, et de quoi la changer. */
export function useUiBrand() {
  const { brand, setBrand } = useUiThemeContext('useUiBrand');
  return { brand, setBrand };
}

/**
 * Script à injecter dans le `<head>`, avant tout rendu, pour poser le mode et
 * la marque mémorisés AVANT la première peinture.
 *
 * Sans lui, une page rendue côté serveur s'affiche en clair puis bascule à
 * l'hydratation : le provider ne s'exécute qu'après.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * <head>
 *   <script dangerouslySetInnerHTML={{ __html: uiThemeBootstrapScript() }} />
 * </head>
 * ```
 */
export function uiThemeBootstrapScript(): string {
  return (
    `(function(){try{var d=document.documentElement;` +
    `var t=localStorage.getItem('${STORAGE_KEY_THEME}');` +
    `if(t==='dark')d.setAttribute('data-theme','dark');` +
    `var b=localStorage.getItem('${STORAGE_KEY_BRAND}');` +
    `if(b==='brand2'||b==='brand3')d.setAttribute('data-brand',b);}catch(e){}})();`
  );
}
