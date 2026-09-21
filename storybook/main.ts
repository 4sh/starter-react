import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const config: StorybookConfig = {
  stories: [
    './docs/**/*.mdx',
    // Le kit : story et page de doc co-localisées avec le composant. Elles ne
    // partent jamais dans le paquet publié : `vite.config.ts` les exclut des
    // points d'entrée et `vite-plugin-dts` de la génération de déclarations.
    '../packages/ui-kit-react/src/**/*.mdx',
    '../packages/ui-kit-react/src/**/*.stories.@(ts|tsx)',
    // Les composants métier de l'application de démonstration.
    // ⚠️ Aucun n'existe encore, d'où le « No story files found » au lancement des
    // tests. C'est un avertissement, pas une panne : ne pas retirer ces motifs,
    // sinon la première story métier n'apparaîtra nulle part sans qu'on sache pourquoi.
    '../apps/demo/src/**/*.mdx',
    '../apps/demo/src/**/*.stories.@(ts|tsx)',
  ],

  staticDirs: ['./public'],

  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-designs',
    '@storybook/addon-a11y',
    './addons/text-search/preset.cjs',
    './addons/copy-as-markdown/preset.cjs',
    './addons/ripple-toggle/preset.cjs',
    '@storybook-community/storybook-dark-mode',
    // Transforme chaque story en test Vitest. Couplé à addon-a11y et au
    // `a11y: { test: 'error' }` du preview, c'est ce qui rend le contrôle
    // d'accessibilité BLOQUANT au lieu d'être un panneau qu'on regarde.
    '@storybook/addon-vitest',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  typescript: {
    // react-docgen lit les valeurs par défaut dans la DESTRUCTURATION des props.
    // Un défaut posé dans le corps du composant produit une table d'API vide,
    // sans erreur : c'est la contrepartie React de l'ancien passage par compodoc.
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // ⚠️ SANS ce chemin, react-docgen-typescript cherche le `tsconfig.json`
      // de la racine (qui ne couvre que `storybook/**`) ne voit donc aucun
      // fichier de composant, et n'extrait RIEN. La table d'API se rabat
      // silencieusement sur les seuls `argTypes` écrits à la main : types
      // approximatifs, aucune valeur par défaut, props non déclarées absentes.
      // Aucune erreur nulle part. On pointe la config de base, qui ne porte que
      // des `compilerOptions` et n'impose donc aucun périmètre de fichiers.
      tsconfigPath: resolve(ROOT, 'tsconfig.base.json'),
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => !prop.parent || !/node_modules/.test(prop.parent.fileName),
    },
  },

  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      // Évite les chaînes de `../../../..` dans les MDX co-localisés : la
      // profondeur d'un composant change avec sa catégorie, et un import
      // relatif se casse silencieusement à chaque déplacement.
      '@sb': HERE,
      // Le Storybook lit les SOURCES du kit, pas son `dist/`. Un composant
      // modifié se recharge à chaud, et il n'est plus nécessaire de
      // reconstruire le paquet avant de lancer la doc.
      '@4sh/ui-kit-react': resolve(ROOT, 'packages/ui-kit-react/src'),
    };

    viteConfig.css = viteConfig.css ?? {};
    viteConfig.css.preprocessorOptions = {
      ...viteConfig.css.preprocessorOptions,
      scss: {
        // Même rôle que `styleIncludePaths` côté ng-packagr : un composant
        // écrit `@use 'utils';` quelle que soit sa profondeur.
        loadPaths: [resolve(ROOT, 'packages/ui-kit-react/src/styles')],
      },
    };

    return viteConfig;
  },
};

export default config;
