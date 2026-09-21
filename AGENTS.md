# AGENTS.md : Starter React Web (Design System)

> Point d'entrée unique pour tout agent. Lis ce fichier d'abord, puis les sources de
> vérité indiquées. Pour le volet Figma (génération et audit de composants), voir
> `CLAUDE.md`.
>
> **Reprise de travail : `docs/ROADMAP.md`.** État, prochaine tâche, dette assumée, pièges
> déjà payés et journal des sessions. C'est le premier fichier à lire quand on arrive dans un
> contexte neuf, et le dernier à mettre à jour quand on part.
>
> Décisions d'architecture et leur justification : `docs/DECISIONS.md`.
> Versions et publication : `docs/VERSIONING.md` + `CHANGELOG.md`.
> Invariants partagés avec le starter Angular : `docs/DUAL-ENGINE.md`.

---

## Stack

| Technologie                        | Rôle                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ |
| React 19                           | Framework. Composants fonctionnels, props typées, aucun composant classe |
| _(aucune librairie de composants)_ | Le comportement est interne. Deux dépendances ciblées, voir ci-dessous   |
| Design Tokens JSON                 | `design-tokens/*.json` (DTCG) → Style Dictionary → variables CSS         |
| Vite 8                             | Build de la librairie (multi-entrées) et de l'application de démo        |
| Storybook 10                       | **Source de vérité** : composants, jetons, fondations                    |
| Vitest 5 + Playwright              | Tests de composants dans un vrai navigateur                              |
| FontAwesome Free                   | Icônes, via le composant `ui-icon`                                       |

---

## ⚠️ Règle absolue : à lire avant de coder

**Storybook est la source de vérité.** Ne devine jamais l'API d'un composant, ses
variantes ou ses jetons.

| Question                                | Où regarder                                                           |
| --------------------------------------- | --------------------------------------------------------------------- |
| Composants existants / feuille de route | `docs/components-index.md`                                            |
| API d'un composant                      | `packages/ui-kit-react/src/<catégorie>/ui-<nom>/ui-<nom>.stories.tsx` |
| Couleurs, jetons sémantiques            | Storybook → `Foundations / Colors`                                    |
| Typographie                             | Storybook → `Foundations / Typography`                                |
| Chaîne de jetons, thème, responsive     | Storybook → `Spécifications / *`                                      |
| Source d'un composant                   | `packages/ui-kit-react/src/<catégorie>/ui-<nom>/`                     |
| **Patron de référence**                 | `packages/ui-kit-react/src/base/ui-icon/`                             |

---

## Disposition du dépôt

```
design-tokens/            # sources JSON des jetons (DTCG)
tokens.config.json        # collections, axes de modes, sorties
scripts/                  # outillage Node (jetons, doc, exports, garde-fous)
  lib/entries.mjs         #   recensement des points d'entrée : LU DEUX FOIS
packages/
  ui-kit-react/           # @4sh/ui-kit-react : le paquet publié
    src/
      index.ts            #   entrée racine, volontairement minimale
      core/               #   briques transverses : types, theming, (motion, overlay, forms)
      <catégorie>/        #   actions/ base/ forms/ informative/ layout/ navigation/ table/
        ui-<nom>/         #     un composant = un point d'entrée
          ui-<nom>.tsx · ui-<nom>.scss · index.ts
          ui-<nom>.stories.tsx · ui-<nom>.mdx · ui-<nom>.test.tsx
      styles/             #   fondation SCSS : LIVRÉE avec le paquet
  ui-kit-react-cli/       # @4sh/ui-kit-react-cli : mode copie (phase 4)
  ui-kit-react-mcp/       # @4sh/ui-kit-react-mcp : serveur MCP (phase 5)
apps/demo/                # application de démo + composants métier
storybook/                # config, addons locaux, blocs de doc, doc globale
```

### Le sous-chemin public ne porte PAS la catégorie

`@4sh/ui-kit-react/ui-button`, jamais `@4sh/ui-kit-react/actions/ui-button`. La catégorie
range les fichiers et structure la doc, rien de plus : déplacer un composant d'une famille
à l'autre ne casse aucun import (décision D4, voir `docs/DECISIONS.md`).

**Corollaire** : deux composants ne peuvent pas porter le même nom dans deux catégories.
`scripts/lib/entries.mjs` échoue explicitement dans ce cas.

### Ajouter un point d'entrée

Il suffit de créer `src/<catégorie>/ui-<nom>/index.ts`. `pnpm exports:build` le détecte et
écrit la table `exports` du `package.json`, qui est **générée mais committée** : c'est ce
qui rend une omission visible en revue, et `--check` la refuse en CI.

### Où le kit lit ses sources, et pourquoi c'est différent selon la surface

- **Storybook** consomme `packages/ui-kit-react/src` par un alias → rechargement à chaud,
  aucun build préalable.
- **L'application de démo** consomme le **paquet construit** (`workspace:*`) → c'est la
  seule chose qui vérifie que la table `exports` est juste.

Ne pas « harmoniser » les deux : c'est délibéré.

---

## Dépendances : la règle qui ne se contourne pas

**Aucun composant n'importe une librairie tierce.** Il importe une brique de `core/`, et
c'est cette brique (un seul fichier) qui connaît la librairie.

Le kit a **deux** dépendances runtime, et chaque dépendance a un fichier propriétaire unique :

| Dépendance                | Seul fichier autorisé à l'importer        | État      | Pour quoi                                                |
| ------------------------- | ----------------------------------------- | --------- | -------------------------------------------------------- |
| `@floating-ui/react-dom`  | `src/core/overlay/use-ui-position.ts`     | installée | Positionnement ancré : collision, retournement, décalage |
| `@tanstack/react-virtual` | `src/core/virtual/use-ui-virtual-list.ts` | installée | Défilement virtuel : fenêtre, mesure dynamique           |

Trois autres ont été **refusées** sur mesure (`tabbable`, `aria-hidden`,
`react-remove-scroll`) : la plateforme couvre ce qu'elles apportaient. Les motifs vivent dans
`scripts/deps.check.mjs`, qui échoue en les citant si l'une est installée. Ne pas les
rouvrir sans une nouvelle mesure.

`react` et `react-dom` sont des `peerDependencies` : autorisés partout.

`pnpm deps:check` fait respecter tout ça et **échoue en CI** sur : un import tiers hors de
sa brique, un import tiers non arbitré, une brique implémentée sans sa dépendance déclarée,
une dépendance déclarée sans brique qui l'utilise, une dépendance refusée installée.
L'allocation vit dans `scripts/deps.check.mjs`.

⚠️ **Ajouter une ligne à cette allocation est une décision d'architecture, pas une
commodité.** Elle se prend comme D6 s'est prise : en pesant ce que la librairie impose à
l'API publique, ce qu'elle coûte au consommateur en mode copie, et si le comportement
n'appartient pas plutôt au contrat du Design System : dans ce cas il s'écrit dans `core/`.
Le raisonnement complet, les verdicts librairie par librairie et la mesure qui les fonde :
`docs/DECISIONS.md` → D6.

### Concaténer des classes : `cx`, pas `clsx`

```ts
import { cx } from '../../core/utils';

cx('ui-button', `_${level}`, loading && '_loading', className);
```

Pas de forme objet : un conditionnel s'écrit avec `&&`.

### Imports entre briques : relatifs, contrairement au starter Angular

Côté Angular, un import entre points d'entrée **doit** passer par le nom du paquet, sinon
`ng-packagr` n'enregistre pas la dépendance et l'ordre de build devient indéterminé. **Ici
c'est l'inverse** : un point d'entrée n'est pas résolvable pendant le build (il n'existe
que dans `dist/`), donc un composant importe `core/` en **relatif**
(`../../core/utils`). Rollup en fait un chunk partagé, sans duplication.

---

## Règles de code non négociables

### Jamais d'injection HTML non assainie

`dangerouslySetInnerHTML`, une écriture directe d'`innerHTML`/`outerHTML`,
`insertAdjacentHTML()`, `eval()`, `new Function()` : **interdits par défaut**, et la règle
`no-restricted-syntax` d'`eslint.config.mjs` est bloquante en CI.

React échappe tout ce qui passe par du JSX ; ces API sont précisément la porte de sortie.
Une exception se lève en trois étapes, jamais moins : assainir la valeur dans du code
testable, la justifier sur place (`// eslint-disable-next-line no-restricted-syntax --
EXCEPTION JUSTIFIÉE: …`), et l'inscrire au registre de `docs/SECURITY-PRACTICES.md`.

### Le contrat commun à TOUS les composants

React ne rend pas d'élément hôte : le composant produit sa propre racine. Sans ces quatre
points, le kit n'est pas composable, et le manquement ne se voit qu'à l'usage.

```tsx
export function UiThing({ level = 'high', className, ...rest }: UiThingProps) {
  return <button {...rest} className={cx('ui-thing', `_${level}`, className)} />;
}
```

1. `className` **fusionné**, jamais remplacé (via `cx`, toujours en dernier pour que
   l'appelant gagne).
2. `style` fusionné de la même façon dès que le composant en pose un.
3. `...rest` transmis à l'élément natif (c'est ce qui rend `aria-*`, `data-*`, `onFocus`
   utilisables sans nouvelle prop).
4. `ref` transmis à l'élément natif. En React 19, `ref` est une prop ordinaire :
   `ComponentPropsWithRef<'button'>` suffit, `forwardRef` est inutile.

### Props : la convention est figée, elle ne se rediscute pas

- **Valeurs par défaut dans la DESTRUCTURATION**, jamais dans le corps. react-docgen les y
  lit : un défaut posé ailleurs produit une colonne « Default » vide dans Storybook, sans
  erreur. Vérifié : la destructuration donne bien `"high"`, `"filled"`, `false`…
  ⚠️ **Prérequis mesuré** : ça ne marche que parce que `storybook/main.ts` pointe
  `reactDocgenTypescriptOptions.tsconfigPath` vers `tsconfig.base.json`. Sans ce chemin,
  react-docgen-typescript prend le `tsconfig.json` racine, qui ne couvre que `storybook/**`,
  ne voit aucun composant et n'extrait **rien** : la table se rabat en silence sur les seuls
  `argTypes` de la story. Symptôme à reconnaître : des types `string` au lieu des unions, et
  des défauts tous à `-`.
- **Contrôlé / non contrôlé** : `value` + `defaultValue` + `onValueChange`. Convention
  empruntée à Radix parce qu'elle s'est imposée dans l'écosystème React ; on emprunte le
  vocabulaire, pas la librairie. Une prop `value` renseignée rend le composant contrôlé.
- **Sorties** : `onX`, jamais un `EventEmitter` ni un nom sans préfixe.
- **Slots** : props `ReactNode` pour les slots statiques (`header`, `footer`, `empty`),
  callbacks `render*(ctx)` pour les slots paramétrés (l'équivalent de `let-x`). Pas de
  `asChild` : le motif vient de Radix, que le kit n'utilise pas (décision D6).
- **`'use client'`** en tête de tout composant interactif. Le build repose la directive sur
  chaque entrée, mais elle doit exister dans la source pour que Storybook et les projets
  Vite se comportent comme Next.

### Effets : idempotents, toujours

`<StrictMode>` monte deux fois chaque composant en développement. Un `console.warn` dans un
effet s'affiche donc en double s'il n'est pas dédupliqué (voir `ui-icon`, qui mémorise les
avertissements déjà émis). Tout ce qui, côté Angular, vivait dans `afterNextRender` doit
supporter d'être rejoué.

Et **jamais de `setState` synchrone dans un effet** : `react-hooks/set-state-in-effect` est
bloquante. Pour un état qui n'existe que dans le navigateur (préférence mémorisée), passer
par `useSyncExternalStore` avec un instantané serveur distinct : voir `core/theming`.

### Écrire les commentaires

- **Jamais de tiret cadratin** dans un commentaire, une doc ou le CHANGELOG.
  Deux-points pour une explication, virgule pour une incise, parenthèses pour une
  apposition. `pnpm prose:check` le refuse en CI. Le même caractère comme glyphe
  affiché reste permis, la cellule vide de `<ConfigTable>` par exemple.
- **Rester bref.** Le code se lit tout seul : on ne commente que le non évident,
  la recette, le piège, le point d'extension. Jamais une paraphrase de la ligne
  suivante.
- **Le JSDoc d'un composant tient en trois à six lignes.** Ce qu'il faut vraiment
  expliquer va dans la page MDX, où c'est rendu, indexé et lisible par le
  consommateur. Un pavé dans la source le cache à ceux qui en ont besoin et
  encombre ceux qui lisent le code.
- **Un `index.ts` de baril n'a pas d'en-tête** répétant son propre chemin.

### CSS / SCSS : jetons et structure, sans BEM

- **Jetons uniquement** : jamais une couleur, un espacement ou un rayon en dur. Clair ET
  sombre à chaque fois.
- **Nommage** : racine `.ui-<nom>` ; sous-élément `&-<partie>` (→ `.ui-button-icon`) ;
  modifieur `&._<modifieur>` (→ `._small`, `._high`).
- **États interactifs** (`hover`/`focus`/`active`/`disabled`) : pseudo-classes CSS via les
  jetons d'état, **jamais** une classe modifieur ni une prop.
- **Ordre des déclarations** : Layout → Métriques → Couleurs → Style → Interaction.
- **Aucune isolation native** : le préfixe `ui-` EST le namespace. Donc **aucun sélecteur
  d'élément nu** (`div`, `span`, `a`) dans un `.scss` de composant : il fuirait sur toute
  la page. En contrepartie, `:host-context()` n'existe plus et une surcharge de thème
  s'écrit directement : `:where([data-theme='dark']) .ui-x { … }`.
- **Pas d'élément hôte** : les règles qui vivaient sur `:host` se fondent dans la classe
  racine.

### Chaque valeur passe par un hook `--ui-*`

En mode paquet, le SCSS du kit est déjà compilé : ni `_ui-config.scss` ni les variables
locales d'un composant ne sont accessibles au consommateur. Chaque valeur est donc lue
**à travers** une custom property dont le repli est le défaut livré. Pour une valeur
structurelle, le hook va sur la **variable de configuration**, jamais sur les sites d'usage :

```scss
// --- Config ---
$radius: var(--ui-button-radius, var(--radius-sm)); /// Rayon des coins.
```

- **Nommage** : `--ui-{famille}[-{partie}]-{propriété}[-{modifieur}]`, modifieur en
  dernier. La famille est le dossier du composant moins `ui-`. Le vocabulaire des
  propriétés vit dans `scripts/component-vars.build.mjs` : **étendre la liste là-bas**
  plutôt qu'inventer un nom, sinon `pnpm docs:config` refuse le hook.
- **Ce qui en reçoit** : dimensions, espacements, gouttières, rayons, épaisseurs de trait
  et d'anneau de focus, tailles et familles de police, graisses, durées, décalages,
  z-index, et **les couleurs**.
- **Ce qui n'en reçoit pas** : les listes/maps SCSS qui génèrent des classes, build-time,
  qu'aucune custom property ne peut porter.

#### Les couleurs : le hook est sur le site d'usage

Une couleur dépend de la variante rendue : `background-color` lit
`--actions-#{$set}-surface-default`, un nom composé à la compilation. La remonter en
variable de config figerait le jeu de jetons. Le hook s'écrit donc **là où la couleur est
peinte**, son `///` avec lui :

```scss
background-color: var(
  --ui-button-surface,
  var(--actions-#{$set}-surface-default)
); /// Fond du bouton.
```

Un seul nom de hook couvre toutes les variantes : le poser sur `:root` vaut pour toutes,
sur un sélecteur de modificateur pour une seule. Le repli reste le jeton sémantique, donc
sans hook posé rien ne change : thème clair/sombre, 3 marques et contraste WCAG suivent.

Les couleurs qu'un **mixin partagé** peint (`_mixins.scss`) font exception : le mixin ne
sait pas quel composant l'a inclus, donc leur hook porte le nom de la catégorie et se
déclare dans `_ui-config.scss` (`$form-field-color` → `--ui-form-field-color`).

### Un `///` sur une variable de config = la doc publiée

Dans le `.scss` d'un **composant**, un `///` sur une déclaration est le **contrat public** :
`pnpm docs:config` le lit et la section « Theming » de la page l'affiche. `//` reste la note
interne, invisible dans la doc.

- Le `///` se met **en fin de déclaration**, aligné verticalement dans son groupe. Seule
  exception : une map multi-lignes porte son `///` sur la ligne au-dessus.
- **Jamais de valeur résolue dans un rôle** (`(12px)`) : la doc la mesure au runtime, dans
  le thème, la marque et le viewport actifs.
- Décrire le **rôle** seulement. La liaison et la valeur sont déduites.
- Commentaires en **anglais**, **sauf** les `///` de configuration, publiés dans la doc et
  donc en français.
- **Ne jamais citer Figma** : garder l'intention, pas l'origine.

### Accessibilité

- `<button>` / `<a>` natifs, jamais un `<div>` cliquable ; `disabled` natif.
- `aria-label` obligatoire en mode icône seule ; icônes décoratives en `aria-hidden`.
- `:focus-visible` toujours visible et distinct de `hover`.
- Toute liaison `aria-label`/`aria-labelledby` se garde contre la chaîne vide : passer
  `undefined` plutôt que `''`, pour que l'attribut soit omis.
- **Aucun catalogue i18n dans le kit.** Les props `*Label` ne portent qu'un défaut
  français ; la traduction est la responsabilité de l'application.
- **Le contrôle axe est bloquant.** `pnpm test` exécute deux projets Vitest : `unit` (les
  tests écrits à la main) et `storybook`, qui rend **chaque story** et la passe à axe. Une
  violation fait échouer la CI. Il n'y a donc aucun test d'accessibilité à écrire : la
  couverture suit mécaniquement les stories, déjà obligatoires.
- Couper le contrôle sur une story (`parameters: { a11y: { test: 'off' } }`) n'a **qu'une**
  raison acceptable : un contre-exemple assumé, qui existe pour montrer un défaut. Voir
  `ui-button` → `OnColorOmitted`. Toute autre exemption est un bug déguisé.

---

## Doc MDX

- **Tableaux** en balises HTML (`<table className="doc-table">`, `<tr>`, `<td>`) et jamais en
  markdown : Storybook n'a pas `remark-gfm` dans sa chaîne, donc un tableau écrit en `|` rend
  des tuyaux en texte brut, sans le moindre avertissement. `pnpm prose:check` le refuse en CI,
  dans les `.mdx` seulement : un tableau markdown reste légitime dans un `.md`, que GitHub
  rend.
- **Section « Theming »** : jamais écrite à la main. `<ConfigTable of="ui-<nom>" />`
  (importé via l'alias `@sb/blocks/config-table`, pas un chemin relatif), alimentée par
  `pnpm docs:config`. **Toujours la dernière section** de la page.
- **Pas de `tags: ['autodocs']`** sur une story qui a un MDX co-localisé : les deux
  produisent deux entrées de doc au même identifiant et Storybook échoue à l'indexation.
- **Sommaire** : construit depuis les titres markdown `##`/`###` uniquement. Un `<h2>`
  écrit en JSX ne porte pas d'`id` et reste donc hors sommaire.

---

## Flux de travail

### Créer un composant `ui-*`

1. Vérifier `docs/components-index.md` (feuille de route, nom prévu).
2. Reproduire le patron `base/ui-icon` : structure de fichiers, props typées avec défauts
   dans la destructuration, `clsx`, SCSS co-localisé.
3. Créer la story, le MDX et le test **co-localisés**.
4. Cocher le composant dans `components-index.md`, ajouter sa carte à `Overview.mdx`, et
   l'ajouter au tableau des familles des deux README du paquet.
5. `pnpm docs:config:check` : c'est lui qui dit ce qui a été oublié.

### Modifier un composant

1. Lire la story → identifier l'API réelle.
2. Modifier `.tsx`, `.scss` (jetons uniquement) : toute variable de config ajoutée porte
   son `///`.
3. Mettre à jour story, MDX et test si l'API bouge ; `pnpm docs:config` si le SCSS a bougé.
4. Vérifier clair + sombre + les 3 marques.

### Ajouter ou modifier un jeton

1. Éditer `design-tokens/*.json` (les sémantiques référencent les primitifs, jamais un
   primitif directement dans un composant).
2. `pnpm tokens:build` (ajouter une collection ou un mode → éditer `tokens.config.json`,
   pas le script).
3. Vérifier dans Storybook `Foundations / Colors`.

⚠️ Le dossier `design-tokens/` est une **copie** de celui du starter Angular (décision D2) :
chaque starter porte le sien. Une évolution de jeton qui concerne les deux stacks doit être
reportée à la main dans l'autre dépôt : voir `docs/DUAL-ENGINE.md`.

---

## Commandes

```bash
pnpm storybook           # Storybook (source de vérité) : alias de pnpm start
pnpm serve               # Application de démo (construit le paquet d'abord)
pnpm kit:build           # Construit @4sh/ui-kit-react (exports + bundles + styles.css)
pnpm tokens:build        # Régénère les variables CSS depuis les JSON
pnpm test                # Tests de composants (Chromium via Playwright)
pnpm lint:check          # ESLint sans --fix
pnpm typecheck           # tsc sur les trois projets
pnpm docs:config:check   # Les sept garde-fous, en une commande, voir ci-dessous
pnpm deps:check          # La règle d'import des librairies tierces (chaîné dans le précédent)
```

`docs:config:check` attrape une doc qui a décroché du code, et **doit être lancé avant de
committer**. Il échoue sur :

- un composant présent dans `packages/ui-kit-react/src/` mais absent d'une des listes qui
  énumèrent le kit, ou un **décompte** annoncé qui ne correspond plus (« N composants sur
  60 ») ;
- un hook `--ui-*` hors convention, ou sans `///` (public, mais invisible dans la doc) ;
- un alias pointant vers un jeton qui n'existe pas dans `design-tokens/` ;
- un point d'entrée absent de la table `exports` du `package.json` ;
- un composant qui importe une librairie tierce au lieu d'une brique de `core/` ;
- un renvoi de doc vers un fichier qui n'existe pas ;
- un tiret cadratin dans une prose, ou un tableau markdown dans un `.mdx`.

À côté de lui, `git diff --exit-code` sur les fichiers **générés mais committés**
(`packages/ui-kit-react/package.json` pour la table `exports`,
`packages/ui-kit-react/src/styles/component-vars.scss`, `figma/component-vars.json`) : le
build les réécrit sur le disque, donc seul git remarque un commit périmé.
