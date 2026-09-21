/*
 * Socle partagé des champs. Il ne rend rien : il porte le contrat contrôlé /
 * non contrôlé, les types communs et le câblage ARIA.
 */

export { useControllableState, type UiControllableStateOptions } from './use-controllable-state';
export { useUiField, joinIds, type UiFieldWiring } from './use-ui-field';
export type { FieldSize, FieldLevel, FieldFloatLabel, UiFieldSharedProps } from './field-types';
export {
  MASK_TOKENS,
  parseMaskRanges,
  buildMaskSlots,
  extractMaskData,
  acceptsMaskChar,
  applyMaskTemplate,
  caretForMask,
  autoFormatSegments,
  type MaskBounds,
  type MaskSlot,
  type MaskBuildResult,
} from './mask-engine';
export { formatLabel } from './format-label';
export {
  startOfDay,
  firstOfMonth,
  isSameDay,
  addDays,
  addMonths,
  finalizeParsed,
  toIsoDate,
  toIsoTime,
  toIsoDateTime,
  parseIsoDate,
  parseIsoTime,
  parseIsoDateTime,
  normalizeDateInput,
} from './date-utils';
export {
  createOptionResolver,
  createRichOptionResolver,
  normalizeText,
  type OptionEntry,
  type OptionResolver,
  type OptionResolverFields,
} from './option-resolver';
