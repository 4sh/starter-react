# Changelog

Toutes les évolutions notables de `@4sh/ui-kit-react` sont consignées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et le projet
[Semantic Versioning](https://semver.org/lang/fr/) adapté à un Design System (voir
`docs/VERSIONING.md`).

## [Unreleased]

### Added

- `core/motion` : `useUiMotion`, l'entrée et la sortie d'un élément **hors calque supérieur**
  (liste, section dépliable, toast). Un panneau du calque supérieur n'en a pas besoin, `display`
  et `overlay` y étant animables en CSS pur ; un élément ordinaire, lui, quitte le DOM à
  l'instant où l'appelant cesse de le rendre, et il n'y a plus rien à animer. Là où Angular a
  `animate.leave`, qui retient le nœud sortant, c'est ici `present` qui le retient, et il ne
  retombe qu'une fois les objets `Animation` du système terminés : jamais un `setTimeout` calé
  sur une durée devinée, qui se désaccorderait du mouvement réduit, d'un thème, ou d'une classe
  qui ne s'applique pas. Les sept préréglages, leurs classes et leurs keyframes étaient déjà
  livrés : c'était la moitié JavaScript qui manquait. Débloque `ui-accordion` et `ui-toast`.
- Storybook : page `Foundations / Motion`, avec un banc d'essai des sept préréglages et le
  tableau qui dit laquelle des **trois** primitives choisir. Le choix ne dépend pas de l'effet
  voulu mais de ce que devient l'élément : `utils.motion-transition` s'il reste monté,
  `utils.overlay-motion` s'il vit dans le calque supérieur, `useUiMotion` s'il quitte le DOM.
  C'est la question qu'on se pose en vrai, et elle n'était écrite nulle part.

- `ui-bottom-sheet` : panneau qui glisse depuis le bord bas de l'écran, sur le même socle que
  `ui-modal` et `ui-drawer`, le `<dialog>` natif : le voile et le positionneur du kit Angular
  disparaissent, `::backdrop` fait le premier et les insets du dialogue font le second. Ce qui
  reste écrit à la main lui appartient vraiment : trois paliers de hauteur plus n'importe quelle
  longueur CSS, la fermeture en tirant vers le bas, et le passage de `half` à `full` en tirant
  vers le haut, que les flèches font aussi au clavier. Le geste et l'animation touchent la même
  propriété, `translate`, donc le glissement **coule** dans la fermeture au lieu de s'y ajouter.

- `ui-stepper` : progression numérotée, en assistant à plusieurs étapes ou en simple
  indicateur d'avancement. L'avancement d'une étape se **déduit** de sa place dans la séquence,
  que React lit dans les `children` : une fonction pure, sans état ni effet, juste dès le
  premier rendu. La sémantique ARIA suit la disposition, onglets à plat et accordéon en
  colonne, un onglet qui contiendrait son propre panneau étant invalide. Un panneau quitté
  reste monté mais devient `inert`, donc l'état d'un formulaire survit au passage d'une étape à
  l'autre. `useUiStepper()` pilote la progression depuis un panneau, là où le kit Angular
  appelle des méthodes sur une référence de gabarit.

- `ui-speed-dial` : bouton flottant qui déploie ses actions autour de lui, empilées le long
  d'une direction ou posées sur un anneau, une moitié ou un quart d'arc. Les entrées sont le
  même sous-ensemble feuille que `ui-menu`, donc le modèle d'un menu alimente un bouton sans
  être remodelé. **Fermé, aucune action n'est rendue** : ni lue par un lecteur d'écran, ni
  atteignable au clavier, donc rien à masquer. Les actions forment un seul arrêt de tabulation,
  entrent une par une et **sortent ensemble**, ce que la disparition de la liste entière donne
  gratuitement là où le kit Angular doit annuler le décalage de sortie pour éviter un
  clignotement.

- `ui-bottom-tab-bar` : la barre de navigation basse des appareils tactiles, avec ses
  destinations et son bouton d'action surélevé. Bâtie pour l'écran sur lequel elle vit : elle
  réserve l'incrustation du système, iOS comme Android, tient la cible tactile de 44 px, coupe
  le délai de double frappe et disparaît à l'impression. La destination courante s'annonce par
  `aria-current="page"` et non par `role="tab"`, qui exigerait un panneau associé, et les
  flèches parcourent la barre **sans** retirer aucun contrôle de l'ordre de tabulation.

- `ui-breadcrumb` : le fil d'Ariane. Chaque maillon rend **l'élément natif qui correspond à sa
  sémantique**, jamais une enveloppe : une ancre s'il mène quelque part, un `<button>` s'il
  n'agit que, un simple texte sinon, ce qui évite de fabriquer un faux lien pour un maillon qui
  n'en est pas un. Un maillon désactivé porte `role="link"` et `aria-disabled`, là où seule une
  classe le disait. Au-delà de `maxItems`, le milieu se replie derrière un bouton qui, en
  dépliant, amène le focus sur le premier maillon révélé. `render` branche le lien d'un routeur,
  le kit n'en imposant aucun.

- `ui-swatch-picker` : grille de couleurs, posée dans la page ou ouverte en popup. Aucune
  valeur n'est écrite en dur : chaque pastille **pointe une variable** `--primitives-*`, donc
  changer de marque change la grille. Motif listbox, clavier de **grille** à deux axes et un
  seul arrêt de tabulation. Comme `ui-menu`, le composant ne rend pas son déclencheur : `trigger`
  reçoit les props à reverser, et le panneau vit dans le calque supérieur, donc aucun ancêtre en
  `overflow: hidden` ne le rogne.

- `ui-input-otp` : saisie d'un code à usage unique, une case `<input maxlength="1">` par
  caractère. Le groupe compte pour **un seul** arrêt de tabulation : `Tab` le traverse, les
  flèches circulent dedans, `Début` et `Fin` vont aux extrémités. La frappe avance seule,
  `Retour arrière` efface et recule, et un code collé se répartit sur les cases, comme le
  remplissage automatique du navigateur (`autocomplete="one-time-code"`). `renderCell`
  remplace le contrôle sans rien perdre du comportement. Les cases, et non la valeur jointe,
  sont la source du rendu : une case remplie alors que les précédentes sont vides garde son
  trou, que `'9'` ne saurait pas porter.

- `ui-knob` : cadran circulaire pour une valeur numérique, arc SVG de 300° dessiné dans un
  viewBox de 100 sur 100, donc à l'échelle du diamètre rendu. Motif curseur de l'APG, un seul
  arrêt `role="slider"` piloté au clavier et au pointeur par le même chemin de code, capture
  de pointeur comprise. L'épaisseur du trait rétracte le rayon de l'arc de sa moitié, ce qui
  garantit qu'un trait épais ne déborde jamais sur l'anneau de focus.

- `ui-accordion` : sections repliables, API de composition (`UiAccordion` / `UiAccordionPanel`)
  appariées par `value`, en mode simple ou `multiple`. L'en-tête entier est un `<button>` natif,
  motif accordéon de l'APG : la cible de clic est large et le chevron n'est qu'une affordance.
  Le corps replié reste **monté** mais devient `inert` et de hauteur nulle, donc l'état d'un
  formulaire survit au pliage sans rester atteignable. Une seule prop `header` de type
  `ReactNode` remplace le couple slot plus entrée texte du kit Angular. Le pliage passe par
  `utils.motion-transition` sur `grid-template-rows`, l'élément restant monté.

- `ui-toast` : notification flottante et empilée, en trois pièces. Le magasin `uiToast` est un
  **module** et non un contexte, parce qu'une notification se déclenche aussi depuis un
  intercepteur HTTP ou un gestionnaire d'erreurs, donc hors de tout composant : rien à poser à
  la racine. La pile `UiToastContainer` vit dans le **calque supérieur** (`popover="manual"`)
  et non à un z-index, `ui-modal` étant ici un `<dialog>` natif que rien d'autre ne dépasse ;
  elle s'y remontre à chaque nouveau message, le calque empilant dans l'ordre d'affichage. La
  carte `UiToast` s'annonce seule et se pose aussi hors de toute pile. Premier consommateur de
  `useUiMotion`, qui retient la carte le temps de sa sortie une fois le message déjà retiré du
  magasin. Deux écarts volontaires avec le kit Angular, tous deux mesurés : seule la **carte**
  reçoit le pointeur, la bande qui la porte faisant toute la largeur de la pile et avalant
  donc les clics de la page à côté d'elle ; et le compte à rebours d'un message en file
  d'attente ne démarre **qu'en paraissant**, sans quoi il expirerait sans avoir été lu.

- `ui-button-split` : bouton d'action accolé à un déclencheur déroulant, qui ferme la famille
  `actions` avec `ui-speed-dial`. Les options sont le `UiMenuItem[]` de `ui-menu`, donc un
  modèle écrit pour un menu se réutilise tel quel ; les deux moitiés se désactivent séparément.
  Le collage ne redéfinit aucun style de bouton : il pose `--ui-button-radius`, le crochet que
  `ui-button` expose déjà, et remonte le déclencheur d'une largeur de bordure.

- `ui-input-group` : colle un contrôle et ses cellules en un seul champ visuel, avec
  `UiInputGroupAddon` pour les cellules non interactives. Le reformage des coins, le
  recouvrement des bordures voisines et le relèvement de l'item focalisé se font en **CSS
  pur** : la version Angular doit les écrire en style en ligne depuis un `MutationObserver`,
  un sélecteur scopé ne pouvant pas atteindre du contenu projeté, là où l'absence
  d'encapsulation rend ici un sélecteur d'enfant suffisant. Le groupe ne reconnaît aucun
  enfant : il pose `--ui-field-radius` et `--ui-button-radius`, que les composants exposent
  déjà, donc un composant maison entre dans le rang en exposant le même crochet.

- `ui-avatar-group` : pile d'avatars qui se chevauchent. Aide de mise en page sans props : le
  débordement « +N » s'écrit comme un avatar de plus, en mode libellé, donc le groupe ne sait
  rien du nombre de membres et l'appelant garde sa règle de troncature. Le chevauchement suit
  la constante partagée `--ui-avatar-group-overlap`, réglable par groupe.
- Amorçage du starter React Web : monorepo pnpm (`packages/` + `apps/`), chaîne de jetons
  Style Dictionary, fondation SCSS, Storybook 10 (react-vite) avec les trois addons locaux
  repris du starter Angular, build de librairie multi-entrées à table `exports` générée,
  tests de composants Vitest en navigateur réel.
- `core/types` : `UiLevel`, `UiSubLevel`, `UiFeedbackLevel`.
- `core/theming` : `UiThemeProvider`, `useUiTheme`, `useUiBrand`,
  `uiThemeBootstrapScript`. Pendant React de `ThemeService` et `BrandService`, avec un
  mode contrôlé et une lecture de la préférence via `useSyncExternalStore` (sans
  clignotement au rendu serveur).
- `ui-icon` : premier composant, patron de référence du kit.
- `ui-button` : bouton d'action. `level` × `variant` × `onColor` composés (45 jeux de jetons),
  deux tailles, icône sur les quatre côtés, mode icône seule déduit ou forcé, chargement,
  `expanded`, `rounded`, mode lien par `href`, et `render` pour brancher le lien d'un routeur
  sans que le kit en impose aucun. La SCSS est reprise presque à l'identique du kit Angular.
  Écart connu : pas de prop `ripple` (moteur non porté).
- `core/utils` : `cx`, concaténation de classes conditionnelles. Remplace `clsx`, de sorte
  que le kit n'a **aucune dépendance runtime** et qu'un composant simple recopié dans un
  projet s'installe sans un seul `pnpm add`.
- `core/forms` : `useControllableState` (le contrat contrôlé / non contrôlé, partagé par tous
  les champs), `useUiField` (identifiants stables au rendu serveur, niveau effectif, message,
  chaînage `aria-describedby`) et les types partagés.
- `ui-label`, `ui-helper`, `ui-field`, `ui-input` : la première tranche verticale de
  formulaire. `ui-field` est la coquille présentationnelle que réutiliseront tous les champs
  en boîte ; `ui-input` est le premier à s'y poser, avec l'interop react-hook-form documentée.
- `ui-input-mask` : champ masqué (jetons `9`/`a`/`*`, littéraux insérés à la frappe, bornes
  par segment numérique, valeur masquée ou brute, curseur replacé après le Nième caractère
  saisi).
- `core/forms` : moteur de masque porté tel quel du kit Angular avec ses tests. Fonctions
  pures, exportées, réutilisables hors du champ.
- `ui-input-number` : champ numérique. Saisie permissive (le texte n'est pas reformaté
  pendant la frappe, donc le curseur ne saute jamais), forme éditable au focus, formatage
  `Intl` riche et écrêtage sur `min`/`max` à la sortie du champ. Pavé d'incrément hors du
  parcours clavier, flèches haut/bas, `role="spinbutton"`. La prop `formatValue` remplace la
  méthode protégée que la version Angular faisait redéfinir par héritage.
- `ui-radio` : bouton radio sur `<input>` natif. Le **groupe** porte la valeur, `groupValue`
  en contrôlé, le `name` natif en non contrôlé (exclusivité et navigation aux flèches
  gratuites). Pas de `defaultValue` : il ne pourrait pas coordonner ses voisins.
- `ui-toggle` : interrupteur `role="switch"`, annoncé activé/désactivé. Pastille
  personnalisable par `renderHandle`, modèle non forcément booléen, lecture seule annoncée.
- `ui-textarea` : champ multiligne posé sur la coquille en mode `multiline`. `autoResize` ou
  poignée native (jamais les deux), compteur de caractères chaîné à `aria-describedby`.
- `ui-checkbox` : case à cocher sur `<input>` natif recouvert. Modèle non forcément booléen
  (`trueValue` / `falseValue`), état indéterminé purement visuel, lecture seule annoncée par
  `aria-readonly` : les deux étant des états que le DOM n'expose pas en attribut.
- `core/forms` : `joinIds`, pour chaîner plusieurs identifiants dans `aria-describedby` sans
  jamais produire d'attribut vide.
- `ui-separator` : séparation `role="separator"` entre deux contenus, horizontale ou
  verticale, trait plein ou tireté. Un `label` la transforme en séparateur titré, placé au
  début, au milieu ou à la fin de la ligne.
- `ui-badge` : indicateur de compte ou de statut, coloré par `level` × `subLevel`. Trois
  formes selon le contenu : capsule, pastille carrée pour un glyphe unique, ou point de
  notification quand il n'y a ni texte ni icône.
- `ui-tag` : étiquette informative, pilule ou rectangle arrondi, icône de chaque côté.
- `ui-spinner` : chargement indéterminé. Marqueur remplaçable (`renderMark`, `image`,
  `icon`, ou le cercle intégré) et délai de grâce contre le clignotement du loader pour une
  attente trop courte pour être remarquée.
- `ui-skeleton` : bloc affiché à la place d'un contenu en cours de chargement. Trois formes
  avec leurs dimensions par défaut, remplaçables par une valeur CSS brute ; reflet glissant,
  clignotement, ou rien.
- `ui-progress-bar` : avancement d'un traitement, en valeur suivie, en boucle indéterminée
  ou en étapes discrètes. Libellé à droite, dessous, ou dans le remplissage, remplaçable par
  `renderValue`.
- `ui-avatar` : personne ou entité en image, initiales ou icône. Le mode se déduit des props,
  et une image qui échoue à charger fait retomber sur le mode suivant. Badge de statut posé
  par la prop `badge`.
- `ui-link` : lien textuel en ligne, qui rend une vraie ancre. Icône de chaque côté,
  raccourci `external` (cible et `rel` sûr), et `render` pour brancher le lien d'un routeur
  sans que le kit en connaisse aucun. Désactivé, le lien perd son `href`.
- `ui-card` : conteneur à cinq zones optionnelles, visuel, titre, sous-titre, corps et pied.
  Là où la version Angular déclarait des directives marqueurs et inspectait le DOM après
  rendu, les zones sont ici des props et le corps est `children`.
- `ui-empty-state` : absence de contenu, avec visuel (icône ou illustration), titre,
  description, contenu libre et actions. Chaque zone n'est rendue que si elle a du contenu.
- `ui-read-only` : valeur étiquetée en lecture seule. Rend une vraie liste de définition
  (`dl`/`dt`/`dd`) dès qu'un libellé est donné, de simples `div` sinon. Le symbole de repli
  reste visuel, `emptyLabel` porte le texte annoncé.
- `ui-chip` : entité manipulable, retirable par un vrai bouton ou sélectionnable en devenant
  elle-même un `<button aria-pressed>`. Les deux modes s'excluent, un élément interactif ne
  pouvant pas en contenir un autre. Sélection contrôlée par
  `selected` / `defaultSelected` / `onSelectedChange`.
- `core/overlay` : `useUiPosition` (positionnement ancré, collision, retournement, suivi du
  défilement), `useUiDismiss` (clic extérieur sur `pointerdown`, Échap consommée seulement si
  elle ferme), `useUiScrollLock` (verrous comptés, barre de défilement compensée) et
  `useCloseOnNavigation` (API History, aucun routeur imposé).
- `core/focus` : `focusableWithin` et `focusFirstWithin` (sélecteur documenté, repli sur le
  conteneur), `useFocusRestore` (sans vol de focus si l'utilisateur est déjà reparti) et
  `useRovingTabIndex` (un seul arrêt de tabulation par groupe, flèches hors axe non
  consommées).
- Page de doc « Spécifications / Couches et focus » : ce que la plateforme couvre nativement,
  les deux règles qui en découlent (un panneau modal est un `<dialog>`, un panneau non modal
  porte `popover`) et le mode d'emploi des briques.
- `ui-modal` : dialogue bâti sur le `<dialog>` **natif**. Le piège de focus, la restitution
  du focus, l'inertie et l'assombrissement de l'arrière-plan, l'empilement de plusieurs
  dialogues et la touche Échap sont pris en charge par le navigateur. Le composant ajoute le
  blocage du défilement, la fermeture au clic sur l'arrière-plan, neuf positions, le
  glissement par l'en-tête, le redimensionnement par le coin, l'agrandissement, les largeurs
  par point de rupture, et un corps défilant qui ne devient atteignable au clavier que
  lorsqu'il déborde sans rien contenir de focalisable.
- `ui-popover` : panneau flottant ancré, **contrôlé** (`open` / `defaultOpen` /
  `onOpenChange`) et rendu par une prop `trigger` qui reçoit la `ref`, l'état ARIA et le
  basculement. Le panneau vit dans le calque supérieur (`popover`, ou `<dialog>` avec
  `modal`) : aucun z-index, et aucun rognage par un ancêtre en `overflow: hidden`.
  `dismissable` choisit entre `popover="auto"`, qui ferme au clic extérieur et sur Échap
  sans JavaScript, et `popover="manual"`.
- `ui-tooltip` : bulle d'aide au survol et au focus, dans le calque supérieur
  (`popover="manual"`). Conforme WCAG 1.4.13 : rejetable par Échap, survolable avec
  `autoHide={false}`, persistante tant que le déclencheur reste actif. Délais d'apparition et
  de disparition, `life`, et `showOnEllipsis` qui ne parle que si le texte est tronqué.
  L'apparition en fondu est jouée par le navigateur (`@starting-style`).
- `ui-drawer` : panneau glissant ancré à un bord (gauche, droite, haut, bas) ou en plein
  écran, bâti sur le même `<dialog>` natif que `ui-modal`. En-tête, corps défilant et pied,
  fermeture par bouton, par Échap ou au clic sur l'arrière-plan, mode non modal et mode
  cantonné.
- **Entrée et sortie animées des panneaux**, par le mixin partagé `utils.overlay-motion` :
  `ui-modal`, `ui-drawer`, `ui-popover` et `ui-tooltip`. Tout est en CSS
  (`transition-behavior: allow-discrete` et `@starting-style`), là où la version Angular a
  besoin d'une directive et de `animate.enter` / `animate.leave`. `ui-modal` reçoit une prop
  `motion` (six préréglages, `zoom` par défaut) et `ui-modal` comme `ui-drawer` une prop
  `motionDisabled`. La durée, la courbe, la distance et l'échelle viennent du système de
  motion, et `data-motion="off"` comme la préférence système de mouvement réduit coupent tout.
- `core/virtual` : `useUiVirtualList`, seul fichier du kit à connaître
  `@tanstack/react-virtual`. Fenêtre de rendu, hauteur totale, placement absolu des entrées
  et `scrollToIndex`.
- `core/forms` : résolveur d'options (`createOptionResolver`, chemins pointés, `dataKey`,
  égalité), `normalizeText` (casse et diacritiques) et `formatLabel`. Portés tels quels du kit
  Angular, donc les deux stacks résolvent les options à l'identique.
- `ui-select` : liste déroulante posée sur `ui-field`, suivant le motif combobox de WAI-ARIA
  (le focus reste sur le déclencheur, l'option courante est désignée par
  `aria-activedescendant`). Options primitives ou objets, groupes, sélection multiple avec
  cases et repli du surplus, filtre insensible à la casse et aux accents, effacement, saisie
  libre, chargement, frappe rapide, défilement virtuel. Le panneau vit dans le calque
  supérieur, donc aucun ancêtre en `overflow: hidden` ne le rogne.
- `ui-field` : prop `onBoxRef`, qui donne accès à la boîte du champ pour qu'un panneau
  flottant s'y ancre et prenne sa largeur.
- `ui-autocomplete` : champ de saisie assistée, posé sur `ui-field`. Le composant **ne filtre
  rien** : il émet une requête par `onComplete` et l'appelant fournit `suggestions`, ce qui
  permet d'interroger un serveur. `minLength` et `delay` amortissent la frappe, `dropdown`
  ajoute un bouton qui affiche tout, `forceSelection` refuse le texte libre, et le mode
  multiple rend des puces retirables à focus glissant, dont le libellé est retenu au moment du
  choix.
- `ui-datepicker` : sélecteur de date, de mois ou d'année, avec heure optionnelle. Le plus
  gros composant du kit. Tout le formatage et l'analyse passent par `Intl` : aucune
  bibliothèque de dates. `valueType` est **obligatoire et sans défaut** (`'date'` ou `'iso'`)
  parce que le consommateur doit choisir la forme qui correspond à son modèle ; l'entrée
  accepte toujours les deux, seul le côté émis s'engage. Sélection `single`, `multiple` et
  `range`, forage jour → mois → année, modes MonthPicker et YearPicker, plusieurs mois côte à
  côte, ligne d'heure au motif `spinbutton`, contraintes en `Date` comme en ISO, et focus
  rotatif au clavier dans les trois grilles. Panneau en `<dialog>` modal, ou en `[popover]`
  non modal quand `showOnFocus` garde le champ vivant dessous, ou rendu en ligne.

  La **saisie manuelle** est active par défaut, une grille seule imposant à un lecteur d'écran
  de traverser une trentaine de cellules. Le masque auto-« / » ne s'arme que pour construire
  une date depuis un champ vide, et se retire dès qu'une valeur existe ou que l'édition se
  fait à l'intérieur du texte : re-dériver le champ depuis un flux plat de chiffres décalerait
  sinon tous les segments suivants. L'ordre jour / mois / année tapé est **sondé depuis la
  sortie du `dateFormat`**, pas déduit de la locale, pour qu'un formateur d'une autre locale
  ne fasse pas relire la date à l'envers.

- `ui-nudger` : compteur numérique (`[moins] valeur [plus]`). Il compose deux `ui-button` en
  mode icône seule, et ne porte donc aucune couleur propre : `level`, `variant`, `size` et
  `onColor` leur sont transmis. Les états « au minimum » et « au maximum » sont **dérivés de
  la valeur**, jamais des props, donc ils ne peuvent pas mentir. `formatValue` n'habille que
  l'affichage. La valeur est une région vive, annoncée à chaque cran.
- `ui-rating` : note en étoiles posée sur un `<input type="range">` natif. Les étoiles sont
  purement visuelles : focus, clavier, sémantique de valeur et participation à un formulaire
  viennent du navigateur. L'étoile pleine est empilée sur la vide et **découpée** à la portion
  remplie, ce qui fait marcher la demi-note avec n'importe quelle famille d'icônes, rendu
  personnalisé compris. Une valeur hors pas est ramenée au pas, pour ne jamais montrer un
  remplissage que personne n'aurait pu choisir.

  Écart assumé avec la version Angular : celle-ci n'a **aucune** règle `:focus-visible`, et son
  curseur étant en `opacity: 0`, son anneau natif est invisible. Le composant y est donc
  opérable au clavier sans indicateur de focus (WCAG 2.4.7), et le hook
  `--ui-rating-focus-ring-width` y est déclaré et documenté mais branché sur rien. Ici le rang
  d'étoiles rend l'anneau à la place du curseur masqué.

- `ui-slider` : curseur simple ou de plage, sur le motif slider de WAI-ARIA. Chaque poignée est
  un `role="slider"` complet, entièrement pilotable au clavier ; la racine capture le pointeur,
  donc le glissement continue même quand le curseur sort de la piste. Aimantation au pas avec
  arrondi à sa précision décimale (sans quoi `0,4 + 0,1` vaudrait `0,5000000000000001`),
  `minStepsBetweenHandles` qui empêche les poignées de se croiser, repères de pas plafonnés à
  100, et orientation verticale.

  Deux corrections par rapport au portage direct. La poignée active vit dans une **ref** et non
  dans un état : elle est lue synchroniquement par `pointermove` et `pointerup`, or un état
  React n'est pas encore à jour dans un gestionnaire frère du même geste. Et la poignée reçoit
  le focus avec `preventScroll` : sans lui, le défilement provoqué par le focus décalait le
  rectangle de la piste, et un glissement vers 70 arrivait à 100 (mesuré). **Les deux
  expositions existent dans la version Angular.**

- `ui-toggle-block` : bloc sélectionnable enveloppant une case, un bouton radio ou un
  interrupteur. Ce qui rend toute la surface cliquable est un `<label for>` **étiré**, pas un
  gestionnaire de clic : on hérite donc de l'activation clavier et du comportement de sélection
  natifs. Ce label est vide à dessein, c'est le corps du bloc qui nomme le contrôle par
  `aria-labelledby`, ce qui permet de projeter n'importe quel balisage, contenu interactif
  compris. L'indicateur est une **instance** de `ui-checkbox`, `ui-radio` ou `ui-toggle`, donc
  il garde son allure et sa sémantique ; seul son anneau de focus lui est retiré, le bloc le
  dessinant. `hideIndicator` en fait une carte de sélection, opérable mais sans indicateur
  visible.
- `ui-radio` : ajout de `readOnly`. Un `<input type="radio">` n'a pas de `readOnly` natif : le
  bouton reste focalisable et la sélection est annulée dans le gestionnaire, comme
  `ui-checkbox` et `ui-toggle` le faisaient déjà. Pas d'`aria-readonly` en revanche, la
  spécification ne le supportant que sur `radiogroup` : l'annonce reste à la charge du groupe,
  exactement comme pour la validité. **Écart avec la version Angular**, où `readonly` est
  hérité de la classe de base et jamais utilisé, donc sans effet.
- `ui-segment-control` : contrôle segmenté. La sémantique change **entièrement** avec
  `multiple` : `radiogroup` et `radio` avec sélection au passage des flèches en mode simple,
  `group` et `aria-pressed` en bascules, où les flèches ne font que déplacer. Un seul arrêt de
  tabulation pour le groupe, et c'est le segment choisi qui le possède. L'indicateur glissant
  est **mesuré** et non calculé en pourcentage, ce qui le fait tenir avec des segments de
  largeurs inégales, un `ResizeObserver` le remettant en place ; la bordure de la piste est une
  ombre intérieure pour que ce calcul reste exact, et le libellé réserve sa largeur en gras
  pour que la sélection ne décale rien.

  La piste porte une **largeur explicite** (`fit-content`) : `display: inline-flex` ne suffit
  pas, un parent flex ou grid bloquifiant ses enfants et les étirant dans l'axe transverse.
  Sans elle, la piste partait à la largeur du parent avec des segments restés collés à leur
  contenu, donc du vide à droite (mesuré : 420 px de piste pour 326 px de contenu). Même
  exposition dans la version Angular. `fluid` reste le moyen explicite de remplir.

  Deux écarts avec le résolveur d'options partagé, tous deux repris du résolveur propre au
  composant Angular : la clé `value` d'une option riche est honorée sans `optionValue` (sinon
  le modèle reçoit l'objet entier), et un objet sans clé `label` donne `null` et non
  `"[object Object]"` (un segment en icône seule est un usage légitime). Le résolveur partagé
  n'est pas touché : son comportement est juste pour une liste d'options, et son spec Angular
  l'épingle.

- `ui-toggle-button` : bouton à état pressé. Deux modes dans un composant, et `options` est le
  seul interrupteur : **simple**, un `<button aria-pressed>` adossé à la paire `trueValue` /
  `falseValue`, avec libellé et icône qui peuvent différer d'un état à l'autre ; **groupe**,
  `role="group"` sur la racine, un bouton par option, et le modèle devient le tableau des
  valeurs pressées. Le groupe est **toujours multi-sélection**, délibérément : un choix
  exclusif est le travail de `ui-segment-control`, qui le dit avec une sémantique `radiogroup`
  plutôt qu'avec `aria-pressed`. `level` peint l'état pressé, `variant` dessine le relâché, les
  deux axes puisant dans les mêmes familles `actions.*`.

  Un **nom accessible qui change avec l'état** est réannoncé à chaque prise de focus : dès que
  `onLabel` et `offLabel` diffèrent, un `aria-label` stable est exigé, et son absence est
  signalée en développement. Écart avec la version Angular : pas d'`aria-invalid` sur les
  boutons, la spécification ne le supportant pas sur le rôle `button` ; `invalid` ne change
  donc que le rendu, l'annonce revenant au champ englobant.

- `core/forms` : `createRichOptionResolver`, variante du résolveur d'options pour les
  composants qui documentent la forme riche `{ value, label, icon, disabled, ariaLabel }`,
  soit `ui-segment-control` et `ui-toggle-button`. Elle honore la clé `value` sans `optionValue`, et
  rend `null` pour un objet sans clé `label`. Le résolveur de liste n'est pas touché : ses deux
  comportements sont justes pour `ui-select` et `ui-autocomplete`.
- `ui-input-tags` : saisie de plusieurs valeurs sous forme de tags, posée sur `ui-field`. Un tag
  se pose en tapant puis `Entrée`, ou par un `delimiter` qui verse chaque partie complète et
  garde le reste dans le champ ; `addOnBlur`, `addOnTab` et `addOnPaste` complètent, un collage
  se découpant sur les séparateurs usuels même sans `delimiter`. `max` ferme la saisie, et un
  ajout multiple en tient compte en **une seule** écriture du modèle. Mode `typeahead`
  optionnel : le composant **ne filtre rien**, il émet une requête et l'appelant répond, comme
  `ui-autocomplete` ; une valeur déjà posée reste visible dans le panneau, cochée et désactivée.

  La liste des tags est un `role="listbox"` **horizontal** à focus glissant, chaque tag une
  `option`. Le `listbox` n'enveloppe que les tags, une liste ne pouvant pas contenir de champ
  texte, et c'est `display: contents` qui les garde sur les mêmes lignes que la saisie.

- **Correction d'accessibilité sur les puces de `ui-autocomplete` et `ui-input-tags`** : leur
  croix de retrait était un `<button>` **imbriqué** dans une puce elle-même `role="option"`
  interactive, ce qu'axe refuse (`nested-interactive`). Un `tabindex="-1"` n'y change rien,
  les technologies d'assistance atteignant quand même l'élément. La croix devient une
  décoration `aria-hidden`, et le retrait au clavier passe par `Suppr` sur l'option : c'est le
  motif « liste de jetons » de l'APG. La prop `removeTagLabel` disparaît des deux composants, le
  contrôle qu'elle nommait n'existant plus.

  La violation était **latente** dans `ui-autocomplete` depuis son portage : sa story `Multiple`
  démarre sans aucune puce, donc axe n'a jamais vu la structure. Une story `MultipleWithTags`
  la rend désormais au repos. Même exposition dans les deux composants Angular.

- **Contrôle d'accessibilité bloquant** (`@storybook/addon-vitest`) : `pnpm test` exécute
  deux projets Vitest, `unit` et `storybook`. Le second rend chaque story et la passe à axe,
  ce qui rend la décision D8 effective. Première violation trouvée dès le branchement.
- `pnpm links:check` : garde-fou des renvois de doc. Refuse une citation de chemin vers un
  fichier qui n'existe pas, et signale un fichier déclaré « à venir » une fois qu'il existe.
  Un second passage refuse un `<Canvas of={XStories.Y} />` dont la story n'est pas exportée :
  Storybook rend alors un bloc vide, et le build se contente d'un avertissement.
- `pnpm prose:check` : garde-fou d'écriture. Refuse le tiret cadratin dans un commentaire de
  code ou un markdown. Le même caractère comme glyphe affiché reste permis.
- `pnpm deps:check` : garde-fou de la décision D6. Refuse un import de librairie tierce
  hors de sa brique `core/`, une dépendance non arbitrée, une brique implémentée dont la
  dépendance n'est pas déclarée, et une dépendance déclarée que rien n'utilise. Chaîné
  dans `docs:config:check`.
- `ui-menu` : menu de navigation et de commandes, statique ou en popup, et **première entrée
  de la famille `navigation`**. Modèle déclaratif `UiMenuItem` : sections titrées,
  séparateurs, groupes repliables pilotables par `expandedKeys`, sous-menus en cascade,
  commandes, `url`, et `render` pour brancher le lien d'un routeur sans que le kit en impose
  aucun. En popup, le panneau vit dans le calque supérieur : aucun z-index, et aucun rognage
  par un ancêtre en `overflow: hidden` (mesuré à 210 px de large dans un cadre de 120 px).
  Motif menu de l'APG : un seul arrêt de tabulation, flèches, `Début` et `Fin`, `→` et `←`
  pour les groupes. Le `routerLink` d'Angular devient `render` + `active`, et le pilotage
  impératif (`toggle(event)`) devient le contrat contrôlé `open` / `defaultOpen` /
  `onOpenChange` avec une prop de rendu `trigger`, comme `ui-popover`.
- `ui-context-menu` : menu ouvert au clic droit, ancré sur le **point** cliqué et non sur un
  élément. Le panneau est un `ui-menu` embarqué, compact et en sous-menus en cascade par
  défaut ; `global` attache l'écouteur au document entier. Les coordonnées sont gardées en
  coordonnées de page et reprojetées à chaque défilement, donc le menu suit le contenu
  (mesuré : un défilement de 120 px le déplace de 120 px).
- `core/overlay` : `useUiPosition` accepte une **ancre virtuelle**, un simple point du
  viewport (`anchorPoint`), pour ce qui ne s'ancre pas à un élément ; et un écart d'axe
  **transverse** (`offset: { main, cross }`), qui aligne le premier item d'un sous-menu en
  cascade sur son item parent plutôt que les deux boîtes.
- `core/overlay` : `useUiPosition` expose `isPositioned`, qui dit si la position a déjà été
  calculée. `utils.overlay-motion` reconnaît l'attribut `data-unpositioned` et garde le
  panneau dans son état fermé tant qu'elle ne l'est pas, ce qui supprime l'image peinte au
  mauvais endroit.
- `ui-table` : tableau de données **headless**, et le plus gros composant du kit. L'appelant
  possède le balisage des lignes (`renderHeader`, `renderBody` et `renderFooter` rendent de
  vrais `<tr>`, `<th>` et `<td>`), le composant possède le pipeline : tri simple ou multiple,
  pagination, sélection simple ou multiple (clic, cases, boutons radio, plages au clavier),
  dépliage de ligne, colonnes et lignes figées, redimensionnement de colonne,
  réordonnancement par glisser-déposer, défilement virtuel, et mode `lazy` où tri et
  pagination appartiennent au serveur. Les directives d'Angular deviennent des **fabriques de
  props** passées au balisage (`table.sortableColumn`, `table.selectableRow`…), et les
  contrôles des composants (`UiTableCheckbox`, `UiTableSortIcon`…) qui lisent le tableau par
  contexte. Le tri, trois entrées côté Angular, devient une seule valeur contrôlable.
- `core/utils` : `getFieldPath`, lecture d'un champ en notation pointée. Troisième besoin
  identique du dépôt, donc partagée : le résolveur d'options y délègue désormais, et le
  tableau s'en sert pour trier et pour identifier ses lignes.
- `ui-paginator` : barre de pagination autonome, et **première entrée de la famille `table`**.
  La position est portée par `first`, l'index de la première ligne affichée, plutôt que par un
  numéro de page : elle se donne directement à un `slice` ou à un `OFFSET`, et survit à un
  changement de taille de page. Numéros fenêtrés autour de la page courante, ou repliés sur
  les bords par `ellipsis`, avec la règle qu'un trou d'une seule page montre la page plutôt
  qu'une coupure. Compte rendu à motif (`{first}`, `{last}`, `{rows}`, `{page}`,
  `{pageCount}`, `{totalRecords}`), sélecteur de lignes par page composé sur `ui-select`, et
  quatre contrôles de bord au `disabled` natif là où ils ne mènent nulle part. `first` et
  `rows` suivent tous deux le contrat contrôlé du kit ; les gabarits d'Angular deviennent
  `renderPageLink`, `renderStart`, `renderEnd`, `renderReport` et quatre props d'icône.
- `utils.overlay-motion-enter` : entrée seule d'un panneau du calque supérieur, la sortie
  restant instantanée. Pour un panneau dont l'ancre peut disparaître sous lui, un sous-menu en
  cascade typiquement, où la fenêtre d'affichage d'une sortie animée expose des défauts.
- `pnpm components:check` refuse aussi un **décompte de composants périmé**, numérateur et
  dénominateur, dans les deux README et dans le tableau d'état de `docs/ROADMAP.md`. Il ne
  validait que les listes, et le nombre qui les résume avait dérivé deux fois.
- `pnpm prose:check` refuse aussi un **tableau markdown dans un `.mdx`**. Storybook n'a pas
  `remark-gfm` dans sa chaîne : un tableau écrit en `|` rend des tuyaux en texte brut, sans le
  moindre avertissement. L'erreur avait été commise quatre fois. Les `.md` ne sont pas visés,
  GitHub les rendant très bien.
- `ui-alert` : message en ligne pour un retour informatif, de succès, d'avertissement ou
  d'erreur. `role="alert"` sur la racine, icône déduite du niveau et surchargeable, deux
  tailles, contenu libre projeté sous le message, fermeture, et disparition automatique par
  `life`. L'affichage suit le contrat contrôlé du kit : non contrôlée, l'alerte se retire
  elle-même comme la version Angular ; `open` renseignée, l'état revient au parent, ce qui est
  le cas d'une pile de messages.
- `ui-tabs` : onglets **headless**, en API de composition (`UiTabs`, `UiTabList`, `UiTab`,
  `UiTabPanels`, `UiTabPanel`), un onglet et son panneau étant appariés par leur `value`.
  Focus glissant branché sur les entrées, indicateur mesuré sur l'onglet actif, bande
  défilante à navigateurs, panneaux paresseux, axe horizontal ou vertical. Sans
  `UiTabPanels`, les onglets deviennent un menu de navigation et n'annoncent plus
  d'`aria-controls`, qui ne pointerait alors sur rien.
- `ui-input-date` : le champ date/heure **natif**, pour le mobile. Le sélecteur revient au
  système, dont la roue n'est égalée par aucun overlay au pouce ; `ui-datepicker` garde
  l'autre moitié du terrain, un calendrier porté par les jetons avec plages, multi-mois et
  inline. `mode` (`date`/`time`/`datetime`) choisit le contrôle natif, `min`/`max`/`step`
  bornent la saisie.
  - `valueType` est **identique** à celui d'`ui-datepicker` (`'date'` donne une `Date`,
    `'iso'` une chaîne) : un composant métier bascule de l'un à l'autre selon le viewport
    sans rien convertir. C'est la raison d'être d'un composant dédié plutôt que d'un `type`
    de plus sur `ui-input`.
  - Il émet sur le `change` **natif**, jamais pendant la frappe : un contrôle temporel vide
    sa propre valeur tant que la saisie est incomplète, et le `onChange` de React étant le
    `input` du DOM, s'y brancher aurait émis une rafale de valeurs nulles, indistinguables
    d'un effacement.
  - Le libellé reste levé, `floatLabel` compris : le navigateur dessine son gabarit
    (`jj/mm/aaaa`) dans la boîte. Pas de `placeholder`, que le navigateur ignore sur ces
    types.
  - L'indicateur du navigateur est masqué au profit de la zone d'action du kit, celle-là
    même que rend le déclencheur d'`ui-datepicker` : les deux champs s'alignent enfin, et
    lisent les mêmes `--ui-form-field-action-*`. Firefox n'exposant aucun sélecteur vers le
    sien, son contrôle est élargi puis rogné d'autant.
  - Le glyphe et le panneau déroulant suivent `color-scheme`, basculé avec le thème sombre :
    sans ça, glyphe noir sur champ sombre et calendrier clair.

### Fixed

- `ui-tooltip` : la bulle **s'interposait entre le pointeur et la page**. Elle avalait donc
  les clics de ce qu'elle surplombe, et avec `autoHide` elle pouvait clignoter, le pointeur
  qui l'atteint quittant le déclencheur, ce qui la ferme, ce qui remet le pointeur sur le
  déclencheur, ce qui la rouvre. La règle `._interactive { pointer-events: auto }` reprise du
  kit Angular n'a de sens que là-bas : c'est le panneau du CDK qui y pose
  `pointer-events: none` sur le calque, et ce calque n'existe pas ici, la bulle vivant dans le
  calque supérieur natif. La bulle le pose donc elle-même, et `._interactive` redevient ce
  qu'elle décrit. Mesuré par `elementFromPoint`, pas seulement par la propriété déclarée.
- `ui-tooltip` : deux déclarations `position` contradictoires dans le même bloc, `fixed` puis
  `relative`. Seul le style en ligne du positionneur les masquait. `fixed` est gardée, elle
  établit aussi le bloc conteneur de la flèche.

- Documentation : le total du Design System était annoncé à **61** composants dans les deux
  README et dans la feuille de route, alors que le starter Angular en compte **60** (mesuré, et
  c'est aussi ce que son propre README indique). Le chiffre venait probablement du décompte de
  `ui-file-upload-list`, livré dans l'entry point de `ui-file-upload`. Il est désormais écrit
  une seule fois, dans `scripts/components.check.mjs`, avec la commande qui le produit.

- `ui-menu` · sous-menus en cascade : l'**ombre du panneau était rognée** sur ses quatre
  côtés. Le style navigateur d'un `[popover]` pose `overflow: auto`, et l'enveloppe de
  positionnement fait exactement la taille du panneau qu'elle porte : l'ombre, peinte hors de
  la boîte, se faisait donc couper. Le même correctif existait déjà dans `ui-tooltip`. Vaut
  aussi pour `ui-context-menu`.
- `ui-menu` · sous-menus en cascade : activer une entrée **rouvrait le sous-menu** au lieu de
  le fermer, ce qui donnait l'impression que les menus s'empilaient. Masquer un panneau change
  l'élément sous le pointeur, et le navigateur émet alors un `mouseenter` sur ce qui se
  retrouve dessous sans que l'utilisateur ait bougé : mesuré à 7 ms après la fermeture, sur
  l'entrée parente, qui rouvrait aussitôt. Un survol non précédé d'un `pointermove` ne
  commande plus rien.
- `ui-menu` · sous-menus en cascade : **cliquer un parent refermait** le panneau que le survol
  venait d'ouvrir, donc le clic paraissait sans effet à la souris. Le clic ouvre désormais, il
  ne bascule plus ; un sous-menu se ferme en survolant un voisin, par `←`, par Échap, ou en
  activant une feuille.
- `ui-menu` · sous-menus en cascade : la sortie était animée et **glissait par-dessus le
  panneau parent** (mesuré : 180 ms de recouvrement, de 202 à 195 px). Le sous-menu s'anime
  désormais à l'entrée seulement, comme la directive du kit Angular, et disparaît net.
- **Tous les panneaux flottants** (`ui-select`, `ui-autocomplete`, `ui-input-tags`,
  `ui-datepicker`, `ui-popover`, `ui-tooltip`, `ui-menu`, `ui-context-menu`) pouvaient
  apparaître **au mauvais endroit puis se replacer**. `computePosition` est asynchrone, donc
  la première image porte encore la position d'avant. Un panneau reste maintenant dans son
  état fermé, invisible, jusqu'à ce que sa position soit calculée.

- Documentation : la table de capacités de « Couches et focus » et deux tables de
  `ui-datepicker` rendaient des **tuyaux en texte brut**, Storybook n'activant pas les
  tableaux markdown. Passées en `<table className="doc-table">`, et la règle est désormais
  tenue par `pnpm prose:check`.

- `utils.field-action` : une action de champ s'arrêtait à la boîte de **contenu** dans un champ
  `_auto-height`, laissant un blanc en haut et en bas (mesuré : 32 px pour une boîte de 40).
  La boîte publie désormais son inset vertical dans `--_field-inset-block`, que l'action
  annule.
- `utils.field-action` : la largeur venait d'un `aspect-ratio`, qui ne s'applique pas quand les
  deux axes sont déterminés. Sur une action étirée verticalement elle retombait à la largeur de
  l'icône, **20 px, sous le minimum de cible de WCAG 2.5.8**. Elle est désormais explicite.
  Les deux défauts sont présents à l'identique côté Angular.
- `ui-chip` : un `role` fourni par l'appelant était écrasé par celui du composant. Côté Angular
  l'hôte et le span interne sont deux éléments ; ici c'est le même, donc une puce servant
  d'option dans une liste perdait son `role="option"`.
- `ui-select` : en mode multiple avec des valeurs rendues, les puces étaient **collées à la
  bordure** du champ. La boîte du champ ne porte aucun inset, chaque enfant direct porte le
  sien sur les bords qu'il touche, et `.ui-select-values` l'oubliait. Le défaut est présent à
  l'identique côté Angular, la SCSS y étant la même.
- `ui-select` : en mode éditable, le chevron cliquable gardait les styles navigateur d'un
  `<button>` (bordure, marges, hauteur de contenu). Il utilise désormais le mixin
  `field-action` du kit, comme les autres boutons de champ : pleine hauteur, collé au bord,
  et le rayon du coin.
- Documentation : les tableaux de `ui-select` et `ui-link` rendaient des tuyaux en texte brut.
  Storybook n'active pas les tableaux markdown de GFM ; la convention du dépôt est
  `<table className="doc-table">`, qui hérite des styles de la doc.
- `ui-modal` et `ui-tooltip` : un panneau **fermé restait affiché**. Le style navigateur
  (`dialog:not([open])` et `[popover]:not(:popover-open)` en `display: none`) est de niveau
  UA, donc le `display` d'auteur des deux composants le battait. Le dialogue recouvrait son
  propre déclencheur, ce qui donnait exactement l'impression d'un dialogue impossible à
  fermer ou à rouvrir. La règle est désormais redite explicitement.
- `ui-modal` : le dialogue ne se **rouvrait plus** après une fermeture. La fermeture partait
  du DOM (`dialog.close()`) et l'état se mettait à jour depuis l'événement `close`, qui est
  **mis en file** et n'arrive donc pas toujours. L'état restait à `true` avec un dialogue
  fermé à l'écran, et le déclencheur ne changeait plus rien. L'état est désormais la source de
  vérité : le bouton, le clic sur l'arrière-plan et Échap demandent la fermeture, et un seul
  effet ouvre et ferme le dialogue natif.
- `ui-modal` : les exemples de la page de doc démarraient **ouverts**, ce qui masquait leur
  propre déclencheur et affichait dix dialogues à la fois. Un seul reste ouvert, pour montrer
  l'anatomie ; les autres s'ouvrent par leur bouton.
- `ui-progress-bar` : la piste rendait une largeur **nulle** en `valuePosition="bottom"`, ce
  qui rendait la barre invisible. En colonne, `align-items` gouverne l'axe horizontal, et le
  `flex-end` d'origine y ramenait la piste à sa largeur de contenu. Elle s'étire désormais,
  et seul le libellé s'aligne à droite. La SCSS étant reprise du kit Angular à l'octet près,
  le défaut y est présent à l'identique : voir `docs/DUAL-ENGINE.md`.

### Changed

- Les aides de date (`toIsoDate`, `parseIsoDate`, `startOfDay`…) quittent `ui-datepicker`
  pour `core/forms`, et gagnent `toIsoTime` / `parseIsoTime`. Elles y étaient tant qu'il
  était leur seul appelant ; deux points d'entrée ne doivent jamais s'importer l'un l'autre,
  et le second appelant (`ui-input-date`) ne laissait donc qu'un choix. Sérialiser une `Date`
  depuis ses composantes **locales** plutôt que par `toISOString()` est le point subtil, et
  il ne doit pas être redémontré deux fois.
- **Les panneaux flottants retrouvent leur hook de couleur par composant** :
  `--ui-datepicker-panel-surface` / `-stroke`, et les mêmes pour `ui-select`,
  `ui-autocomplete`, `ui-input-tags`, `ui-menu` et `ui-popover`. Le mixin `overlay-panel()`
  n'exposait que `--ui-overlay-surface` / `-stroke`, qui ne visent qu'un exemplaire : un
  thème écrit pour le starter Angular perdait ces six noms au passage.
- **Les couleurs des composants sont exposées en hooks `--ui-*`**, alignement sur le starter
  Angular. Chaque fond, couleur de texte, couleur de bordure et teinte d'anneau de focus se
  retouche sans forker le SCSS : `--ui-button-surface`, `--ui-table-body-surface-selected`,
  `--ui-datepicker-day-color-selected`… Le hook est posé sur le site d'usage, pas sur une
  variable de config, parce que le jeu de jetons d'une couleur dépend de la variante rendue :
  un seul nom couvre donc les 15 jeux de `ui-button` comme les 10 de `ui-badge`, la portée se
  choisissant par le sélecteur qui porte le hook. Sans hook posé, rien ne change : le repli
  reste le jeton sémantique, avec son thème, ses 3 marques et son contraste vérifié.
- **La famille typographique et la graisse sont exposées de la même façon** :
  `--ui-<composant>-font-family` et `--ui-<composant>-weight`, plus les variantes par partie
  (`--ui-card-title-font-family`, `--ui-alert-text-weight`…).
- `_ui-config.scss` porte désormais des couleurs, mais seulement celles qu'un **mixin
  partagé** peint : le mixin ignore quel composant l'a inclus, donc leur hook porte le nom de
  la catégorie (`--ui-form-field-color`, `--ui-form-control-surface-checked`,
  `--ui-form-field-action-surface-focus`…). Les poser vaut pour tous les champs à la fois.
- La section « Theming » d'un composant marque ces hooks **« selon la variante »** : le jeton
  de repli étant choisi à la compilation, il n'y a pas une valeur unique à mesurer. Ils ne
  figurent pas dans `component-vars.scss`, où déclarer une valeur écraserait les autres
  variantes.
- **Trois micro-dépendances refusées**, sur mesure et non sur réputation : `tabbable`,
  `aria-hidden` et `react-remove-scroll`. Un relevé en navigateur réel montre que le piège de
  focus modal, la restitution du focus, l'inertie de l'arrière-plan et la fermeture au clic
  extérieur sont natifs ; seul le blocage du défilement manquait, et il tient dans une brique.
  Les refus sont inscrits dans `scripts/deps.check.mjs` avec leur motif. Détail dans
  `docs/DECISIONS.md` → D6.
- `ui-tooltip` n'expose **ni `escape` ni `tooltipContext`** : `content` accepte n'importe quel
  nœud React, ce qui couvre le contenu riche sans jamais injecter de HTML. `ui-popover` passe
  d'une API impérative à une API contrôlée. Voir `docs/DUAL-ENGINE.md`.
- `ui-modal` n'expose **ni `autoZIndex` ni `baseZIndex`**, contrairement à la version
  Angular : le calque supérieur empile les dialogues dans leur ordre d'ouverture, et garder
  ces props serait promettre un réglage sans effet. Voir `docs/DUAL-ENGINE.md`.
- Le kit a désormais **une** dépendance runtime, `@floating-ui/react-dom`, importable par le
  seul `core/overlay/use-ui-position.ts`.
- **D6 arbitrée** : aucune librairie de composants (ni Radix UI, ni React Aria, ni TanStack
  Table). Deux dépendances de comportement budgétées pour la phase 2,
  `@floating-ui/react-dom` et `@tanstack/react-virtual`, chacune importable par un seul
  fichier. Le raisonnement, la mesure qui le fonde et les verdicts librairie par librairie
  sont dans `docs/DECISIONS.md`.
