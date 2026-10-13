# @4sh/ui-kit-react

_[English](./README.md) · **Français**_

Composants React headless du Design System 4SH : props typées, comportement écrit à la
main, style piloté exclusivement par des jetons de design. Livré avec un serveur MCP pour
les agents de codage.

**Documentation (Storybook)** : <https://4sh.github.io/starter-react/>

---

## Installation

```bash
pnpm add @4sh/ui-kit-react
```

Deux choses à faire une fois, dans l'application :

```tsx
// La fondation : jetons (3 marques × clair/sombre × responsive), couche de base,
// classes utilitaires. Sans elle, les composants rendent sans style.
import '@4sh/ui-kit-react/styles.css';

// Le mode et la marque actifs, posés sur <html> — ce que les jetons attendent.
import { UiThemeProvider } from '@4sh/ui-kit-react/theming';

<UiThemeProvider>
  <App />
</UiThemeProvider>;
```

Le CSS de chaque composant voyage avec lui : importer le composant suffit.

```tsx
import { UiIcon } from '@4sh/ui-kit-react/ui-icon';

<UiIcon name="circle-user" size="lg" />;
```

⚠️ **La catégorie n'est pas dans le chemin d'import** : `@4sh/ui-kit-react/ui-icon`, pas
`@4sh/ui-kit-react/base/ui-icon`. Elle range les fichiers dans le dépôt, rien de plus.

## Les familles

| Famille       | Composants                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`        | `ui-icon`, `ui-image`                                                                                                                                                                                                                                                                                                                                                                                                |
| `actions`     | `ui-button`, `ui-button-split`, `ui-link`, `ui-speed-dial`                                                                                                                                                                                                                                                                                                                                                           |
| `forms`       | `ui-autocomplete`, `ui-checkbox`, `ui-datepicker`, `ui-editor`, `ui-field`, `ui-file-upload`, `ui-input`, `ui-input-date`, `ui-input-group`, `ui-input-mask`, `ui-input-number`, `ui-input-otp`, `ui-input-tags`, `ui-knob`, `ui-label`, `ui-nudger`, `ui-radio`, `ui-rating`, `ui-segment-control`, `ui-select`, `ui-slider`, `ui-swatch-picker`, `ui-textarea`, `ui-toggle`, `ui-toggle-block`, `ui-toggle-button` |
| `informative` | `ui-accordion`, `ui-alert`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-chip`, `ui-empty-state`, `ui-helper`, `ui-progress-bar`, `ui-read-only`, `ui-separator`, `ui-skeleton`, `ui-spinner`, `ui-tag`, `ui-toast`, `ui-tooltip`                                                                                                                                                                                 |
| `layout`      | `ui-bottom-sheet`, `ui-card`, `ui-drawer`, `ui-modal`, `ui-popover`                                                                                                                                                                                                                                                                                                                                                  |
| `navigation`  | `ui-bottom-tab-bar`, `ui-breadcrumb`, `ui-context-menu`, `ui-menu`, `ui-sidebar`, `ui-stepper`, `ui-tabs`                                                                                                                                                                                                                                                                                                            |
| `table`       | `ui-paginator`, `ui-table`                                                                                                                                                                                                                                                                                                                                                                                           |

**62 composants** sur les 62 du Design System. Feuille de route :
`docs/components-index.md`.

## Entrées transverses

| Sous-chemin     | Contenu                                                    |
| --------------- | ---------------------------------------------------------- |
| `/theming`      | `UiThemeProvider`, `useUiTheme`, `useUiBrand`              |
| `/theme-script` | `uiThemeBootstrapScript`, seule entrée sans `'use client'` |
| `/types`        | `UiLevel`, `UiSubLevel`, `UiFeedbackLevel` (types seuls)   |
| `/utils`        | `cx` (concaténation de classes)                            |

## Rendu serveur

Chaque composant interactif porte `'use client'`, préservée dans le build : le paquet
s'utilise tel quel sous Next App Router.

Pour éviter le clignotement clair → sombre au premier rendu, injecter
`uiThemeBootstrapScript()` dans le `<head>` : il pose le mode mémorisé avant la première
peinture, ce que le provider ne peut pas faire puisqu'il s'exécute après. La fonction vient
de son propre sous-chemin, sans `'use client'`, pour qu'un layout serveur puisse l'appeler :

```tsx
// app/layout.tsx
import { uiThemeBootstrapScript } from '@4sh/ui-kit-react/theme-script';

<head>
  <script dangerouslySetInnerHTML={{ __html: uiThemeBootstrapScript() }} />
</head>;
```

## Personnaliser

Deux niveaux, sans jamais toucher au CSS du kit :

1. **Les jetons** pour les couleurs, espacements et rayons : c'est le niveau normal.
2. **Les hooks `--ui-*`** pour une valeur structurelle sur un composant ou un exemplaire.
   `src/styles/component-vars.scss` est la liste complète, prête à copier, avec le rôle de
   chaque variable.

```css
/* Tout le kit */
:root {
  --ui-icon-size-lg: 28px;
}

/* Un seul exemplaire */
.mon-icone {
  --ui-icon-size: 64px;
}
```

## Agent IA (serveur MCP)

Un petit serveur MCP est livré **dans ce paquet**, sous `mcp/` : bundlé au build, il n'a
besoin de rien d'autre. Il donne à un agent de codage compatible MCP (Claude Code, Claude
Desktop, Cursor…) le catalogue des composants, l'API exacte de chacun (props, valeurs
admises, défauts), ses hooks `--ui-*` et la doc Storybook, recherche plein texte comprise.
Quatre tools : `list_components`, `get_component_doc`, `search_docs` et `get_shared_config`.

Rien ne le déclare à votre place : ajoutez-le une fois au `.mcp.json` du projet.

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

L'installation lie `ui-kit-react-mcp` dans `node_modules/.bin/` : cette forme se résout
quel que soit le dossier d'où le client MCP lance le serveur. Le serveur sert la doc de la
version du kit qui l'embarque, et demande Node 22 ou plus.

## Dépendances

Deux, chacune importée par exactement un fichier interne : `@floating-ui/react-dom` pour le
positionnement ancré et `@tanstack/react-virtual` pour les listes virtualisées. `react` et
`react-dom` sont en `peerDependencies`. La plupart des composants restent donc sans
dépendance, même recopiés chez vous. Voir `docs/DECISIONS.md` et sa décision D6.

## Licence

Apache-2.0. Voir `LICENSE` et `NOTICE`.
