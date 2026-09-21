import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { UiThemeProvider } from '@4sh/ui-kit-react/theming';

// La fondation du kit : jetons, couche de base, classes utilitaires. Un seul
// import, et il doit précéder celui des composants : le CSS d'un composant
// n'écrit que des valeurs, mais la couche de base pose la cascade.
import '@4sh/ui-kit-react/styles.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/main.scss';

import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('#root est absent de index.html');

createRoot(container).render(
  <StrictMode>
    <UiThemeProvider>
      <App />
    </UiThemeProvider>
  </StrictMode>,
);
