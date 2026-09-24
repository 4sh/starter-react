/**
 * Sélecteur des éléments qu'on peut atteindre au clavier. Chaque entrée écarte
 * aussi un `tabindex` négatif (un `<button tabindex="-1">` reste un bouton) et
 * les sous-arbres `inert`. La visibilité se vérifie à la lecture.
 */
const FOCUSABLE_TAGS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'details > summary:first-of-type',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex^="-"])',
];

export const FOCUSABLE_SELECTOR = FOCUSABLE_TAGS.map(
  (selector) => `${selector}:not([tabindex^="-"]):not([inert]):not([inert] *)`,
).join(',');

/** Un élément rendu, donc réellement atteignable. */
function isVisible(element: HTMLElement): boolean {
  // `offsetParent` est nul aussi en `position: fixed` : repli sur les
  // rectangles, vides seulement pour un élément non rendu.
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

/** Éléments focalisables d'un conteneur, dans l'ordre du document. */
export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(isVisible);
}

/**
 * Pose le focus sur le premier élément focalisable du conteneur.
 *
 * Repli sur le conteneur lui-même, rendu focalisable le temps de la mise au
 * point : un panneau vide doit quand même recevoir le focus, sinon il reste sur
 * l'élément d'avant et Échap ne l'atteint pas.
 */
export function focusFirstWithin(container: HTMLElement): HTMLElement | null {
  const first = focusableWithin(container)[0];
  if (first) {
    first.focus();
    return first;
  }
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
  container.focus();
  return container;
}
