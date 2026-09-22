# @4sh/ui-kit-react

_[English](./README.md) · **Français**_

Composants React headless du Design System 4SH : props typées, comportement écrit à la
main, style piloté exclusivement par des jetons de design. **Aucune dépendance runtime.**

**Documentation (Storybook)** : à déployer en phase 5.

> ⚠️ Paquet non encore publié (`private: true`). Voir `docs/PUBLISHING.md` à la racine du
> dépôt.

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

| Famille       | Composants                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`        | `ui-icon`                                                                                                                                                                                                                                                                                                                                                         |
| `actions`     | `ui-button`, `ui-button-split`, `ui-link`                                                                                                                                                                                                                                                                                                                         |
| `forms`       | `ui-autocomplete`, `ui-checkbox`, `ui-datepicker`, `ui-field`, `ui-input`, `ui-input-date`, `ui-input-group`, `ui-input-mask`, `ui-input-number`, `ui-input-otp`, `ui-input-tags`, `ui-knob`, `ui-label`, `ui-nudger`, `ui-radio`, `ui-rating`, `ui-segment-control`, `ui-select`, `ui-slider`, `ui-textarea`, `ui-toggle`, `ui-toggle-block`, `ui-toggle-button` |
| `informative` | `ui-accordion`, `ui-alert`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-chip`, `ui-empty-state`, `ui-helper`, `ui-progress-bar`, `ui-read-only`, `ui-separator`, `ui-skeleton`, `ui-spinner`, `ui-tag`, `ui-toast`, `ui-tooltip`                                                                                                                              |
| `layout`      | `ui-card`, `ui-drawer`, `ui-modal`, `ui-popover`                                                                                                                                                                                                                                                                                                                  |
| `navigation`  | `ui-context-menu`, `ui-menu`, `ui-tabs`                                                                                                                                                                                                                                                                                                                           |
| `table`       | `ui-paginator`, `ui-table`                                                                                                                                                                                                                                                                                                                                        |

**52 composants** sur les 62 du Design System. Feuille de route :
`docs/components-index.md`.

## Entrées transverses

| Sous-chemin | Contenu                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `/theming`  | `UiThemeProvider`, `useUiTheme`, `useUiBrand`, `uiThemeBootstrapScript` |
| `/types`    | `UiLevel`, `UiSubLevel`, `UiFeedbackLevel` (types seuls)                |
| `/utils`    | `cx` (concaténation de classes)                                         |

## Rendu serveur

Chaque composant interactif porte `'use client'`, préservée dans le build : le paquet
s'utilise tel quel sous Next App Router.

Pour éviter le clignotement clair → sombre au premier rendu, injecter
`uiThemeBootstrapScript()` dans le `<head>` : il pose le mode mémorisé avant la première
peinture, ce que le provider ne peut pas faire puisqu'il s'exécute après.

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

## Dépendances

**Aucune.** Le paquet déclare `react` et `react-dom` en `peerDependencies`, et rien d'autre.
Deux dépendances de comportement sont budgétées pour plus tard, `@floating-ui/react-dom`
pour le positionnement ancré et `@tanstack/react-virtual` pour les listes virtualisées, et
chacune sera importée par exactement un fichier interne. La plupart des composants restent
donc sans dépendance, même recopiés chez vous. Voir `docs/DECISIONS.md` et sa décision D6.

## Licence

Apache-2.0. Voir `LICENSE` et `NOTICE`.
