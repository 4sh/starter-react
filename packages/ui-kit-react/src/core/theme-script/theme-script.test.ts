import { afterEach, expect, test } from 'vitest';

import { uiThemeBootstrapScript } from './theme-script';

const root = document.documentElement;

/** Le chemin réel : un `<script>` inséré dans le document s'exécute aussitôt. */
function runScript() {
  const script = document.createElement('script');
  script.textContent = uiThemeBootstrapScript();
  document.head.append(script);
  script.remove();
}

afterEach(() => {
  localStorage.clear();
  root.removeAttribute('data-theme');
  root.removeAttribute('data-brand');
});

test('pose le mode et la marque mémorisés', () => {
  localStorage.setItem('ui-kit-theme', 'dark');
  localStorage.setItem('ui-kit-brand', 'brand3');
  runScript();
  expect(root.getAttribute('data-theme')).toBe('dark');
  expect(root.getAttribute('data-brand')).toBe('brand3');
});

test('ne touche à rien sans préférence, ni pour une valeur inconnue', () => {
  localStorage.setItem('ui-kit-brand', 'brand9');
  runScript();
  expect(root.hasAttribute('data-theme')).toBe(false);
  expect(root.hasAttribute('data-brand')).toBe(false);
});
