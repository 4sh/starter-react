// =====================================================================
// Modèle partagé par ui-file-upload et sa ligne de fichier
// (ui-file-upload-list). Rien ici ne rend : types et fonctions pures.
// =====================================================================

/** Cycle de vie d'un fichier sélectionné. */
export type UiUploadStatus = 'pending' | 'uploading' | 'completed' | 'error';

/** Un fichier de la sélection, avec son état de validation et d'envoi. */
export interface UiUploadFile {
  /** Identifiant stable, conservé d'un rendu à l'autre. */
  readonly id: string;
  /** Le `File` du navigateur. */
  readonly file: File;
  /** Nom du fichier, repris du `File` pour le rendu. */
  readonly name: string;
  /** Taille en octets. */
  readonly size: number;
  /** Type MIME annoncé par le navigateur. */
  readonly type: string;
  /** État courant. */
  readonly status: UiUploadStatus;
  /** Progression de 0 à 100, qui n'a de sens que pendant `uploading`. */
  readonly progress: number;
  /** URL d'objet de l'aperçu d'une image. Le composant la révoque au retrait. */
  readonly objectUrl?: string;
  /** Message de validation ou d'envoi, quand `status` vaut `error`. */
  readonly error?: string;
}

/** Ce que reçoit `onCustomUpload`, quand l'envoi est délégué (`customUpload`). */
export interface UiUploadHandlerEvent {
  /** Les fichiers à envoyer (ceux qui étaient en attente). */
  files: UiUploadFile[];
  /** Marque un fichier comme envoyé : état `completed`, progression 100. */
  markUploaded: (file: UiUploadFile) => void;
  /** Marque un fichier en échec, avec un message facultatif. */
  markError: (file: UiUploadFile, message?: string) => void;
  /** Met à jour la progression d'un fichier (0 à 100). */
  setProgress: (file: UiUploadFile, progress: number) => void;
}

/** Émis quand l'envoi intégré d'un fichier aboutit. */
export interface UiUploadEvent {
  files: UiUploadFile[];
  /** La requête brute, pour lire la réponse du serveur. */
  xhr?: XMLHttpRequest;
}

/** Émis sur un refus de validation ou un échec d'envoi. */
export interface UiUploadErrorEvent {
  file: UiUploadFile;
  reason: 'type' | 'size' | 'limit' | 'upload';
  message: string;
}

/** Taille lisible (« 2.5 MB »), en base 1024. */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

/**
 * Le `File` correspond-il au filtre `accept` (« image/*,.pdf ») ?
 * Un filtre vide ou absent accepte tout.
 */
export function isFileTypeAccepted(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const patterns = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!patterns.length) return true;

  const name = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();

  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return name.endsWith(pattern); // extension
    if (pattern.endsWith('/*')) return mime.startsWith(pattern.slice(0, -1)); // « image/ »
    return mime === pattern; // type MIME exact
  });
}

/** Le `File` est-il une image dont on peut montrer l'aperçu ? */
export function isImageFile(file: File): boolean {
  return /^image\//.test(file.type);
}
