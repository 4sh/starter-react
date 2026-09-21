/**
 * `process.env.NODE_ENV` est la convention que React lui-même utilise pour ses
 * avertissements de développement : tous les bundlers (Vite, webpack, Next,
 * Rspack) la remplacent à la compilation, et la branche de développement
 * disparaît donc du bundle de production du consommateur.
 *
 * On la déclare ici plutôt que d'ajouter `@types/node` aux types du paquet : le
 * kit s'exécute dans un navigateur, il n'a aucune raison de voir l'API Node au
 * complet. `import.meta.env.DEV` serait plus direct, mais n'existe que sous
 * Vite : un consommateur sous Next planterait.
 */
declare const process: {
  readonly env: {
    readonly NODE_ENV?: 'development' | 'production' | 'test' | (string & {});
  };
};
