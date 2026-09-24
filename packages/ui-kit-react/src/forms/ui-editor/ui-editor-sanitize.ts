// =====================================================================
// Nettoyage du HTML de l'éditeur. Seule extension aux listes : `style`, réduit à
// ce que l'éditeur écrit (Chromium aligne et met en retrait par `style`). L'analyse
// se fait dans un document détaché et inerte ; `innerHTML` n'y est que LU.
// =====================================================================

function tagSet(tags: string): Set<string> {
  return new Set(tags.split(','));
}

const VOID_ELEMENTS = tagSet('area,br,col,hr,img,wbr');
const OPTIONAL_END_TAG_BLOCK_ELEMENTS = tagSet('colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr');
const OPTIONAL_END_TAG_INLINE_ELEMENTS = tagSet('rp,rt');
const BLOCK_ELEMENTS = tagSet(
  'address,article,aside,blockquote,caption,center,del,details,dialog,dir,div,dl,figure,' +
    'figcaption,footer,h1,h2,h3,h4,h5,h6,header,hgroup,hr,ins,main,map,menu,nav,ol,pre,section,' +
    'summary,table,ul',
);
const INLINE_ELEMENTS = tagSet(
  'a,abbr,acronym,audio,b,bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,' +
    'mark,picture,q,ruby,rp,rt,s,samp,small,source,span,strike,strong,sub,sup,time,track,tt,u,' +
    'var,video',
);
const VALID_ELEMENTS = new Set([
  ...VOID_ELEMENTS,
  ...OPTIONAL_END_TAG_BLOCK_ELEMENTS,
  ...OPTIONAL_END_TAG_INLINE_ELEMENTS,
  ...BLOCK_ELEMENTS,
  ...INLINE_ELEMENTS,
]);

const URI_ATTRS = tagSet('background,cite,href,itemtype,longdesc,poster,src,xlink:href');
const HTML_ATTRS = tagSet(
  'abbr,accesskey,align,alt,autoplay,axis,bgcolor,border,cellpadding,cellspacing,class,clear,' +
    'color,cols,colspan,compact,controls,coords,datetime,default,dir,download,face,headers,' +
    'height,hidden,hreflang,hspace,ismap,itemscope,itemprop,kind,label,lang,language,loop,media,' +
    'muted,nohref,nowrap,open,preload,rel,rev,role,rows,rowspan,rules,scope,scrolling,shape,size,' +
    'sizes,span,srclang,srcset,start,summary,tabindex,target,title,translate,type,usemap,valign,' +
    'value,vspace,width',
);
const ARIA_ATTRS = tagSet(
  'aria-activedescendant,aria-atomic,aria-autocomplete,aria-busy,aria-checked,aria-colcount,' +
    'aria-colindex,aria-colspan,aria-controls,aria-current,aria-describedby,aria-details,' +
    'aria-disabled,aria-dropeffect,aria-errormessage,aria-expanded,aria-flowto,aria-grabbed,' +
    'aria-haspopup,aria-hidden,aria-invalid,aria-keyshortcuts,aria-label,aria-labelledby,' +
    'aria-level,aria-live,aria-modal,aria-multiline,aria-multiselectable,aria-orientation,' +
    'aria-owns,aria-placeholder,aria-posinset,aria-pressed,aria-readonly,aria-relevant,' +
    'aria-required,aria-roledescription,aria-rowcount,aria-rowindex,aria-rowspan,aria-selected,' +
    'aria-setsize,aria-sort,aria-valuemax,aria-valuemin,aria-valuenow,aria-valuetext',
);
const VALID_ATTRS = new Set([...URI_ATTRS, ...HTML_ATTRS, ...ARIA_ATTRS]);

/** Éléments invalides dont on saute aussi le CONTENU : leur texte n'est pas du texte. */
const SKIP_CONTENT = tagSet('script,style,template');

const SAFE_URL_PATTERN = /^(?!javascript:)(?:[a-z0-9+.-]+:|[^&:/?#]*(?:[/?#]|$))/i;

/** Une URL sûre passe telle quelle ; une autre est neutralisée. */
export function sanitizeUrl(url: string): string {
  return SAFE_URL_PATTERN.test(url) ? url : `unsafe:${url}`;
}

// --- `style`, réduit à ce que l'éditeur écrit ------------------------------------

const LENGTH = String.raw`(?:0|-?\d+(?:\.\d+)?(?:px|em|rem|%))`;
const LENGTHS = new RegExp(`^${LENGTH}(?:\\s+${LENGTH}){0,3}$`);

/** Propriété autorisée → forme de valeur autorisée. Aucune ne laisse passer `url()`. */
const STYLE_ALLOWLIST: Record<string, RegExp> = {
  'text-align': /^(?:left|right|center|justify|start|end)$/,
  margin: LENGTHS,
  'margin-left': LENGTHS,
  'margin-right': LENGTHS,
  'margin-inline-start': LENGTHS,
  padding: LENGTHS,
  border: /^none$/,
};

/** Ne garde de `style` que les déclarations de la liste, ou rien. */
export function sanitizeStyle(style: string): string {
  const kept: string[] = [];
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration
      .slice(colon + 1)
      .trim()
      .toLowerCase();
    const pattern = STYLE_ALLOWLIST[property];
    if (pattern && pattern.test(value)) kept.push(`${property}: ${value};`);
  }
  return kept.join(' ');
}

// --- Analyse inerte ----------------------------------------------------------------

/**
 * Analyse du HTML dans un document détaché : les scripts n'y tournent pas et
 * les ressources ne s'y chargent pas.
 */
export function parseInert(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, 'text/html').body;
}

// --- Sérialisation filtrante -------------------------------------------------------

const SURROGATE_PAIR = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
const NON_ALPHANUMERIC = /([^#-~ |!])/g;

function encodeEntities(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(SURROGATE_PAIR, (match) => {
      const hi = match.charCodeAt(0);
      const low = match.charCodeAt(1);
      return `&#${(hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000};`;
    })
    .replace(NON_ALPHANUMERIC, (match) => `&#${match.charCodeAt(0)};`)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Un nœud dont les liens de parenté mentent (`<form>` écrasé par un champ nommé). */
function clobbered(node: Node): Error {
  return new Error(`[ui-editor] Nettoyage impossible : élément écrasé (${node.nodeName}).`);
}

function nextSibling(node: Node): Node | null {
  const next = node.nextSibling;
  if (next && node !== next.previousSibling) throw clobbered(next);
  return next;
}

function firstChild(node: Node): Node | null {
  const first = node.firstChild;
  if (
    first &&
    (node.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_CONTAINED_BY) !==
      Node.DOCUMENT_POSITION_CONTAINED_BY
  ) {
    throw clobbered(first);
  }
  return first;
}

function nodeName(node: Node): string {
  return typeof node.nodeName === 'string' ? node.nodeName.toLowerCase() : 'form';
}

function serialize(root: Node): string {
  const buf: string[] = [];
  const parents: Node[] = [];

  const start = (el: Element): boolean => {
    const tag = nodeName(el);
    if (!VALID_ELEMENTS.has(tag)) return !SKIP_CONTENT.has(tag);
    buf.push('<', tag);
    for (const attr of Array.from(el.attributes)) {
      const lower = attr.name.toLowerCase();
      let value = attr.value;
      if (lower === 'style') {
        value = sanitizeStyle(value);
        if (!value) continue;
      } else if (!VALID_ATTRS.has(lower)) {
        continue;
      } else if (URI_ATTRS.has(lower)) {
        value = sanitizeUrl(value);
      }
      buf.push(' ', attr.name, '="', encodeEntities(value), '"');
    }
    buf.push('>');
    return true;
  };

  const end = (el: Element) => {
    const tag = nodeName(el);
    if (VALID_ELEMENTS.has(tag) && !VOID_ELEMENTS.has(tag)) buf.push('</', tag, '>');
  };

  let current: Node | null = root.firstChild;
  while (current) {
    let traverse = true;
    if (current.nodeType === Node.ELEMENT_NODE) traverse = start(current as Element);
    else if (current.nodeType === Node.TEXT_NODE) buf.push(encodeEntities(current.nodeValue ?? ''));

    if (traverse && current.firstChild) {
      parents.push(current);
      current = firstChild(current);
      continue;
    }
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) end(current as Element);
      const next = nextSibling(current);
      if (next) {
        current = next;
        break;
      }
      current = parents.pop() ?? null;
    }
  }
  return buf.join('');
}

/**
 * Le HTML d'une valeur, rendu sûr, `style` réduit compris.
 *
 * Une entrée instable (qui change encore après cinq réanalyses, signe d'une
 * tentative de mutation) rend une chaîne vide plutôt que de lever : un champ
 * de formulaire qui plante sur une valeur stockée serait un déni de service.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return '';

  let input = String(html);
  let body = parseInert(input);
  for (let attempts = 5; ; attempts--) {
    const reparsed = body.innerHTML;
    if (reparsed === input) break;
    if (attempts === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[ui-editor] HTML instable après cinq analyses : valeur écartée.');
      }
      return '';
    }
    input = reparsed;
    body = parseInert(input);
  }

  try {
    return serialize(body);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.warn(String(error));
    return '';
  }
}

/**
 * Les nœuds d'un HTML DÉJÀ sûr, prêts à être insérés : c'est ce qui remplace
 * l'écriture de `innerHTML`. Un nœud issu d'un autre document est adopté à
 * l'insertion.
 */
export function htmlToNodes(safeHtml: string): Node[] {
  return Array.from(parseInert(safeHtml).childNodes);
}
