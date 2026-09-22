# @4sh/ui-kit-react

_**English** · [Français](./README.fr.md)_

Headless React components from the 4SH Design System: typed props, hand-written behaviour,
styled exclusively through design tokens. **No runtime dependencies.**

**Documentation (Storybook)**: to be deployed in phase 5.

> ⚠️ Not published yet (`private: true`). See `docs/PUBLISHING.md` at the repository root.

---

## Install

```bash
pnpm add @4sh/ui-kit-react
```

Two one-time steps in the application:

```tsx
// The foundation: tokens (3 brands × light/dark × responsive), base layer, utility
// classes. Without it, the components render unstyled.
import '@4sh/ui-kit-react/styles.css';

// The active mode and brand, set on <html> — which is what the tokens expect.
import { UiThemeProvider } from '@4sh/ui-kit-react/theming';

<UiThemeProvider>
  <App />
</UiThemeProvider>;
```

A component's CSS travels with it: importing the component is enough.

```tsx
import { UiIcon } from '@4sh/ui-kit-react/ui-icon';

<UiIcon name="circle-user" size="lg" />;
```

⚠️ **The category is not part of the import path**: `@4sh/ui-kit-react/ui-icon`, not
`@4sh/ui-kit-react/base/ui-icon`. It only groups files inside the repository, so moving a
component between families is never a breaking change for you.

## Families

| Family        | Components                                                                                                                                                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`        | `ui-icon`                                                                                                                                                                                                                                                                                                                              |
| `actions`     | `ui-button`, `ui-button-split`, `ui-link`                                                                                                                                                                                                                                                                                              |
| `forms`       | `ui-autocomplete`, `ui-checkbox`, `ui-datepicker`, `ui-field`, `ui-input`, `ui-input-date`, `ui-input-group`, `ui-input-mask`, `ui-input-number`, `ui-input-tags`, `ui-label`, `ui-nudger`, `ui-radio`, `ui-rating`, `ui-segment-control`, `ui-select`, `ui-slider`, `ui-textarea`, `ui-toggle`, `ui-toggle-block`, `ui-toggle-button` |
| `informative` | `ui-alert`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-chip`, `ui-empty-state`, `ui-helper`, `ui-progress-bar`, `ui-read-only`, `ui-separator`, `ui-skeleton`, `ui-spinner`, `ui-tag`, `ui-tooltip`                                                                                                                               |
| `layout`      | `ui-card`, `ui-drawer`, `ui-modal`, `ui-popover`                                                                                                                                                                                                                                                                                       |
| `navigation`  | `ui-context-menu`, `ui-menu`, `ui-tabs`                                                                                                                                                                                                                                                                                                |
| `table`       | `ui-paginator`, `ui-table`                                                                                                                                                                                                                                                                                                             |

**48 components** out of the Design System's 62. Roadmap: `docs/components-index.md`.

## Cross-cutting entry points

| Subpath    | Contents                                                                |
| ---------- | ----------------------------------------------------------------------- |
| `/theming` | `UiThemeProvider`, `useUiTheme`, `useUiBrand`, `uiThemeBootstrapScript` |
| `/types`   | `UiLevel`, `UiSubLevel`, `UiFeedbackLevel` (types only)                 |
| `/utils`   | `cx` (class name concatenation)                                         |

## Server rendering

Every interactive component carries `'use client'`, preserved through the build: the package
works as-is under the Next App Router.

To avoid the light → dark flash on first paint, inject `uiThemeBootstrapScript()` into the
`<head>`. It applies the stored mode before the first paint, which the provider cannot do
since it only runs afterwards.

## Theming

Two levels, neither of which touches the kit's CSS:

1. **The tokens**, for colours, spacing and radii. This is the normal level.
2. **The `--ui-*` hooks**, for a structural value on one component or one instance.
   `src/styles/component-vars.scss` is the complete, copy-me list, with each variable's
   role.

```css
/* The whole kit */
:root {
  --ui-icon-size-lg: 28px;
}

/* A single instance */
.my-icon {
  --ui-icon-size: 64px;
}
```

## Dependencies

**None.** The package declares `react` and `react-dom` as peer dependencies and nothing
else. Two behaviour dependencies are budgeted for later, `@floating-ui/react-dom` for
anchored positioning and `@tanstack/react-virtual` for virtualised lists, and each will be
imported by exactly one internal file. Most components therefore stay dependency-free even
when copied into your own codebase. See `docs/DECISIONS.md` and its D6.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
