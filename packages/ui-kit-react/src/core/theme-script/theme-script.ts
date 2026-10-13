/*
 * Pas de `'use client'` ici, et c'est tout l'objet de ce module : le script se
 * pose dans le `<head>` d'un layout SERVEUR. Dans `core/theming`, à côté du
 * provider, la fonction devenait une référence client que Next refuse
 * d'appeler côté serveur (FSHSP-238). `vite.config.ts` exclut donc cette entrée
 * de la bannière `'use client'`.
 *
 * Ni React ni état : une chaîne, utilisable des deux côtés.
 */

/** Clés de stockage partagées avec le provider de `core/theming`. */
export const STORAGE_KEY_THEME = 'ui-kit-theme';
export const STORAGE_KEY_BRAND = 'ui-kit-brand';

/**
 * Script à injecter dans le `<head>`, avant tout rendu, pour poser le mode et
 * la marque mémorisés AVANT la première peinture.
 *
 * Sans lui, une page rendue côté serveur s'affiche en clair puis bascule à
 * l'hydratation : le provider ne s'exécute qu'après.
 *
 * @example
 * ```tsx
 * // app/layout.tsx : composant serveur
 * import { uiThemeBootstrapScript } from '@4sh/ui-kit-react/theme-script';
 *
 * <head>
 *   <script dangerouslySetInnerHTML={{ __html: uiThemeBootstrapScript() }} />
 * </head>
 * ```
 */
export function uiThemeBootstrapScript(): string {
  return (
    `(function(){try{var d=document.documentElement;` +
    `var t=localStorage.getItem('${STORAGE_KEY_THEME}');` +
    `if(t==='dark')d.setAttribute('data-theme','dark');` +
    `var b=localStorage.getItem('${STORAGE_KEY_BRAND}');` +
    `if(b==='brand2'||b==='brand3')d.setAttribute('data-brand',b);}catch(e){}})();`
  );
}
