'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { UiIcon } from '../ui-icon';
import { UiSpinner } from '../../informative/ui-spinner';
import type { UiThemeMode } from '../../core/theming';
import { cx } from '../../core/utils';

import { inlineSvgToReact } from './ui-image-svg';
import { UiImagePreview } from './ui-image-preview';

import './ui-image.scss';

interface ModeMap {
  base?: string;
  light?: string;
  dark?: string;
}
type ThemeMap = Record<string, ModeMap>;
/** nom de fichier → { marque ou `common` → { base, light ou dark → extension } }. */
export type UiImageAssetsMap = Record<string, ThemeMap>;

/** Ce que l'application fournit à `ui-image` : ses images locales, et son fetch. */
export interface UiImageConfig {
  /**
   * Les images locales disponibles, celles que la prop `name` résout.
   *
   * Le kit ne peut pas connaître les images d'un projet : la table est donc
   * fournie, pas embarquée. Sans elle, `name` ne résout rien et le composant
   * retombe sur sa vignette ; `src` continue de marcher.
   */
  assets?: UiImageAssetsMap;
  /**
   * Comment aller chercher une image `secured`.
   *
   * Là où le kit Angular s'appuie sur `HttpClient`, donc sur les intercepteurs
   * de l'application, React n'a pas de client HTTP injecté : c'est l'application
   * qui passe sa fonction, celle qui sait poser son jeton. Par défaut, un
   * `fetch` nu.
   */
  fetchSecured?: (url: string, init: RequestInit) => Promise<Blob>;
}

const UiImageContext = createContext<UiImageConfig>({});

export interface UiImageProviderProps extends UiImageConfig {
  children?: ReactNode;
}

/**
 * Fournit à `ui-image` la table des images locales du projet, et au besoin le
 * fetch de ses images protégées.
 *
 * @example
 * ```tsx
 * import assets from './assets/assets-map.json';
 *
 * <UiImageProvider assets={assets} fetchSecured={monFetchAuthentifie}>
 *   <App />
 * </UiImageProvider>;
 * ```
 */
export function UiImageProvider({ assets, fetchSecured, children }: UiImageProviderProps) {
  const value = useMemo(() => ({ assets, fetchSecured }), [assets, fetchSecured]);
  return <UiImageContext.Provider value={value}>{children}</UiImageContext.Provider>;
}

/**
 * Le mode et la marque, lus sur `<html>` plutôt que par le fournisseur de thème.
 *
 * C'est là que `UiThemeProvider` les pose, et c'est aussi ce que lisent les
 * jetons : lire l'attribut marche donc partout, y compris quand un script
 * d'amorçage ou la barre d'outils de Storybook l'a posé sans passer par le
 * fournisseur. Une image ne doit pas exiger un fournisseur pour afficher une URL
 * distante.
 */
function subscribeToRoot(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-brand'],
  });
  return () => observer.disconnect();
}

const DEFAULT_APPEARANCE = 'light|brand1';

function rootSnapshot(): string {
  const root = document.documentElement;
  return `${root.getAttribute('data-theme') ?? 'light'}|${root.getAttribute('data-brand') ?? 'brand1'}`;
}

const serverSnapshot = () => DEFAULT_APPEARANCE;

function useAppearance(): { mode: UiThemeMode; brand: string } {
  const snapshot = useSyncExternalStore(subscribeToRoot, rootSnapshot, serverSnapshot);
  const [mode, brand] = snapshot.split('|');
  return { mode: mode === 'dark' ? 'dark' : 'light', brand: brand || 'brand1' };
}

/** Charge déjà faite : la même URL n'est cherchée qu'une fois, logos compris. */
const SVG_CACHE = new Map<string, string>();

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

/** Le chemin d'une image locale, pour une marque et un mode donnés. */
function buildPath(
  folder: string,
  variants: ModeMap,
  mode: UiThemeMode,
  filename: string,
): string | null {
  if (variants[mode]) return `assets/img/${folder}/${variants[mode]}/${mode}/${filename}`;
  if (variants.base) return `assets/img/${folder}/${variants.base}/${filename}`;
  return null;
}

function resolveLocal(
  assets: UiImageAssetsMap,
  filename: string | undefined,
  mode: UiThemeMode,
  brand: string,
): string {
  if (!filename) return '';
  const entry = assets[filename];
  if (!entry) return '';
  if (entry[brand]) {
    const path = buildPath(brand, entry[brand], mode, filename);
    if (path) return path;
  }
  if (entry['common']) return buildPath('common', entry['common'], mode, filename) ?? '';
  return '';
}

type NativeProps = Omit<ComponentPropsWithRef<'div'>, 'children'>;

export interface UiImageProps extends NativeProps {
  /** Clé d'une image locale, résolue selon le mode et la marque. */
  name?: string;
  /** URL distante ou absolue. Elle gagne sur `name`. */
  src?: string;
  /** Image locale affichée quand la principale échoue. */
  fallback?: string;
  alt?: string;
  /** Charger l'image sans attendre, pour ce qui est visible d'emblée. */
  priority?: boolean;
  /** L'image remplit son conteneur au lieu de porter ses propres dimensions. */
  fill?: boolean;
  width?: string | number;
  widthUnit?: string;
  height?: string | number;
  heightUnit?: string;

  /**
   * Aller chercher `src` par la fonction de l'application plutôt que de laisser
   * le navigateur le charger.
   *
   * C'est ce dont a besoin un point d'accès derrière un en-tête
   * d'autorisation : un `<img src>` est une requête ordinaire du navigateur,
   * qui ne porte ni intercepteur ni jeton. Le `Blob` reçu est affiché par une
   * URL d'objet, révoquée dès que la source change ou que le composant part.
   */
  secured?: boolean;
  /** Envoyer les cookies avec la requête `secured`. */
  withCredentials?: boolean;
  /** Texte visible de l'indicateur de chargement d'une image protégée. */
  loadingLabel?: string;
  /** Nom accessible de cet indicateur. */
  loadingAriaLabel?: string;

  /** Cliquer l'image ouvre la vue agrandie. */
  preview?: boolean;
  /** Ouverture imposée de cette vue. */
  previewVisible?: boolean;
  onPreviewVisibleChange?: (visible: boolean) => void;
  /** Nom accessible du déclencheur. À défaut, l'`alt` de l'image. */
  previewAriaLabel?: string;
  /** Nom accessible du dialogue d'aperçu. */
  previewDialogAriaLabel?: string;
  zoomStep?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Proposer un téléchargement dans la barre de l'aperçu. */
  downloadable?: boolean;
  downloadName?: string;

  /** Remplace l'indicateur de survol du mode `preview`, la loupe. Décoratif. */
  previewIndicator?: ReactNode;

  /** Notifié avec l'URL fautive quand une image n'a pas pu être chargée. */
  onLoadFailed?: (url: string) => void;
}

/**
 * ui-image : image consciente du thème et de la marque.
 *
 * Trois sources : `name`, une image locale résolue par la table du projet avec
 * ses variantes de mode et de marque ; `src`, une URL distante, qui gagne ; et
 * `src` plus `secured`, qui passe par la fonction de l'application pour porter
 * son autorisation.
 *
 * Un SVG **local** est inliné, ce qui lui fait hériter du CSS et de
 * `currentColor` ; un SVG distant passe toujours par un `<img>`. En cas
 * d'échec, l'image `fallback` prend le relais, puis une vignette.
 */
export function UiImage({
  name,
  src,
  fallback,
  alt,
  priority = false,
  fill = false,
  width,
  widthUnit,
  height,
  heightUnit,
  secured = false,
  withCredentials = false,
  loadingLabel,
  loadingAriaLabel = "Chargement de l'image",
  preview = false,
  previewVisible,
  onPreviewVisibleChange,
  previewAriaLabel,
  previewDialogAriaLabel = "Aperçu de l'image",
  zoomStep = 0.25,
  minZoom = 0.5,
  maxZoom = 4,
  downloadable = false,
  downloadName,
  previewIndicator,
  onLoadFailed,
  className,
  style,
  ...rest
}: UiImageProps) {
  const { assets = {}, fetchSecured } = useContext(UiImageContext);
  const { mode, brand } = useAppearance();

  const isRemote = Boolean(src);
  /** L'inlining est réservé au LOCAL : un SVG distant n'ouvre aucune surface. */
  const isInlineSvg = !isRemote && Boolean(name?.toLowerCase().endsWith('.svg'));
  const isSecured = secured && Boolean(src);

  const localSrc = resolveLocal(assets, name, mode, brand);
  const fallbackSrc = resolveLocal(assets, fallback, mode, brand);

  // --- Source protégée : fetch, puis Blob, puis URL d'objet ------------------
  // Le résultat porte la CLÉ dont il vient, ce qui évite de le remettre à zéro
  // dans un effet : un résultat d'une autre source est simplement ignoré, et
  // « en cours » se déduit de son absence.
  const securedKey = isSecured && src ? src : '';
  const [securedResult, setSecuredResult] = useState<{
    key: string;
    url: string | null;
    failed: boolean;
  }>({ key: '', url: null, failed: false });

  useEffect(() => {
    if (!securedKey) return;

    let url: string | null = null;
    let cancelled = false;
    const init: RequestInit = withCredentials ? { credentials: 'include' } : {};
    const load = fetchSecured
      ? fetchSecured(securedKey, init)
      : fetch(securedKey, init).then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.blob();
        });

    void load
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSecuredResult({ key: securedKey, url, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        setSecuredResult({ key: securedKey, url: null, failed: true });
      });

    // Toute la vie de l'URL d'objet tient ici : créée à l'arrivée du Blob,
    // révoquée avant la source suivante ET au démontage. C'est ce qui empêche
    // une liste d'images protégées de fuir une URL par rendu.
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [securedKey, withCredentials, fetchSecured]);

  const securedSettled = securedKey !== '' && securedResult.key === securedKey;
  const blobUrl = securedSettled ? securedResult.url : null;
  const securedFailed = securedSettled && securedResult.failed;
  const securedLoading = securedKey !== '' && !securedSettled;

  // --- SVG inliné -----------------------------------------------------------
  // Même forme que ci-dessus : le résultat porte son URL, et la charge déjà
  // faite se lit au RENDU plutôt que d'être recopiée dans un état.
  const svgKey = isInlineSvg ? localSrc : '';
  const [svgResult, setSvgResult] = useState<{ key: string; text: string | null }>({
    key: '',
    text: null,
  });

  useEffect(() => {
    if (!svgKey || SVG_CACHE.has(svgKey)) return;

    let cancelled = false;
    void fetch(svgKey)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((text) => {
        SVG_CACHE.set(svgKey, text);
        if (!cancelled) setSvgResult({ key: svgKey, text });
      })
      .catch(() => {
        if (!cancelled) setSvgResult({ key: svgKey, text: null });
      });

    return () => {
      cancelled = true;
    };
  }, [svgKey]);

  const svgRaw =
    svgKey === ''
      ? null
      : (SVG_CACHE.get(svgKey) ?? (svgResult.key === svgKey ? svgResult.text : null));
  const svgFailed = svgKey !== '' && svgResult.key === svgKey && svgResult.text === null;

  const svgContent = useMemo(() => (svgRaw !== null ? inlineSvgToReact(svgRaw) : null), [svgRaw]);

  // --- Échecs ---------------------------------------------------------------
  const primarySrc = isSecured ? (blobUrl ?? '') : src || localSrc;

  // Les drapeaux d'échec se remettent à zéro quand leur URL change : un
  // changement de thème, de marque ou de `src` rejoue donc le chargement.
  const [failedPrimary, setFailedPrimary] = useState('');
  const [failedFallback, setFailedFallback] = useState('');
  const primaryImgFailed = failedPrimary !== '' && failedPrimary === primarySrc;
  const fallbackImgFailed = failedFallback !== '' && failedFallback === fallbackSrc;

  const primaryFailed = isInlineSvg ? svgFailed : securedFailed || primaryImgFailed;
  const showFallback = primaryFailed && Boolean(fallbackSrc) && !fallbackImgFailed;
  const showPlaceholder =
    !securedLoading && (!primarySrc || (primaryFailed && (!fallbackSrc || fallbackImgFailed)));
  const displayedSrc = showFallback ? fallbackSrc : primarySrc;
  /** L'image n'est un déclencheur d'aperçu qu'une fois qu'il y a quoi agrandir. */
  const canPreviewNow = preview && !showPlaceholder && !securedLoading;

  // --- Aperçu ---------------------------------------------------------------
  const [openState, setOpenState] = useState(false);
  const previewControlled = previewVisible !== undefined;
  const previewOpen = (previewControlled ? previewVisible : openState) && canPreviewNow;
  const setPreviewOpen = (next: boolean) => {
    if (!previewControlled) setOpenState(next);
    onPreviewVisibleChange?.(next);
  };

  // Une image protégée qui échoue n'atteint aucun `<img>` : son `onError` ne
  // peut donc pas la signaler.
  useEffect(() => {
    if (securedFailed && src) onLoadFailed?.(src);
    // `onLoadFailed` hors dépendances : recréé à chaque rendu du parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [securedFailed, src]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const say = (key: string, message: string) => {
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(message);
    };
    if (src && name) say(`both:${src}`, '[ui-image] `src` et `name` sont posés : `src` gagne.');
    if (!src && !name) say('none', '[ui-image] Ni `src` ni `name` : la vignette est affichée.');
    if (secured && !src) say('secured', '[ui-image] `secured` sans `src` : rien à aller chercher.');
    if (preview && !alt && !previewAriaLabel) {
      say(
        'preview',
        '[ui-image] `preview` rend un bouton sans nom accessible : renseignez `alt` ou `previewAriaLabel`.',
      );
    }
  }, [src, name, secured, preview, alt, previewAriaLabel]);

  const cssWidth = width != null ? `${width}${widthUnit || 'px'}` : undefined;
  const cssHeight = height != null ? `${height}${heightUnit || 'px'}` : undefined;
  const boxStyle: CSSProperties = { width: cssWidth, height: cssHeight };

  const onImgError = () => {
    if (showFallback) setFailedFallback(fallbackSrc);
    else setFailedPrimary(primarySrc);
    if (displayedSrc) onLoadFailed?.(displayedSrc);
  };

  const media = securedLoading ? (
    <div className="ui-image-placeholder _loading" style={boxStyle}>
      <UiSpinner size="small" label={loadingLabel} aria-label={loadingAriaLabel} />
    </div>
  ) : showPlaceholder ? (
    <div
      className="ui-image-placeholder"
      style={boxStyle}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <UiIcon name="image" />
    </div>
  ) : isInlineSvg && !primaryFailed ? (
    // Le SVG local est converti en éléments React, jamais collé en HTML : c'est
    // ce qui lui fait hériter du CSS sans ouvrir la porte à une injection.
    <div className="ui-image-svg" style={boxStyle}>
      {svgContent}
    </div>
  ) : (
    <img
      className="ui-image"
      src={displayedSrc}
      alt={alt || ''}
      style={fill ? undefined : boxStyle}
      loading={priority ? undefined : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      onError={onImgError}
    />
  );

  return (
    <div {...rest} className={cx('ui-image-root', fill && '_fill', className)} style={style}>
      {canPreviewNow ? (
        <button
          type="button"
          className="ui-image-trigger"
          aria-haspopup="dialog"
          aria-label={previewAriaLabel || alt || undefined}
          onClick={() => setPreviewOpen(true)}
        >
          {media}

          {/* Décoratif : l'affordance est déjà portée par le rôle du bouton et
              par son nom accessible. */}
          <span className="ui-image-indicator" aria-hidden="true">
            {previewIndicator ?? <UiIcon name="magnifying-glass-plus" />}
          </span>
        </button>
      ) : (
        media
      )}

      {canPreviewNow && (
        <UiImagePreview
          visible={previewOpen}
          onVisibleChange={setPreviewOpen}
          src={displayedSrc}
          alt={alt || ''}
          aria-label={previewDialogAriaLabel}
          zoomStep={zoomStep}
          minZoom={minZoom}
          maxZoom={maxZoom}
          downloadable={downloadable}
          downloadName={downloadName}
        />
      )}
    </div>
  );
}
