# Design System : React Headless → Figma

## À lire avant toute chose

Ce dépôt est le starter **React Web** du Design System 4SH : composants **headless**
(React 19, comportement interne) stylés exclusivement par des jetons de design.

C'est le second moteur de la stratégie **Dual-Engine**. La logique dépend du stack
(comportement écrit à la main ici, Angular CDK côté Angular) ; la couche réellement
partagée entre les stacks,
ce sont les **jetons** (variables CSS) et le **fichier Figma**. Le style d'un composant
est co-localisé (SCSS scopé par convention de préfixe) et consomme ces jetons.

> **Les conventions de code vivent dans `AGENTS.md`** : à lire en premier pour toute
> tâche de code (Claude Code ne charge automatiquement que ce fichier-ci).
> Décisions d'architecture : `docs/DECISIONS.md`. Invariants partagés avec le starter
> Angular : `docs/DUAL-ENGINE.md`. Versions : `docs/VERSIONING.md`.

Avant de générer quoi que ce soit dans Figma, tu **dois** auditer le composant React source.

---

## Figma : les deux fichiers sont PARTAGÉS avec le starter Angular

| Fichier                           | `fileKey`                | Rôle                                                           |
| --------------------------------- | ------------------------ | -------------------------------------------------------------- |
| **[Projet] - UI Kit**             | `GZww5hdUA49LB8XWeWP6tl` | Les **composants**. Toute génération ou audit vise ce fichier. |
| **[Projet] - Composants metiers** | `lH4jhyZFkIeJ1Ob1tlY7Wm` | **Propriétaire des collections de variables**.                 |

⚠️ **Il n'y a rien à créer côté Figma pour React.** Les composants Figma décrivent le
Design System, pas une implémentation : ils servent les deux stacks. Une story React
reprend le **même `node-id`** que la story Angular du même composant. Créer un second jeu
de composants Figma « pour React » serait exactement la duplication que ce système existe
pour éviter.

⚠️ **Toute écriture sur une variable (création, renommage, reciblage, suppression) se
fait dans `lH4jhyZFkIeJ1Ob1tlY7Wm`.** Dans le UI Kit les variables sont `remote`, donc en
lecture seule.

Pour tout le reste du volet Figma (architecture des variantes, règles d'Auto Layout,
nommage, checklist de conformité, mode « Design System Reviewer », gabarits de prompts),
la référence est le `CLAUDE.md` du starter Angular : ces règles portent sur le fichier
Figma, pas sur le stack, et sont donc communes. Ne pas les dupliquer ici : elles
divergeraient.

---

## Ce qui change par rapport au starter Angular

| Sujet                            | Ici                                                              |
| -------------------------------- | ---------------------------------------------------------------- |
| Mapping props → propriétés Figma | Identique, aux noms de props près (voir `docs/DUAL-ENGINE.md`)   |
| États interactifs                | Jamais des props : CSS + jetons, et variantes `State` dans Figma |
| Chemin d'import                  | Plat : `@4sh/ui-kit-react/ui-button` (décision D4)               |
| Jetons                           | `design-tokens/` local au dépôt (décision D2)                    |
