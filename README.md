# Starter React Web : Design System 4SH

Composants React **headless**, accessibles, stylés exclusivement par des **jetons de
design**. Second moteur de la stratégie Dual-Engine, aux côtés de
[`starter-angular`](https://github.com/4sh/starter-angular).

**Documentation (Storybook)** : à déployer en phase 5.

---

## Démarrer

```bash
pnpm install     # installe, génère les jetons et la table `exports`
pnpm storybook   # la source de vérité, sur http://localhost:6006
```

| Commande                 | Ce qu'elle fait                                              |
| ------------------------ | ------------------------------------------------------------ |
| `pnpm storybook`         | Storybook (lit les **sources** du kit, rechargement à chaud) |
| `pnpm serve`             | Application de démo (consomme le **paquet construit**)       |
| `pnpm kit:build`         | Construit `@4sh/ui-kit-react`                                |
| `pnpm test`              | Tests de composants dans Chromium (Playwright)               |
| `pnpm lint:check`        | ESLint, sans `--fix`                                         |
| `pnpm typecheck`         | `tsc` sur les trois projets                                  |
| `pnpm tokens:build`      | Régénère les variables CSS depuis `design-tokens/*.json`     |
| `pnpm docs:config:check` | Garde-fou : la doc écrite à la main contre le code           |

Node : voir `.nvmrc`. Gestionnaire de paquets : pnpm (version épinglée dans
`package.json`).

## Où lire quoi

| Sujet                                          | Fichier                      |
| ---------------------------------------------- | ---------------------------- |
| **Reprise : état, prochaine tâche, journal**   | `docs/ROADMAP.md`            |
| **Conventions de code**                        | `AGENTS.md`                  |
| Décisions d'architecture et leur justification | `docs/DECISIONS.md`          |
| Ce qui doit rester identique entre les stacks  | `docs/DUAL-ENGINE.md`        |
| Composants faits / à faire                     | `docs/components-index.md`   |
| Versions, branches, CHANGELOG                  | `docs/VERSIONING.md`         |
| Publication npm                                | `docs/PUBLISHING.md`         |
| Sécurité et registre des exceptions            | `docs/SECURITY-PRACTICES.md` |
| Volet Figma                                    | `CLAUDE.md`                  |

## Où sont les choses

```
design-tokens/     jetons DTCG (JSON) : la copie locale de ce starter
packages/
  ui-kit-react/    le paquet publié : composants + fondation SCSS
  ui-kit-react-cli/  mode copie des sources (phase 4)
  ui-kit-react-mcp/  serveur MCP pour les agents (phase 5)
apps/demo/         application de démo + composants métier
storybook/         config, addons locaux, doc globale
scripts/           chaîne de jetons, chaîne de doc, garde-fous
```

## État

Amorçage. La chaîne complète est en place et vérifiée de bout en bout : jetons, fondation
SCSS, build multi-entrées à table `exports` générée, Storybook, doc générée depuis le SCSS,
tests en navigateur réel : sur **un** composant de référence, `ui-icon`.

Ce qui reste est écrit dans `docs/components-index.md` (les composants) et
`docs/DECISIONS.md` (les phases 4 à 6 : mode copie, serveur MCP, contrôle de parité).

## Licence

Apache-2.0. Voir `LICENSE`.
