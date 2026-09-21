/*
 * Cette entrée racine reste volontairement minimale : chaque composant est
 * exposé par son propre sous-chemin (`@4sh/ui-kit-react/ui-icon`), de sorte
 * qu'un consommateur ne tire que ce qu'il importe. Rien ne doit réexporter les
 * composants ici : ce serait rendre inopérant le découpage.
 */

/** Version du paquet, alignée sur `package.json` au moment de la publication. */
export const UI_KIT_VERSION = '0.1.0';
