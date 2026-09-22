'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiSeparator } from '../ui-separator';

import './ui-accordion.scss';

/** Identifiant d'un panneau dans un accordéon, comparé à la valeur du conteneur. */
export type UiAccordionValue = string | number;
/** Panneau(x) ouvert(s) : une valeur en mode simple, un tableau en `multiple`, `null` si rien. */
export type UiAccordionActiveValue = UiAccordionValue | UiAccordionValue[] | null;

/** Charge émise quand un panneau s'ouvre ou se ferme. */
export interface UiAccordionChangeEvent {
  /** Valeur du panneau qui vient de s'ouvrir ou de se fermer. */
  value: UiAccordionValue;
  /** L'événement DOM d'origine : clic, touche, ou prise de focus. */
  originalEvent: SyntheticEvent;
}

/** Ce que le conteneur partage avec ses panneaux. */
interface UiAccordionApi {
  separator: boolean;
  control: boolean;
  expandIcon: string;
  collapseIcon: string;
  motion: boolean;
  selectOnFocus: boolean;
  isActive: (value: UiAccordionValue) => boolean;
  toggle: (value: UiAccordionValue, event: SyntheticEvent) => void;
  open: (value: UiAccordionValue, event: SyntheticEvent) => void;
  headerId: (value: UiAccordionValue) => string;
  contentId: (value: UiAccordionValue) => string;
  onHeaderKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const UiAccordionContext = createContext<UiAccordionApi | null>(null);

/**
 * En-têtes navigables du groupe, dans l'ordre du DOM. Les désactivés sont hors
 * jeu, et ceux d'un accordéon imbriqué appartiennent à leur propre groupe : sans
 * ce filtre, les flèches du groupe extérieur emporteraient aussi les siens.
 */
function enabledHeadersIn(root: HTMLElement | null): HTMLButtonElement[] {
  if (!root) return [];
  const headers = root.querySelectorAll<HTMLButtonElement>('.ui-accordion-header:not(:disabled)');
  return [...headers].filter((header) => header.closest('.ui-accordion') === root);
}

// =====================================================================
// UiAccordion : le conteneur, qui possède l'état et les options du groupe.
// =====================================================================

export interface UiAccordionProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange'
> {
  /** Panneau(x) ouvert(s) imposé(s). Renseignée, la valeur est **contrôlée** ; `null` n'ouvre rien. */
  value?: UiAccordionActiveValue;
  defaultValue?: UiAccordionActiveValue;
  onValueChange?: (value: UiAccordionActiveValue) => void;
  /** Notifié à l'ouverture d'un panneau, avec l'événement qui l'a provoquée. */
  onPanelOpen?: (event: UiAccordionChangeEvent) => void;
  /** Notifié à la fermeture d'un panneau, avec l'événement qui l'a provoquée. */
  onPanelClose?: (event: UiAccordionChangeEvent) => void;
  /** Autoriser plusieurs panneaux ouverts à la fois : la valeur devient un tableau. */
  multiple?: boolean;
  /** Ouvrir un panneau dès que son en-tête reçoit le focus. */
  selectOnFocus?: boolean;
  /** Défaut du groupe : rendre le trait sous chaque en-tête. Surchargeable par panneau. */
  separator?: boolean;
  /** Défaut du groupe : rendre le chevron sur chaque en-tête. Surchargeable par panneau. */
  control?: boolean;
  /** Icône d'un panneau replié. */
  expandIcon?: string;
  /** Icône d'un panneau déplié. */
  collapseIcon?: string;
  /** Animer le pliage. Le mouvement réduit gagne toujours. */
  motion?: boolean;
  children?: ReactNode;
}

/**
 * ui-accordion : groupe de panneaux repliables.
 *
 * API de composition : `UiAccordion` porte l'état d'ouverture et les défauts du
 * groupe, chaque `UiAccordionPanel` rend son en-tête et son contenu. Un seul
 * panneau ouvert à la fois, ou plusieurs avec `multiple`.
 */
export function UiAccordion({
  value,
  defaultValue = null,
  onValueChange,
  onPanelOpen,
  onPanelClose,
  multiple = false,
  selectOnFocus = false,
  separator = true,
  control = true,
  expandIcon = 'chevron-down',
  collapseIcon = 'chevron-up',
  motion = true,
  className,
  children,
  ref,
  ...rest
}: UiAccordionProps) {
  const uid = useId();
  const [active, setActive] = useControllableState<UiAccordionActiveValue>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const api = useMemo<UiAccordionApi>(() => {
    const isActive = (v: UiAccordionValue) =>
      multiple ? Array.isArray(active) && active.includes(v) : active === v;

    const setOpen = (v: UiAccordionValue, on: boolean) => {
      if (!multiple) {
        setActive(on ? v : null);
        return;
      }
      const current = Array.isArray(active) ? active : [];
      setActive(on ? [...current, v] : current.filter((item) => item !== v));
    };

    return {
      separator,
      control,
      expandIcon,
      collapseIcon,
      motion,
      selectOnFocus,
      isActive,
      toggle: (v, event) => {
        const wasActive = isActive(v);
        setOpen(v, !wasActive);
        (wasActive ? onPanelClose : onPanelOpen)?.({ value: v, originalEvent: event });
      },
      open: (v, event) => {
        if (isActive(v)) return;
        setOpen(v, true);
        onPanelOpen?.({ value: v, originalEvent: event });
      },
      headerId: (v) => `${uid}-header-${v}`,
      contentId: (v) => `${uid}-content-${v}`,
      // Le clavier se branche sur les EN-TÊTES et non sur le conteneur : un
      // élément porteur d'un `onKeyDown` devrait être focalisable pour
      // satisfaire `jsx-a11y`, ce que le groupe n'est pas. L'ordre des en-têtes
      // est de toute façon une propriété du DOM, pas de l'état React.
      onHeaderKeyDown: (event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        const headers = enabledHeadersIn(rootRef.current);
        const from = headers.indexOf(event.currentTarget);
        if (from === -1) return;

        event.preventDefault();
        const last = headers.length - 1;
        let position: number;
        if (event.key === 'ArrowDown') position = from === last ? 0 : from + 1;
        else if (event.key === 'ArrowUp') position = from === 0 ? last : from - 1;
        else if (event.key === 'Home') position = 0;
        else position = last;

        headers[position]?.focus();
      },
    };
  }, [
    active,
    setActive,
    multiple,
    selectOnFocus,
    separator,
    control,
    expandIcon,
    collapseIcon,
    motion,
    onPanelOpen,
    onPanelClose,
    uid,
  ]);

  return (
    <div {...rest} ref={attach} className={cx('ui-accordion', className)}>
      <UiAccordionContext.Provider value={api}>{children}</UiAccordionContext.Provider>
    </div>
  );
}

// =====================================================================
// UiAccordionPanel : une section repliable du groupe.
// =====================================================================

export interface UiAccordionPanelProps extends ComponentPropsWithRef<'div'> {
  /** Identifiant de ce panneau, comparé à la valeur du conteneur. */
  value: UiAccordionValue;
  /** En-tête du panneau : un titre texte, ou n'importe quel nœud. */
  header?: ReactNode;
  /** Panneau non repliable, et sauté par la navigation au clavier. */
  disabled?: boolean;
  /** Surcharge locale du trait sous l'en-tête. Sinon, le défaut du groupe. */
  separator?: boolean;
  /** Surcharge locale du chevron. Sinon, le défaut du groupe. */
  control?: boolean;
  children?: ReactNode;
}

/**
 * ui-accordion-panel : une section repliable d'un `UiAccordion`.
 *
 * L'en-tête entier est un `<button>` natif, motif accordéon de l'APG : la cible
 * de clic est large et le chevron n'est qu'une affordance. Le corps reste monté
 * mais devient `inert` et de hauteur nulle une fois replié, ce qui conserve
 * l'état d'un formulaire sans l'exposer aux technologies d'assistance.
 */
export function UiAccordionPanel({
  value,
  header,
  disabled = false,
  separator,
  control,
  className,
  children,
  ...rest
}: UiAccordionPanelProps) {
  const api = useContext(UiAccordionContext);
  if (!api)
    throw new Error('[ui-accordion] `UiAccordionPanel` doit être rendu dans un `<UiAccordion>`.');

  const active = api.isActive(value);
  const headerId = api.headerId(value);
  const contentId = api.contentId(value);
  const showSeparator = separator ?? api.separator;
  const showControl = control ?? api.control;

  return (
    <div
      {...rest}
      className={cx('ui-accordion-panel', active && '_active', disabled && '_disabled', className)}
    >
      <button
        type="button"
        className="ui-accordion-header"
        id={headerId}
        disabled={disabled}
        aria-expanded={active}
        aria-controls={contentId}
        onClick={(event) => api.toggle(value, event)}
        onFocus={(event) => {
          if (api.selectOnFocus) api.open(value, event);
        }}
        onKeyDown={api.onHeaderKeyDown}
      >
        <span className="ui-accordion-header-slot">{header}</span>
        {showControl && (
          <span className="ui-accordion-header-control" aria-hidden="true">
            <UiIcon name={active ? api.collapseIcon : api.expandIcon} size="default" />
          </span>
        )}
      </button>

      {showSeparator && <UiSeparator className="ui-accordion-separator" size="small" />}

      <div
        className={cx('ui-accordion-content', active && '_open', !api.motion && '_no-motion')}
        role="region"
        id={contentId}
        aria-labelledby={headerId}
        inert={!active}
      >
        <div className="ui-accordion-content-inner">
          <div className="ui-accordion-content-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
