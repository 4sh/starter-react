/**
 * Aides de date pures, sans dependance au framework, partagees par les champs
 * qui franchissent la frontiere `Date` <-> chaine ISO (`ui-datepicker`, `ui-input-date`).
 */

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Construit une date et refuse les composantes qui ont deborde (31 fevrier). */
export function finalizeParsed(
  year: number,
  month: number,
  day: number,
  h: number,
  min: number,
): Date | null {
  if (month < 0 || month > 11 || day < 1 || day > 31 || h > 23 || min > 59) return null;
  const d = new Date(year, month, day, h, min, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const ISO_TIME_RE = /^(\d{2}):(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Serialise une `Date` en `"yyyy-MM-dd"` depuis ses composantes **locales**.
 * Jamais `toISOString()`, qui convertit en UTC et peut decaler le jour de +/-1
 * selon le fuseau.
 */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** `"HH:mm"`, la forme qu'un `<input type="time">` natif lit et ecrit. */
export function toIsoTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `"yyyy-MM-ddTHH:mm"`, partie date construite en local comme {@link toIsoDate}. */
export function toIsoDateTime(d: Date): string {
  return `${toIsoDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Lecteur strict de `"yyyy-MM-dd"` (rejette le reste, debordements compris). */
export function parseIsoDate(s: string): Date | null {
  const m = ISO_DATE_RE.exec(s);
  if (!m) return null;
  return finalizeParsed(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0);
}

/** Lecteur strict de `"yyyy-MM-ddTHH:mm"` (aller-retour de `showTime`/`timeOnly`). */
export function parseIsoDateTime(s: string): Date | null {
  const m = ISO_DATETIME_RE.exec(s);
  if (!m) return null;
  return finalizeParsed(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

/**
 * Lecteur strict de `"HH:mm"`, ancre sur `reference` (aujourd'hui par defaut).
 *
 * Une heure nue n'est pas un instant : l'appelant dit sur quel jour elle tombe,
 * pour rendre la meme `Date` complete que `ui-datepicker` en mode `timeOnly`.
 */
export function parseIsoTime(s: string, reference: Date = new Date()): Date | null {
  const m = ISO_TIME_RE.exec(s);
  if (!m) return null;
  return finalizeParsed(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    Number(m[1]),
    Number(m[2]),
  );
}

/**
 * Accepte une `Date` telle quelle, ou lit une chaine `"yyyy-MM-dd"` : les props
 * de configuration (`minDate`, `maxDate`, `disabledDates`) prennent les deux
 * formes. Une chaine invalide degrade en `null`, donc en absence de contrainte,
 * plutot que de lever : une configuration malformee ne doit pas casser le
 * champ.
 */
export function normalizeDateInput(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  return v instanceof Date ? v : parseIsoDate(v);
}
