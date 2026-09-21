/*
 * Briques de type partagées par plusieurs composants `ui-*` (`UiLevel` en
 * premier lieu). Aucun code exécuté : un composant qui n'a besoin que d'un
 * type ne paie rien pour dépendre de cette entrée.
 *
 * ⚠️ Ces noms sont un invariant entre les stacks : ils portent la même
 * sémantique que dans `@4sh/ui-kit` côté Angular, et le contrôle de parité les
 * compare. Ne pas en renommer un sans le faire des deux côtés.
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
