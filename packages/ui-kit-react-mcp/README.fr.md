# @4sh/ui-kit-react-mcp

_[English](./README.md) · **Français**_

Serveur MCP de **@4sh/ui-kit-react**, la déclinaison React du Design System 4SH. Il donne à
un agent de codage (Claude Code, Claude Desktop, Cursor…) le catalogue des composants, l'API
exacte de chacun, ses hooks de theming `--ui-*` et sa doc Storybook : l'agent cesse de deviner
les noms, les props et les chemins d'import.

**Documentation (Storybook)** : https://4sh.github.io/starter-react/

> ⚠️ Paquet non encore publié (`private: true`). Voir `docs/PUBLISHING.md` à la racine du
> dépôt. D'ici là, il se lance depuis le dépôt (voir [Développement](#développement)).

---

## Les tools

| Tool                | Ce qu'il rend                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `list_components`   | Le catalogue : nom, famille, sous-chemin d'import, résumé d'une phrase. Filtre `category` optionnel.                    |
| `get_component_doc` | Tout pour utiliser un composant : import, API, hooks `--ui-*`, sections de doc. `include` restreint la réponse.         |
| `search_docs`       | Recherche plein texte dans toute la doc (composants, jetons, fondations), avec les liens Storybook.                     |
| `get_shared_config` | Les réglages structurels du kit (anneau de focus, bordure des contrôles, transitions…) et le hook qui surcharge chacun. |

L'API est lue dans les **types TypeScript** au build, pas dans les stories : pour chaque
composant exporté, ses props propres avec leur type déclaré, les valeurs admises, le défaut,
la JSDoc et l'obsolescence, plus l'élément natif qui reçoit les attributs restants.

`get_component_doc` accepte `ui-button`, `button`, `@4sh/ui-kit-react/ui-button`, ou le nom
React de n'importe quel export (`UiTabPanel` mène à `ui-tabs`).

Le serveur transmet aussi à l'agent de courtes **instructions** à la connexion : la démarche,
le chemin d'import plat (`@4sh/ui-kit-react/ui-<nom>`, jamais la famille), la mise en place
(`styles.css` + `UiThemeProvider`), et comment personnaliser sans surcharger les classes du
kit.

## Utilisation

L'installer à côté du kit, **à la même version** : le serveur documente le kit avec lequel il
a été construit, et annonce cette version au client MCP.

```bash
pnpm add -D @4sh/ui-kit-react-mcp
```

Puis le déclarer une fois, dans le `.mcp.json` du projet :

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

`--no-install` fait échouer `npx` franchement si le binaire manque, au lieu d'aller chercher
ce que le registre sert sous ce nom. Le serveur ne parle que stdio : le client le lance en
local, il n'écoute jamais le réseau. Node 22 ou plus.

## Aucune dépendance à l'exécution

Le paquet est un seul fichier ESM autonome (`dist/index.js`, où le SDK MCP, Zod et
MiniSearch sont inlinés) plus son instantané de doc (`data/`). Rien ne se résout à
l'installation, donc aucune version transitive n'échappe à votre lockfile.

## Développement

Dans le dépôt `starter-react` :

```bash
pnpm mcp:build   # régénère la doc, écrit data/, bundle dist/index.js
pnpm mcp:smoke   # lance le binaire construit sur stdio et déroule le parcours d'un agent
pnpm test        # comprend le projet Vitest `mcp` (Node, manifeste de test)
```

Pour y brancher un client local avant la publication, prendre
`node <dépôt>/packages/ui-kit-react-mcp/dist/index.js` comme commande.

L'instantané est écrit par `scripts/mcp-assets.build.mjs` : l'API depuis les types
(`scripts/lib/component-api.mjs`), les hooks depuis le manifeste de doc (même règle que les
tables _Theming_ de Storybook), et l'index de recherche de Storybook. Il est ignoré par git et
reconstruit à chaque `pnpm mcp:build` : il ne peut pas dériver du code qu'il décrit.

## Licence

Apache-2.0. Voir `LICENSE`.
