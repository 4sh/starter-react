/*
 * Types partagés par plusieurs composants `ui-*`, sans code exécuté.
 * ⚠️ Ces noms sont un invariant entre les stacks : ne pas en renommer un sans le
 * faire des deux côtés.
 */

/**
 * Niveau sémantique partagé par les composants `ui-*`.
 * Correspond aux jetons `--actions-{level}-*` du Design System.
 */
export type UiLevel = 'high' | 'low' | 'success' | 'warning' | 'error';

/** Sous-niveau hiérarchique (intensité). */
export type UiSubLevel = 'high' | 'low';

/** Niveau d'un retour informatif. */
export type UiFeedbackLevel =
  'default' | 'highlight' | Extract<UiLevel, 'success' | 'warning' | 'error'>;
