# Où on en est, et par quoi continuer

> **Ce fichier est le point de reprise.** Il existe parce que ce starter se construit par
> sessions séparées, souvent dans un contexte neuf qui ne sait rien de la précédente. Lu en
> deux minutes, il doit suffire à reprendre sans relire le dépôt ni redemander ce qui a déjà
> été tranché.
>
> Il ne remplace rien : il **oriente**. Les décisions vivent dans `docs/DECISIONS.md`, les
> conventions dans `AGENTS.md`, le détail des composants dans `docs/components-index.md`.

---

## Reprendre en deux minutes

1. **Ce fichier**, en entier. C'est l'état et la prochaine tâche.
2. **`AGENTS.md`** : les conventions de code. Non négociables, elles sont vérifiées en CI.
3. **`docs/DECISIONS.md`** : les huit décisions gelées, avec leur justification. Ne pas les
   rouvrir de mémoire : le raisonnement et les mesures qui les fondent y sont écrits.
4. Le composant patron : `packages/ui-kit-react/src/actions/ui-button/`. Tout nouveau
   composant se calque dessus.

Puis, avant de coder :

```bash
pnpm install          # génère les jetons et la table exports
pnpm docs:config:check # les sept garde-fous, en une commande
pnpm test             # 2 projets : tests écrits + chaque story passée à axe
```

⚠️ **Rien n'est committé depuis le 7 septembre.** L'arbre de travail porte trois sessions de
travail, et il est vert : voir « État du dépôt à la reprise » pour le découpage en lots et les
clés Jira à demander. C'est la première chose à traiter si on veut un historique lisible.

Et quand quelque chose se comporte bizarrement : chercher d'abord dans **Pièges déjà payés**.
La liste est longue parce que chaque entrée a coûté du temps une fois.

---

## État

| Phase | Sujet                           | État                                      |
| ----- | ------------------------------- | ----------------------------------------- |
| 0     | Socle et décisions              | ✅ terminée                               |
| 1     | Le patron, de bout en bout      | ✅ terminée (`ui-icon`, puis `ui-button`) |
| 2     | Fondation transverse            | 🟡 **en cours** : voir ci-dessous         |
| 3     | La vague des composants         | 🟡 45 sur 62                              |
| 4     | Mode copie et registry          | ⬜ pas commencée                          |
| 5     | MCP, doc publique, publication  | ⬜ pas commencée                          |
| 6     | Contrôle de parité entre stacks | ⬜ pas commencée                          |

**Chiffres du jour** : 44 composants, 52 points d'entrée publics, 1377 tests (845 écrits à la
main, 532 stories passées à axe), 7 garde-fous en CI, **deux** dépendances runtime
(`@floating-ui/react-dom` et `@tanstack/react-virtual`, un seul fichier chacune).

**Le dénominateur est 60**, et non 61 comme l'ont longtemps annoncé les README : c'est le
nombre de points d'entrée `ui-*` du starter Angular, mesuré.

```bash
cd <starter-angular>/projects/ui-kit && find . -name ng-package.json -path '*/ui-*' | wc -l
```

Ce total est écrit **une seule fois**, dans `scripts/components.check.mjs`, qui refuse
désormais un décompte périmé dans les deux README et dans le tableau ci-dessus. Le chiffre
avait dérivé deux fois : les listes de composants étaient validées, le nombre qui les résume ne
l'était pas.

⚠️ Les entrées **datées** de ce fichier et la décision D6 citent encore « 61 », le chiffre qui
circulait alors : on ne réécrit pas une mesure d'époque. Toutes les commandes de ce fichier,
elles, ont été exécutées avant d'y être écrites.

### Phase 2, dans le détail

| Brique         | État                                                                                                                                                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/types`   | ✅ `UiLevel`, `UiSubLevel`, `UiFeedbackLevel`                                                                                                                                                                                                                          |
| `core/theming` | ✅ provider contrôlé, sans clignotement au rendu serveur                                                                                                                                                                                                               |
| `core/utils`   | ✅ `cx`, `getFieldPath` (lecture d'un champ en notation pointée, partagée avec le résolveur d'options)                                                                                                                                                                 |
| `core/overlay` | ✅ `use-ui-position` (Floating UI, ancre élément **ou** point), `use-ui-dismiss`, `use-ui-scroll-lock`, `use-close-on-navigation`                                                                                                                                      |
| `core/focus`   | ✅ `focusable`, `use-focus-restore`, `use-roving-tabindex` (le piège modal est natif)                                                                                                                                                                                  |
| `core/virtual` | ✅ `use-ui-virtual-list` (TanStack Virtual, un seul fichier l'importe)                                                                                                                                                                                                 |
| `core/forms`   | ✅ `useControllableState`, `useUiField`, types partagés, moteur de masque                                                                                                                                                                                              |
| `core/motion`  | 🟡 jetons, `motion-transition`, `motion-reduce`, `overlay-motion` (entrée et sortie d'un panneau, en CSS pur) et `overlay-motion-enter` (entrée seule, sortie instantanée). Reste l'entrée et la sortie d'un élément HORS calque supérieur (listes, accordéon, toast). |
| `core/ripple`  | ⬜ 338 lignes à porter                                                                                                                                                                                                                                                 |

---

## La prochaine tâche

**Le noyau du `0.1.0` est COMPLET** : `ui-alert` et `ui-tabs` étaient les deux derniers, et
les vingt composants listés dans `docs/components-index.md` sont tous portés. Le kit couvre
donc la majorité des écrans d'un projet réel.

**Il reste 16 composants sur les 60.** Ne pas confondre les deux comptes, ce qui a déjà induit
en erreur : le kit COMPLET, encore loin, et ce noyau, désormais atteint.

Deux suites possibles, à arbitrer avec l'équipe plutôt que de mémoire :

- **Sortir le `0.1.0`** : lever `private: true` sur les trois paquets, geler l'API publique et
  publier. C'est ce que le noyau rend possible, et ce qui rend la phase 4 (mode copie et
  registry) discutable pour de bon, puisqu'un paquet publié couvre déjà le besoin courant.
- **Continuer la vague** : la famille `navigation` est la plus entamée et la mieux
  amortie (`ui-menu`, `ui-context-menu` et `ui-tabs` sont là), donc `ui-breadcrumb`
  (257 lignes, sans dépendance) puis `ui-stepper` (430 plus quatre SCSS) sont les deux
  prochains les moins chers.

Les 16 restants, par famille :

| Famille       | À porter                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actions`     | `ui-button-split`, `ui-speed-dial`                                                                                                                               |
| `base`        | `ui-image`                                                                                                                                                       |
| `forms`       | `ui-input-group`, `ui-input-otp`, `ui-knob`, `ui-swatch-picker`, `ui-file-upload`, `ui-editor`                                                                   |
| `informative` | `ui-accordion`, `ui-avatar-group`, `ui-toast`                                                                                                                    |
| `navigation`  | `ui-breadcrumb` (257 lignes), `ui-stepper` (430 plus quatre SCSS), `ui-bottom-tab-bar` (372), `ui-sidebar` (399 plus 228 pour son menu, qui réutilise `ui-menu`) |

Cette liste se **dérive**, ce qui vaut mieux que de la tenir à jour de mémoire :

```bash
(cd <starter-angular>/projects/ui-kit && find . -name ng-package.json -path '*/ui-*' \
  | sed 's|/ng-package.json$||;s|.*/||' | sort) > /tmp/angular.txt
ls -d packages/ui-kit-react/src/*/ui-* | sed 's|.*/||' | sort > /tmp/react.txt
comm -23 /tmp/angular.txt /tmp/react.txt
```

Les règles posées par la mesure, à suivre pour tous :

- un panneau **modal** est un `<dialog>` (`showModal()`), un panneau **non modal** porte
  `popover` ; le découpage est établi par `ui-popover` et repris par `ui-datepicker` ;
- l'entrée et la sortie d'un panneau se font en CSS pur (`utils.overlay-motion`) ;
- un `popover="manual"` ne **restitue pas le focus** en se fermant, contrairement à `auto` :
  c'est au composant de le rendre, et de vérifier d'abord que le focus était dans le panneau ;
- une valeur lue par deux gestionnaires d'un même geste est une **ref**, jamais un état ;
- au moins une story doit rendre le composant dans son état **garni**. Quand le composant n'a
  pas d'état ouvert au repos (un menu contextuel), c'est le `play` de la story qui l'ouvre : il
  tourne **avant** le contrôle axe, vérifié en y injectant une violation.

Dans tous les cas : recopier le patron `ui-button`, `ui-input` ou `ui-checkbox` selon la
famille, et faire tourner `pnpm docs:config:check` avant de committer. Il dira lui-même ce
qui a été oublié.

## Les décisions gelées

Résumé pour ne pas avoir à ouvrir le fichier. La justification, elle, est dans
`docs/DECISIONS.md` et ne se rediscute pas de mémoire.

|     | Décision                                                                                   |
| --- | ------------------------------------------------------------------------------------------ |
| D1  | Un dépôt par stack. Pas de monorepo commun avec le starter Angular.                        |
| D2  | Chaque starter embarque son propre `design-tokens/`. Report manuel entre dépôts.           |
| D3  | `@4sh/ui-kit-react`, plus `-cli` et `-mcp`. Dépôt `starter-react`, pas `-web`.             |
| D4  | Le sous-chemin public ne porte pas la catégorie : `@4sh/ui-kit-react/ui-button`.           |
| D5  | SCSS co-localisé, classes publiques stables, CSS porté par le composant.                   |
| D6  | Aucune librairie de composants. Deux dépendances ciblées, un fichier propriétaire chacune. |
| D7  | Mode copie : un CLI maison **et** un registry compatible shadcn.                           |
| D8  | Tests dans un vrai navigateur. Contrôle axe bloquant.                                      |

---

## Dette, listée et non découverte

Une dette écrite n'est pas une dette : c'est un choix. Ce qui suit est assumé, pas oublié.

- **`core/ripple` non porté**, donc `ui-button` et `ui-tabs` n'ont pas de prop `ripple` alors
  que la version Angular en a une. Son arrivée sera une évolution mineure, pas une rupture.
- **Un test de `ui-tooltip` est instable à froid.** « la bulle fermée n'occupe aucune place à
  l'écran » a échoué deux fois sur deux exécutions complètes lancées après un
  `rm -rf node_modules/.vite`, et passe à chaque fois seule ou à chaud (`:popover-open` vrai
  au premier rendu). Rien à voir avec les composants ajoutés depuis : c'est une course entre
  l'ouverture du panneau et la première assertion. Un contrôle bloquant qui échoue une fois
  sur deux au démarrage à froid de la CI est une dette, pas un aléa.
- **Le mode sombre n'est pas testé.** La bascule clair/sombre passe par l'addon dark-mode,
  qui vit dans le manager ; un lanceur de tests n'en a pas. Faire du thème un global de barre
  d'outils (comme `brand`) permettrait un projet Vitest par thème via `initialGlobals`. La
  moitié des jetons n'est aujourd'hui jamais contrôlée par axe.
- **Trois jetons informatifs sont sous le seuil AA en sombre.** Mesuré sur `ui-tag`, texte
  sur fond, en `subLevel` `high` : `success` 2,54, `warning` 2,80, `error` 3,76, pour 4,5
  attendus. Les `low` passent, et le clair passe partout (axe le vérifie). C'est un défaut
  des **jetons partagés**, donc présent à l'identique côté Angular : à corriger dans
  `semantics.json`, pas dans un composant. Conséquence directe du point précédent : sans
  contrôle en sombre, personne ne l'avait vu.
- **Les 15 pages de doc globales décrivent encore Angular.** Les chemins ont été corrigés,
  pas le contenu : on y lit encore `ThemeService`, `ng add`, Gridaflex. Elles construisent et
  s'affichent, mais elles trompent le lecteur.
- **Gridaflex n'est pas tranché** pour React. `storybook/docs/specifications/responsive.mdx`
  en parle comme s'il était là.
- **Les trois paquets sont `private: true`** en attendant la phase 5.
- **`data-unpositioned` est posé par les huit panneaux flottants, mais le mixin ne s'en sert
  que là.** Un composant qui ajouterait un panneau devra penser à l'attribut : rien ne le lui
  rappelle, `docs.config` ne voyant que les hooks `--ui-*`.
- **`docs:config` affiche une ligne d'avertissement attendue** : « 1 variable sans commentaire
  `///` ». C'est `$months-stack-below` de `ui-datepicker`, un breakpoint SCSS interne qui n'a
  ni hook `--ui-*` ni raison d'être publié. Ne pas partir à sa recherche.

---

## Les garde-fous, et ce que chacun attrape

Tous chaînés dans `pnpm docs:config:check`, tous bloquants en CI. Ils existent parce que
chacun correspond à une erreur réellement commise ici.

| Contrôle                           | Ce qu'il refuse                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `scripts/docs.config.mjs`          | Un hook `--ui-*` hors convention, ou sans `///`.                                |
| `scripts/component-vars.build.mjs` | Un alias vers un jeton inexistant ; les décomptes périmés de `figma/README.md`. |
| `scripts/components.check.mjs`     | Un composant absent d'une des listes du kit, ou un décompte annoncé périmé.     |
| `scripts/exports.build.mjs`        | Un point d'entrée compilé mais non déclaré dans `exports`.                      |
| `scripts/deps.check.mjs`           | Un composant qui importe une librairie tierce au lieu d'une brique `core/`.     |
| `scripts/docs.links.check.mjs`     | Un renvoi de doc vers un fichier inexistant, ou une story citée non exportée.   |
| `scripts/prose.check.mjs`          | Un tiret cadratin dans une prose, ou un tableau markdown dans un `.mdx`.        |

Plus, dans la CI : `git diff --exit-code` sur les fichiers générés **et** committés, que
seul git peut voir périmés.

---

## Pièges déjà payés

Ne pas les repayer. Chacun est documenté sur place, dans le fichier concerné.

- **Ne jamais mettre `tags: ['autodocs']`** sur une story qui a un `.mdx` co-localisé : deux
  entrées de doc au même identifiant, et l'indexation Storybook s'arrête.
- **Le builder du manager Storybook compile en JSX classique.** Un addon local sans
  `import React` casse à l'exécution, alors que tsc le déclare inutilisé. D'où le
  `"jsx": "react"` du `tsconfig.json` racine.
- **`reactDocgenTypescriptOptions` a besoin d'un `tsconfigPath`** qui couvre les composants,
  sinon docgen n'extrait rien **en silence** et la table d'API se rabat sur les `argTypes`.
- **`render()` de `vitest-browser-react` est asynchrone.** Sans `await`, l'erreur parle de
  `querySelector` et fait chercher au mauvais endroit.
- **TypeScript doit rester en 6.x** : la 7 est une bêta sans API JavaScript du compilateur,
  et `vite-plugin-dts` s'y casse. À épingler dans le paquet concerné, pas seulement à la
  racine.
- **Storybook lit `src/`, la démo lit `dist/`.** C'est délibéré : la démo est la seule chose
  qui vérifie la table `exports`. Ne pas « harmoniser ».
- **Un composant importe `core/` en RELATIF**, contrairement au starter Angular où
  `ng-packagr` exige le nom du paquet.
- **UN SEUL `render()` par test.** Deux rendus dans le même test empilent leurs conteneurs au
  même endroit de la page, et un clic réel : Playwright vise le centre de l'élément :
  atterrit sur celui du dessus. L'échec se déplace alors d'une exécution à l'autre.
- **Une assertion sur un état re-rendu doit utiliser `expect.element()`**, qui réessaie. Une
  lecture synchrone du DOM juste après un clic ne voit pas encore le nouveau rendu. Une
  assertion sur un espion, elle, peut rester synchrone : c'est ce qui rend l'écart facile à
  ne pas voir.
- **Une classe calculée par React ne peut pas décrire un état que le DOM tient seul.** Un
  bouton radio non contrôlé ne peut pas observer la désélection de ses voisins : l'état coché
  doit alors venir d'un sélecteur natif (`input:checked + …`), pas d'une classe. Vérifié sur
  `ui-radio`, où le groupe fonctionnait sans se voir.
- **`:host` et `:host-context()` n'existent pas ici.** Une règle portée par `:host` se fond
  dans la classe racine ; un `:host-context(X)` redevient un sélecteur d'ancêtre ordinaire
  `X .ui-y`. Sans encapsulation, la contrainte qui les imposait côté Angular disparaît.
- **Le mouvement réduit passe par `utils.motion-reduce`**, jamais par une media query écrite
  à la main : le mixin couvre d'un coup la préférence système et l'interrupteur
  `data-motion="off"` du kit.
- **`aria-label` est interdit sur un élément sans rôle.** Un `<div>` nu qui porte un nom
  accessible est refusé par axe. Un conteneur de chargement prend donc `role="status"`.
- **En colonne, `align-items` gouverne l'axe horizontal.** Un `flex-end` y ramène un enfant
  sans largeur propre à zéro. C'est ce qui rendait `ui-progress-bar` invisible en
  `valuePosition="bottom"`, bug présent à l'identique côté Angular.
- **React déduit `pointerenter` de `pointerover`.** Un `PointerEvent('pointerenter')`
  fabriqué n'atteint donc jamais le gestionnaire React : le test passe sans rien prouver, ou
  échoue sans raison visible. Utiliser un survol RÉEL (`locator.hover()`).
- **Le linter des hooks voit une ref dans un objet passé à une prop de rendu.** Transmettre
  une ref de rappel à un `trigger` est le motif normal, et déclenche pourtant
  `react-hooks/refs`. Faux positif, à désactiver localement avec son motif.
- **Une ref de déclencheur se type `(node: HTMLElement | null) => void`, pas `Ref<HTMLElement>`.**
  L'union ne se reverse pas sur un `<button>`, dont la ref attend un `HTMLButtonElement` ;
  une fonction acceptant le type large, si. Sans ça, chaque consommateur écrirait un cast.
- **Storybook n'active PAS les tableaux markdown.** `remark-gfm` n'est pas dans la chaîne :
  un tableau écrit en `|` rend des tuyaux en texte brut. La convention du dépôt est
  `<table className="doc-table">`, qui hérite des styles de `preview-head.html`. L'erreur
  ayant été commise **quatre** fois, `prose.check.mjs` la refuse désormais dans les `.mdx`.
- **La boîte du champ ne porte AUCUN inset** : chaque enfant direct porte le sien sur les
  bords qu'il touche (`utils.field-inset-edges`). L'oublier colle le contenu à la bordure.
- **Un bouton dans un champ prend `utils.field-action`**, jamais `field-affix`. Le second est
  écrit pour une icône : un `<button>` garderait ses styles navigateur, ses marges et sa
  hauteur de contenu.
- **Un champ `_auto-height` porte un inset VERTICAL**, publié dans `--_field-inset-block`. Une
  action pleine hauteur doit l'annuler, sinon elle s'arrête à la boîte de contenu (mesuré :
  32 px pour une boîte de 40).
- **`aspect-ratio` ne s'applique pas quand les deux axes sont déterminés.** Sur une action
  étirée verticalement, la largeur retombe à celle de l'icône (mesuré : 20 px, sous le minimum
  de cible de WCAG 2.5.8). Donner une largeur explicite.
- **Un panneau s'ancre sur la BOÎTE du champ, pas sur son contrôle.** S'ancrer sur le
  déclencheur donne un panneau plus étroit que le champ (mesuré : 276 px pour un champ de
  320), le contrôle vivant à l'intérieur des insets. `ui-field` expose `onBoxRef` pour ça.
- **Une animation d'entrée fausse toute mesure de `getBoundingClientRect()`.** Le `translate`
  et le `scale` sont inclus dans le rectangle, donc une assertion de position lit un état en
  cours de route. Mesurer la boîte de MISE EN PAGE avec `offsetLeft` / `offsetWidth`, que les
  transformations ne touchent pas.
- **Dans le panneau navigateur, une transition ne progresse jamais** (`visibilityState:
"hidden"`, `currentTime` figé à 0). Pour l'inspecter quand même : `el.getAnimations()`, puis
  poser `a.currentTime = <ms>` ou appeler `a.finish()`. C'est la seule façon de voir le milieu
  et la fin d'une transition ici.
- **Le style navigateur d'un `<dialog>` impose `width: fit-content` et `height: fit-content`,**
  ce qui l'emporte sur l'étirement demandé par deux insets opposés. Un tiroir de droite
  épouse alors la hauteur de son texte (mesuré : 109 px au lieu de 200). Remettre la
  dimension croisée à `auto` explicitement.
- **Le `display: none` d'un `<dialog>` ou d'un `[popover]` fermé vient du style NAVIGATEUR,
  donc un `display` d'auteur le bat.** Un panneau fermé reste alors affiché, recouvre son
  déclencheur, et paraît impossible à fermer. Redire la règle :
  `&:not([open]) { display: none }`, `&:not(:popover-open) { display: none }`.
- **Vérifier `dialog.open` ne prouve RIEN sur ce que voit l'utilisateur.** La propriété était
  juste pendant tout le bug. Un test de panneau mesure `getComputedStyle().display` et la
  largeur du rectangle, pas seulement l'état.
- **L'événement `close` d'un `<dialog>` est mis en FILE, donc il peut ne pas arriver.**
  Mesuré : jamais, dans un onglet en arrière-plan. Ne jamais faire dépendre l'état React de
  cet événement. L'état ferme, le DOM suit ; l'événement n'est qu'un filet de sécurité.
- **Un `<dialog>` s'ouvre par une MÉTHODE, pas par un attribut.** Poser `open` en JSX rend
  bien le dialogue, mais sans calque supérieur, sans arrière-plan et sans piège de focus : il
  ressemble à un dialogue sans en être un. `showModal()` dans un effet, toujours.
- **Le cache Vitest de Storybook se périme quand un composant est ajouté.** Le symptôme est
  spectaculaire et trompeur : neuf fichiers de story échouent d'un coup sur
  « Failed to fetch dynamically imported module », dans des composants qu'on n'a pas touchés.
  `rm -rf node_modules/.cache/storybook node_modules/.vite`.
- **`pnpm lint` lance `eslint --fix`, qui SUPPRIME une directive de désactivation inutile.**
  Un `eslint-disable-next-line` mal placé (la ligne suivante n'est pas celle qui déclenche la
  règle) est retiré du fichier, et l'erreur revient. Dans du JSX, viser l'attribut fautif
  demande souvent la forme bloc `disable` / `enable`.
- **Le light-dismiss natif ignore les événements synthétiques.** Mesuré : un
  `document.body.click()` ou un `KeyboardEvent` fabriqué ne ferme ni un `popover` ni un
  `<dialog>`. Un test qui les dispatche à la main ne prouve donc rien sur ces chemins.
- **Le linter des hooks refuse de lire les propriétés d'un résultat de crochet contenant des
  refs de rappel.** Les destructurer en haut du composant, ce qui est de toute façon la forme
  idiomatique.
- **Écrire une ref pendant le rendu est refusé** (rendu concurrent). Le motif « dernière
  valeur » passe par un effet sans tableau de dépendances.
- **`pointer-events: none` fait attendre un vrai clic 15 secondes.** Playwright attend que
  l'élément devienne cliquable, ce qui n'arrive jamais. Tester le garde JS derrière avec un
  événement synthétique, et le CSS par une lecture de style : deux lignes de défense, deux
  tests.
- **Une assertion sur un espion ne prouve rien si l'attente d'avant est déjà satisfaite.**
  Attendre un libellé toujours rendu passe immédiatement, et l'espion est lu trop tôt.
  Attendre ce qui change vraiment (`expect.poll` sur la disparition d'un nœud).
- **`useState` dans le `render` d'une story enfreint les règles des hooks.** Une story à état
  déclare un vrai composant, appelé depuis `render`.
- **`cx` met la classe du composant en premier, celle du parent en dernier.** Donc
  `className.split(' ')[0]` d'une icône imbriquée rend `ui-icon`, pas `ui-tag-icon` :
  vérifier une classe attendue se fait avec `classList.contains`, jamais par position.
- **Un jeton `*-surface-*` ne porte pas de texte.** Le contrôle axe a refusé une story qui
  posait une couleur de fond comme couleur de libellé. Pour du texte, un jeton `*-content-*`.
- **Un `popover="manual"` ne mémorise PAS l'élément focalisé avant son ouverture,**
  contrairement à un `popover="auto"` : la spécification ne l'enregistre que pour les seconds.
  Se fermer ne rend donc le focus à personne, et l'utilisateur le retrouve sur `<body>`.
  Mesuré en croyant l'inverse, et sur un test qui l'a dit tout de suite.
- **`autoUpdate` ne voit pas une ancre qu'on DÉPLACE.** Il observe le défilement, le
  redimensionnement de la fenêtre et celui des éléments, pas un changement de `left`/`top`
  d'auteur. Une ancre mobile (le pointeur d'un menu contextuel) est donc une ancre
  **virtuelle** : `useUiPosition` prend un `anchorPoint`, et c'est le changement d'identité de
  l'objet qui déclenche la remesure.
- **`computePosition` de Floating UI est ASYNCHRONE.** Le premier rendu après une ouverture
  porte encore la position d'avant : lire un rectangle une seule fois juste après ne prouve
  rien. Un test de placement passe par `expect.poll`.
- **`useControllableState` ne prend pas de fonction de mise à jour.** Son setter attend une
  valeur ; lui passer `(prev) => next` écrit la fonction dans l'état, en silence. L'état
  courant se lit au rendu, et il est juste au moment de l'appel.
- **Le cache de modules de Vitest peut servir la version PRÉCÉDENTE d'un test.** Symptôme :
  un test corrigé échoue à l'identique, au même numéro de ligne, alors que le fichier sur le
  disque est bon. Même remède que pour le cache de Storybook : `rm -rf node_modules/.vite`.
  Corollaire de méthode : vérifier que le rapport JSON qu'on lit vient bien de l'exécution
  qu'on vient de lancer, son décompte total suffit à le dire.
- **Le `play` d'une story tourne AVANT le contrôle axe.** C'est donc la façon de soumettre à
  axe un composant qui n'a pas d'état ouvert au repos : on l'ouvre dans `play`. Vérifié en
  injectant une violation dans le panneau ainsi ouvert, qui a bien fait échouer la story.
- **Le clavier d'un motif à focus glissant se branche sur les ENTRÉES, pas sur le conteneur.**
  Un `<ul role="menu">` porteur d'un `onKeyDown` doit être focalisable pour satisfaire
  `jsx-a11y`, ce qu'il n'est justement pas dans ce motif. Sur les entrées, où le focus vit
  déjà, la règle n'a rien à dire et il n'y a aucune désactivation à écrire.
- **Un chiffre écrit en prose dérive, même à côté d'une liste validée.** Le décompte
  « N composants sur 60 » est resté faux deux fois alors que `components.check.mjs` validait
  les listes elles-mêmes : ce qui n'est pas vérifié n'est pas vrai, c'est juste écrit. Il est
  désormais contrôlé, numérateur ET dénominateur. Le total du Design System vaut **60**, mesuré
  sur le starter Angular, et non 61 comme l'ont longtemps annoncé les README.
- **Le noyau du `0.1.0` n'est pas le kit.** Annoncer « il ne reste que deux composants » en
  parlant du noyau, alors qu'il en reste dix-huit au total, est une confusion déjà provoquée
  une fois. Les deux comptes se citent ensemble ou pas du tout.
- **`ResizeObserver` ne tire JAMAIS dans le panneau navigateur.** La page y est cachée, donc
  les étapes de rendu ne tournent pas, et ses rappels sont livrés par elles. Mesuré : zéro
  déclenchement en 300 ms sur un observateur neuf. Même famille que `requestAnimationFrame` et
  que les transitions figées. Tout ce qui dépend d'une mesure observée se vérifie donc dans le
  navigateur de TEST, qui peint pour de vrai, et pas à la main dans le panneau.
- **Un crochet ne peut pas remplacer une directive appliquée à une LIGNE.** Une ligne se rend
  dans une boucle dont la longueur varie, et un crochet appelé un nombre variable de fois
  casse l'ordre des crochets. Ce qu'il faut, c'est une **fabrique de props** sans état,
  passée au balisage projeté. Un composant rendu dans ce balisage, lui, a son propre état de
  crochets et peut lire un contexte.
- **Un `--ui-*` est une PROMESSE de réglage public.** Un canal privé entre une mesure faite en
  JavaScript et une règle CSS se nomme `--_quelquechose`, comme le reste du kit :
  `docs.config` exige un `///` sur tout hook `--ui-*`, et documenter comme thémable une valeur
  calculée serait un mensonge.
- **Le style navigateur d'un `[popover]` pose aussi `overflow: auto`.** Une enveloppe de
  positionnement qui fait la taille du panneau qu'elle porte lui ROGNE donc son ombre, peinte
  hors de la boîte. La liste des propriétés à neutraliser consciemment sur un panneau du
  calque supérieur est complète : `display`, `inset`, `margin`, `width`, `height`, `border`,
  `padding`, `background` et `overflow`.
- **Masquer un panneau émet un `mouseenter` sans que le pointeur ait bougé.** L'élément sous
  le pointeur change, et le navigateur le signale. Mesuré : 7 ms après la fermeture d'un
  sous-menu, son entrée parente en reçoit un et le rouvre, ce qui ressemble à un empilement de
  panneaux. Un survol qui ouvre quelque chose doit donc se garder d'un `pointermove` préalable,
  qu'un pointeur immobile ne produit jamais.
- **À la souris, le survol arrive AVANT le clic.** Une entrée qui ouvre son panneau au survol
  et le BASCULE au clic le referme donc aussitôt : le clic paraît sans effet. Le clic ouvre,
  il ne bascule pas.
- **Une sortie animée garde le panneau AFFICHÉ** (`allow-discrete`), et cette fenêtre expose
  ce que la fermeture devait cacher : un sous-menu y glisse par-dessus son parent. Quand le
  panneau n'a pas de raison de survivre à sa fermeture, c'est `utils.overlay-motion-enter`,
  entrée seule, comme la directive du kit Angular.
- **`computePosition` est asynchrone, donc la PREMIÈRE image d'un panneau peut être fausse.**
  Elle porte la position d'avant, et le panneau paraît apparaître ailleurs puis se replacer.
  `useUiPosition` expose `isPositioned` : tant qu'il est faux, le panneau porte
  `data-unpositioned` et `utils.overlay-motion` le garde dans son état fermé.
- **Un résultat négatif obtenu juste après une édition ne prouve rien.** J'ai conclu qu'un
  survol n'était pas en cause en neutralisant son gestionnaire et en voyant le défaut
  persister : c'était le cache de modules qui servait l'ancienne version. La trace, elle, a
  montré l'inverse. Vider `node_modules/.vite` avant de croire une absence.
- **Une boîte à zéro ne veut pas dire « repositionné en haut à gauche ».** Un élément dont un
  ANCÊTRE est en `display: none` n'a plus de boîte du tout, et son rectangle se lit (0, 0),
  transform intact. J'ai failli corriger un repositionnement qui n'existait pas : c'est le
  `transform` qu'il faut lire pour trancher, pas le rectangle.
- **Un composant qui reverse `...rest` ne doit pas AUSSI lire `rest['aria-label']`.** Le nom
  atterrit alors sur la racine, qui n'a pas de rôle, ce qu'axe refuse. Sortir la prop de la
  destructuration et ne la poser qu'à l'endroit qui porte le rôle.
- **Une bande d'onglets VERTICALE ne doit pas pouvoir rétrécir.** Elle est alors un frère du
  contenu dans un conteneur en ligne, et `flex-shrink` répartit le manque de place au prorata
  des tailles de base : le paragraphe du panneau, énorme, écrase la bande. Mesuré : 50 px au
  lieu de 131, libellés rognés à zéro par leur propre `min-width: 0`. Le `min-width: 0` de la
  bande est écrit pour l'axe HORIZONTAL, où elle doit pouvoir être plus étroite que ses
  onglets pour défiler ; sur l'axe vertical il faut `flex: 0 0 auto`. La SCSS étant reprise du
  kit Angular, le défaut y est présent à l'identique.
- **Un contenu écrasé par un flex ne DÉBORDE pas : il disparaît.** Corollaire du précédent, et
  la raison pour laquelle un premier test ne prouvait rien : le libellé avait `min-width: 0`,
  donc sa boîte tombait à zéro sans jamais faire déborder son parent. Une assertion sur
  `scrollWidth > clientWidth` reste vraie et ne voit rien. Ce qui distingue les deux états,
  c'est `clientWidth` **contre** `scrollWidth` sur l'élément écrasé lui-même.
- **Un état qu'on dérive d'une prop s'ajuste PENDANT le rendu, pas dans un effet.** Le motif
  est documenté par React, et c'est le seul qui passe `react-hooks/set-state-in-effect`, qui
  refuse un `setState` en tête d'effet. Rencontré sur le panneau paresseux de `ui-tabs`, qui
  doit se souvenir d'avoir été actif : `if (active && !seen) setSeen(true)` au rendu, React
  rejouant aussitôt sans peindre l'état intermédiaire.
- **Un motif à focus glissant sur des enfants PROJETÉS lit le DOM, pas un registre.**
  `useRovingTabIndex` adresse les entrées par index et suppose donc de les connaître au rendu,
  ce qu'un conteneur de composition (`UiTabList`) ne peut pas faire sans faire remonter un
  enregistrement depuis chaque enfant, c'est-à-dire un `setState` dans un effet. L'ordre des
  onglets est de toute façon une propriété du DOM : `querySelectorAll('[role="tab"]')` le
  donne juste, quelle que soit la façon dont l'appelant les compose.

---

## État du dépôt à la reprise

> **Section transitoire.** À supprimer dès que les lots ci-dessous sont committés.

Rien n'est committé depuis `d29abf0` (7 septembre) : le travail de trois sessions vit dans
l'arbre de travail, soit une trentaine de composants et de briques non suivis. Le dépôt est
**vert** (`pnpm test`, `pnpm docs:config:check`, `pnpm typecheck`, `pnpm lint:check`, et
`pnpm kit:build`), mais un `git log` ne le raconte pas.

Les conventions de `.claude/rules/git-conventions.md` veulent une clé Jira en tête de message,
et un `git add` par fichier nommé. Découpage proposé, du plus ancien au plus récent :

| Lot | Contenu                                                                                                                                                                                                                  | Message                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | `core/focus`, `core/overlay`, `core/virtual`, `core/forms` (`format-label`, `option-resolver`)                                                                                                                           | `feat(core): ajouter les briques focus, overlay, virtual et resolveur d'options` |
| 2   | `ui-link`, `ui-avatar`, `ui-chip`, `ui-empty-state`, `ui-progress-bar`, `ui-read-only`, `ui-skeleton`, `ui-spinner`, `ui-tooltip`                                                                                        | `feat(informative): ajouter les composants presentationnels`                     |
| 3   | `layout/` (`ui-card`, `ui-modal`, `ui-popover`, `ui-drawer`), `styles/utils/_motion.scss`, `storybook/docs/specifications/overlays.mdx`                                                                                  | `feat(layout): ajouter les panneaux du calque superieur`                         |
| 4   | `ui-select`, `ui-autocomplete`, `ui-input-tags`, `ui-datepicker`, `ui-nudger`, `ui-rating`, `ui-slider`, `ui-segment-control`, `ui-toggle-block`, `ui-toggle-button`, plus `ui-field` / `ui-radio` / `ui-badge` modifiés | `feat(forms): completer la famille formulaires`                                  |
| 5   | `navigation/` (`ui-menu`, `ui-context-menu`)                                                                                                                                                                             | `feat(navigation): ajouter ui-menu et ui-context-menu`                           |
| 6   | les quatre correctifs de panneaux, `data-unpositioned` sur les huit panneaux, `_motion.scss`                                                                                                                             | `fix(overlay): corriger ombre, empilement, position et clic des panneaux`        |
| 7   | `table/` (`ui-paginator`, `ui-table`), `core/utils/get-field-path`                                                                                                                                                       | `feat(table): ajouter ui-paginator et ui-table`                                  |
| 8   | `scripts/*.check.mjs`, `AGENTS.md`, `CHANGELOG.md`, `docs/*`, README, `Overview.mdx`, fichiers générés                                                                                                                   | `chore(tooling): garde-fous de prose, de tableaux et de decomptes`               |
| 9   | `informative/ui-alert`, `navigation/ui-tabs`                                                                                                                                                                             | `feat(informative): ajouter ui-alert` puis `feat(navigation): ajouter ui-tabs`   |

Quatre fichiers sont **générés mais committés**, et la CI les vérifie par un
`git diff --exit-code` après build. Ils s'accumulent au fil des lots plutôt que d'appartenir à
l'un d'eux : les régénérer et les mettre en scène **avant chaque commit** est donc la marche à
suivre.

```bash
pnpm exports:build && pnpm docs:config   # avant CHAQUE commit
git add packages/ui-kit-react/package.json \
        packages/ui-kit-react/src/styles/component-vars.scss \
        figma/component-vars.json figma/README.md
```

Le premier porte la table `exports`, les deux suivants les hooks de theming, le dernier leurs
décomptes.

---

## Tenir ce fichier à jour

À la fin d'une session qui a changé l'état : mettre à jour le tableau **État**, la **prochaine
tâche**, et ajouter une ligne au journal. Deux minutes, et c'est ce qui évite de rouvrir des
décisions déjà prises à la session suivante.

Un piège nouvellement payé va dans **Pièges déjà payés** _et_ en commentaire à l'endroit
concerné. Le commentaire est ce qui le rend visible au bon moment ; cette liste est ce qui le
rend trouvable quand on ne sait pas encore qu'on le cherche.

---

## Journal

### 2026-09-07 : Amorçage

Dépôt créé, chaîne complète vérifiée de bout en bout sur `ui-icon` : jetons, fondation SCSS,
build multi-entrées à table `exports` générée, Storybook, doc générée depuis les `///`, tests
dans un Chromium réel. Les huit décisions prises et écrites.

Repris tel quel du starter Angular, sans réécriture : les jetons et leur build Style
Dictionary, la fondation SCSS, la chaîne de doc, l'index de recherche, les trois addons
Storybook locaux, les garde-fous, les conventions de version.

### 2026-09-07 : D6 rearbitrée

Mesure sur le starter Angular : 49 de ses 61 composants n'importent rien d'Angular CDK, et
aucun n'utilise ses gestionnaires de clavier. Décision inversée par rapport à la
recommandation initiale : **aucune librairie de composants**. L'argument décisif est la
parité Dual-Engine : deux librairies tierces différentes de part et d'autre rendraient le
contrôle de parité de la phase 6 invérifiable.

`clsx` internalisé, le kit n'a alors plus aucune dépendance runtime. `deps.check.mjs` écrit pour
que la règle tienne toute seule ; ses trois cas de refus ont été testés en les provoquant.

### 2026-09-07 : `ui-button`

Second composant, et le premier qui traverse les trois axes de couleur (45 jeux de jetons).
SCSS reprise presque à l'identique : D5 validée sur un cas réel.

Trois traductions d'API : `icon` accepte un nom ou un nœud, `render` remplace `routerLink`
sans imposer de routeur, `buttonProps` disparaît au profit de `...rest`.

Deux bugs trouvés **en regardant le rendu**, invisibles au lint comme au typecheck : le
manager Storybook cassé par un import de React retiré, et la table d'API vide faute de
`tsconfigPath` pour docgen.

### 2026-09-07 : La tranche formulaires

`core/forms` + `ui-label` + `ui-helper` + `ui-field` + `ui-input`, en une tranche verticale
plutôt qu'en composants isolés : c'est le couple contrôlé / non contrôlé qui était le risque,
et il fallait l'exercer pour de bon.

`useControllableState` porte ce contrat pour tout le kit. `useUiField` remplace la classe de
base `BaseFormField` d'Angular par un hook, et tire les identifiants de `useId()` : donc
stables entre rendu serveur et hydratation, ce que le compteur incrémental d'Angular n'aurait
pas été.

Les slots nommés (`[uiFieldPrefix]`…) deviennent des props `ReactNode`, ce qui supprime les
entrées `hasPrefix` et `hasFooter` : elles n'existaient que parce qu'Angular ne sait pas si
un `<ng-content>` a reçu quelque chose.

Le contrôle axe a de nouveau payé : il a refusé une story de `ui-label` qui posait un jeton
de surface comme couleur de texte. Trois erreurs de lint aussi, toutes justes : dont un
`useState` dans un `render` de story.

### 2026-09-07 : `ui-radio` et `ui-toggle`

La famille des contrôles hors boîte est fermée. `ui-radio` a demandé une décision d'API : un
bouton radio ne veut rien dire seul, l'exclusivité appartient au groupe. D'où `groupValue`
pour le mode contrôlé, et le `name` natif pour le mode non contrôlé : sans `defaultValue`,
qui n'aurait aucun moyen de coordonner ses voisins.

Deux défauts trouvés par l'outillage, tous deux réels :

- `jsx-a11y` a refusé `aria-invalid` sur le rôle `radio`, que la version Angular pose. La
  validité porte sur le groupe, pas sur l'option.
- Une vérification à l'écran a montré qu'un groupe **non contrôlé** fonctionnait sans se
  voir : la SCSS pilotait le point depuis la classe `._checked`, absente dans ce mode. Corrigé
  par un sélecteur natif, en additif.

Les trois divergences avec Angular sont désormais déclarées dans `docs/DUAL-ENGINE.md`.

### 2026-09-07 : `ui-textarea` et `ui-checkbox`

Deux familles validées d'un coup. `ui-textarea` prouve que la coquille se réutilise : elle
avait déjà `multiline`, et le champ n'a eu qu'à s'y poser. `ui-checkbox` ouvre la famille des
contrôles **hors boîte** et valide le contrat contrôlé sur une valeur non booléenne
(`trueValue` / `falseValue`).

Deux états qui ne sont pas des attributs, et qu'il faut donc écrire à la main :
`indeterminate` n'existe que comme propriété du DOM, et `readOnly` n'existe pas du tout sur
une case : le navigateur bascule avant qu'on puisse l'en empêcher, donc le composant remet la
propriété et annonce `aria-readonly`.

`joinIds` ajouté à `core/forms` : le compteur de `ui-textarea` se chaîne à
`aria-describedby` à côté du message, et plusieurs champs auront le même besoin.

Vérifié à l'écran que `autoResize` grandit **et rétrécit** (88 → 184 → 88 px) : le
rétrécissement est ce que la remise de la hauteur à `auto` avant lecture de `scrollHeight`
rend possible, et c'est exactement ce qu'une implémentation naïve rate.

### 2026-09-07 : Le contrôle axe devient réel

`@storybook/addon-vitest` branché : `pnpm test` exécute deux projets, et chaque story est
rendue puis passée à axe. Le contrôle a trouvé sa première violation à la minute où il a été
branché : un contraste de 1,75 sur `OnColorOmitted`, le contre-exemple de `ui-button`, qui
existe justement pour montrer ce défaut. Exempté avec sa justification écrite.

Ce fichier créé, et `docs.links.check.mjs` avec lui : il a immédiatement trouvé une référence
morte vers un runbook Figma qui n'existe que dans le dépôt Angular.

### 2026-09-07 : Les deux champs difficiles

`ui-input-mask` et `ui-input-number`, qui ferment la famille des champs posés sur `ui-field`.

Le moteur de masque est **porté tel quel** depuis le kit Angular, dans
`core/forms/mask-engine`, avec ses 29 tests : c'est ce qui garantit que les deux stacks
masquent à l'identique. Seule concession aux types plus stricts d'ici, deux accès indexés
réécrits (`charAt`, puis un `??`).

Les deux champs traitent l'affichage de façon opposée, et c'est délibéré. Le masque
**déduit** son texte du modèle, donc rien à garder en phase, au prix d'un curseur à
restaurer après chaque rendu. Le numérique garde le texte en **état séparé** : pendant la
frappe, « 1, » ou « - » ne correspondent à aucun nombre, et reformater ferait sauter le
curseur. Le formatage riche et l'écrêtage attendent la sortie du champ.

Côté Angular, le formatage d'affichage était une méthode protégée à redéfinir par héritage.
Ici c'est la prop `formatValue` : la même chose, en composition, réglable par instance.

Le contrôle `prose.check.mjs` ajouté, et le dépôt nettoyé de ses tirets cadratins.

### 2026-09-07 : Premier lot de présentationnels

`ui-separator`, `ui-badge` et `ui-tag`. Trois composants sans état, portés d'un bloc : leur
SCSS est repris tel quel, seule la logique change de langage.

Deux conventions confirmées sur ce lot. Les avertissements de développement passent par
`process.env.NODE_ENV` et un `Set` de déduplication, sinon `<StrictMode>` les affiche en
double et fait douter du diagnostic. Et un composant sans nom accessible ne prend **pas** de
`role="img"` : un rôle muet ferait annoncer « image » sans rien dire de plus, alors que
l'absence de rôle le laisse simplement décoratif.

Trois jetons sombres sous le seuil AA trouvés en mesurant le contraste à la main sur
`ui-tag`. Ajoutés à la dette : ils viennent des jetons partagés, pas du composant.

### 2026-09-07 : Chargement et identité

`ui-spinner`, `ui-skeleton`, `ui-progress-bar` et `ui-avatar`. Deuxième lot de
présentationnels, et le premier à toucher au mouvement.

Les quatre composants Angular écrivaient chacun leur propre bloc « mouvement réduit » : une
media query, plus un `:host-context([data-motion='off'])`. Ici, `utils.motion-reduce` fait les
deux, et c'est du code en moins à chaque fois. Plus généralement, tous les `:host` du kit
Angular se fondent dans la classe racine, et les `:host-context()` redeviennent de simples
sélecteurs d'ancêtre.

Deux traductions d'API notables. Le `TemplateRef` d'Angular devient une fonction de rendu
(`renderMark`, `renderValue`), dans la ligne de `render` sur `ui-button`. Et le
`<ng-content select="[avatarBadge]">` devient une prop `badge`, comme `prefix` et `suffix`
sur `ui-field`.

Le délai de grâce du spinner a demandé une reprise : poser l'état dans un effet déclenche des
rendus en cascade, ce que la règle `react-hooks/set-state-in-effect` refuse. La visibilité se
**déduit** donc du délai écoulé, l'effet ne fait plus que programmer le minuteur. Bénéfice
au passage : allonger le délai re-masque le spinner, ce que la première version ne faisait pas.

Deux vrais défauts trouvés en vérifiant. axe a refusé une de mes stories, qui donnait un
`aria-label` à un `<div>` nu : la doc enseignait un motif invalide. Et `ui-progress-bar`
rendait une piste de **largeur nulle** en `valuePosition="bottom"` : en colonne,
`align-items: flex-end` gouverne l'axe horizontal. La SCSS étant reprise à l'octet près, le
bug existe à l'identique côté Angular ; corrigé ici, déclaré dans `DUAL-ENGINE.md`.

### 2026-09-07 : Les présentationnels sont finis

`ui-link`, `ui-card`, `ui-empty-state`, `ui-read-only` et `ui-chip`. La famille est close, et
`layout` s'ouvre avec sa première entrée.

Le gros de la traduction porte sur la **projection de contenu**. Angular déclarait des
directives marqueurs (`uiCardTitle`, `uiEmptyStateActions`), puis inspectait le DOM après
rendu pour savoir si le slot par défaut avait reçu quelque chose. React n'a besoin de rien de
tout ça : les zones sont des props (`media`, `header`, `footer`, `actions`), le corps est
`children`, et la présence se teste directement. Trois `afterNextRender` disparaissent.

`ui-link` reprend le contrat `render` de `ui-button` : le kit ne connaît toujours aucun
routeur. `ui-chip` reprend le contrat contrôlé / non contrôlé du kit, décliné en
`selected` / `defaultSelected` / `onSelectedChange`.

Deux racines varient selon les props : `ui-read-only` rend un `<dl>` ou un `<div>`,
`ui-chip` un `<button>` ou un `<span>`. Leurs props natives sont donc typées sur
`HTMLAttributes<HTMLElement>`, avec un cast de la `ref` par branche.

Mesuré sur `ui-link` en paragraphe : 3,03 de rapport avec le texte environnant, pour 3
attendus. Conforme, mais sans marge. Écrit dans la page de doc avec les chiffres, plutôt que
laissé à découvrir.

### 2026-09-07 : Couches et focus, et trois dépendances refusées

`core/overlay` et `core/focus`. Les deux briques qui débloquent les huit composants à panneau
flottant.

La séance a commencé par une **mesure**, pas par un choix de librairie : une page sonde dans un
navigateur réel, pour établir ce que la plateforme couvre aujourd'hui. Résultat : le piège de
focus modal, la restitution du focus, l'inertie de l'arrière-plan, la fermeture au clic
extérieur et la couche supérieure sont **tous natifs**. Un seul manque, mesuré : `showModal()`
ne fige pas le défilement de l'arrière-plan.

Les trois micro-dépendances en attente depuis D6 sont donc **refusées**, chacune avec sa
mesure : `tabbable` (le travail difficile est fait par le navigateur), `aria-hidden` (le calque
supérieur et `inert` suffisent), `react-remove-scroll` (le manque réel tient en quarante
lignes). Les refus sont inscrits dans `scripts/deps.check.mjs` : installer l'une d'elles échoue
en citant le motif, plutôt qu'un vague « non arbitré ». Éprouvé en la provoquant.

`@floating-ui/react-dom` est installé, et le kit n'a donc plus « zéro dépendance runtime » mais
une. Un seul fichier l'importe, et le garde-fou le vérifie.

Deux défauts trouvés par mes propres tests dans le sélecteur des focalisables : un
`<button tabindex="-1">` y restait (il faut le garde sur **chaque** entrée, pas seulement sur
l'entrée `[tabindex]`), et le test de l'inertie ne prouvait rien, `inert=""` étant faux pour
React, donc l'attribut n'était jamais posé.

### 2026-09-07 : `ui-modal`, ou ce que le natif fait à notre place

Premier composant à panneau, et démonstration de la règle posée la veille : un dialogue modal
est un `<dialog>`.

Côté Angular, ce composant fait 621 lignes de TypeScript pour reconstruire un scrim, un
positionneur, un piège de focus CDK, une séquence de z-index et une gestion d'Échap. Ici,
**le navigateur fait tout cela**, et il reste à écrire le blocage du défilement, le clic sur
l'arrière-plan, les neuf positions, le glissement, le redimensionnement et l'agrandissement.

Deux props disparaissent, et c'est volontaire : `autoZIndex` et `baseZIndex` n'ont plus
d'objet, le calque supérieur empilant les dialogues dans leur ordre d'ouverture. Les garder
aurait été promettre un réglage sans effet. Divergence déclarée.

Vérifié dans un vrai navigateur, sur un dialogue non cantonné : `:modal` actif, arrière-plan
à `rgba(0, 0, 0, 0.5)`, `focus()` sur un bouton de fond **refusé** par le piège natif,
défilement du `body` bloqué puis rendu, et fermeture au clic sur l'arrière-plan.

Un défaut trouvé à la mesure : en mode `contained`, le dialogue débordait de son cadre de 87
pixels. Le style navigateur ne contraint que l'axe horizontal d'un dialogue non modal, son
`top` restant à `auto` : il se posait donc à sa position statique. `inset: 0` rend son travail
au `margin: auto`.

Deux règles `jsx-a11y` se sont mises en travers. Le clic sur l'arrière-plan a été déplacé
auprès du reste du câblage natif, ce qui règle la première **sans** la désactiver. La seconde
contredit franchement axe, qui exige qu'une région défilante soit atteignable au clavier :
elle est désactivée à cet endroit précis, avec son motif écrit.

### 2026-09-08 : `ui-popover` et `ui-tooltip`, le calque supérieur pour de bon

Les deux composants qui exercent `useUiPosition`, et qui vérifient la seconde moitié de la
règle : un panneau non modal porte `popover`.

Le bénéfice se mesure. Dans un cadre de 220 px en `overflow: hidden`, le panneau s'affiche à
**320 px de large** et déborde sans être coupé, sans un z-index nulle part. C'est le problème
le plus pénible des panneaux flottants, et il disparaît. `popover="auto"` donne en prime la
fermeture au clic extérieur et sur Échap sans une ligne de JavaScript.

Deux traductions de fond. `ui-popover` passe d'un pilotage **impératif** (des méthodes, et le
composant qui mute le DOM du déclencheur pour y poser `aria-expanded`) à un pilotage
**contrôlé** avec une prop de rendu `trigger`. `ui-tooltip` était une **directive**, ce que
React n'a pas : c'est devenu un composant enveloppant, sur le même motif.

Le fondu du tooltip est passé au navigateur, via `@starting-style` et
`transition-behavior: allow-discrete`. Cela supprime un second état React, qui n'existait que
pour donner une frame de départ à la transition, et deux erreurs de linter avec lui.

Trois pièges payés, tous ajoutés à la liste : les événements de pointeur synthétiques
n'atteignent pas React, le linter des hooks crie sur une ref transmise à une prop de rendu, et
une ref de déclencheur doit se typer en fonction et non en `Ref<T>`.

### 2026-09-08 : `ui-modal` ne se rouvrait pas

Défaut remonté par le user : « la modal est tout le temps ouverte et je ne peux pas la
fermer ». Il avait raison, sur deux points distincts.

**Le défaut de fond.** La fermeture partait du DOM (`dialog.close()`), et l'état React se
mettait à jour depuis l'événement `close`. Or `close` est **mis en file** : mesuré sur un
élément neuf, sans instrumentation, il n'arrive pas dans un onglet en arrière-plan. L'état
restait alors à `true` avec un dialogue fermé à l'écran, et le déclencheur ne rouvrait plus
rien, `setOpen(true)` ne changeant rien. L'état est désormais la source de vérité, un seul
effet ouvre et ferme, et l'événement n'est plus qu'un filet de sécurité.

Mes tests passaient pourtant. Ils passaient **à cause** du bug : ils cliquaient sur la
fermeture et lisaient `dialog.open`, or la fermeture allait droit au DOM. Le test qui manquait
est celui du cycle, fermer PUIS rouvrir. Il existe maintenant, et un autre vérifie le contrat
contrôlé, qu'un parent immobile garde le dialogue ouvert.

**Le défaut de présentation.** Toutes les stories démarraient ouvertes, donc la page de doc
affichait six dialogues simultanément, chacun masquant son propre déclencheur. On ferme alors
un dialogue sur six et rien ne semble bouger. Un seul reste ouvert, pour l'anatomie.

**Et le défaut visible, que j'avais raté deux fois.** Le style navigateur
`dialog:not([open]) { display: none }` est de niveau UA : le `display: flex` de `.ui-modal`
le battait. Un dialogue fermé restait donc **affiché**, par-dessus son propre déclencheur.
`ui-tooltip` avait le même défaut depuis que j'avais confié son fondu à `@starting-style`.

C'est ce que le user voyait, et c'est ce que mes captures d'écran montraient. Je les avais
écartées deux fois en invoquant un « frame composité périmé » du panneau navigateur, parce que
je lisais `dialog.open`, qui était juste. La leçon est là : une propriété d'état ne dit rien de
ce qui est à l'écran. Les tests des trois composants à panneau mesurent maintenant
`display` et la largeur du rectangle.

Deux heures perdues, aussi, à croire à un bug de géométrie : dans le panneau navigateur, le
viewport d'une iframe de story se rapporte à 0×0 et les coordonnées deviennent négatives. Un
`resize_window` produit alors une page à une échelle et des captures à une autre, donc des
clics qui tombent à côté sans rien dire. Conversion obligatoire : `800 / innerWidth`.

### 2026-09-08 : `ui-drawer`, et le bénéfice d'une leçon fraîche

Le tiroir, ancré sur un bord. Même socle que `ui-modal`, à savoir le `<dialog>` natif : seuls
changent l'ancrage, réglé par les insets, et la dimension du panneau. Le scrim et le
positionneur de la version Angular disparaissent tous les deux.

Écrit avec le bon modèle d'état du premier coup, et avec le `&:not([open]) { display: none }`
que `ui-modal` avait coûté cher à apprendre. Les tests mesurent la **visibilité** dès le
départ, pas la propriété.

Un troisième piège du même genre trouvé par ces tests : le style navigateur d'un `<dialog>`
impose `width: fit-content` et `height: fit-content`, ce qui l'emporte sur l'étirement demandé
par deux insets opposés. Un tiroir de droite épousait donc la hauteur de son texte, 109 px au
lieu de 200. Il faut remettre la dimension croisée à `auto`.

Le motif se dégage : le style navigateur d'un `<dialog>` pose `display`, `width`, `height`,
`margin` et `inset`, et **chacun** doit être neutralisé consciemment. Ce qu'on gagne en piège
de focus et en calque supérieur se paie en vigilance sur cinq propriétés.

### 2026-09-08 : le mouvement des panneaux, sans une ligne de JavaScript

Manque signalé par le user : les dialogues et les tiroirs s'ouvraient et se fermaient d'un
coup, là où le kit Angular les animait. Il avait raison, et c'était une incohérence de plus :
`ui-tooltip` était le seul à s'animer.

La fondation du système de motion était déjà là, reprise du kit Angular : jetons de durée et
de courbe, `motion-transition`, `motion-reduce`, interrupteur `data-motion="off"`. Ce qui
manquait, c'est l'**entrée et la sortie** : côté Angular, `animate.enter` / `animate.leave`
plus une directive, pour garder le nœud sortant dans le DOM le temps de l'animation.

React n'a pas d'équivalent, et n'en a pas besoin : pour un panneau du calque supérieur, la
plateforme fait tout. `transition-behavior: allow-discrete` laisse `display` et `overlay`
s'animer, et `@starting-style` donne l'état de départ d'un élément qui vient d'entrer dans le
calque. Un mixin partagé, `utils.overlay-motion`, et les quatre composants à panneau sont
servis. Zéro JavaScript, et la sortie marche aussi, ce qui est la partie que les
implémentations maison ratent.

Mesuré en forçant l'horloge des transitions, le panneau navigateur ne les faisant pas
progresser : entrée à 0 puis 0,68 puis 1 en opacité, 0,96 puis 0,987 puis 1 en échelle, et
sortie qui **se termine en `display: none`**. Le tiroir glisse de 100 % à 31,5 % à zéro depuis
son bord.

Deux pièges de mesure notés au passage. Une animation d'entrée fausse tout
`getBoundingClientRect()`, puisque le rectangle inclut les transformations : deux tests de
géométrie du tiroir sont passés aux `offset*`. Et dans ce panneau une transition ne progresse
jamais, il faut piloter `currentTime` à la main pour l'inspecter.

Un contrôle de nommage a refusé mes deux crochets `--ui-motion-easing-enter` et `-leave`, hors
convention. Il avait raison aussi : `--ui-motion-easing`, qui existait déjà, suffit, les
courbes par sens restant des jetons. Deux noms de moins dans l'API publique.

### 2026-09-08 : `ui-select`, et le motif de liste d'options

Le plus gros composant du kit : 994 lignes côté Angular, une quarantaine de props. Il fixe le
motif que `ui-autocomplete` et `ui-datepicker` réutiliseront.

`core/virtual` d'abord, puisqu'il le débloquait : un fichier qui enveloppe TanStack Virtual,
et rien d'autre du kit ne connaît la librairie. Le compilateur React annonce d'ailleurs
« Compilation Skipped: Use of incompatible library » sur ce seul fichier, ce qui est exactement
le résultat voulu par la mise en quarantaine.

Deux helpers purs portés tels quels du kit Angular, comme le moteur de masque : le résolveur
d'options (chemins pointés, `dataKey`, égalité) et `formatLabel`. Seule adaptation, les
accesseurs passent de fonctions à des valeurs simples, React re-rendant de lui-même.

Le panneau vit dans le calque supérieur, avec `popover="manual"` et non `auto` : le
light-dismiss natif se déclencherait aussi sur un clic sur le déclencheur, qui rouvrirait
aussitôt. C'est `useUiDismiss` qui ferme, et son exception sur l'ancre existe pour ce cas
précis.

Trois défauts trouvés en vérifiant, et non en relisant. Le déclencheur n'avait **aucun**
gestionnaire de clic : j'avais retiré celui de l'enveloppe pour satisfaire `jsx-a11y` sans le
remettre sur le bouton, et douze tests l'ont dit. Le panneau s'ancrait sur le bouton et
mesurait 276 px pour un champ de 320 ; `ui-field` expose désormais `onBoxRef`, ce qui servira
aussi aux deux composants suivants. Et la liste virtuelle imbriquait un `<li>` dans un `<li>`,
ce qui aurait cassé la relation entre la liste et ses options.

Deux règles `jsx-a11y` réglées sans les désactiver. Le clic sur l'enveloppe n'était nécessaire
qu'au chevron en mode éditable : celui-ci est devenu un **vrai bouton nommé**, donc
atteignable au clavier, ce qu'il n'était pas. Et `aria-required` a rejoint l'objet qui porte
déjà `role="combobox"`, où la règle ne le juge plus sur le rôle implicite du `<button>`.

### 2026-09-08 : trois défauts de finition sur `ui-select`

Signalés par le user, tous les trois réels et tous les trois vérifiés à la mesure.

**Les puces collées à la bordure.** La boîte du champ ne porte aucun inset : chaque enfant
direct porte le sien sur les bords qu'il touche, et `.ui-select-values` l'oubliait. La SCSS
venant du kit Angular, le défaut y est présent à l'identique.

**Le bouton de bascule brut.** Le chevron cliquable du mode éditable utilisait `field-affix`,
qui est écrit pour une icône : un `<button>` gardait donc ses styles navigateur. Le kit a déjà
le bon mixin, `field-action`, pour « bouton d'action carré, pleine hauteur, collé à droite ».
Mesuré après correction : hauteur 36 pour une boîte de 36, écarts droite et haut à zéro, rayon
`0 6px 6px 0`.

**Les tableaux de doc en texte brut.** Storybook n'active pas `remark-gfm`, donc un tableau
markdown rend des tuyaux. Deux pages écrites cette semaine étaient touchées, `ui-select` et
`ui-link` ; la convention du dépôt, `<table className="doc-table">`, était déjà là et je ne
l'avais pas regardée.

Les deux corrections de style sont désormais **tenues par des tests** qui mesurent le rendu :
l'inset des valeurs, et la géométrie du bouton dans sa boîte. Une correction de finition sans
test se re-régresse à la première refonte de SCSS.

### 2026-09-08 : `ui-autocomplete`, et deux défauts du mixin d'action

Le motif de `ui-select` réutilisé tel quel : même combobox, même panneau ancré sur la boîte du
champ, même liste. Ce qui change est le contrat, et il change tout : le composant **ne filtre
rien**. Il émet une requête par `onComplete`, et l'appelant répond en mettant `suggestions` à
jour, ce qui permet d'interroger un serveur.

Trois choses spécifiques valaient d'être écrites soigneusement. Le **cache de libellés** :
les suggestions changent à chaque requête, donc une puce perdrait son libellé dès la requête
suivante sans retenir celui du moment du choix. Le **garde de requête unique** : un clic sur le
bouton de liste déplace le focus dans le champ, ce qui déclencherait `completeOnFocus` en plus
de sa propre requête. Et `forceSelection`, qui valide à la sortie du champ pour que le modèle
ne contienne jamais de texte libre.

Les puces exercent enfin `useRovingTabIndex` : un seul arrêt de tabulation pour toute la liste.

Un défaut trouvé dans `ui-chip` au passage : il écrasait le `role` qu'on lui passait. Côté
Angular l'hôte et le span interne sont deux éléments, donc un `role` posé de l'extérieur
cohabite ; ici c'est le même élément, et une puce servant d'option voyait son `role="option"`
remplacé par `group`. Un rôle fourni par l'appelant gagne désormais.

**Et deux défauts du mixin `field-action`**, tous deux mesurés, tous deux présents à
l'identique côté Angular. Dans un champ `_auto-height` l'action s'arrêtait à la boîte de
contenu, 32 px pour une boîte de 40 : la boîte publie maintenant son inset vertical, et
l'action l'annule. Et sa largeur venait d'un `aspect-ratio`, qui ne s'applique pas quand les
deux axes sont déterminés : elle retombait à la largeur de l'icône, 20 px, **sous le minimum de
cible de WCAG 2.5.8**. Une largeur explicite règle les deux, et donne le bon visuel quand la
boîte grandit.

Cinq de mes tests étaient fautifs, pas le composant : un `{...props}` qui écrasait le
`onComplete` du harnais, un filtre sensible aux accents qui mesurait le harnais au lieu du
composant, une ambiguïté de rôle **voulue** (deux listes, deux espaces d'options), et un bouton
de sortie placé sous le panneau du calque supérieur.

### 2026-09-08 : la page Overview renvoyait vers la coquille de preview

Signalé par le user : cliquer une carte de l'Overview ouvrait bien la page de documentation,
mais **sans le menu ni la barre d'outils** de Storybook.

La cause est une règle de résolution d'URL, pas un bug de Storybook. La page de doc vit dans
`/iframe.html`, le manager dans la fenêtre du haut. Une URL relative se résout contre le
document **qui la porte**, donc contre `/iframe.html` : le `?path=…` des cartes devenait
`/iframe.html?path=…`, et la fenêtre du haut chargeait la coquille de preview. Le piège vaut
aussi pour un `<a target="_top">`, dont la cible change la fenêtre mais pas la base de
résolution. Un lien absolu est donc obligatoire dans les deux cas.

Le correctif construit la racine du Storybook depuis `location.pathname` privé de son dernier
segment, ce qui remet aussi d'aplomb une fenêtre déjà tombée sur `/iframe.html` et préserve un
déploiement sous-chemin. « Voir la documentation » devient en plus une vraie ancre : accessible
au clavier, ouvrable dans un nouvel onglet. **Le même défaut existait dans le starter Angular**,
d'où la page vient ; il y est corrigé à l'identique.

Le build a révélé au passage deux `<Canvas of={…} />` de `ui-modal.mdx` pointant vers des
stories que je n'avais jamais créées : j'avais écrit la section de doc du motion sans ses
exemples. Storybook rend alors un bloc vide, et Vite se contente d'un avertissement noyé dans
sa sortie : je ne l'ai vu que par hasard. Les deux stories existent maintenant (`Motions`,
qui enchaîne les six préréglages sur un seul dialogue, et `MotionDisabled`), et
`links:check` gagne un second passage qui refuse une story citée mais non exportée. 125 renvois
de story sont désormais contrôlés.

Le contrôle a été vérifié en cassant volontairement un renvoi, pas seulement en le voyant
passer sur un arbre sain.

### 2026-09-08 : `ui-datepicker`, le dernier champ à panneau

Le plus gros composant du kit : 2101 lignes de TS côté Angular, 40 stories, 17 sections de
doc. Le user a demandé de l'analyser en entier avant de le porter, ce qui était le bon
réflexe : l'essentiel de sa difficulté n'est pas le calendrier.

**Ce qui l'est.** La saisie manuelle, qui porte trois cicatrices de tickets. Le masque
auto-« / » ne sait que **construire** une date depuis rien : il re-dérive le champ entier
depuis un flux plat de chiffres. Dès qu'une valeur existe, ou dès que l'édition se fait à
l'intérieur du texte plutôt qu'à sa queue, il se suspend, sinon remplacer le mois `07` par un
seul `1` transforme `08/07/2026` en `08/12/026`. Et la distinction frappe / suppression se
fait sur la longueur des données, pas sur `inputType`, indisponible là où il faudrait.

L'autre finesse : l'ordre jour / mois / année n'est pas déduit de la locale mais **sondé
depuis la sortie du `dateFormat`**, sur une date témoin dont les trois composantes sont deux à
deux distinctes. Sans ça, un formateur `fr-FR` sous une locale `en-US` affiche `08/07/2026` et
le relit mois d'abord.

**Trois écarts d'architecture**, tous en faveur de la plateforme. Le CDK overlay devient un
`<dialog>` modal ou un `[popover]` non modal, découpage déjà établi par `ui-popover` ;
`cdkTrapFocus` devient le piège natif de `showModal()`, gratuit ; et le `FocusMonitor`, qui
distingue un focus utilisateur d'un focus programmatique, devient un drapeau de geste récent
plus le garde qui couvre le focus qu'on rend soi-même à la fermeture. La saveur du panneau
suit `showOnFocus` seul, donc l'élément ne change jamais en cours d'interaction.

**Un vrai défaut trouvé à la vérification** : un calendrier **en ligne** portait une valeur de
juillet en affichant le mois courant. Côté Angular la vue s'amorce dans `writeValue` ; ici je
n'amorçais qu'à l'ouverture, et un calendrier en ligne n'en connaît aucune. Corrigé par un
ajustement au rendu, pas dans un effet, pour qu'aucune image du mauvais mois ne passe.

**Et un défaut de ma story**, pas du composant : le harnais plafonnait tout à 320 px, ce qui
écrasait deux mois côte à côte à 125 px chacun, en-têtes de colonnes superposés. Le pane
rendait la mesure trompeuse (`largeur: 20`, mois à `0`) : c'est la capture d'écran qui a
tranché, puis un relevé de `max-width` calculé qui a montré que le plafond venait de moi.

Vérifié en vrai, pas seulement par les tests : le cycle ouvrir / fermer / rouvrir du panneau,
le masque frappe par frappe (`0` → `08/` → `08/07/` → `08/07/2026`), l'édition sur place, la
suppression en queue, le forage sur les trois niveaux avec le focus confié à la grille quand
le titre passe `disabled`, et le contraste de la bande de plage **en sombre** (4,69, au-dessus
de AA dans les deux modes : la paire `highlightlow` tient, contrairement aux `high`).

### 2026-09-08 : la famille numérique, et deux défauts de pointeur

`ui-nudger`, `ui-rating` et `ui-slider`. Trois composants qui n'ont pas de boîte de champ :
côté Angular ils étendent `BaseFieldControl` et non `BaseFormField`. Côté React il n'y a rien
à porter là : chaque contrôle autonome déclare ses props, comme `ui-toggle` l'avait déjà fait.

**Un défaut d'accessibilité dans `ui-rating` Angular.** Son SCSS déclare
`$focus-ring-width`, le documente comme « épaisseur de l'anneau de focus »… et ne l'utilise
nulle part : il n'y a aucune règle `:focus-visible` dans le fichier. Or le clavier vit sur un
`<input type="range">` en `opacity: 0`, dont l'anneau natif est donc invisible. Le composant
est opérable au clavier **sans indicateur de focus visible**, ce qui échoue WCAG 2.4.7, et le
hook annoncé dans la table de theming ne fait rien. Le portage rend l'anneau sur le rang
d'étoiles ; mesuré à 2 px violet avec le focus, `none` sans.

**Deux défauts de pointeur dans `ui-slider`**, tous deux trouvés en le manipulant, pas par les
tests.

Le premier est propre à React : je tenais la poignée active dans un état, lu synchroniquement
par `pointermove` et `pointerup`. Un état React n'est pas encore à jour dans un gestionnaire
frère du même geste, là où le signal Angular l'est immédiatement. C'est une **ref** qu'il
fallait, d'autant qu'elle ne sert jamais au rendu.

Le second existe des deux côtés. Au premier appui, la poignée reçoit le focus, ce qui la fait
**défiler dans la vue** et décale le rectangle de la piste : `valueFromPointer` mappe alors le
même `clientX` sur une valeur toute autre. Mesuré sur une piste de 320 px dans un conteneur
étroit : `left` passait de 16 à -192, et un glissement vers 70 arrivait à 100. L'utilisateur
pointe déjà la poignée, donc `focus({ preventScroll: true })`. Le test de non-régression a été
vérifié en retirant l'option : il échoue avec un décalage de -220 px.

Un détail de méthode qui a coûté du temps : ma première mesure du glissement lisait un état
laissé par la mesure précédente, sans recharger la page. J'ai cru voir un défaut là où il n'y
en avait pas, puis raté celui qui était réel. Recharger avant de mesurer un composant à état.

### 2026-09-08 : `ui-toggle-block`, `ui-segment-control`, et un trou dans `ui-radio`

Deux composants de la famille de sélection groupée, et une lacune trouvée en chemin.

**`ui-toggle-block`.** Sa mécanique tient dans une idée : un `<label for>` étiré couvre le
bloc, donc toute la surface active l'input natif sans un seul gestionnaire de clic. Le label
est vide à dessein, c'est le corps du bloc qui nomme le contrôle par `aria-labelledby`, ce
qui permet d'y projeter du contenu interactif, ce qu'un `<label>` refuse. Trois couches
empilées font tenir l'ensemble : corps, zone de clic, puis indicateur et contenu interactif
au-dessus d'elle.

**Le trou dans `ui-radio`.** Le bloc passe `readOnly` à son indicateur ; `ui-checkbox` et
`ui-toggle` le gèrent (un input à cocher n'a pas de `readOnly` natif), mais le `ui-radio`
React ne l'avait **pas du tout**. Ajouté, avec un écart assumé : pas d'`aria-readonly`, la
spécification ne le supportant que sur `radiogroup`. Côté Angular c'est pire et plus discret :
`readonly` y est **hérité de la classe de base et jamais utilisé**, donc un
`<ui-radio readonly>` seul n'a aucun effet, en silence.

**`ui-segment-control`** a deux motifs ARIA, pas un, et c'est le fond du composant : mode
simple en `radiogroup` avec sélection au passage des flèches, `multiple` en `group` avec des
flèches qui ne font que déplacer. L'inverse serait faux dans les deux sens.

Deux défauts trouvés, tous deux par confrontation au résolveur d'options **partagé** :

- il renvoie l'option ENTIÈRE quand aucun `optionValue` n'est configuré. Juste pour une liste
  d'options quelconques, faux pour la forme riche `{ value, label, icon }` que ce composant
  documente : le modèle recevait l'objet, et la story plantait sur « Objects are not valid as
  a React child ». Trouvé en le faisant tourner, pas par les tests.
- il retombe sur `String(option)`, donc `"[object Object]"`, pour un objet sans clé `label`.
  Un segment en icône seule affichait donc ce texte. Trouvé, lui, par un test.

Le résolveur partagé n'est pas touché : j'ai vérifié que son spec Angular épingle ce
comportement, et que `ui-select` en dépend légitimement. Les deux arbitrages sont donc locaux,
comme ils le sont déjà dans le résolveur propre au composant Angular.

Un piège de mesure de plus, et le même que la veille : l'indicateur glissant paraissait en
retard d'un cran. C'était `getBoundingClientRect` d'un élément en transition sous une horloge
gelée. Lire le style **inline** visé, ou forcer l'animation, montre qu'il tombe pile sur
l'`offsetLeft` de chaque segment.

### 2026-09-08 : la piste du contrôle segmenté s'étirait

Signalé par le user, capture à l'appui : le cadre du contrôle segmenté était bien plus large
que ses trois segments, avec du vide à droite.

`display: inline-flex` **ne suffit pas** à se dimensionner au contenu. Un parent flex ou grid
bloquifie ses enfants et les étire dans l'axe transverse : le `display` calculé devient `flex`,
et la piste part à la largeur du parent pendant que les segments, eux, restent collés à leur
contenu. Mesuré : piste de 420 px pour 326 px de contenu, donc 94 px de vide.

Le correctif est une largeur explicite (`width: fit-content`), l'étirement ne s'appliquant
qu'à une taille transverse `auto`. Préférée à `align-self: start`, qui aurait aussi cassé
l'alignement vertical à côté d'un champ plus haut. Vérifié à zéro pixel de vide dans trois
parents (colonne flex, grille, colonne sans alignement), et les tests de non-régression ont
été éprouvés en retirant la ligne : ils échouent à 420 et 500 px.

**Balayage du kit** : 13 autres racines sont en `display: inline-*` sans largeur explicite,
donc techniquement étirables. Aucune n'est corrigée, et c'est délibéré. Le défaut n'est visible
que quand la racine **peint une boîte** que son contenu ne remplit pas. `ui-button`,
`ui-chip`, `ui-tag` et `ui-badge` centrent leur contenu et exposent déjà `expanded` ou
`fluid` : s'y étirer est souvent ce que le consommateur veut. `ui-nudger`, `ui-rating`,
`ui-icon` et `ui-spinner` n'ont pas de boîte visible, donc le vide ne se voit pas. Les figer
serait une régression pour les premiers.

### 2026-09-08 : `ui-toggle-button`, et la promotion du résolveur riche

Dernier de la famille de sélection groupée. Deux modes dans un composant, et `options` est le
seul interrupteur : simple avec `aria-pressed` sur un bouton, groupe avec `role="group"` et un
modèle en tableau. Le groupe est toujours multi-sélection, à dessein : un choix exclusif est le
travail de `ui-segment-control`, et mentir sur la sémantique coûterait plus cher que le
composant ne rapporte.

**Le résolveur riche est promu.** J'avais noté la veille qu'un troisième besoin identique
justifierait de le partager ; il y en a eu un deuxième, à l'identique, et l'original Angular
porte exactement les deux mêmes surcharges. `createRichOptionResolver` vit donc dans
`core/forms`, le contrôle segmenté a été refactoré dessus, et ses 35 tests ont servi de filet.
Le résolveur de liste reste intact : ses deux comportements sont justes pour `ui-select`.

**Un écart ARIA de plus, même famille que les précédents.** La version Angular pose
`aria-invalid` sur les boutons ; la spécification ne le supporte pas sur le rôle `button`, et
c'est cohérent, la validité portant sur une saisie et non sur une commande. Troisième cas après
`ui-radio` (`aria-invalid`, puis `aria-readonly`) : le motif se répète assez pour qu'il vaille
la peine de repasser sur les attributs ARIA du kit Angular d'un bloc.

Le garde-fou le plus utile du composant n'est pas technique : un **nom accessible qui change
avec l'état** est réannoncé à chaque prise de focus, donc le contrôle sonne comme un bouton
différent selon sa valeur. Dès que `onLabel` et `offLabel` diffèrent, un `aria-label` stable est
exigé. Vérifié en vrai : le libellé passe de « Désactivé » à « Activé » et l'icône de
`bell-slash` à `bell`, pendant que le nom reste « Notifications ».

### 2026-09-08 : `ui-input-tags`, et une story qui rendait le contrôle axe vide de sens

Dernier champ de formulaire. Sa mécanique intéressante tient en une contrainte : une `listbox`
ne peut pas contenir de champ texte, donc l'enveloppe `role="listbox"` n'entoure **que** les
tags, et c'est `display: contents` qui les garde sur les mêmes lignes que la saisie.

**Une violation d'accessibilité, trouvée parce que mes stories rendent des tags au repos.**
La croix de retrait était un `<button>` imbriqué dans une puce elle-même `role="option"`
interactive : `nested-interactive`, qu'axe refuse à juste titre. Le `tabindex="-1"` n'y change
rien, axe le dit explicitement dans son message.

Le plus instructif est ailleurs : **la même violation était latente dans `ui-autocomplete`
depuis son portage**, et le contrôle axe ne l'avait jamais vue parce que sa story `Multiple`
démarre **sans aucune puce**. Un contrôle qui tourne sur un composant rendu dans son état vide
ne vérifie rien de ce qui compte. Corrigé des deux côtés, avec une story `MultipleWithTags` qui
rend des puces au repos.

La croix devient une décoration `aria-hidden` et le retrait clavier passe par `Suppr` sur
l'option, ce qui est le motif « liste de jetons » de l'APG. Conséquence assumée : la prop
`removeTagLabel` disparaît des deux composants, puisqu'elle nommait un contrôle qui n'existe
plus. Une prop qui ment coûte plus cher qu'une prop absente.

Troisième fois de la journée qu'une de mes propres stories enseigne un mauvais motif : celle de
`renderTag` mettait un `<button>` dans le contenu projeté. La contrainte est maintenant écrite
dans la doc, le composant ne pouvant pas l'imposer.

**La famille formulaires est complète.** Les sept champs sans panneau sont portés, après les
champs à panneau et les champs en boîte.

### 2026-09-08 : `ui-menu` et `ui-context-menu`, la famille `navigation` s'ouvre

Le motif de menu en entier, en un lot : le menu déclaratif et le menu contextuel qui
l'embarque. La catégorie était vide, et `ui-menu` avait déjà toutes ses briques.

**Ce que la plateforme reprend au CDK.** Le popup et les sous-menus en cascade sont des
`popover="manual"` du calque supérieur, comme `ui-select`. Disparaissent avec l'overlay CDK :
la séquence de z-index, le repositionnement au défilement (`autoUpdate` le fait), et la
directive de mouvement, l'entrée et la sortie passant par `utils.overlay-motion`. Mesuré : un
panneau de 210 px s'affiche entier dans un cadre de 120 px en `overflow: hidden`, et le
premier item d'un sous-menu tombe **exactement** sur son item parent (écart de 0 px).

**Trois traductions d'API.** Le pilotage impératif (`toggle(event)`, plus un `uid` public
pour l'`aria-controls` du déclencheur) devient le contrat contrôlé et une prop de rendu
`trigger`, exactement comme `ui-popover`. `routerLink` devient `render` sur l'item, plus
`active`, l'appelant étant le seul à savoir quelle entrée est celle de la page. Et
`ui-context-menu` renonce à `show` / `hide` / `toggle` : un menu contextuel n'a pas d'état
utile sans les coordonnées qui vont avec, et l'événement d'ouverture porte les deux.

**Deux ajouts à `core/overlay`, tous deux tirés d'un besoin réel.** Un écart d'axe
**transverse** (`offset: { main, cross }`), qui est ce qui aligne la cascade sur son parent.
Et une ancre **virtuelle** : un menu contextuel s'ancre sur un point, pas sur un élément. La
première tentative posait une ancre invisible et la déplaçait en CSS, ce qui n'a jamais
fonctionné : `autoUpdate` observe le défilement et les redimensionnements, **pas** un
déplacement d'auteur. Le panneau restait collé en haut à gauche. L'ancre virtuelle supprime
l'élément, et c'est son changement d'identité qui fait remesurer.

**Le focus glissant est le crochet partagé, en mode contrôlé.** La liste des entrées
atteignables change de longueur dès qu'un groupe se replie : un index gardé en état
désignerait alors une autre entrée. La **clé** reste juste, donc l'index se déduit de la clé à
chaque rendu et `useRovingTabIndex` garde la politique de flèches et de bouclage du kit. Et le
focus du DOM est la source de vérité : `focusEntry` ne fait que déplacer le focus, l'`onFocus`
de chaque entrée met l'état à jour. C'est ce qui a supprimé un `setState` dans un effet, que
`react-hooks/set-state-in-effect` refusait à juste titre.

**Un faux pas payé.** J'avais confié la restitution du focus à `hidePopover()`, en écrivant
même dans le code pourquoi c'était inutile de le faire soi-même. Un test l'a démenti dans la
minute : la spécification n'enregistre l'élément focalisé que pour un `popover="auto"`, jamais
pour un `manual`. Le focus repartait sur `<body>`. La restitution est désormais explicite,
dans l'effet qui masque le panneau, et conditionnée à ce que le focus ait été **dans** le
panneau.

**Deux règles `jsx-a11y` réglées sans les désactiver.** Le clavier du menu est branché sur les
**entrées** et non sur la liste : un conteneur porteur de gestionnaires devrait être
focalisable, ce que le motif interdit, alors que sur les entrées le focus y vit déjà. Et
l'enveloppe de positionnement d'un sous-menu n'a plus aucun gestionnaire : la touche de sortie
de cascade est posée sur le **panneau** du sous-menu, qui la reçoit par `...rest`. Un défaut
d'accessibilité trouvé en chemin, du même genre : le panneau recevait `aria-label` par
`...rest` **et** le posait sur sa liste, donc un `<div>` sans rôle portait un nom.

**Le contrôle axe et la story fermée.** Un menu contextuel n'a pas d'état ouvert au repos,
donc axe ne voyait rien de ce qui compte, exactement le trou payé sur `ui-autocomplete`. Le
`play` d'une story tourne **avant** le contrôle : c'est lui qui ouvre le menu. Vérifié en
injectant une violation dans le panneau ainsi ouvert, qui fait bien échouer la story.
`ui-menu`, lui, a une story ouverte au repos (`PopupOpen`) et une cascade ouverte au repos
(`Flyout`), l'`expanded` d'un groupe gardant le même sens dans les deux rendus.

**Deux pièges de méthode.** Le cache de modules de Vitest a servi deux fois la version
précédente d'un test corrigé, avec le même message au même numéro de ligne : le décompte total
du rapport JSON est ce qui le trahit. Et `computePosition` étant asynchrone, la position du
premier rendu après ouverture est encore l'ancienne : trois de mes assertions de placement
lisaient un état intermédiaire, et une quatrième un rectangle en cours d'animation.

**Et un piège qui devient un garde-fou.** En vérifiant la page « Couches et focus » je suis
tombé sur le même défaut que la semaine dernière : sa table de capacités, écrite en markdown,
rendait des tuyaux en texte brut. Deux autres tables de `ui-datepicker` aussi. Quatre
occurrences en une semaine, pour une erreur qu'aucun outil ne signalait : `prose.check.mjs`
refuse désormais un tableau markdown dans un `.mdx`, et laisse tranquilles les `.md`, que
GitHub rend. Éprouvé en le provoquant. La table corrigée porte au passage la mesure du jour :
la restitution du focus s'arrête à `popover="auto"`.

### 2026-09-08 : quatre défauts des panneaux du calque supérieur

Signalés par le user sur `ui-menu`, tous les quatre réels, et trois d'entre eux mesurés avant
d'être corrigés.

**L'ombre rognée.** Le style navigateur d'un `[popover]` pose `overflow: auto`, et l'enveloppe
de positionnement d'un sous-menu fait exactement la taille du panneau qu'elle porte : son
ombre, peinte hors de la boîte, se faisait couper sur les quatre côtés. `ui-tooltip` portait
déjà le correctif, `overflow: visible`, et je ne l'avais pas recopié. La liste des propriétés
du calque à neutraliser consciemment gagne donc une neuvième entrée.

**L'empilement à l'activation.** Le plus instructif. Activer une feuille d'un sous-menu le
refermait bien, puis quelque chose le **rouvrait 7 ms plus tard**. J'ai d'abord accusé le
survol, neutralisé son gestionnaire, vu le défaut persister et conclu que ce n'était pas lui.
C'était faux : le cache de modules servait l'ancienne version du composant. Une trace des
appels a tranché en trois lignes, et le coupable était bien le survol. La cause est que
masquer un panneau change l'élément sous le pointeur, ce dont le navigateur informe la page
par un `mouseenter`, **sans que l'utilisateur ait bougé**. Un survol qui ouvre se garde
désormais d'un `pointermove` préalable, qu'un pointeur immobile ne produit jamais.

**Le clic qui ne faisait rien.** Trouvé par un test qui échouait pour une raison que je
n'avais pas prévue : à la souris, le survol ouvre le sous-menu avant que le clic arrive, et le
clic le BASCULAIT, donc le refermait. Le kit Angular a la même forme de code, donc le même
défaut. Le clic ouvre maintenant, sans basculer.

**La sortie qui glissait par-dessus le parent.** Mesuré : 180 ms pendant lesquels les deux
panneaux restent affichés, le sous-menu glissant de 202 à 195 px, donc sur son parent.
`allow-discrete` garde le nœud affiché le temps de la sortie, et cette fenêtre expose ce que
la fermeture devait cacher. Le kit Angular n'animait que l'insertion : d'où
`utils.overlay-motion-enter`, entrée seule, sortie instantanée.

**Et le quatrième, la position qui se replace.** Pas reproductible sur cette machine, le
microtâche de `computePosition` se résolvant avant la première peinture ; mais le mécanisme
est structurel, donc la correction ne dépend pas de la vitesse de la machine : un panneau
porte `data-unpositioned` tant que sa position n'est pas calculée, et `utils.overlay-motion`
le garde dans son état fermé. Où le défaut ne se manifeste pas, le changement est un
non-événement ; là où il se manifeste, il disparaît.

**Une fausse piste, notée pour ne pas la reprendre.** J'ai cru un moment qu'un panneau dont
l'ancre perd sa géométrie se faisait recadrer en (0, 0), et j'ai écrit un garde-fou pour ça,
commentaire assuré compris. La mesure du `transform` a montré qu'il ne bougeait pas : le
rectangle à zéro venait de ce que l'élément n'a plus de boîte quand un ancêtre est masqué.
Garde-fou retiré. Un sous-menu vit **dans** son ancre, il ne peut pas lui survivre.

Les quatre correctifs sont tenus par des tests éprouvés en les recassant un par un.

### 2026-09-09 : le garde de position sur les huit panneaux

Dette levée le lendemain de son écriture, et elle annonçait **quatre** panneaux restants alors
qu'il y en avait six : le recensement par `useUiPosition` a rattrapé `ui-input-tags` et
`ui-tooltip`, que j'avais oubliés en écrivant la ligne de mémoire. Les huit panneaux flottants
du kit portent maintenant `data-unpositioned`, et tous passaient déjà par `utils.overlay-motion`,
donc il n'y avait que l'attribut à poser.

La forme a été harmonisée au passage : `isPositioned ? undefined : ''`, sans gate sur l'état
d'ouverture. Un panneau fermé est déjà dans l'état que l'attribut impose, donc le gate ne
servait qu'à connaître le nom de la variable d'ouverture de chaque composant, ce qui est
exactement ce qu'on ne veut pas avoir à savoir.

**Le premier jet de test ne prouvait rien d'utile.** Il attendait la levée de l'attribut et
lisait l'opacité : un composant où l'attribut n'aurait jamais été posé l'aurait passé sans
broncher. Il assère maintenant les deux moitiés, la POSE au repos et le RELÂCHEMENT à
l'ouverture, et il est éprouvé en retirant l'attribut d'un composant, ce qui le fait bien
échouer. Les deux moitiés comptent pour des raisons opposées : sans la pose, une image au
mauvais endroit est peinte ; sans le relâchement, le panneau reste invisible pour de bon.

### 2026-09-09 : `ui-paginator`, la famille `table` s'ouvre

Petit composant, et le premier à se **composer** entièrement de pièces du kit : quatre
contrôles, des numéros, et un `ui-select` en densité compacte pour les lignes par page. Rien
de neuf à écrire dans `core/`, ce qui est le signe que la fondation commence à porter.

**La décision d'API qui compte n'est pas de moi**, elle vient d'Angular et méritait d'être
comprise avant d'être recopiée : la position est portée par `first`, l'index de la première
ligne affichée, et non par un numéro de page. C'est ce qui la rend donnable telle quelle à un
`slice` ou à un `OFFSET`, et insensible à un changement de taille de page. Les deux valeurs,
`first` et `rows`, suivent le contrat contrôlé du kit.

**Un endroit où les signaux d'Angular font gratuitement ce que React demande à la main.** En
changeant les lignes par page, Angular émet son événement en relisant `pageCount()`, déjà
recalculé depuis le nouveau `rowsState`. Ici la valeur du rendu courant vaut encore pour
l'ancienne taille de page : le nombre de pages est donc recalculé explicitement dans le
gestionnaire, sinon l'appelant recevrait 12 pages là où il y en a 3. Vérifié en vrai, pas
seulement par le test : 120 lignes par 50 replient bien les numéros sur trois.

**Deux bornes valaient un test chacune**, et elles viennent de vraies situations : le nombre
de pages ne descend jamais sous une, sinon une collection vide n'aurait aucun bouton ; et
`first` est écrêté à la dernière page, les données pouvant rétrécir sous le curseur.

Deux de mes assertions étaient fausses, pas le composant. J'attendais `aria-disabled` sur le
sélecteur désactivé, alors qu'il porte le `disabled` **natif** de son déclencheur. Et j'ai
voulu prouver la même chose par un clic : Playwright a attendu quinze secondes qu'un bouton
désactivé devienne cliquable, ce qui est le piège déjà payé sur `pointer-events: none`. Quand
le garde EST un attribut natif, une lecture le prouve et un clic ne prouve rien.

### 2026-09-09 : `ui-table`, et la famille `table` est complète

Le plus gros composant du kit : 1435 lignes de TS côté Angular, six directives, quatre
sous-composants. Analysé en entier avant d'écrire une ligne, comme `ui-datepicker`, et c'est ce
qui a fait tomber la décision d'architecture au bon moment.

**Ce qui ne se traduit pas mécaniquement.** Angular attache les comportements de colonne et de
ligne par des **directives** posées sur le balisage de l'appelant. React n'a pas de directives,
et le réflexe (« un crochet ») est un piège : une ligne se rend dans une boucle dont la
longueur varie, et un crochet appelé un nombre variable de fois casse l'ordre des crochets. Ce
sont donc des **fabriques de props**, sans état, passées à `renderHeader` et `renderBody` ; les
contrôles, eux, sont des composants et lisent le tableau par contexte, ce qu'ils peuvent faire
puisqu'ils ont leur propre instance.

**Trois simplifications, toutes gagnées sur la plateforme ou sur React.** Les colonnes figées
n'ont plus une directive et un observateur par cellule : le tableau voit la ligne entière et
calcule tous les décalages en une passe. La poignée de redimensionnement n'est plus injectée
dans le DOM mais rendue, React possédant le balisage. Et l'encapsulation n'a rien à désactiver,
là où la version Angular doit sortir de la sienne pour que ses styles atteignent le balisage
projeté : le préfixe `ui-` est déjà le namespace.

**Le tri passe de trois entrées à une.** `sortField`, `sortOrder` et `multiSortMeta` deviennent
une seule valeur contrôlable, `sort`. Le découpage n'était gratuit que grâce aux signaux ; ici
une valeur unique se branche sur `useControllableState` sans adaptateur, et `onSortChange` porte
le mode, ce dont un appelant en mode serveur a besoin.

**Les mesures, sans `setState` dans un effet.** Angular a un `afterRenderEffect` pour lire le
nombre de colonnes, la hauteur d'en-tête et le viewport. Ici tout passe par un seul
`ResizeObserver`, qui tire une première fois dès qu'on observe : la mesure initiale vient de son
rappel comme les suivantes, ce qui satisfait `react-hooks/set-state-in-effect` sans contorsion.
Deux pièges au passage. Le reconnecter à chaque rendu annulait son premier rappel, qui est
asynchrone, et la mesure n'arrivait jamais : il se pose une fois par montage. Et **il ne tire
pas du tout dans le panneau navigateur**, la page y étant cachée : j'ai cru un moment que les
colonnes figées ne se plaçaient pas, alors que le test, lui, le prouvait dans un navigateur qui
peint.

**Deux garde-fous ont attrapé des erreurs réelles.** `docs.config` a refusé
`--ui-table-frozen-top`, un canal privé entre la mesure JS et la CSS : le préfixe `--ui-`
promettait un réglage thémable, c'est devenu `--_frozen-top`. Et `prose.check` a trouvé deux
tirets cadratins dans la SCSS, que j'avais copiée telle quelle du dépôt Angular, antérieur à
la règle.

**Et axe a trouvé le défaut que je n'avais pas vu.** Trois stories échouaient sur
« scrollable-region-focusable » : mon arrêt de tabulation dépendait d'une mesure qui n'a pas
encore eu lieu à la première image. Il est désormais **optimiste** : posé par défaut, retiré
dès que la mesure montre que le contenu est atteignable par lui-même. Un arrêt en trop se
retire, un arrêt manquant est une violation déjà peinte.

`getFieldPath` monte dans `core/utils` au passage : troisième besoin identique du dépôt, donc
partagée, et le résolveur d'options y délègue, ses 35 tests servant de filet.

Les quatre couches mesurées (colspan, colonnes figées, hauteur d'en-tête, arrêt de tabulation)
sont tenues par des tests éprouvés en neutralisant l'observateur, ce qui les fait bien échouer
toutes les quatre.

### 2026-09-09 : le décompte du kit était faux, et rien ne le vérifiait

Signalé par le user : je venais d'écrire qu'il ne restait que deux composants, alors que son
starter Angular en compte une soixantaine. Deux erreurs, une de formulation et une de donnée.

**La formulation.** Mon « deux » portait sur le **noyau du `0.1.0`**, le sous-ensemble d'une
vingtaine de composants que ce fichier propose comme cible du premier jalon, et non sur le kit.
C'est juste pour le noyau, et faux pour tout le reste : il reste **18** composants. La section
« prochaine tâche » cite désormais les deux comptes ensemble, et porte la liste des 18 par
famille.

**La donnée.** Le dénominateur annoncé partout, **61**, est faux : le starter Angular a **60**
points d'entrée `ui-*`, ce que son propre README dit d'ailleurs aussi. Le 61 venait
probablement du décompte de `ui-file-upload-list`, livré dans l'entry point de
`ui-file-upload`. Corrigé dans les deux README et le tableau d'état ; les entrées **datées** de
ce journal et la décision D6 gardent leur « 61 », parce qu'on ne réécrit pas une mesure
d'époque.

**Et la vraie leçon est ailleurs.** Ce chiffre avait déjà été trouvé périmé une fois, et il
l'a été de nouveau : `components.check.mjs` validait les listes de composants mais pas le
nombre qui les résume. Il le fait maintenant, numérateur et dénominateur, dans les deux README
et dans le tableau d'état, et il a été éprouvé en cassant les deux moitiés séparément. Le total
du Design System est écrit une seule fois, dans le script, avec la commande qui le produit.

Détail de méthode : la commande de dérivation que j'avais d'abord écrite ici ne marchait pas,
son `sed` laissant `ng-package.json` au lieu du nom du composant. Les deux commandes de ce
fichier ont été exécutées avant d'y être écrites, ce qui aurait dû aller de soi.

### 2026-09-10 : `ui-alert` et `ui-tabs`, le noyau du `0.1.0` est bouclé

Les deux derniers composants du noyau. `ui-alert` est sans surprise : SCSS reprise telle
quelle, seule la logique change de langage. Sa seule décision d'API est l'affichage, qui passe
au contrat contrôlé du kit (`open` / `defaultOpen` / `onOpenChange`) au lieu de l'auto-masquage
inconditionnel d'Angular. Non contrôlée, l'alerte se retire quand même elle-même : le cas
autonome reste identique, et une pile de messages devient possible.

`ui-tabs` est le premier composant du kit en **API de composition**, et c'est là qu'il a fallu
trancher. Angular interroge son contenu projeté (`contentChildren`) ; React n'a pas
d'équivalent, et le remplacer par un registre poussé depuis les enfants imposerait un
`setState` dans un effet, que le lint refuse à juste titre. Trois besoins en dépendaient,
résolus séparément : le clavier lit le DOM au moment de l'événement, l'indicateur le lit dans
un effet de mise en page, et l'arrêt de tabulation unique est normalisé par la bande sur les
boutons eux-mêmes. Ce qui reste vrai dans tous les cas, puisque l'ordre des onglets EST une
propriété du DOM.

Trois choses trouvées en regardant le rendu, dans cet ordre :

- **L'axe vertical était cassé**, et il l'est aussi côté Angular : la bande, sœur d'un
  paragraphe dans un conteneur en ligne, se faisait écraser à la largeur de ses icônes
  (50 px pour 131 de contenu), libellés rognés à zéro. `flex: 0 0 auto` sur l'axe vertical.
  Aucune story Angular ne rend cet axe, ce qui explique que personne ne l'ait vu.
- **Le premier test de non-régression ne prouvait rien.** Il guettait un débordement, or un
  contenu écrasé par un flex ne déborde pas : il disparaît. C'est `clientWidth` contre
  `scrollWidth` sur le libellé qui distingue les deux états, et le test échoue bien sans le
  correctif, vérifié en le retirant.
- **Et le premier « il échoue bien » était faux**, servi par le cache de modules de Vitest.
  Le piège est écrit dans ce fichier depuis une session précédente, et je l'ai repayé quand
  même : un résultat négatif obtenu juste après une édition se revérifie après
  `rm -rf node_modules/.vite`.

Trois écarts d'API déclarés dans `docs/DUAL-ENGINE.md`, plus deux de structure : la classe
`.ui-tab-button` disparaît (React n'a pas d'élément hôte, donc `.ui-tab` EST le bouton), et un
panneau n'est focalisable que s'il ne contient rien qui le soit, ce que dit le motif Tabs de
l'APG et que le kit applique déjà à `ui-table`.

Un défaut d'instabilité repéré au passage, sans rapport avec ces deux composants : un test de
`ui-tooltip` échoue une fois sur deux quand la suite complète démarre à froid. Ajouté à la
dette plutôt que corrigé au vol.
