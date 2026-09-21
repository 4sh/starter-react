/**
 * Sélecteur des éléments qu'on peut atteindre au clavier.
 *
 * Volontairement une **constante lisible** et non une dépendance : la question
 * difficile, celle du piège de focus modal, est résolue nativement par
 * `<dialog>.showModal()`, dont le navigateur gère l'ordre et le bouclage. Ce qui
 * reste ici est le cas facile, poser le focus dans un panneau à l'ouverture, et
 * il ne justifie pas d'ajouter une librairie que le consommateur devrait
 * installer en mode copie.
 *
 * Deux gardes s'ajoutent à chaque entrée. `:not([tabindex^="-"])` retire ce qui
 * a été sorti du parcours : sans lui, un `<button tabindex="-1">` resterait
 * dans la liste, puisqu'il reste un bouton non désactivé. Et `:not([inert])`,
 * avec sa variante descendante, écarte les sous-arbres neutralisés.
 *
 * La visibilité, elle, se vérifie à la lecture : un sélecteur ne peut pas la
 * voir.
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
  // `offsetParent` est nul pour `display: none` mais aussi pour `position:
  // fixed` : d'où le repli sur les rectangles, qui, eux, sont vides quand
  // l'élément n'est pas rendu.
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
