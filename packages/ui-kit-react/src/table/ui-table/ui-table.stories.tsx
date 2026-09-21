import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';

import { UiButton } from '../../actions/ui-button';
import { UiTag } from '../../informative/ui-tag';

import {
  UiTable,
  UiTableCheckbox,
  UiTableColumnResizer,
  UiTableHeaderCheckbox,
  UiTableRadio,
  UiTableSortIcon,
  type UiTableApi,
  type UiTableProps,
} from './ui-table';

interface Ville {
  id: number;
  nom: string;
  departement: string;
  habitants: number;
}

const VILLES: Ville[] = [
  { id: 1, nom: 'Bordeaux', departement: 'Gironde', habitants: 260958 },
  { id: 2, nom: 'Lyon', departement: 'Rhône', habitants: 522250 },
  { id: 3, nom: 'Nantes', departement: 'Loire-Atlantique', habitants: 320732 },
  { id: 4, nom: 'Lille', departement: 'Nord', habitants: 236234 },
  { id: 5, nom: 'Toulouse', departement: 'Haute-Garonne', habitants: 493465 },
];

/** Un jeu long, pour la pagination et le défilement virtuel. */
const BEAUCOUP: Ville[] = Array.from({ length: 120 }, (_, index) => ({
  id: index + 1,
  nom: `Ville ${index + 1}`,
  departement: `Département ${(index % 12) + 1}`,
  habitants: 10_000 + index * 137,
}));

const nombre = (valeur: number) => valeur.toLocaleString('fr-FR');

/** En-tête simple, sans tri : trois colonnes portées par l'appelant. */
const enTete = () => (
  <tr>
    <th scope="col">Ville</th>
    <th scope="col">Département</th>
    <th scope="col">Habitants</th>
  </tr>
);

const corps = ({ row }: { row: Ville }) => (
  <tr>
    <td>{row.nom}</td>
    <td>{row.departement}</td>
    <td>{nombre(row.habitants)}</td>
  </tr>
);

const meta: Meta<UiTableProps<Ville>> = {
  title: 'Components/ui/table/ui-table',
  component: UiTable,
  args: {
    value: VILLES,
    dataKey: 'id',
    size: 'default',
    showGridlines: false,
    stripedRows: false,
    rowHover: false,
    loading: false,
  },
  argTypes: {
    value: { control: false },
    frozenValue: { control: false },
    selection: { control: false },
    sort: { control: false },
    renderHeader: { control: false },
    renderBody: { control: false },
    renderFooter: { control: false },
    renderCaption: { control: false },
    renderEmpty: { control: false },
    renderExpandedRow: { control: false },
    size: { control: 'inline-radio', options: ['default', 'small', 'large'] },
    selectionMode: { control: 'inline-radio', options: [null, 'single', 'multiple'] },
    sortMode: { control: 'inline-radio', options: ['single', 'multiple'] },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=254-1203',
    },
  },
};

export default meta;
type Story = StoryObj<UiTableProps<Ville>>;

/** L'appelant possède le balisage : de vrais `<tr>`, `<th>` et `<td>`. */
export const Basic: Story = {
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

export const Small: Story = {
  args: { size: 'small' },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

export const Large: Story = {
  args: { size: 'large' },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

export const GridLines: Story = {
  args: { showGridlines: true },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

export const StripedRows: Story = {
  args: { stripedRows: true, rowHover: true },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

// --- Tri -------------------------------------------------------------------
/** `table.sortableColumn(champ)` rend un `<th>` triable, clavier compris. */
const enTeteTriable = (table: UiTableApi<Ville>) => (
  <tr>
    <th {...table.sortableColumn('nom')} scope="col">
      Ville <UiTableSortIcon field="nom" />
    </th>
    <th {...table.sortableColumn('departement')} scope="col">
      Département <UiTableSortIcon field="departement" />
    </th>
    <th {...table.sortableColumn('habitants')} scope="col">
      Habitants <UiTableSortIcon field="habitants" />
    </th>
  </tr>
);

export const SortSingle: Story = {
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTeteTriable} renderBody={corps} />,
};

/** `sortMode="multiple"` compose les tris avec Ctrl ou Cmd au clic. */
export const SortMultiple: Story = {
  args: { sortMode: 'multiple' },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTeteTriable} renderBody={corps} />,
};

/** `defaultSort` amorce le tri sans le contrôler. */
export const SortPresort: Story = {
  args: { defaultSort: { field: 'habitants', order: -1 } },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTeteTriable} renderBody={corps} />,
};

// --- Sélection -------------------------------------------------------------
/** Sélection au clic sur la ligne, une seule à la fois. */
function SelectionDemo({
  mode,
  ...props
}: Partial<UiTableProps<Ville>> & { mode: 'single' | 'multiple' }) {
  const [selection, setSelection] = useState<Ville | Ville[] | null>(
    mode === 'multiple' ? [VILLES[0]!] : VILLES[0]!,
  );
  const choisies = Array.isArray(selection) ? selection : selection ? [selection] : [];

  return (
    <div style={{ display: 'grid', gap: 'var(--units-md)' }}>
      <UiTable<Ville>
        value={VILLES}
        dataKey="id"
        selectionMode={mode}
        selection={selection}
        onSelectionChange={setSelection}
        {...props}
        renderHeader={enTete}
        renderBody={({ row, rowIndex, table }) => (
          <tr {...table.selectableRow(row, rowIndex)}>
            <td>{row.nom}</td>
            <td>{row.departement}</td>
            <td>{nombre(row.habitants)}</td>
          </tr>
        )}
      />
      <p style={{ display: 'flex', gap: 'var(--units-xs)', flexWrap: 'wrap' }}>
        {choisies.length ? (
          choisies.map((ville) => <UiTag key={ville.id} label={ville.nom} level="highlight" />)
        ) : (
          <span>Aucune sélection</span>
        )}
      </p>
    </div>
  );
}

export const SelectionSingle: Story = { render: () => <SelectionDemo mode="single" /> };

/** En multiple : Ctrl bascule, Maj étend, les flèches déplacent le focus. */
export const SelectionMultiple: Story = { render: () => <SelectionDemo mode="multiple" /> };

/** Colonne de cases : `UiTableHeaderCheckbox` coche tout, indéterminée sur une sélection partielle. */
export const SelectionCheckbox: Story = {
  render: () => {
    function Demo() {
      const [selection, setSelection] = useState<Ville | Ville[] | null>([VILLES[1]!]);
      return (
        <UiTable<Ville>
          value={VILLES}
          dataKey="id"
          selectionMode="multiple"
          selection={selection}
          onSelectionChange={setSelection}
          renderHeader={() => (
            <tr>
              <th scope="col" style={{ width: 48 }}>
                <UiTableHeaderCheckbox />
              </th>
              <th scope="col">Ville</th>
              <th scope="col">Habitants</th>
            </tr>
          )}
          renderBody={({ row, rowIndex }) => (
            <tr>
              <td>
                <UiTableCheckbox
                  value={row}
                  index={rowIndex}
                  aria-label={`Sélectionner ${row.nom}`}
                />
              </td>
              <td>{row.nom}</td>
              <td>{nombre(row.habitants)}</td>
            </tr>
          )}
        />
      );
    }
    return <Demo />;
  },
};

/** Colonne de boutons radio, pour une sélection simple explicite. */
export const SelectionRadio: Story = {
  render: () => {
    function Demo() {
      const [selection, setSelection] = useState<Ville | Ville[] | null>(null);
      return (
        <UiTable<Ville>
          value={VILLES}
          dataKey="id"
          selectionMode="single"
          selection={selection}
          onSelectionChange={setSelection}
          renderHeader={() => (
            <tr>
              <th scope="col" style={{ width: 48 }}>
                <span className="sr-only">Choix</span>
              </th>
              <th scope="col">Ville</th>
              <th scope="col">Habitants</th>
            </tr>
          )}
          renderBody={({ row, rowIndex }) => (
            <tr>
              <td>
                <UiTableRadio value={row} index={rowIndex} aria-label={`Choisir ${row.nom}`} />
              </td>
              <td>{row.nom}</td>
              <td>{nombre(row.habitants)}</td>
            </tr>
          )}
        />
      );
    }
    return <Demo />;
  },
};

// --- Pagination ------------------------------------------------------------
/** Le tableau découpe lui-même, et rend la barre de `ui-paginator`. */
export const Pagination: Story = {
  args: { value: BEAUCOUP, paginator: true, defaultRows: 5, rowsPerPageOptions: [5, 10, 20] },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

/** Mode serveur : `value` EST la page, `totalRecords` vient du serveur. */
export const PaginationServer: Story = {
  render: () => {
    function Demo() {
      const [first, setFirst] = useState(0);
      const [rows, setRows] = useState(5);
      // Le « serveur » : ici une simple tranche, mais le tableau n'en sait rien.
      const page = useMemo(() => BEAUCOUP.slice(first, first + rows), [first, rows]);
      return (
        <UiTable<Ville>
          value={page}
          dataKey="id"
          lazy
          paginator
          totalRecords={BEAUCOUP.length}
          first={first}
          onFirstChange={setFirst}
          rows={rows}
          onRowsChange={setRows}
          rowsPerPageOptions={[5, 10]}
          renderHeader={enTete}
          renderBody={corps}
        />
      );
    }
    return <Demo />;
  },
};

// --- Défilement ------------------------------------------------------------
/** `scrollable` avec une hauteur fixe : l'en-tête reste collée. */
export const ScrollVertical: Story = {
  args: { value: BEAUCOUP.slice(0, 30), scrollable: true, scrollHeight: '240px' },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

/** Une largeur minimale sur le `<table>` fait défiler horizontalement. */
export const ScrollHorizontal: Story = {
  args: { scrollable: true, tableStyle: { minWidth: '60rem' } },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

// --- Colonnes et lignes figées ---------------------------------------------
/** `table.frozenColumn()` sur CHAQUE cellule de la colonne, en-tête comprise. */
export const FrozenColumns: Story = {
  args: { scrollable: true, tableStyle: { minWidth: '70rem' }, showGridlines: true },
  render: (args) => (
    <UiTable<Ville>
      {...args}
      renderHeader={(table) => (
        <tr>
          <th {...table.frozenColumn()} scope="col">
            Ville
          </th>
          <th scope="col">Département</th>
          <th scope="col">Habitants</th>
          <th {...table.frozenColumn({ align: 'right' })} scope="col">
            Actions
          </th>
        </tr>
      )}
      renderBody={({ row, table }) => (
        <tr>
          <td {...table.frozenColumn()}>{row.nom}</td>
          <td>{row.departement}</td>
          <td>{nombre(row.habitants)}</td>
          <td {...table.frozenColumn({ align: 'right' })}>
            <UiButton label="Voir" size="small" variant="ghost" />
          </td>
        </tr>
      )}
    />
  ),
};

/** `frozenValue` épingle des lignes au-dessus du corps défilant. */
export const FrozenRows: Story = {
  args: {
    value: BEAUCOUP.slice(0, 30),
    frozenValue: [VILLES[0]!],
    scrollable: true,
    scrollHeight: '240px',
  },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

// --- Dépliage --------------------------------------------------------------
/** `table.rowToggler(row)` sur le bouton, `renderExpandedRow` pour le contenu. */
export const RowExpansion: Story = {
  args: { defaultExpandedRowKeys: { '2': true } },
  render: (args) => (
    <UiTable<Ville>
      {...args}
      renderHeader={() => (
        <tr>
          <th scope="col" style={{ width: 48 }}>
            <span className="sr-only">Détail</span>
          </th>
          <th scope="col">Ville</th>
          <th scope="col">Habitants</th>
        </tr>
      )}
      renderBody={({ row, expanded, table }) => (
        <tr>
          <td>
            <UiButton
              {...table.rowToggler(row)}
              icon={expanded ? 'chevron-down' : 'chevron-right'}
              size="small"
              variant="ghost"
              aria-label={expanded ? `Replier ${row.nom}` : `Déplier ${row.nom}`}
            />
          </td>
          <td>{row.nom}</td>
          <td>{nombre(row.habitants)}</td>
        </tr>
      )}
      renderExpandedRow={({ row }) => (
        <tr className="ui-table-expanded-row">
          <td colSpan={3}>
            {row.nom} est dans le département {row.departement}.
          </td>
        </tr>
      )}
    />
  ),
};

// --- Redimensionnement -----------------------------------------------------
/** `resizableColumns` plus un `<UiTableColumnResizer />` dans chaque `<th>`. */
export const ColumnResize: Story = {
  args: { resizableColumns: true, showGridlines: true },
  render: (args) => (
    <UiTable<Ville>
      {...args}
      renderHeader={(table) => (
        <tr>
          <th {...table.resizableColumn()} scope="col">
            Ville
            <UiTableColumnResizer />
          </th>
          <th {...table.resizableColumn()} scope="col">
            Département
            <UiTableColumnResizer />
          </th>
          <th scope="col">Habitants</th>
        </tr>
      )}
      renderBody={corps}
    />
  ),
};

// --- Réordonnancement ------------------------------------------------------
/** `table.reorderableRow(index)` : le glisser-déposer émet une copie réordonnée. */
export const RowReorder: Story = {
  render: () => {
    function Demo() {
      const [villes, setVilles] = useState(VILLES);
      return (
        <UiTable<Ville>
          value={villes}
          dataKey="id"
          onRowReorder={({ value }) => setVilles(value)}
          renderHeader={enTete}
          renderBody={({ row, rowIndex, table }) => (
            <tr {...table.reorderableRow(rowIndex)}>
              <td>{row.nom}</td>
              <td>{row.departement}</td>
              <td>{nombre(row.habitants)}</td>
            </tr>
          )}
        />
      );
    }
    return <Demo />;
  },
};

// --- Zones libres et états -------------------------------------------------
/** `renderCaption` et `renderFooter` encadrent le tableau. */
export const Slots: Story = {
  render: (args) => (
    <UiTable<Ville>
      {...args}
      renderCaption={() => <strong>Villes de France</strong>}
      renderHeader={enTete}
      renderBody={corps}
      renderFooter={() => (
        <tr>
          <td colSpan={2}>Total</td>
          <td>{nombre(VILLES.reduce((sum, ville) => sum + ville.habitants, 0))}</td>
        </tr>
      )}
    />
  ),
};

/** Sans lignes, le tableau rend un `ui-empty-state` sur toute sa largeur. */
export const EmptyState: Story = {
  args: { value: [] },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

export const Loading: Story = {
  args: { loading: true },
  render: (args) => <UiTable<Ville> {...args} renderHeader={enTete} renderBody={corps} />,
};

// --- Défilement virtuel ----------------------------------------------------
/** Seules les lignes visibles sont rendues, deux lignes d'espacement tenant la barre. */
export const VirtualScroll: Story = {
  args: {
    value: BEAUCOUP,
    scrollable: true,
    scrollHeight: '300px',
    virtualScroll: true,
    virtualScrollItemSize: 44,
  },
  render: (args) => (
    <UiTable<Ville>
      {...args}
      renderHeader={enTete}
      renderBody={({ row }) => (
        <tr style={{ height: 44 }}>
          <td>{row.nom}</td>
          <td>{row.departement}</td>
          <td>{nombre(row.habitants)}</td>
        </tr>
      )}
    />
  ),
};
