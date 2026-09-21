import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

import { collectEntries } from '../../scripts/lib/entries.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// La liste des points d'entrée n'est pas écrite ici : elle est déduite de
// l'arborescence par `scripts/lib/entries.mjs`, que `exports.build.mjs` relit
// pour écrire la table `exports` du package.json. Un seul recensement, deux
// consommateurs : c'est ce qui empêche « compilé mais non déclaré ».
const entry = Object.fromEntries(collectEntries().map((e) => [e.name, e.absEntry]));

export default defineConfig({
  plugins: [
    react(),

    // En mode librairie, Vite EXTRAIT le CSS mais retire l'import du JS produit
    // : sans ce plugin, un composant importé rendrait sans style tant que le
    // consommateur n'importe pas la feuille à la main. Le plugin réinjecte
    // l'import dans chaque chunk d'entrée, ce qui redonne le comportement
    // qu'Angular offrait gratuitement (le style voyage avec le composant).
    // `sideEffects` du package.json liste les CSS en conséquence.
    libInjectCss(),

    dts({
      entryRoot: 'src',
      outDir: 'dist',
      tsconfigPath: resolve(HERE, 'tsconfig.build.json'),
      // Les stories et les tests vivent à côté des composants : ils ne doivent
      // produire aucune déclaration dans le paquet publié.
      exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    }),
  ],

  css: {
    preprocessorOptions: {
      scss: {
        // Permet à un composant d'écrire `@use 'utils';` exactement comme dans
        // le starter Angular (où `styleIncludePaths` jouait ce rôle), au lieu
        // d'un chemin relatif qui changerait avec la profondeur du dossier.
        loadPaths: [resolve(HERE, 'src/styles')],
      },
    },
  },

  build: {
    lib: { entry, formats: ['es'] },
    // Un CSS par point d'entrée : le consommateur qui n'importe que `ui-button`
    // ne tire pas la feuille des 60 autres.
    cssCodeSplit: true,
    sourcemap: true,
    // Un paquet de composants n'est jamais l'artefact final : c'est le bundler
    // du projet consommateur qui minifie. Garder le code lisible rend les
    // traces d'exécution exploitables.
    minify: false,
    target: 'es2022',
    rollupOptions: {
      // Tout ce qui est fourni par le projet consommateur reste externe. Les
      // expressions régulières couvrent aussi les sous-chemins (`react/jsx-runtime`).
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/, /^@radix-ui\//, 'clsx'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name][extname]',
        // Les composants sont interactifs : ils portent tous la frontière
        // client. Rollup supprime les directives de haut niveau au bundling,
        // donc on la repose sur chaque entrée. Le jour où une entrée doit
        // rester utilisable en composant serveur, elle sortira de cette règle
        // par une liste d'exception, pas en retirant la bannière.
        banner: (chunk) => (chunk.isEntry ? "'use client';" : ''),
      },
    },
  },
});
