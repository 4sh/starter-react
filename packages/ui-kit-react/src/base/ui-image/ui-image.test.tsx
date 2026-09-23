import { useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiImage, UiImageProvider, type UiImageAssetsMap } from './ui-image';

const ASSETS: UiImageAssetsMap = {
  'logo.png': { common: { base: 'logo' } },
  'marque.png': { brand1: { base: 'marque' }, common: { base: 'marque' } },
  'duo.png': { common: { light: 'duo', dark: 'duo' } },
  'vecteur.svg': { common: { base: 'vecteur' } },
  'absent.svg': { common: { base: 'absent' } },
};

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function Host({
  children,
  assets = ASSETS,
  fetchSecured,
}: {
  children: ReactNode;
  assets?: UiImageAssetsMap;
  fetchSecured?: (url: string, init: RequestInit) => Promise<Blob>;
}) {
  return (
    <UiImageProvider assets={assets} fetchSecured={fetchSecured}>
      {children}
    </UiImageProvider>
  );
}

const image = (root: ParentNode) => root.querySelector<HTMLImageElement>('img.ui-image');
const placeholder = (root: ParentNode) => root.querySelector<HTMLElement>('.ui-image-placeholder');

const trueFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = trueFetch;
});

// --- Sources ---------------------------------------------------------------
test('une URL distante est rendue par un img', async () => {
  const screen = await render(
    <Host>
      <UiImage src={PIXEL} alt="Pixel" width={40} height={40} />
    </Host>,
  );

  expect(image(screen.container)).toHaveAttribute('src', PIXEL);
  expect(image(screen.container)).toHaveAttribute('alt', 'Pixel');
});

// Le nom d'une image locale se résout par la table du projet : le kit ne peut
// pas connaître les images d'une application.
test('un nom local se résout par la table fournie', async () => {
  const screen = await render(
    <Host>
      <UiImage name="logo.png" alt="Logo" />
    </Host>,
  );

  expect(image(screen.container)).toHaveAttribute('src', 'assets/img/common/logo/logo.png');
});

test('la marque gagne sur le dossier commun', async () => {
  const screen = await render(
    <Host>
      <UiImage name="marque.png" alt="Marque" />
    </Host>,
  );

  // La marque par défaut est `brand1`.
  expect(image(screen.container)).toHaveAttribute('src', 'assets/img/brand1/marque/marque.png');
});

// Une variante par mode range le fichier dans un sous-dossier : c'est ce qui
// fait suivre l'image au thème.
test('une variante par mode range le fichier par mode', async () => {
  const screen = await render(
    <Host>
      <UiImage name="duo.png" alt="Duo" />
    </Host>,
  );

  expect(image(screen.container)).toHaveAttribute('src', 'assets/img/common/duo/light/duo.png');
});

test('un nom absent de la table retombe sur la vignette', async () => {
  const screen = await render(
    <Host>
      <UiImage name="inconnue.png" alt="Inconnue" />
    </Host>,
  );

  expect(image(screen.container)).toBeNull();
  expect(placeholder(screen.container)).not.toBeNull();
});

test('src gagne sur name', async () => {
  const screen = await render(
    <Host>
      <UiImage src={PIXEL} name="logo.png" alt="Pixel" />
    </Host>,
  );

  expect(image(screen.container)).toHaveAttribute('src', PIXEL);
});

// --- Vignette et repli -----------------------------------------------------
test('sans source, la vignette prend la place et garde son nom', async () => {
  const screen = await render(
    <Host>
      <UiImage alt="Rien" />
    </Host>,
  );

  expect(placeholder(screen.container)).toHaveAttribute('role', 'img');
  expect(placeholder(screen.container)).toHaveAttribute('aria-label', 'Rien');
});

// Sans texte alternatif, la vignette est décorative : l'annoncer comme une
// image sans nom ne dirait rien à personne.
test('sans alt, la vignette est décorative', async () => {
  const screen = await render(
    <Host>
      <UiImage />
    </Host>,
  );

  expect(placeholder(screen.container)).toHaveAttribute('aria-hidden', 'true');
  expect(placeholder(screen.container)).not.toHaveAttribute('role');
});

test('une image en échec passe au repli, puis à la vignette', async () => {
  const onLoadFailed = vi.fn();
  const screen = await render(
    <Host>
      <UiImage
        src="https://example.invalid/absente.png"
        fallback="logo.png"
        alt="Photo"
        onLoadFailed={onLoadFailed}
      />
    </Host>,
  );

  // Le repli est bien TENTÉ, puis échoue à son tour, et il ne reste que la
  // vignette. C'est le second appel qui le prouve : assérer l'état intermédiaire
  // serait une course, les deux échecs pouvant tenir dans la même image.
  await expect.poll(() => placeholder(screen.container)).not.toBeNull();
  expect(onLoadFailed).toHaveBeenCalledWith('https://example.invalid/absente.png');
  expect(onLoadFailed).toHaveBeenCalledWith('assets/img/common/logo/logo.png');
});

test('sans repli, une image en échec laisse la vignette', async () => {
  const screen = await render(
    <Host>
      <UiImage src="https://example.invalid/absente.png" alt="Photo" />
    </Host>,
  );

  await expect.poll(() => placeholder(screen.container)).not.toBeNull();
});

// --- Dimensions ------------------------------------------------------------
test('les dimensions se posent, avec leur unité', async () => {
  const screen = await render(
    <Host>
      <UiImage src={PIXEL} alt="Pixel" width={10} widthUnit="rem" height={4} heightUnit="rem" />
    </Host>,
  );

  expect(image(screen.container)!.style.width).toBe('10rem');
  expect(image(screen.container)!.style.height).toBe('4rem');
});

test('fill fait remplir le conteneur', async () => {
  const screen = await render(
    <Host>
      <div style={{ width: 200, height: 100 }}>
        <UiImage src={PIXEL} alt="Pixel" fill />
      </div>
    </Host>,
  );

  const rect = image(screen.container)!.getBoundingClientRect();
  expect(Math.round(rect.width)).toBe(200);
  expect(Math.round(rect.height)).toBe(100);
});

// Ce qui est visible d'emblée ne doit pas attendre : `priority` retire le
// chargement paresseux et demande la priorité.
test('priority retire le chargement paresseux', async () => {
  const paresseux = await render(
    <Host>
      <UiImage src={PIXEL} alt="Pixel" />
    </Host>,
  );
  const presse = await render(
    <Host>
      <UiImage src={PIXEL} alt="Pixel" priority />
    </Host>,
  );

  expect(image(paresseux.container)).toHaveAttribute('loading', 'lazy');
  expect(image(presse.container)).not.toHaveAttribute('loading');
  expect(image(presse.container)).toHaveAttribute('fetchpriority', 'high');
});

// --- SVG inliné ------------------------------------------------------------
// Un SVG LOCAL est inliné pour hériter du CSS ; un SVG distant passe toujours
// par un `<img>`, ce qui n'ouvre aucune surface d'injection.
test('un svg local est inliné, un svg distant reste une image', async () => {
  globalThis.fetch = vi.fn(
    async () => new Response('<svg viewBox="0 0 10 10"><circle r="4"/></svg>', { status: 200 }),
  ) as typeof fetch;

  const local = await render(
    <Host>
      <UiImage name="vecteur.svg" />
    </Host>,
  );
  await expect.poll(() => local.container.querySelector('.ui-image-svg svg')).not.toBeNull();
  expect(local.container.querySelector('img')).toBeNull();

  const distant = await render(
    <Host>
      <UiImage src="https://example.test/logo.svg" alt="Distant" />
    </Host>,
  );
  expect(distant.container.querySelector('svg')).toBeNull();
  expect(image(distant.container)).toHaveAttribute('src', 'https://example.test/logo.svg');
});

// Une autre image que celle du test précédent : la charge déjà faite vit au
// niveau du module, donc réutiliser le nom ressortirait le balisage en cache.
test('un svg local introuvable retombe sur la vignette', async () => {
  globalThis.fetch = vi.fn(async () => new Response('', { status: 404 })) as typeof fetch;

  const screen = await render(
    <Host>
      <UiImage name="absent.svg" alt="Absent" />
    </Host>,
  );

  await expect.poll(() => placeholder(screen.container)).not.toBeNull();
});

// --- Source protégée -------------------------------------------------------
// Un `<img src>` est une requête ordinaire du navigateur : elle ne porte ni
// intercepteur ni jeton. `secured` passe donc par la fonction de l'application.
test('secured passe par le fetch fourni, et affiche le blob', async () => {
  const fetchSecured = vi.fn(async () => new Blob(['x'], { type: 'image/png' }));

  const screen = await render(
    <Host fetchSecured={fetchSecured}>
      <UiImage src="https://exemple.test/protegee.png" secured alt="Protégée" />
    </Host>,
  );

  await expect.poll(() => image(screen.container)?.getAttribute('src')).toMatch(/^blob:/);
  expect(fetchSecured).toHaveBeenCalledWith('https://exemple.test/protegee.png', {});
});

test('secured signale son échec, qu’aucun img ne pourrait rapporter', async () => {
  const onLoadFailed = vi.fn();
  const screen = await render(
    <Host fetchSecured={() => Promise.reject(new Error('401'))}>
      <UiImage
        src="https://exemple.test/interdite.png"
        secured
        alt="Protégée"
        onLoadFailed={onLoadFailed}
      />
    </Host>,
  );

  await expect.poll(() => placeholder(screen.container)).not.toBeNull();
  expect(onLoadFailed).toHaveBeenCalledWith('https://exemple.test/interdite.png');
});

test('withCredentials voyage jusqu’au fetch', async () => {
  const fetchSecured = vi.fn(async () => new Blob(['x']));

  await render(
    <Host fetchSecured={fetchSecured}>
      <UiImage src="https://exemple.test/session.png" secured withCredentials alt="Session" />
    </Host>,
  );

  await expect.poll(() => fetchSecured.mock.calls.length).toBe(1);
  expect(fetchSecured).toHaveBeenCalledWith('https://exemple.test/session.png', {
    credentials: 'include',
  });
});

test('une image protégée montre un indicateur pendant sa requête', async () => {
  let resolve: (blob: Blob) => void = () => {};
  const screen = await render(
    <Host fetchSecured={() => new Promise<Blob>((r) => (resolve = r))}>
      <UiImage src="https://exemple.test/lente.png" secured alt="Lente" />
    </Host>,
  );

  expect(screen.container.querySelector('.ui-image-placeholder._loading')).not.toBeNull();
  expect(screen.container.querySelector('.ui-spinner')).not.toBeNull();

  resolve(new Blob(['x']));
  await expect.poll(() => screen.container.querySelector('._loading')).toBeNull();
});

// --- Aperçu ----------------------------------------------------------------
test('preview fait de l’image un déclencheur nommé', async () => {
  const screen = await render(
    <Host>
      <UiImage src={PIXEL} alt="Paysage" preview />
    </Host>,
  );
  const bouton = screen.container.querySelector('.ui-image-trigger')!;

  expect(bouton.tagName).toBe('BUTTON');
  expect(bouton).toHaveAttribute('aria-haspopup', 'dialog');
  expect(bouton).toHaveAttribute('aria-label', 'Paysage');
});

test('sans quoi agrandir, il n’y a pas de déclencheur', async () => {
  const screen = await render(
    <Host>
      <UiImage preview alt="Rien" />
    </Host>,
  );

  expect(screen.container.querySelector('.ui-image-trigger')).toBeNull();
});

test('le clic ouvre la vue agrandie dans le calque supérieur', async () => {
  const screen = await render(
    <Host>
      <UiImage src={PIXEL} alt="Paysage" preview />
    </Host>,
  );

  await screen.getByRole('button', { name: 'Paysage' }).click();

  const dialog = document.querySelector<HTMLDialogElement>('.ui-image-preview')!;
  await expect.poll(() => dialog.open).toBe(true);
  expect(dialog.matches(':modal')).toBe(true);
  expect(dialog).toHaveAttribute('aria-label', "Aperçu de l'image");
});

test('l’aperçu s’ouvre aussi par l’appelant', async () => {
  function Controlled() {
    const [open, setOpen] = useState(false);
    return (
      <Host>
        <button type="button" onClick={() => setOpen(true)}>
          Ouvrir
        </button>
        <UiImage
          src={PIXEL}
          alt="Paysage"
          preview
          previewVisible={open}
          onPreviewVisibleChange={setOpen}
        />
      </Host>
    );
  }
  const screen = await render(<Controlled />);

  await screen.getByRole('button', { name: 'Ouvrir' }).click();

  await expect
    .poll(() => document.querySelector<HTMLDialogElement>('.ui-image-preview')?.open)
    .toBe(true);
});

test('l’indicateur de survol se remplace, et reste décoratif', async () => {
  const screen = await render(
    <Host>
      <UiImage src={PIXEL} alt="Paysage" preview previewIndicator={<span>Agrandir</span>} />
    </Host>,
  );
  const indicateur = screen.container.querySelector('.ui-image-indicator')!;

  expect(indicateur).toHaveAttribute('aria-hidden', 'true');
  expect(indicateur).toHaveTextContent('Agrandir');
});

// Une image doit afficher une URL distante sans qu'on ait rien à poser autour :
// le mode et la marque se lisent sur `<html>`, pas dans un fournisseur.
test('sans aucun fournisseur, une URL distante s’affiche quand même', async () => {
  const screen = await render(<UiImage src={PIXEL} alt="Pixel" />);

  expect(image(screen.container)).toHaveAttribute('src', PIXEL);
});

// Le mode vient de l'attribut que le fournisseur, le script d'amorçage ou la
// barre d'outils de Storybook posent sur `<html>`.
test('le mode sombre change l’image résolue', async () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  try {
    const screen = await render(
      <Host>
        <UiImage name="duo.png" alt="Duo" />
      </Host>,
    );
    await expect
      .poll(() => image(screen.container)?.getAttribute('src'))
      .toBe('assets/img/common/duo/dark/duo.png');
  } finally {
    document.documentElement.removeAttribute('data-theme');
  }
});
