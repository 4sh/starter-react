/**
 * Déclarations pour `entries.mjs`, consommé aussi bien par les scripts Node que
 * par `vite.config.ts` (qui est, lui, typé). Le module reste écrit en JavaScript
 * : il tourne sous `node` sans étape de compilation, comme tous les scripts de
 * ce dépôt.
 */

export interface KitEntry {
  /** Clé de sortie Rollup, donc nom du fichier dans `dist/` (`ui-button`). */
  name: string;
  /** Sous-chemin public déclaré dans `exports` (`./ui-button`, ou `.`). */
  subpath: string;
  /** Dossier de rangement sur le disque, `'core'`, ou `null` pour la racine. */
  category: string | null;
  /** Chemin du fichier d'entrée, relatif à la racine du paquet. */
  entryFile: string;
  /** Le même, en absolu. */
  absEntry: string;
}

export declare const ROOT: string;
export declare const KIT_ROOT: string;
export declare const KIT_SRC: string;
export declare const CATEGORIES: readonly string[];
export declare function collectEntries(): KitEntry[];
export declare function collectComponents(): KitEntry[];
