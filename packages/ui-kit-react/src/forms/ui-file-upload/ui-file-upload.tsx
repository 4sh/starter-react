'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type DragEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiButton } from '../../actions/ui-button';
import { UiIcon } from '../../base/ui-icon';
import { formatLabel } from '../../core/forms';
import { cx } from '../../core/utils';

import { UiFileUploadList } from './ui-file-upload-list';
import {
  isFileTypeAccepted,
  isImageFile,
  type UiUploadErrorEvent,
  type UiUploadEvent,
  type UiUploadFile,
  type UiUploadHandlerEvent,
} from './ui-file-upload.model';

import './ui-file-upload.scss';

export type UiFileUploadMode = 'field' | 'drag';
export type UiFileUploadSize = 'default' | 'small';

/** Ce que reçoit `renderFile` pour rendre une ligne de fichier à sa façon. */
export interface UiFileUploadFileContext {
  remove: (file: UiUploadFile) => void;
}

/** Ce que reçoit `renderContent` pour rendre toute la section des fichiers. */
export interface UiFileUploadContentContext {
  remove: (file: UiUploadFile) => void;
  clear: () => void;
}

/** Ce que reçoit `renderToolbar` pour rendre la barre d'actions. */
export interface UiFileUploadToolbarContext {
  choose: () => void;
  upload: () => void;
  clear: () => void;
}

export interface UiFileUploadProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onDragOver' | 'onDragLeave' | 'onDrop'
> {
  // --- Disposition ---------------------------------------------------------
  /** `field` : champ compact et bouton Parcourir ; `drag` : zone de dépôt complète. */
  mode?: UiFileUploadMode;
  size?: UiFileUploadSize;

  // --- Sélection -----------------------------------------------------------
  /**
   * Nom sous lequel la sélection part avec le formulaire natif qui entoure le
   * composant. Tous les fichiers de la liste sont soumis, un désactivé ne l'est pas.
   */
  name?: string;
  /** Autorise plusieurs fichiers. */
  multiple?: boolean;
  /** Filtre natif, par exemple `image/*,.pdf`. Appliqué aussi au dépôt. */
  accept?: string;
  /** Taille maximale par fichier, en octets. */
  maxFileSize?: number;
  /** Nombre maximal de fichiers gardés en même temps. */
  fileLimit?: number;
  disabled?: boolean;

  // --- Envoi ---------------------------------------------------------------
  /** Envoie chaque fichier dès sa sélection. */
  auto?: boolean;
  /** Délègue l'envoi à `onCustomUpload` au lieu de la requête intégrée. */
  customUpload?: boolean;
  /** Adresse de l'envoi intégré. */
  url?: string;
  /** Méthode HTTP de l'envoi intégré. */
  method?: 'post' | 'put';
  /** Nom du champ de chaque fichier dans le corps multipart. */
  fieldName?: string;
  /** Joint les cookies à la requête intégrée. */
  withCredentials?: boolean;

  // --- Présentation et libellés ---------------------------------------------
  /** Affiche la liste des fichiers sous le contrôle. */
  showFileList?: boolean;
  /** Affiche les actions Téléverser et Effacer (mode `drag`). */
  showControls?: boolean;
  /**
   * Onde de pression sur la zone de dépôt et sur les actions de la barre, quand
   * elle est activée. `false` la coupe, activation globale comprise.
   */
  ripple?: boolean;
  browseLabel?: string;
  /** Texte indicatif du mode `field`, tant qu'aucun fichier n'est choisi. */
  chooseLabel?: string;
  uploadLabel?: string;
  cancelLabel?: string;
  /** Lien de la zone de dépôt. */
  dragLinkLabel?: string;
  /** Invitation de la zone de dépôt. */
  dragPromptLabel?: string;
  /** Petite indication sous l'invitation, par exemple « JPG, PNG (max 5 Mo) ». */
  hint?: string;
  /**
   * Nom accessible du contrôle, posé sur le champ natif. La valeur par défaut
   * n'est pas vide : la zone de dépôt a toujours besoin d'un nom.
   */
  'aria-label'?: string;
  /** Résumé du mode `field` quand il y a plusieurs fichiers. `{0}` est leur nombre. */
  filesSummaryLabel?: string;
  /** Refus : type non autorisé. `{0}` est le nom du fichier. */
  invalidTypeMessage?: string;
  /** Refus : fichier trop volumineux. `{0}` est le nom du fichier. */
  invalidSizeMessage?: string;
  /** Refus : `fileLimit` atteint. `{0}` est la limite. */
  limitReachedMessage?: string;
  /** Échec d'envoi sans message du serveur. */
  uploadErrorMessage?: string;
  /** Échec d'envoi au niveau du réseau. */
  networkErrorMessage?: string;
  /** Réponse hors 2xx. `{0}` est le statut HTTP. */
  httpErrorMessage?: string;

  // --- Rendus personnalisés -------------------------------------------------
  /** Remplace une ligne de fichier. */
  renderFile?: (file: UiUploadFile, context: UiFileUploadFileContext) => ReactNode;
  /** Remplace toute la section des fichiers. Prioritaire sur `renderFile`. */
  renderContent?: (files: UiUploadFile[], context: UiFileUploadContentContext) => ReactNode;
  /** Remplace la barre d'actions (mode `drag`). */
  renderToolbar?: (files: UiUploadFile[], context: UiFileUploadToolbarContext) => ReactNode;

  // --- Notifications ----------------------------------------------------------
  /** Des fichiers validés viennent d'entrer dans la sélection. */
  onFilesSelect?: (added: UiUploadFile[]) => void;
  /** La sélection a changé. Reçoit la sélection complète. */
  onFilesChange?: (files: UiUploadFile[]) => void;
  /** Un envoi délégué est demandé (`customUpload`). */
  onCustomUpload?: (event: UiUploadHandlerEvent) => void;
  /** L'envoi intégré d'un fichier a abouti. */
  onUploadComplete?: (event: UiUploadEvent) => void;
  /** Un fichier est refusé à la validation, ou son envoi échoue. */
  onUploadError?: (event: UiUploadErrorEvent) => void;
  /** Un fichier est retiré. */
  onRemove?: (file: UiUploadFile) => void;
  /** La sélection est vidée. */
  onClear?: () => void;

  ref?: Ref<HTMLDivElement>;
}

/** Compteur des fichiers : un identifiant stable par fichier, jamais réutilisé. */
let nextUploadId = 0;

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const warned = new Set<string>();

function toUploadFile(file: File): UiUploadFile {
  return {
    id: `uifu-${nextUploadId++}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    status: 'pending',
    progress: 0,
    objectUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
  };
}

function revoke(file: UiUploadFile): void {
  if (file.objectUrl) URL.revokeObjectURL(file.objectUrl);
}

/**
 * ui-file-upload : téléversement de fichiers, en champ compact ou en zone de
 * glisser-déposer.
 *
 * Un `<input type="file">` natif, masqué visuellement, porte la sélection : le
 * sélecteur du système, le clavier et les lecteurs d'écran marchent donc
 * nativement, et tout le composant est aussi une cible de dépôt. La sélection
 * est validée côté client (type, taille, nombre), puis envoyée d'elle-même
 * (`auto`), à la demande, ou par la fonction de l'application (`customUpload`).
 * La progression passe par `XMLHttpRequest`, ce qui n'exige aucun client HTTP.
 *
 * Sécurité : la validation côté client est un confort, le serveur doit
 * revalider. Les aperçus d'image sont des URL d'objet, révoquées au retrait, au
 * remplacement, à l'effacement et au démontage.
 */
export function UiFileUpload({
  mode = 'field',
  size = 'default',
  name,
  multiple = false,
  accept,
  maxFileSize,
  fileLimit,
  disabled = false,
  auto = false,
  customUpload = false,
  url,
  method = 'post',
  fieldName = 'files',
  withCredentials = false,
  showFileList = true,
  showControls = true,
  ripple = true,
  browseLabel = 'Parcourir',
  chooseLabel = 'Choisir un fichier…',
  uploadLabel = 'Téléverser',
  cancelLabel = 'Effacer',
  dragLinkLabel = 'Cliquer pour téléverser',
  dragPromptLabel = 'ou glisser-déposer les fichiers ici',
  hint,
  'aria-label': ariaLabel = 'Téléversement de fichiers',
  filesSummaryLabel = '{0} fichiers',
  invalidTypeMessage = 'Type de fichier non autorisé : {0}',
  invalidSizeMessage = 'Fichier trop volumineux : {0}',
  limitReachedMessage = 'Nombre maximum de fichiers atteint ({0}).',
  uploadErrorMessage = 'Échec du téléversement',
  networkErrorMessage = 'Erreur réseau',
  httpErrorMessage = 'Erreur {0}',
  renderFile,
  renderContent,
  renderToolbar,
  onFilesSelect,
  onFilesChange,
  onCustomUpload,
  onUploadComplete,
  onUploadError,
  onRemove,
  onClear,
  className,
  ref,
  ...rest
}: UiFileUploadProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formValueRef = useRef<HTMLInputElement | null>(null);

  // La sélection vit dans l'état pour le rendu, ET dans une référence pour les
  // lectures synchrones. Les deux sont écrites ensemble, par `commit` seul.
  // Pourquoi les deux : une notification doit recevoir la sélection À JOUR
  // (Angular relit son signal juste après l'avoir écrit), et `auto` enchaîne
  // l'envoi dans le même geste. Un modificateur fonctionnel de `setState` ne
  // peut ni l'un ni l'autre : il s'exécute plus tard, et deux fois en mode
  // strict, ce qui créerait deux fois chaque URL d'objet.
  const [files, setFiles] = useState<UiUploadFile[]>([]);
  const filesRef = useRef<UiUploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  /** Requêtes en cours, par identifiant de fichier, pour pouvoir les annuler. */
  const requests = useRef(new Map<string, XMLHttpRequest>());

  // Les rappels d'une requête tirent longtemps après le rendu qui l'a lancée :
  // ils lisent les props par cette référence, tenue à jour après chaque rendu,
  // pour ne jamais appeler une fonction périmée de l'appelant.
  const latest = useRef({
    onFilesChange,
    onUploadComplete,
    onUploadError,
    uploadErrorMessage,
    networkErrorMessage,
    httpErrorMessage,
  });
  useLayoutEffect(() => {
    latest.current = {
      onFilesChange,
      onUploadComplete,
      onUploadError,
      uploadErrorMessage,
      networkErrorMessage,
      httpErrorMessage,
    };
  });

  const commit = useCallback((next: UiUploadFile[]) => {
    filesRef.current = next;
    setFiles(next);
  }, []);

  /** Remplace les champs d'un fichier, sans toucher aux autres. */
  const patch = useCallback(
    (id: string, changes: Partial<UiUploadFile>) => {
      commit(filesRef.current.map((f) => (f.id === id ? { ...f, ...changes } : f)));
    },
    [commit],
  );

  const current = (id: string, fallback: UiUploadFile): UiUploadFile =>
    filesRef.current.find((f) => f.id === id) ?? fallback;

  // Au démontage, rien ne doit survivre : ni URL d'objet, ni requête en vol.
  useEffect(() => {
    const inFlight = requests.current;
    return () => {
      for (const f of filesRef.current) revoke(f);
      for (const xhr of inFlight.values()) xhr.abort();
      inFlight.clear();
    };
  }, []);

  // Le sélecteur est vidé après chaque choix, pour qu'un nouveau choix du même
  // fichier redéclenche `change` : il ne peut donc pas porter la sélection
  // jusqu'au formulaire. C'est un second champ, caché, qui le fait. Sans lui,
  // un formulaire natif recevait un fichier VIDE (nom '', 0 octet), mesuré.
  useEffect(() => {
    const el = formValueRef.current;
    if (!el) return;
    const data = new DataTransfer();
    for (const f of files) data.items.add(f.file);
    el.files = data.files;
  }, [files, name]);

  // Garde-fou d'accessibilité : le contrôle doit avoir un nom.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (ariaLabel || warned.has(inputId)) return;
    warned.add(inputId);
    console.warn('[ui-file-upload] Renseignez `aria-label` pour nommer le contrôle.');
  }, [ariaLabel, inputId]);

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // --- Envoi ---------------------------------------------------------------

  const uploadFailed = (item: UiUploadFile, message: string) => {
    requests.current.delete(item.id);
    patch(item.id, { status: 'error', error: message });
    latest.current.onUploadError?.({ file: current(item.id, item), reason: 'upload', message });
  };

  const xhrUpload = (item: UiUploadFile, endpoint: string) => {
    const xhr = new XMLHttpRequest();
    requests.current.set(item.id, xhr);
    patch(item.id, { status: 'uploading', progress: 0 });

    const body = new FormData();
    body.append(fieldName, item.file, item.name);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) patch(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
    });
    xhr.addEventListener('load', () => {
      requests.current.delete(item.id);
      if (xhr.status >= 200 && xhr.status < 300) {
        patch(item.id, { status: 'completed', progress: 100 });
        latest.current.onUploadComplete?.({ files: [current(item.id, item)], xhr });
        latest.current.onFilesChange?.(filesRef.current);
      } else {
        uploadFailed(item, formatLabel(latest.current.httpErrorMessage, xhr.status));
      }
    });
    xhr.addEventListener('error', () => uploadFailed(item, latest.current.networkErrorMessage));
    xhr.addEventListener('abort', () => requests.current.delete(item.id));

    xhr.open(method.toUpperCase(), endpoint, true);
    xhr.withCredentials = withCredentials;
    xhr.send(body);
  };

  const emitCustomUpload = (pending: UiUploadFile[]) => {
    for (const f of pending) patch(f.id, { status: 'uploading', progress: 0 });
    onCustomUpload?.({
      files: pending,
      setProgress: (file, progress) =>
        patch(file.id, { status: 'uploading', progress: Math.max(0, Math.min(100, progress)) }),
      markUploaded: (file) => {
        patch(file.id, { status: 'completed', progress: 100 });
        latest.current.onFilesChange?.(filesRef.current);
      },
      markError: (file, msg) => {
        const message = msg ?? latest.current.uploadErrorMessage;
        patch(file.id, { status: 'error', error: message });
        latest.current.onUploadError?.({ file, reason: 'upload', message });
      },
    });
  };

  /** Envoie tous les fichiers en attente, par la requête intégrée ou par l'application. */
  const upload = () => {
    const pending = filesRef.current.filter((f) => f.status === 'pending');
    if (!pending.length) return;

    if (customUpload) {
      emitCustomUpload(pending);
      return;
    }
    if (!url) return;
    for (const f of pending) xhrUpload(f, url);
  };

  // --- Sélection -------------------------------------------------------------
  //
  // `choose`, `upload`, `clear` et `remove` lisent la sélection par sa
  // référence, et sont TRANSMISES aux props de rendu (`renderToolbar`,
  // `renderContent`, `renderFile`). `react-hooks/refs` le signale, faute de
  // pouvoir prouver que l'appelant ne les invoquera pas pendant le rendu. Ce
  // serait un défaut chez lui quelle que soit la conception, une action qui
  // change la sélection n'ayant rien à faire dans un rendu. Même faux positif
  // que `ui-swatch-picker`, et même traitement : une exception par appel.

  /** Ouvre le sélecteur natif. */
  const choose = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  /** Retire un fichier : annule son envoi, révoque son aperçu. */
  const remove = (target: UiUploadFile) => {
    requests.current.get(target.id)?.abort();
    requests.current.delete(target.id);
    revoke(target);
    commit(filesRef.current.filter((f) => f.id !== target.id));
    onRemove?.(target);
    onFilesChange?.(filesRef.current);
  };

  /** Vide toute la sélection. */
  const clear = () => {
    for (const xhr of requests.current.values()) xhr.abort();
    requests.current.clear();
    for (const f of filesRef.current) revoke(f);
    commit([]);
    setMessages([]);
    resetInput();
    onClear?.();
    onFilesChange?.([]);
  };

  const fail = (
    item: UiUploadFile,
    reason: UiUploadErrorEvent['reason'],
    message: string,
    sink: string[],
  ) => {
    revoke(item);
    sink.push(message);
    onUploadError?.({ file: { ...item, status: 'error', error: message }, reason, message });
  };

  /** Valide une liste de fichiers et ajoute ceux qui passent à la sélection. */
  const ingest = (list: FileList | null) => {
    if (!list || !list.length || disabled) return;

    const added: UiUploadFile[] = [];
    const newMessages: string[] = [];
    const existing = filesRef.current;

    for (const file of Array.from(list)) {
      // Un seul fichier : le nouveau remplace l'ancien, donc seul le lot entrant compte.
      if (!multiple && added.length >= 1) break;

      const item = toUploadFile(file);

      if (!isFileTypeAccepted(file, accept)) {
        fail(item, 'type', formatLabel(invalidTypeMessage, file.name), newMessages);
        continue;
      }
      if (maxFileSize != null && file.size > maxFileSize) {
        fail(item, 'size', formatLabel(invalidSizeMessage, file.name), newMessages);
        continue;
      }
      if (fileLimit != null && (multiple ? existing.length : 0) + added.length >= fileLimit) {
        fail(item, 'limit', formatLabel(limitReachedMessage, fileLimit), newMessages);
        continue;
      }
      added.push(item);
    }

    setMessages(newMessages);
    if (!added.length) return;

    if (!multiple) {
      // Remplacement : libérer ce que tenait la sélection précédente.
      for (const previous of existing) {
        requests.current.get(previous.id)?.abort();
        requests.current.delete(previous.id);
        revoke(previous);
      }
    }
    commit(multiple ? [...existing, ...added] : added);
    onFilesSelect?.(added);
    onFilesChange?.(filesRef.current);

    if (auto) upload();
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    ingest(event.target.files);
    // Remis à zéro pour qu'une nouvelle sélection du même fichier redéclenche `change`.
    resetInput();
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    // Ignorer les sorties qui remontent d'un enfant encore dans la zone.
    if (rootRef.current?.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    ingest(event.dataTransfer?.files ?? null);
  };

  // --- Rendu -----------------------------------------------------------------

  const hasFiles = files.length > 0;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const canUpload = !disabled && pendingCount > 0 && (customUpload || !!url);
  const fieldSummary = !hasFiles
    ? chooseLabel
    : files.length === 1
      ? (files[0]?.name ?? chooseLabel)
      : formatLabel(filesSummaryLabel, files.length);
  const buttonSize = size === 'small' ? 'small' : 'default';

  return (
    <div
      {...rest}
      ref={setRootRef}
      className={cx(
        'ui-file-upload',
        `_${mode}`,
        size !== 'default' && `_${size}`,
        dragging && '_dragging',
        disabled && '_disabled',
        className,
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Le vrai contrôle natif, masqué visuellement : clavier et lecteurs d'écran restent natifs. */}
      <input
        ref={inputRef}
        className="ui-file-upload-input"
        type="file"
        id={inputId}
        accept={accept || undefined}
        multiple={multiple}
        disabled={disabled}
        aria-label={ariaLabel || undefined}
        onChange={onInputChange}
      />
      {name && (
        <input
          ref={formValueRef}
          type="file"
          name={name}
          multiple={multiple}
          disabled={disabled}
          hidden
        />
      )}

      {mode === 'field' ? (
        <label
          className="ui-file-upload-field"
          htmlFor={inputId}
          data-ripple={ripple ? 'on' : 'off'}
        >
          <span className={cx('ui-file-upload-field-text', !hasFiles && '_placeholder')}>
            {fieldSummary}
          </span>
          <span className="ui-file-upload-browse" aria-hidden="true">
            {browseLabel}
          </span>
        </label>
      ) : (
        <>
          <label
            className="ui-file-upload-zone"
            htmlFor={inputId}
            data-ripple={ripple ? 'on' : 'off'}
          >
            <UiIcon className="ui-file-upload-zone-icon" name="cloud-arrow-up" size="lg" />
            <span className="ui-file-upload-zone-content">
              <span className="ui-file-upload-zone-title">
                <span className="ui-file-upload-zone-link">{dragLinkLabel}</span>
                <span className="ui-file-upload-zone-prompt">{dragPromptLabel}</span>
              </span>
              {hint && <span className="ui-file-upload-zone-hint">{hint}</span>}
            </span>
          </label>

          {renderToolbar ? (
            <div className="ui-file-upload-toolbar">
              {/* eslint-disable-next-line react-hooks/refs -- actions transmises, voir « Sélection » */}
              {renderToolbar(files, { choose, upload, clear })}
            </div>
          ) : (
            showControls &&
            hasFiles && (
              <div className="ui-file-upload-toolbar">
                {!auto && (
                  <UiButton
                    ripple={ripple}
                    label={uploadLabel}
                    size={buttonSize}
                    icon="cloud-arrow-up"
                    disabled={!canUpload}
                    onClick={upload}
                  />
                )}
                <UiButton
                  ripple={ripple}
                  label={cancelLabel}
                  level="low"
                  size={buttonSize}
                  icon="xmark"
                  onClick={clear}
                />
              </div>
            )
          )}
        </>
      )}

      {renderContent ? (
        <div className="ui-file-upload-content">
          {/* eslint-disable-next-line react-hooks/refs -- actions transmises, voir « Sélection » */}
          {renderContent(files, { remove, clear })}
        </div>
      ) : (
        showFileList &&
        hasFiles && (
          <ul className="ui-file-upload-content" role="list">
            {/* eslint-disable-next-line react-hooks/refs -- actions transmises, voir « Sélection » */}
            {files.map((f) => (
              <li key={f.id} className="ui-file-upload-item">
                {renderFile ? (
                  renderFile(f, { remove })
                ) : (
                  <UiFileUploadList file={f} size={size} onRemove={remove} />
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {messages.length > 0 && (
        <div className="ui-file-upload-messages" role="alert" aria-live="assertive">
          {messages.map((msg) => (
            <p key={msg} className="ui-file-upload-message">
              {msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
