import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { inlineSvgToReact } from './ui-image-svg';

/** Rend le résultat de la conversion, pour l'inspecter dans le DOM. */
const monter = (raw: string) => render(<div data-hote="">{inlineSvgToReact(raw)}</div>);

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';

test('le balisage devient de vrais nœuds SVG', async () => {
  const screen = await monter(SVG);
  const svg = screen.container.querySelector('svg')!;

  expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
  expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  expect(svg.querySelector('circle')).toHaveAttribute('r', '10');
});

// Tout l'intérêt de l'inlining : le vecteur hérite du CSS environnant, ce qu'un
// `<img>` ne permet pas.
test('le SVG inliné hérite de la couleur du texte', async () => {
  const screen = await render(
    <div style={{ color: 'rgb(1, 2, 3)' }}>
      {inlineSvgToReact(
        '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="currentColor"/></svg>',
      )}
    </div>,
  );

  expect(getComputedStyle(screen.container.querySelector('rect')!).fill).toBe('rgb(1, 2, 3)');
});

test('sans balise svg, rien n’est rendu', async () => {
  expect(inlineSvgToReact('<div>pas un svg</div>')).toBeNull();
  expect(inlineSvgToReact('')).toBeNull();
});

// --- Nettoyage -------------------------------------------------------------
// Le modèle de menace n'est pas « les images du kit » : c'est un projet qui sert
// ses images depuis un CDN, ou qui laisse un client déposer son logo.
test('les balises exécutables sont retirées avec leur contenu', async () => {
  const screen = await monter(
    '<svg viewBox="0 0 10 10">' +
      '<script>window.__pwned = 1</script>' +
      '<foreignObject><div>html</div></foreignObject>' +
      '<animate attributeName="fill" to="red"/>' +
      '<circle r="1"/>' +
      '</svg>',
  );
  const svg = screen.container.querySelector('svg')!;

  expect(svg.querySelector('script')).toBeNull();
  expect(svg.querySelector('foreignObject')).toBeNull();
  expect(svg.querySelector('animate')).toBeNull();
  expect(svg.querySelector('circle')).not.toBeNull();
  expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  expect(svg.textContent).not.toContain('window.__pwned');
});

test('les gestionnaires d’événements sont retirés', async () => {
  const screen = await monter(
    '<svg viewBox="0 0 10 10" onload="window.__pwned = 1"><circle r="1" onclick="alert(1)"/></svg>',
  );
  const svg = screen.container.querySelector('svg')!;

  expect(svg.hasAttribute('onload')).toBe(false);
  expect(svg.querySelector('circle')!.hasAttribute('onclick')).toBe(false);
});

// Une référence reste dans le document, ou navigue en http(s) : `javascript:` et
// `data:` n'ont rien à faire dans un attribut de lien.
test('seules les références sûres survivent', async () => {
  const screen = await monter(
    '<svg viewBox="0 0 10 10">' +
      '<use href="#icone"/>' +
      '<a href="https://example.com"><circle r="1"/></a>' +
      '<a href="javascript:alert(1)" id="mauvais"><circle r="2"/></a>' +
      '<image href="data:text/html,pwn" id="charge"/>' +
      '</svg>',
  );
  const svg = screen.container.querySelector('svg')!;

  expect(svg.querySelector('use')).toHaveAttribute('href', '#icone');
  expect(svg.querySelector('a[href="https://example.com"]')).not.toBeNull();
  expect(svg.querySelector('#mauvais')!.hasAttribute('href')).toBe(false);
  expect(svg.querySelector('#charge')!.hasAttribute('href')).toBe(false);
});

// --- Conversion des attributs ----------------------------------------------
test('class et style sont traduits pour React', async () => {
  const screen = await monter(
    '<svg viewBox="0 0 10 10" class="mon-svg" style="opacity: 0.5; --teinte: red"><circle r="1"/></svg>',
  );
  const svg = screen.container.querySelector('svg')!;

  expect(svg).toHaveClass('mon-svg');
  expect(getComputedStyle(svg).opacity).toBe('0.5');
  expect(svg.style.getPropertyValue('--teinte')).toBe('red');
});

test('un attribut à deux points garde son sens', async () => {
  const screen = await monter(
    '<svg xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">' +
      '<use xlink:href="#cible"/></svg>',
  );

  expect(screen.container.querySelector('use')!.getAttribute('xlink:href')).toBe('#cible');
});

test('les attributs de présentation traversent tels quels', async () => {
  const screen = await monter(
    '<svg viewBox="0 0 10 10"><path d="M0 0" stroke-width="3" stroke-linecap="round"/></svg>',
  );
  const path = screen.container.querySelector('path')!;

  expect(path).toHaveAttribute('stroke-width', '3');
  expect(path).toHaveAttribute('stroke-linecap', 'round');
});
