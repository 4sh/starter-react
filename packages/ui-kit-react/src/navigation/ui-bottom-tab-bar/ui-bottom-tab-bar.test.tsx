import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiBottomTab,
  UiBottomTabAction,
  UiBottomTabBar,
  type UiBottomTabBarProps,
  type UiBottomTabValue,
} from './ui-bottom-tab-bar';

function Host(props: Partial<UiBottomTabBarProps>) {
  return (
    <UiBottomTabBar defaultValue="home" contained {...props}>
      <UiBottomTab value="home" icon="house" label="Accueil" />
      <UiBottomTab value="search" icon="magnifying-glass" label="Recherche" />
      <UiBottomTab value="settings" icon="gear" label="Réglages" />
    </UiBottomTabBar>
  );
}

const bar = (container: HTMLElement) => container.querySelector<HTMLElement>('.ui-bottom-tab-bar')!;
const tabs = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-bottom-tab'),
];

const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

// --- La barre --------------------------------------------------------------
test('la barre est un repère de navigation nommé', async () => {
  const screen = await render(<Host />);

  expect(bar(screen.container).tagName).toBe('NAV');
  expect(bar(screen.container)).toHaveAttribute('aria-label', 'Navigation principale');
  expect(tabs(screen.container)).toHaveLength(3);
});

test('le nom du repère se surcharge', async () => {
  const screen = await render(<Host aria-label="Sections" />);

  expect(bar(screen.container)).toHaveAttribute('aria-label', 'Sections');
});

// C'est `aria-current` et non `role="tab"` : un onglet de navigation n'a pas de
// panneau associé, et le rôle en exigerait un.
test('la destination courante s’annonce par aria-current', async () => {
  const screen = await render(<Host />);

  expect(tabs(screen.container)[0]).toHaveAttribute('aria-current', 'page');
  expect(tabs(screen.container)[0]).toHaveClass('_active');
  expect(screen.container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  expect(screen.container.querySelector('[role="tab"]')).toBeNull();
});

test('cliquer une destination la rend courante', async () => {
  const onValueChange = vi.fn();
  const onTabChange = vi.fn();
  const screen = await render(<Host onValueChange={onValueChange} onTabChange={onTabChange} />);

  await screen.getByRole('button', { name: 'Recherche' }).click();

  await expect.poll(() => tabs(screen.container)[1]!.getAttribute('aria-current')).toBe('page');
  expect(tabs(screen.container)[0]).not.toHaveAttribute('aria-current');
  expect(onValueChange).toHaveBeenLastCalledWith('search');
  expect(onTabChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'search' }));
});

test('recliquer la destination courante ne notifie rien', async () => {
  const onTabChange = vi.fn();
  const screen = await render(<Host onTabChange={onTabChange} />);

  await screen.getByRole('button', { name: 'Accueil' }).click();
  await new Promise((r) => setTimeout(r, 30));

  expect(onTabChange).not.toHaveBeenCalled();
});

test('en mode contrôlé, la destination appartient à l’appelant', async () => {
  function Controlled() {
    const [route, setRoute] = useState<UiBottomTabValue>('home');
    return (
      <>
        <button type="button" onClick={() => setRoute('settings')}>
          Aller aux réglages
        </button>
        <Host value={route} />
      </>
    );
  }
  const screen = await render(<Controlled />);

  await screen.getByRole('button', { name: 'Recherche' }).click();
  await new Promise((r) => setTimeout(r, 30));
  expect(tabs(screen.container)[0]).toHaveAttribute('aria-current', 'page');

  await screen.getByRole('button', { name: 'Aller aux réglages' }).click();
  await expect.poll(() => tabs(screen.container)[2]!.getAttribute('aria-current')).toBe('page');
});

// --- Un onglet -------------------------------------------------------------
test('sans destination, l’onglet est un bouton natif', async () => {
  const screen = await render(<Host />);

  expect(tabs(screen.container)[0]!.tagName).toBe('BUTTON');
  expect(tabs(screen.container)[0]).toHaveAttribute('type', 'button');
});

// Une ancre garde le clic milieu et « ouvrir dans un nouvel onglet », ce qu'un
// bouton ne sait pas faire.
test('avec une destination, l’onglet est une ancre', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab value="home" icon="house" label="Accueil" />
      <UiBottomTab value="docs" icon="book" label="Docs" href="#docs" target="_blank" />
    </UiBottomTabBar>,
  );
  const lien = tabs(screen.container)[1]!;

  expect(lien.tagName).toBe('A');
  expect(lien).toHaveAttribute('href', '#docs');
  expect(lien).toHaveAttribute('rel', 'noopener noreferrer');
});

// Une ancre n'a pas de `disabled` natif : elle doit sortir du parcours et perdre
// sa destination, sinon elle reste cliquable.
test('un onglet désactivé sort du parcours, ancre comprise', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab value="home" icon="house" label="Accueil" />
      <UiBottomTab value="off" icon="ban" label="Bouton" disabled />
      <UiBottomTab value="link" icon="book" label="Lien" href="#ailleurs" disabled />
    </UiBottomTabBar>,
  );
  const [, bouton, lien] = tabs(screen.container);

  expect(bouton).toBeDisabled();
  expect(lien).toHaveAttribute('aria-disabled', 'true');
  expect(lien).not.toHaveAttribute('href');
  expect(lien!.tabIndex).toBe(-1);
});

test('render branche le lien du projet', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab
        value="home"
        icon="house"
        label="Accueil"
        render={(props, children) => (
          <a {...props} href="#accueil" data-route="/">
            {children}
          </a>
        )}
      />
    </UiBottomTabBar>,
  );

  const lien = screen.container.querySelector<HTMLElement>('[data-route]')!;
  expect(lien).toHaveClass('ui-bottom-tab', '_active');
  expect(lien).toHaveAttribute('aria-current', 'page');
});

test('l’icône change à l’activation', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="fav">
      <UiBottomTab value="home" icon="heart" iconType="outline" activeIcon="star" label="Accueil" />
      <UiBottomTab value="fav" icon="heart" iconType="outline" activeIcon="star" label="Favoris" />
    </UiBottomTabBar>,
  );

  expect(tabs(screen.container)[0]!.querySelector('.ui-icon')).toHaveClass('fa-heart');
  expect(tabs(screen.container)[1]!.querySelector('.ui-icon')).toHaveClass('fa-star');
});

test('showLabels=false masque les libellés mais les garde comme nom', async () => {
  const screen = await render(<Host showLabels={false} />);

  expect(screen.container.querySelector('.ui-bottom-tab-label')).toBeNull();
  expect(tabs(screen.container)[0]).toHaveAttribute('aria-label', 'Accueil');
  expect(tabs(screen.container)[0]).toHaveClass('_no-label');
  expect(screen.getByRole('button', { name: 'Accueil' })).toBeDefined();
});

// Un libellé visible nomme déjà le contrôle : y ajouter un `aria-label`
// REMPLACERAIT ce nom au lieu de l'enrichir.
test('un libellé visible ne double pas le nom accessible', async () => {
  const screen = await render(<Host />);

  expect(tabs(screen.container)[0]).not.toHaveAttribute('aria-label');
});

// L'ornement se pose sur l'icône, et ne doit jamais intercepter une frappe.
test('l’ornement projeté ne prend pas le pointeur', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab value="home" icon="envelope" label="Messages">
        <span data-badge="">3</span>
      </UiBottomTab>
    </UiBottomTabBar>,
  );
  const ornement = screen.container.querySelector<HTMLElement>('.ui-bottom-tab-adornment')!;

  expect(ornement.querySelector('[data-badge]')).not.toBeNull();
  expect(getComputedStyle(ornement).pointerEvents).toBe('none');
});

// --- L'action surélevée ----------------------------------------------------
test('l’action est un bouton nommé, jamais une destination', async () => {
  const onClick = vi.fn();
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab value="home" icon="house" label="Accueil" />
      <UiBottomTabAction aria-label="Nouveau message" onClick={onClick} />
      <UiBottomTab value="settings" icon="gear" label="Réglages" />
    </UiBottomTabBar>,
  );
  const action = screen.container.querySelector<HTMLElement>('.ui-bottom-tab-action')!;

  expect(action.tagName).toBe('BUTTON');
  expect(action).toHaveAttribute('aria-label', 'Nouveau message');
  expect(action).not.toHaveAttribute('aria-current');

  await screen.getByRole('button', { name: 'Nouveau message' }).click();
  expect(onClick).toHaveBeenCalledOnce();
});

// Soulevée par une transformation et non par une marge : la hauteur de la barre
// reste exactement celle que ses items demandent.
test('l’action est soulevée sans changer la hauteur de la barre', async () => {
  const sans = await render(<Host />);
  const avec = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab value="home" icon="house" label="Accueil" />
      <UiBottomTabAction aria-label="Nouveau" />
      <UiBottomTab value="settings" icon="gear" label="Réglages" />
    </UiBottomTabBar>,
  );
  const action = avec.container.querySelector<HTMLElement>('.ui-bottom-tab-action')!;

  expect(getComputedStyle(action).transform).not.toBe('none');
  expect(Math.round(bar(avec.container).getBoundingClientRect().height)).toBe(
    Math.round(bar(sans.container).getBoundingClientRect().height),
  );
});

test('le niveau de l’action pose son modifieur', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTabAction aria-label="Nouveau" level="success" />
    </UiBottomTabBar>,
  );

  expect(screen.container.querySelector('.ui-bottom-tab-action')).toHaveClass('_success');
});

// --- Clavier ---------------------------------------------------------------
// Additif, et non un focus glissant : chaque contrôle garde sa place dans
// l'ordre de tabulation, ce qu'un repère de navigation doit à ses utilisateurs.
test('les flèches parcourent les contrôles, en bouclant', async () => {
  const screen = await render(<Host />);
  const all = tabs(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(all[1]);

  touche(all[1]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[0]);

  touche(all[0]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[2]);
});

test('aucun contrôle n’est retiré de l’ordre de tabulation', async () => {
  const screen = await render(<Host />);

  for (const tab of tabs(screen.container)) expect(tab.tabIndex).toBe(0);
});

test('Début et Fin vont au premier et au dernier contrôle', async () => {
  const screen = await render(<Host />);
  const all = tabs(screen.container);

  all[1]!.focus();
  touche(all[1]!, 'End');
  await expect.poll(() => document.activeElement).toBe(all[2]);

  touche(all[2]!, 'Home');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

test('les flèches sautent un onglet désactivé', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab value="home" icon="house" label="Accueil" />
      <UiBottomTab value="off" icon="ban" label="Archivé" disabled />
      <UiBottomTab value="settings" icon="gear" label="Réglages" />
    </UiBottomTabBar>,
  );
  const all = tabs(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowRight');

  await expect.poll(() => document.activeElement).toBe(all[2]);
});

// La barre mélange deux types d'enfants : les flèches doivent voir les deux.
test('les flèches atteignent aussi l’action surélevée', async () => {
  const screen = await render(
    <UiBottomTabBar contained defaultValue="home">
      <UiBottomTab value="home" icon="house" label="Accueil" />
      <UiBottomTabAction aria-label="Nouveau" />
      <UiBottomTab value="settings" icon="gear" label="Réglages" />
    </UiBottomTabBar>,
  );
  const premier = tabs(screen.container)[0]!;
  const action = screen.container.querySelector<HTMLElement>('.ui-bottom-tab-action')!;

  premier.focus();
  touche(premier, 'ArrowRight');

  await expect.poll(() => document.activeElement).toBe(action);
});

// --- Mise en page ----------------------------------------------------------
test('contained pose la barre dans son ancêtre, sinon dans la fenêtre', async () => {
  const dedans = await render(<Host contained />);
  const fenetre = await render(<Host contained={false} />);

  expect(getComputedStyle(bar(dedans.container)).position).toBe('absolute');
  expect(bar(dedans.container)).toHaveClass('_contained');
  expect(getComputedStyle(bar(fenetre.container)).position).toBe('fixed');
});

test('safeArea=false retire la réserve système', async () => {
  const screen = await render(<Host safeArea={false} />);

  expect(bar(screen.container)).toHaveClass('_no-safe-area');
  expect(getComputedStyle(bar(screen.container)).paddingBottom).toBe('0px');
});

// Les items se partagent la rangée : c'est ce qui garde la barre équilibrée
// quel que soit le nombre de destinations.
test('les onglets se partagent la largeur de la rangée', async () => {
  const screen = await render(<Host />);
  const largeurs = tabs(screen.container).map((t) => Math.round(t.getBoundingClientRect().width));

  expect(new Set(largeurs).size).toBe(1);
});

test('hors d’une barre, l’onglet le dit', async () => {
  await expect(render(<UiBottomTab value="seul" icon="house" label="Seul" />)).rejects.toThrow(
    /UiBottomTabBar/,
  );
});
