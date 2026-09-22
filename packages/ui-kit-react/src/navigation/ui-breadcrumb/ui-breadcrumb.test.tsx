import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiBreadcrumb, type UiBreadcrumbItem } from './ui-breadcrumb';

const ITEMS: UiBreadcrumbItem[] = [
  { icon: 'house', ariaLabel: 'Accueil', url: '#accueil' },
  { label: 'Électronique', url: '#electronique' },
  { label: 'Ordinateurs', url: '#ordinateurs' },
  { label: 'Accessoires' },
];

const crumbs = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-breadcrumb-item'),
];
const separators = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-breadcrumb-separator'),
];

test('le fil est un repère nommé, avec une liste ordonnée', async () => {
  const screen = await render(<UiBreadcrumb items={ITEMS} />);
  const nav = screen.container.querySelector('nav')!;

  expect(nav).toHaveClass('ui-breadcrumb');
  expect(nav).toHaveAttribute('aria-label', "Fil d'Ariane");
  expect(nav.querySelector('ol')).not.toBeNull();
  expect(crumbs(screen.container)).toHaveLength(4);
});

test('le nom du repère se surcharge', async () => {
  const screen = await render(<UiBreadcrumb items={ITEMS} aria-label="Vous êtes ici" />);

  expect(screen.container.querySelector('nav')).toHaveAttribute('aria-label', 'Vous êtes ici');
});

// Le dernier maillon EST la page courante : c'est la seule chose qui distingue
// un fil d'Ariane d'une liste de liens.
test('le dernier maillon est la page courante', async () => {
  const screen = await render(<UiBreadcrumb items={ITEMS} />);
  const derniers = crumbs(screen.container).at(-1)!;

  expect(derniers.querySelector('[aria-current="page"]')).not.toBeNull();
  expect(derniers.querySelector('.ui-breadcrumb-text')).toHaveClass('_current');
  expect(screen.container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
});

test('il y a un séparateur entre deux maillons, jamais au bout', async () => {
  const screen = await render(<UiBreadcrumb items={ITEMS} />);

  expect(separators(screen.container)).toHaveLength(3);
  expect(separators(screen.container)[0]).toHaveAttribute('aria-hidden', 'true');
  expect(separators(screen.container)[0]).toHaveTextContent('/');
});

test('le séparateur accepte n’importe quel nœud', async () => {
  const screen = await render(
    <UiBreadcrumb items={ITEMS} separator={<span data-fleche="">→</span>} />,
  );

  expect(separators(screen.container)[0]!.querySelector('[data-fleche]')).not.toBeNull();
});

// Chaque maillon rend l'élément natif de sa sémantique : c'est la promesse du
// composant, et c'est ce qui rend l'ancre pilotable de bout en bout.
test('une destination fait une ancre, une commande seule fait un bouton', async () => {
  const onItemClick = vi.fn();
  const command = vi.fn();
  const screen = await render(
    <UiBreadcrumb
      items={[
        { label: 'Lien', url: '#quelque-part' },
        { label: 'Action', command },
        { label: 'Courante' },
      ]}
      onItemClick={onItemClick}
    />,
  );
  const all = crumbs(screen.container);

  expect(all[0]!.querySelector('a')).toHaveAttribute('href', '#quelque-part');
  expect(all[1]!.querySelector('button')).toHaveAttribute('type', 'button');
  expect(all[2]!.querySelector('a, button')).toBeNull();
  expect(all[2]!.querySelector('.ui-breadcrumb-text')).not.toBeNull();

  await screen.getByRole('button', { name: 'Action' }).click();

  await expect.poll(() => command.mock.calls.length).toBe(1);
  expect(command).toHaveBeenCalledWith(expect.objectContaining({ item: expect.anything() }));
  expect(onItemClick).toHaveBeenCalledOnce();
});

// Ouvrir un autre contexte sans `rel` expose la page appelante par
// `window.opener` : le défaut sûr est posé par le composant.
test('une cible _blank reçoit un rel sûr, qui reste surchargeable', async () => {
  const screen = await render(
    <UiBreadcrumb
      items={[
        { label: 'Externe', url: 'https://example.com', target: '_blank' },
        { label: 'Choisi', url: 'https://example.com', target: '_blank', rel: 'nofollow' },
        { label: 'Courante' },
      ]}
    />,
  );
  const liens = screen.container.querySelectorAll('a');

  expect(liens[0]).toHaveAttribute('rel', 'noopener noreferrer');
  expect(liens[1]).toHaveAttribute('rel', 'nofollow');
});

// Seule une classe disait qu'un maillon était désactivé : une technologie
// d'assistance n'avait aucun moyen de le savoir.
test('un maillon désactivé l’annonce, et n’est plus une ancre', async () => {
  const onItemClick = vi.fn();
  const screen = await render(
    <UiBreadcrumb
      items={[{ label: 'Archivé', url: '#ailleurs', disabled: true }, { label: 'Courante' }]}
      onItemClick={onItemClick}
    />,
  );
  const desactive = crumbs(screen.container)[0]!.querySelector('.ui-breadcrumb-text')!;

  expect(crumbs(screen.container)[0]!.querySelector('a')).toBeNull();
  expect(desactive).toHaveAttribute('role', 'link');
  expect(desactive).toHaveAttribute('aria-disabled', 'true');
  expect(desactive).toHaveClass('_disabled');
});

test('un maillon masqué ne compte plus, séparateurs compris', async () => {
  const screen = await render(
    <UiBreadcrumb
      items={[
        { label: 'Un', url: '#' },
        { label: 'Caché', url: '#', visible: false },
        { label: 'Courante' },
      ]}
    />,
  );

  expect(crumbs(screen.container)).toHaveLength(2);
  expect(separators(screen.container)).toHaveLength(1);
  expect(screen.container.textContent).not.toContain('Caché');
});

test('la classe d’un maillon rejoint celle du li', async () => {
  const screen = await render(
    <UiBreadcrumb items={[{ label: 'Un', url: '#', className: '_maison' }, { label: 'Deux' }]} />,
  );

  expect(crumbs(screen.container)[0]).toHaveClass('ui-breadcrumb-item', '_maison');
});

// --- Débordement -----------------------------------------------------------
const LONG: UiBreadcrumbItem[] = [
  { label: 'Un', url: '#1' },
  { label: 'Deux', url: '#2' },
  { label: 'Trois', url: '#3' },
  { label: 'Quatre', url: '#4' },
  { label: 'Cinq' },
];

test('au-delà de maxItems, le milieu se replie derrière un bouton', async () => {
  const screen = await render(<UiBreadcrumb items={LONG} maxItems={3} />);

  // Le premier, les points, puis les deux derniers.
  expect(crumbs(screen.container)).toHaveLength(4);
  expect(screen.container.textContent).toContain('Un');
  expect(screen.container.textContent).not.toContain('Deux');
  expect(screen.container.textContent).toContain('Quatre');
  expect(screen.container.textContent).toContain('Cinq');
  expect(screen.getByRole('button', { name: 'Afficher les éléments masqués' })).toBeDefined();
});

test('maxItems ne descend jamais en dessous de deux', async () => {
  const screen = await render(<UiBreadcrumb items={LONG} maxItems={0} />);

  // Le premier, les points, et le dernier.
  expect(crumbs(screen.container)).toHaveLength(3);
});

test('sous le seuil, rien ne se replie', async () => {
  const screen = await render(<UiBreadcrumb items={LONG} maxItems={9} />);

  expect(crumbs(screen.container)).toHaveLength(5);
  expect(screen.container.querySelector('.ui-breadcrumb-ellipsis')).toBeNull();
});

// Le bouton qui portait le focus disparaît en dépliant : sans reprise, le focus
// retombe sur le corps du document et la place est perdue.
test('déplier révèle tout, et amène le focus sur le premier maillon révélé', async () => {
  const screen = await render(<UiBreadcrumb items={LONG} maxItems={3} />);

  await screen.getByRole('button', { name: 'Afficher les éléments masqués' }).click();

  await expect.poll(() => crumbs(screen.container)).toHaveLength(5);
  expect(screen.container.querySelector('.ui-breadcrumb-ellipsis')).toBeNull();
  await expect
    .poll(() => (document.activeElement as HTMLAnchorElement | null)?.textContent)
    .toBe('Deux');
});

// Les maillons masqués ne sont plus les mêmes : l'état d'avant ne veut plus
// rien dire.
test('changer le modèle referme le dépliage', async () => {
  function Host() {
    const [items, setItems] = useState(LONG);
    return (
      <>
        <button type="button" onClick={() => setItems(LONG.slice(0, 4))}>
          Changer
        </button>
        <UiBreadcrumb items={items} maxItems={2} />
      </>
    );
  }
  const screen = await render(<Host />);

  await screen.getByRole('button', { name: 'Afficher les éléments masqués' }).click();
  await expect.poll(() => screen.container.querySelector('.ui-breadcrumb-ellipsis')).toBeNull();

  await screen.getByRole('button', { name: 'Changer' }).click();

  await expect.poll(() => screen.container.querySelector('.ui-breadcrumb-ellipsis')).not.toBeNull();
});

// --- Points d'extension ----------------------------------------------------
test('render reverse les props du maillon sur le lien du projet', async () => {
  const onItemClick = vi.fn();
  const screen = await render(
    <UiBreadcrumb
      items={[
        {
          label: 'Route',
          render: (props, children) => (
            <a {...props} href="#route" data-route="/route">
              {children}
            </a>
          ),
        },
        { label: 'Courante' },
      ]}
      onItemClick={onItemClick}
    />,
  );
  const lien = screen.container.querySelector<HTMLAnchorElement>('[data-route]')!;

  expect(lien).toHaveClass('ui-breadcrumb-link');
  expect(lien).toHaveTextContent('Route');

  await screen.getByRole('link', { name: 'Route' }).click();

  await expect.poll(() => onItemClick.mock.calls.length).toBe(1);
});

test('renderItem remplace le contenu du maillon', async () => {
  const screen = await render(
    <UiBreadcrumb
      items={ITEMS}
      renderItem={(item, { last }) => <span data-maison={last ? 'fin' : 'lien'}>{item.label}</span>}
    />,
  );

  expect(screen.container.querySelectorAll('[data-maison]')).toHaveLength(4);
  expect(screen.container.querySelector('[data-maison="fin"]')).toHaveTextContent('Accessoires');
  expect(screen.container.querySelector('a')).toBeNull();
});

test('un maillon d’icône porte son nom accessible', async () => {
  const screen = await render(<UiBreadcrumb items={ITEMS} />);

  expect(screen.getByRole('link', { name: 'Accueil' })).toBeDefined();
});

test('la densité small pose son modifieur', async () => {
  const screen = await render(<UiBreadcrumb items={ITEMS} size="small" />);

  expect(screen.container.querySelector('nav')).toHaveClass('_small');
});
