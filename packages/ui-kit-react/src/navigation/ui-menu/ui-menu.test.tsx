import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiMenu, type UiMenuItem, type UiMenuProps } from './ui-menu';

type Ecran = { container: HTMLElement };

const panneau = (s: Ecran) => s.container.querySelector('.ui-menu') as HTMLElement;
// Interrogé sur le DOCUMENT et non sur le conteneur : un panneau du calque
// supérieur reste dans le document, mais pas sous la racine du rendu.
const entrees = () => [...document.querySelectorAll('.ui-menu-action')] as HTMLElement[];
const parLibelle = (nom: string) =>
  [...document.querySelectorAll('.ui-menu-action')].find(
    (el) => el.textContent?.trim() === nom,
  ) as HTMLElement;

const ITEMS: UiMenuItem[] = [
  {
    label: 'Documents',
    items: [
      { label: 'Nouveau', icon: 'plus' },
      { label: 'Bloqué', disabled: true },
      { label: 'Rechercher' },
    ],
  },
  { separator: true },
  { label: 'Déconnexion' },
];

function Demo(props: Partial<UiMenuProps> = {}) {
  return <UiMenu items={ITEMS} aria-label="Menu" {...props} />;
}

// --- Structure ------------------------------------------------------------

test('la liste est un role="menu" nommé, ses entrées de vrais boutons', async () => {
  const screen = await render(<Demo />);

  const liste = screen.container.querySelector('[role="menu"]')!;
  expect(liste.getAttribute('aria-label')).toBe('Menu');
  // Le nom accessible appartient à la liste, jamais au panneau : un `<div>` sans
  // rôle qui porte un nom est refusé par axe.
  expect(panneau(screen).hasAttribute('aria-label')).toBe(false);

  for (const entree of entrees()) {
    expect(entree.getAttribute('role')).toBe('menuitem');
    expect(entree.tagName).toBe('BUTTON');
  }
});

test('une section est un role="group" étiqueté par son en-tête', async () => {
  const screen = await render(<Demo />);

  const groupe = screen.container.querySelector('[role="group"]')!;
  const enTete = screen.container.querySelector('.ui-menu-header')!;
  expect(groupe.getAttribute('aria-labelledby')).toBe(enTete.id);
  expect(enTete.textContent).toBe('Documents');
});

test('le séparateur porte la sémantique, son filet reste décoratif', async () => {
  const screen = await render(<Demo />);

  const separateur = screen.container.querySelector('li.ui-menu-separator')!;
  expect(separateur.getAttribute('role')).toBe('separator');
  expect(separateur.querySelector('.ui-separator')!.getAttribute('aria-hidden')).toBe('true');
});

// --- Activation -----------------------------------------------------------

test('une entrée activée appelle sa commande puis onItemClick', async () => {
  const command = vi.fn();
  const onItemClick = vi.fn();
  const items: UiMenuItem[] = [{ label: 'Publier', command }];
  await render(<Demo items={items} onItemClick={onItemClick} />);

  await parLibelle('Publier').click();

  expect(command).toHaveBeenCalledTimes(1);
  expect(onItemClick).toHaveBeenCalledTimes(1);
  expect(onItemClick.mock.calls[0]![0].item.label).toBe('Publier');
});

test('une entrée désactivée n’appelle rien', async () => {
  const command = vi.fn();
  const onItemClick = vi.fn();
  const items: UiMenuItem[] = [{ label: 'Bloqué', disabled: true, command }];
  await render(<Demo items={items} onItemClick={onItemClick} />);

  expect(parLibelle('Bloqué')).toBeDisabled();
  expect(command).not.toHaveBeenCalled();
  expect(onItemClick).not.toHaveBeenCalled();
});

// --- Focus glissant -------------------------------------------------------

test('un seul arrêt de tabulation pour tout le menu', async () => {
  await render(<Demo />);

  const tabbables = entrees().filter((el) => el.tabIndex === 0);
  expect(tabbables).toHaveLength(1);
  expect(tabbables[0]!.textContent?.trim()).toBe('Nouveau');
});

test('la flèche bas déplace le focus et saute l’entrée désactivée', async () => {
  const screen = await render(<Demo />);

  parLibelle('Nouveau').focus();
  await screen.getByRole('menuitem', { name: 'Nouveau' }).click();
  parLibelle('Nouveau').focus();

  const evenement = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
  parLibelle('Nouveau').dispatchEvent(evenement);

  // « Bloqué » est désactivé, donc hors du parcours : le focus l'enjambe.
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Rechercher');
  await expect.poll(() => parLibelle('Rechercher').tabIndex).toBe(0);
  expect(parLibelle('Nouveau').tabIndex).toBe(-1);
});

// --- Groupes repliables ---------------------------------------------------

const REPLIABLES: UiMenuItem[] = [
  {
    id: 'fichiers',
    label: 'Fichiers',
    toggleable: true,
    items: [{ label: 'Récents' }, { label: 'Corbeille' }],
  },
];

test('un groupe repliable annonce son état et neutralise son contenu fermé', async () => {
  const screen = await render(<Demo items={REPLIABLES} />);

  const bascule = parLibelle('Fichiers');
  expect(bascule.getAttribute('aria-expanded')).toBe('false');
  const groupe = screen.container.querySelector('.ui-menu-collapse')!;
  expect(bascule.getAttribute('aria-controls')).toBe(groupe.id);
  expect(groupe.hasAttribute('inert')).toBe(true);

  await screen.getByRole('menuitem', { name: 'Fichiers' }).click();

  await expect.poll(() => parLibelle('Fichiers').getAttribute('aria-expanded')).toBe('true');
  await expect
    .poll(() => screen.container.querySelector('.ui-menu-collapse')!.hasAttribute('inert'))
    .toBe(false);
});

test('les flèches droite et gauche ouvrent puis referment un groupe', async () => {
  const screen = await render(<Demo items={REPLIABLES} />);
  const bascule = parLibelle('Fichiers');
  bascule.focus();

  bascule.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await expect.poll(() => parLibelle('Fichiers').getAttribute('aria-expanded')).toBe('true');

  parLibelle('Fichiers').dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
  );
  await expect.poll(() => parLibelle('Fichiers').getAttribute('aria-expanded')).toBe('false');
  void screen;
});

test('expandedKeys contrôlé : un parent immobile garde le groupe fermé', async () => {
  const onExpandedKeysChange = vi.fn();
  const screen = await render(
    <Demo items={REPLIABLES} expandedKeys={{}} onExpandedKeysChange={onExpandedKeysChange} />,
  );

  await screen.getByRole('menuitem', { name: 'Fichiers' }).click();

  expect(onExpandedKeysChange).toHaveBeenCalledWith({ fichiers: true });
  // Le parent n'a rien renvoyé : l'état ne bouge pas, ce qui est le contrat.
  expect(parLibelle('Fichiers').getAttribute('aria-expanded')).toBe('false');
});

// --- Popup ----------------------------------------------------------------

const POPUP: UiMenuItem[] = [{ label: 'Renommer' }, { label: 'Supprimer' }];

function DemoPopup(props: Partial<UiMenuProps> = {}) {
  return (
    <UiMenu
      popup
      items={POPUP}
      aria-label="Actions"
      trigger={(triggerProps) => (
        <button type="button" {...triggerProps}>
          Ouvrir
        </button>
      )}
      {...props}
    />
  );
}

// Vérifier l'état ne prouve RIEN sur ce que voit l'utilisateur : on mesure le
// rendu, `display` et la largeur du rectangle (leçon payée sur `ui-modal`).
test('le panneau fermé n’occupe aucune place à l’écran', async () => {
  const screen = await render(<DemoPopup />);
  const el = panneau(screen);

  expect(el.matches(':popover-open')).toBe(false);
  expect(getComputedStyle(el).display).toBe('none');
  expect(el.getBoundingClientRect().width).toBe(0);
});

test('le déclencheur ouvre le panneau dans le calque supérieur', async () => {
  const screen = await render(<DemoPopup />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
  expect(getComputedStyle(panneau(screen)).display).toBe('flex');
  expect(panneau(screen).getBoundingClientRect().width).toBeGreaterThan(0);
});

// C'est le bénéfice mesurable du calque supérieur, et le défaut le plus pénible
// d'un menu posé dans une zone défilante.
test('le panneau échappe au rognage d’un ancêtre en overflow hidden', async () => {
  const screen = await render(
    <div style={{ width: 120, height: 60, overflow: 'hidden' }}>
      <DemoPopup />
    </div>,
  );

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  const cadre = screen.container.firstElementChild as HTMLElement;
  expect(cadre.getBoundingClientRect().width).toBe(120);
  // Le panneau est plus large que son cadre, et intégralement rendu.
  expect(panneau(screen).getBoundingClientRect().width).toBeGreaterThan(200);
});

test('le déclencheur annonce le menu qu’il commande', async () => {
  const screen = await render(<DemoPopup />);
  const trigger = screen.container.querySelector('button')!;

  expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger.hasAttribute('aria-controls')).toBe(false);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).toBe(panneau(screen).id);
});

// Le test qui manquait à `ui-modal` : fermer PUIS rouvrir.
test('le cycle ouvrir, fermer, rouvrir fonctionne', async () => {
  const screen = await render(<DemoPopup />);
  const ouvrir = screen.getByRole('button', { name: 'Ouvrir' });

  await ouvrir.click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  await ouvrir.click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);

  await ouvrir.click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
});

test('le focus se pose sur la première entrée à l’ouverture', async () => {
  const screen = await render(<DemoPopup />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Renommer');
});

// Le focus est rendu par `hidePopover()`, pas par le composant : ce test est ce
// qui vérifie qu'on a le droit de s'appuyer dessus.
test('activer une entrée referme et rend le focus au déclencheur', async () => {
  const command = vi.fn();
  const screen = await render(<DemoPopup items={[{ label: 'Renommer', command }]} />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('menuitem', { name: 'Renommer' }).click();

  expect(command).toHaveBeenCalledTimes(1);
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Ouvrir');
});

test('un clic à l’extérieur referme le popup', async () => {
  const screen = await render(
    <>
      <DemoPopup />
      <button type="button">Dehors</button>
    </>,
  );

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('button', { name: 'Dehors' }).click();
  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(false);
});

test('le popup contrôlé reste ouvert quand son parent ne bouge pas', async () => {
  const screen = await render(<DemoPopup open onOpenChange={() => {}} />);

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);

  await screen.getByRole('menuitem', { name: 'Renommer' }).click();

  await expect.poll(() => panneau(screen).matches(':popover-open')).toBe(true);
});

// --- Sous-menus en cascade ------------------------------------------------

const CASCADE: UiMenuItem[] = [
  { id: 'exporter', label: 'Exporter', items: [{ label: 'PDF' }, { label: 'CSV' }] },
  { label: 'Imprimer' },
];

const flyout = () => document.querySelector('.ui-menu-flyout') as HTMLElement;

test('un parent de cascade annonce son sous-menu', async () => {
  await render(<Demo items={CASCADE} submenus="flyout" />);

  const parent = parLibelle('Exporter');
  expect(parent.getAttribute('aria-haspopup')).toBe('menu');
  expect(parent.getAttribute('aria-expanded')).toBe('false');
  expect(getComputedStyle(flyout()).display).toBe('none');
});

// React déduit `pointerenter` de `pointerover` : un événement fabriqué
// n'atteint jamais le gestionnaire. Il faut un survol RÉEL.
test('le survol ouvre le panneau latéral, sans voler le focus', async () => {
  const screen = await render(<Demo items={CASCADE} submenus="flyout" />);
  screen.getByRole('menuitem', { name: 'Imprimer' }).element().focus();

  await screen.getByRole('menuitem', { name: 'Exporter' }).hover();

  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);
  expect(flyout().getBoundingClientRect().width).toBeGreaterThan(0);
  expect(document.activeElement?.textContent?.trim()).toBe('Imprimer');
});

test('la flèche droite ouvre le panneau latéral ET y entre', async () => {
  const screen = await render(<Demo items={CASCADE} submenus="flyout" />);
  const parent = parLibelle('Exporter');
  parent.focus();

  parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('PDF');
  void screen;
});

test('Échap dans le panneau latéral ne referme que lui', async () => {
  const screen = await render(<DemoPopup items={CASCADE} submenus="flyout" />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  const parent = parLibelle('Exporter');
  parent.focus();
  parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);
  // Attendre le PANNEAU ouvert ne suffit pas : le focus n'y entre qu'une
  // macrotâche plus tard, et une touche envoyée avant atterrit sur l'entrée
  // parente, donc dans le menu du dessus. Le test passerait en prouvant
  // l'inverse de ce qu'il annonce.
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('PDF');

  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );

  await expect.poll(() => flyout().matches(':popover-open')).toBe(false);
  // Le menu parent, lui, reste ouvert : la touche a été consommée par la cascade.
  expect(panneau(screen).matches(':popover-open')).toBe(true);
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Exporter');
});

// Le style navigateur d'un `[popover]` pose `overflow: auto`, et l'enveloppe du
// sous-menu fait EXACTEMENT la taille du panneau qu'elle porte : sans
// neutralisation, l'ombre du panneau, peinte hors de sa boîte, se fait rogner
// sur les quatre côtés.
test('l’enveloppe du sous-menu ne rogne pas l’ombre du panneau', async () => {
  const screen = await render(<Demo items={CASCADE} submenus="flyout" />);

  await screen.getByRole('menuitem', { name: 'Exporter' }).click();
  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);

  const panneauInterne = flyout().querySelector('.ui-menu') as HTMLElement;
  expect(getComputedStyle(flyout()).overflowY).toBe('visible');
  expect(getComputedStyle(flyout()).overflowX).toBe('visible');
  // C'est cette égalité de taille qui rend le rognage fatal, d'où l'assertion.
  expect(flyout().offsetWidth).toBe(panneauInterne.offsetWidth);
  expect(getComputedStyle(panneauInterne).boxShadow).not.toBe('none');
});

// Un clic RÉEL, pointeur compris : c'est le seul qui expose l'enchaînement
// survol puis clic, et c'est là que le sous-menu se rouvrait tout seul.
test('activer une feuille de cascade referme, et ça ne se rouvre pas', async () => {
  const screen = await render(<Demo items={CASCADE} submenus="flyout" />);

  await screen.getByRole('menuitem', { name: 'Exporter' }).click();
  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);

  await screen.getByRole('menuitem', { name: 'PDF' }).click();

  await expect.poll(() => flyout().matches(':popover-open')).toBe(false);
  // Mesuré : la réouverture arrivait 7 ms après la fermeture, par un
  // `mouseenter` que le navigateur émet quand le panneau disparaît sous un
  // pointeur immobile. On laisse donc passer largement ce délai.
  await new Promise((resolve) => setTimeout(resolve, 120));
  expect(flyout().matches(':popover-open')).toBe(false);
  expect(parLibelle('Exporter').getAttribute('aria-expanded')).toBe('false');
});

// Le clic OUVRE le sous-menu, il ne bascule pas : à la souris le survol l'a déjà
// ouvert avant que le clic arrive, et une bascule le refermait aussitôt.
test('cliquer un parent de cascade ouvre son panneau', async () => {
  const screen = await render(<Demo items={CASCADE} submenus="flyout" />);

  await screen.getByRole('menuitem', { name: 'Exporter' }).click();

  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);
  expect(parLibelle('Exporter').getAttribute('aria-expanded')).toBe('true');
});

// Le sous-menu s'anime à l'ENTRÉE seulement. Une sortie animée le garderait
// affiché (`allow-discrete`) le temps de la transition, et il glisserait par
// dessus son parent : mesuré à 180 ms de recouvrement, et c'est ce que le kit
// Angular évite en n'animant que l'insertion.
test('le sous-menu s’anime à l’entrée et disparaît net', async () => {
  const screen = await render(<Demo items={CASCADE} submenus="flyout" />);

  await screen.getByRole('menuitem', { name: 'Exporter' }).click();
  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);
  // L'entrée est bien animée : la transition existe sur l'état ouvert.
  expect(getComputedStyle(flyout()).transitionProperty).toContain('opacity');
  expect(getComputedStyle(flyout()).transitionDuration).not.toBe('0s');

  await screen.getByRole('menuitem', { name: 'PDF' }).click();

  // Aucune image affichée après l'activation : la sortie est instantanée.
  const images: string[] = [];
  await new Promise<void>((resolve) => {
    let reste = 6;
    const tick = () => {
      images.push(getComputedStyle(flyout()).display);
      if (--reste > 0) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  expect(images.filter((d) => d !== 'none')).toEqual([]);
});

// `computePosition` est asynchrone : entre l'ouverture et sa réponse le panneau
// porte encore la position d'avant. Le peindre donne le panneau qui apparaît au
// mauvais endroit puis se replace. L'attribut doit donc le rendre invisible.
test('un panneau non encore positionné reste invisible', async () => {
  const screen = await render(<DemoPopup />);

  // Au repos, le garde est POSÉ : c'est ce qui prouve qu'il est branché.
  expect(panneau(screen).hasAttribute('data-unpositioned')).toBe(true);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();
  // Attendre l'OUVERTURE ne suffit pas : le panneau est légitimement invisible
  // jusqu'à ce que sa position soit calculée. C'est la levée de l'attribut qu'il
  // faut attendre, et c'est elle qui prouve que le garde se relâche.
  await expect.poll(() => panneau(screen).hasAttribute('data-unpositioned')).toBe(false);
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau(screen)).opacity).toBe('1');

  panneau(screen).setAttribute('data-unpositioned', '');
  panneau(screen)
    .getAnimations()
    .forEach((animation) => animation.finish());

  expect(getComputedStyle(panneau(screen)).opacity).toBe('0');
});

test('un groupe expanded ouvre son panneau latéral au repos', async () => {
  await render(
    <Demo
      items={[{ id: 'exporter', label: 'Exporter', expanded: true, items: [{ label: 'PDF' }] }]}
      submenus="flyout"
    />,
  );

  await expect.poll(() => flyout().matches(':popover-open')).toBe(true);
  expect(parLibelle('Exporter').getAttribute('aria-expanded')).toBe('true');
});

// --- Liens ----------------------------------------------------------------

test('une entrée `url` rend une ancre, sécurisée en nouvelle fenêtre', async () => {
  const screen = await render(
    <Demo items={[{ label: 'Doc', url: 'https://example.org', target: '_blank' }]} />,
  );

  const lien = screen.container.querySelector('a.ui-menu-action')!;
  expect(lien.getAttribute('href')).toBe('https://example.org');
  expect(lien.getAttribute('rel')).toBe('noopener noreferrer');
  expect(lien.getAttribute('role')).toBe('menuitem');
});

test('`render` reçoit les props de la racine, et `active` marque l’entrée', async () => {
  const recues: string[] = [];
  const screen = await render(
    <Demo
      items={[
        {
          label: 'Tableau',
          active: true,
          render: (props, children) => {
            recues.push(...Object.keys(props));
            return (
              <a {...props} href="#tableau">
                {children}
              </a>
            );
          },
        },
      ]}
    />,
  );

  const lien = screen.container.querySelector('a.ui-menu-action')!;
  expect(lien.classList.contains('_active')).toBe(true);
  expect(recues).toContain('role');
  expect(recues).toContain('tabIndex');
  expect(recues).toContain('data-key');
});

// --- Divers ---------------------------------------------------------------

test('motionDisabled coupe les deux animations d’un seul coup', async () => {
  const screen = await render(<Demo motionDisabled />);

  expect(panneau(screen).style.getPropertyValue('--ui-motion-duration')).toBe('0ms');
});

test('le contenu d’une entrée peut venir de l’appelant', async () => {
  const screen = await render(
    <Demo
      items={[{ id: 'x', label: 'Ignoré' }]}
      renderItem={(item) => <span className="maison">clé {item.id}</span>}
    />,
  );

  expect(screen.container.querySelector('.maison')!.textContent).toBe('clé x');
});

test('une entrée masquée ne rend rien', async () => {
  await render(<Demo items={[{ label: 'Visible' }, { label: 'Cachée', visible: false }]} />);

  expect(entrees()).toHaveLength(1);
});

// Le mode non contrôlé, où l'état d'expansion vit dans le composant.
test('sans expandedKeys, le menu gère lui-même le repli', async () => {
  const onExpandedKeysChange = vi.fn();
  const screen = await render(
    <Demo items={REPLIABLES} onExpandedKeysChange={onExpandedKeysChange} />,
  );

  await screen.getByRole('menuitem', { name: 'Fichiers' }).click();

  await expect.poll(() => parLibelle('Fichiers').getAttribute('aria-expanded')).toBe('true');
  // Notifié dans les deux modes : c'est le contrat de `useControllableState`.
  expect(onExpandedKeysChange).toHaveBeenCalledWith({ fichiers: true });
});
