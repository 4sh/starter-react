# @4sh/ui-kit-react

_**English** · [Français](./README.fr.md)_

Headless React components from the 4SH Design System: typed props, hand-written behaviour,
styled exclusively through design tokens. Ships an MCP server for AI coding agents.

**Documentation (Storybook)**: <https://4sh.github.io/starter-react/>

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

| Family        | Components                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`        | `ui-icon`, `ui-image`                                                                                                                                                                                                                                                                                                                                                                                                |
| `actions`     | `ui-button`, `ui-button-split`, `ui-link`, `ui-speed-dial`                                                                                                                                                                                                                                                                                                                                                           |
| `forms`       | `ui-autocomplete`, `ui-checkbox`, `ui-datepicker`, `ui-editor`, `ui-field`, `ui-file-upload`, `ui-input`, `ui-input-date`, `ui-input-group`, `ui-input-mask`, `ui-input-number`, `ui-input-otp`, `ui-input-tags`, `ui-knob`, `ui-label`, `ui-nudger`, `ui-radio`, `ui-rating`, `ui-segment-control`, `ui-select`, `ui-slider`, `ui-swatch-picker`, `ui-textarea`, `ui-toggle`, `ui-toggle-block`, `ui-toggle-button` |
| `informative` | `ui-accordion`, `ui-alert`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-chip`, `ui-empty-state`, `ui-helper`, `ui-progress-bar`, `ui-read-only`, `ui-separator`, `ui-skeleton`, `ui-spinner`, `ui-tag`, `ui-toast`, `ui-tooltip`                                                                                                                                                                                 |
| `layout`      | `ui-bottom-sheet`, `ui-card`, `ui-drawer`, `ui-modal`, `ui-popover`                                                                                                                                                                                                                                                                                                                                                  |
| `navigation`  | `ui-bottom-tab-bar`, `ui-breadcrumb`, `ui-context-menu`, `ui-menu`, `ui-sidebar`, `ui-stepper`, `ui-tabs`                                                                                                                                                                                                                                                                                                            |
| `table`       | `ui-paginator`, `ui-table`                                                                                                                                                                                                                                                                                                                                                                                           |

**62 components** out of the Design System's 62. Roadmap: [components-index.md](https://github.com/4sh/starter-react/blob/main/docs/components-index.md).

## Cross-cutting entry points

| Subpath         | Contents                                                        |
| --------------- | --------------------------------------------------------------- |
| `/theming`      | `UiThemeProvider`, `useUiTheme`, `useUiBrand`                   |
| `/theme-script` | `uiThemeBootstrapScript`, the only entry without `'use client'` |
| `/types`        | `UiLevel`, `UiSubLevel`, `UiFeedbackLevel` (types only)         |
| `/utils`        | `cx` (class name concatenation)                                 |

## Server rendering

Every interactive component carries `'use client'`, preserved through the build: the package
works as-is under the Next App Router.

To avoid the light → dark flash on first paint, inject `uiThemeBootstrapScript()` into the
`<head>`. It applies the stored mode before the first paint, which the provider cannot do
since it only runs afterwards. It comes from its own subpath, which carries no
`'use client'`, so a server layout can call it:

```tsx
// app/layout.tsx
import { uiThemeBootstrapScript } from '@4sh/ui-kit-react/theme-script';

<head>
  <script dangerouslySetInnerHTML={{ __html: uiThemeBootstrapScript() }} />
</head>;
```

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

## AI agent (MCP server)

A small MCP server ships **inside this package**, under `mcp/`: bundled at build time, it
needs nothing else installed. It gives an MCP-aware coding agent (Claude Code, Claude
Desktop, Cursor…) the component catalog, each component's exact API (props, allowed values,
defaults), its `--ui-*` hooks and the Storybook doc, full-text search included. Four tools:
`list_components`, `get_component_doc`, `search_docs` and `get_shared_config`.

Nothing registers it for you: add it once to your project's `.mcp.json`.

```json
{
  "mcpServers": {
    "ui-kit-react": {
      "command": "npx",
      "args": ["--no-install", "ui-kit-react-mcp"]
    }
  }
}
```

Installing links `ui-kit-react-mcp` into `node_modules/.bin/`, so this form resolves
whatever directory your MCP client starts the server from. The server serves the doc of the
kit version it ships with, and needs Node 22 or later.

## Dependencies

Two, each imported by exactly one internal file: `@floating-ui/react-dom` for anchored
positioning and `@tanstack/react-virtual` for virtualised lists. `react` and `react-dom` are
peer dependencies. Most components therefore stay dependency-free even when copied into
your own codebase. See [DECISIONS.md](https://github.com/4sh/starter-react/blob/main/docs/DECISIONS.md) and its D6.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
