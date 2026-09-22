'use client';

import { useMemo, useSyncExternalStore } from 'react';

import type { UiToastId, UiToastMessage } from './ui-toast.types';

/** Compteur de processus, garantissant l'unicité des identifiants générés. */
let sequence = 0;

/** Un instantané vide et stable : deux rendus serveur doivent le partager. */
const EMPTY: readonly UiToastMessage[] = Object.freeze([]);

let messages: readonly UiToastMessage[] = EMPTY;
const listeners = new Set<() => void>();

function publish(next: readonly UiToastMessage[]): void {
  if (next === messages) return;
  messages = next;
  for (const listener of listeners) listener();
}

/**
 * uiToast : le magasin des messages, point d'entrée programmatique.
 *
 * C'est un **module**, et non un contexte : une notification se déclenche aussi
 * depuis un intercepteur HTTP ou un gestionnaire d'erreurs, c'est-à-dire hors de
 * tout composant. Là où le kit Angular injecte un service `providedIn: 'root'`,
 * ce singleton rend le même service sans forcer un fournisseur à la racine.
 *
 * @example
 * ```ts
 * uiToast.add({ level: 'success', title: 'Enregistré', text: 'Profil mis à jour.' });
 * ```
 */
export const uiToast = {
  /**
   * Pousse un message et rend son identifiant, généré au besoin. Le garder
   * permet de le retirer plus tard, typiquement pour remplacer un « en cours »
   * par son résultat.
   */
  add(message: UiToastMessage): UiToastId {
    const id = message.id ?? `ui-toast-${sequence++}`;
    publish([...messages, { ...message, id }]);
    return id;
  },

  /** Pousse plusieurs messages d'un coup, et rend leurs identifiants dans l'ordre. */
  addAll(list: UiToastMessage[]): UiToastId[] {
    return list.map((message) => uiToast.add(message));
  },

  /** Retire un message par son identifiant. Sans effet s'il est déjà parti. */
  remove(id: UiToastId): void {
    publish(messages.filter((message) => message.id !== id));
  },

  /** Vide tout, ou seulement les messages d'un `channel`. */
  clear(channel?: string): void {
    if (channel == null) {
      publish(EMPTY);
      return;
    }
    publish(messages.filter((message) => message.channel !== channel));
  },

  /** Les messages vivants, dans leur ordre d'arrivée. */
  getMessages(): readonly UiToastMessage[] {
    return messages;
  },

  /** S'abonne aux changements. Rend la fonction de désabonnement. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Le magasin vit au niveau du module, donc il est partagé par toutes les
// requêtes d'un serveur : l'instantané serveur est toujours vide, et le premier
// rendu client repart de là.
const serverSnapshot = () => EMPTY;

/**
 * Les messages vivants d'un `channel`, réactifs.
 *
 * Sans argument, les messages sans `channel`, qui sont le cas courant.
 */
export function useUiToasts(channel?: string): readonly UiToastMessage[] {
  const all = useSyncExternalStore(uiToast.subscribe, uiToast.getMessages, serverSnapshot);
  return useMemo(() => all.filter((message) => message.channel === channel), [all, channel]);
}
