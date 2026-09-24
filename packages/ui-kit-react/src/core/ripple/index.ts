/* Les styles de l'onde vivent dans la feuille globale du kit (`styles/base/_ripple.scss`). */

export {
  UI_RIPPLE_DEFAULT_SELECTOR,
  UI_RIPPLE_INTERACTIVE_SELECTOR,
  launchRipple,
  bindRipple,
  delegateRipple,
  type UiRippleSettings,
} from './ripple-engine';
export {
  UiRippleProvider,
  useUiRipple,
  useUiRippleScope,
  type UiRippleProviderProps,
  type UiRippleOptions,
  type UiRippleScopeOptions,
  type UiRippleBinding,
} from './ripple';
