'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';

import { bindRipple, delegateRipple, UI_RIPPLE_DEFAULT_SELECTOR } from './ripple-engine';

/** Sélecteur du kit, que les portées sans sélecteur propre reprennent. */
const SelectorContext = createContext(UI_RIPPLE_DEFAULT_SELECTOR);

export interface UiRippleProviderProps {
  /**
   * Fait onduler tout le document, par délégation sur `<body>`. À `false`, le
   * fournisseur ne fait que poser le sélecteur des portées qu'il contient.
   */
  global?: boolean;
  /** Ce qu'une racine déléguée fait onduler. Par défaut, ce qui porte `data-ripple="on"`. */
  selector?: string;
  children?: ReactNode;
}

/**
 * Active l'onde pour TOUTE l'application : tout ce qui porte `data-ripple="on"`,
 * dont les composants du kit, répond à une pression.
 *
 * ```tsx
 * <UiRippleProvider>
 *   <App />
 * </UiRippleProvider>
 *
 * // élargir à tous les contrôles de l'application
 * <UiRippleProvider selector={UI_RIPPLE_INTERACTIVE_SELECTOR}>…</UiRippleProvider>
 * ```
 *
 * Un élément ou un sous-arbre se retire par `data-ripple="off"`, et chaque
 * composant du kit par `ripple={false}`. Les crochets n'ont pas besoin du
 * fournisseur.
 */
export function UiRippleProvider({
  global = true,
  selector = UI_RIPPLE_DEFAULT_SELECTOR,
  children,
}: UiRippleProviderProps) {
  useEffect(() => {
    if (!global) return;
    return delegateRipple(document.body, () => ({ enabled: true, centered: false, selector }));
  }, [global, selector]);

  return <SelectorContext.Provider value={selector}>{children}</SelectorContext.Provider>;
}

export interface UiRippleOptions {
  /** `false` retire l'élément et son sous-arbre, activation globale comprise. */
  enabled?: boolean;
  /** Partir du centre plutôt que du point de contact (contrôles réduits à une icône). */
  centered?: boolean;
}

export interface UiRippleScopeOptions extends UiRippleOptions {
  /** Ce qui ondule dans la portée. Par défaut, le sélecteur du fournisseur. */
  selector?: string;
}

/** Props à reverser sur l'élément : la ref qui le lie, et le marqueur de retrait. */
export interface UiRippleBinding<T extends HTMLElement = HTMLElement> {
  ref: (node: T | null) => (() => void) | void;
  'data-ripple': 'off' | undefined;
}

/**
 * Les réglages vivent dans une référence, relue à chaque pression : la liaison
 * est posée une fois, et suit pourtant les props du dernier rendu.
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * CET élément répond à une pression par une onde partie du point de contact.
 *
 * ```tsx
 * const ripple = useUiRipple({ centered: true });
 * <div className="tuile" {...ripple}>…</div>
 * ```
 *
 * L'onde est découpée par la boîte de l'élément et suit son `border-radius`. Sur
 * un composant du kit, préférer sa prop `ripple` ou `useUiRippleScope()` sur un
 * conteneur : c'est son contrôle natif qu'il faut atteindre.
 */
export function useUiRipple<T extends HTMLElement = HTMLElement>({
  enabled = true,
  centered = false,
}: UiRippleOptions = {}): UiRippleBinding<T> {
  const settings = useLatest({ enabled, centered });
  const ref = useCallback(
    (node: T | null) => (node ? bindRipple(node, () => settings.current) : undefined),
    [settings],
  );
  return { ref, 'data-ripple': enabled ? undefined : 'off' };
}

/**
 * Tout ce qui est interactif DANS cet élément ondule, avec un seul écouteur sur
 * le conteneur plutôt qu'une liaison par contrôle.
 *
 * ```tsx
 * const scope = useUiRippleScope();
 * <div className="barre" {...scope}>
 *   <UiButton label="Enregistrer" />
 * </div>
 * ```
 *
 * Les portées imbriquées et `useUiRipple` ne s'additionnent pas : la
 * déclaration la plus intérieure l'emporte.
 */
export function useUiRippleScope<T extends HTMLElement = HTMLElement>({
  enabled = true,
  centered = false,
  selector,
}: UiRippleScopeOptions = {}): UiRippleBinding<T> {
  const kitSelector = useContext(SelectorContext);
  const settings = useLatest({ enabled, centered, selector: selector || kitSelector });
  const ref = useCallback(
    (node: T | null) => (node ? delegateRipple(node, () => settings.current) : undefined),
    [settings],
  );
  return { ref, 'data-ripple': enabled ? undefined : 'off' };
}
