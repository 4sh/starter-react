import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiTag } from '../../informative/ui-tag';

import { UiPaginator, type UiPaginatorProps } from './ui-paginator';

const meta: Meta<UiPaginatorProps> = {
  title: 'Components/ui/table/ui-paginator',
  component: UiPaginator,
  args: {
    totalRecords: 120,
    defaultRows: 10,
    pageLinks: 5,
    ellipsis: false,
    boundaryCount: 3,
    showFirstLastIcon: true,
    showPageLinks: true,
    showCurrentPageReport: false,
    disabled: false,
  },
  argTypes: {
    rows: { control: false },
    first: { control: false },
    rowsPerPageOptions: { control: false },
    renderPageLink: { control: false },
    renderStart: { control: false },
    renderEnd: { control: false },
    renderReport: { control: false },
    firstIcon: { control: false },
    prevIcon: { control: false },
    nextIcon: { control: false },
    lastIcon: { control: false },
    totalRecords: { control: { type: 'number', min: 0, step: 10 } },
    pageLinks: { control: { type: 'number', min: 1, max: 11 } },
    boundaryCount: { control: { type: 'number', min: 1, max: 5 } },
  },
  parameters: {
    layout: 'padded',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=252-4636',
    },
  },
};

export default meta;
type Story = StoryObj<UiPaginatorProps>;

/** Le cas courant : 120 lignes par pages de 10. */
export const Basic: Story = {};

/** `rowsPerPageOptions` ajoute le sélecteur de lignes par page, un `ui-select`. */
export const RowsPerPage: Story = {
  args: { rowsPerPageOptions: [10, 25, 50], showCurrentPageReport: true },
};

/** En mode fenêtré, `pageLinks` numéros glissent autour de la page courante. */
export const ManyPages: Story = {
  args: { totalRecords: 950, defaultRows: 10, pageLinks: 7 },
};

/** `ellipsis` replie la liste sur ses bords et le voisinage de la page courante. */
export const Ellipsis: Story = {
  args: { totalRecords: 320, ellipsis: true },
};

/** Au milieu d'une longue liste, les deux coupures apparaissent. */
export const EllipsisMiddle: Story = {
  args: { totalRecords: 320, ellipsis: true, defaultFirst: 150 },
};

/** Le compte rendu résout ses marques depuis l'état courant. */
export const CurrentPageReport: Story = {
  args: {
    showCurrentPageReport: true,
    currentPageReportTemplate: 'Page {page} sur {pageCount}, lignes {first} à {last}',
  },
};

/** Barre compacte : ni numéros, ni contrôles de bord. */
export const Compact: Story = {
  args: { showPageLinks: false, showFirstLastIcon: false, showCurrentPageReport: true },
};

/** `renderPageLink` remplace le contenu d'un numéro, `renderStart` et `renderEnd` encadrent. */
export const Slots: Story = {
  args: {
    totalRecords: 60,
    renderStart: (state) => <span>{state.totalRecords} résultats</span>,
    renderEnd: (state) => <UiTag label={`page ${state.page + 1}/${state.pageCount}`} />,
    renderPageLink: ({ number, active }) => <span>{active ? `[${number}]` : number}</span>,
  },
};

/** Les icônes des quatre contrôles sont remplaçables. */
export const CustomIcons: Story = {
  args: {
    firstIcon: <span aria-hidden="true">«</span>,
    prevIcon: <span aria-hidden="true">‹</span>,
    nextIcon: <span aria-hidden="true">›</span>,
    lastIcon: <span aria-hidden="true">»</span>,
  },
};

/** Contrôlé : la position et la taille de page vivent chez l'appelant. */
function ControlledDemo(props: UiPaginatorProps) {
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const lignes = Array.from({ length: 120 }, (_, index) => `Ligne ${index + 1}`);

  return (
    <div style={{ display: 'grid', gap: 'var(--units-md)' }}>
      <ul style={{ margin: 0, paddingLeft: 'var(--units-lg)' }}>
        {lignes.slice(first, first + rows).map((ligne) => (
          <li key={ligne}>{ligne}</li>
        ))}
      </ul>
      <UiPaginator
        {...props}
        totalRecords={lignes.length}
        first={first}
        onFirstChange={setFirst}
        rows={rows}
        onRowsChange={setRows}
        rowsPerPageOptions={[5, 10, 20]}
        showCurrentPageReport
      />
    </div>
  );
}

export const Controlled: Story = { render: (args) => <ControlledDemo {...args} /> };

/** `disabled` neutralise toute la barre, sélecteur compris. */
export const Disabled: Story = {
  args: { disabled: true, rowsPerPageOptions: [10, 25, 50], showCurrentPageReport: true },
};

/** Une seule page : les quatre contrôles sont inertes, et c'est le bon état. */
export const SinglePage: Story = {
  args: { totalRecords: 6 },
};
