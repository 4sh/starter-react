# Index des composants

> Story, page de doc et test **co-localisés** dans le dossier du composant :
> `packages/ui-kit-react/src/<famille>/ui-<nom>/`. La famille est la section de cette
> page, et elle ne figure PAS dans le chemin d'import (décision D4).
>
> ✅ = implémenté · ⬜ = à construire (recopier le patron `ui-icon`)
>
> L'ordre des familles est aligné sur celui du starter Angular : c'est un invariant du
> Dual-Engine (`docs/DUAL-ENGINE.md`).

## base

- ✅ `ui-icon` : Icône par son nom (`sm`→`xl`, solid/outline), décorative par défaut,
  famille de police configurable par provider. **Patron de référence du kit.**
- ⬜ `ui-image` : Image responsive multi-format, clair/sombre par marque

## actions

- ✅ `ui-button` : Bouton d'action (`level` × `variant` × `onColor`, deux tailles, icône sur
  les quatre côtés, mode icône seule déduit ou forcé, chargement, `expanded`, `rounded`,
  mode lien par `href` ou par `render` pour un routeur)
  - ⚠️ **Écart connu avec Angular** : pas de prop `ripple`. Le moteur d'onde de pression est
    un point d'entrée à part côté Angular (338 lignes) et n'est pas encore porté. Son arrivée
    ajoutera la prop, ce qui sera une évolution MINEURE, pas une rupture.
- ✅ `ui-button-split` : Bouton d'action accolé à un déclencheur déroulant. Les options
  sont le `UiMenuItem[]` de `ui-menu`, et les deux moitiés se désactivent séparément
- ✅ `ui-link` : Lien textuel en ligne, `render` pour brancher un routeur
- ⬜ `ui-speed-dial` : Bouton flottant déployant ses actions

## forms

- ✅ `ui-field` : Coquille présentationnelle partagée des champs en boîte (libellé + boîte +
  message, contrôle projeté, préfixe/suffixe/pied, libellé flottant `over`/`in`/`on`)
- ✅ `ui-label` : Libellé de champ (marqueur requis, tailles, hook `--ui-label-color`)
- ✅ `ui-input` : Champ texte (contrôlé ou non contrôlé, icônes nom ou nœud, zone d'action à
  droite, unité, libellé flottant, validation ; interop react-hook-form documentée)
- ✅ `ui-textarea` : Champ multiligne (coquille en mode multiligne, `autoResize` ou poignée
  native, compteur de caractères chaîné à `aria-describedby`)
- ✅ `ui-input-date` : champ date/heure **natif** (`mode` `date`/`time`/`datetime`, bornes
  `min`/`max`/`step`, `valueType` identique à celui d'`ui-datepicker`). Le sélecteur est celui
  du système : émission sur le `change` natif et non sur `input`, libellé toujours levé,
  indicateur du navigateur remplacé par la zone d'action du kit
- ✅ `ui-input-mask` : champ masqué (jetons `9`/`a`/`*`, littéraux insérés à la frappe,
  bornes par segment numérique, valeur masquée ou brute, curseur replacé après le Nième
  caractère saisi). Moteur de masque porté tel quel du kit Angular, avec ses 29 tests
- ✅ `ui-input-number` : champ numérique (saisie permissive sans reformatage à la frappe,
  formatage riche `Intl` à la sortie, écrêtage `min`/`max`, `step` au pavé et aux flèches,
  `role="spinbutton"`, `formatValue` en remplacement de la méthode protégée d'Angular)
- ✅ `ui-input-group` : Colle un contrôle et ses cellules en un seul champ visuel. Le
  reformage des coins et le recouvrement des bordures sont en CSS pur, par les crochets
  `--ui-field-radius` / `--ui-button-radius` que les composants exposent déjà
- ✅ `ui-input-otp` : Code à usage unique, une case `<input maxlength="1">` par caractère.
  Arrêt de tabulation unique et flèches entre les cases, avance automatique à la frappe,
  collage réparti, `renderCell` pour remplacer le contrôle
- ✅ `ui-checkbox` : Case à cocher sur `<input>` natif (modèle non booléen par
  `trueValue`/`falseValue`, indéterminé purement visuel, lecture seule annoncée par
  `aria-readonly`)
- ✅ `ui-radio`, Bouton radio sur `<input>` natif. Le **groupe** porte la valeur : contrôlé
  par `groupValue`, ou non contrôlé en laissant le `name` au navigateur (exclusivité et
  navigation aux flèches gratuites). Pas de `defaultValue` : il ne pourrait pas coordonner
  ses voisins
- ✅ `ui-toggle` : Interrupteur (`role="switch"`, annoncé activé/désactivé), pastille
  personnalisable par `renderHandle`, modèle non booléen, lecture seule annoncée
- ✅ `ui-toggle-block` : Bloc sélectionnable, label étiré et indicateur instancié (case, radio
  ou interrupteur), carte de sélection par `hideIndicator`
- ✅ `ui-toggle-button` : Bouton à état pressé, en simple ou en groupe multi-sélection,
  `level` pour l'état pressé et `variant` pour le relâché
- ✅ `ui-select` : Liste déroulante (motif combobox, groupes, multiple, filtre, virtuel)
- ✅ `ui-autocomplete` : Saisie assistée, suggestions fournies par l'appelant
- ✅ `ui-input-tags` : Saisie multi-valeurs en tags, listbox horizontale à focus glissant,
  panneau de suggestions optionnel
- ✅ `ui-datepicker` : Sélecteur de date, mois ou année (+ heure), tout sur `Intl` ; saisie
  manuelle à masque, `single`/`multiple`/`range`, forage jour → mois → année, multi-mois
- ✅ `ui-segment-control` : Contrôle segmenté, radiogroup en simple et group en multiple,
  indicateur glissant mesuré
- ✅ `ui-nudger` : Compteur numérique, bornes dérivées de la valeur, deux `ui-button` composés
- ✅ `ui-rating` : Note en étoiles sur un `<input type="range">` natif, demi-notes découpées
- ✅ `ui-slider` : Curseur simple ou de plage, motif slider WAI-ARIA, repères de pas
- ✅ `ui-knob` : Cadran circulaire, arc SVG de 300° en viewBox, motif curseur de l'APG.
  Pointeur et clavier par le même chemin, épaisseur de trait à l'échelle du diamètre
- ⬜ `ui-swatch-picker`
- ⬜ `ui-file-upload` · `ui-editor`

## informative

- ✅ `ui-helper` : Texte d'aide ou retour contextuel (icône déduite du niveau, `ariaLive`)
- ✅ `ui-badge` : Compte ou statut (texte, glyphe unique carré, ou point de notification)
- ✅ `ui-tag` : Étiquette informative, `level` × `subLevel`, pilule ou rectangle
- ✅ `ui-separator` : Filet `role="separator"`, titrable, horizontal ou vertical
- ✅ `ui-spinner` : Chargement indéterminé, marqueur remplaçable, délai de grâce
- ✅ `ui-skeleton` : Bloc de remplacement pendant le chargement (3 formes, 3 animations)
- ✅ `ui-progress-bar` : Avancement déterminé, indéterminé ou en étapes
- ✅ `ui-avatar` : Image, initiales ou icône, avec badge de statut
- ✅ `ui-read-only` : Valeur étiquetée en lecture seule (`dl`/`dt`/`dd` dès qu'il y a un libellé)
- ✅ `ui-chip` : Entité manipulable (retirable ou sélectionnable, jamais les deux)
- ✅ `ui-alert` : Message en ligne (`level` × `subLevel`, deux tailles, icône déduite du
  niveau, fermeture, disparition automatique par `life`). Non contrôlée elle se retire
  seule ; `open` renseignée, l'état revient au parent
- ✅ `ui-tooltip` : Bulle d'aide dans le calque supérieur, conforme WCAG 1.4.13
- ✅ `ui-avatar-group` : Pile d'avatars qui se chevauchent. Aide de mise en page sans
  props : le débordement « +N » est un avatar de plus, en mode libellé
- ✅ `ui-toast` : Notification flottante et empilée. Magasin de module `uiToast` (pas de
  fournisseur à poser), pile `UiToastContainer` dans le **calque supérieur** pour passer
  devant un `<dialog>` natif, et carte `UiToast` qui se pose aussi seule
- ✅ `ui-empty-state` : Absence de contenu, avec visuel, texte et actions
- ✅ `ui-accordion` : Sections repliables, API de composition (`UiAccordion` /
  `UiAccordionPanel`) appariées par `value`. En-tête bouton natif, mode simple ou
  `multiple`, corps replié `inert` mais toujours monté

## layout

- ✅ `ui-card` : Conteneur à cinq zones (visuel, titre, sous-titre, corps, pied)
- ✅ `ui-modal` : Dialogue bâti sur le `<dialog>` natif (piège de focus et empilement natifs)
- ✅ `ui-popover` : Panneau ancré, contrôlé, calque supérieur (`popover` ou `<dialog>`)
- ✅ `ui-drawer` : Panneau glissant ancré à un bord, même `<dialog>` que `ui-modal`

## navigation

- ✅ `ui-menu` : Menu de navigation et de commandes, statique ou en popup (calque supérieur).
  Modèle déclaratif `UiMenuItem` : sections titrées, séparateurs, groupes repliables pilotables
  par `expandedKeys`, sous-menus en cascade, commandes, `url` et `render` pour brancher un
  routeur. Motif menu de l'APG, un seul arrêt de tabulation
- ✅ `ui-context-menu` : Menu au clic droit, ancré sur le **point** cliqué et non sur un
  élément (ancre virtuelle du positionneur). Panneau `ui-menu` embarqué, compact et en cascade
  par défaut ; `global` l'attache au document entier
- ✅ `ui-tabs` : Onglets **headless**, API de composition (`UiTabs` / `UiTabList` / `UiTab` /
  `UiTabPanels` / `UiTabPanel`), appariés par `value`. Focus glissant sur les entrées,
  indicateur mesuré, bande défilante à navigateurs, panneaux paresseux, axe vertical.
  Sans `UiTabPanels`, les onglets deviennent un menu de navigation et n'annoncent plus
  d'`aria-controls`
- ⬜ `ui-breadcrumb` · `ui-stepper`
- ⬜ `ui-sidebar` · `ui-bottom-tab-bar`

## table

- ✅ `ui-paginator` : Barre de pagination autonome. Position portée par `first`, l'index de la
  première ligne, plutôt que par un numéro de page ; numéros fenêtrés ou repliés sur les bords
  (`ellipsis`), compte rendu à motif, sélecteur de lignes par page composé sur `ui-select`
- ✅ `ui-table` : Tableau **headless**. L'appelant possède le balisage des lignes
  (`renderHeader` / `renderBody` / `renderFooter` rendent de vrais `<tr>`), le composant
  possède le pipeline (tri puis pagination, sauf en `lazy`), la sélection, le dépliage, la
  coquille défilante et la barre de pagination. Les comportements de colonne et de ligne
  s'attachent par des **fabriques de props** (`table.sortableColumn`, `table.selectableRow`…),
  les directives d'Angular n'ayant pas d'équivalent. Colonnes et lignes figées,
  redimensionnement, réordonnancement, défilement virtuel

---

## À brancher avant d'aller loin

- **`core/ripple`.** 338 lignes à porter, et la prop `ripple` de `ui-button` avec.
- **Bascule clair / sombre pilotée par l'addon dark-mode**, qui vit dans le manager. Un
  lanceur de tests n'a pas de manager, donc le projet `storybook` ne teste **que le mode
  clair**. Faire du thème un global de barre d'outils (comme `brand`) permettrait de
  déclarer un projet Vitest par thème via `initialGlobals`, et donc de passer axe sur le
  mode sombre aussi. Le gain est réel : la moitié des jetons n'est jamais contrôlée.

---

## Noyau du `0.1.0`

Le kit est utilisable bien avant la parité complète. La cible du premier `0.1.0` est le
sous-ensemble qui couvre la majorité des écrans d'un projet réel, **à arbitrer avec
l'équipe**, la liste ci-dessous est une proposition, pas une décision :

`ui-icon`, `ui-button`, `ui-link`, `ui-field`, `ui-label`, `ui-input`, `ui-textarea`,
`ui-select`, `ui-checkbox`, `ui-radio`, `ui-toggle`, `ui-card`, `ui-modal`, `ui-alert`,
`ui-tag`, `ui-helper`, `ui-tooltip`, `ui-tabs`, `ui-table`, `ui-paginator`.
