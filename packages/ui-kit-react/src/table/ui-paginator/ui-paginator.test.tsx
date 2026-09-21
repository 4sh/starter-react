import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiPaginator, type UiPaginatorProps } from './ui-paginator';

type Ecran = { container: HTMLElement };

const barre = (s: Ecran) => s.container.querySelector('.ui-paginator') as HTMLElement;
const pages = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-paginator-page')] as HTMLButtonElement[];
const numeros = (s: Ecran) => pages(s).map((p) => p.textContent);
const controles = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-paginator-control')] as HTMLButtonElement[];
const coupures = (s: Ecran) => [...s.container.querySelectorAll('.ui-paginator-ellipsis')];
const rapport = (s: Ecran) => s.container.querySelector('.ui-paginator-report') as HTMLElement;
const courante = (s: Ecran) => pages(s).find((p) => p.getAttribute('aria-current') === 'page');

function Demo(props: Partial<UiPaginatorProps> = {}) {
  return <UiPaginator totalRecords={120} {...props} />;
}

// --- Structure ------------------------------------------------------------

test('la barre est un repère de navigation nommé', async () => {
  const screen = await render(<Demo />);

  expect(barre(screen).tagName).toBe('NAV');
  expect(barre(screen).getAttribute('aria-label')).toBe('Pagination');
});

test('chaque page est un vrai bouton nommé, la courante est annoncée', async () => {
  const screen = await render(<Demo />);

  for (const page of pages(screen)) expect(page.tagName).toBe('BUTTON');
  expect(pages(screen)[0]!.getAttribute('aria-label')).toBe('Page 1');
  expect(courante(screen)!.textContent).toBe('1');
  // Une seule page courante, sinon l'annonce serait ambiguë.
  expect(pages(screen).filter((p) => p.getAttribute('aria-current') === 'page')).toHaveLength(1);
});

test('les quatre contrôles portent un nom accessible', async () => {
  const screen = await render(<Demo />);

  expect(controles(screen).map((c) => c.getAttribute('aria-label'))).toEqual([
    'Première page',
    'Page précédente',
    'Page suivante',
    'Dernière page',
  ]);
});

// --- Navigation -----------------------------------------------------------

test('la page suivante avance d’une page et notifie', async () => {
  const onPageChange = vi.fn();
  const screen = await render(<Demo onPageChange={onPageChange} />);

  await screen.getByRole('button', { name: 'Page suivante' }).click();

  expect(onPageChange).toHaveBeenCalledWith({ first: 10, rows: 10, page: 1, pageCount: 12 });
  await expect.poll(() => courante(screen)!.textContent).toBe('2');
});

test('un numéro de page mène directement à sa page', async () => {
  const onPageChange = vi.fn();
  const screen = await render(<Demo onPageChange={onPageChange} />);

  await pages(screen)[2]!.click();

  expect(onPageChange.mock.calls[0]![0]).toMatchObject({ first: 20, page: 2 });
  await expect.poll(() => courante(screen)!.textContent).toBe('3');
});

test('la dernière page mène au bout, la première au début', async () => {
  const screen = await render(<Demo />);

  await screen.getByRole('button', { name: 'Dernière page' }).click();
  await expect.poll(() => courante(screen)!.textContent).toBe('12');

  await screen.getByRole('button', { name: 'Première page' }).click();
  await expect.poll(() => courante(screen)!.textContent).toBe('1');
});

test('les contrôles de bord sont inertes là où ils ne mènent nulle part', async () => {
  const screen = await render(<Demo />);

  expect(controles(screen)[0]).toBeDisabled();
  expect(controles(screen)[1]).toBeDisabled();
  expect(controles(screen)[2]).not.toBeDisabled();

  await screen.getByRole('button', { name: 'Dernière page' }).click();

  await expect.poll(() => controles(screen)[2]!.disabled).toBe(true);
  expect(controles(screen)[3]).toBeDisabled();
  expect(controles(screen)[0]).not.toBeDisabled();
});

test('une seule page rend les quatre contrôles inertes', async () => {
  const screen = await render(<Demo totalRecords={6} />);

  expect(controles(screen).every((c) => c.disabled)).toBe(true);
  expect(numeros(screen)).toEqual(['1']);
});

// --- Fenêtre de numéros ---------------------------------------------------

test('en mode fenêtré, les numéros glissent autour de la page courante', async () => {
  const screen = await render(<Demo totalRecords={200} pageLinks={5} />);

  expect(numeros(screen)).toEqual(['1', '2', '3', '4', '5']);

  await pages(screen)[4]!.click();

  // Page 5 courante : la fenêtre se recentre.
  await expect.poll(() => numeros(screen)).toEqual(['3', '4', '5', '6', '7']);
});

test('la fenêtre s’arrête aux bords au lieu de sortir de la liste', async () => {
  const screen = await render(<Demo totalRecords={200} pageLinks={5} defaultFirst={190} />);

  expect(numeros(screen)).toEqual(['16', '17', '18', '19', '20']);
});

test('moins de pages que la fenêtre : on n’en invente pas', async () => {
  const screen = await render(<Demo totalRecords={25} pageLinks={5} />);

  expect(numeros(screen)).toEqual(['1', '2', '3']);
});

// --- Mode compact ---------------------------------------------------------

test('ellipsis replie la liste sur ses bords', async () => {
  const screen = await render(<Demo totalRecords={320} ellipsis />);

  expect(numeros(screen)).toEqual(['1', '2', '3', '30', '31', '32']);
  expect(coupures(screen)).toHaveLength(1);
  // Décorative : elle n'apporte rien à qui écoute la page.
  expect(coupures(screen)[0]!.getAttribute('aria-hidden')).toBe('true');
});

test('au milieu, les deux coupures apparaissent', async () => {
  const screen = await render(<Demo totalRecords={320} ellipsis defaultFirst={150} />);

  expect(numeros(screen)).toEqual(['1', '2', '3', '15', '16', '17', '30', '31', '32']);
  expect(coupures(screen)).toHaveLength(2);
});

// Une coupure qui cacherait UNE seule page coûte plus cher qu'elle ne rapporte.
test('une page isolée est montrée plutôt que masquée par une coupure', async () => {
  const screen = await render(<Demo totalRecords={320} ellipsis defaultFirst={50} />);

  // Page 6 courante : les bords donnent 1 2 3, le voisinage 5 6 7, et le trou
  // entre 3 et 5 ne vaut pas une coupure.
  expect(numeros(screen)).toEqual(['1', '2', '3', '4', '5', '6', '7', '30', '31', '32']);
  expect(coupures(screen)).toHaveLength(1);
});

// --- Écrêtage -------------------------------------------------------------

// Les données peuvent rétrécir sous le curseur : `first` pointerait alors au
// delà de la dernière page.
test('un first hors bornes se ramène sur la dernière page', async () => {
  const screen = await render(<Demo totalRecords={30} defaultFirst={999} />);

  expect(courante(screen)!.textContent).toBe('3');
  expect(controles(screen)[3]).toBeDisabled();
});

// --- Lignes par page ------------------------------------------------------

test('sans rowsPerPageOptions, le sélecteur n’est pas rendu', async () => {
  const screen = await render(<Demo />);

  expect(screen.container.querySelector('.ui-paginator-rows')).toBe(null);
});

test('changer les lignes par page revient à la première page', async () => {
  const onPageChange = vi.fn();
  const onRowsChange = vi.fn();
  const screen = await render(
    <Demo
      rowsPerPageOptions={[10, 25, 50]}
      defaultFirst={40}
      onPageChange={onPageChange}
      onRowsChange={onRowsChange}
    />,
  );

  await screen.getByRole('combobox').click();
  await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(3);
  await screen.getByRole('option', { name: '50' }).click();

  expect(onRowsChange).toHaveBeenCalledWith(50);
  // Le nombre de pages est celui de la NOUVELLE taille, pas celui du rendu
  // courant : 120 lignes par 50 font 3 pages.
  expect(onPageChange).toHaveBeenCalledWith({ first: 0, rows: 50, page: 0, pageCount: 3 });
  await expect.poll(() => numeros(screen)).toEqual(['1', '2', '3']);
});

test('le sélecteur affiche la taille de page courante', async () => {
  const screen = await render(<Demo rowsPerPageOptions={[10, 25, 50]} defaultRows={25} />);

  expect(screen.container.querySelector('[role="combobox"]')!.textContent).toContain('25');
});

// --- Compte rendu ---------------------------------------------------------

test('le compte rendu résout ses marques', async () => {
  const screen = await render(<Demo showCurrentPageReport defaultFirst={20} />);

  expect(rapport(screen).textContent).toBe('21 - 30 sur 120');
});

test('toutes les marques du motif sont remplacées', async () => {
  const screen = await render(
    <Demo
      showCurrentPageReport
      currentPageReportTemplate="{first}/{last}/{rows}/{page}/{pageCount}/{totalRecords}"
    />,
  );

  expect(rapport(screen).textContent).toBe('1/10/10/1/12/120');
});

test('une collection vide annonce zéro, sans page fantôme', async () => {
  const screen = await render(<Demo totalRecords={0} showCurrentPageReport />);

  expect(rapport(screen).textContent).toBe('0 - 0 sur 0');
  expect(numeros(screen)).toEqual(['1']);
});

// --- Contrôlé -------------------------------------------------------------

test('contrôlé, un parent immobile garde la page', async () => {
  const onFirstChange = vi.fn();
  const screen = await render(<Demo first={0} onFirstChange={onFirstChange} />);

  await screen.getByRole('button', { name: 'Page suivante' }).click();

  expect(onFirstChange).toHaveBeenCalledWith(10);
  // Le parent n'a rien renvoyé : la page ne bouge pas, ce qui est le contrat.
  expect(courante(screen)!.textContent).toBe('1');
});

test('contrôlé, un parent qui suit fait avancer la page', async () => {
  function Harnais() {
    const [first, setFirst] = useState(0);
    return <Demo first={first} onFirstChange={setFirst} />;
  }
  const screen = await render(<Harnais />);

  await screen.getByRole('button', { name: 'Page suivante' }).click();

  await expect.poll(() => courante(screen)!.textContent).toBe('2');
});

// --- Divers ---------------------------------------------------------------

test('disabled neutralise toute la barre', async () => {
  const screen = await render(<Demo disabled rowsPerPageOptions={[10, 25]} />);

  expect(controles(screen).every((c) => c.disabled)).toBe(true);
  expect(pages(screen).every((p) => p.disabled)).toBe(true);
  // Le sélecteur porte le `disabled` NATIF de son déclencheur, comme le veut son
  // propre contrat. Pas de clic pour le vérifier : Playwright attendrait
  // quinze secondes qu'un bouton désactivé devienne cliquable, ce qui n'arrive
  // jamais. L'attribut natif EST le garde, une lecture le prouve.
  expect(screen.container.querySelector('[role="combobox"]')).toBeDisabled();
});

test('showPageLinks et showFirstLastIcon découpent la barre', async () => {
  const screen = await render(<Demo showPageLinks={false} showFirstLastIcon={false} />);

  expect(pages(screen)).toHaveLength(0);
  expect(controles(screen).map((c) => c.getAttribute('aria-label'))).toEqual([
    'Page précédente',
    'Page suivante',
  ]);
});

test('les zones libres reçoivent l’état de la pagination', async () => {
  const screen = await render(
    <Demo
      defaultFirst={20}
      renderStart={(state) => <span className="debut">{state.totalRecords}</span>}
      renderEnd={(state) => <span className="fin">{`${state.page}/${state.pageCount}`}</span>}
      renderReport={(state) => <b className="rapport">{state.last}</b>}
      showCurrentPageReport
    />,
  );

  expect(screen.container.querySelector('.debut')!.textContent).toBe('120');
  expect(screen.container.querySelector('.fin')!.textContent).toBe('2/12');
  expect(screen.container.querySelector('.rapport')!.textContent).toBe('30');
});

test('renderPageLink remplace le contenu d’un numéro', async () => {
  const screen = await render(
    <Demo renderPageLink={({ number, active }) => (active ? `[${number}]` : `${number}`)} />,
  );

  expect(numeros(screen).slice(0, 2)).toEqual(['[1]', '2']);
  // Le nom accessible reste celui du composant, pas le contenu décoré.
  expect(pages(screen)[0]!.getAttribute('aria-label')).toBe('Page 1');
});

test('les icônes des contrôles sont remplaçables', async () => {
  const screen = await render(<Demo prevIcon={<span className="maison">P</span>} />);

  expect(controles(screen)[1]!.querySelector('.maison')).not.toBe(null);
});

test('la page courante garde son fond à travers les interactions', async () => {
  const screen = await render(<Demo />);

  const repos = getComputedStyle(courante(screen)!).backgroundColor;
  // Survol RÉEL : un `mouseover` fabriqué ne déclenche pas `:hover`, qui est un
  // état du navigateur et non un événement.
  await screen.getByRole('button', { name: 'Page 1' }).hover();

  // C'est un ÉTAT, pas un survol : le fond ne bouge pas.
  await expect.poll(() => getComputedStyle(courante(screen)!).backgroundColor).toBe(repos);
  // Et il diffère bien de celui d'une page ordinaire, sinon la mesure ne
  // prouverait rien.
  expect(getComputedStyle(pages(screen)[1]!).backgroundColor).not.toBe(repos);
});
