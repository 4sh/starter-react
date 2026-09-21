# Versions

Le projet suit [Semantic Versioning](https://semver.org/lang/fr/) adapté à un Design
System. Format : `MAJEUR.MINEUR.CORRECTIF`.

## Portée : un numéro, trois paquets

Le SemVer porte sur **`packages/ui-kit-react/package.json`** : c'est l'artefact publié sous
`@4sh/ui-kit-react`, celui contre lequel un projet épingle une version.

`@4sh/ui-kit-react-cli` et `@4sh/ui-kit-react-mcp` sont publiés depuis le même dépôt, en
même temps, et portent **le même numéro**, estampillé depuis celui du kit au moment de
l'assemblage. Ils n'ont pas de version propre à maintenir.

Ce verrouillage n'est pas cosmétique. Le CLI embarque une copie des sources du kit, et le
numéro partagé est ce qui identifie **de quel kit** vient un fichier copié : il est écrit
dans l'en-tête de traçabilité de chaque copie et dans le `ui-kit.json` du projet, que
`update` relit pour calculer ses diffs. Deux numéros qui divergent rendraient cette
provenance sans valeur.

Le `package.json` racine (démo + outillage) n'est **pas** versionné : il est `private`,
jamais publié, et son numéro ne signifie rien pour personne à l'extérieur du dépôt.

## Quand incrémenter

| Incrément     | Quand                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MAJEUR**    | Rupture : renommage ou suppression d'un jeton, suppression d'un composant, changement d'API d'une prop, sous-chemin renommé ou retiré, nouvelle `peerDependency` ou plancher relevé, option de CLI supprimée ou renommée |
| **MINEUR**    | Nouveau composant, nouveau jeton, nouvelle variante non cassante, nouveau sous-chemin, nouvelle commande ou option de CLI                                                                                                |
| **CORRECTIF** | Correction visuelle, correction de bug, ajustement de la valeur d'un jeton existant sans renommage                                                                                                                       |

Tant que la version commence par `0.x.y`, l'API est considérée instable : une version
MINEURE peut contenir des ruptures, documentées dans le CHANGELOG. Passer en `1.0.0` gèle
l'API publique.

⚠️ **Déplacer un composant d'une catégorie à l'autre n'est PAS une rupture ici** (décision
D4 : la catégorie n'est pas dans le chemin d'import). C'est une différence avec le starter
Angular, où c'en est une.

## Pas de release sans changement de tarball

**Si aucun des trois paquets n'a changé, il n'y a pas de release** : pas d'incrément, pas
de tag, pas d'entrée de CHANGELOG, pas de publication. Un changement limité au Storybook
(stories, MDX, config), à l'application de démo, à la CI ou à la documentation part sur
`main` comme n'importe quel changement : Storybook et la démo se redéploient à chaque push
sur `main`, indépendamment du workflow de publication, qui ne se déclenche qu'à la main.

## Déroulé d'une release

1. Travailler sur une branche `feat/*`, `fix/*`, `chore/*` ou `breaking/*`.
2. Ajouter une ligne dans `CHANGELOG.md` sous `## [Unreleased]`, dans la bonne section
   (`Added` / `Changed` / `Deprecated` / `Removed` / `Fixed`) : **seulement si le
   changement touche un paquet publié**.
3. PR, puis fusion dans `main`.
4. Au moment de publier, sur `main` :
   - déplacer le contenu de `[Unreleased]` dans une nouvelle section `[X.Y.Z] - AAAA-MM-JJ` ;
   - incrémenter la version dans **`packages/ui-kit-react/package.json`** ;
   - **si un composant a changé**, rafraîchir le manifeste embarqué du serveur MCP : c'est
     un instantané de build, pas une lecture directe du dépôt. À faire **après**
     l'incrément, jamais avant : le manifeste porte aussi la version annoncée aux clients
     MCP ;
   - committer et pousser.
5. Lancer le workflow de publication (`docs/PUBLISHING.md`).

## Tag et release GitHub : produits par la CI

Ni l'un ni l'autre ne se crée à la main. Le job `release` de `publish.yml` tourne **après
un `npm publish` réussi** et crée le tag `vX.Y.Z` sur le commit publié, plus la release
GitHub dont le corps est la section `[X.Y.Z]` du CHANGELOG.

L'accrocher au job de publication est ce qui rend la release fiable : elle n'existe que si
le registre a accepté le tarball, et elle pointe sur le commit exact qui l'a produit.

Conséquence : **la section `[X.Y.Z]` doit exister dans `CHANGELOG.md` avant de publier.**
Le job `verify` le contrôle (`scripts/changelog.section.mjs`), donc un lancement en
`dry_run: true` signale une section manquante _avant_ la publication irréversible.

## Branches et commits

| Préfixe          | Usage                          | SemVer         |
| ---------------- | ------------------------------ | -------------- |
| `feat/<nom>`     | Nouvelle fonctionnalité        | MINEUR         |
| `fix/<nom>`      | Correction                     | CORRECTIF      |
| `chore/<nom>`    | Outillage, refactoring interne | pas de release |
| `breaking/<nom>` | Rupture d'API ou de jetons     | MAJEUR         |

Format de commit (Conventional Commits, clé Jira **en premier**) :

```
FSHSP-XXX type(scope): description à l'impératif
```

Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`. Anglais, impératif.
Rupture : `!` après le scope, ou un pied de message `BREAKING CHANGE:`.
