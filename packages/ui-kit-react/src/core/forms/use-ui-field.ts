'use client';

import { useId } from 'react';

import type { FieldLevel, UiFieldSharedProps } from './field-types';

/**
 * Assemble une liste d'identifiants pour `aria-describedby`, en écartant ce qui
 * est vide.
 *
 * Rend `undefined` plutôt qu'une chaîne vide : un `aria-describedby=""` est pire
 * qu'un attribut absent, il annonce une description qui n'existe pas. Les
 * valeurs fausses sont acceptées pour que l'appelant puisse écrire
 * `joinIds(a, condition && b)` sans ternaire.
 */
export function joinIds(...ids: (string | false | null | undefined)[]): string | undefined {
  return ids.filter((id): id is string => Boolean(id)).join(' ') || undefined;
}

export interface UiFieldWiring {
  /** id porté par le contrôle natif, et cible du `for` du libellé. */
  inputId: string;
  /** id du message, référencé par `aria-describedby`. */
  messageId: string;
  /** Niveau effectif : `error` dès que `invalid`, sinon le `level` demandé. */
  level: FieldLevel;
  /** Message affiché : `errorText` en erreur s'il existe, sinon `helperText`. */
  message: string | undefined;
  /** `aria-describedby` complet, ou `undefined` pour omettre l'attribut. */
  describedBy: string | undefined;
  /** `aria-label` à poser, ou `undefined` si un libellé visible s'en charge. */
  ariaLabel: string | undefined;
  /** `aria-invalid` à poser, ou `undefined`. */
  ariaInvalid: true | undefined;
}

/**
 * Câblage partagé d'un champ : identifiants, niveau effectif, message et ARIA.
 *
 * Pendant React de `BaseFormField`, en hook plutôt qu'en classe de base. Deux
 * différences qui valent d'être connues :
 *
 * - les identifiants viennent de `useId()`, donc ils sont **stables entre le
 *   rendu serveur et l'hydratation**. Le compteur incrémental de la version
 *   Angular ne l'aurait pas été : deux rendus serveur concurrents auraient
 *   produit des identifiants différents de ceux du client ;
 * - `aria-describedby` chaîne l'id du message et celui fourni par l'appelant,
 *   et n'est posé que si le message est réellement rendu : un attribut qui
 *   pointe un élément absent est pire que pas d'attribut.
 */
export function useUiField(props: UiFieldSharedProps & { id?: string }): UiFieldWiring {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const messageId = `${inputId}-message`;

  const level: FieldLevel = props.invalid ? 'error' : (props.level ?? 'default');
  const message = level === 'error' && props.errorText ? props.errorText : props.helperText;

  const describedBy = joinIds(message && messageId, props['aria-describedby']);

  return {
    inputId,
    messageId,
    level,
    message,
    describedBy,
    // Un libellé visible étiquette déjà le contrôle : doubler avec un
    // `aria-label` remplacerait le nom accessible au lieu de l'enrichir.
    ariaLabel: props.label ? undefined : props['aria-label'],
    ariaInvalid: level === 'error' ? true : undefined,
  };
}
