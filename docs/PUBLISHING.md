# Publication

> ⚠️ **Aucun paquet n'est publié à ce jour.** Les trois paquets portent `private: true` en
> attendant leur première release, ce qui empêche un `pnpm publish -r` distrait de pousser
> une coquille vide. Ce document décrit la cible ; le workflow est à écrire en phase 5
> (voir `docs/DECISIONS.md`).

## Principes, arrêtés dès maintenant

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

## À faire en phase 5

1. Écrire `.github/workflows/publish.yml` sur ce modèle (le fichier du starter Angular est
   directement transposable : mêmes jobs, mêmes gardes, seuls les noms de paquets et les
   commandes de build changent).
2. Retirer `private: true` des trois `package.json`.
3. Déclarer le Trusted Publishing sur npm pour les trois paquets : dépôt `4sh/starter-react`,
   workflow `publish.yml`.
4. Créer l'environnement GitHub `npm-publish` avec au moins un approbateur requis.
5. Lancer un `dry_run: true` et **lire le contenu du tarball** avant toute publication
   réelle. Points à vérifier en particulier : la présence de `dist/`, de `src/styles/`, du
   `NOTICE` et des README, l'absence des stories, des tests et des `.mdx`, et la
   cohérence de la table `exports` avec ce que `dist/` contient réellement.
