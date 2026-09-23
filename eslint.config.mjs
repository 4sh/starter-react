// =====================================================================
// ESLint (config plate) — starter React Web.
//
// Le fichier porte l'extension `.mjs` parce que la racine du dépôt n'est PAS
// en `"type": "module"` : les scripts sont en `.mjs` et les hooks de `.claude/`
// en CommonJS. Renommer ce fichier en `.js` le ferait analyser comme du
// CommonJS et casserait ses `import`.
// =====================================================================

import js from '@eslint/js';
import a11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Écritures de HTML non assaini — bannies par défaut.
 *
 * C'est la transposition de la règle du starter Angular, qui interdit
 * `bypassSecurityTrust…()` et les écritures directes d'`innerHTML`. React
 * échappe tout ce qui passe par du JSX, et `dangerouslySetInnerHTML` est
 * précisément la porte de sortie : elle injecte la chaîne telle quelle.
 *
 * Une exception se lève en trois étapes, jamais moins : assainir la valeur dans
 * du code testable, la justifier sur place
 * (`// eslint-disable-next-line no-restricted-syntax -- EXCEPTION JUSTIFIÉE: …`),
 * et l'inscrire au registre de `docs/SECURITY-PRACTICES.md`.
 */
const UNSAFE_HTML = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message:
      'dangerouslySetInnerHTML injecte la chaîne sans aucun assainissement. ' +
      'Voir docs/SECURITY-PRACTICES.md avant de lever une exception.',
  },
  {
    selector: 'AssignmentExpression > MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
    message:
      "Une écriture directe d'innerHTML/outerHTML n'est assainie par rien. " +
      'Passez par du JSX, que React échappe.',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: "insertAdjacentHTML n'assainit rien. Passez par du JSX.",
  },
  {
    selector:
      "CallExpression[callee.property.name='execCommand'][arguments.0.value=/^inserthtml$/i]",
    message:
      "execCommand('insertHTML') insère la chaîne telle quelle, comme innerHTML. " +
      'Voir docs/SECURITY-PRACTICES.md avant de lever une exception.',
  },
  {
    selector: "NewExpression[callee.name='Function'], CallExpression[callee.name='eval']",
    message: 'Évaluation de code à la volée : interdite.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      '**/dist/**',
      'storybook-static',
      'storybook/generated',
      'packages/ui-kit-react/src/styles/generated',
      'packages/ui-kit-react-cli/assets',
      'packages/ui-kit-react-mcp/data',
      'coverage',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- Sources du kit et de la démo ---
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2023 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': a11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...a11y.flatConfigs.recommended.rules,

      'no-restricted-syntax': ['error', ...UNSAFE_HTML],

      // `role="list"` sur un `<ul>` n'est redondant que sur le papier : Safari
      // (WebKit) retire la sémantique de liste d'une liste en `list-style: none`,
      // ce que font toutes les listes du kit. Le rôle explicite la rend. Le reste
      // de la règle, `nav` compris (son réglage par défaut), s'applique.
      'jsx-a11y/no-redundant-roles': ['error', { nav: ['navigation'], ul: ['list'] }],

      // Le kit n'expose que des composants fonctionnels typés : un `any` y
      // fuiterait dans la surface publique.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // --- Stories : la surface publique n'est pas en jeu, l'ergonomie oui ---
  {
    files: ['**/*.stories.tsx', 'storybook/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // --- Addons du manager Storybook : dette héritée, assumée et bornée ---
  //
  // Ces trois addons sont repris tels quels du starter Angular, où ils
  // fonctionnent. `set-state-in-effect` est une règle apparue avec la v7 du
  // plugin : elle a raison sur le fond (rendu en cascade), mais la corriger
  // demande de retoucher un code éprouvé qui ne fait pas partie de la surface
  // publique du kit. Ramenée à un avertissement ICI, et nulle part ailleurs —
  // le kit, lui, doit la respecter (voir `core/theming`, qui passe par
  // `useSyncExternalStore` pour cette raison exacte).
  {
    files: ['storybook/addons/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // --- Scripts Node ---
  {
    files: ['scripts/**/*.mjs', '*.mjs', '*.config.ts', '**/*.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // --- Presets d'addons Storybook : CommonJS, côté Node ---
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // --- Blocs de doc et addons écrits en JS : ils tournent dans le navigateur ---
  //
  // `config-table.js` mesure les valeurs résolues au runtime (getComputedStyle,
  // MutationObserver, ResizeObserver) : c'est du code de page, pas de build.
  {
    files: ['storybook/blocks/**/*.js', 'storybook/addons/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // --- Hooks Claude Code : CommonJS assumé ---
  {
    files: ['.claude/hooks/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // Un hook qui échoue ne doit jamais bloquer l'outil qu'il surveille :
      // les `catch {}` y sont volontaires.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
