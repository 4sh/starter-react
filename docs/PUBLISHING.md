# Publication

Un seul paquet part sur npm : **`@4sh/ui-kit-react`**, avec le serveur MCP embarqué sous
`mcp/` (FSHSP-222). Le workflow est `.github/workflows/publish.yml`.

| Paquet                  | Publié | Pourquoi                                                                 |
| ----------------------- | ------ | ------------------------------------------------------------------------ |
| `@4sh/ui-kit-react`     | oui    | Le kit, serveur MCP compris.                                             |
| `@4sh/ui-kit-react-mcp` | non    | Là où le serveur s'écrit et se teste. Son build est recopié dans le kit. |
| `@4sh/ui-kit-react-cli` | non    | Squelette en attendant la phase 4. Rejoindra ce workflow, publié avant.  |

Les deux paquets non publiés gardent `private: true`, ce qui empêche un `pnpm publish -r`
distrait de pousser une coquille vide.

## Principes

Ils sont repris du starter Angular, où ils sont éprouvés. Ce ne sont pas des détails
d'implémentation : ils décident de ce qui peut mal tourner.

**Déclenchement manuel uniquement.** Publier est irréversible : un couple nom + version ne
peut jamais être réutilisé, et `npm unpublish` est limité à 72 h. Le workflow ne part donc
jamais sur un push.

**Trois jobs, séparés exprès.**

| Job       | Rôle                                                                                                      | Droit             |
| --------- | --------------------------------------------------------------------------------------------------------- | ----------------- |
| `verify`  | Construit et affiche le contenu exact du tarball. Aucun secret.                                           | lecture seule     |
| `publish` | Ne tourne que si `dry_run` est faux, derrière un environnement protégé qui exige une approbation humaine. | publication npm   |
| `release` | Pose le tag et ouvre la release GitHub depuis le CHANGELOG.                                               | `contents: write` |

`release` est séparé de `publish` parce qu'il a besoin de `contents: write`, qui n'a rien à
faire dans le job qui détient le droit de publier.

**Authentification par Trusted Publishing (OIDC), sans jeton ni secret.** npm vérifie les
revendications OIDC du job contre le dépôt et le workflow déclarés sur la page du paquet,
puis délivre un droit de publication de courte durée, valable pour ce job seulement.
L'approbation d'environnement reste indispensable : OIDC prouve **d'où** vient la
publication, jamais **qui** l'a décidée.

**Les dépendances s'installent avec pnpm, mais les étapes de publication utilisent le CLI
npm.** C'est délibéré, ce n'est pas une migration à moitié faite. `pnpm publish` a
supporté OIDC en pnpm 10 puis a régressé en 11.0.8 (le registre répond 404 parce que
l'échange OIDC n'a jamais lieu). Publier est irréversible : porter ce risque n'apporte
rien. Si cela doit bouger un jour, le test d'acceptation est un vrai `dry_run` contre le
registre depuis ce workflow, pas un `pnpm publish --dry-run` vert en local, qui n'effectue
aucun échange OIDC.

## Mise en place, une fois

Faite avant la première publication. Rien de tout ça ne vit dans le dépôt : c'est de la
configuration GitHub et npm, et le workflow échoue tant qu'elle manque. Gardée ici pour un
nouveau paquet (le CLI, en phase 4, repassera par les étapes 2 et 3).

> ℹ️ **Amorçage terminé le 13/10/2026** (FSHSP-239). L'environnement `npm-publish` existe,
> avec la même configuration que côté Angular : trois approbateurs (`robinlopez`,
> `wandabardey`, `LBU4SH`), branche `main` seule. La `0.1.0` a été publiée depuis un poste,
> en session `npm login` sur `4sh-package-admin` : elle ne porte **aucune attestation de
> provenance**, et son tag `v0.1.0` comme sa release GitHub ont été posés à la main, le job
> `release` n'ayant pas tourné. Le Trusted Publisher est déclaré : les versions suivantes
> passent entièrement par la CI.
>
> Deux surprises de cette première publication, à connaître :
>
> - **npm affiche d'abord un paquet provisoire `0.0.0-stage`** (« Temporary package
>   placeholder for staged publishing ») et un `404` sur la version publiée, le temps
>   d'analyser un nom neuf. La `0.1.0` est apparue quelques minutes plus tard. Le
>   `0.0.0-stage` reste listé dans les versions du paquet ; `latest` pointe bien sur la
>   `0.1.0`.
> - **Le `401` qui précède le `202` dans le journal de `npm publish` n'est pas une erreur** :
>   c'est la demande du second facteur.

1. **Créer l'environnement GitHub `npm-publish`** (_Settings → Environments_) avec au moins
   un approbateur requis. ⚠️ Un environnement référencé par un workflow mais jamais créé
   l'est automatiquement, **sans** règle de protection : le garde humain disparaît sans
   bruit. Le créer d'abord, à la main.
2. **Publier la première version depuis un poste.** Le Trusted Publisher se déclare sur la
   page d'un paquet **déjà présent** sur le registre : la première version d'un nom neuf
   ne peut donc pas passer par le workflow (il échouerait en `ENEEDAUTH`). Côté Angular,
   `@4sh/ui-kit-schematics` est tombé exactement dans ce cas (FSHSP-109). Même chemin
   ici : `pnpm kit:pack` pour que tous les contrôles passent, puis `npm publish` depuis
   `packages/ui-kit-react`, en session `npm login` interactive sur le compte
   `4sh-package-admin`, jamais avec un token de CI. Cette version-là ne porte aucune
   attestation de provenance, et son tag `vX.Y.Z` se pose à la main, le job `release`
   n'ayant pas tourné.
3. **Déclarer le Trusted Publisher** sur la page du paquet (_Settings → Trusted
   Publisher_) : GitHub Actions, organisation `4sh`, dépôt `starter-react`, workflow
   `publish.yml`, environnement `npm-publish`, _Allowed actions_ limité à `npm publish`.
   L'étape « Check npm supports Trusted Publishing » du job `publish` affiche les trois
   valeurs exactes à recopier si l'échange échoue sur `ENEEDAUTH`. Les versions suivantes
   passent entièrement par la CI.
4. **Optionnel** : le secret de dépôt `SLACK_WEBHOOK_URL` pour l'annonce de release, dans
   le même canal que côté Angular. Sans lui, l'étape est sautée, pas en échec.

## Publier une version

1. Préparer la release sur `main` (`docs/VERSIONING.md`) : section `[X.Y.Z]` dans le
   CHANGELOG, version dans `packages/ui-kit-react/package.json` **et** `UI_KIT_VERSION` dans
   `packages/ui-kit-react/src/index.ts`.
2. _Actions → Publish @4sh/ui-kit-react to npm → Run workflow_, `dry_run` coché (défaut).
   Lire la sortie de `npm publish --dry-run` : c'est la liste exacte des fichiers envoyés.
3. Relancer avec `dry_run` décoché, puis approuver le job `publish`.
4. Le job `release` pose le tag `vX.Y.Z` et ouvre la release GitHub.

## Ce que le workflow contrôle, pour ne pas avoir à le faire de tête

Le job `verify` et le job `publish` enchaînent les mêmes étapes, et la publication ne part
que si toutes passent :

| Étape                   | Échoue quand                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changelog.section.mjs` | La section `[X.Y.Z]` du CHANGELOG manque : la release GitHub serait vide.                                                                                                                                                       |
| `pnpm kit:build`        | Un point d'entrée ne se construit pas, ou ses déclarations de types.                                                                                                                                                            |
| `pnpm kit:mcp`          | Le serveur MCP ne se construit pas depuis la doc de CE commit, ou sa copie embarquée ne répond pas au smoke test.                                                                                                               |
| `pnpm kit:check`        | Un fichier attendu manque (`dist/`, `styles.css`, `mcp/`, `NOTICE`…), une cible `exports` ou `bin` ne résout pas, une story ou un test fuite, ou la version diffère entre `package.json`, `UI_KIT_VERSION` et le manifeste MCP. |

Le serveur est reconstruit à chaque fois parce que son `dist/` et son `data/` ne sont pas
committés. C'est aussi pourquoi `kit:mcp` est une étape explicite du workflow et non un
effet de bord du build : côté Angular, la 0.4.0 est partie sans son serveur MCP parce que
l'étape qui l'assemblait n'était pas dans le workflow (FSHSP-141).
