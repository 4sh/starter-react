import { expect, test, vi } from 'vitest';

import { htmlToNodes, sanitizeHtml, sanitizeStyle, sanitizeUrl } from './ui-editor-sanitize';

test('le HTML de mise en forme passe tel quel', () => {
  const html =
    '<p>Du <strong>gras</strong>, de l\'<em>italique</em> et un <a href="https://example.com">lien</a>.</p>' +
    '<ul><li>Un</li><li>Deux</li></ul><pre>code</pre>';
  // L'apostrophe (39) est dans la plage que l'encodeur d'Angular laisse telle quelle.
  expect(sanitizeHtml(html)).toBe(html);
});

test('les classes de l’éditeur survivent, comme chez Angular', () => {
  const html = '<p><span class="ui-editor-font-title ui-editor-color-red-700">Titre</span></p>';
  expect(sanitizeHtml(html)).toBe(html);
});

test('scripts, styles et gabarits disparaissent AVEC leur contenu', () => {
  expect(
    sanitizeHtml(
      '<p>a</p><script>alert(1)</script><style>p{}</style><template><b>t</b></template>',
    ),
  ).toBe('<p>a</p>');
});

test('un élément inconnu disparaît, son texte reste', () => {
  expect(sanitizeHtml('<p><custom-tag>texte</custom-tag></p><iframe src="x"></iframe>')).toBe(
    '<p>texte</p>',
  );
});

test('les gestionnaires et attributs inconnus tombent', () => {
  expect(
    sanitizeHtml(
      '<p onclick="alert(1)" data-x="1" title="ok">a</p><img src="x.png" onerror="alert(1)">',
    ),
  ).toBe('<p title="ok">a</p><img src="x.png">');
});

test('une URL javascript: est neutralisée, une URL ordinaire non', () => {
  expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
    '<a href="unsafe:javascript:alert(1)">x</a>',
  );
  expect(sanitizeUrl('https://example.com/a?b#c')).toBe('https://example.com/a?b#c');
  expect(sanitizeUrl('mailto:a@b.fr')).toBe('mailto:a@b.fr');
  expect(sanitizeUrl('/relative/page')).toBe('/relative/page');
  expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBe('unsafe:JaVaScRiPt:alert(1)');
});

test('un SVG ou un MathML ne font pas passer de script par un changement d’espace de noms', () => {
  const out = sanitizeHtml(
    '<svg><style><img src=x onerror=alert(1)></style></svg><math><mtext><table><mglyph><style><img src=x onerror=alert(2)>',
  );
  // L'analyseur fait sortir `<img>` de l'espace SVG : l'image devient un élément
  // HTML ordinaire, gardé SANS son gestionnaire, comme chez Angular.
  expect(out).not.toMatch(/onerror/i);
  // Et la sortie est stable : la renettoyer ne la change plus, ce qui ferme la
  // porte aux mutations entre deux analyses.
  expect(sanitizeHtml(out)).toBe(out);
});

test("le style est réduit à l'alignement et au retrait que l'éditeur écrit", () => {
  expect(sanitizeHtml('<p style="text-align: center;">a</p>')).toBe(
    '<p style="text-align: center;">a</p>',
  );
  expect(
    sanitizeHtml(
      '<blockquote style="margin: 0 0 0 40px; border: none; padding: 0px;"><p>a</p></blockquote>',
    ),
  ).toBe(
    '<blockquote style="margin: 0 0 0 40px; border: none; padding: 0px;"><p>a</p></blockquote>',
  );
  expect(sanitizeHtml('<p style="color: red">a</p>')).toBe('<p>a</p>');
});

test('aucune url() ne passe par le style', () => {
  expect(sanitizeStyle('background: url(https://evil.example/x); text-align: left')).toBe(
    'text-align: left;',
  );
  expect(sanitizeStyle('margin: url(x)')).toBe('');
  expect(sanitizeStyle('text-align: expression(alert(1))')).toBe('');
  expect(sanitizeStyle('border: 1px solid red')).toBe('');
});

test('les entités et caractères spéciaux sont réencodés', () => {
  expect(sanitizeHtml('<p>a &lt; b &amp; c</p>')).toBe('<p>a &lt; b &amp; c</p>');
  expect(sanitizeHtml('<p>café 😀</p>')).toBe('<p>caf&#233; &#128512;</p>');
});

test('une valeur vide ou absente rend une chaîne vide', () => {
  expect(sanitizeHtml('')).toBe('');
  expect(sanitizeHtml(null)).toBe('');
  expect(sanitizeHtml(undefined)).toBe('');
});

test('un formulaire écrasé ne fait pas planter le champ', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  // `<form>` dont un enfant s'appelle `nextSibling` : ses liens de parenté mentent.
  const out = sanitizeHtml(
    '<form><input name="nextSibling"><input name="firstChild"></form><p>b</p>',
  );
  expect(typeof out).toBe('string');
  warn.mockRestore();
});

test('htmlToNodes rend des nœuds insérables, sans rien exécuter', () => {
  const host = document.createElement('div');
  host.replaceChildren(
    ...htmlToNodes(sanitizeHtml('<p>a<b>b</b></p><img src="x" onerror="window.__pwned=1">')),
  );
  document.body.append(host);

  expect(host.innerHTML).toBe('<p>a<b>b</b></p><img src="x">');
  expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  host.remove();
});
