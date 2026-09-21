import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiButton } from './ui-button';

// `render()` de vitest-browser-react est asynchrone : voir ui-icon.test.tsx.

test('rend un <button> natif par défaut, de type button', async () => {
  const screen = await render(<UiButton label="Valider" />);
  const button = screen.container.querySelector('button')!;

  expect(button).toHaveAttribute('type', 'button');
  expect(button.textContent).toContain('Valider');
  expect(screen.container.querySelector('a')).toBeNull();
});

test('href fait rendre un <a>, avec le rôle bouton', async () => {
  const screen = await render(<UiButton label="Vers la doc" href="/doc" />);
  const link = screen.container.querySelector('a')!;

  expect(link).toHaveAttribute('href', '/doc');
  expect(link).toHaveAttribute('role', 'button');
  expect(screen.container.querySelector('button')).toBeNull();
});

test('target="_blank" pose un rel sûr par défaut', async () => {
  const screen = await render(
    <UiButton label="Externe" href="https://example.org" target="_blank" />,
  );

  expect(screen.container.querySelector('a')).toHaveAttribute('rel', 'noopener noreferrer');
});

test('un lien désactivé perd son href et sort du parcours clavier', async () => {
  const screen = await render(<UiButton label="Lien" href="/doc" disabled />);
  const link = screen.container.querySelector('a')!;

  // Un <a> n'a pas de `disabled` natif : l'état réel passe par ces trois-là.
  expect(link).not.toHaveAttribute('href');
  expect(link).toHaveAttribute('aria-disabled', 'true');
  expect(link).toHaveAttribute('tabindex', '-1');
  expect(link.className).toContain('_disabled');
});

test('le clic est bloqué quand le bouton est désactivé ou en chargement', async () => {
  const onClick = vi.fn();

  const disabledScreen = await render(<UiButton label="A" disabled onClick={onClick} />);
  disabledScreen.container.querySelector('button')!.click();

  const loadingScreen = await render(<UiButton label="B" loading onClick={onClick} />);
  loadingScreen.container.querySelector('button')!.click();

  expect(onClick).not.toHaveBeenCalled();
});

test('le chargement désactive le bouton et l’annonce', async () => {
  const screen = await render(<UiButton label="Enregistrement…" loading />);
  const button = screen.container.querySelector('button')!;

  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button.className).toContain('_loading');
});

test('le mode icône seule est déduit dès le PREMIER rendu', async () => {
  // La version Angular mesurait le contenu projeté dans le DOM après le rendu :
  // le mode était donc faux au premier passage. Ici `children` est une valeur.
  const screen = await render(<UiButton icon="plus" aria-label="Ajouter" />);
  const button = screen.container.querySelector('button')!;

  expect(button.className).toContain('_icon-only');
  expect(button).toHaveAttribute('aria-label', 'Ajouter');
});

test('un contenu projeté empêche la déduction du mode icône seule', async () => {
  const screen = await render(<UiButton icon="star">Texte</UiButton>);

  expect(screen.container.querySelector('button')!.className).not.toContain('_icon-only');
});

test('un contenu projeté vide ne compte pas comme du texte visible', async () => {
  const screen = await render(<UiButton icon="star">{'   '}</UiButton>);

  expect(screen.container.querySelector('button')!.className).toContain('_icon-only');
});

test('en icône seule, le label devient le nom accessible sans être rendu', async () => {
  const screen = await render(<UiButton label="Ajouter" icon="plus" iconOnly />);
  const button = screen.container.querySelector('button')!;

  expect(button).toHaveAttribute('aria-label', 'Ajouter');
  expect(screen.container.querySelector('.ui-button-label')).toBeNull();
});

test('une icône empilée ne bascule jamais en icône seule', async () => {
  const screen = await render(<UiButton icon="download" iconPos="top" />);
  const button = screen.container.querySelector('button')!;

  expect(button.className).toContain('_icon-top');
  expect(button.className).not.toContain('_icon-only');
});

test('les trois axes de couleur composent leurs classes', async () => {
  const screen = await render(
    <UiButton label="X" level="success" variant="outlined" onColor="dark" size="small" />,
  );

  const className = screen.container.querySelector('button')!.className;
  for (const expected of ['_success', '_outlined', '_on-dark', '_small']) {
    expect(className).toContain(expected);
  }
});

test('filled et default n’émettent aucune classe : ce sont les jeux nus', async () => {
  const screen = await render(<UiButton label="X" level="high" variant="filled" size="default" />);

  const className = screen.container.querySelector('button')!.className;
  expect(className).not.toContain('_filled');
  expect(className).not.toContain('_default');
});

test('la classe de l’appelant est conservée, pas remplacée', async () => {
  const screen = await render(<UiButton label="X" className="ma-classe" />);

  const className = screen.container.querySelector('button')!.className;
  expect(className).toContain('ui-button');
  expect(className).toContain('ma-classe');
});

test('rest est transmis à l’élément natif', async () => {
  const screen = await render(<UiButton label="X" name="action" data-testid="mon-bouton" />);
  const button = screen.container.querySelector('button')!;

  // C'est ce qui rend inutile le `buttonProps` de la version Angular.
  expect(button).toHaveAttribute('name', 'action');
  expect(button).toHaveAttribute('data-testid', 'mon-bouton');
});

test('render prend la main sur la racine, avec les props du lien', async () => {
  const screen = await render(
    <UiButton
      label="Routeur"
      // Aucun cast côté consommateur : c'est le contrat de `render`.
      render={(props, children) => (
        <a {...props} href="/route" data-router="true">
          {children}
        </a>
      )}
    />,
  );
  const link = screen.container.querySelector('a')!;

  expect(link).toHaveAttribute('data-router', 'true');
  expect(link).toHaveAttribute('href', '/route');
  expect(link.className).toContain('ui-button');
  expect(link.textContent).toContain('Routeur');
});

test('les couleurs viennent des jetons, pas du CSS du composant', async () => {
  const screen = await render(<UiButton label="X" level="high" />);
  const button = screen.container.querySelector('button')!;

  // Ce que jsdom ne saurait pas faire : la valeur est celle de la cascade
  // réelle, `--actions-high-surface-default` résolu dans le thème actif.
  const background = getComputedStyle(button).backgroundColor;
  expect(background).not.toBe('');
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});
