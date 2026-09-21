import { UiIcon } from '@4sh/ui-kit-react/ui-icon';
import { useUiBrand, useUiTheme } from '@4sh/ui-kit-react/theming';

/**
 * Démonstration minimale : elle existe pour vérifier que le kit se consomme
 * réellement hors de Storybook (thème, marque, jetons, icônes). La doc de
 * référence reste Storybook.
 */
export function App() {
  const { theme, toggleTheme } = useUiTheme();
  const { brand, setBrand } = useUiBrand();

  return (
    <main className="demo-shell">
      <h1>
        <UiIcon name="cube" size="lg" /> Starter React
      </h1>

      <p>
        Mode <strong>{theme}</strong>, marque <strong>{brand}</strong>. Les deux sont posés sur
        <code> &lt;html&gt; </code> par <code>UiThemeProvider</code>, comme les jetons générés
        l&apos;attendent.
      </p>

      <div className="demo-row">
        <button type="button" onClick={toggleTheme}>
          <UiIcon name={theme === 'dark' ? 'sun' : 'moon'} /> Basculer le mode
        </button>

        {(['brand1', 'brand2', 'brand3'] as const).map((id) => (
          <button type="button" key={id} onClick={() => setBrand(id)} aria-pressed={brand === id}>
            {id}
          </button>
        ))}
      </div>
    </main>
  );
}
