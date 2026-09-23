import { createElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';

/**
 * Inlining d'un SVG par `ui-image`, **sans jamais coller une chaîne**.
 *
 * Inliner un SVG est ce qui lui fait hériter du CSS, `currentColor` et le thème,
 * ce qu'un `<img>` ne permet pas. Côté Angular cela passe par un
 * `bypassSecurityTrustHtml()`, la seule exception de sécurité du kit. Ici le
 * balisage est **converti en éléments React** : rien n'est écrit en HTML, donc
 * il n'y a pas d'exception à lever, et `docs/SECURITY-PRACTICES.md` peut rester
 * vide.
 *
 * Le modèle de menace n'est pas « les images du kit » : c'est un projet qui sert
 * `assets/img/` depuis un CDN, ou qui laisse un client déposer son logo dans un
 * dossier de marque. Dans les deux cas le SVG est du balisage d'origine inconnue
 * rendu dans l'origine de l'application, d'où le nettoyage qui précède la
 * conversion.
 */

/**
 * Balises retirées AVEC leur contenu : les déballer poserait leur corps dans le
 * document, ou laisserait le vecteur intact.
 *
 * `foreignObject` rouvre tout l'espace de noms HTML dans le SVG, et les
 * éléments SMIL peuvent recibler un attribut APRÈS ce nettoyage.
 */
const VOIDED_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
  'handler',
]);

/** Attributs porteurs d'une référence : les seuls autorisés à nommer une cible. */
const REF_ATTRS = new Set(['href', 'xlink:href', 'src']);

/** Une référence reste dans le document, ou navigue en http(s). */
const ALLOWED_REF_PROTOCOLS = ['http:', 'https:'];

/** Rejette `javascript:`, `data:` et les autres schémas non navigationnels. */
function isSafeRef(value: string): boolean {
  const ref = value.trim();
  // `<use href="#icone">` : une référence au même document ne nomme aucune cible externe.
  if (ref.startsWith('#')) return true;
  try {
    return ALLOWED_REF_PROTOCOLS.includes(new URL(ref, document.baseURI).protocol);
  } catch {
    return false;
  }
}

/** `stroke-width: 2; fill: red` vers l'objet que React attend. */
function parseStyle(text: string): CSSProperties {
  const style: Record<string, string> = {};
  for (const rule of text.split(';')) {
    const colon = rule.indexOf(':');
    if (colon === -1) continue;
    const property = rule.slice(0, colon).trim();
    const value = rule.slice(colon + 1).trim();
    if (!property || !value) continue;
    // Une propriété personnalisée garde son nom ; les autres passent en camel.
    style[
      property.startsWith('--')
        ? property
        : property.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    ] = value;
  }
  return style as CSSProperties;
}

/** Le nom de prop React d'un attribut, ou `null` s'il est à jeter. */
function propNameOf(name: string): string | null {
  const lower = name.toLowerCase();
  // Tout gestionnaire d'événement, quel que soit l'élément qui le porte.
  if (lower.startsWith('on')) return null;
  if (lower === 'class') return 'className';
  // `xlink:href` vers `xlinkHref`, `xml:space` vers `xmlSpace`.
  if (name.includes(':')) return name.replace(/:([a-z])/g, (_, c: string) => c.toUpperCase());
  return name;
}

/** Convertit un nœud nettoyé en élément React, récursivement. */
function toReact(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  if (VOIDED_TAGS.has(element.tagName.toLowerCase())) return null;

  const props: Record<string, unknown> = { key };
  for (const attr of element.attributes) {
    if (REF_ATTRS.has(attr.name.toLowerCase()) && !isSafeRef(attr.value)) continue;
    const prop = propNameOf(attr.name);
    if (!prop) continue;
    props[prop] = prop === 'style' ? parseStyle(attr.value) : attr.value;
  }

  const children = [...element.childNodes]
    .map((child, index) => toReact(child, index))
    .filter((child) => child !== null && child !== '');

  return createElement(element.localName, props, children.length ? children : undefined);
}

/**
 * Convertit le balisage d'un SVG en éléments React, après l'avoir nettoyé.
 *
 * L'analyse se fait dans un document détaché, donc inerte : rien ne s'exécute
 * et rien n'est chargé pendant qu'on l'inspecte. Rend `null` quand il n'y a pas
 * de DOM pour analyser (rendu serveur) ou quand le balisage ne contient pas de
 * `<svg>`, ce qui échoue du bon côté.
 */
export function inlineSvgToReact(raw: string): ReactElement | null {
  if (typeof DOMParser === 'undefined') return null;

  // `text/html` et non `image/svg+xml` : l'analyse HTML est tolérante, là où
  // l'analyse XML rejette en bloc un fichier mal formé.
  const parsed = new DOMParser().parseFromString(raw, 'text/html');
  const svg = parsed.body.querySelector('svg');
  if (!svg) return null;

  return toReact(svg, 0) as ReactElement | null;
}
