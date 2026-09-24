'use client';

import type { ComponentPropsWithRef } from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { formatLabel } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiSpinner } from '../../informative/ui-spinner';

import { formatFileSize, type UiUploadFile } from './ui-file-upload.model';

import './ui-file-upload-list.scss';

export type UiFileUploadListSize = 'default' | 'small';

export interface UiFileUploadListProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Le fichier à afficher : nom, taille, état, progression, aperçu. */
  file: UiUploadFile;
  size?: UiFileUploadListSize;
  /** Icône des fichiers qui ne sont pas des images. */
  icon?: string;
  /** Affiche le bouton de retrait. */
  removable?: boolean;
  /** Nom accessible du bouton de retrait. Le nom du fichier y est ajouté. */
  removeAriaLabel?: string;
  /** Texte d'erreur quand le fichier n'en porte pas. */
  failedLabel?: string;
  /** Nom accessible du spinner d'envoi. `{0}` est le nom du fichier. */
  uploadingLabel?: string;
  /** Nom accessible de la barre de progression. `{0}` est le nom du fichier. */
  progressLabel?: string;
  /** Appelé quand le bouton de retrait est activé. */
  onRemove?: (file: UiUploadFile) => void;
}

/**
 * ui-file-upload-list : une ligne de fichier (le nom suit le composant Figma), que
 * `ui-file-upload` empile une par fichier. Présentationnel : vignette ou icône, nom
 * avec taille ou état, bouton de retrait ; pendant l'envoi, un `ui-spinner` remplace
 * l'icône et une barre de progression apparaît en pied de ligne.
 */
export function UiFileUploadList({
  file,
  size = 'default',
  icon = 'file',
  removable = true,
  removeAriaLabel = 'Supprimer le fichier',
  failedLabel = 'Échec',
  uploadingLabel = 'Téléversement de {0}',
  progressLabel = 'Progression du téléversement de {0}',
  onRemove,
  className,
  ...rest
}: UiFileUploadListProps) {
  const isUploading = file.status === 'uploading';
  const isError = file.status === 'error';
  const thumbnail = file.objectUrl ?? null;
  const sizeLabel = formatFileSize(file.size);
  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';

  const infoLabel = isError
    ? (file.error ?? failedLabel)
    : isUploading
      ? `${sizeLabel} · ${Math.round(file.progress)} %`
      : sizeLabel;

  return (
    <div
      {...rest}
      className={cx(
        'ui-file-upload-list',
        size !== 'default' && `_${size}`,
        isError && '_error',
        thumbnail && '_has-thumb',
        className,
      )}
    >
      <div className="ui-file-upload-list-file">
        <span className="ui-file-upload-list-media">
          {isUploading ? (
            <UiSpinner size="small" aria-label={formatLabel(uploadingLabel, file.name)} />
          ) : thumbnail ? (
            <img className="ui-file-upload-list-thumb" src={thumbnail} alt="" />
          ) : (
            <UiIcon name={isError ? 'triangle-exclamation' : icon} size={iconSize} />
          )}
        </span>

        <span className="ui-file-upload-list-infos">
          <span className="ui-file-upload-list-name" title={file.name}>
            {file.name}
          </span>
          <span className="ui-file-upload-list-meta">{infoLabel}</span>
        </span>
      </div>

      {removable && (
        <button
          type="button"
          className="ui-file-upload-list-remove"
          aria-label={`${removeAriaLabel} : ${file.name}`}
          onClick={() => onRemove?.(file)}
        >
          <UiIcon name="trash" size={iconSize} />
        </button>
      )}

      {isUploading && (
        <div
          className="ui-file-upload-list-progress"
          role="progressbar"
          aria-valuenow={file.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={formatLabel(progressLabel, file.name)}
        >
          <span
            className="ui-file-upload-list-progress-bar"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
