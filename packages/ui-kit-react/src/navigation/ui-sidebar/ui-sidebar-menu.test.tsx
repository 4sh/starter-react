import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiSidebarMenu, type UiSidebarMenuItem, type UiSidebarMenuProps } from './ui-sidebar-menu';

function Menu(props: Partial<UiSidebarMenuProps>) {
  return <UiSidebarMenu aria-label="Sections" {...props} />;
}

const actions = (root: ParentNode) => [
  ...root.querySelectorAll<HTMLElement>('.ui-sidebar-menu-action'),
];

test('un <nav> nommé enveloppe des listes explicites', async () => {
  const screen = await render(<Menu items={[{ label: 'Accueil' }, { label: 'Projets' }]} />);
  const nav = screen.container.querySelector('nav.ui-sidebar-menu')!;

  expect(nav).toHaveAttribute('aria-label', 'Sections');
  expect(nav).toHaveClass('_high');
  expect(nav.querySelector('ul.ui-sidebar-menu-list')).toHaveAttribute('role', 'list');
  expect(actions(screen.container).map((a) => a.textContent)).toEqual(['Accueil', 'Projets']);
});

test('une entrée sans destination est un bouton, courante par aria-current', async () => {
  const screen = await render(
    <Menu items={[{ label: 'Accueil', active: true }, { label: 'Projets' }]} />,
  );
  const [accueil, projets] = actions(screen.container);

  expect(accueil!.tagName).toBe('BUTTON');
  expect(accueil).toHaveClass('_active');
  expect(accueil).toHaveAttribute('aria-current', 'true');
  expect(projets).not.toHaveAttribute('aria-current');
});

test("une URL fait une ancre ; target _blank ajoute rel et l'icône « ailleurs »", async () => {
  const screen = await render(
    <Menu
      items={[
        { label: 'Docs', url: '/docs', active: true },
        { label: 'Statut', url: 'https://status.example.org', target: '_blank' },
      ]}
    />,
  );
  const [docs, statut] = actions(screen.container);

  expect(docs!.tagName).toBe('A');
  expect(docs).toHaveAttribute('href', '/docs');
  expect(docs).toHaveAttribute('aria-current', 'page');
  expect(statut).toHaveAttribute('rel', 'noopener noreferrer');
  expect(statut!.querySelector('.ui-sidebar-menu-external')).not.toBeNull();
  expect(docs!.querySelector('.ui-sidebar-menu-external')).toBeNull();
});

test('command et onItemClick reçoivent l’entrée ; désactivée, rien ne part', async () => {
  const command = vi.fn();
  const onItemClick = vi.fn();
  const items: UiSidebarMenuItem[] = [
    { label: 'Exporter', command },
    { label: 'Supprimer', disabled: true, command },
  ];
  const screen = await render(<Menu items={items} onItemClick={onItemClick} />);

  await screen.getByRole('button', { name: 'Exporter' }).click();

  expect(command).toHaveBeenCalledTimes(1);
  expect(command.mock.calls[0]![0].item).toBe(items[0]);
  expect(onItemClick.mock.calls[0]![0].item).toBe(items[0]);
  await expect.element(screen.getByRole('button', { name: 'Supprimer' })).toBeDisabled();
});

test('render branche le lien d’un routeur avec les props de l’action', async () => {
  const onItemClick = vi.fn();
  const screen = await render(
    <Menu
      onItemClick={onItemClick}
      items={[
        {
          label: 'Facturation',
          icon: 'credit-card',
          active: true,
          render: (props, children) => (
            <a {...props} href="/facturation" data-routeur="oui">
              {children}
            </a>
          ),
        },
      ]}
    />,
  );
  const link = screen.container.querySelector<HTMLAnchorElement>('a[data-routeur]')!;

  expect(link).toHaveClass('ui-sidebar-menu-action', '_active');
  expect(link).toHaveAttribute('aria-current', 'page');
  expect(link.querySelector('.ui-sidebar-menu-label')).toHaveTextContent('Facturation');

  link.addEventListener('click', (e) => e.preventDefault());
  await screen.getByRole('link', { name: 'Facturation' }).click();
  expect(onItemClick).toHaveBeenCalledTimes(1);
});

test('une section se nomme par son en-tête, sans collision entre deux menus', async () => {
  const items: UiSidebarMenuItem[] = [{ label: 'Gestion', items: [{ label: 'Équipe' }] }];
  const screen = await render(
    <>
      <Menu items={items} aria-label="Premier" />
      <Menu items={items} aria-label="Second" />
    </>,
  );
  const headers = [...screen.container.querySelectorAll('.ui-sidebar-menu-section-header')];
  const subs = [...screen.container.querySelectorAll('.ui-sidebar-menu-section > ul')];

  expect(headers).toHaveLength(2);
  expect(headers[0]!.id).not.toBe(headers[1]!.id);
  expect(subs[0]).toHaveAttribute('aria-labelledby', headers[0]!.id);
  expect(subs[1]).toHaveAttribute('aria-labelledby', headers[1]!.id);
  expect(subs[0]).toHaveAttribute('role', 'list');
  // Une section n'est pas repliable au premier niveau.
  expect(screen.container.querySelector('._toggle')).toBeNull();
});

test('un groupe se déplie et se replie, et son contenu fermé est inerte', async () => {
  const onExpandedKeysChange = vi.fn();
  const screen = await render(
    <Menu
      onExpandedKeysChange={onExpandedKeysChange}
      items={[
        { id: 'catalogue', label: 'Catalogue', toggleable: true, items: [{ label: 'Produits' }] },
      ]}
    />,
  );
  const toggle = screen.getByRole('button', { name: 'Catalogue' });
  const region = () => screen.container.querySelector<HTMLElement>('.ui-sidebar-menu-collapse')!;

  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect.element(toggle).toHaveAttribute('aria-controls', region().id);
  expect(region().inert).toBe(true);

  await toggle.click();

  await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(region().inert).toBe(false);
  expect(region()).toHaveClass('_open');
  expect(onExpandedKeysChange).toHaveBeenLastCalledWith(['catalogue']);

  await toggle.click();
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(onExpandedKeysChange).toHaveBeenLastCalledWith([]);
});

test("un groupe qui contient l'entrée courante se déplie d'office, sur plusieurs niveaux", async () => {
  const screen = await render(
    <Menu
      items={[
        {
          label: 'Catalogue',
          toggleable: true,
          items: [
            { label: 'Produits' },
            { label: 'Collections', items: [{ label: 'Promotions', active: true }] },
          ],
        },
        { label: 'Clients', toggleable: true, expanded: true, items: [{ label: 'Comptes' }] },
        { label: 'Stock', toggleable: true, items: [{ label: 'Entrepôts' }] },
      ]}
    />,
  );
  const expanded = (name: string) =>
    screen.getByRole('button', { name, exact: true }).element().getAttribute('aria-expanded');

  expect(expanded('Catalogue')).toBe('true');
  // Imbriqué, un groupe est repliable par défaut.
  expect(expanded('Collections')).toBe('true');
  expect(expanded('Clients')).toBe('true');
  expect(expanded('Stock')).toBe('false');
  expect(screen.container.querySelector('.ui-sidebar-menu-entry._active-within')).not.toBeNull();
});

test('contrôlé, le dépliage suit expandedKeys', async () => {
  const onExpandedKeysChange = vi.fn();
  const screen = await render(
    <Menu
      expandedKeys={[]}
      onExpandedKeysChange={onExpandedKeysChange}
      items={[
        { id: 'g', label: 'Groupe', toggleable: true, items: [{ label: 'Enfant', active: true }] },
      ]}
    />,
  );
  const toggle = screen.getByRole('button', { name: 'Groupe' });

  // Imposé vide, le dépliage d'office ne joue pas.
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  expect(onExpandedKeysChange).toHaveBeenCalledWith(['g']);
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('séparateur, entrée masquée et badge', async () => {
  const screen = await render(
    <Menu
      items={[
        { label: 'Messages', badge: '3', badgeLevel: 'highlight' },
        { separator: true },
        { label: 'Caché', visible: false },
        { label: 'Aide' },
      ]}
    />,
  );

  expect(
    actions(screen.container).map((a) => a.querySelector('.ui-sidebar-menu-label')!.textContent),
  ).toEqual(['Messages', 'Aide']);
  const separator = screen.container.querySelector('li.ui-sidebar-menu-separator')!;
  expect(separator).toHaveAttribute('role', 'separator');
  expect(separator).toHaveAttribute('aria-hidden', 'true');
  expect(screen.container.querySelector('.ui-sidebar-menu-badge')).toHaveTextContent('3');
});

test('replié, chaque icône garde un nom accessible et un title', async () => {
  const screen = await render(
    <Menu
      collapsed
      items={[
        { label: 'Projets', icon: 'folder-open' },
        { label: 'Aide', icon: 'circle-question' },
      ]}
    />,
  );
  const [projets] = actions(screen.container);

  expect(screen.container.querySelector('nav')).toHaveClass('_collapsed');
  expect(projets).toHaveAttribute('aria-label', 'Projets');
  expect(projets).toHaveAttribute('title', 'Projets');
  await expect.element(screen.getByRole('button', { name: 'Projets' })).toBeInTheDocument();
});

test('replié avec tooltips, le libellé passe en info-bulle au lieu du title', async () => {
  const screen = await render(
    <div style={{ width: 80 }}>
      <Menu collapsed tooltips items={[{ label: 'Projets', icon: 'folder-open' }]} />
    </div>,
  );
  const [projets] = actions(screen.container);

  expect(projets).not.toHaveAttribute('title');
  await screen.getByRole('button', { name: 'Projets' }).hover();

  await expect
    .poll(() => document.querySelector('.ui-tooltip:popover-open')?.textContent)
    .toBe('Projets');
});

test('déplié, les tooltips restent coupées', async () => {
  const screen = await render(
    <Menu tooltips items={[{ label: 'Projets', icon: 'folder-open' }]} />,
  );
  const [projets] = actions(screen.container);

  expect(projets).not.toHaveAttribute('aria-label');
  expect(projets).not.toHaveAttribute('title');
  await screen.getByRole('button', { name: 'Projets' }).hover();
  await new Promise((r) => setTimeout(r, 400));

  expect(document.querySelector('.ui-tooltip:popover-open')).toBeNull();
});

test('motion à faux et la taille small posent leurs modificateurs', async () => {
  const screen = await render(
    <Menu motion={false} size="small" level="low" items={[{ label: 'A' }]} />,
  );

  expect(screen.container.querySelector('nav')).toHaveClass('_no-motion', '_small', '_low');
});
