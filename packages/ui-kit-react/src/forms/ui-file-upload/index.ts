/*
 * ui-file-upload livre aussi `ui-file-upload-list` : la ligne rend le modèle de
 * fichier de l'envoi, donc les deux partagent un seul point d'entrée (deux
 * points d'entrée formeraient un cycle).
 */

export {
  UiFileUpload,
  type UiFileUploadProps,
  type UiFileUploadMode,
  type UiFileUploadSize,
  type UiFileUploadFileContext,
  type UiFileUploadContentContext,
  type UiFileUploadToolbarContext,
} from './ui-file-upload';
export {
  UiFileUploadList,
  type UiFileUploadListProps,
  type UiFileUploadListSize,
} from './ui-file-upload-list';
export {
  formatFileSize,
  isFileTypeAccepted,
  isImageFile,
  type UiUploadStatus,
  type UiUploadFile,
  type UiUploadHandlerEvent,
  type UiUploadEvent,
  type UiUploadErrorEvent,
} from './ui-file-upload.model';
