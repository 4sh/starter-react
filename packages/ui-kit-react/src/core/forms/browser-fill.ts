import type { AnimationEvent } from 'react';

/** Marque un champ natif pour la règle `:-webkit-autofill` de la feuille globale. */
export const BROWSER_FILL_CLASS = 'ui-browser-fill';

const BROWSER_FILL_ANIMATION = 'ui-browser-fill';

/** L'élément a-t-il le focus ? (fonctionne aussi dans une racine fantôme) */
export function hasFocus(element: Element): boolean {
  return (element.getRootNode() as Document | ShadowRoot).activeElement === element;
}

/**
 * `onAnimationStart` d'un champ marqué `BROWSER_FILL_CLASS`. L'animation que la feuille
 * globale lance sur `:-webkit-autofill` est le seul signe d'une valeur préremplie sans aucun
 * événement, que le rendu suivant écraserait. Le champ reçoit alors l'`input` que le
 * navigateur n'a pas émis : son `onChange` le traite comme une autre écriture, et React ne
 * rapporte jamais deux fois la même valeur.
 */
export function announceBrowserFill(
  event: AnimationEvent<HTMLInputElement | HTMLTextAreaElement>,
): void {
  if (event.animationName === BROWSER_FILL_ANIMATION) {
    event.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
