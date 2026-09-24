import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiCheckbox } from '../ui-checkbox';
import { UiRadio } from '../ui-radio';
import { UiToggle } from '../ui-toggle';

import './ui-toggle-block.scss';

/** Contrôle de sélection embarqué dans le bloc. */
export type ToggleBlockIndicator = 'checkbox' | 'radio' | 'toggle';
export type ToggleBlockSize = 'default' | 'small' | 'large';
export type ToggleBlockIndicatorPosition = 'start' | 'end';
/** Alignement vertical de l'indicateur face au contenu. */
export type ToggleBlockAlign = 'center' | 'start';

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

export interface UiToggleBlockProps<T = boolean> {
  /**
   * Onde de pression sur le bloc entier, quand elle est activée. Un bloc
   * désactivé ou en lecture seule n'en produit aucune.
   */
  ripple?: boolean;
  /** Contrôle de sélection embarqué. */
  indicator?: ToggleBlockIndicator;
  /** Côté du bloc où se tient l'indicateur. */
  indicatorPosition?: ToggleBlockIndicatorPosition;
  /** Alignement vertical de l'indicateur face au contenu. */
  align?: ToggleBlockAlign;
  /** Garde le contrôle opérable mais le retire de la vue : carte de sélection. */
  hideIndicator?: boolean;
  size?: ToggleBlockSize;
  /** Ligne principale du bloc. */
  label?: string;
  /** Ligne secondaire, sous le libellé. */
  description?: string;
  /**
   * Occupe toute la largeur du parent. Sans lui, un parent flex ou grid
   * dimensionne le bloc à son contenu.
   */
  fluid?: boolean;

  /** Valeur du **modèle**. Renseignée, le bloc est **contrôlé**. */
  value?: T;
  /** Valeur de départ quand le bloc est non contrôlé. */
  defaultValue?: T;
  /** Notifié à chaque sélection, avec la nouvelle valeur du modèle. */
  onValueChange?: (value: T) => void;

  /** Valeur portée par ce bloc en mode `radio` : le modèle la prend quand il est choisi. */
  blockValue?: T;
  /** Valeur émise quand le bloc est choisi, en `checkbox` et `toggle`. */
  trueValue?: T;
  /** Valeur émise quand il est vidé, en `checkbox` et `toggle`. */
  falseValue?: T;

  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  name?: string;
  tabIndex?: number;
  id?: string;
  className?: string;
  /** Nom accessible explicite. À défaut, c'est le corps du bloc qui nomme le contrôle. */
  'aria-label'?: string;
  /** id d'un élément externe qui étiquette le contrôle. */
  'aria-labelledby'?: string;

  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;

  /** Corps libre du bloc, composé avec `label` et `description`. */
  children?: ReactNode;

  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-toggle-block : bloc sélectionnable enveloppant une **instance** de `ui-checkbox`,
 * `ui-radio` ou `ui-toggle`, qui garde son allure et son comportement.
 *
 * Un `<label for>` étiré rend toute la surface activante sans gestionnaire de clic ;
 * le corps nomme le contrôle (`aria-labelledby`), donc tout balisage peut y être
 * projeté. `label` et `description` couvrent le cas courant, les enfants s'y ajoutent.
 */
export function UiToggleBlock<T = boolean>({
  ripple = true,
  indicator = 'checkbox',
  indicatorPosition = 'start',
  align = 'center',
  hideIndicator = false,
  size = 'default',
  label,
  description,
  fluid = false,
  value,
  defaultValue,
  onValueChange,
  blockValue,
  trueValue = true as T,
  falseValue = false as T,
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  name,
  tabIndex,
  id,
  className,
  onFocus,
  onBlur,
  children,
  ref,
  ...rest
}: UiToggleBlockProps<T>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const bodyId = `${inputId}-body`;
  const bodyRef = useRef<HTMLDivElement | null>(null);

  /** Focus au clavier seulement : une pression au pointeur ne doit pas cerner le bloc. */
  const [focusVisible, setFocusVisible] = useState(false);

  const [model, setModel] = useControllableState<T | undefined>({
    value,
    defaultValue,
    onChange: (next) => next !== undefined && onValueChange?.(next),
  });

  const selectedValue = indicator === 'radio' ? (blockValue as T) : trueValue;
  const checked = model === selectedValue;

  // Le corps nomme le contrôle sauf nom explicite : `aria-labelledby` écraserait `aria-label`.
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  const controlLabelledBy = ariaLabelledBy ?? (ariaLabel ? undefined : bodyId);

  const onControlChange = useCallback(
    (next: T) => {
      if (readOnly) return;
      setModel(next);
    },
    [readOnly, setModel],
  );

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocusVisible(event.target.matches(':focus-visible'));
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocusVisible(false);
    onBlur?.(event);
  };

  // Lecture seule : la CSS coupe le pointeur, ceci coupe le clavier (Espace, flèches).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!readOnly) return;
    if (event.key === ' ' || event.key.startsWith('Arrow')) event.preventDefault();
  };

  // Garde-fous d'accessibilité, une fois par instance.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(inputId)) return;
    if (indicator === 'radio' && blockValue === undefined) {
      prevenus.add(inputId);
      console.warn(
        '[ui-toggle-block] `indicator="radio"` exige une `blockValue` : sans elle, tous les blocs du groupe partagent la même identité.',
      );
      return;
    }
    const nomme = ariaLabel || ariaLabelledBy || label || !!bodyRef.current?.textContent?.trim();
    if (!nomme) {
      prevenus.add(inputId);
      console.warn(
        '[ui-toggle-block] Bloc sans nom accessible : renseignez `label`, un contenu projeté, `aria-label` ou `aria-labelledby`.',
      );
    }
  }, [inputId, indicator, blockValue, ariaLabel, ariaLabelledBy, label]);

  const partage = {
    id: inputId,
    name,
    tabIndex,
    disabled,
    required,
    invalid,
    'aria-label': ariaLabel,
    'aria-labelledby': controlLabelledBy,
    onFocus: handleFocus,
    onBlur: handleBlur,
    ref,
  };

  return (
    // Clavier écouté ici : le garde de lecture seule doit voir la touche avant qu'elle agisse.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-ripple={ripple && !disabled && !readOnly ? 'on' : 'off'}
      className={cx(
        'ui-toggle-block',
        size !== 'default' && `_${size}`,
        fluid && '_fluid',
        indicatorPosition === 'end' && '_indicator-end',
        align === 'start' && '_align-start',
        hideIndicator && '_hide-indicator',
        checked && '_checked',
        disabled && '_disabled',
        readOnly && '_readonly',
        invalid && '_invalid',
        focusVisible && '_focus-visible',
        className,
      )}
      onKeyDown={onKeyDown}
    >
      {/*
        eslint-disable-next-line jsx-a11y/label-has-associated-control --
        Zone de clic étirée, vide à dessein : le corps nomme le contrôle par
        `aria-labelledby`. Sans `for` en lecture seule.
      */}
      <label className="ui-toggle-block-hit" htmlFor={readOnly ? undefined : inputId} />

      <span className="ui-toggle-block-control">
        {indicator === 'radio' ? (
          <UiRadio<T>
            {...partage}
            value={selectedValue}
            groupValue={model}
            readOnly={readOnly}
            onValueChange={onControlChange}
          />
        ) : indicator === 'toggle' ? (
          <UiToggle<T>
            {...partage}
            // Seul l'interrupteur suit la densité ; case et radio gardent la taille commune.
            size={size === 'small' ? 'small' : 'default'}
            value={model}
            trueValue={trueValue}
            falseValue={falseValue}
            readOnly={readOnly}
            onValueChange={onControlChange}
          />
        ) : (
          <UiCheckbox<T>
            {...partage}
            value={model}
            trueValue={trueValue}
            falseValue={falseValue}
            readOnly={readOnly}
            onValueChange={onControlChange}
          />
        )}
      </span>

      <div ref={bodyRef} className="ui-toggle-block-body" id={bodyId}>
        {label && (
          <span className="ui-toggle-block-label">
            {label}
            {required && (
              <span className="ui-toggle-block-required" aria-hidden="true">
                *
              </span>
            )}
          </span>
        )}
        {description && <span className="ui-toggle-block-description">{description}</span>}
        {children}
      </div>
    </div>
  );
}
