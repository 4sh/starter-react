// =====================================================================
// Moteur de l'onde de pression, sans React : un écouteur `pointerdown` passif
// par liaison, une couche de découpe par hôte, une `<span>` par onde. Les
// styles lisent les `--ui-ripple-*` héritées (`styles/base/_ripple.scss`).
// =====================================================================

/**
 * Ce qu'une racine déléguée fait onduler par défaut : ce qui se déclare, soit
 * les contrôles du kit (qui portent `data-ripple="on"`) et ce que l'application
 * marque de même. Un Design System ne peint pas d'onde sur un balisage qui
 * n'est pas le sien.
 */
export const UI_RIPPLE_DEFAULT_SELECTOR = '[data-ripple="on"]';

/**
 * Tout ce qui se clique, jeu du kit compris. À passer à `UiRippleProvider`
 * pour faire onduler aussi les contrôles de l'application sans les lister.
 */
export const UI_RIPPLE_INTERACTIVE_SELECTOR =
  'button, [role="button"], a[href], [data-ripple="on"]';

/** Réglages d'une liaison, relus à chaque pression. */
export interface UiRippleSettings {
  /** `false` met la liaison en sommeil sans la défaire. */
  enabled: boolean;
  /** Partir du centre de l'élément plutôt que du point de contact. */
  centered: boolean;
  /** Délégation seulement : ce qui ondule dans la racine. */
  selector: string;
}

// Un symbole GLOBAL : deux copies du kit dans une page (micro-frontends) se
// reconnaissent, et une pression ne produit toujours qu'une onde.
const CLAIMED = Symbol.for('@4sh/ui-kit/ripple:claimed');
type Claimable = Record<symbol, true | undefined>;
const LAYER_CLASS = 'ui-ripple-layer';
const INK_CLASS = 'ui-ripple-ink';
/** Ondes vivantes à la fois sur un hôte : un clic frénétique n'empile pas de nœuds. */
const MAX_INK = 4;

const layers = new WeakMap<Element, HTMLElement>();
let reducedMotion: MediaQueryList | undefined;

/** Une pression, une onde : la liaison la plus intérieure la réclame, les autres s'effacent. */
function isClaimed(event: Event): boolean {
  return (event as unknown as Claimable)[CLAIMED] === true;
}

function claim(event: Event): void {
  (event as unknown as Claimable)[CLAIMED] = true;
}

function listen(node: HTMLElement, handle: (event: PointerEvent) => void): () => void {
  const onPointerDown = (event: PointerEvent) => {
    if (event.button > 0 || !event.isPrimary || isClaimed(event)) return;
    handle(event);
  };
  node.addEventListener('pointerdown', onPointerDown, { passive: true });
  return () => node.removeEventListener('pointerdown', onPointerDown);
}

/** Couche de découpe d'un hôte, créée à la première pression. */
function layerFor(host: HTMLElement): HTMLElement {
  const cached = layers.get(host);
  if (cached?.parentElement === host) return cached;

  // Une autre copie du moteur a pu équiper cet hôte avant nous : sa couche vaut
  // la nôtre, et en créer une seconde les empilerait sur l'élément.
  const existing = host.querySelector<HTMLElement>(`:scope > .${LAYER_CLASS}`);
  if (existing) {
    layers.set(host, existing);
    return existing;
  }

  // La couche s'ancre sur l'hôte, qui doit établir le bloc conteneur.
  if (host.ownerDocument.defaultView?.getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }

  const layer = host.ownerDocument.createElement('span');
  layer.className = LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  host.appendChild(layer);
  layers.set(host, layer);
  return layer;
}

/** Hôte désactivé, ou sous-arbre qui se retire par `data-ripple="off"`. */
function inert(host: HTMLElement): boolean {
  return (
    (host as HTMLButtonElement).disabled === true ||
    host.getAttribute('aria-disabled') === 'true' ||
    host.closest('[data-ripple="off"]') !== null
  );
}

/** Préférence de mouvement réduit, ou interrupteur `data-motion="off"` du kit. */
function stilled(doc: Document): boolean {
  reducedMotion ??= doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  return reducedMotion?.matches === true || doc.documentElement.dataset['motion'] === 'off';
}

/**
 * Lance une onde sur `host`, depuis le point de contact ou depuis son centre.
 * Publique pour qu'une application fasse onduler depuis son propre déclencheur
 * (un raccourci clavier, un événement distant) sans pression.
 */
export function launchRipple(host: HTMLElement, event?: PointerEvent, centered = false): void {
  if (typeof window === 'undefined') return;
  if (stilled(host.ownerDocument) || inert(host)) return;

  const rect = host.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = event && !centered ? event.clientX - rect.left : rect.width / 2;
  const y = event && !centered ? event.clientY - rect.top : rect.height / 2;
  // Le coin le plus lointain : l'onde couvre toujours tout l'élément.
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));

  const layer = layerFor(host);
  while (layer.childElementCount >= MAX_INK && layer.firstElementChild) {
    layer.firstElementChild.remove();
  }

  const ink = host.ownerDocument.createElement('span');
  ink.className = INK_CLASS;
  ink.style.cssText = `left:${x - radius}px;top:${y - radius}px;width:${radius * 2}px;height:${radius * 2}px`;
  ink.addEventListener('animationend', () => ink.remove(), { once: true });
  layer.appendChild(ink);
}

/** L'hôte lui-même ondule. Rend la fonction qui défait la liaison. */
export function bindRipple(
  host: HTMLElement,
  settings: () => Pick<UiRippleSettings, 'enabled' | 'centered'>,
): () => void {
  const stop = listen(host, (event) => {
    // Réclamée même éteinte : une liaison explicite l'emporte toujours sur une racine englobante.
    claim(event);
    const { enabled, centered } = settings();
    if (enabled) launchRipple(host, event, centered);
  });

  return () => {
    stop();
    layers.get(host)?.remove();
    layers.delete(host);
  };
}

/** Les descendants qui répondent au sélecteur ondulent. Rend la fonction qui défait la liaison. */
export function delegateRipple(root: HTMLElement, settings: () => UiRippleSettings): () => void {
  return listen(root, (event) => {
    const { enabled, centered, selector } = settings();
    if (!enabled) return;

    const target = (event.target as Element | null)?.closest(selector);
    // `closest` peut remonter au-delà de la racine : ce résultat-là appartient à une liaison englobante.
    if (!(target instanceof HTMLElement) || !root.contains(target)) return;

    claim(event);
    launchRipple(target, event, centered);
  });
}
