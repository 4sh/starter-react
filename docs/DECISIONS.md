# Décisions d'architecture

Les huit décisions prises à l'amorçage du starter, avec ce qui a été retenu et pourquoi.
Elles gèlent l'arborescence, les noms publics et le contrat d'API des composants : les
rouvrir après une dizaine de composants coûte une réécriture de tout ce qui précède.

Une décision se change ici, avec sa justification mise à jour, jamais en silence dans le
code.

---

## D1 : Un dépôt par stack

**Retenu : un dépôt `starter-react` séparé.** Un dépôt par stack, pas de monorepo qui
absorberait l'existant.

Les deux kits ne partagent aucune ligne de runtime et cent pour cent du contrat. Un
monorepo coupleraient des cadences de montée de version qui doivent rester libres
(Angular 22 d'un côté, React 19 de l'autre), et il faudrait redéployer Pages, refaire le
Trusted Publishing et déplacer un paquet déjà publié. Le risque de dérive se traite par
`docs/DUAL-ENGINE.md`, pas par la colocation des dépôts.

Un futur starter React Native sera un troisième dépôt, `starter-react-native`.

## D2 : Les jetons sont copiés, pas extraits en paquet

**Retenu : chaque starter embarque son propre `design-tokens/`.**

C'est la même donnée au départ, et elle évoluera dépôt par dépôt. Aucun paquet
`@4sh/design-tokens` n'est publié : rien à versionner ni à releaser en plus, et un starter
peut faire évoluer ses jetons sans attendre l'autre.

**Le prix, à connaître** : rien n'empêche techniquement les deux copies de diverger. La
seule protection est la discipline décrite dans `docs/DUAL-ENGINE.md`. Une évolution de
jeton qui concerne les deux stacks se reporte à la main.

## D3 : Nommage des paquets

**Retenu : `@4sh/ui-kit-react`**, plus `@4sh/ui-kit-react-cli` (mode copie) et
`@4sh/ui-kit-react-mcp` (serveur MCP).

Se lit comme « le ui-kit, déclinaison React », laisse la place à `@4sh/ui-kit-react-native`,
et reste symétrique de `@4sh/ui-kit` côté Angular.

Le dépôt s'appelle `starter-react` et non `starter-react-web` : dans l'écosystème React le
web est implicite (`react-dom`) et le natif porte toujours son nom complet
(`react-native`). Ajouter `-web` créerait une asymétrie que rien d'autre ne suit.

## D4 : Le sous-chemin public ne porte pas la catégorie

**Retenu : chemin plat, `@4sh/ui-kit-react/ui-button`.** La catégorie reste sur le disque
et dans la doc.

Côté Angular, la catégorie dans le chemin est une contrainte **subie** : `ng-packagr`
dérive le sous-chemin du dossier et n'offre aucun moyen de les découpler, ce qui fait de
tout changement de famille un _breaking change_. Rien n'oblige à importer ce défaut : ici
la table `exports` est écrite par `scripts/exports.build.mjs`.

**Le prix** : deux composants ne peuvent pas porter le même nom dans deux catégories.
`scripts/lib/entries.mjs` échoue explicitement plutôt que d'écraser en silence.

## D5, Style : SCSS co-localisé, classes publiques, CSS porté par le composant

**Retenu : un `.scss` par composant, aux mêmes conventions que côté Angular** (`.ui-x`,
`&-partie`, `&._modifieur`), compilé par Vite et **réinjecté dans le chunk du composant**
(`vite-plugin-lib-inject-css`). La fondation reste un import unique
(`@4sh/ui-kit-react/styles.css`).

C'est ce qui conserve la chaîne `///` → `ConfigTable`, les hooks `--ui-*`, la parité Figma,
et la capacité du consommateur à cibler `.ui-button`. Les CSS Modules hachent les noms de
classes et rompent ce contrat. Tailwind ferait des jetons un thème Tailwind et effondrerait
la section « Theming » de chaque page ; on peut en revanche **émettre** un preset Tailwind
depuis les jetons pour les projets qui en veulent, sans que le kit en dépende.

**Le prix** : React n'offre aucune isolation de style. Le préfixe `ui-` devient le seul
namespace, donc aucun sélecteur d'élément nu n'est admis dans un `.scss` de composant.

## D6 : Les librairies tierces sont des détails d'implémentation

**Retenu : deux dépendances de comportement, aucune librairie de composants.**
`@floating-ui/react-dom` pour le positionnement ancré, `@tanstack/react-virtual` pour la
virtualisation. Ni Radix UI, ni React Aria, ni TanStack Table.

Le principe, qui vaut au-delà de ces deux-là : une librairie tierce n'entre que pour un
besoin technique identifié, sur lequel elle apporte une valeur réelle, et sans créer de
dépendance forte. Quand le comportement fait partie du **contrat** du Design System,
l'implémentation est interne.

### La mesure qui a tranché

Le starter Angular est une expérience grandeur réelle de la même question. Ce qu'il
consomme d'Angular CDK après 61 composants :

| Ce qui est pris au CDK | Composants | Pour quoi                                                |
| ---------------------- | ---------- | -------------------------------------------------------- |
| `overlay`              | 10         | Positionnement ancré : collision, retournement, décalage |
| `a11y`                 | 6          | Piège de focus, origine du focus (clavier ou souris)     |
| `scrolling`            | 2          | Défilement virtuel                                       |
| `portal`               | 1          | En React, `createPortal` est dans la plateforme          |

**49 des 61 composants n'importent rien.** Et surtout : **aucun n'utilise les
gestionnaires de touches du CDK**, qui existent pourtant. Toute la logique clavier est
écrite à la main, sur 27 fichiers, avec 25 tabindex glissants, 6 `aria-activedescendant`
et 3 type-ahead. Ce n'est pas un accident, c'est un choix répété : ce comportement **est**
l'API du kit.

Les quatre modules utilisés se réduisent à deux problèmes qui sont des mathématiques
(positionner, virtualiser) et deux qui sont du contrat (piéger le focus, décider quand une
couche se ferme).

### Pourquoi pas Radix

Trois raisons, dans l'ordre d'importance.

**Parité Dual-Engine.** L'argument décisif, et il est propre à notre situation. Si React
s'assoit sur Radix et Angular sur le CDK, le comportement des deux stacks est défini par
deux librairies tierces qui ne font pas les mêmes choix : ordre de fermeture des couches
imbriquées, retour du focus, attributs ARIA émis. La parité devient **invérifiable**, et le
contrôle prévu en phase 6 se réduit à du théâtre. Alors que si les deux stacks écrivent ce
comportement contre la même spécification, la parité est atteignable : et cette
spécification existe déjà : c'est le code Angular.

**Radix définit un contrat.** Ses composants sont _compound_
(`<Dialog.Root><Dialog.Trigger asChild>`) et pilotent leur état. Ou l'on expose cette API,
et notre contrat devient celui de Radix, divergent de `ui-modal` côté Angular. Ou on
l'enveloppe dans notre API, et on se bat en permanence contre ses hypothèses. Notre
contrat Échap des popups de champ en est l'illustration : consommer la touche seulement si
elle ferme, sinon elle referme aussi le `ui-modal` parent. Aucune librairie ne connaît
cette règle, toutes en imposent une autre.

**Le mode copie.** Un `ui-select` recopié tirerait `radix-ui` et son arbre. Le
consommateur devient propriétaire d'un fichier dont la moitié du comportement est dans
`node_modules`, hors de sa portée : exactement la valeur que le mode copie promet, annulée.

À quoi s'ajoute une inadéquation de granularité : une vingtaine des 61 ont un homologue
Radix, mais sept d'entre eux sont un élément natif plus du CSS, et les plus lourds n'en ont
pas : notre `ui-select` est un combobox filtrable multi-valeurs, pas le Select de Radix.

### Les autres verdicts

| Librairie                                        | Verdict     | Raison courte                                                                                                                                                                   |
| ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@floating-ui/react-dom`                         | **oui**     | Un hook qui rend des coordonnées, zéro fuite d'API. Prendre `-react-dom` et **pas** `@floating-ui/react`, dont la couche interactions définirait un contrat.                    |
| `@tanstack/react-virtual`                        | **oui**     | Un hook qui rend des index et des décalages. 3 composants concernés.                                                                                                            |
| `@tanstack/react-table`                          | non         | `ColumnDef` deviendrait l'API publique de `ui-table`. Le `ui-table` Angular est présentationnel, la version React le reste. Un projet qui a besoin d'un moteur apporte le sien. |
| `react-aria`                                     | non         | Même objection que Radix, en plus diffus : les _prop getters_ dictent la structure DOM. Reste une **référence de lecture** des motifs WAI-ARIA.                                 |
| `@internationalized/date`                        | non         | Le datepicker Angular fait 3 074 lignes sur `Intl` natif. `Temporal` quand il est partout.                                                                                      |
| `clsx`                                           | internalisé | Voir `core/utils/cx.ts`. Huit lignes, et le kit n'a plus **aucune** dépendance commune : en mode copie, un composant simple s'installe sans un seul `pnpm add`.                 |
| `react-hook-form`                                | interop     | Les champs exposent `ref`, `name` et le couple contrôlé/non contrôlé. Le kit ne connaît aucune librairie de formulaire, donc fonctionne avec toutes.                            |
| `tabbable`, `react-remove-scroll`, `aria-hidden` | **non**     | Tranchées le 2026-09-07, sur mesure. Voir le relevé ci-dessous.                                                                                                                 |

### Le relevé qui a tranché les trois micro-dépendances

Mesuré dans un navigateur réel (Chrome 148), sur une page sonde, avant d'écrire une ligne de
`core/overlay` ou de `core/focus`. La question n'était pas « ces librairies sont-elles
bonnes », mais « que reste-t-il à faire une fois la plateforme utilisée ».

| Capacité                          | Plateforme | Relevé                                                                                           |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| Piège de focus modal              | ✅         | `showModal()` : le focus entre dans le dialogue, et `focus()` sur un élément de fond est refusé. |
| Restitution du focus              | ✅         | Native au `close()` d'un `<dialog>`.                                                             |
| Arrière-plan inerte               | ✅         | Calque supérieur pour `<dialog>` et `popover` ; attribut `inert` partout ailleurs.               |
| Fermeture au clic extérieur       | ✅         | `popover="auto"`, sans une ligne de JavaScript.                                                  |
| Couche supérieure, arrière-plan   | ✅         | `::backdrop`, `:popover-open`.                                                                   |
| **Blocage du défilement de fond** | ❌         | `overflow` du `body` reste `visible` sous `showModal()`.                                         |
| **Positionnement ancré**          | ⚠️         | `anchor-name` répond présent ici, mais pas partout : Floating UI reste, comme arbitré.           |

D'où les trois verdicts.

**`tabbable` : non.** La partie difficile, l'ordre de tabulation et son bouclage dans une
couche modale, est faite par le navigateur. Ce qui reste est « poser le focus dans un
panneau », que `core/focus/focusable.ts` couvre avec un sélecteur lisible et testé.

**`aria-hidden` : non.** Le calque supérieur rend déjà l'arrière-plan inerte, et `inert` est
natif pour les cas qui n'y sont pas. Poser des `aria-hidden` par-dessus n'ajouterait rien
qu'un état à défaire correctement.

**`react-remove-scroll` : non.** C'est pourtant le seul manque réel. Mais une fois délimité,
il tient dans `core/overlay/use-ui-scroll-lock.ts` : figer `overflow`, compenser la barre de
défilement pour que la page ne saute pas, compter les verrous imbriqués. Une dépendance que
le consommateur devrait installer en mode copie ne se justifie pas pour ça.

Ces trois refus sont **inscrits dans `scripts/deps.check.mjs`**, avec leur motif : installer
l'une d'elles échoue en citant la mesure, plutôt que le vague « non arbitré ». Les rouvrir
reste légitime, mais demande la même chose que la première fois, une mesure.

### Ce que ça donne : quatre briques, pas dix composants

Les problèmes difficiles ne sont pas répartis sur dix composants, ce sont quatre capacités
que ces dix partagent. Elles deviennent des briques internes, comme `overlay/`, `motion/`
et `ripple/` le sont déjà côté Angular.

```
src/core/
├─ overlay/    use-ui-position.ts       → @floating-ui/react-dom   (SEUL point d'import)
│              use-ui-dismiss.ts        → maison (contrat Échap, clic extérieur, couches)
│              use-ui-layer.ts          → plateforme (<dialog>, popover, inert)
│              use-close-on-navigation.ts → maison (portage Angular, sans router imposé)
├─ focus/      use-ui-focus-trap.ts     → plateforme d'abord
│              use-ui-focus-origin.ts   → maison (~40 lignes)
│              use-roving-tabindex.ts   → maison (écrit 25 fois côté Angular)
│              use-active-descendant.ts → maison (le cœur des combobox du kit)
├─ virtual/    use-ui-virtual-list.ts   → @tanstack/react-virtual  (SEUL point d'import)
└─ utils/      cx.ts                    → maison (remplace clsx)
```

**La règle, et elle est vérifiée par la CI :** aucun composant n'importe une librairie
tierce, il importe une brique de `core/`. `scripts/deps.check.mjs` porte l'allocation
(quelle dépendance, quel fichier propriétaire) et refuse un import tiers hors de sa brique,
une dépendance non arbitrée, une brique implémentée sans sa dépendance déclarée, et une
dépendance déclarée sans brique qui l'utilise.

### Ce que le consommateur installe, en mode copie

| Ce qu'il copie                                   | Nombre | Ce qu'il installe              |
| ------------------------------------------------ | ------ | ------------------------------ |
| Composants natifs plus CSS                       | ~25    | **rien**                       |
| Comportement maison (masque, OTP, knob, rating…) | ~20    | **rien**                       |
| Panneaux flottants (menu, popover, select…)      | ~10    | `@floating-ui/react-dom`       |
| Listes virtualisées                              | 3      | plus `@tanstack/react-virtual` |

Deux dépendances au maximum, et zéro pour 45 composants sur 61.

### Le risque, assumé

Refuser Radix, c'est porter nous-mêmes les cas limites d'accessibilité de dix composants,
sur toute la matrice navigateur et lecteur d'écran. Trois raisons de le tenir pour le bon
pari : la barre n'est pas « égaler Radix » mais « égaler ce que nous faisons déjà », sur un
CDK qui fournit strictement moins (aucun dialogue, aucun menu, aucun select) ; le coût est
mutualisé par les quatre briques, donc un cas limite se corrige une fois ; et axe est
bloquant dès le premier composant.

**La contrepartie à exiger : le comportement Angular est la spécification.** Un composant
React ne se conçoit pas de zéro, il porte la logique clavier de son homologue. C'est moins
cher que de réinventer, et c'est la seule manière de rendre la parité vérifiable.

### Appliquée : l'éditeur riche, 23 septembre

`ui-editor` était gardé pour la fin comme un arbitrage de dépendance, sur la prémisse
qu'« aucun éditeur riche ne s'écrit dans `core/` ». Le kit Angular la contredit : son éditeur
n'a pas de moteur, c'est un `contenteditable` et un module de commandes natives, 10,5 kB
compressés. Mesurés contre lui : Tiptap, 105 kB pour son seul kit de base et 24 paquets ;
Lexical, 62 kB pour son cœur ; Slate, 50 kB, sérialiseur HTML à écrire.

**Retenu : aucun moteur**, et c'est ce principe qui tranche. Le comportement de l'éditeur ET
le format de sa valeur font partie du contrat : les deux stacks écrivent le même HTML, dont la
police, la taille et les couleurs sont des classes adossées aux jetons. Un moteur aurait écrit
son propre schéma, en styles en ligne par défaut. Un moteur ne redeviendrait pertinent que
pour un besoin absent aujourd'hui (tableaux, édition collaborative, mentions), et ce serait
alors une décision pour tout le Design System.

## D7, Mode copie : un CLI maison ET un registry compatible shadcn

**Retenu : les deux.** Un registry statique publié sur Pages à côté du Storybook, plus un
CLI qui apporte ce que le standard ne fait pas.

Le registry rend le kit installable par `npx shadcn add <url>` sans que nous maintenions un
client. Le CLI apporte l'étape fondation (jetons, styles, Storybook, MCP), le journal de
provenance `ui-kit.json`, et surtout l'`update` qui rejoue un diff fichier par fichier
contre la version installée. Cette dernière logique est la plus mûre du starter Angular,
elle est en Node pur, et elle se réutilise.

Phase 4. Le paquet est aujourd'hui un squelette marqué `private: true`, pour qu'un
`pnpm publish -r` distrait ne publie pas une coquille vide.

## D8, Tests : Vitest en mode navigateur

**Retenu : Vitest 5 en mode navigateur (Playwright/Chromium)**, et le contrôle axe rendu
bloquant dès le premier composant (`a11y: { test: 'error' }`).

Ce qui casse dans ces composants, ce sont les états de focus, la cascade CSS, la résolution
des variables et la géométrie des overlays : exactement ce que jsdom simule mal ou pas du
tout. Le test `ui-icon.test.tsx` qui vérifie une taille résolue via `getComputedStyle` ne
prouverait rien sous jsdom.

Rendre axe bloquant tôt est délibéré : côté Angular, le brancher tard a révélé 122
violations d'un coup, impossibles à rendre bloquantes sans casser toutes les PR.

**Effectif** depuis le branchement de `@storybook/addon-vitest` : `vitest.config.mts`
déclare deux projets, `unit` et `storybook`. Le second rend chaque story et la passe à axe.
Le contrôle a trouvé sa première violation à la minute où il a été branché : un contraste de
1,75 sur le contre-exemple `OnColorOmitted` de `ui-button`, qui existe justement pour
montrer ce défaut, et qui est donc exempté avec sa justification écrite.
