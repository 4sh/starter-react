'use client';

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useId,
  useState,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-stepper.scss';

/** Identifiant d'un couple étape / panneau, comparé à la valeur du conteneur. */
export type UiStepValue = string | number;
export type UiStepperOrientation = 'horizontal' | 'vertical';
/** Avancement d'une étape, déduit de l'étape courante. */
export type UiStepState = 'upcoming' | 'active' | 'completed';

/** Charge émise quand l'étape courante change. */
export interface UiStepperChangeEvent {
  /** Valeur de l'étape devenue courante. */
  value: UiStepValue;
  /** L'événement DOM d'origine, quand c'est l'utilisateur qui a agi. */
  originalEvent?: SyntheticEvent;
}

/** Ce que le conteneur partage avec ses étapes et ses panneaux. */
interface UiStepperApi {
  orientation: UiStepperOrientation;
  linear: boolean;
  lazy: boolean;
  motion: boolean;
  completedIcon: string | undefined;
  tabIndex: number;
  /** Valeurs des étapes, dans l'ordre de la progression. */
  order: UiStepValue[];
  value: UiStepValue | undefined;
  stepState: (value: UiStepValue | undefined) => UiStepState;
  stepNumber: (value: UiStepValue | undefined) => number;
  isLast: (value: UiStepValue | undefined) => boolean;
  stepId: (value: UiStepValue | undefined) => string;
  panelId: (value: UiStepValue | undefined) => string | undefined;
  activate: (value: UiStepValue, event?: SyntheticEvent) => void;
}

const UiStepperContext = createContext<UiStepperApi | null>(null);
/** La valeur qu'un `UiStepItem` prête à l'étape et au panneau qu'il enveloppe. */
const UiStepItemContext = createContext<UiStepValue | undefined>(undefined);

function useStepper(part: string): UiStepperApi {
  const api = useContext(UiStepperContext);
  if (!api) throw new Error(`[ui-stepper] \`${part}\` doit être rendu dans un \`<UiStepper>\`.`);
  return api;
}

/**
 * Ce qu'un contenu du stepper peut piloter : la progression elle-même.
 *
 * C'est le pendant React des méthodes `next()` et `prev()` de la version
 * Angular, qui s'appelaient sur une référence de gabarit. Un bouton « Suivant »
 * vit dans un panneau : il lit donc le contexte, plutôt qu'une poignée que le
 * parent devrait lui faire descendre.
 */
export interface UiStepperControls {
  value: UiStepValue | undefined;
  next: () => void;
  prev: () => void;
  goTo: (value: UiStepValue) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function useUiStepper(): UiStepperControls {
  const api = useStepper('useUiStepper');
  const index = api.order.indexOf(api.value as UiStepValue);

  return {
    value: api.value,
    next: () => {
      const target = api.order[index + 1];
      if (target !== undefined) api.activate(target);
    },
    prev: () => {
      if (index > 0) api.activate(api.order[index - 1]!);
    },
    goTo: (value) => api.activate(value),
    isFirst: index <= 0,
    isLast: index === api.order.length - 1,
  };
}

/**
 * Les valeurs des étapes, dans l'ordre, lues dans les `children`.
 *
 * Là où Angular interroge sa projection (`contentChildren`), React a ses enfants
 * sous la main comme une **valeur** : la séquence est une fonction pure des
 * `children`, donc ni état ni effet, et elle est juste dès le premier rendu. Un
 * `UiStepItem` porte la valeur de l'étape et du panneau qu'il enveloppe, d'où
 * l'arrêt de la descente à son niveau.
 */
function collectOrder(children: ReactNode, out: UiStepValue[] = []): UiStepValue[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: UiStepValue; children?: ReactNode };
    if ((child.type === UiStep || child.type === UiStepItem) && props.value !== undefined) {
      out.push(props.value);
      return;
    }
    collectOrder(props.children, out);
  });
  return out;
}

/** Y a-t-il au moins un panneau dans l'arbre rendu ? */
function hasPanelIn(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) return;
    if (child.type === UiStepPanel) {
      found = true;
      return;
    }
    found = hasPanelIn((child.props as { children?: ReactNode }).children);
  });
  return found;
}

// =====================================================================
// UiStepper : le conteneur, qui possède l'étape courante et la progression.
// =====================================================================

export interface UiStepperProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange'
> {
  /** Étape courante. Renseignée, le stepper est **contrôlé**. */
  value?: UiStepValue;
  defaultValue?: UiStepValue;
  onValueChange?: (value: UiStepValue) => void;
  /** Notifié au changement d'étape, avec l'événement qui l'a provoqué. */
  onStepChange?: (event: UiStepperChangeEvent) => void;
  /** Axe de disposition : la bande au-dessus des panneaux, ou l'un sous l'autre. */
  orientation?: UiStepperOrientation;
  /** Désactive les étapes situées après la courante : on ne saute pas en avant. */
  linear?: boolean;
  /** Défaut du groupe : ne rendre le contenu d'un panneau qu'à sa première activation. */
  lazy?: boolean;
  /** Animer l'apparition du panneau. Le mouvement réduit gagne toujours. */
  motion?: boolean;
  /** Icône du marqueur des étapes franchies. À défaut, leur numéro. */
  completedIcon?: string;
  /** Nom accessible du conteneur, utilisé en disposition verticale. */
  'aria-label'?: string;
  /** `tabindex` posé sur chaque en-tête d'étape atteignable. */
  tabIndex?: number;
  children?: ReactNode;
}

/**
 * ui-stepper : conteneur qui guide dans une progression numérotée.
 *
 * API de composition calquée sur `ui-tabs`. En **horizontal**, une bande
 * `UiStepList` d'en-têtes au-dessus d'un `UiStepPanels` ; en **vertical**, chaque
 * `UiStepItem` enveloppe son en-tête et son panneau, qui paraît juste dessous.
 *
 * La sémantique ARIA suit la disposition : onglets en horizontal, accordéon en
 * vertical, un onglet qui contiendrait son propre panneau étant invalide.
 */
export function UiStepper({
  value,
  defaultValue,
  onValueChange,
  onStepChange,
  orientation = 'horizontal',
  linear = false,
  lazy = false,
  motion = true,
  completedIcon,
  tabIndex = 0,
  className,
  children,
  ...rest
}: UiStepperProps) {
  const uid = useId();
  const ariaLabel = rest['aria-label'];
  delete rest['aria-label'];

  const [active, setActive] = useControllableState<UiStepValue | undefined>({
    value,
    defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });

  // Reconstruit à chaque rendu, et sans `useMemo` : la séquence se déduit des
  // `children`, qui sont un tableau neuf à chaque fois de toute façon.
  const order = collectOrder(children);
  const hasPanels = hasPanelIn(children);
  const activeIndex = order.indexOf(active as UiStepValue);

  const api: UiStepperApi = {
    orientation,
    linear,
    lazy,
    motion,
    completedIcon,
    tabIndex,
    order,
    value: active,
    stepState: (candidate) => {
      const index = order.indexOf(candidate as UiStepValue);
      if (index === -1 || activeIndex === -1) return 'upcoming';
      if (index < activeIndex) return 'completed';
      if (index === activeIndex) return 'active';
      return 'upcoming';
    },
    stepNumber: (candidate) => order.indexOf(candidate as UiStepValue) + 1,
    isLast: (candidate) => order.length > 0 && order[order.length - 1] === candidate,
    stepId: (candidate) => `${uid}-step-${candidate}`,
    // Un `aria-controls` qui ne résout rien est refusé par axe, et un stepper
    // sans panneaux est un usage prévu : la bande seule fait un indicateur
    // d'avancement.
    panelId: (candidate) => (hasPanels ? `${uid}-panel-${candidate}` : undefined),
    activate: (candidate, event) => {
      if (active === candidate) return;
      setActive(candidate);
      onStepChange?.({ value: candidate, originalEvent: event });
    },
  };

  return (
    <div
      {...rest}
      className={cx('ui-stepper', orientation === 'vertical' && '_vertical', className)}
      // En vertical chaque panneau est imbriqué sous son en-tête, donc le
      // conteneur ne peut pas être une bande d'onglets : un onglet contenant son
      // propre panneau est de l'ARIA invalide. `group` porte le même nom sans
      // rien promettre de plus.
      role={orientation === 'vertical' ? 'group' : undefined}
      aria-label={orientation === 'vertical' ? ariaLabel || undefined : undefined}
    >
      <UiStepperContext.Provider value={api}>{children}</UiStepperContext.Provider>
    </div>
  );
}

// =====================================================================
// UiStepList / UiStepPanels : les deux enveloppes de la disposition horizontale.
// =====================================================================

export interface UiStepListProps extends ComponentPropsWithRef<'div'> {
  /** Nom accessible de la bande d'étapes. */
  'aria-label'?: string;
  children?: ReactNode;
}

/** ui-step-list : la bande horizontale des en-têtes d'étape. */
export function UiStepList({ className, children, ...rest }: UiStepListProps) {
  return (
    <div
      {...rest}
      className={cx('ui-step-list', className)}
      role="tablist"
      aria-orientation="horizontal"
    >
      {children}
    </div>
  );
}

export interface UiStepPanelsProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

/** ui-step-panels : l'enveloppe des panneaux, sous la bande. */
export function UiStepPanels({ className, children, ...rest }: UiStepPanelsProps) {
  return (
    <div {...rest} className={cx('ui-step-panels', className)}>
      {children}
    </div>
  );
}

// =====================================================================
// UiStepItem : l'enveloppe verticale d'une étape et de son panneau.
// =====================================================================

export interface UiStepItemProps extends Omit<ComponentPropsWithRef<'div'>, 'value'> {
  /** Identifiant partagé par l'étape et le panneau qu'il enveloppe. */
  value: UiStepValue;
  children?: ReactNode;
}

/**
 * ui-step-item : couple étape plus panneau de la disposition verticale.
 *
 * Il porte la valeur pour les deux, ce qui garde le balisage court, et dessine
 * le rail qui relie une étape à la suivante.
 */
export function UiStepItem({ value, className, children, ...rest }: UiStepItemProps) {
  const api = useStepper('UiStepItem');
  const state = api.stepState(value);

  return (
    <div
      {...rest}
      className={cx(
        'ui-step-item',
        state === 'active' && '_active',
        state === 'completed' && '_completed',
        api.isLast(value) && '_last',
        className,
      )}
    >
      <UiStepItemContext.Provider value={value}>{children}</UiStepItemContext.Provider>
    </div>
  );
}

// =====================================================================
// UiStep : un en-tête d'étape.
// =====================================================================

export interface UiStepProps extends Omit<ComponentPropsWithRef<'div'>, 'value'> {
  /** Identifiant de cette étape. Omis dans un `UiStepItem`, qui le prête. */
  value?: UiStepValue;
  /** Étape non activable, et sautée par le clavier. */
  disabled?: boolean;
  /** Icône remplaçant le marqueur numéroté, quel que soit l'état. */
  icon?: string;
  /** Nom accessible. À défaut, le titre projeté. */
  'aria-label'?: string;
  /** Titre de l'étape. */
  children?: ReactNode;
}

/**
 * ui-step : un en-tête d'étape.
 *
 * Un `<button>` natif avec son marqueur numéroté : chaque en-tête atteignable
 * est un arrêt de tabulation naturel, donc `Tab` les parcourt et `Entrée` ou
 * `Espace` activent celui qui a le focus, sans clavier sur mesure.
 */
export function UiStep({
  value: ownValue,
  disabled = false,
  icon,
  className,
  children,
  onClick,
  ...rest
}: UiStepProps) {
  const api = useStepper('UiStep');
  const borrowed = useContext(UiStepItemContext);
  const value = ownValue ?? borrowed;
  const ariaLabel = rest['aria-label'];
  delete rest['aria-label'];

  const state = api.stepState(value);
  const vertical = api.orientation === 'vertical';
  // En mode linéaire, une étape encore à venir n'est pas atteignable : on ne
  // saute pas en avant.
  const isDisabled = disabled || (api.linear && state === 'upcoming');
  const showSeparator = !vertical && !api.isLast(value);
  const markerIcon = icon ?? (state === 'completed' ? api.completedIcon : undefined);

  return (
    <div
      {...rest}
      className={cx(
        'ui-step',
        state === 'active' && '_active',
        state === 'completed' && '_completed',
        vertical && '_vertical',
        isDisabled && '_disabled',
        api.isLast(value) && '_last',
        className,
      )}
    >
      <button
        type="button"
        className="ui-step-header"
        id={api.stepId(value)}
        // Horizontal : un vrai onglet de la bande. Vertical : le motif accordéon,
        // le panneau étant imbriqué sous son en-tête.
        role={vertical ? undefined : 'tab'}
        aria-controls={api.panelId(value)}
        aria-selected={vertical ? undefined : state === 'active'}
        aria-expanded={vertical ? state === 'active' : undefined}
        aria-current={state === 'active' ? 'step' : undefined}
        aria-label={ariaLabel}
        disabled={isDisabled}
        tabIndex={isDisabled ? undefined : api.tabIndex}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          onClick?.(event as unknown as MouseEvent<HTMLDivElement>);
          if (isDisabled || value === undefined) return;
          api.activate(value, event);
        }}
      >
        <span className="ui-step-marker" aria-hidden="true">
          {markerIcon ? <UiIcon name={markerIcon} size="default" /> : api.stepNumber(value)}
        </span>
        <span className="ui-step-title">{children}</span>
      </button>

      {showSeparator && (
        <span
          className={cx('ui-step-separator', state === 'completed' && '_completed')}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// =====================================================================
// UiStepPanel : la zone de contenu d'une étape.
// =====================================================================

export interface UiStepPanelProps extends Omit<ComponentPropsWithRef<'div'>, 'value' | 'hidden'> {
  /** Identifiant de ce panneau. Omis dans un `UiStepItem`, qui le prête. */
  value?: UiStepValue;
  /** Ne rendre le contenu qu'à la première activation. Gagne sur le défaut du groupe. */
  lazy?: boolean;
  children?: ReactNode;
}

/**
 * ui-step-panel : la zone de contenu liée à l'étape de même `value`.
 *
 * Le panneau reste monté mais devient `inert` quand il n'est pas courant, donc
 * l'état d'un formulaire survit au passage d'une étape à l'autre. En `lazy`, son
 * contenu n'est rendu qu'à la première activation.
 */
export function UiStepPanel({
  value: ownValue,
  lazy,
  className,
  children,
  ...rest
}: UiStepPanelProps) {
  const api = useStepper('UiStepPanel');
  const borrowed = useContext(UiStepItemContext);
  const value = ownValue ?? borrowed;

  const active = value !== undefined && api.value === value;
  const isLazy = lazy ?? api.lazy;

  // Colle une fois le panneau activé : paresseux ne veut pas dire démonté à
  // chaque sortie. L'ajustement se fait PENDANT le rendu, là où un effet ferait
  // clignoter le panneau vide.
  const [seen, setSeen] = useState(active);
  if (active && !seen) setSeen(true);

  return (
    <div
      {...rest}
      className={cx('ui-step-panel', active && '_active', className)}
      // Horizontal : un vrai panneau d'onglet. Vertical : une région, comme
      // `ui-accordion-panel`, un panneau d'onglet sans bande étant invalide.
      role={api.orientation === 'vertical' ? 'region' : 'tabpanel'}
      id={api.panelId(value)}
      aria-labelledby={api.stepId(value)}
      tabIndex={active ? 0 : undefined}
      inert={!active}
    >
      <div className={cx('ui-step-panel-collapse', active && '_open', !api.motion && '_no-motion')}>
        <div className="ui-step-panel-inner">
          <div className="ui-step-panel-body">{(!isLazy || active || seen) && children}</div>
        </div>
      </div>
    </div>
  );
}
