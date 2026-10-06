import { defineConfig } from 'vite';

// One self-contained ESM file: the MCP SDK, Zod and MiniSearch are inlined
// (hence devDependencies only), so nothing resolves at the consumer's install.
// The doc snapshot is not bundled: it ships in `data/`, read at runtime.
export default defineConfig({
  build: {
    ssr: 'src/index.ts',
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'index.js' },
    },
  },
  ssr: { noExternal: true, target: 'node' },
});
