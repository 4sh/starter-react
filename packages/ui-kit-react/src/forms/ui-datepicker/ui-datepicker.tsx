import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiButton } from '../../actions/ui-button';
import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import {
  addDays,
  addMonths,
  autoFormatSegments,
  buildMaskSlots,
  caretForMask,
  extractMaskData,
  finalizeParsed,
  firstOfMonth,
  isSameDay,
  normalizeDateInput,
  parseIsoDate,
  parseIsoDateTime,
  startOfDay,
  toIsoDate,
  toIsoDateTime,
  useControllableState,
  useUiField,
  type MaskBounds,
  type MaskSlot,
  type UiFieldSharedProps,
} from '../../core/forms';
import { useCloseOnNavigation, useUiDismiss, useUiPosition } from '../../core/overlay';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';

import './ui-datepicker.scss';

export type DatepickerHourFormat = '12' | '24';
/** Granularite de base, et niveaux de forage du panneau. */
export type DatepickerView = 'date' | 'month' | 'year';
/** Quantite de selection. */
export type DatepickerSelectionMode = 'single' | 'multiple' | 'range';

/**
 * Forme de la valeur emise.
 *
 * `'date'` colle a un DTO passe par une couche de transformation : la valeur
 * reste une `Date` de bout en bout, ramenee a minuit quand aucune heure n'est
 * affichee. `'iso'` emet des chaines `"yyyy-MM-dd"`, pour un consommateur qui
 * lit et ecrit directement contre un `LocalDate` cote serveur.
 *
 * **Obligatoire, sans defaut** : le consommateur doit choisir celle qui
 * correspond au type de son modele, plutot que d'heriter d'un defaut muet qui
 * pourrait ne pas y correspondre.
 */
export type DatepickerValueType = 'date' | 'iso';

/**
 * Valeur du modele. L'entree accepte `Date` **ou** chaine ISO indifferemment
 * (detecte, melangeable dans un tableau `multiple`/`range`) : ce que le
 * consommateur a deja sous la main. Ce qui est **emis** suit strictement
 * {@link DatepickerValueType} : toujours `Date` en `'date'`, toujours `string`
 * en `'iso'`, jamais un melange muet, pour que le type du modele appelant reste
 * previsible dans les deux modes.
 */
export type DatepickerValue = Date | Date[] | string | string[] | null;

/** Representation interne : la seule forme que voie la logique de calendrier. */
type DatepickerDateValue = Date | Date[] | null;

/** Une cellule jour de la grille. Aussi le contexte de `renderDay`. */
export interface DatepickerDay {
  date: Date;
  day: number;
  month: number;
  year: number;
  otherMonth: boolean;
  today: boolean;
  selected: boolean;
  disabled: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
  ts: number;
  /** Date complete, formatee selon la locale : le nom accessible de la cellule. */
  ariaLabel: string;
}

/** Une cellule du selecteur de mois. */
export interface DatepickerMonthCell {
  index: number;
  label: string;
  selected: boolean;
  disabled: boolean;
}

/** Une cellule du selecteur d'annee. */
export interface DatepickerYearCell {
  year: number;
  selected: boolean;
  disabled: boolean;
}

/** Un panneau de mois rendu (`numberOfMonths`). */
export interface DatepickerMonthPanel {
  monthDate: Date;
  label: string;
  weeks: DatepickerDay[][];
  showPrev: boolean;
  showNext: boolean;
}

/** Contexte passe a `renderButtonBar`. */
export interface DatepickerButtonBarContext {
  today: () => void;
  clear: () => void;
}

/**
 * Separateur de `range` **tape** : placeholder, masque vif, et decoupage. Un
 * trait d'union simple, distinct du tiret demi-cadratin AFFICHE ci-dessous.
 * Reutiliser celui-ci pour l'affichage changeait en silence l'allure de tous les
 * consommateurs qui ne tapent pas.
 */
const RANGE_SEPARATOR = ' - ';
/** Separateur de `range` affiche, une fois la plage validee. */
const RANGE_DISPLAY_SEPARATOR = ' – ';
/** Separateur de `multiple`, tape et affiche : un seul pour les deux. */
const MULTIPLE_SEPARATOR = ', ';

/** Un champ d'une date numerique, dans l'ordre ou le format resolu l'ecrit. */
type DateField = 'day' | 'month' | 'year';

/**
 * Date temoin dont derivent le placeholder automatique et la sonde d'ordre des
 * champs (22 novembre 2023) : jour, mois et annee sont deux a deux distincts,
 * donc chacun est identifiable dans la sortie d'un formateur. Une instance
 * fraiche a chaque appel : un `dateFormat` du consommateur la recoit, et une
 * instance partagee pourrait etre mutee sur place.
 */
function probeDate(): Date {
  return new Date(2023, 10, 22);
}

/** Premier index ou l'un de `tokens` apparait dans `text` (`-1` sinon). */
function firstIndexOf(text: string, tokens: readonly string[]): number {
  for (const token of tokens) {
    const i = text.indexOf(token);
    if (i !== -1) return i;
  }
  return -1;
}

/** Decoupe une liste plate en lignes de `size` (les grilles ont besoin de `role="row"`). */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Une annee sur deux chiffres part dans les annees 2000. */
function normalizeYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

export interface UiDatepickerProps extends UiFieldSharedProps {
  /** Valeur controlee. */
  value?: DatepickerValue;
  /** Valeur initiale en mode non controle. */
  defaultValue?: DatepickerValue;
  /** Emis a chaque changement de valeur (selection, heure, effacement). */
  onValueChange?: (value: DatepickerValue) => void;

  /**
   * Forme de la valeur emise. **Obligatoire, sans defaut** : l'entree accepte
   * toujours les deux formes, cette prop ne gouverne que ce qui sort.
   */
  valueType: DatepickerValueType;

  /** Texte indicatif du declencheur quand rien n'est selectionne. */
  placeholder?: string;
  /** Icone FontAwesome du bouton d'ouverture. */
  icon?: string;
  /** Afficher le bouton d'ouverture du calendrier. */
  showIcon?: boolean;
  /** Nom accessible du bouton d'ouverture. */
  iconAriaLabel?: string;
  /**
   * Afficher une croix d'effacement quand une valeur est posee. **Defaut
   * `true`**, mais elle ne prend effet que si `showIcon` est `false` : la
   * bascule calendrier gagne sinon toujours l'unique emplacement d'icone du
   * champ, pour que le panneau reste atteignable au clic une fois une valeur
   * choisie. Avec `showIcon` a son propre defaut, l'effacement passe par le
   * clavier (`allowInput`, aussi `true` par defaut) : selectionner le texte et
   * le supprimer.
   */
  showClear?: boolean;

  /** Quantite de selection. */
  selectionMode?: DatepickerSelectionMode;
  /** Granularite de base : `date`, `month` (MonthPicker) ou `year` (YearPicker). */
  view?: DatepickerView;
  /** Nombre de panneaux de mois cote a cote (vue jour seulement). */
  numberOfMonths?: number;

  /** Premiere date selectionnable, incluse. `Date` ou ISO `"yyyy-MM-dd"`. */
  minDate?: Date | string | null;
  /** Derniere date selectionnable, incluse. */
  maxDate?: Date | string | null;
  /** Dates a desactiver une a une. `Date` ou ISO, melangeables. */
  disabledDates?: (Date | string)[];
  /** Jours de semaine a desactiver (0 = dimanche ... 6 = samedi). */
  disabledDays?: number[];

  /** Premier jour de la semaine (0 = dimanche ... 6 = samedi). Lundi par defaut. */
  firstDayOfWeek?: number;
  /** Locale BCP-47 des noms et du formatage par defaut. */
  locale?: string;
  /**
   * Formateur d'affichage d'une date, qui remplace le format `Intl` par defaut.
   * Sert aussi, tel quel, de formateur d'heure en mode `timeOnly`.
   *
   * Avec `allowInput` et sans `parseDate`, le texte tape est relu dans l'ordre
   * jour/mois/annee que **ce** formateur ecrit (sonde depuis sa propre sortie,
   * quelle que soit la locale qu'il utilise en interne), et non celui de la
   * locale resolue : saisie et affichage sont donc toujours d'accord. Un format
   * non numerique ne peut pas etre sonde : l'accompagner d'un `parseDate`.
   */
  dateFormat?: (date: Date) => string;

  /**
   * Autoriser la saisie de la date au clavier. **Defaut `true`** : une grille
   * seule impose a un lecteur d'ecran de traverser une trentaine de cellules
   * quand taper la date est bien plus rapide. Le texte est lu au flou ou a
   * `Entree` ; une valeur illisible revient a la precedente.
   *
   * `single` a l'experience complete : masque auto-`/` vif pendant la
   * construction d'une date depuis un champ vide, texte libre ensuite. « Ensuite »
   * couvre deux cas : une valeur existe deja, ou l'edition se fait **a
   * l'interieur** du texte plutot qu'a sa queue. Corriger un segment sur place
   * ne decale jamais ce qui suit.
   *
   * `range` et `multiple` sont tapables aussi, mais toujours en texte simple :
   * `"jj/mm/aaaa - jj/mm/aaaa"` pour `range` (exactement deux dates, remises
   * dans l'ordre si tapees a l'envers), `"jj/mm/aaaa, jj/mm/aaaa, ..."` pour
   * `multiple` (n'importe quel nombre, doublons fondus).
   *
   * Un champ tapable est d'abord un champ texte : **un clic dedans n'ouvre plus
   * le panneau**. L'icone, `Bas` et le clavier s'en chargent. `allowInput`
   * a `false` (ou `readOnly`, ou `timeOnly`) rend le clic ouvrant, le champ
   * etant alors la seule affordance ; `showIcon` a `false` aussi, faute d'icone
   * a cliquer.
   *
   * Sans effet en `timeOnly` : le declencheur y reste en lecture seule, faute de
   * lecteur pour une heure nue.
   */
  allowInput?: boolean;
  /**
   * Lecteur du texte tape, symetrique de `dateFormat`. Renvoyer `null` refuse
   * la saisie. Absent, un lecteur numerique sensible a la locale est utilise.
   */
  parseDate?: (value: string) => Date | null;

  /** Activer la ligne de selection de l'heure. */
  showTime?: boolean;
  /** Mode heure seule : le calendrier est masque, la ligne d'heure reste. */
  timeOnly?: boolean;
  /** Horloge 12 h (AM/PM) ou 24 h. */
  hourFormat?: DatepickerHourFormat;
  /** Pas des minutes pour les boutons et les fleches. La frappe reste exacte. */
  stepMinute?: number;
  /** Laisser taper les heures et les minutes directement. */
  editableTime?: boolean;

  /** Afficher la barre de boutons du bas, ou rendre `renderButtonBar`. */
  showButtonBar?: boolean;
  /**
   * Onde de pression sur les jours, les mois, les années et les boutons de
   * navigation, quand elle est activée. Pas sur les incréments d'heure, qui sont
   * des compteurs. `false` la coupe sur ce champ, activation globale comprise.
   */
  ripple?: boolean;
  /** Libelle du bouton « aujourd'hui ». */
  todayLabel?: string;
  /** Libelle du bouton d'effacement. */
  clearLabel?: string;

  /**
   * Indication accessible annoncant le format attendu, chainee au
   * `aria-describedby` du declencheur (a cote du message, jamais a sa place) des
   * qu'il est tapable : le `placeholder` seul n'est pas fiable d'un lecteur
   * d'ecran a l'autre, et il disparait des la premiere frappe. Par defaut, une
   * phrase construite depuis le placeholder resolu. Passer `''` pour l'omettre.
   */
  formatHintLabel?: string;

  /** Nom accessible du panneau, quand ni `label` ni `aria-label` n'en donnent un. */
  panelAriaLabel?: string;
  /** Libelle de la fleche de navigation precedente. */
  prevAriaLabel?: string;
  /** Libelle de la fleche de navigation suivante. */
  nextAriaLabel?: string;
  /** Nom accessible du compteur d'heures. */
  hoursAriaLabel?: string;
  /** Nom accessible du compteur de minutes. */
  minutesAriaLabel?: string;
  /** Nom accessible du compteur AM/PM. */
  meridiemAriaLabel?: string;
  /** Libelle du bouton d'incrementation des heures. */
  incrementHoursAriaLabel?: string;
  /** Libelle du bouton de decrementation des heures. */
  decrementHoursAriaLabel?: string;
  /** Libelle du bouton d'incrementation des minutes. */
  incrementMinutesAriaLabel?: string;
  /** Libelle du bouton de decrementation des minutes. */
  decrementMinutesAriaLabel?: string;
  /** Libelle des boutons de bascule AM/PM. */
  toggleMeridiemAriaLabel?: string;

  /** Rendre le panneau en ligne : pas de declencheur, pas de calque superieur. */
  inline?: boolean;
  /**
   * Ouvrir le panneau des que le declencheur prend le focus, au pointeur comme
   * au clavier, jamais sur un focus programmatique. Le panneau devient alors
   * **non modal** : ni piege de focus, ni arriere-plan inerte, quelle que soit
   * la facon dont il a ete ouvert.
   */
  showOnFocus?: boolean;
  /** Retourner le panneau au-dessus du declencheur quand la place manque en dessous. */
  autoFlip?: boolean;
  /** Fermer apres une selection complete. Ignore quand `showTime`. */
  closeOnSelect?: boolean;
  /** Classe(s) supplementaire(s) sur le panneau. */
  panelClassName?: string;
  /** Classe(s) supplementaire(s) sur la racine. */
  className?: string;
  /** `autocomplete` natif, transmis au declencheur. */
  autoComplete?: string;
  /** `name` natif du champ. */
  name?: string;
  /** `tabindex` du declencheur. */
  tabIndex?: number;
  /** id du champ. Genere si absent. */
  id?: string;

  /** Emis quand une date, un mois ou une annee est choisi : toujours une valeur unique. */
  onDateSelect?: (value: Date | string) => void;
  /** Emis quand le mois affiche change. */
  onMonthChange?: (change: { month: number; year: number }) => void;
  /** Emis quand le panneau s'ouvre. */
  onOpen?: () => void;
  /** Emis quand le panneau se ferme. */
  onClose?: () => void;
  /** Emis quand la valeur est effacee. */
  onCleared?: () => void;
  onFocus?: (event: ReactFocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: ReactFocusEvent<HTMLInputElement>) => void;

  /** Rendu personnalise d'une cellule jour. */
  renderDay?: (day: DatepickerDay) => ReactNode;
  /** Rendu personnalise de la barre de boutons. */
  renderButtonBar?: (context: DatepickerButtonBarContext) => ReactNode;

  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-datepicker : selecteur de date, de mois ou d'annee, avec heure optionnelle.
 *
 * Un declencheur ouvre un panneau dans le **calque superieur** (`<dialog>` en
 * modal, `[popover]` quand `showOnFocus` le rend non modal), ou rend le panneau
 * en ligne. Selection `single` / `multiple` / `range`, forage jour -> mois ->
 * annee, modes MonthPicker et YearPicker, plusieurs mois cote a cote, ligne
 * d'heure, et focus rotatif au clavier dans les trois grilles.
 */
export function UiDatepicker({
  value,
  defaultValue = null,
  onValueChange,
  valueType,
  placeholder,
  icon = 'calendar',
  showIcon = true,
  iconAriaLabel = 'Ouvrir le calendrier',
  showClear = true,
  selectionMode = 'single',
  view = 'date',
  numberOfMonths = 1,
  minDate = null,
  maxDate = null,
  disabledDates,
  disabledDays,
  firstDayOfWeek = 1,
  locale,
  dateFormat,
  allowInput = true,
  parseDate,
  showTime = false,
  timeOnly = false,
  hourFormat = '24',
  stepMinute = 1,
  editableTime = true,
  showButtonBar = false,
  ripple = true,
  todayLabel = "Aujourd'hui",
  clearLabel = 'Effacer',
  formatHintLabel,
  panelAriaLabel = 'Calendrier',
  prevAriaLabel = 'Précédent',
  nextAriaLabel = 'Suivant',
  hoursAriaLabel = 'Heures',
  minutesAriaLabel = 'Minutes',
  meridiemAriaLabel = 'AM/PM',
  incrementHoursAriaLabel = 'Augmenter les heures',
  decrementHoursAriaLabel = 'Diminuer les heures',
  incrementMinutesAriaLabel = 'Augmenter les minutes',
  decrementMinutesAriaLabel = 'Diminuer les minutes',
  toggleMeridiemAriaLabel = 'Changer AM/PM',
  inline = false,
  showOnFocus = false,
  autoFlip = true,
  closeOnSelect = true,
  panelClassName,
  className,
  autoComplete,
  name,
  tabIndex,
  id,
  onDateSelect,
  onMonthChange,
  onOpen,
  onClose,
  onCleared,
  onFocus,
  onBlur,
  renderDay,
  renderButtonBar,
  ref,
  ...rest
}: UiDatepickerProps) {
  const field = useUiField({ ...rest, label: rest.label, id });
  const panelId = `${useId()}-panel`;
  const formatHintId = `${field.inputId}-format-hint`;
  const iconSize: UiIconSize = rest.size === 'small' ? 'sm' : 'md';

  const disabled = rest.disabled ?? false;
  const readOnly = rest.readOnly ?? false;

  const [model, setModel] = useControllableState<DatepickerValue>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  // --- Refs ----------------------------------------------------------------
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  /** Element ou la pression en cours a COMMENCE, voir `onOutsideClick`. */
  const pressOrigin = useRef<Node | null>(null);
  /**
   * Pose pendant que nous rendons nous-memes le focus au declencheur, pour que
   * ce focus de retour ne rouvre pas le panneau qui vient de se fermer.
   * `focus()` part de facon synchrone, donc un drapeau suffit : aucun minuteur a
   * fuir.
   */
  const suppressFocusOpen = useRef(false);
  /**
   * Un geste utilisateur vient d'avoir lieu. C'est ce qui remplace le
   * `FocusMonitor` du CDK : `showOnFocus` ne doit PAS ouvrir sur un focus
   * programmatique (un `autofocus`, une application hote qui appelle `focus()`),
   * qui ferait surgir un calendrier que personne n'a demande. Un focus issu
   * d'un geste part dans la meme tache que ce geste, donc le drapeau est encore
   * leve ; un `focus()` appele depuis un effet ou un minuteur arrive seul.
   */
  const recentGesture = useRef(false);

  // --- Etat ----------------------------------------------------------------
  const [open, setOpen] = useState(false);
  /**
   * Niveau de forage actif. Il se remet a `view` quand celui-ci change : ajuste
   * au rendu plutot que dans un effet, pour qu'aucune image intermediaire ne
   * montre l'ancien niveau.
   */
  const [currentView, setCurrentView] = useState<DatepickerView>(view);
  const [prevView, setPrevView] = useState(view);
  if (prevView !== view) {
    setPrevView(view);
    setCurrentView(view);
  }

  const [viewDate, setViewDate] = useState<Date>(() => startOfDay(new Date()));
  const [focusedDate, setFocusedDate] = useState<Date>(() => startOfDay(new Date()));
  const [focusedMonthIndex, setFocusedMonthIndex] = useState(() => new Date().getMonth());
  const [focusedYear, setFocusedYear] = useState(() => new Date().getFullYear());
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  /** Texte brut pendant que l'utilisateur edite le declencheur ; `null` au repos. */
  const [typedValue, setTypedValue] = useState<string | null>(null);
  /**
   * Masque vif abandonne pour le reste de la saisie en cours, parce que
   * l'utilisateur a edite a l'interieur du texte au lieu d'ajouter a sa queue.
   * Leve par tout enregistrement, et des que le champ se lit vide.
   */
  const [maskSuspended, setMaskSuspended] = useState(false);
  /** Chiffres bruts pendant qu'un champ d'heure est tape ; `null` au repos. */
  const [hoursDraft, setHoursDraft] = useState<string | null>(null);
  const [minutesDraft, setMinutesDraft] = useState<string | null>(null);
  /** Compteur de demandes de focus de cellule, consomme par un effet. */
  const [dayFocusRequest, setDayFocusRequest] = useState(0);
  const [monthFocusRequest, setMonthFocusRequest] = useState(0);
  const [yearFocusRequest, setYearFocusRequest] = useState(0);

  /**
   * Le panneau est non modal exactement quand `showOnFocus` est pose : c'est ce
   * qui garde le champ vivant sous un panneau ouvert au focus. La saveur ne
   * depend donc PAS de la facon d'ouvrir, ce qui evite qu'un clic promeuve un
   * panneau non modal en modal au milieu d'une interaction.
   */
  const nonModal = showOnFocus;

  // --- Valeur : le seul point de conversion --------------------------------
  const hasTimeComponent = showTime || timeOnly;

  const toIsoValue = useCallback(
    (d: Date) => (hasTimeComponent ? toIsoDateTime(d) : toIsoDate(d)),
    [hasTimeComponent],
  );
  const fromIsoValue = useCallback(
    (s: string) => (hasTimeComponent ? parseIsoDateTime(s) : parseIsoDate(s)),
    [hasTimeComponent],
  );

  /**
   * Date interne -> la forme que `valueType` s'engage a emettre : une `Date`
   * FRAICHE (ramenee a minuit quand aucune heure n'est affichee, jamais la
   * reference d'origine) en `'date'`, une chaine ISO en `'iso'`. Le seul endroit
   * qui decide du type emis.
   */
  const serializeValue = useCallback(
    (d: Date): Date | string => {
      if (valueType === 'iso') return toIsoValue(d);
      return hasTimeComponent ? new Date(d) : startOfDay(d);
    },
    [valueType, toIsoValue, hasTimeComponent],
  );

  /**
   * Un element entrant, `Date` ou chaine ISO, detecte : l'entree accepte les
   * deux formes quel que soit `valueType`. Clone quand c'est deja une `Date`,
   * jamais la reference de l'appelant : symetrique de `serializeValue`, et cela
   * protege d'un appelant qui muterait cette `Date` sur place ensuite.
   */
  const parseValue = useCallback(
    (v: Date | string): Date | null => (v instanceof Date ? new Date(v) : fromIsoValue(v)),
    [fromIsoValue],
  );

  const toExternalValue = useCallback(
    (v: DatepickerDateValue): DatepickerValue => {
      if (!v) return null;
      // La conversion ne branche que sur `valueType`, constant sur tout le
      // `map` : le tableau est donc homogene, jamais melange.
      if (Array.isArray(v)) return v.map((d) => serializeValue(d)) as Date[] | string[];
      return serializeValue(v);
    },
    [serializeValue],
  );

  /**
   * Valeur publique -> date(s) interne(s). Une entree invalide est ecartee
   * plutot que de faire echouer l'ensemble : un element malforme au milieu d'un
   * tableau `multiple` ne doit pas effacer le reste.
   */
  const toInternalValue = useCallback(
    (v: DatepickerValue): DatepickerDateValue => {
      if (!v) return null;
      if (Array.isArray(v)) {
        const parsed = (v as (Date | string)[])
          .map((item) => parseValue(item))
          .filter((d): d is Date => d !== null);
        return parsed.length ? parsed : null;
      }
      return parseValue(v);
    },
    [parseValue],
  );

  const internalValue = useMemo(() => toInternalValue(model), [model, toInternalValue]);

  const selectedDates = useMemo<Date[]>(() => {
    if (!internalValue) return [];
    return (Array.isArray(internalValue) ? internalValue : [internalValue]).filter(
      (d): d is Date => d instanceof Date,
    );
  }, [internalValue]);

  const firstSelected = selectedDates[0] ?? null;
  const hasValue = selectedDates.length > 0;

  /**
   * Le calendrier suit la valeur : mois affiche, cellule au focus rotatif, et
   * heure. C'est le pendant du `writeValue` d'Angular, sans lequel un
   * calendrier EN LIGNE porte une valeur de juillet en affichant le mois
   * courant : il ne passe jamais par une ouverture, seul autre endroit qui
   * amorce la vue.
   *
   * Ajuste au rendu, avec l'horodatage precedent en temoin, plutot que dans un
   * effet : le panneau afficherait sinon une image du mauvais mois avant de se
   * corriger.
   */
  const firstTs = firstSelected?.getTime() ?? null;
  const [prevFirstTs, setPrevFirstTs] = useState<number | null>(null);
  if (prevFirstTs !== firstTs) {
    setPrevFirstTs(firstTs);
    if (firstSelected) {
      setHours(firstSelected.getHours());
      setMinutes(firstSelected.getMinutes());
      setViewDate(firstOfMonth(firstSelected));
      setFocusedDate(startOfDay(firstSelected));
      setFocusedMonthIndex(firstSelected.getMonth());
      setFocusedYear(firstSelected.getFullYear());
    }
  }

  // --- Contraintes ---------------------------------------------------------
  const resolvedMinDate = useMemo(() => normalizeDateInput(minDate), [minDate]);
  const resolvedMaxDate = useMemo(() => normalizeDateInput(maxDate), [maxDate]);
  const resolvedDisabledDates = useMemo(
    () => (disabledDates ?? []).map(normalizeDateInput).filter((d): d is Date => d !== null),
    [disabledDates],
  );
  const resolvedDisabledDays = useMemo(() => disabledDays ?? [], [disabledDays]);

  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      if (resolvedMinDate && date < startOfDay(resolvedMinDate)) return true;
      if (resolvedMaxDate && date > startOfDay(resolvedMaxDate)) return true;
      if (resolvedDisabledDays.includes(date.getDay())) return true;
      return resolvedDisabledDates.some((d) => isSameDay(d, date));
    },
    [resolvedMinDate, resolvedMaxDate, resolvedDisabledDays, resolvedDisabledDates],
  );

  /** Mois entier hors de [min, max]. */
  const isMonthDisabled = useCallback(
    (year: number, month: number): boolean => {
      if (resolvedMinDate && new Date(year, month + 1, 0) < startOfDay(resolvedMinDate))
        return true;
      if (resolvedMaxDate && new Date(year, month, 1) > startOfDay(resolvedMaxDate)) return true;
      return false;
    },
    [resolvedMinDate, resolvedMaxDate],
  );

  /** Annee entiere hors de [min, max]. */
  const isYearDisabled = useCallback(
    (year: number): boolean => {
      if (resolvedMinDate && year < resolvedMinDate.getFullYear()) return true;
      if (resolvedMaxDate && year > resolvedMaxDate.getFullYear()) return true;
      return false;
    },
    [resolvedMinDate, resolvedMaxDate],
  );

  const clampToRange = useCallback(
    (date: Date): Date => {
      if (resolvedMinDate && date < startOfDay(resolvedMinDate)) return startOfDay(resolvedMinDate);
      if (resolvedMaxDate && date > startOfDay(resolvedMaxDate)) return startOfDay(resolvedMaxDate);
      return date;
    },
    [resolvedMinDate, resolvedMaxDate],
  );

  // --- Format et saisie ----------------------------------------------------
  /** Pas tapable : saisie coupee, lecture seule, ou `timeOnly` (pas de lecteur d'heure nue). */
  const triggerReadonly = readOnly || !allowInput || timeOnly;

  /**
   * Ordre des champs qu'un `dateFormat` personnalise ecrit vraiment, sonde
   * depuis sa sortie pour la date temoin. `null` quand il n'y a pas de
   * formateur, ou quand sa sortie n'est pas assez numerique pour trancher
   * (« 22 novembre 2023 ») : l'ordre de la locale tient alors.
   *
   * Le lecteur par defaut et le masque vif doivent relire le texte dans l'ordre
   * ou le champ l'AFFICHE, et un `dateFormat` est libre d'utiliser sa propre
   * locale : un formateur `fr-FR` sous une locale `en-US` affichait
   * « 08/07/2026 » mais le relisait mois d'abord, donc finir la saisie
   * echangeait jour et mois en silence.
   */
  const customFormatFieldOrder = useMemo<DateField[] | null>(() => {
    if (!dateFormat) return null;
    const out = dateFormat(probeDate());
    // L'annee sur 4 chiffres sondee avant celle sur 2 : « 23 » apparait aussi
    // dans « 2023 » (« 20|23 »), a un decalage qui n'est pas son debut.
    const probed: [DateField, number][] = [
      ['day', firstIndexOf(out, ['22'])],
      ['month', firstIndexOf(out, ['11'])],
      ['year', firstIndexOf(out, ['2023', '23'])],
    ];
    if (probed.some(([, i]) => i === -1)) return null;
    if (new Set(probed.map(([, i]) => i)).size !== probed.length) return null;
    return probed.sort((a, b) => a[1] - b[1]).map(([f]) => f);
  }, [dateFormat]);

  const dateFieldOrder = useMemo<DateField[]>(() => {
    if (customFormatFieldOrder) return customFormatFieldOrder;
    const parts = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(probeDate());
    const order = parts
      .map((p) => p.type)
      .filter((t): t is DateField => t === 'day' || t === 'month' || t === 'year');
    return order.length === 3 ? order : ['day', 'month', 'year'];
  }, [customFormatFieldOrder, locale]);

  /** `dateFieldOrder`, moins `day` en vue mois : les champs vraiment tapes. */
  const activeFields = useMemo<DateField[]>(
    () => dateFieldOrder.filter((f) => (view === 'month' ? f !== 'day' : true)),
    [dateFieldOrder, view],
  );

  /**
   * Jeton de placeholder pour une date seule (« jj/mm/aaaa »), brique que
   * `resolvedPlaceholder` compose. Avec un `dateFormat` personnalise, le jeton
   * numerique de la locale serait franchement faux : il decrirait un format que
   * rien ne produit ni n'accepte. Montrer la sortie de ce formateur pour une
   * date temoin correspond au moins a ce que le champ attend vraiment.
   */
  const singleDatePlaceholder = useMemo(() => {
    if (dateFormat) return dateFormat(probeDate());
    const fr = (locale ?? '').toLowerCase().startsWith('fr');
    const token = { day: fr ? 'jj' : 'dd', month: 'mm', year: fr ? 'aaaa' : 'yyyy' };
    if (view === 'year') return token.year;
    const opts: Intl.DateTimeFormatOptions =
      view === 'month'
        ? { month: '2-digit', year: 'numeric' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Intl.DateTimeFormat(locale, opts)
      .formatToParts(probeDate())
      .map((p) =>
        p.type === 'day'
          ? token.day
          : p.type === 'month'
            ? token.month
            : p.type === 'year'
              ? token.year
              : p.value,
      )
      .join('');
  }, [dateFormat, locale, view]);

  const resolvedPlaceholder = useMemo(() => {
    // On garde le placeholder du consommateur, et on n'indique rien
    // automatiquement sur un declencheur en lecture seule.
    if (placeholder || triggerReadonly) return placeholder;
    if (selectionMode === 'range')
      return `${singleDatePlaceholder}${RANGE_SEPARATOR}${singleDatePlaceholder}`;
    if (selectionMode === 'multiple') return `${singleDatePlaceholder}${MULTIPLE_SEPARATOR}...`;
    return singleDatePlaceholder;
  }, [placeholder, triggerReadonly, selectionMode, singleDatePlaceholder]);

  const resolvedFormatHint = useMemo(() => {
    if (triggerReadonly) return null;
    if (formatHintLabel === '') return null;
    return formatHintLabel || `Format attendu : ${resolvedPlaceholder}`;
  }, [triggerReadonly, formatHintLabel, resolvedPlaceholder]);

  // --- Affichage -----------------------------------------------------------
  const formatDate = useCallback(
    (date: Date): string => {
      if (dateFormat) return dateFormat(date);
      // Declencheur tapable -> format numerique qui fait l'aller-retour avec le
      // lecteur par defaut.
      if (allowInput) {
        const opts: Intl.DateTimeFormatOptions = {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        };
        if (showTime) {
          opts.hour = '2-digit';
          opts.minute = '2-digit';
        }
        return new Intl.DateTimeFormat(locale, opts).format(date);
      }
      return new Intl.DateTimeFormat(
        locale,
        showTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' },
      ).format(date);
    },
    [dateFormat, allowInput, showTime, locale],
  );

  /**
   * Affichage de `timeOnly` : respecte `hourFormat`, jamais le defaut AM/PM ou
   * 24 h de la locale, et `dateFormat` quand il est fourni.
   */
  const formatTime = useCallback(
    (date: Date): string => {
      if (dateFormat) return dateFormat(date);
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: hourFormat === '12',
      }).format(date);
    },
    [dateFormat, locale, hourFormat],
  );

  const formatMonth = useCallback(
    (date: Date): string => {
      if (allowInput && !dateFormat) {
        const yearFirst = dateFieldOrder.filter((f) => f !== 'day')[0] === 'year';
        const mm = pad(date.getMonth() + 1);
        const yyyy = String(date.getFullYear());
        return yearFirst ? `${yyyy}/${mm}` : `${mm}/${yyyy}`;
      }
      return capitalize(
        new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date),
      );
    },
    [allowInput, dateFormat, dateFieldOrder, locale],
  );

  const displayValue = useMemo(() => {
    // Pendant l'edition, on reflete le texte brut pour que le champ garde ce
    // que l'utilisateur tape.
    if (typedValue !== null) return typedValue;
    const [first] = selectedDates;
    if (!first) return '';
    if (view === 'month') return formatMonth(first);
    if (view === 'year') return String(first.getFullYear());
    if (timeOnly) return formatTime(first);
    if (selectionMode === 'multiple')
      return selectedDates.map((d) => formatDate(d)).join(MULTIPLE_SEPARATOR);
    if (selectionMode === 'range')
      return selectedDates.map((d) => formatDate(d)).join(RANGE_DISPLAY_SEPARATOR);
    return formatDate(first);
  }, [
    typedValue,
    selectedDates,
    view,
    timeOnly,
    selectionMode,
    formatMonth,
    formatTime,
    formatDate,
  ]);

  /**
   * Masque dynamique (largeurs jour/mois/annee, plus l'heure si `showTime`, plus
   * une seconde date en `range`) qui pilote le formatage auto du declencheur.
   * `null` le desarme.
   *
   * `hasValue` : re-deriver le masque depuis le flux de chiffres brut ne marche
   * que pour CONSTRUIRE une valeur depuis rien, pas pour en editer une sur
   * place. Il est donc coupe des qu'une valeur existe, et se rearme des que le
   * champ se lit vide.
   *
   * `maskSuspended` : la meme limite, rencontree avant qu'une valeur existe, sur
   * une edition faite a l'interieur du texte plutot qu'a sa queue.
   */
  const typingSlots = useMemo<MaskSlot[] | null>(() => {
    if (
      triggerReadonly ||
      view === 'year' ||
      parseDate ||
      hasValue ||
      maskSuspended ||
      (selectionMode !== 'single' && selectionMode !== 'range')
    )
      return null;
    const widths = { day: '99', month: '99', year: '9999' } as const;
    const bounds: Record<DateField, MaskBounds | null> = {
      day: { min: 1, max: 31 },
      month: { min: 1, max: 12 },
      year: null,
    };
    let mask = activeFields.map((f) => widths[f]).join('/');
    const segmentBounds: (MaskBounds | null)[] = activeFields.map((f) => bounds[f]);

    if (selectionMode === 'single' && showTime && view === 'date') {
      mask += hourFormat === '12' ? ' 99:99 aa' : ' 99:99';
      segmentBounds.push(hourFormat === '12' ? { min: 1, max: 12 } : { min: 0, max: 23 }, {
        min: 0,
        max: 59,
      });
    }
    if (selectionMode === 'range') {
      // Seconde date, memes largeurs, jointe par le separateur tape. Pas de
      // `showTime` ici : un `range` tape est toujours a minuit.
      mask += RANGE_SEPARATOR + activeFields.map((f) => widths[f]).join('/');
      segmentBounds.push(...activeFields.map((f) => bounds[f]));
    }
    return buildMaskSlots(mask, segmentBounds);
  }, [
    triggerReadonly,
    view,
    parseDate,
    hasValue,
    maskSuspended,
    selectionMode,
    activeFields,
    showTime,
    hourFormat,
  ]);

  // --- Lecture du texte tape ----------------------------------------------
  /**
   * Lecteur numerique sensible a la locale (ordre jour/mois/annee depuis
   * `dateFieldOrder`). Avec `requireComplete`, renvoie `null` tant que toutes
   * les composantes ne sont pas la (et que l'annee n'a pas 2 ou au moins 4
   * chiffres) : c'est ce qui evite les sauts pendant l'apercu vif.
   */
  const defaultParse = useCallback(
    (text: string, requireComplete = false): Date | null => {
      const groups = text.match(/\d+/g) ?? [];
      const nums = groups.map(Number);
      if (!nums.length) return null;
      if (view === 'year') {
        const [year0] = nums;
        if (year0 === undefined) return null;
        if (requireComplete && (groups[0]?.length ?? 0) < 4) return null;
        return finalizeParsed(normalizeYear(year0), 0, 1, 0, 0);
      }

      if (requireComplete) {
        if (groups.length < activeFields.length) return null;
        const yearLen = groups[activeFields.indexOf('year')]?.length ?? 0;
        if (yearLen !== 2 && yearLen < 4) return null;
      }
      let day = 1;
      let month = 0;
      let year = viewDate.getFullYear();
      activeFields.forEach((f, i) => {
        const n = nums[i];
        if (n === undefined) return;
        if (f === 'day') day = n;
        else if (f === 'month') month = n - 1;
        else year = normalizeYear(n);
      });

      let h = hours;
      let min = minutes;
      if (showTime && view === 'date') {
        const t = nums.slice(activeFields.length);
        h = t[0] ?? h;
        min = t[1] ?? min;
        if (hourFormat === '12') {
          if (/p/i.test(text) && h < 12) h += 12;
          if (/a/i.test(text) && h === 12) h = 0;
        }
      }
      return finalizeParsed(year, month, view === 'month' ? 1 : day, h, min);
    },
    [view, activeFields, viewDate, hours, minutes, showTime, hourFormat],
  );

  const parseTyped = useCallback(
    (text: string, requireComplete = false): Date | null =>
      parseDate ? parseDate(text) : defaultParse(text, requireComplete),
    [parseDate, defaultParse],
  );

  /** Controle de bornes et de desactivation d'une valeur lue, au grain de la vue. */
  const isParsedDisabled = useCallback(
    (date: Date): boolean => {
      if (view === 'year') return isYearDisabled(date.getFullYear());
      if (view === 'month') return isMonthDisabled(date.getFullYear(), date.getMonth());
      return isDateDisabled(startOfDay(date));
    },
    [view, isYearDisabled, isMonthDisabled, isDateDisabled],
  );

  /**
   * Decoupe le texte `range`/`multiple` en segments. Un `text.split(sep)` casse
   * des que le texte formate d'une date contient `sep` (un `dateFormat` en
   * « , » en `multiple`, ou un tiret ISO en `range`) : une occurrence de `sep`
   * n'est donc acceptee comme frontiere qu'une fois que le texte qui la precede
   * se lit deja comme une date complete.
   */
  const splitTypedSegments = useCallback(
    (text: string, sep: string): string[] => {
      const segments: string[] = [];
      let rest = text.trim();
      while (rest.length) {
        let boundary = -1;
        let searchFrom = 0;
        for (;;) {
          const idx = rest.indexOf(sep, searchFrom);
          if (idx === -1) break;
          if (parseTyped(rest.slice(0, idx), true)) {
            boundary = idx;
            break;
          }
          searchFrom = idx + 1;
        }
        if (boundary === -1) {
          segments.push(rest.trim());
          break;
        }
        segments.push(rest.slice(0, boundary).trim());
        rest = rest.slice(boundary + sep.length).trim();
      }
      return segments.filter((s) => s.length > 0);
    },
    [parseTyped],
  );

  /**
   * Saisie `range`/`multiple`. `range` exige exactement deux parties, remises
   * dans l'ordre chronologique ; `multiple` en prend n'importe quel nombre, sans
   * doublon. Une seule partie mauvaise ou desactivee fait echouer le tout.
   * Toujours a minuit : pas de `showTime` ici.
   */
  const parseTypedMulti = useCallback(
    (text: string, requireComplete: boolean): Date[] | null => {
      const sep = selectionMode === 'range' ? RANGE_SEPARATOR : MULTIPLE_SEPARATOR;
      const parts = splitTypedSegments(text, sep);
      if (selectionMode === 'range' && parts.length !== 2) return null;
      if (selectionMode === 'multiple' && parts.length < 1) return null;
      const parsed = parts.map((p) => parseTyped(p, requireComplete));
      if (parsed.some((d) => d === null || isParsedDisabled(d))) return null;
      const dates = (parsed as Date[]).map(startOfDay);
      if (selectionMode === 'range') return dates.sort((a, b) => a.getTime() - b.getTime());
      return dates.filter((d, i) => dates.findIndex((o) => isSameDay(o, d)) === i);
    },
    [selectionMode, splitTypedSegments, parseTyped, isParsedDisabled],
  );

  const parseTypedValue = useCallback(
    (text: string, requireComplete: boolean): Date | Date[] | null => {
      if (selectionMode === 'single') {
        const parsed = parseTyped(text, requireComplete);
        return parsed && !isParsedDisabled(parsed) ? parsed : null;
      }
      return parseTypedMulti(text, requireComplete);
    },
    [selectionMode, parseTyped, isParsedDisabled, parseTypedMulti],
  );

  // --- Ecriture ------------------------------------------------------------
  /**
   * Le seul chemin d'ecriture normal : prend des dates internes et serialise
   * ici, avant que quoi que ce soit n'atteigne le modele. Le contrat de type vit
   * entierement dans cette fonction.
   */
  const commit = useCallback(
    (next: DatepickerDateValue) => {
      setTypedValue(null); // toute valeur enregistree reformate le declencheur
      setMaskSuspended(false); // et rearme le masque vif
      setModel(toExternalValue(next ?? null));
    },
    [setModel, toExternalValue],
  );

  const clear = useCallback(() => {
    commit(null);
    onCleared?.();
  }, [commit, onCleared]);

  // --- Grilles -------------------------------------------------------------
  const dayAriaFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [locale],
  );

  const rangeComplete = useMemo(() => {
    if (selectionMode !== 'range') return false;
    const [start, end] = selectedDates;
    return !!start && !!end;
  }, [selectionMode, selectedDates]);

  const buildDay = useCallback(
    (date: Date, viewMonth: Date): DatepickerDay => {
      const today = startOfDay(new Date());
      let selected = false;
      let rangeStart = false;
      let rangeEnd = false;
      let inRange = false;
      if (selectionMode === 'range') {
        const [s, e] = selectedDates;
        if (s && isSameDay(date, s)) {
          rangeStart = true;
          selected = true;
        }
        if (e && isSameDay(date, e)) {
          rangeEnd = true;
          selected = true;
        }
        if (s && e && date > startOfDay(s) && date < startOfDay(e)) inRange = true;
      } else {
        selected = selectedDates.some((d) => isSameDay(d, date));
      }
      return {
        date,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        otherMonth: date.getMonth() !== viewMonth.getMonth(),
        today: isSameDay(date, today),
        selected,
        disabled: isDateDisabled(date),
        ariaLabel: dayAriaFormatter.format(date),
        rangeStart,
        rangeEnd,
        inRange,
        ts: date.getTime(),
      };
    },
    [selectionMode, selectedDates, isDateDisabled, dayAriaFormatter],
  );

  /** Grille 6x7 d'un mois, debordements sur les mois voisins compris. */
  const buildMonthWeeks = useCallback(
    (monthDate: Date): DatepickerDay[][] => {
      const first = firstOfMonth(monthDate);
      const offset = (first.getDay() - firstDayOfWeek + 7) % 7;
      const gridStart = addDays(first, -offset);
      return Array.from({ length: 6 }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => buildDay(addDays(gridStart, w * 7 + d), monthDate)),
      );
    },
    [firstDayOfWeek, buildDay],
  );

  const monthCount = Math.max(1, numberOfMonths);
  const singleMonth = monthCount === 1;
  const showCalendar = !timeOnly;

  const monthPanels = useMemo<DatepickerMonthPanel[]>(() => {
    const start = firstOfMonth(viewDate);
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    return Array.from({ length: monthCount }, (_, i) => {
      const monthDate = addMonths(start, i);
      return {
        monthDate,
        label: capitalize(fmt.format(monthDate)),
        weeks: buildMonthWeeks(monthDate),
        showPrev: i === 0,
        showNext: i === monthCount - 1,
      };
    });
  }, [viewDate, locale, monthCount, buildMonthWeeks]);

  const decadeStart = Math.floor(viewDate.getFullYear() / 10) * 10;

  const months = useMemo<DatepickerMonthCell[]>(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
    const year = viewDate.getFullYear();
    return Array.from({ length: 12 }, (_, i) => ({
      index: i,
      label: capitalize(fmt.format(new Date(year, i, 1))),
      selected: selectedDates.some((d) => d.getFullYear() === year && d.getMonth() === i),
      disabled: isMonthDisabled(year, i),
    }));
  }, [locale, viewDate, selectedDates, isMonthDisabled]);

  const years = useMemo<DatepickerYearCell[]>(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const year = decadeStart + i;
        return {
          year,
          selected: selectedDates.some((d) => d.getFullYear() === year),
          disabled: isYearDisabled(year),
        };
      }),
    [decadeStart, selectedDates, isYearDisabled],
  );

  /**
   * Cellules mois et annees decoupees dans les lignes que la CSS rend vraiment
   * (3 et 2 colonnes). Un `role="grid"` exige que ses `gridcell` soient dans un
   * `role="row"` ; sans lui la grille entiere est de l'ARIA invalide. Garder ces
   * tailles en phase avec le nombre de colonnes du SCSS.
   */
  const monthRows = useMemo(() => chunk(months, 3), [months]);
  const yearRows = useMemo(() => chunk(years, 2), [years]);

  const weekDayNames = useMemo<{ short: string; full: string }[]>(() => {
    const shortFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const longFmt = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    const sunday = new Date(2023, 0, 1); // getDay() === 0
    return Array.from({ length: 7 }, (_, k) => {
      const d = addDays(sunday, (firstDayOfWeek + k) % 7);
      return { short: capitalize(shortFmt.format(d)), full: capitalize(longFmt.format(d)) };
    });
  }, [locale, firstDayOfWeek]);

  const headerLabel = useMemo(() => {
    if (currentView === 'year') return `${decadeStart} - ${decadeStart + 9}`;
    if (currentView === 'month') return String(viewDate.getFullYear());
    return capitalize(
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewDate),
    );
  }, [currentView, decadeStart, viewDate, locale]);

  // --- Placement -----------------------------------------------------------
  const position = useUiPosition<HTMLElement, HTMLElement>({
    placement: 'bottom-start',
    offset: 8,
    flip: autoFlip,
    matchWidth: false,
    open: open && !inline,
  });

  const setPanel = useCallback(
    (node: HTMLElement | null) => {
      panelRef.current = node;
      position.setPanel(node);
    },
    [position],
  );

  // --- Ouverture et fermeture ---------------------------------------------
  const queueDayFocus = useCallback(() => setDayFocusRequest((n) => n + 1), []);
  const queueMonthFocus = useCallback(() => setMonthFocusRequest((n) => n + 1), []);
  const queueYearFocus = useCallback(() => setYearFocusRequest((n) => n + 1), []);

  /**
   * `origin` dit si le focus doit filer dans la grille : toujours depuis
   * l'icone du calendrier, seulement sur un champ non tapable sinon, jamais
   * quand c'est le focus lui-meme qui a ouvert.
   */
  const openFrom = useCallback(
    (origin: 'icon' | 'field' | 'focus') => {
      if (inline || disabled || readOnly || open) return;
      const base = firstSelected ?? startOfDay(new Date());
      setViewDate(firstOfMonth(base));
      setCurrentView(view);
      setFocusedDate(clampToRange(startOfDay(base)));
      setFocusedMonthIndex(base.getMonth());
      setFocusedYear(base.getFullYear());
      setOpen(true);
      onOpen?.();
      // Le focus reste dans le champ des qu'il est tapable ; il ne file dans la
      // grille que quand il ne l'est pas, ou sur un clic d'icone (« je veux la
      // grille »). Jamais sur `'focus'` : deplacer le focus en CONSEQUENCE d'un
      // focus est un changement de contexte au sens de WCAG 3.2.1. `Bas` est la
      // facon de demander la grille dans ce cas.
      if (origin !== 'focus' && showCalendar && (triggerReadonly || origin === 'icon')) {
        if (view === 'date') queueDayFocus();
        else if (view === 'month') queueMonthFocus();
        else queueYearFocus();
      }
    },
    [
      inline,
      disabled,
      readOnly,
      open,
      firstSelected,
      view,
      clampToRange,
      onOpen,
      showCalendar,
      triggerReadonly,
      queueDayFocus,
      queueMonthFocus,
      queueYearFocus,
    ],
  );

  const close = useCallback(
    (focusTrigger = true) => {
      if (!open) return;
      setOpen(false);
      onClose?.();
      if (focusTrigger) {
        // On garde tout le trajet (synchrone) du focus : avec `showOnFocus`, le
        // focus de retour rouvrirait sinon le panneau qu'on ferme, sur Echap
        // comme a chaque selection.
        suppressFocusOpen.current = true;
        inputRef.current?.focus();
        suppressFocusOpen.current = false;
      }
    },
    [open, onClose],
  );

  /**
   * L'ETAT pilote le calque superieur, le DOM suit. Un panneau du calque
   * s'ouvre par une methode imperative, et faire dependre l'etat de son
   * evenement desaligne les deux des que l'evenement se fait attendre.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || inline) return;
    if (nonModal) {
      const isOpen = panel.matches(':popover-open');
      if (open && !isOpen) panel.showPopover();
      else if (!open && isOpen) panel.hidePopover();
      return;
    }
    const dialog = panel as HTMLDialogElement;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open, inline, nonModal]);

  /**
   * `manual` et non `auto`, et pas de fermeture sur Echap ici : le clavier du
   * declencheur sait, lui, si la touche ferme vraiment quelque chose.
   */
  useUiDismiss({
    open: open && !inline,
    onDismiss: () => close(false),
    panelRef,
    anchorRef: wrapperRef,
    closeOnEscape: false,
  });

  useCloseOnNavigation(open, () => close(false));

  /**
   * Une pression n'est dismissive que depuis l'endroit ou elle a COMMENCE.
   * Relachee ailleurs, le navigateur envoie le clic sur l'ancetre commun des
   * deux cibles, ce que l'on prendrait pour un clic dehors : presser dans le
   * champ, le panneau s'ouvrant sous le curseur, le refermerait au relachement.
   * Ecouter pendant toute la vie du composant et pas seulement panneau ouvert
   * est ce qui rend cette pression-la attrapable, puisqu'elle precede
   * l'ouverture.
   */
  useEffect(() => {
    if (inline) return;
    const record = (event: Event) => {
      pressOrigin.current = event.target as Node | null;
    };
    document.addEventListener('pointerdown', record, true);
    return () => {
      document.removeEventListener('pointerdown', record, true);
      pressOrigin.current = null;
    };
  }, [inline]);

  /** Fenetre de geste utilisateur, voir `recentGesture`. */
  useEffect(() => {
    if (!showOnFocus) return;
    let timer: number | undefined;
    const mark = () => {
      recentGesture.current = true;
      window.clearTimeout(timer);
      // `setTimeout(0)` et non `requestAnimationFrame` : dans un onglet
      // ralenti, une rAF ne part jamais et le drapeau resterait leve.
      timer = window.setTimeout(() => {
        recentGesture.current = false;
      }, 0);
    };
    document.addEventListener('pointerdown', mark, true);
    document.addEventListener('keydown', mark, true);
    return () => {
      document.removeEventListener('pointerdown', mark, true);
      document.removeEventListener('keydown', mark, true);
      window.clearTimeout(timer);
    };
  }, [showOnFocus]);

  /**
   * Un `<dialog>` modal ferme sur Echap via `cancel`, qui est annulable :
   * l'annuler toujours et repasser par l'etat, pour n'avoir qu'une seule voie de
   * fermeture.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || inline || nonModal) return;
    const dialog = panel as HTMLDialogElement;
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [inline, nonModal, close]);

  // --- Focus des cellules --------------------------------------------------
  /**
   * Le focus est pose dans un effet : le DOM reflete deja la cellule rotative
   * qui vient d'etre calculee, donc aucun minuteur n'est necessaire.
   */
  const focusCell = useCallback((selector: string) => {
    panelRef.current?.querySelector<HTMLElement>(selector)?.focus();
  }, []);

  useEffect(() => {
    if (dayFocusRequest) focusCell('.ui-datepicker-day._focusable');
  }, [dayFocusRequest, focusCell]);
  useEffect(() => {
    if (monthFocusRequest) focusCell('.ui-datepicker-picker._month .ui-datepicker-cell._focusable');
  }, [monthFocusRequest, focusCell]);
  useEffect(() => {
    if (yearFocusRequest) focusCell('.ui-datepicker-picker._year .ui-datepicker-cell._focusable');
  }, [yearFocusRequest, focusCell]);

  // --- Selection -----------------------------------------------------------
  const changeMonth = useCallback(
    (delta: number) => {
      const next = addMonths(viewDate, delta);
      setViewDate(next);
      onMonthChange?.({ month: next.getMonth(), year: next.getFullYear() });
    },
    [viewDate, onMonthChange],
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (currentView === 'date') changeMonth(dir);
      else if (currentView === 'month')
        setViewDate(new Date(viewDate.getFullYear() + dir, viewDate.getMonth(), 1));
      else setViewDate(new Date(viewDate.getFullYear() + dir * 10, viewDate.getMonth(), 1));
    },
    [currentView, changeMonth, viewDate],
  );

  const applyTime = useCallback(
    (h: number, min: number) => {
      if (selectionMode !== 'single') return;
      const base = firstSelected ?? startOfDay(timeOnly ? new Date() : viewDate);
      const next = new Date(base);
      next.setHours(h, min, 0, 0);
      commit(next);
    },
    [selectionMode, firstSelected, timeOnly, viewDate, commit],
  );

  const selectDay = useCallback(
    (cell: DatepickerDay) => {
      if (cell.disabled || disabled || readOnly) return;
      const picked = new Date(cell.date);
      if (showTime) picked.setHours(hours, minutes, 0, 0);

      let next: DatepickerDateValue;
      let complete = true;
      if (selectionMode === 'multiple') {
        const arr = [...selectedDates];
        const idx = arr.findIndex((d) => isSameDay(d, picked));
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(picked);
        next = arr;
        complete = false; // `multiple` ne se ferme jamais tout seul
      } else if (selectionMode === 'range') {
        const [start] = selectedDates;
        if (selectedDates.length !== 1 || !start) {
          next = [picked];
          complete = false;
        } else {
          next = picked < startOfDay(start) ? [picked] : [start, picked];
          complete = next.length === 2;
        }
      } else {
        next = picked;
      }

      commit(next);
      onDateSelect?.(serializeValue(picked));
      setViewDate(firstOfMonth(picked));
      setFocusedDate(startOfDay(picked));
      if (closeOnSelect && !showTime && !inline && complete) close();
    },
    [
      disabled,
      readOnly,
      showTime,
      hours,
      minutes,
      selectionMode,
      selectedDates,
      commit,
      onDateSelect,
      serializeValue,
      closeOnSelect,
      inline,
      close,
    ],
  );

  const selectMonth = useCallback(
    (cell: DatepickerMonthCell) => {
      if (cell.disabled) return;
      const d = new Date(viewDate.getFullYear(), cell.index, 1);
      setViewDate(d);
      if (view === 'month') {
        commit(d);
        onDateSelect?.(serializeValue(d));
        if (closeOnSelect && !showTime && !inline) close();
      } else {
        setCurrentView('date');
        setFocusedDate(clampToRange(startOfDay(d)));
        queueDayFocus();
      }
    },
    [
      viewDate,
      view,
      commit,
      onDateSelect,
      serializeValue,
      closeOnSelect,
      showTime,
      inline,
      close,
      clampToRange,
      queueDayFocus,
    ],
  );

  const selectYear = useCallback(
    (cell: DatepickerYearCell) => {
      if (cell.disabled) return;
      const d = new Date(cell.year, view === 'year' ? 0 : viewDate.getMonth(), 1);
      setViewDate(d);
      if (view === 'year') {
        commit(d);
        onDateSelect?.(serializeValue(d));
        if (closeOnSelect && !showTime && !inline) close();
      } else {
        setCurrentView('month');
        setFocusedMonthIndex(d.getMonth());
        queueMonthFocus();
      }
    },
    [
      view,
      viewDate,
      commit,
      onDateSelect,
      serializeValue,
      closeOnSelect,
      showTime,
      inline,
      close,
      queueMonthFocus,
    ],
  );

  const selectToday = useCallback(() => {
    const today = startOfDay(new Date());
    if (isDateDisabled(today)) return;
    if (showTime) today.setHours(hours, minutes, 0, 0);
    commit(selectionMode === 'single' ? today : [today]);
    onDateSelect?.(serializeValue(today));
    setViewDate(firstOfMonth(today));
    setFocusedDate(today);
    if (closeOnSelect && !showTime && !inline && selectionMode !== 'multiple') close();
  }, [
    isDateDisabled,
    showTime,
    hours,
    minutes,
    commit,
    selectionMode,
    onDateSelect,
    serializeValue,
    closeOnSelect,
    inline,
    close,
  ]);

  /** Forage vers le haut depuis le titre (jour -> mois -> annee). Un seul mois. */
  const onHeaderClick = useCallback(() => {
    if (!singleMonth) return;
    if (currentView === 'date') {
      setFocusedMonthIndex(viewDate.getMonth());
      setCurrentView('month');
    } else if (currentView === 'month') {
      setFocusedYear(viewDate.getFullYear());
      setCurrentView('year');
      // Dernier niveau : le titre passe `disabled` ici, donc le focus qu'il
      // tenait va tomber sur `<body>` et la grille qui vient d'apparaitre ne
      // repondrait a aucune fleche. On le confie a la cellule rotative.
      queueYearFocus();
    }
  }, [singleMonth, currentView, viewDate, queueYearFocus]);

  // --- Saisie du declencheur ----------------------------------------------
  /**
   * Reflete une date entierement tapee dans le panneau ouvert (navigation et
   * surbrillance) sans reformater le champ, pour que le curseur ne bouge pas.
   */
  const previewTyped = useCallback(
    (raw: string) => {
      if (!raw.trim()) return;
      if (selectionMode === 'single') {
        // Sans ce controle, `hasValue` basculait des que jour/mois/annee etaient
        // tapes, avant le moindre chiffre d'heure : le chiffre suivant se
        // collait alors a l'annee, sans masque pour inserer « HH:MM ».
        if (showTime && view === 'date') {
          const groups = raw.trim().match(/\d+/g) ?? [];
          if (groups.length < activeFields.length + 2) return;
        }
      }
      const picked = parseTypedValue(raw.trim(), true);
      if (!picked) return;
      const first = Array.isArray(picked) ? picked[0] : picked;
      if (!first) return;
      // On met le modele a jour (surbrillance et valeur vive) mais on GARDE
      // `typedValue`, pour que l'affichage rende encore le texte brut : pas de
      // saut de curseur.
      setModel(toExternalValue(picked));
      setViewDate(firstOfMonth(first));
      setFocusedDate(startOfDay(first));
    },
    [selectionMode, showTime, view, activeFields, parseTypedValue, setModel, toExternalValue],
  );

  const onTriggerInput = useCallback(
    (raw: string) => {
      if (triggerReadonly) return;
      if (!typingSlots) {
        setTypedValue(raw);
        // Le masque est coupe parce qu'une valeur existe deja, ou qu'une edition
        // sur place l'a suspendu, mais le champ vient d'etre vide a la main,
        // sans flou ni Entree pour passer par l'enregistrement. On enregistre
        // ici plutot que d'attendre un enregistrement qui peut ne jamais venir :
        // `hasValue` bascule pour de bon et la suspension se leve, donc le
        // masque se rearme des la frappe suivante.
        if (!raw.trim()) {
          setMaskSuspended(false);
          if (hasValue) clear();
        }
        if (open) previewTyped(raw);
        return;
      }
      const el = inputRef.current;
      const caret = el?.selectionStart ?? raw.length;
      // Nombre de caracteres de donnee AVANT le curseur : ancre stable.
      const dataBeforeCaret = extractMaskData(raw.slice(0, caret)).length;
      const newData = extractMaskData(raw);
      // Edition A L'INTERIEUR du texte (il reste de la donnee apres le curseur)
      // plutot qu'un ajout a sa queue : le masque ne sait re-deriver le champ
      // entier que depuis un flux plat de chiffres, donc le relancer ici
      // re-decoupe chaque segment suivant de ce que cette edition a gagne ou
      // perdu. Remplacer le mois « 07 » par un « 1 » transformait
      // « 08/07/2026 » en « 08/12/026 », l'annee perdant un chiffre en silence.
      // On abandonne donc le masque pour le reste de la saisie, exactement ce
      // que `allowInput` promet deja une fois une valeur posee. Pour le RESTE de
      // la saisie et pas seulement cette frappe : les chiffres encore a venir
      // appartiennent au segment qu'on corrige, et rearmer sous le curseur les
      // decalerait de nouveau.
      if (dataBeforeCaret < newData.length) {
        setMaskSuspended(true);
        setTypedValue(raw);
        if (open) previewTyped(raw);
        return;
      }
      // Une suppression ne laisse derriere elle que des chiffres DEJA valides :
      // relancer le controle de bornes sur eux (concu pour refuser un premier
      // chiffre tout juste tape et impossible, « 8 » ne pouvant pas commencer un
      // jour de 1 a 31) peut au contraire en sauter un encore valide et
      // desaligner tous les segments suivants. Comparer les longueurs de donnee,
      // et non `inputType` (indisponible ici), distingue la frappe et le collage
      // (qui grandissent ou tiennent, toujours bornes) de la suppression (qui
      // rapetisse, bornee seulement a la lecture finale).
      const enforceBounds = newData.length >= extractMaskData(displayValue).length;
      const { text, tokenIndices, dataEnd } = autoFormatSegments(typingSlots, newData, {
        enforceBounds,
      });
      setTypedValue(text);
      if (el) {
        el.value = text;
        // Une suppression dont le curseur etait a la fin de la donnee (edition
        // en queue, le cas courant) atterrit toujours sur `dataEnd`, jamais sur
        // le resultat de `caretForMask` : cette fonction repond « ou est le
        // prochain emplacement a remplir », ce qui pour un segment tout juste
        // vide est la position juste apres son separateur auto-insere. Atterrir
        // la ferait supprimer ce separateur decoratif a la touche suivante
        // (re-insere en silence au rendu d'apres), donc la suppression aurait
        // l'air bloquee une frappe trop court, pour toujours.
        const atTail = dataBeforeCaret >= newData.length;
        const pos =
          !enforceBounds && atTail ? dataEnd : caretForMask(tokenIndices, dataBeforeCaret, dataEnd);
        el.setSelectionRange(pos, pos);
      }
      if (open) previewTyped(text);
    },
    [triggerReadonly, typingSlots, hasValue, clear, open, previewTyped, displayValue],
  );

  /** Lit et applique le texte tape ; revient a la valeur precedente si invalide. */
  const commitTyped = useCallback(() => {
    if (triggerReadonly) return;
    if (typedValue === null) return; // pas touche
    // Lu, efface ou revenu en arriere, cet enregistrement termine la saisie en
    // cours : le masque vif se rearme pour la suivante.
    setMaskSuspended(false);
    const text = typedValue.trim();
    if (!text) {
      setTypedValue(null);
      if (hasValue) clear();
      return;
    }
    const picked = parseTypedValue(text, true);
    if (picked) {
      commit(picked);
      const first = Array.isArray(picked) ? picked[0] : picked;
      // `onDateSelect` rapporte « quel jour vient d'etre choisi » : cela n'a pas
      // de sens pour une plage ou une liste enregistrees d'un coup, donc c'est
      // reserve au mode `single`.
      if (!Array.isArray(picked)) onDateSelect?.(serializeValue(picked));
      if (first) {
        setViewDate(firstOfMonth(first));
        setFocusedDate(startOfDay(first));
      }
    } else {
      setTypedValue(null); // retour en arriere : l'affichage reformate la valeur
    }
  }, [
    triggerReadonly,
    typedValue,
    hasValue,
    clear,
    parseTypedValue,
    commit,
    onDateSelect,
    serializeValue,
  ]);

  /**
   * Echap n'est consommee que quand elle ferme vraiment le panneau. Fermee, elle
   * remonte, pour qu'un dialogue parent reste atteignable par la meme touche.
   */
  const handleEscape = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key !== 'Escape' || !open) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    },
    [open, close],
  );

  const panelContains = useCallback(
    (node: Node | null) => !!node && !!panelRef.current?.contains(node),
    [],
  );
  const triggerContains = useCallback(
    (node: Node | null) => !!node && !!wrapperRef.current?.contains(node),
    [],
  );

  /**
   * Un clic sur le declencheur ouvre-t-il ? Oui quand le champ n'est pas
   * tapable (il EST alors le bouton), et quand `showIcon` est coupe (plus
   * aucune bascule : sans cela, rien n'ouvrirait le panneau a la souris).
   *
   * Sur un champ tapable, NON. Le panneau est dans le calque superieur avec un
   * arriere-plan qui avale les clics suivants sur le champ : le premier posait
   * le curseur, le suivant perdait le focus sans le deplacer, donc corriger un
   * seul segment a la souris etait impossible. Ouvrir enregistre aussi le texte
   * tape en apercu, ce qui desarme le masque auto en pleine saisie. L'icone,
   * `Bas` et la frappe ne sont pas touches.
   */
  const openOnTriggerClick = triggerReadonly || !showIcon || showOnFocus;

  const onTriggerClick = useCallback(() => {
    if (!openOnTriggerClick) return;
    // Le clic a pu tomber sur le libelle ou l'indication de format, laissant le
    // focus hors de l'enveloppe : Echap et `Bas` y sont attaches, ils seraient
    // muets pendant que le panneau est ouvert. Un clic dans le champ lui-meme
    // est deja focalise a ce stade, donc cela ne deplace jamais le curseur.
    if (!triggerReadonly) inputRef.current?.focus();
    openFrom('field');
  }, [openOnTriggerClick, triggerReadonly, openFrom]);

  /** Ce `Tab` sort-il du declencheur, plutot que d'aller a son propre bouton ? */
  const tabLeavesTrigger = useCallback((event: ReactKeyboardEvent) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return true;
    const stops = Array.from(
      wrapper.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled])'),
    ).filter((el) => el.tabIndex >= 0);
    const index = stops.indexOf(event.target as HTMLElement);
    if (index === -1) return true;
    return event.shiftKey ? index === 0 : index === stops.length - 1;
  }, []);

  const onTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      // Un panneau non modal ne piege pas le focus : le `Tab` qui quitte le
      // declencheur est une fermeture que rien d'autre n'assurerait.
      if (event.key === 'Tab' && nonModal && open && tabLeavesTrigger(event)) {
        close(false);
        return;
      }
      // L'enveloppe attrape aussi les touches pressees sur le bouton d'action du
      // champ. C'est un `<button>` natif : `Entree` et `Espace` doivent
      // l'atteindre. Seule Echap reste a nous.
      if (inputRef.current && event.target !== inputRef.current) {
        handleEscape(event);
        return;
      }
      // `Alt+Haut` ferme, quelle que soit la saveur de declencheur.
      if (event.key === 'ArrowUp' && event.altKey) {
        event.preventDefault();
        close();
        return;
      }
      if (!triggerReadonly) {
        // Declencheur tapable : on laisse passer les touches imprimables, on
        // n'intercepte que la navigation et l'enregistrement.
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openFrom('field');
          queueDayFocus();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          commitTyped();
          if (open && closeOnSelect && !showTime) close(false);
        } else {
          handleEscape(event);
        }
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFrom('field');
      } else {
        handleEscape(event);
      }
    },
    [
      nonModal,
      open,
      tabLeavesTrigger,
      close,
      handleEscape,
      triggerReadonly,
      openFrom,
      queueDayFocus,
      commitTyped,
      closeOnSelect,
      showTime,
    ],
  );

  /**
   * Le focus quitte le declencheur pour de bon. Un panneau non modal n'a ni
   * arriere-plan ni piege de focus : passer au champ suivant est une fermeture.
   */
  const onTriggerFocusOut = useCallback(
    (event: ReactFocusEvent<HTMLDivElement>) => {
      if (!nonModal || !open) return;
      const next = event.relatedTarget as Node | null;
      if (panelContains(next) || triggerContains(next)) return;
      close(false);
    },
    [nonModal, open, panelContains, triggerContains, close],
  );

  /** Le focus quitte un panneau non modal : meme fermeture, de l'autre cote. */
  const onPanelFocusOut = useCallback(
    (event: ReactFocusEvent<HTMLElement>) => {
      if (inline || !nonModal || !open) return;
      const next = event.relatedTarget as Node | null;
      if (!next) return;
      if (panelContains(next) || triggerContains(next)) return;
      close(false);
    },
    [inline, nonModal, open, panelContains, triggerContains, close],
  );

  /**
   * Presser la structure meme du panneau ne doit pas tirer le focus hors du
   * champ : un panneau non modal se ferait renvoyer par son propre focusout.
   * Ses controles gardent le comportement par defaut.
   */
  const onPanelMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!nonModal) return;
      if ((event.target as HTMLElement | null)?.closest('button, input')) return;
      event.preventDefault();
    },
    [nonModal],
  );

  // --- Heure ---------------------------------------------------------------
  const displayHours = hourFormat === '24' ? hours : hours % 12 === 0 ? 12 : hours % 12;
  const meridiem: 'AM' | 'PM' = hours < 12 ? 'AM' : 'PM';
  const hoursLabel = pad(hourFormat === '12' ? displayHours : hours);
  const minutesLabel = pad(minutes);
  const hoursValue = hoursDraft ?? hoursLabel;
  const minutesValue = minutesDraft ?? minutesLabel;
  const hourBounds = hourFormat === '12' ? { min: 1, max: 12 } : { min: 0, max: 23 };
  const timeEditable = editableTime && !disabled && !readOnly;
  /**
   * Les compteurs restent utilisables meme sans `editableTime` : seuls
   * `disabled` et `readOnly` les figent.
   */
  const timeControlsEnabled = !disabled && !readOnly;

  const to24 = useCallback(
    (displayed: number) => (displayed % 12) + (meridiem === 'PM' ? 12 : 0),
    [meridiem],
  );

  const stepHours = useCallback(
    (dir: 1 | -1) => {
      if (!timeControlsEnabled) return;
      setHoursDraft(null);
      const next = (((hours + dir) % 24) + 24) % 24;
      setHours(next);
      applyTime(next, minutes);
    },
    [timeControlsEnabled, hours, minutes, applyTime],
  );

  const stepMinutes = useCallback(
    (dir: 1 | -1) => {
      if (!timeControlsEnabled) return;
      setMinutesDraft(null);
      const s = Math.max(1, stepMinute);
      const next = (((minutes + dir * s) % 60) + 60) % 60;
      setMinutes(next);
      applyTime(hours, next);
    },
    [timeControlsEnabled, minutes, stepMinute, hours, applyTime],
  );

  const toggleMeridiem = useCallback(() => {
    if (!timeControlsEnabled) return;
    setHoursDraft(null);
    const next = (hours + 12) % 24;
    setHours(next);
    applyTime(next, minutes);
  }, [timeControlsEnabled, hours, minutes, applyTime]);

  /**
   * Garde un champ d'heure a deux chiffres au plus et refuse ce qui ne pourra
   * jamais etre dans les bornes (« 33 », ou « 13 » sur une horloge 12 h) : le
   * champ revient a `current`, donc la frappe est simplement refusee.
   */
  const acceptTimeDigits = useCallback(
    (el: HTMLInputElement, current: string, max: number): string | null => {
      const digits = el.value.replace(/\D/g, '').slice(0, 2);
      const accepted = !digits || Number(digits) <= max;
      const text = accepted ? digits : current;
      if (el.value !== text) {
        el.value = text;
        el.setSelectionRange(text.length, text.length);
      }
      return accepted ? digits : null;
    },
    [],
  );

  const onHoursInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!timeEditable) return;
      const digits = acceptTimeDigits(event.currentTarget, hoursValue, hourBounds.max);
      if (digits === null) return;
      setHoursDraft(digits);
      const n = Number(digits);
      if (!digits || n < hourBounds.min || n > hourBounds.max) return; // pas encore une heure
      const next = hourFormat === '12' ? to24(n) : n;
      setHours(next);
      applyTime(next, minutes);
    },
    [
      timeEditable,
      acceptTimeDigits,
      hoursValue,
      hourBounds.max,
      hourBounds.min,
      hourFormat,
      to24,
      minutes,
      applyTime,
    ],
  );

  const onMinutesInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!timeEditable) return;
      const digits = acceptTimeDigits(event.currentTarget, minutesValue, 59);
      if (digits === null || !digits) return;
      setMinutesDraft(digits);
      const n = Number(digits);
      setMinutes(n);
      applyTime(hours, n);
    },
    [timeEditable, acceptTimeDigits, minutesValue, hours, applyTime],
  );

  // --- Clavier des grilles -------------------------------------------------
  /** Decale la fenetre de mois visible juste assez pour contenir `date`. */
  const ensureMonthVisible = useCallback(
    (date: Date) => {
      const start = firstOfMonth(viewDate);
      const end = addMonths(start, monthCount - 1);
      const month = firstOfMonth(date);
      if (month < start) setViewDate(month);
      else if (month > end) setViewDate(addMonths(month, 1 - monthCount));
    },
    [viewDate, monthCount],
  );

  const onGridKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      const current = focusedDate;
      let next: Date;
      switch (event.key) {
        case 'ArrowLeft':
          next = addDays(current, -1);
          break;
        case 'ArrowRight':
          next = addDays(current, 1);
          break;
        case 'ArrowUp':
          next = addDays(current, -7);
          break;
        case 'ArrowDown':
          next = addDays(current, 7);
          break;
        case 'Home':
          next = addDays(current, -((current.getDay() - firstDayOfWeek + 7) % 7));
          break;
        case 'End':
          next = addDays(current, 6 - ((current.getDay() - firstDayOfWeek + 7) % 7));
          break;
        case 'PageUp':
          next = addMonths(current, event.shiftKey ? -12 : -1);
          break;
        case 'PageDown':
          next = addMonths(current, event.shiftKey ? 12 : 1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          selectDay(buildDay(startOfDay(current), viewDate));
          return;
        case 'Escape':
          handleEscape(event);
          return;
        default:
          return;
      }
      event.preventDefault();
      setFocusedDate(startOfDay(next));
      ensureMonthVisible(next);
      queueDayFocus();
    },
    [
      focusedDate,
      firstDayOfWeek,
      selectDay,
      buildDay,
      viewDate,
      handleEscape,
      ensureMonthVisible,
      queueDayFocus,
    ],
  );

  /**
   * Mathematique de fleches partagee par une grille de taille fixe a `columns`
   * colonnes : la seule part de focus rotatif vraiment commune aux trois
   * grilles. `PageUp`/`PageDown`/`Entree`/Echap different par grille et restent
   * dans leur propre gestionnaire.
   */
  const navigateGridIndex = useCallback(
    (key: string, current: number, columns: number, count: number): number | null => {
      switch (key) {
        case 'ArrowLeft':
          return Math.max(0, current - 1);
        case 'ArrowRight':
          return Math.min(count - 1, current + 1);
        case 'ArrowUp':
          return current - columns >= 0 ? current - columns : current;
        case 'ArrowDown':
          return current + columns < count ? current + columns : current;
        case 'Home':
          return Math.floor(current / columns) * columns;
        case 'End':
          return Math.min(count - 1, Math.floor(current / columns) * columns + columns - 1);
        default:
          return null;
      }
    },
    [],
  );

  const onMonthGridKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const cell = months[focusedMonthIndex];
        if (cell) selectMonth(cell);
        return;
      }
      if (event.key === 'Escape') {
        handleEscape(event);
        return;
      }
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();
        const dir = event.key === 'PageUp' ? -1 : 1;
        const step_ = event.shiftKey ? 10 : 1;
        setViewDate(new Date(viewDate.getFullYear() + dir * step_, viewDate.getMonth(), 1));
        queueMonthFocus();
        return;
      }
      const next = navigateGridIndex(event.key, focusedMonthIndex, 3, 12);
      if (next === null) return;
      event.preventDefault();
      setFocusedMonthIndex(next);
      queueMonthFocus();
    },
    [
      selectMonth,
      months,
      focusedMonthIndex,
      handleEscape,
      viewDate,
      queueMonthFocus,
      navigateGridIndex,
    ],
  );

  const onYearGridKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const cell = years[focusedYear - decadeStart];
        if (cell) selectYear(cell);
        return;
      }
      if (event.key === 'Escape') {
        handleEscape(event);
        return;
      }
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();
        const dir = event.key === 'PageUp' ? -1 : 1;
        const delta = (event.shiftKey ? 100 : 10) * dir;
        setViewDate(new Date(viewDate.getFullYear() + delta, viewDate.getMonth(), 1));
        setFocusedYear(focusedYear + delta);
        queueYearFocus();
        return;
      }
      const idx = navigateGridIndex(event.key, focusedYear - decadeStart, 2, 10);
      if (idx === null) return;
      event.preventDefault();
      setFocusedYear(decadeStart + idx);
      queueYearFocus();
    },
    [
      selectYear,
      years,
      focusedYear,
      decadeStart,
      handleEscape,
      viewDate,
      queueYearFocus,
      navigateGridIndex,
    ],
  );

  /**
   * La cellule au focus rotatif. Les cellules d'un mois voisin sont exclues,
   * pour qu'une date montree deux fois dans deux panneaux adjacents ne donne
   * qu'un seul arret de tabulation.
   */
  const isFocusableDay = useCallback(
    (cell: DatepickerDay) => !cell.otherMonth && isSameDay(cell.date, focusedDate),
    [focusedDate],
  );

  // --- Rendu du declencheur ------------------------------------------------
  /**
   * L'action de droite efface au lieu de basculer le panneau. Conditionne a
   * `!showIcon` : la bascule calendrier gagne toujours l'unique emplacement
   * d'icone quand elle est affichee, donc il reste toujours une cible pour
   * rouvrir le panneau et choisir une autre date. La croix ne la remplace que
   * dans les configurations qui l'ont masquee, ou elle est la seule affordance
   * restante pour vider le champ sans clavier.
   */
  const showClearButton = showClear && hasValue && !disabled && !readOnly && !showIcon;
  const triggerIcon = showClearButton
    ? 'xmark'
    : !showIcon
      ? undefined
      : timeOnly && icon === 'calendar'
        ? 'clock'
        : icon;
  const triggerIconAriaLabel = showClearButton ? clearLabel : iconAriaLabel;

  const onIconClick = useCallback(
    (event: ReactMouseEvent) => {
      // Empeche le clic de remonter au champ, qui appellerait `openFrom('field')`
      // juste derriere celui-ci.
      event.stopPropagation();
      if (showClearButton) clear();
      else if (open) close();
      else openFrom('icon');
    },
    [showClearButton, clear, open, close, openFrom],
  );

  // --- Rendu du panneau ----------------------------------------------------
  const buttonBarContext: DatepickerButtonBarContext = useMemo(
    () => ({ today: selectToday, clear }),
    [selectToday, clear],
  );

  const navButton = (dir: 'prev' | 'next') => (
    <button
      type="button"
      className="ui-datepicker-nav"
      data-ripple={ripple ? 'on' : 'off'}
      aria-label={dir === 'prev' ? prevAriaLabel : nextAriaLabel}
      onClick={() => step(dir === 'prev' ? -1 : 1)}
    >
      <UiIcon name={dir === 'prev' ? 'chevron-left' : 'chevron-right'} size="sm" />
    </button>
  );

  const timeButton = (label: string, glyph: 'chevron-up' | 'chevron-down', onClick: () => void) => (
    <button
      type="button"
      className="ui-datepicker-time-btn"
      tabIndex={-1}
      disabled={!timeControlsEnabled}
      aria-label={label}
      onClick={onClick}
    >
      <UiIcon name={glyph} size="sm" />
    </button>
  );

  const panelContent = (
    <>
      {showCalendar && (
        <>
          {/* En-tete partage (un seul mois) : precedent / titre (forage) / suivant.
              En multi-mois, les fleches et les titres vivent dans chaque panneau. */}
          {singleMonth && (
            <div className="ui-datepicker-header">
              {navButton('prev')}
              <button
                type="button"
                className="ui-datepicker-title _button"
                aria-live="polite"
                disabled={currentView === 'year'}
                onClick={onHeaderClick}
              >
                {headerLabel}
              </button>
              {navButton('next')}
            </div>
          )}

          {currentView === 'year' && (
            /*
              eslint-disable-next-line jsx-a11y/interactive-supports-focus --
              Motif grille de l'APG : le clavier est delegue au conteneur, mais
              le focus vit sur les cellules, qui portent le tabindex rotatif. Un
              tabindex sur la grille elle-meme ajouterait un arret parasite.
            */
            <div className="ui-datepicker-picker _year" role="grid" onKeyDown={onYearGridKeyDown}>
              {yearRows.map((row, i) => (
                <div className="ui-datepicker-picker-row" role="row" key={i}>
                  {row.map((y) => (
                    <button
                      key={y.year}
                      type="button"
                      role="gridcell"
                      data-ripple={ripple ? 'on' : 'off'}
                      className={cx(
                        'ui-datepicker-cell',
                        y.selected && '_selected',
                        y.year === focusedYear && '_focusable',
                      )}
                      disabled={y.disabled}
                      tabIndex={y.year === focusedYear ? 0 : -1}
                      aria-selected={y.selected}
                      onClick={() => selectYear(y)}
                    >
                      {y.year}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {currentView === 'month' && (
            /*
              eslint-disable-next-line jsx-a11y/interactive-supports-focus --
              Meme motif que la grille des annees ci-dessus.
            */
            <div className="ui-datepicker-picker _month" role="grid" onKeyDown={onMonthGridKeyDown}>
              {monthRows.map((row, i) => (
                <div className="ui-datepicker-picker-row" role="row" key={i}>
                  {row.map((m) => (
                    <button
                      key={m.index}
                      type="button"
                      role="gridcell"
                      data-ripple={ripple ? 'on' : 'off'}
                      className={cx(
                        'ui-datepicker-cell',
                        m.selected && '_selected',
                        m.index === focusedMonthIndex && '_focusable',
                      )}
                      disabled={m.disabled}
                      tabIndex={m.index === focusedMonthIndex ? 0 : -1}
                      aria-selected={m.selected}
                      onClick={() => selectMonth(m)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {currentView === 'date' && (
            /*
              eslint-disable-next-line jsx-a11y/no-static-element-interactions --
              Simple relais de touches : le `role="grid"` et le focus vivent
              plus bas, sur chaque panneau de mois et ses cellules. Ce div ne
              fait que factoriser le gestionnaire commun aux panneaux.
            */
            <div className="ui-datepicker-months" onKeyDown={onGridKeyDown}>
              {monthPanels.map((mp) => (
                <div className="ui-datepicker-month" key={mp.monthDate.getTime()}>
                  {!singleMonth && (
                    <div className="ui-datepicker-subheader">
                      {mp.showPrev ? (
                        navButton('prev')
                      ) : (
                        <span className="ui-datepicker-nav-spacer" aria-hidden="true" />
                      )}
                      <span className="ui-datepicker-title" aria-live="polite">
                        {mp.label}
                      </span>
                      {mp.showNext ? (
                        navButton('next')
                      ) : (
                        <span className="ui-datepicker-nav-spacer" aria-hidden="true" />
                      )}
                    </div>
                  )}

                  <div className="ui-datepicker-grid" role="grid">
                    <div className="ui-datepicker-weekdays" role="row">
                      {weekDayNames.map((wd, i) => (
                        <span
                          className="ui-datepicker-weekday"
                          role="columnheader"
                          aria-label={wd.full}
                          key={i}
                        >
                          {wd.short}
                        </span>
                      ))}
                    </div>
                    {mp.weeks.map((week, w) => (
                      <div className="ui-datepicker-week" role="row" key={w}>
                        {week.map((cell) => (
                          <button
                            key={cell.ts}
                            type="button"
                            role="gridcell"
                            data-ripple={ripple ? 'on' : 'off'}
                            className={cx(
                              'ui-datepicker-day',
                              cell.selected && '_selected',
                              cell.today && !cell.selected && '_today',
                              cell.otherMonth && '_other-month',
                              cell.rangeStart && '_range-start',
                              cell.rangeEnd && '_range-end',
                              cell.inRange && '_in-range',
                              isFocusableDay(cell) && '_focusable',
                            )}
                            disabled={cell.disabled}
                            tabIndex={isFocusableDay(cell) ? 0 : -1}
                            aria-selected={cell.selected}
                            aria-current={cell.today ? 'date' : undefined}
                            aria-label={cell.ariaLabel}
                            onClick={() => selectDay(cell)}
                          >
                            {renderDay ? renderDay(cell) : cell.day}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showTime && (
        // Selection de l'heure : compteurs verticaux, motif ARIA spinbutton.
        <div className="ui-datepicker-time">
          <div className="ui-datepicker-time-unit">
            {timeButton(incrementHoursAriaLabel, 'chevron-up', () => stepHours(1))}
            <input
              className="ui-datepicker-time-value"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              role="spinbutton"
              aria-label={hoursAriaLabel}
              aria-valuenow={hourFormat === '12' ? displayHours : hours}
              aria-valuemin={hourBounds.min}
              aria-valuemax={hourBounds.max}
              aria-valuetext={hoursLabel}
              value={hoursValue}
              disabled={disabled}
              readOnly={!timeEditable}
              onChange={onHoursInput}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={() => setHoursDraft(null)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp' || event.key === 'PageUp') {
                  event.preventDefault();
                  stepHours(1);
                } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
                  event.preventDefault();
                  stepHours(-1);
                } else if (event.key === 'Enter') {
                  event.preventDefault(); // enregistre sur place, jamais soumettre le formulaire
                  setHoursDraft(null);
                }
              }}
            />
            {timeButton(decrementHoursAriaLabel, 'chevron-down', () => stepHours(-1))}
          </div>

          <span className="ui-datepicker-time-colon" aria-hidden="true">
            :
          </span>

          <div className="ui-datepicker-time-unit">
            {timeButton(incrementMinutesAriaLabel, 'chevron-up', () => stepMinutes(1))}
            <input
              className="ui-datepicker-time-value"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              role="spinbutton"
              aria-label={minutesAriaLabel}
              aria-valuenow={minutes}
              aria-valuemin={0}
              aria-valuemax={59}
              aria-valuetext={minutesLabel}
              value={minutesValue}
              disabled={disabled}
              readOnly={!timeEditable}
              onChange={onMinutesInput}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={() => setMinutesDraft(null)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp' || event.key === 'PageUp') {
                  event.preventDefault();
                  stepMinutes(1);
                } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
                  event.preventDefault();
                  stepMinutes(-1);
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  setMinutesDraft(null);
                }
              }}
            />
            {timeButton(decrementMinutesAriaLabel, 'chevron-down', () => stepMinutes(-1))}
          </div>

          {hourFormat === '12' && (
            <>
              <span className="ui-datepicker-time-colon" aria-hidden="true">
                :
              </span>
              <div className="ui-datepicker-time-unit">
                {timeButton(toggleMeridiemAriaLabel, 'chevron-up', toggleMeridiem)}
                <span
                  className="ui-datepicker-time-value"
                  role="spinbutton"
                  tabIndex={timeControlsEnabled ? 0 : -1}
                  aria-label={meridiemAriaLabel}
                  aria-valuetext={meridiem}
                  aria-disabled={!timeControlsEnabled || undefined}
                  onKeyDown={(event) => {
                    if (!timeControlsEnabled) return;
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      toggleMeridiem();
                    }
                  }}
                  onClick={toggleMeridiem}
                >
                  {meridiem}
                </span>
                {timeButton(toggleMeridiemAriaLabel, 'chevron-down', toggleMeridiem)}
              </div>
            </>
          )}
        </div>
      )}

      {(showButtonBar || renderButtonBar) && (
        <div className="ui-datepicker-buttonbar">
          {renderButtonBar ? (
            renderButtonBar(buttonBarContext)
          ) : (
            <>
              <UiButton size="small" level="low" label={todayLabel} onClick={selectToday} />
              <UiButton size="small" level="low" label={clearLabel} onClick={clear} />
            </>
          )}
        </div>
      )}
    </>
  );

  const panelProps = {
    id: panelId,
    className: cx(
      'ui-datepicker-panel',
      inline && '_inline',
      rangeComplete && '_range-complete',
      panelClassName,
    ),
    role: 'dialog' as const,
    'aria-label': rest.label || rest['aria-label'] || panelAriaLabel,
    onFocus: undefined,
    onBlur: onPanelFocusOut,
    onMouseDown: onPanelMouseDown,
  };

  if (inline) {
    return (
      <div className={cx('ui-datepicker', '_inline', className)}>
        <div {...panelProps} ref={setPanel} aria-modal={undefined}>
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <div className={cx('ui-datepicker', className)}>
      {/*
        eslint-disable-next-line jsx-a11y/no-static-element-interactions --
        Enveloppe de commodite : le focus et le clavier sont portes par le champ
        natif qu'elle contient. Elle ecoute au-dessus de lui parce qu'un clic ou
        une touche peut tomber sur le libelle, l'indication de format ou le
        bouton de bascule, tous hors du champ.
      */}
      <div
        ref={wrapperRef}
        className="ui-datepicker-trigger"
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
        onBlur={onTriggerFocusOut}
      >
        <UiField
          label={rest.label}
          htmlFor={field.inputId}
          required={rest.required}
          size={rest.size}
          level={field.level}
          floatLabel={rest.floatLabel}
          filled={displayValue !== ''}
          disabled={disabled}
          readOnly={readOnly}
          message={field.message}
          messageId={field.messageId}
          showMessageIcon={rest.showMessageIcon}
          messageIcon={rest.messageIcon}
          onBoxRef={position.setAnchor}
          footer={
            resolvedFormatHint ? (
              <span id={formatHintId} className="ui-datepicker-format-hint">
                {resolvedFormatHint}
              </span>
            ) : undefined
          }
          suffix={
            triggerIcon ? (
              <button
                type="button"
                className="ui-datepicker-toggle"
                aria-label={triggerIconAriaLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                disabled={disabled}
                onClick={onIconClick}
              >
                <UiIcon name={triggerIcon} size={iconSize} />
              </button>
            ) : undefined
          }
        >
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
            }}
            id={field.inputId}
            name={name}
            type="text"
            className="ui-datepicker-input"
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            aria-label={field.ariaLabel}
            aria-labelledby={rest['aria-labelledby']}
            aria-describedby={
              resolvedFormatHint
                ? [field.describedBy, formatHintId].filter(Boolean).join(' ')
                : field.describedBy
            }
            aria-invalid={field.ariaInvalid}
            aria-required={rest.required || undefined}
            autoComplete={autoComplete ?? 'off'}
            tabIndex={tabIndex}
            placeholder={rest.floatLabel && rest.label ? '' : resolvedPlaceholder}
            value={displayValue}
            disabled={disabled}
            readOnly={triggerReadonly}
            onChange={(event) => onTriggerInput(event.currentTarget.value)}
            onFocus={(event) => {
              onFocus?.(event);
              if (disabled || readOnly) return;
              // `showOnFocus` n'ouvre que sur un focus issu d'un geste, et jamais
              // sur celui que nous rendons nous-memes a la fermeture.
              if (showOnFocus && recentGesture.current && !suppressFocusOpen.current) {
                openFrom('focus');
              }
            }}
            onBlur={(event) => {
              commitTyped();
              onBlur?.(event);
            }}
          />
        </UiField>
      </div>

      {nonModal ? (
        <div
          {...panelProps}
          ref={setPanel}
          // Tant que la position n'est pas calculée, le panneau reste dans son
          // état fermé : `computePosition` est asynchrone, et peindre l'image
          // d'avant fait apparaître le panneau au mauvais endroit avant qu'il
          // se replace. Reconnu par `utils.overlay-motion`.
          data-unpositioned={position.isPositioned ? undefined : ''}
          popover="manual"
          style={position.panelStyle as CSSProperties}
        >
          {panelContent}
        </div>
      ) : (
        <dialog
          {...panelProps}
          ref={setPanel as unknown as Ref<HTMLDialogElement>}
          aria-modal="true"
          data-unpositioned={position.isPositioned ? undefined : ''}
          style={position.panelStyle as CSSProperties}
        >
          {panelContent}
        </dialog>
      )}
    </div>
  );
}
