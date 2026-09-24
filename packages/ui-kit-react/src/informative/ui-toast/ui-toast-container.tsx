'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { useUiMotion, type UiMotionPreset } from '../../core/motion';
import { cx } from '../../core/utils';

import { UiToast } from './ui-toast';
import { uiToast, useUiToasts } from './ui-toast-store';
import type { UiToastId, UiToastMessage, UiToastPosition } from './ui-toast.types';

/** Préréglage d'entrée et de sortie qui convient à chaque bord d'ancrage. */
const MOTION_BY_POSITION: Record<UiToastPosition, UiMotionPreset> = {
  'top-left': 'slide-down',
  'top-center': 'slide-down',
  'top-right': 'slide-down',
  'bottom-left': 'slide-up',
  'bottom-center': 'slide-up',
  'bottom-right': 'slide-up',
  center: 'zoom',
};

/** Ce que reçoit `renderToast` pour rendre une carte à sa façon. */
export interface UiToastRenderContext {
  /** Ferme ce message, comme le ferait son bouton de fermeture. */
  close: () => void;
}

/** Un message rendu, et s'il est en train d'entrer ou de sortir. */
interface ToastEntry {
  message: UiToastMessage;
  open: boolean;
}

/**
 * Réconcilie la liste rendue avec le magasin. Un message retiré reste rendu, fermé,
 * le temps de sa sortie, et à sa place : sinon la pile sauterait pendant l'animation.
 */
function merge(previous: ToastEntry[], visible: readonly UiToastMessage[]): ToastEntry[] {
  const live = new Set(visible.map((message) => message.id));
  const next: ToastEntry[] = visible.map((message) => ({ message, open: true }));
  previous.forEach((entry, index) => {
    if (live.has(entry.message.id)) return;
    next.splice(Math.min(index, next.length), 0, { message: entry.message, open: false });
  });
  return next;
}

export interface UiToastContainerProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** N'affiche que les messages de ce canal. Omis, la pile prend ceux qui n'en ont pas. */
  channel?: string;
  /** Bord auquel la pile est épinglée. */
  position?: UiToastPosition;
  /** Délai de disparition par défaut, en ms. Le `life` d'un message gagne. */
  life?: number;
  /** Rend les cartes en bannières, sur toute la largeur de la région. */
  expanded?: boolean;
  /** Préréglage de mouvement. À défaut, celui qui va avec la position. */
  motion?: UiMotionPreset;
  /** Coupe l'entrée et la sortie de cette pile. */
  motionDisabled?: boolean;
  /** Ancre la pile dans le plus proche ancêtre positionné au lieu du calque supérieur. */
  contained?: boolean;
  /** Rend le corps de la carte à la place de `title` et `text`. */
  renderToast?: (message: UiToastMessage, context: UiToastRenderContext) => ReactNode;
  /** N'affiche que les N derniers messages ; les autres attendent leur tour. `0` ne plafonne pas. */
  stackVisibleLimit?: number;
  /** Écart entre deux cartes, en px. À défaut, le jeton d'espacement. */
  stackGap?: number;
  /** Ignore un message dont le niveau, le titre et le texte répètent un message vivant. */
  preventDuplicates?: boolean;
}

/**
 * ui-toast-container : la pile flottante qui rend les messages du magasin.
 *
 * Une par application, près de la racine. Elle lit `uiToast`, anime l'arrivée et
 * le départ par le système de motion, et fait disparaître les messages non
 * `sticky` au bout de `life`, compte à rebours suspendu tant que la carte est
 * survolée ou tient le focus.
 */
export function UiToastContainer({
  channel,
  position = 'top-right',
  life = 4000,
  expanded = false,
  motion,
  motionDisabled = false,
  contained = false,
  renderToast,
  stackVisibleLimit = 0,
  stackGap,
  preventDuplicates = false,
  className,
  style,
  ref,
  ...rest
}: UiToastContainerProps) {
  const live = useUiToasts(channel);

  // Le doublon est retiré du MAGASIN, et non filtré au rendu : filtré, il y
  // resterait vivant sans carte, donc sans compte à rebours pour l'en sortir.
  useEffect(() => {
    if (!preventDuplicates) return;
    const seen = new Set<string>();
    for (const message of live) {
      const signature = `${message.level ?? 'default'}|${message.title ?? ''}|${message.text ?? ''}`;
      if (seen.has(signature)) uiToast.remove(message.id!);
      else seen.add(signature);
    }
  }, [preventDuplicates, live]);

  const visible = useMemo(
    () => (stackVisibleLimit > 0 ? live.slice(-stackVisibleLimit) : live),
    [live, stackVisibleLimit],
  );

  // Ajusté PENDANT le rendu : un message qui vient de quitter le magasin doit
  // rester rendu le temps de sa sortie, et un effet le démonterait d'abord.
  const [entries, setEntries] = useState<ToastEntry[]>(() =>
    visible.map((message) => ({ message, open: true })),
  );
  // Le repère est un état et non une ref : React interdit de lire une ref au fil du rendu.
  const [lastVisible, setLastVisible] = useState(visible);
  if (lastVisible !== visible) {
    setLastVisible(visible);
    setEntries((previous) => merge(previous, visible));
  }

  const forget = useCallback((id: UiToastId) => {
    setEntries((list) => list.filter((entry) => entry.message.id !== id));
  }, []);

  const regionRef = useRef<HTMLDivElement | null>(null);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      regionRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Calque supérieur, seul à passer devant un `<dialog>` : la pile s'y remontre à
  // chaque nouveau message, le calque empilant dans l'ordre d'affichage.
  const shown = useRef(new Set<UiToastId>());
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region || contained) return;
    const arrived = live.some((message) => !shown.current.has(message.id!));
    shown.current = new Set(live.map((message) => message.id!));
    if (!arrived) return;
    if (region.matches(':popover-open')) region.hidePopover();
    region.showPopover();
  }, [live, contained]);

  const preset = motion ?? MOTION_BY_POSITION[position];

  return (
    <div
      {...rest}
      ref={attach}
      // `manual` et non `auto` : une pile de notifications ne se ferme pas au
      // clic à côté, et ne prend jamais le focus.
      popover={contained ? undefined : 'manual'}
      className={cx(
        'ui-toast-region',
        `_${position}`,
        contained && '_contained',
        expanded && '_expanded',
        position.startsWith('bottom') && '_reverse',
        className,
      )}
      style={stackGap === undefined ? style : { ...style, gap: stackGap }}
    >
      {entries.map((entry) => (
        <ToastItem
          key={entry.message.id}
          message={entry.message}
          open={entry.open}
          life={life}
          expanded={expanded}
          preset={preset}
          motionDisabled={motionDisabled}
          renderToast={renderToast}
          onExited={forget}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  message: UiToastMessage;
  open: boolean;
  life: number;
  expanded: boolean;
  preset: UiMotionPreset;
  motionDisabled: boolean;
  renderToast?: (message: UiToastMessage, context: UiToastRenderContext) => ReactNode;
  onExited: (id: UiToastId) => void;
}

/**
 * Une carte de la pile. Composant à part : le crochet de mouvement se règle par
 * élément, et le compte à rebours ne démarre qu'à l'apparition de la carte.
 */
function ToastItem({
  message,
  open,
  life,
  expanded,
  preset,
  motionDisabled,
  renderToast,
  onExited,
}: ToastItemProps) {
  const id = message.id!;
  const { present, ref, className, style } = useUiMotion(open, {
    preset,
    disabled: motionDisabled,
    onExited: () => onExited(id),
  });

  const [paused, setPaused] = useState(false);
  const delay = message.life ?? life;
  const remaining = useRef(delay);

  const dismiss = useCallback(() => uiToast.remove(id), [id]);

  // Le nettoyage met en banque le temps écoulé : la pause rejoue l'effet, la reprise
  // repart du reste. `setTimeout` et non rAF, qui s'arrête dans un onglet en arrière-plan.
  useEffect(() => {
    if (!open || message.sticky || delay <= 0 || paused) return;
    const startedAt = Date.now();
    const handle = setTimeout(dismiss, remaining.current);
    return () => {
      clearTimeout(handle);
      remaining.current = Math.max(remaining.current - (Date.now() - startedAt), 0);
    };
  }, [open, message.sticky, delay, paused, dismiss]);

  if (!present) return null;

  return (
    <div ref={ref} className={cx('ui-toast-region-item', className)} style={style}>
      <UiToast
        // Pause branchée sur la carte, pas sur la bande qui la porte : la bande fait
        // toute la largeur de la région, la carte seulement celle de son contenu.
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        level={message.level ?? 'default'}
        subLevel={message.subLevel ?? 'high'}
        title={renderToast ? undefined : message.title}
        text={renderToast ? undefined : message.text}
        icon={message.icon ?? true}
        closable={message.closable ?? true}
        expanded={expanded}
        className={message.className}
        onClose={dismiss}
      >
        {renderToast?.(message, { close: dismiss })}
      </UiToast>
    </div>
  );
}
