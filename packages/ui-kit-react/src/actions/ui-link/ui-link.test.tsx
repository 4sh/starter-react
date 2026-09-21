import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiLink } from './ui-link';

test('rend une ancre avec son href et son libellé', async () => {
  const screen = await render(<UiLink label="Documentation" href="/docs" />);

  await expect
    .element(screen.getByRole('link', { name: 'Documentation' }))
    .toHaveAttribute('href', '/docs');
});

test('external pose la cible et le rel qui protège la page d’origine', async () => {
  const screen = await render(<UiLink label="4SH" href="https://www.4sh.fr" external />);
  const link = screen.container.querySelector('a')!;

  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('un rel explicite gagne sur le défaut', async () => {
  const screen = await render(<UiLink label="4SH" href="https://www.4sh.fr" external rel="me" />);

  expect(screen.container.querySelector('a')).toHaveAttribute('rel', 'me');
});

// Une ancre n'a pas de `disabled` natif : c'est le retrait du href qui la sort
// vraiment du parcours, le reste ne fait que le dire.
test('désactivé, le lien perd son href et sort du parcours clavier', async () => {
  const screen = await render(<UiLink label="Documentation" href="/docs" disabled />);
  const link = screen.container.querySelector('a')!;

  expect(link).not.toHaveAttribute('href');
  expect(link).toHaveAttribute('tabindex', '-1');
  expect(link).toHaveAttribute('aria-disabled', 'true');
});

// Deux lignes de défense, testées séparément. Le CSS coupe le pointeur, donc un
// vrai clic n'atteint jamais le lien : Playwright attendrait 15 s qu'il devienne
// cliquable. Le garde JS, lui, se teste avec un événement synthétique, qui passe
// outre `pointer-events`.
test('désactivé, le lien ne reçoit plus le pointeur', async () => {
  const screen = await render(<UiLink label="Documentation" href="/docs" disabled />);

  expect(getComputedStyle(screen.container.querySelector('.ui-link')!).pointerEvents).toBe('none');
});

test('désactivé, le clic qui passe outre n’est pas transmis', async () => {
  const onClick = vi.fn();
  const screen = await render(
    <UiLink label="Documentation" href="/docs" disabled onClick={onClick} />,
  );

  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  screen.container.querySelector('.ui-link')!.dispatchEvent(event);

  expect(onClick).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(true);
});

test('actif, le clic est transmis', async () => {
  const onClick = vi.fn();
  const screen = await render(<UiLink label="Documentation" href="#ancre" onClick={onClick} />);

  await screen.getByRole('link').click();
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('en icône seule, aria-label porte le sens', async () => {
  const screen = await render(<UiLink iconLeft="circle-info" aria-label="Informations" href="#" />);

  await expect.element(screen.getByRole('link', { name: 'Informations' })).toBeInTheDocument();
  expect(screen.container.querySelector('.ui-link')).toHaveClass('_icon-only');
});

test('un contenu projeté empêche le mode icône seule', async () => {
  const screen = await render(
    <UiLink iconLeft="circle-info" href="#">
      Détails
    </UiLink>,
  );

  expect(screen.container.querySelector('.ui-link')).not.toHaveClass('_icon-only');
});

test('render reçoit les props que le lien aurait posées', async () => {
  const screen = await render(
    <UiLink
      label="Fiche"
      render={(props, children) => (
        <a {...props} href="/fiche/12" data-router="oui">
          {children}
        </a>
      )}
    />,
  );
  const link = screen.container.querySelector('a')!;

  expect(link).toHaveAttribute('data-router', 'oui');
  expect(link).toHaveAttribute('href', '/fiche/12');
  expect(link.className).toContain('ui-link');
});

test('la classe du consommateur s’ajoute sans remplacer celle du kit', async () => {
  const screen = await render(<UiLink label="Doc" href="#" className="ma-classe" />);
  const link = screen.container.querySelector('a')!;

  expect(link).toHaveClass('ui-link', 'ma-classe');
});
