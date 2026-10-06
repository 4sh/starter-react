import { loadManifest } from '../data';
import { jsonResult } from './result';

export const GET_SHARED_CONFIG_DESCRIPTION =
  'Retourne les réglages structurels partagés par tout le kit (`_ui-config.scss`) : ' +
  "épaisseur de l'anneau de focus, bordure et taille des contrôles, transitions… Pour " +
  'chacun, son rôle, le hook `--ui-*` qui le surcharge au runtime et sa valeur par défaut. ' +
  'Ne pas confondre avec le theming (couleurs, marque, clair/sombre), porté par les jetons.';

export function getSharedConfig() {
  const { groups, settings } = loadManifest().sharedConfig;
  return jsonResult({ groups, settings });
}
