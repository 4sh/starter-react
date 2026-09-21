import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import storybookTest from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT_SRC = resolve(HERE, 'packages/ui-kit-react/src');

// Extension `.mts` : la racine du dépôt n'est pas en `"type": "module"` (les
// hooks de `.claude/` sont en CommonJS), et le chargeur natif de Vite refuse
// désormais un `.ts` en syntaxe ESM dans ce cas.
//
// Décision D8 : les composants sont testés dans un VRAI navigateur
// (Playwright), pas dans jsdom.
//
// La raison est structurelle pour un design system : ce qui casse dans ces
// composants, ce sont les états de focus, la cascade CSS, la résolution des
// variables et la géométrie des overlays — exactement ce que jsdom simule mal
// ou pas du tout. Un test qui passe sous jsdom sur un anneau de focus ne
// prouve rien.
//
// Deux projets, deux rôles distincts :
//
//   unit       les tests écrits à la main, à côté de chaque composant. Ils
//              assèrent le contrat : attributs ARIA, classes composées,
//              comportement du clic, valeurs résolues de la cascade.
//   storybook  CHAQUE story devient un test, rendue puis passée à axe. C'est
//              ce qui rend `a11y: { test: 'error' }` réellement bloquant au
//              lieu d'être une intention. Aucun test à écrire : la couverture
//              suit mécaniquement les stories, déjà obligatoires pour tout
//              composant du kit.
// Une FABRIQUE, pas un objet partagé : Vitest développe les instances de
// navigateur en projets nommés `<projet> (<navigateur>)`, et réutiliser le même
// objet entre deux projets fait entrer en collision les noms dérivés
// (« The project name "unit (chromium)" was already defined »).
const browser = (name: string) => ({
  enabled: true as const,
  provider: playwright(),
  headless: true,
  instances: [{ browser: 'chromium', name }],
});

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: { '@4sh/ui-kit-react': KIT_SRC },
        },
        css: {
          // Le CSS est réellement compilé pendant les tests : c'est ce qui
          // permet d'assérer une valeur résolue (`getComputedStyle`) et pas
          // seulement la présence d'une classe.
          preprocessorOptions: {
            scss: { loadPaths: [resolve(KIT_SRC, 'styles')] },
          },
        },
        test: {
          name: 'unit',
          include: ['packages/*/src/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
          browser: browser('unit'),
        },
      },
      {
        // Le plugin lit la config Storybook, transforme chaque story en test et
        // injecte lui-même les annotations du `preview`. Rien à recopier ici.
        plugins: [
          await storybookTest({
            configDir: resolve(HERE, 'storybook'),
            storybookScript: 'pnpm storybook --ci',
          }),
        ],
        test: {
          name: 'storybook',
          browser: browser('storybook'),
        },
      },
    ],
  },
});
