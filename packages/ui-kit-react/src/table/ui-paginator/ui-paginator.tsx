'use client';

import { useMemo, type ComponentPropsWithRef, type ReactNode } from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiSelect } from '../../forms/ui-select';

import './ui-paginator.scss';

/** Charge passée à `onPageChange`. */
export interface UiPaginatorPageEvent {
  /** Index de la première ligne de la page. */
  first: number;
  /** Lignes par page. */
  rows: number;
  /** Page courante, indexée à partir de zéro. */
  page: number;
  pageCount: number;
}

/** Contexte passé à `renderPageLink`. */
export interface UiPaginatorPageLinkContext {
  /** Numéro affiché, indexé à partir de un. */
  number: number;
  /** Index de la page, à partir de zéro. */
  page: number;
  /** Vrai pour la page courante. */
  active: boolean;
}

/** Instantané de la pagination, passé aux zones libres et au compte rendu. */
export interface UiPaginatorState {
  /** Rang de la première ligne affichée, à partir de un. Zéro si vide. */
  first: number;
  /** Rang de la dernière ligne affichée. */
  last: number;
  rows: number;
  /** Page courante, indexée à partir de zéro. */
  page: number;
  pageCount: number;
  totalRecords: number;
}

/** Marqueur d'une coupure dans la liste des pages. */
const ELLIPSIS = -1;

type NativeProps = Omit<ComponentPropsWithRef<'nav'>, 'children'>;

export interface UiPaginatorProps extends NativeProps {
  /** Nombre total de lignes, toutes pages confondues. */
  totalRecords?: number;

  /** Lignes par page. Renseignée, le composant est contrôlé sur cette valeur. */
  rows?: number;
  defaultRows?: number;
  onRowsChange?: (rows: number) => void;

  /** Index de la première ligne affichée. Renseigné, le composant est contrôlé. */
  first?: number;
  defaultFirst?: number;
  onFirstChange?: (first: number) => void;

  /** Nombre maximum de boutons de page, en mode fenêtré. */
  pageLinks?: number;
  /** Mode compact : les bords, le voisinage de la page courante, et `…` entre les deux. */
  ellipsis?: boolean;
  /** Pages toujours montrées à chaque bord, en mode compact. */
  boundaryCount?: number;
  /** Choix de lignes par page. Absent, le sélecteur n'est pas rendu. */
  rowsPerPageOptions?: readonly number[];

  /** Afficher les contrôles de première et dernière page. */
  showFirstLastIcon?: boolean;
  /** Afficher les numéros de page. */
  showPageLinks?: boolean;
  /** Afficher le compte rendu de page. */
  showCurrentPageReport?: boolean;
  /**
   * Motif du compte rendu. Marques disponibles : `{first}`, `{last}`, `{rows}`,
   * `{page}`, `{pageCount}`, `{totalRecords}`.
   */
  currentPageReportTemplate?: string;
  disabled?: boolean;
  /**
   * Onde de pression sur les numéros et les boutons de navigation, quand elle est
   * activée. `false` la coupe sur ce paginateur, activation globale comprise.
   */
  ripple?: boolean;

  /** Icônes des contrôles. */
  firstIcon?: ReactNode;
  prevIcon?: ReactNode;
  nextIcon?: ReactNode;
  lastIcon?: ReactNode;
  /** Contenu d'un bouton de page. */
  renderPageLink?: (context: UiPaginatorPageLinkContext) => ReactNode;
  /** Contenu libre avant les contrôles. */
  renderStart?: (state: UiPaginatorState) => ReactNode;
  /** Contenu libre après le sélecteur de lignes. */
  renderEnd?: (state: UiPaginatorState) => ReactNode;
  /** Compte rendu riche, à la place de `currentPageReportTemplate`. */
  renderReport?: (state: UiPaginatorState) => ReactNode;

  /** Émis à chaque changement de pagination, navigation ou lignes par page. */
  onPageChange?: (event: UiPaginatorPageEvent) => void;

  /** Nom accessible du repère de navigation. */
  'aria-label'?: string;
  /** Motif du nom accessible d'un bouton de page. `{page}` est remplacé. */
  pageAriaLabel?: string;
  firstPageAriaLabel?: string;
  prevPageAriaLabel?: string;
  nextPageAriaLabel?: string;
  lastPageAriaLabel?: string;
  /** Nom accessible du sélecteur de lignes par page. */
  rowsPerPageAriaLabel?: string;
}

/**
 * Pages à rendre : des index de page, `ELLIPSIS` pour une coupure.
 */
function buildPageItems(
  pageCount: number,
  current: number,
  ellipsis: boolean,
  pageLinks: number,
  boundaryCount: number,
): number[] {
  if (!ellipsis) {
    // Mode fenêtré : `pageLinks` numéros centrés sur la page courante.
    const visible = Math.min(pageLinks, pageCount);
    const start = Math.max(0, Math.min(current - Math.floor(visible / 2), pageCount - visible));
    return Array.from({ length: visible }, (_, index) => start + index);
  }

  const boundary = Math.max(1, boundaryCount);
  const pages = new Set<number>();
  for (let i = 0; i < Math.min(boundary, pageCount); i += 1) pages.add(i);
  for (let i = Math.max(0, current - 1); i <= Math.min(pageCount - 1, current + 1); i += 1) {
    pages.add(i);
  }
  for (let i = Math.max(0, pageCount - boundary); i < pageCount; i += 1) pages.add(i);

  const items: number[] = [];
  let previous: number | null = null;
  for (const page of [...pages].sort((a, b) => a - b)) {
    if (previous !== null) {
      // Une seule page manquante coûte moins cher à montrer qu'une coupure.
      if (page - previous === 2) items.push(previous + 1);
      else if (page - previous > 2) items.push(ELLIPSIS);
    }
    items.push(page);
    previous = page;
  }
  return items;
}

/**
 * ui-paginator : barre de pagination autonome.
 *
 * Se branche sur n'importe quelle collection : `totalRecords` pour la taille,
 * `rows` pour la page, et `first` pour la position. Les deux dernières suivent
 * le contrat contrôlé du kit, ce qui permet de paginer par programme.
 */
export function UiPaginator({
  totalRecords = 0,
  rows,
  defaultRows = 10,
  onRowsChange,
  first,
  defaultFirst = 0,
  onFirstChange,
  pageLinks = 5,
  ellipsis = false,
  boundaryCount = 3,
  rowsPerPageOptions,
  showFirstLastIcon = true,
  showPageLinks = true,
  showCurrentPageReport = false,
  currentPageReportTemplate = '{first} - {last} sur {totalRecords}',
  disabled = false,
  ripple = true,
  firstIcon,
  prevIcon,
  nextIcon,
  lastIcon,
  renderPageLink,
  renderStart,
  renderEnd,
  renderReport,
  onPageChange,
  pageAriaLabel = 'Page {page}',
  firstPageAriaLabel = 'Première page',
  prevPageAriaLabel = 'Page précédente',
  nextPageAriaLabel = 'Page suivante',
  lastPageAriaLabel = 'Dernière page',
  rowsPerPageAriaLabel = 'Lignes par page',
  className,
  'aria-label': ariaLabel = 'Pagination',
  ...rest
}: UiPaginatorProps) {
  const [rowsValue, setRows] = useControllableState<number>({
    value: rows,
    defaultValue: defaultRows,
    onChange: onRowsChange,
  });
  const [firstValue, setFirst] = useControllableState<number>({
    value: first,
    defaultValue: defaultFirst,
    onChange: onFirstChange,
  });

  // Une page vide reste une page : `pageCount` ne descend jamais sous 1, sinon
  // la barre n'aurait aucun bouton et la page courante serait hors bornes.
  const perPage = Math.max(1, rowsValue);
  const pageCount = Math.max(1, Math.ceil(totalRecords / perPage));
  // Écrêté : les données peuvent rétrécir sous le curseur, et `first` pointerait
  // alors au delà de la dernière page.
  const clampedFirst = Math.min(Math.max(0, firstValue), (pageCount - 1) * perPage);
  const currentPage = Math.floor(clampedFirst / perPage);

  const pageItems = useMemo(
    () => buildPageItems(pageCount, currentPage, ellipsis, pageLinks, boundaryCount),
    [pageCount, currentPage, ellipsis, pageLinks, boundaryCount],
  );

  const state: UiPaginatorState = {
    first: totalRecords === 0 ? 0 : clampedFirst + 1,
    last: Math.min(clampedFirst + perPage, totalRecords),
    rows: perPage,
    page: currentPage,
    pageCount,
    totalRecords,
  };

  const reportText = currentPageReportTemplate
    .replace('{first}', String(state.first))
    .replace('{last}', String(state.last))
    .replace('{rows}', String(state.rows))
    .replace('{page}', String(state.page + 1))
    .replace('{pageCount}', String(state.pageCount))
    .replace('{totalRecords}', String(state.totalRecords));

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage >= pageCount - 1;

  const goToPage = (page: number) => {
    const target = Math.min(Math.max(0, page), pageCount - 1);
    const nextFirst = target * perPage;
    if (nextFirst === firstValue) return;
    setFirst(nextFirst);
    onPageChange?.({ first: nextFirst, rows: perPage, page: target, pageCount });
  };

  const changeRowsPerPage = (next: unknown) => {
    const value = Number(next);
    if (!Number.isFinite(value) || value <= 0 || value === perPage) return;
    setRows(value);
    setFirst(0);
    // Le nombre de pages est recalculé ici : celui du rendu courant vaut encore
    // pour l'ancienne taille de page.
    onPageChange?.({
      first: 0,
      rows: value,
      page: 0,
      pageCount: Math.max(1, Math.ceil(totalRecords / value)),
    });
  };

  const control = (
    label: string,
    icon: ReactNode,
    fallback: string,
    inactive: boolean,
    target: number,
  ) => (
    <button
      type="button"
      className="ui-paginator-control"
      disabled={disabled || inactive}
      data-ripple={ripple ? 'on' : 'off'}
      aria-label={label}
      onClick={() => goToPage(target)}
    >
      {icon ?? <UiIcon name={fallback} size="sm" />}
    </button>
  );

  return (
    <nav {...rest} className={cx('ui-paginator', className)} aria-label={ariaLabel}>
      {renderStart && <div className="ui-paginator-start">{renderStart(state)}</div>}

      <div className="ui-paginator-content">
        {showCurrentPageReport && (
          <span className="ui-paginator-report">
            {renderReport ? renderReport(state) : reportText}
          </span>
        )}

        {showFirstLastIcon && control(firstPageAriaLabel, firstIcon, 'angles-left', isFirstPage, 0)}
        {control(prevPageAriaLabel, prevIcon, 'chevron-left', isFirstPage, currentPage - 1)}

        {showPageLinks && (
          <div className="ui-paginator-pages">
            {pageItems.map((item, index) =>
              item === ELLIPSIS ? (
                // Décoratif : la coupure n'apporte rien à qui écoute la page.
                <span
                  // Une coupure n'a pas d'identité propre, et deux d'entre elles
                  // peuvent coexister : sa position est sa seule clé stable.
                  key={`gap-${index}`}
                  className="ui-paginator-ellipsis"
                  aria-hidden="true"
                >
                  &hellip;
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={cx('ui-paginator-page', item === currentPage && '_current')}
                  disabled={disabled}
                  data-ripple={ripple ? 'on' : 'off'}
                  aria-label={pageAriaLabel.replace('{page}', String(item + 1))}
                  aria-current={item === currentPage ? 'page' : undefined}
                  onClick={() => goToPage(item)}
                >
                  {renderPageLink
                    ? renderPageLink({
                        number: item + 1,
                        page: item,
                        active: item === currentPage,
                      })
                    : item + 1}
                </button>
              ),
            )}
          </div>
        )}

        {control(nextPageAriaLabel, nextIcon, 'chevron-right', isLastPage, currentPage + 1)}
        {showFirstLastIcon &&
          control(lastPageAriaLabel, lastIcon, 'angles-right', isLastPage, pageCount - 1)}
      </div>

      {rowsPerPageOptions && rowsPerPageOptions.length > 0 && (
        <div className="ui-paginator-rows">
          <UiSelect
            size="small"
            options={rowsPerPageOptions}
            value={perPage}
            disabled={disabled}
            aria-label={rowsPerPageAriaLabel}
            onValueChange={changeRowsPerPage}
          />
        </div>
      )}

      {renderEnd && <div className="ui-paginator-end">{renderEnd(state)}</div>}
    </nav>
  );
}
