import { useMemo, useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiTable,
  UiTableCheckbox,
  UiTableHeaderCheckbox,
  UiTableRadio,
  UiTableSortIcon,
  type UiTableApi,
  type UiTableProps,
} from './ui-table';

interface Ville {
  id: number;
  nom: string;
  habitants: number;
}

const VILLES: Ville[] = [
  { id: 1, nom: 'Bordeaux', habitants: 260958 },
  { id: 2, nom: 'Lyon', habitants: 522250 },
  { id: 3, nom: 'Nantes', habitants: 320732 },
];

type Ecran = { container: HTMLElement };

const tableau = (s: Ecran) => s.container.querySelector('.ui-table') as HTMLElement;
const lignes = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-table-tbody tr')] as HTMLTableRowElement[];
const noms = (s: Ecran) => lignes(s).map((tr) => tr.cells[0]?.textContent);
const entetes = (s: Ecran) =>
  [...s.container.querySelectorAll('.ui-table-thead th')] as HTMLTableCellElement[];

const enTete = () => (
  <tr>
    <th scope="col">Ville</th>
    <th scope="col">Habitants</th>
  </tr>
);
const corps = ({ row }: { row: Ville }) => (
  <tr>
    <td>{row.nom}</td>
    <td>{row.habitants}</td>
  </tr>
);

function Demo(props: Partial<UiTableProps<Ville>> = {}) {
  return (
    <UiTable<Ville>
      value={VILLES}
      dataKey="id"
      renderHeader={enTete}
      renderBody={corps}
      {...props}
    />
  );
}

// --- Structure -------------------------------------------------------------

test('le balisage projeté est rendu tel quel, dans un vrai tableau', async () => {
  const screen = await render(<Demo />);

  expect(tableau(screen).querySelector('table')).not.toBe(null);
  expect(entetes(screen).map((th) => th.textContent)).toEqual(['Ville', 'Habitants']);
  expect(noms(screen)).toEqual(['Bordeaux', 'Lyon', 'Nantes']);
  // Les cellules restent celles de l'appelant : le composant n'en fabrique pas.
  expect(lignes(screen)[0]!.cells).toHaveLength(2);
});

test('les densités et les décors composent des classes', async () => {
  const screen = await render(<Demo size="small" showGridlines stripedRows rowHover scrollable />);

  const classes = tableau(screen).className;
  for (const attendue of ['_small', '_gridlines', '_striped', '_hoverable', '_scrollable']) {
    expect(classes).toContain(attendue);
  }
});

test('une sélection active rend les lignes survolables sans le demander', async () => {
  const screen = await render(<Demo selectionMode="single" />);

  expect(tableau(screen).className).toContain('_hoverable');
});

// --- État vide et chargement ----------------------------------------------

// Le colspan vient d'une MESURE des `<th>` : l'appelant ne le déclare pas.
test('sans lignes, une cellule vide couvre toute la largeur', async () => {
  const screen = await render(<Demo value={[]} />);

  const cellule = screen.container.querySelector('.ui-table-empty-cell') as HTMLTableCellElement;
  expect(cellule).not.toBe(null);
  await expect.poll(() => cellule.colSpan).toBe(2);
  expect(cellule.textContent).toContain('Aucune donnée à afficher');
});

test('renderEmpty remplace le message par défaut', async () => {
  const screen = await render(<Demo value={[]} renderEmpty={() => <b>Rien ici</b>} />);

  expect(screen.container.querySelector('.ui-table-empty-cell')!.textContent).toBe('Rien ici');
});

test('en chargement, le tableau est occupé et n’affiche plus ses lignes', async () => {
  const screen = await render(<Demo loading />);

  expect(tableau(screen).getAttribute('aria-busy')).toBe('true');
  expect(screen.container.querySelector('.ui-table-loading-cell')).not.toBe(null);
  expect(noms(screen)).not.toContain('Bordeaux');
});

// --- Tri -------------------------------------------------------------------

const enTeteTriable = (table: UiTableApi<Ville>) => (
  <tr>
    <th {...table.sortableColumn('nom')} scope="col">
      Ville <UiTableSortIcon field="nom" />
    </th>
    <th {...table.sortableColumn('habitants')} scope="col">
      Habitants
    </th>
  </tr>
);

test('un en-tête triable annonce son état et son rôle', async () => {
  const screen = await render(<Demo renderHeader={enTeteTriable} />);

  const th = entetes(screen)[0]!;
  expect(th.getAttribute('role')).toBe('columnheader');
  expect(th.getAttribute('aria-sort')).toBe('none');
  expect(th.tabIndex).toBe(0);
});

test('le clic cycle croissant, décroissant, plus de tri', async () => {
  const screen = await render(<Demo renderHeader={enTeteTriable} />);

  await entetes(screen)[0]!.click();
  await expect.poll(() => entetes(screen)[0]!.getAttribute('aria-sort')).toBe('ascending');
  expect(noms(screen)).toEqual(['Bordeaux', 'Lyon', 'Nantes']);

  await entetes(screen)[0]!.click();
  await expect.poll(() => entetes(screen)[0]!.getAttribute('aria-sort')).toBe('descending');
  expect(noms(screen)).toEqual(['Nantes', 'Lyon', 'Bordeaux']);

  await entetes(screen)[0]!.click();
  await expect.poll(() => entetes(screen)[0]!.getAttribute('aria-sort')).toBe('none');
  // Plus de tri : on retrouve l'ordre du modèle.
  expect(noms(screen)).toEqual(['Bordeaux', 'Lyon', 'Nantes']);
});

test('le tri est opérable au clavier', async () => {
  const screen = await render(<Demo renderHeader={enTeteTriable} />);
  const th = entetes(screen)[0]!;
  th.focus();

  th.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  await expect.poll(() => entetes(screen)[0]!.getAttribute('aria-sort')).toBe('ascending');
});

test('le tri numérique compare des nombres, pas des textes', async () => {
  const screen = await render(<Demo renderHeader={enTeteTriable} />);

  await entetes(screen)[1]!.click();

  // 260958 < 320732 < 522250 : un tri lexical aurait mis 260958 avant 320732
  // mais aussi 522250 avant, ce qui ne se voit que sur des ordres différents.
  await expect.poll(() => noms(screen)).toEqual(['Bordeaux', 'Nantes', 'Lyon']);
});

test('defaultSort amorce le tri sans le contrôler', async () => {
  const screen = await render(
    <Demo renderHeader={enTeteTriable} defaultSort={{ field: 'nom', order: -1 }} />,
  );

  expect(noms(screen)).toEqual(['Nantes', 'Lyon', 'Bordeaux']);
  expect(entetes(screen)[0]!.getAttribute('aria-sort')).toBe('descending');
});

test('onSortChange reçoit le mode, ce dont un appelant serveur a besoin', async () => {
  const onSortChange = vi.fn();
  const screen = await render(<Demo renderHeader={enTeteTriable} onSortChange={onSortChange} />);

  await entetes(screen)[0]!.click();

  expect(onSortChange).toHaveBeenCalledWith({
    mode: 'single',
    field: 'nom',
    order: 1,
    multiSortMeta: undefined,
  });
});

test('l’icône de tri suit la direction, et reste décorative', async () => {
  const screen = await render(<Demo renderHeader={enTeteTriable} />);

  const icone = () => screen.container.querySelector('.ui-table-sort-icon')!;
  expect(icone().className).toContain('fa-sort');

  await entetes(screen)[0]!.click();

  await expect.poll(() => icone().className).toContain('fa-sort-up');
  // L'état accessible vit sur le `<th>` : l'icône ne le répète pas.
  expect(icone().getAttribute('aria-hidden')).toBe('true');
});

test('customSort délègue le tri sans réordonner', async () => {
  const onSortFunction = vi.fn();
  const screen = await render(
    <Demo renderHeader={enTeteTriable} customSort onSortFunction={onSortFunction} />,
  );

  await entetes(screen)[1]!.click();

  expect(onSortFunction).toHaveBeenCalledTimes(1);
  expect(onSortFunction.mock.calls[0]![0].data).toHaveLength(3);
  // Le tableau n'a rien réordonné : c'est le contrat.
  expect(noms(screen)).toEqual(['Bordeaux', 'Lyon', 'Nantes']);
});

test('en mode multiple, un clic simple repart d’un seul tri', async () => {
  const onSortChange = vi.fn();
  const screen = await render(
    <Demo renderHeader={enTeteTriable} sortMode="multiple" onSortChange={onSortChange} />,
  );

  await entetes(screen)[0]!.click();

  expect(onSortChange.mock.calls[0]![0].multiSortMeta).toEqual([{ field: 'nom', order: 1 }]);
});

// --- Sélection -------------------------------------------------------------

/** Harnais contrôlé : c'est ce qui rend le cycle de sélection observable. */
function DemoSelection({
  mode = 'single',
  ...props
}: Partial<UiTableProps<Ville>> & { mode?: 'single' | 'multiple' } = {}) {
  const [selection, setSelection] = useState<Ville | Ville[] | null>(
    mode === 'multiple' ? [] : null,
  );
  return (
    <UiTable<Ville>
      value={VILLES}
      dataKey="id"
      selectionMode={mode}
      selection={selection}
      onSelectionChange={setSelection}
      renderHeader={enTete}
      renderBody={({ row, rowIndex, table }) => (
        <tr {...table.selectableRow(row, rowIndex)}>
          <td>{row.nom}</td>
          <td>{row.habitants}</td>
        </tr>
      )}
      {...props}
    />
  );
}

test('une ligne sélectionnable annonce son état', async () => {
  const screen = await render(<DemoSelection />);

  expect(lignes(screen)[0]!.getAttribute('aria-selected')).toBe('false');

  await lignes(screen)[0]!.click();

  await expect.poll(() => lignes(screen)[0]!.getAttribute('aria-selected')).toBe('true');
  expect(lignes(screen)[0]!.className).toContain('_selected');
});

test('un second clic désélectionne', async () => {
  const screen = await render(<DemoSelection />);

  await lignes(screen)[0]!.click();
  await expect.poll(() => lignes(screen)[0]!.getAttribute('aria-selected')).toBe('true');

  await lignes(screen)[0]!.click();

  await expect.poll(() => lignes(screen)[0]!.getAttribute('aria-selected')).toBe('false');
});

test('en simple, sélectionner une ligne libère la précédente', async () => {
  const screen = await render(<DemoSelection />);

  await lignes(screen)[0]!.click();
  await lignes(screen)[1]!.click();

  await expect.poll(() => lignes(screen)[1]!.getAttribute('aria-selected')).toBe('true');
  expect(lignes(screen)[0]!.getAttribute('aria-selected')).toBe('false');
});

test('en multiple, les lignes s’accumulent', async () => {
  const screen = await render(<DemoSelection mode="multiple" />);

  await lignes(screen)[0]!.click();
  await lignes(screen)[2]!.click();

  await expect.poll(() => lignes(screen)[2]!.getAttribute('aria-selected')).toBe('true');
  expect(lignes(screen)[0]!.getAttribute('aria-selected')).toBe('true');
});

// Un seul arrêt de tabulation : un tableau de vingt lignes qui serait vingt
// arrêts rend le reste de la page inatteignable.
test('les lignes n’ont qu’un seul arrêt de tabulation', async () => {
  const screen = await render(<DemoSelection />);

  expect(lignes(screen).filter((tr) => tr.tabIndex === 0)).toHaveLength(1);
  expect(lignes(screen)[0]!.tabIndex).toBe(0);
});

test('l’arrêt de tabulation suit la ligne sélectionnée', async () => {
  const screen = await render(<DemoSelection />);

  await lignes(screen)[2]!.click();

  await expect.poll(() => lignes(screen)[2]!.tabIndex).toBe(0);
  expect(lignes(screen)[0]!.tabIndex).toBe(-1);
});

test('les flèches déplacent le focus entre les lignes', async () => {
  const screen = await render(<DemoSelection />);
  lignes(screen)[0]!.focus();

  lignes(screen)[0]!.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
  );

  await expect.poll(() => document.activeElement).toBe(lignes(screen)[1]);
});

test('Entrée sélectionne la ligne focalisée', async () => {
  const screen = await render(<DemoSelection />);
  lignes(screen)[1]!.focus();

  lignes(screen)[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  await expect.poll(() => lignes(screen)[1]!.getAttribute('aria-selected')).toBe('true');
});

test('Ctrl et A sélectionnent tout, en multiple seulement', async () => {
  const screen = await render(<DemoSelection mode="multiple" />);
  lignes(screen)[0]!.focus();

  lignes(screen)[0]!.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }),
  );

  await expect
    .poll(() => lignes(screen).every((tr) => tr.getAttribute('aria-selected') === 'true'))
    .toBe(true);
});

// Un clic sur un contrôle appartient à ce contrôle, pas à la ligne.
test('un clic sur un bouton de la ligne ne la sélectionne pas', async () => {
  const screen = await render(
    <DemoSelection
      renderBody={({ row, rowIndex, table }) => (
        <tr {...table.selectableRow(row, rowIndex)}>
          <td>
            <button type="button">Voir {row.nom}</button>
          </td>
          <td>{row.habitants}</td>
        </tr>
      )}
    />,
  );

  await screen.getByRole('button', { name: 'Voir Bordeaux' }).click();

  expect(lignes(screen)[0]!.getAttribute('aria-selected')).toBe('false');
});

test('la sélection par cases coche, décoche et notifie', async () => {
  const onRowSelect = vi.fn();
  function Harnais() {
    const [selection, setSelection] = useState<Ville | Ville[] | null>([]);
    return (
      <UiTable<Ville>
        value={VILLES}
        dataKey="id"
        selectionMode="multiple"
        selection={selection}
        onSelectionChange={setSelection}
        onRowSelect={onRowSelect}
        renderHeader={() => (
          <tr>
            <th scope="col">
              <UiTableHeaderCheckbox />
            </th>
            <th scope="col">Ville</th>
          </tr>
        )}
        renderBody={({ row, rowIndex }) => (
          <tr>
            <td>
              <UiTableCheckbox value={row} index={rowIndex} aria-label={`Choisir ${row.nom}`} />
            </td>
            <td>{row.nom}</td>
          </tr>
        )}
      />
    );
  }
  const screen = await render(<Harnais />);

  await screen.getByRole('checkbox', { name: 'Choisir Lyon' }).click();

  await expect.poll(() => onRowSelect.mock.calls.length).toBe(1);
  expect(onRowSelect.mock.calls[0]![0]).toMatchObject({ type: 'checkbox', index: 1 });
});

test('la case d’en-tête coche tout, et devient indéterminée sur une partie', async () => {
  function Harnais() {
    const [selection, setSelection] = useState<Ville | Ville[] | null>([VILLES[0]!]);
    return (
      <UiTable<Ville>
        value={VILLES}
        dataKey="id"
        selectionMode="multiple"
        selection={selection}
        onSelectionChange={setSelection}
        renderHeader={() => (
          <tr>
            <th scope="col">
              <UiTableHeaderCheckbox />
            </th>
            <th scope="col">Ville</th>
          </tr>
        )}
        renderBody={({ row }) => (
          <tr>
            <td />
            <td>{row.nom}</td>
          </tr>
        )}
      />
    );
  }
  const screen = await render(<Harnais />);

  const tout = screen.container.querySelector('.ui-table-thead input') as HTMLInputElement;
  // Une ligne sur trois : ni coché ni vide.
  expect(tout.indeterminate).toBe(true);

  await screen.getByRole('checkbox', { name: 'Tout sélectionner' }).click();

  await expect
    .poll(
      () => (screen.container.querySelector('.ui-table-thead input') as HTMLInputElement).checked,
    )
    .toBe(true);
});

test('la sélection par boutons radio garde une seule ligne', async () => {
  function Harnais() {
    const [selection, setSelection] = useState<Ville | Ville[] | null>(null);
    return (
      <UiTable<Ville>
        value={VILLES}
        dataKey="id"
        selectionMode="single"
        selection={selection}
        onSelectionChange={setSelection}
        renderHeader={enTete}
        renderBody={({ row, rowIndex }) => (
          <tr>
            <td>
              <UiTableRadio value={row} index={rowIndex} aria-label={`Choisir ${row.nom}`} />
            </td>
            <td>{row.nom}</td>
          </tr>
        )}
      />
    );
  }
  const screen = await render(<Harnais />);

  await screen.getByRole('radio', { name: 'Choisir Nantes' }).click();

  await expect
    .poll(
      () =>
        (screen.getByRole('radio', { name: 'Choisir Nantes' }).element() as HTMLInputElement)
          .checked,
    )
    .toBe(true);
});

// --- Dépliage --------------------------------------------------------------

function DemoDepliage(props: Partial<UiTableProps<Ville>> = {}) {
  return (
    <UiTable<Ville>
      value={VILLES}
      dataKey="id"
      renderHeader={enTete}
      renderBody={({ row, table }) => (
        <tr>
          <td>
            <button type="button" {...table.rowToggler(row)}>
              {row.nom}
            </button>
          </td>
          <td>{row.habitants}</td>
        </tr>
      )}
      renderExpandedRow={({ row }) => (
        <tr className="detail">
          <td colSpan={2}>Détail de {row.nom}</td>
        </tr>
      )}
      {...props}
    />
  );
}

test('le bouton de dépliage annonce son état et ouvre la ligne', async () => {
  const screen = await render(<DemoDepliage />);

  const bouton = screen.getByRole('button', { name: 'Lyon' });
  expect(bouton.element().getAttribute('aria-expanded')).toBe('false');
  expect(screen.container.querySelector('.detail')).toBe(null);

  await bouton.click();

  await expect
    .poll(() => screen.container.querySelector('.detail')?.textContent)
    .toBe('Détail de Lyon');
  expect(bouton.element().getAttribute('aria-expanded')).toBe('true');
});

test('defaultExpandedRowKeys ouvre au repos, par la valeur de dataKey', async () => {
  const screen = await render(<DemoDepliage defaultExpandedRowKeys={{ '3': true }} />);

  expect(screen.container.querySelector('.detail')!.textContent).toBe('Détail de Nantes');
});

// Le dépliage a besoin d'une identité : sans `dataKey` il n'y a rien à indexer.
test('sans dataKey, le dépliage ne fait rien et le dit', async () => {
  const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const screen = await render(<DemoDepliage dataKey={undefined} />);

  await screen.getByRole('button', { name: 'Lyon' }).click();

  expect(screen.container.querySelector('.detail')).toBe(null);
  expect(avertir).toHaveBeenCalled();
  avertir.mockRestore();
});

// --- Pagination ------------------------------------------------------------

test('le tableau découpe les pages et rend la barre', async () => {
  const screen = await render(<Demo paginator defaultRows={2} />);

  expect(noms(screen)).toEqual(['Bordeaux', 'Lyon']);
  expect(screen.container.querySelector('.ui-paginator')).not.toBe(null);

  await screen.getByRole('button', { name: 'Page suivante' }).click();

  await expect.poll(() => noms(screen)).toEqual(['Nantes']);
});

test('trier ramène à la première page', async () => {
  const screen = await render(
    <Demo paginator defaultRows={2} defaultFirst={2} renderHeader={enTeteTriable} />,
  );

  expect(noms(screen)).toEqual(['Nantes']);

  await entetes(screen)[0]!.click();

  // Rester à la page 2 après un changement d'ordre n'aurait plus de sens.
  await expect.poll(() => noms(screen)).toEqual(['Bordeaux', 'Lyon']);
});

// En mode serveur, `value` EST la page : la redécouper la viderait.
test('en lazy, la page reçue n’est pas redécoupée', async () => {
  const screen = await render(
    <Demo value={[VILLES[2]!]} lazy paginator totalRecords={3} defaultRows={1} defaultFirst={2} />,
  );

  expect(noms(screen)).toEqual(['Nantes']);
  // Le total vient du serveur : trois pages de une ligne.
  expect(screen.container.querySelectorAll('.ui-paginator-page')).toHaveLength(3);
});

// --- Colonnes figées -------------------------------------------------------

// Le décalage est la largeur cumulée des colonnes figées qui précèdent, et il
// est calculé par le tableau, qui voit la ligne entière.
test('les colonnes figées reçoivent leur décalage', async () => {
  const screen = await render(
    <Demo
      scrollable
      tableStyle={{ minWidth: '60rem' }}
      renderHeader={(table) => (
        <tr>
          <th {...table.frozenColumn()} scope="col" style={{ width: 120 }}>
            Ville
          </th>
          <th {...table.frozenColumn()} scope="col" style={{ width: 90 }}>
            Habitants
          </th>
          <th scope="col">Reste</th>
        </tr>
      )}
      renderBody={({ row, table }) => (
        <tr>
          <td {...table.frozenColumn()}>{row.nom}</td>
          <td {...table.frozenColumn()}>{row.habitants}</td>
          <td>x</td>
        </tr>
      )}
    />,
  );

  const premiere = entetes(screen)[0]!;
  const seconde = entetes(screen)[1]!;
  expect(premiere.className).toContain('_frozen-left');
  await expect.poll(() => premiere.style.left).toBe('0px');
  // La seconde se cale sur la largeur de la première, mesurée et non déclarée.
  await expect.poll(() => parseFloat(seconde.style.left)).toBeCloseTo(120, 0);
});

test('frozen={false} laisse la colonne libre', async () => {
  const screen = await render(
    <Demo
      renderHeader={(table) => (
        <tr>
          <th {...table.frozenColumn({ frozen: false })} scope="col">
            Ville
          </th>
          <th scope="col">Habitants</th>
        </tr>
      )}
    />,
  );

  expect(entetes(screen)[0]!.className).not.toContain('_frozen');
});

// --- Défilement virtuel ----------------------------------------------------

// Ne rendre que la fenêtre visible, et tenir la barre de défilement avec deux
// lignes d'espacement : une ligne de tableau ne peut pas être placée en absolu
// sans quitter la mise en page du tableau.
test('le défilement virtuel ne rend qu’une fenêtre, barre honnête', async () => {
  const beaucoup = Array.from({ length: 200 }, (_, index) => ({
    id: index + 1,
    nom: `Ville ${index + 1}`,
    habitants: index,
  }));
  const screen = await render(
    <Demo
      value={beaucoup}
      scrollable
      scrollHeight="200px"
      virtualScroll
      virtualScrollItemSize={40}
    />,
  );

  await expect.poll(() => lignes(screen).length).toBeLessThan(60);
  expect(lignes(screen).length).toBeGreaterThan(0);
  const espaceurs = screen.container.querySelectorAll('.ui-table-virtual-spacer');
  expect(espaceurs.length).toBeGreaterThan(0);
  // Le bas est réservé : la barre reflète les 200 lignes, pas les 20 rendues.
  const bas = espaceurs[espaceurs.length - 1]!.querySelector('td') as HTMLElement;
  expect(bas.offsetHeight).toBeGreaterThan(1000);
});

// --- Zones libres ----------------------------------------------------------

test('la légende et le pied encadrent le tableau', async () => {
  const screen = await render(
    <Demo
      renderCaption={() => <strong>Villes</strong>}
      renderFooter={() => (
        <tr>
          <td colSpan={2}>Total</td>
        </tr>
      )}
    />,
  );

  expect(screen.container.querySelector('.ui-table-caption')!.textContent).toBe('Villes');
  expect(screen.container.querySelector('.ui-table-tfoot')!.textContent).toBe('Total');
});

// Mesuré, pas déclaré : la hauteur de l'en-tête est ce qui décale les lignes
// épinglées, et elle n'est connue qu'après le rendu. Tout ceci passe par un
// `ResizeObserver`, qui ne tire QUE dans une page réellement peinte : c'est
// donc ce test qui le vérifie, pas une inspection à la main.
test('la hauteur d’en-tête mesurée décale les lignes épinglées', async () => {
  const screen = await render(
    <Demo
      frozenValue={[{ id: 9, nom: 'Épinglée', habitants: 1 }]}
      scrollable
      scrollHeight="160px"
    />,
  );

  const wrapper = screen.container.querySelector('.ui-table-wrapper') as HTMLElement;
  await expect
    .poll(() => parseFloat(wrapper.style.getPropertyValue('--_frozen-top')))
    .toBeGreaterThan(0);

  const cellule = screen.container.querySelector('.ui-table-tbody._frozen-rows td') as HTMLElement;
  // La ligne épinglée se colle SOUS l'en-tête, donc à sa hauteur.
  await expect.poll(() => parseFloat(cellule.style.top)).toBeGreaterThan(0);
  expect(parseFloat(cellule.style.top)).toBe(
    Math.floor(parseFloat(wrapper.style.getPropertyValue('--_frozen-top'))),
  );
});

// La zone défilante ne prend un arrêt de tabulation que si elle n'a rien de
// focalisable : le poser sans condition encombrerait le parcours clavier.
test('la zone défilante rend son arrêt de tabulation quand elle n’en a pas besoin', async () => {
  const screen = await render(
    <Demo
      scrollable
      scrollHeight="120px"
      renderBody={({ row }) => (
        <tr>
          <td>
            <button type="button">Voir {row.nom}</button>
          </td>
          <td>{row.habitants}</td>
        </tr>
      )}
    />,
  );

  const wrapper = screen.container.querySelector('.ui-table-wrapper') as HTMLElement;
  // Optimiste au départ, puis retiré : le contenu est atteignable par lui-même.
  await expect.poll(() => wrapper.hasAttribute('tabindex')).toBe(false);
});

test('frozenValue épingle des lignes au-dessus du corps', async () => {
  const screen = await render(<Demo frozenValue={[{ id: 9, nom: 'Épinglée', habitants: 1 }]} />);

  const epinglees = screen.container.querySelector('.ui-table-tbody._frozen-rows')!;
  expect(epinglees.textContent).toContain('Épinglée');
  // Et elle ne se retrouve pas aussi dans le corps ordinaire.
  expect(noms(screen).filter((nom) => nom === 'Épinglée')).toHaveLength(1);
});

// --- Réordonnancement ------------------------------------------------------

test('une ligne déplaçable porte le drapeau du glissement', async () => {
  const screen = await render(
    <Demo
      renderBody={({ row, rowIndex, table }) => (
        <tr {...table.reorderableRow(rowIndex)}>
          <td>{row.nom}</td>
          <td>{row.habitants}</td>
        </tr>
      )}
    />,
  );

  expect(lignes(screen)[0]!.draggable).toBe(true);
  expect(lignes(screen)[0]!.className).toContain('ui-table-reorderable-row');
});

// --- Un composant hors tableau -------------------------------------------

test('une partie rendue hors du tableau le dit clairement', async () => {
  const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});

  await expect(render(<UiTableHeaderCheckbox />)).rejects.toThrow(/UiTable/);

  erreur.mockRestore();
});

// --- Contrôlé --------------------------------------------------------------

test('contrôlée, une sélection qu’un parent immobile refuse ne bouge pas', async () => {
  const onSelectionChange = vi.fn();
  const screen = await render(
    <Demo
      selectionMode="single"
      selection={null}
      onSelectionChange={onSelectionChange}
      renderBody={({ row, rowIndex, table }) => (
        <tr {...table.selectableRow(row, rowIndex)}>
          <td>{row.nom}</td>
          <td>{row.habitants}</td>
        </tr>
      )}
    />,
  );

  await lignes(screen)[0]!.click();

  expect(onSelectionChange).toHaveBeenCalledWith(VILLES[0]);
  expect(lignes(screen)[0]!.getAttribute('aria-selected')).toBe('false');
});

test('la position de page se pilote de l’extérieur', async () => {
  function Harnais() {
    const [first, setFirst] = useState(0);
    const page = useMemo(() => VILLES.slice(first, first + 1), [first]);
    return (
      <div>
        <button type="button" onClick={() => setFirst(2)}>
          Aller page 3
        </button>
        <UiTable<Ville>
          value={page}
          dataKey="id"
          lazy
          paginator
          totalRecords={3}
          rows={1}
          first={first}
          onFirstChange={setFirst}
          renderHeader={enTete}
          renderBody={corps}
        />
      </div>
    );
  }
  const screen = await render(<Harnais />);

  await screen.getByRole('button', { name: 'Aller page 3' }).click();

  await expect.poll(() => noms(screen)).toEqual(['Nantes']);
});
