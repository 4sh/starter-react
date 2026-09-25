import { useDarkMode } from '@storybook-community/storybook-dark-mode';
import type { Preview } from '@storybook/react-vite';
import { addons } from 'storybook/preview-api';

import { DOCS_SCROLL_TO_ANCHOR, type DocsScrollToAnchorPayload } from './addons/text-search/events';
import { brandGlobalTypes, DEFAULT_BRAND, withBrand } from './brand-toolbar';
import { darkTheme, lightTheme } from './myTheme';
import { DEFAULT_RIPPLE, RIPPLE_GLOBAL, withRipple } from './ripple-toolbar';

// La fondation du kit, lue depuis les SOURCES (voir l'alias dans main.ts) :
// jetons générés, couche de base, classes utilitaires. Sans elle les
// composants rendent sans style, exactement comme chez un consommateur qui
// oublierait `@4sh/ui-kit-react/styles.css`.
import '../packages/ui-kit-react/src/styles/index.scss';

// La police d'icônes de la famille intégrée. Elle appartient au projet, pas au
// kit : `ui-icon` ne fait que produire les classes `fa-*`.
import '@fortawesome/fontawesome-free/css/all.min.css';

const syncTheme = (isDark: boolean) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
};

const channel = addons.getChannel();
channel.on('DARK_MODE', (isDark: boolean) => {
  setTimeout(() => syncTheme(isDark), 0);
});

/**
 * Défilement jusqu'à une section, demandé par la recherche plein texte
 * (`storybook/addons/text-search`). Le manager ne peut pas faire défiler cette
 * iframe (le hash de son URL ne s'y propage pas), il envoie donc l'ancre ici.
 *
 * `selectStory()` et l'arrivée du message se courent après : le rendu de la
 * page de doc n'est pas terminé quand l'ancre arrive. D'où les tentatives
 * bornées, en `setTimeout` et non en `requestAnimationFrame`, qui ne tire
 * jamais dans un onglet en arrière-plan.
 */
const scrollToAnchor = (anchor: string, attempt = 0): void => {
  const target = document.getElementById(anchor);
  if (target) {
    target.scrollIntoView({ block: 'start' });
    return;
  }
  if (attempt < 40) setTimeout(() => scrollToAnchor(anchor, attempt + 1), 50);
};

channel.on(DOCS_SCROLL_TO_ANCHOR, ({ anchor }: DocsScrollToAnchorPayload) =>
  scrollToAnchor(anchor),
);

const preview: Preview = {
  initialGlobals: { brand: DEFAULT_BRAND, [RIPPLE_GLOBAL]: DEFAULT_RIPPLE },
  globalTypes: brandGlobalTypes,

  // Les trois axes de jetons sont posés sur <html> et non sur un conteneur de
  // story : les sémantiques référencent les primitives par `var(--primitives-*)`,
  // résolues sur l'élément qui les consomme. L'attribut doit donc dominer tout
  // le rendu, overlays inclus, que Storybook monte sur <body>.
  decorators: [
    withBrand,
    withRipple,
    // L'addon ne pose aucun global : son état vit dans son propre stockage, que
    // seul `useDarkMode()` lit. Chaque rendu de story réaligne donc sur lui.
    (Story) => {
      syncTheme(useDarkMode());
      return Story();
    },
  ],

  parameters: {
    layout: 'centered',
    docs: {
      story: { inline: true },
      toc: {
        title: 'Sur cette page',
        // Seuls les titres markdown portent un `id`. Un `<h2>` écrit en JSX
        // n'en a pas, donc il reste hors du sommaire : volontairement, sinon
        // tocbot produirait un lien mort.
        headingSelector: 'h2[id], h3[id]',
      },
    },
    darkMode: {
      dark: darkTheme,
      light: lightTheme,
      stylePreview: true,
      classTarget: 'html',
      darkClass: 'dark-mode',
      lightClass: 'light-mode',
    },
    backgrounds: { disable: true },
    a11y: { test: 'error' },
  },
};

export default preview;
