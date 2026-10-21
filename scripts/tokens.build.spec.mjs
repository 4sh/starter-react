import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'tokens.build.mjs');

/**
 * Le pipeline est piloté par `tokens.config.json` et écrit à côté : chaque cas
 * s'exécute dans son propre dossier jetable, via `--config`, donc rien ne touche
 * aux fichiers générés du dépôt.
 */
const dirs = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Une collection préfixée (`primitives`) et la collection `transitions` (préfixe vide,
 * groupe `transition`), comme dans le dépôt, plus celles du cas. */
function config(extraCollections = []) {
  return {
    sourceRoot: 'design-tokens',
    header: 'test',
    collections: [
      {
        id: 'primitives',
        prefix: 'primitives',
        preserveCase: false,
        files: ['primitives.json'],
        modeAxes: [],
      },
      {
        id: 'transitions',
        prefix: '',
        preserveCase: false,
        files: ['transitions.json'],
        modeAxes: [],
      },
      ...extraCollections,
    ],
    outputs: [
      {
        id: 'css',
        format: 'css-vars',
        destination: 'out',
        collections: ['primitives', 'transitions', ...extraCollections.map((c) => c.id)],
      },
    ],
  };
}

const PRIMITIVES = { grey: { 900: { $value: '#111111', $type: 'color' } } };
const TRANSITIONS = {
  transition: {
    fast: { $value: '80ms', $type: 'duration' },
    default: { $value: '180ms', $type: 'duration' },
  },
};

function run({ tokens, extraCollections = [] }) {
  const dir = mkdtempSync(join(tmpdir(), 'tokens-build-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'design-tokens'), { recursive: true });
  writeFileSync(join(dir, 'tokens.config.json'), JSON.stringify(config(extraCollections), null, 2));
  const files = { 'primitives.json': PRIMITIVES, 'transitions.json': TRANSITIONS, ...tokens };
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, 'design-tokens', name), JSON.stringify(content, null, 2));
  }
  try {
    execFileSync(process.execPath, [SCRIPT, '--config', join(dir, 'tokens.config.json')], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    return { ok: false, message: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
  return { ok: true, css: (id) => readFileSync(join(dir, 'out', `_tokens-${id}.scss`), 'utf8') };
}

/** Construit `transitions.json` tel que l'exporterait Figma une fois les variables typées. */
const typed = (transition) => run({ tokens: { 'transitions.json': { transition } } });

describe('tokens.build : valeurs typées (durée, dimension, courbe)', () => {
  it('écrit en CSS les valeurs structurées du format DTCG', () => {
    const result = typed({
      fast: { $value: { value: 80, unit: 'ms' }, $type: 'duration' },
      slower: { $value: { value: 0.4, unit: 's' }, $type: 'duration' },
      text: { $value: '120ms', $type: 'duration' },
      easeinout: { $value: [0.42, 0, 0.58, 1], $type: 'cubicBezier' },
      keyword: { $value: 'ease-out', $type: 'cubicBezier' },
      distance: { $value: { value: 0.5, unit: 'rem' }, $type: 'dimension' },
    });

    expect(result.message ?? '').toBe('');
    const css = result.css('transitions');
    expect(css).toContain('--transition-fast: 80ms;');
    expect(css).toContain('--transition-slower: 0.4s;');
    expect(css).toContain('--transition-text: 120ms;');
    expect(css).toContain('--transition-easeinout: cubic-bezier(0.42, 0, 0.58, 1);');
    expect(css).toContain('--transition-keyword: ease-out;');
    expect(css).toContain('--transition-distance: 0.5rem;');
  });

  it('refuse une durée sans unité, en nommant le fichier et le jeton', () => {
    // Une variable TIMING de Figma compte en secondes : deviner des ms rendrait
    // l'animation mille fois plus courte, deviner des secondes l'inverse.
    const result = typed({ fast: { $value: 0.08, $type: 'duration' } });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('transitions.json → transition.fast');
    expect(result.message).toContain('secondes');
  });

  it('refuse une courbe dont un x sort de [0, 1], que CSS ignorerait en bloc', () => {
    const result = typed({ wild: { $value: [1.2, 0, 0.58, 1], $type: 'cubicBezier' } });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('transitions.json → transition.wild');
  });
});

describe('tokens.build : modes et nombres', () => {
  /** Une collection à deux modes, comme `motion`. */
  const motionCollection = (reduced) => ({
    id: 'motion',
    prefix: 'motion',
    preserveCase: false,
    files: ['motion.json'],
    modeAxes: [
      {
        name: 'motion',
        source: 'nested',
        strategy: 'media',
        default: 'modeStandard',
        map: { modeStandard: ':root', modeReduced: reduced },
      },
    ],
  });
  const build = (motion, reduced = null) =>
    run({ extraCollections: [motionCollection(reduced)], tokens: { 'motion.json': motion } });

  const SLIDE = {
    slide: {
      modeStandard: { distance: { $value: '8px', $type: 'dimension' } },
      modeReduced: { distance: { $value: '0px', $type: 'dimension' } },
    },
  };

  it("n'émet pas un mode associé à null, et ne le laisse pas écraser le mode par défaut", () => {
    const result = build(SLIDE);

    expect(result.message ?? '').toBe('');
    const css = result.css('motion');
    expect(css).toContain('--motion-slide-distance: 8px;');
    expect(css).not.toContain('0px');
    expect(css).not.toContain('@media');
  });

  it('émet un mode associé à une condition média sous cette condition', () => {
    const css = build(SLIDE, '(prefers-reduced-motion: reduce)').css('motion');

    expect(css).toMatch(/^:root \{\n {2}--motion-slide-distance: 8px;/m);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\n {2}:root \{\n {4}--motion-slide-distance: 0px;/,
    );
  });

  it('garde une recette en alias de sa primitive, dans chaque mode', () => {
    const css = build(
      {
        toggle: {
          modeStandard: {
            duration: { $value: '{transitions.transition.default}', $type: 'duration' },
          },
          modeReduced: { duration: { $value: '{transitions.transition.fast}', $type: 'duration' } },
        },
      },
      '(prefers-reduced-motion: reduce)',
    ).css('motion');

    expect(css).toContain('--motion-toggle-duration: var(--transition-default);');
    expect(css).toContain('--motion-toggle-duration: var(--transition-fast);');
  });

  it('arrondit un nombre stocké sur 32 bits par Figma, sans toucher un nombre propre', () => {
    const css = build({
      zoom: { modeStandard: { scale: { $value: 0.9599999785423279, $type: 'number' } } },
      grid: { modeStandard: { columns: { $value: 12, $type: 'number' } } },
    }).css('motion');

    expect(css).toContain('--motion-zoom-scale: 0.96;');
    expect(css).toContain('--motion-grid-columns: 12;');
  });
});
