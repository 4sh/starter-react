# Pratiques de sécurité

Deux sujets, et un registre. Le premier porte sur le code du kit : React échappe tout ce
qui passe par du JSX, et ce document nomme les API qui contournent cette protection. Le
second porte sur la chaîne de dépendances.

Ces règles sont **appliquées par l'outillage**, pas seulement écrites ici : ESLint bloque
en CI, et pnpm refuse d'installer ce qui n'a pas été arbitré.

---

## 1. Ne pas contourner l'échappement de React

React échappe automatiquement toute valeur rendue par du JSX. Les API ci-dessous sont
précisément la porte de sortie : elles écrivent la chaîne telle quelle, sans aucun
assainissement.

### Ce qui est interdit

| API                                  | Pourquoi                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| `dangerouslySetInnerHTML`            | Injecte le HTML fourni sans le vérifier. Le nom dit ce qu'il fait. |
| `el.innerHTML` / `el.outerHTML`      | Écriture DOM directe : rien ne l'assainit, jamais.                 |
| `el.insertAdjacentHTML()`            | Idem.                                                              |
| `document.execCommand('insertHTML')` | Insère la chaîne telle quelle, comme `innerHTML`.                  |
| `eval()` / `new Function()`          | Évaluation de code à la volée.                                     |

⚠️ Un piège propre à React : une valeur interpolée dans un attribut `href` ou `src` n'est
**pas** protégée contre le schéma `javascript:`. Un lien dont l'URL vient de l'extérieur
doit voir son schéma validé (`http:`, `https:`, `mailto:`) avant d'être posé.

### Comment c'est appliqué

`no-restricted-syntax` dans `eslint.config.mjs`, sur le TypeScript comme sur le JSX.
`pnpm lint:check` est bloquant en CI (`.github/workflows/pr-checks.yml`).

### Comment lever une exception

Trois étapes, jamais moins :

1. **Assainir la valeur dans du code que l'on peut tester.** Une fonction dédiée, avec son
   test, qui prend l'entrée non fiable et rend une sortie sûre. Pas une expression posée
   au point d'usage.
2. **Justifier sur place**, avec la forme exacte attendue :
   ```tsx
   // eslint-disable-next-line no-restricted-syntax -- EXCEPTION JUSTIFIÉE: <raison courte>
   ```
3. **Inscrire l'exception au registre ci-dessous**, avec le fichier, la raison, et ce qui
   assainit la valeur.

Une exception sans les trois n'est pas une exception, c'est un oubli.

---

## 2. Registre des exceptions

**Le kit en porte une seule**, dans `ui-editor`.

Côté Angular, le kit en porte cinq, dans deux composants : deux dans `ui-image`, pour du SVG
inline, et trois dans `ui-editor`, qui analyse du HTML dans un `<template>` détaché et écrit
sa valeur dans la zone éditable (mesuré le 23 septembre, par `EXCEPTION JUSTIFIÉE` dans ses
sources). Ce dépôt a fait tomber les cinq, et n'en garde qu'une, d'une autre nature.

- **`ui-image`** inline ses SVG locaux par la voie que ce document désignait d'avance :
  `inlineSvgToReact()` analyse le balisage dans un document détaché, le nettoie, puis
  construit des **éléments React**. Rien n'est écrit en HTML. Le nettoyage reste
  indispensable, et il est testé à part (`ui-image-svg.test.tsx`) : le modèle de menace n'est
  pas « les images du kit », c'est un projet qui sert `assets/img/` depuis un CDN, ou qui
  laisse un client déposer son logo dans un dossier de marque.
- **`ui-editor`** analyse avec `DOMParser`, dans un document inerte, et écrit sa valeur dans la
  zone par des **nœuds** (`replaceChildren`), jamais par `innerHTML`. Les trois exceptions
  d'Angular disparaissent. La valeur passe par `sanitizeHtml`, le portage testé du
  `DomSanitizer` d'Angular (`ui-editor-sanitize.test.ts`).

Reste le **collage** : il insère par `execCommand('insertHTML')`, seule façon d'insérer du
balisage que l'annulation native enregistre, pour que Ctrl+Z annule un collage. Une insertion
par `Range` n'aurait demandé aucune exception, au prix de cette annulation. L'appel est
désormais refusé par le lint comme les autres, ce qui rend l'exception vérifiée et pas
seulement déclarée.

| Fichier                                                                          | Exception                      | Raison                                      | Ce qui assainit la valeur                                                                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui-kit-react/src/forms/ui-editor/ui-editor-commands.ts` (`insertHtml`) | `execCommand('insertHTML', …)` | Le collage doit rester annulable par Ctrl+Z | `sanitizeHtml(normalizeHtml(…))` : balises de l'éditeur seules, puis le portage du `DomSanitizer`. Seul appelant : `onPaste` de `ui-editor.tsx` |

---------- | --------- | ------ | ------------------------- |
| _(aucune)_ | | | |

---

## 3. Chaîne de dépendances : pnpm

Les réglages vivent dans `pnpm-workspace.yaml`, chacun commenté sur place. Le résumé de la
politique :

| Réglage                    | Ce qu'il fait                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `minimumReleaseAge: 1440`  | Une version publiée il y a moins de 24 h n'est pas installée, transitives incluses.   |
| `strictDepBuilds: true`    | Échoue si une dépendance porte un script d'install non arbitré.                       |
| `allowBuilds`              | La liste, nominative, des paquets autorisés à exécuter leur script d'install.         |
| `blockExoticSubdeps: true` | Une dépendance transitive doit venir du registre, jamais d'un dépôt git ou d'une URL. |
| `saveExact: true`          | Versions figées à l'exact.                                                            |

Trois points à connaître, tous vérifiés côté Angular avant d'arriver ici :

- **`saveExact` DOIT être dans `pnpm-workspace.yaml`**, pas dans `.npmrc` : pnpm n'honore
  pas `save-exact` depuis `.npmrc` (`pnpm config get save-exact` rend `undefined`, et un
  `pnpm add` écrit `^x.y.z`). Ne pas croire le déplacer.
- **`minimumReleaseAge` fait aussi passer `minimumReleaseAgeStrict` à `true`** : pnpm
  échoue quand aucune version ne satisfait le délai, au lieu de retomber en silence sur une
  version trop récente. C'est voulu.
- **Conséquence côté Dependabot** : une PR qui propose une version publiée le matin même
  échoue en CI puis passe d'elle-même à la relance suivante. Ce n'est pas une panne. Pour
  prendre immédiatement un correctif de sécurité, inscrire le paquet dans
  `minimumReleaseAgeExclude` le temps du bump, **puis l'en retirer**.

Recenser à nouveau les paquets à script d'install, quand la liste `allowBuilds` doit être
révisée :

```bash
pnpm ls --depth Infinity --json | grep -i postinstall
```

> Le récit détaillé de la bascule npm → pnpm, et les trois dépendances fantômes qu'elle a
> révélées, vivent dans le `docs/SECURITY-PRACTICES.md` du starter Angular. Ce dépôt est né
> sous pnpm : il n'a pas cette histoire, seulement la politique qui en est sortie.

---

## 4. Ce que le starter ne fait pas (et pourquoi)

- **Pas de Trusted Types ni de CSP.** Ce sont des réglages d'**application**, pas de
  librairie : une CSP se pose sur les en-têtes du serveur qui sert l'application, et le kit
  n'en sert aucun. À faire côté projet consommateur.
- **Pas de couche i18n.** Les props `*Label` ne portent qu'un défaut français. Ce n'est pas
  un sujet de sécurité, mais c'est la même logique : le kit ne prend pas une décision qui
  appartient à l'application.
