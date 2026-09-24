/**
 * Pure masking engine, shared by `ui-input-mask` and `ui-datepicker`: framework-free
 * functions for any field that needs literal-inserting input masking.
 */

/** Mask tokens → accepted character class. */
export const MASK_TOKENS: Record<string, RegExp> = {
  '9': /[0-9]/,
  a: /[a-zA-Z]/,
  '*': /[a-zA-Z0-9]/,
};

export interface MaskBounds {
  min: number;
  max: number;
}

export interface MaskSlot {
  char: string | null;
  rgx?: RegExp;
  bound?: MaskBounds & { pos: number; len: number };
}

export interface MaskBuildResult {
  display: string;
  masked: string;
  data: string;
  tokenIndices: number[];
}

/** Parse the `ranges` input (`"1-31 1-12 1900-2100"`) into one bound per numeric segment. */
export function parseMaskRanges(ranges: string): (MaskBounds | null)[] {
  return ranges
    .trim()
    .split(/\s+/)
    .map((part) => {
      const m = /^(\d+)-(\d+)$/.exec(part);
      return m ? { min: Number(m[1]), max: Number(m[2]) } : null;
    });
}

/**
 * Resolve the mask template into slots: literals, input slots, and the `ranges` bounds attached
 * to every slot of the numeric segment (consecutive `9` tokens) it belongs to.
 */
export function buildMaskSlots(
  mask: string,
  bounds: (MaskBounds | null)[],
  tokens: Record<string, RegExp> = MASK_TOKENS,
): MaskSlot[] {
  const slots: MaskSlot[] = [];
  const segments: MaskSlot[][] = [];
  let segment: MaskSlot[] | null = null;

  for (const m of mask) {
    const rgx = tokens[m];
    const slot: MaskSlot = rgx ? { char: null, rgx } : { char: m };
    slots.push(slot);
    if (rgx && m === '9') {
      if (!segment) segments.push((segment = []));
      segment.push(slot);
    } else {
      segment = null;
    }
  }

  // Every segment gets a `.bound`, even unranged ones (±Infinity): `atSegmentEnd` needs
  // `pos`/`len` to auto-insert the literal that follows it.
  segments.forEach((seg, i) => {
    const range = bounds[i] ?? { min: -Infinity, max: Infinity };
    seg.forEach((slot, pos) => (slot.bound = { ...range, pos, len: seg.length }));
  });

  return slots;
}

/** Keep only the data characters (alphanumeric) of a raw input string. */
export function extractMaskData(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Can `ch` fill this slot? It must match the token class and: when the segment is bounded
 * AND `enforceBounds`: the digits typed so far plus `ch` must still admit at least one in-range
 * completion of the remaining positions (`2` then `4` is refused on `0-23`, `2` then `3` is
 * accepted).
 *
 * `enforceBounds = false` skips that second check (the token class still applies): for
 * re-deriving the mask after a deletion, where the bounds check could discard a still-valid
 * residual digit and misalign every following segment. See `autoFormatSegments`.
 */
export function acceptsMaskChar(
  slot: MaskSlot,
  segment: string,
  ch: string,
  enforceBounds = true,
): boolean {
  if (!slot.rgx?.test(ch)) return false;
  const bound = slot.bound;
  if (!enforceBounds || !bound) return true;
  const scale = 10 ** (bound.len - bound.pos - 1);
  const low = Number(segment + ch) * scale;
  return low <= bound.max && low + scale - 1 >= bound.min;
}

/** Apply the mask template to a sequence of data characters (fills empty positions with `slotChar`). */
export function applyMaskTemplate(
  slots: MaskSlot[],
  data: string,
  slotChar: string,
): MaskBuildResult {
  let di = 0;
  let display = '';
  let masked = '';
  let lastFilled = 0;
  let used = '';
  const tokenIndices: number[] = [];
  // Characters already accepted in the current numeric segment (drives the bounds check).
  let segment = '';

  for (const slot of slots) {
    if (slot.char !== null) {
      display += slot.char;
      masked += slot.char;
      continue;
    }
    tokenIndices.push(display.length);
    if (!slot.bound || slot.bound.pos === 0) segment = '';
    while (di < data.length && !acceptsMaskChar(slot, segment, data.charAt(di))) di++;
    if (di < data.length) {
      const ch = data.charAt(di);
      display += ch;
      masked += ch;
      used += ch;
      if (slot.bound) segment += ch;
      di++;
      lastFilled = masked.length;
    } else {
      display += slotChar;
    }
  }
  // Masked value = up to the last typed character (no trailing literals/slots).
  return { display, masked: masked.slice(0, lastFilled), data: used, tokenIndices };
}

/** Caret position for `n` typed data characters (literals skipped, end-of-text once all filled). */
export function caretForMask(tokenIndices: number[], n: number, length: number): number {
  if (n <= 0) return tokenIndices[0] ?? 0;
  if (n >= tokenIndices.length) return length;
  return tokenIndices[n] ?? length;
}

/**
 * Auto-format-as-you-type variant of {@link applyMaskTemplate}: inserts a literal separator as
 * soon as the segment right before it is complete, and never pads unfilled positions (unlike
 * `applyMaskTemplate`, meant for a field that displays the full template at rest).
 */
export function autoFormatSegments(
  slots: MaskSlot[],
  data: string,
  { enforceBounds = true }: { enforceBounds?: boolean } = {},
): { text: string; tokenIndices: number[]; dataEnd: number } {
  let di = 0;
  let text = '';
  let segment = '';
  let atSegmentEnd = false;
  const tokenIndices: number[] = [];
  // Right after the last DATA character, never after an eager separator: a caret there lets
  // Backspace remove a digit rather than a separator that would be re-inserted.
  let dataEnd = 0;

  for (const slot of slots) {
    if (slot.char !== null) {
      // Every consecutive literal, for a multi-char separator (" - "). `atSegmentEnd` stays
      // as is: the next digit slot resets it before it is read again.
      if (atSegmentEnd) text += slot.char;
      continue;
    }
    tokenIndices.push(text.length);
    if (!slot.bound || slot.bound.pos === 0) segment = '';
    while (di < data.length && !acceptsMaskChar(slot, segment, data.charAt(di), enforceBounds))
      di++;
    if (di >= data.length) break;
    const ch = data.charAt(di);
    text += ch;
    dataEnd = text.length;
    if (slot.bound) segment += ch;
    atSegmentEnd = !!slot.bound && slot.bound.pos === slot.bound.len - 1;
    di++;
  }
  return { text, tokenIndices, dataEnd };
}
