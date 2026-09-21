import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));

// La démo consomme le PAQUET CONSTRUIT (`workspace:*` → `dist/`), pas les
// sources du kit. C'est délibéré, et c'est la seule chose ici qui vérifie la
// table `exports` : un sous-chemin oublié casse cette application, pas
// Storybook : qui, lui, lit `src/` par un alias pour garder le rechargement à
// chaud. Les deux surfaces se complètent : l'une pour itérer, l'autre pour
// prouver que le tarball tient debout.
export default defineConfig({
  // Servie dans un sous-chemin sur GitHub Pages (`/starter-react/demo/`). En
  // local la base reste la racine.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@app': resolve(HERE, 'src'),
    },
  },
});
