import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiFileUpload, type UiFileUploadProps } from './ui-file-upload';
import type { UiUploadFile, UiUploadHandlerEvent } from './ui-file-upload.model';

// --- Fabriques ----------------------------------------------------------------

const image = (name = 'photo.png', bytes = 3) =>
  new File([new Uint8Array(bytes)], name, { type: 'image/png' });
const pdf = (name = 'doc.pdf') => new File(['%PDF'], name, { type: 'application/pdf' });

const input = (root: ParentNode) => root.querySelector<HTMLInputElement>('.ui-file-upload-input')!;
const rows = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('.ui-file-upload-list')];
const names = (root: ParentNode) =>
  rows(root).map((r) => r.querySelector('.ui-file-upload-list-name')!.textContent);

/** Sélection par le champ natif, comme le ferait le sélecteur du système. */
function pick(el: HTMLInputElement, files: File[]) {
  const data = new DataTransfer();
  for (const f of files) data.items.add(f);
  el.files = data.files;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function drag(target: Element, type: string, files: File[] = [], init: DragEventInit = {}) {
  const data = new DataTransfer();
  for (const f of files) data.items.add(f);
  target.dispatchEvent(
    new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data, ...init }),
  );
}

// --- Un faux XMLHttpRequest, pour piloter l'envoi intégré pas à pas ------------

class FakeXhr {
  static all: FakeXhr[] = [];
  method = '';
  url = '';
  withCredentials = false;
  status = 0;
  body: FormData | null = null;
  aborted = false;
  readonly upload = new EventTarget();
  private readonly events = new EventTarget();

  constructor() {
    FakeXhr.all.push(this);
  }
  addEventListener(type: string, fn: EventListener) {
    this.events.addEventListener(type, fn);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  send(body: FormData) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.events.dispatchEvent(new Event('abort'));
  }
  progress(loaded: number, total: number) {
    this.upload.dispatchEvent(
      new ProgressEvent('progress', { lengthComputable: true, loaded, total }),
    );
  }
  respond(status: number) {
    this.status = status;
    this.events.dispatchEvent(new Event('load'));
  }
  fail() {
    this.events.dispatchEvent(new Event('error'));
  }
}

beforeEach(() => {
  FakeXhr.all = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Host(props: Partial<UiFileUploadProps>) {
  return <UiFileUpload {...props} />;
}

// --- Champ natif et nom accessible ---------------------------------------------

test('le champ natif porte le nom accessible, et le libellé le désigne', async () => {
  const screen = await render(<Host accept="image/*" multiple />);
  const el = input(screen.container);

  await expect.element(screen.getByLabelText('Téléversement de fichiers')).toBe(el);
  expect(el).toHaveAttribute('type', 'file');
  expect(el).toHaveAttribute('accept', 'image/*');
  expect(el.multiple).toBe(true);
  expect(screen.container.querySelector('label.ui-file-upload-field')).toHaveAttribute(
    'for',
    el.id,
  );
  expect(screen.container.querySelector('.ui-file-upload-field-text')).toHaveTextContent(
    'Choisir un fichier…',
  );
  expect(screen.container.querySelector('.ui-file-upload-field-text')).toHaveClass('_placeholder');
});

test('sans nom accessible, le composant avertit une fois', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const screen = await render(<Host aria-label="" />);

  expect(input(screen.container)).not.toHaveAttribute('aria-label');
  expect(warn).toHaveBeenCalledTimes(1);
  expect(warn.mock.calls[0]![0]).toContain('[ui-file-upload]');
});

// --- Sélection -------------------------------------------------------------------

test('une sélection entre dans la liste et le résumé, et notifie la sélection à jour', async () => {
  const onFilesSelect = vi.fn();
  const onFilesChange = vi.fn();
  const screen = await render(<Host onFilesSelect={onFilesSelect} onFilesChange={onFilesChange} />);

  pick(input(screen.container), [pdf('contrat.pdf')]);

  await expect.poll(() => names(screen.container)).toEqual(['contrat.pdf']);
  expect(screen.container.querySelector('.ui-file-upload-field-text')).toHaveTextContent(
    'contrat.pdf',
  );
  expect(screen.container.querySelector('.ui-file-upload-field-text')).not.toHaveClass(
    '_placeholder',
  );
  expect(onFilesSelect).toHaveBeenCalledTimes(1);
  expect(onFilesSelect.mock.calls[0]![0].map((f: UiUploadFile) => f.name)).toEqual(['contrat.pdf']);
  expect(onFilesChange.mock.calls[0]![0].map((f: UiUploadFile) => f.status)).toEqual(['pending']);
  // Remis à zéro : choisir de nouveau le même fichier redéclenchera `change`.
  expect(input(screen.container).value).toBe('');
});

test('en multiple, les sélections s’additionnent et le résumé compte', async () => {
  const screen = await render(<Host multiple />);

  pick(input(screen.container), [pdf('a.pdf')]);
  pick(input(screen.container), [pdf('b.pdf'), pdf('c.pdf')]);

  await expect.poll(() => names(screen.container)).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
  expect(screen.container.querySelector('.ui-file-upload-field-text')).toHaveTextContent(
    '3 fichiers',
  );
});

test('en simple, le nouveau fichier remplace l’ancien et libère son aperçu', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const screen = await render(<Host />);

  pick(input(screen.container), [image('avant.png')]);
  await expect.poll(() => names(screen.container)).toEqual(['avant.png']);
  const avant = screen.container
    .querySelector('img.ui-file-upload-list-thumb')!
    .getAttribute('src')!;
  expect(avant).toMatch(/^blob:/);

  // Deux fichiers d'un coup : un seul entre.
  pick(input(screen.container), [image('apres.png'), image('ignore.png')]);

  await expect.poll(() => names(screen.container)).toEqual(['apres.png']);
  expect(revoke).toHaveBeenCalledWith(avant);
});

test('avec name, un formulaire natif reçoit la sélection, et elle seule', async () => {
  const screen = await render(
    <form>
      <Host name="pieces" multiple />
    </form>,
  );
  const form = screen.container.querySelector('form')!;
  const sent = () =>
    (new FormData(form).getAll('pieces') as File[]).map((f) => `${f.name}:${f.size}`);

  pick(input(screen.container), [pdf('a.pdf')]);
  pick(input(screen.container), [pdf('b.pdf')]);

  // Le sélecteur, vidé, ne soumet rien : seul le champ de valeur porte la sélection.
  await expect.poll(sent).toEqual(['a.pdf:4', 'b.pdf:4']);
  expect(input(screen.container)).not.toHaveAttribute('name');

  await screen.getByRole('button', { name: 'Supprimer le fichier : a.pdf' }).click();
  await expect.poll(sent).toEqual(['b.pdf:4']);
});

test('désactivé, le formulaire ne soumet pas la sélection', async () => {
  const screen = await render(
    <form>
      <Host name="pieces" />
    </form>,
  );
  pick(input(screen.container), [pdf('a.pdf')]);
  await expect.poll(() => rows(screen.container)).toHaveLength(1);

  await screen.rerender(
    <form>
      <Host name="pieces" disabled />
    </form>,
  );

  expect(new FormData(screen.container.querySelector('form')!).getAll('pieces')).toEqual([]);
});

// --- Validation --------------------------------------------------------------------

test('un type refusé ne rentre pas, et le motif est annoncé', async () => {
  const onUploadError = vi.fn();
  const screen = await render(<Host accept="image/*" multiple onUploadError={onUploadError} />);

  pick(input(screen.container), [pdf('rapport.pdf'), image('ok.png')]);

  await expect.poll(() => names(screen.container)).toEqual(['ok.png']);
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Type de fichier non autorisé : rapport.pdf');
  expect(onUploadError).toHaveBeenCalledWith(
    expect.objectContaining({
      reason: 'type',
      message: 'Type de fichier non autorisé : rapport.pdf',
    }),
  );
  expect(onUploadError.mock.calls[0]![0].file.status).toBe('error');
});

test("un fichier trop lourd est refusé, et l'aperçu créé pour lui est révoqué aussitôt", async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const create = vi.spyOn(URL, 'createObjectURL');
  const onUploadError = vi.fn();
  const screen = await render(<Host maxFileSize={10} onUploadError={onUploadError} />);

  pick(input(screen.container), [image('lourde.png', 64)]);

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Fichier trop volumineux : lourde.png');
  expect(rows(screen.container)).toHaveLength(0);
  expect(onUploadError.mock.calls[0]![0].reason).toBe('size');
  expect(revoke).toHaveBeenCalledWith(create.mock.results[0]!.value);
});

test('au-delà de fileLimit, les fichiers en trop sont refusés', async () => {
  const onUploadError = vi.fn();
  const screen = await render(<Host multiple fileLimit={2} onUploadError={onUploadError} />);

  pick(input(screen.container), [pdf('a.pdf')]);
  pick(input(screen.container), [pdf('b.pdf'), pdf('c.pdf')]);

  await expect.poll(() => names(screen.container)).toEqual(['a.pdf', 'b.pdf']);
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Nombre maximum de fichiers atteint (2).');
  expect(onUploadError.mock.calls.map((c) => c[0].reason)).toEqual(['limit']);
});

test('une sélection valide efface les messages de la précédente', async () => {
  const screen = await render(<Host accept="image/*" multiple />);

  pick(input(screen.container), [pdf()]);
  await expect.element(screen.getByRole('alert')).toBeInTheDocument();

  pick(input(screen.container), [image()]);
  await expect.poll(() => screen.container.querySelector('[role="alert"]')).toBeNull();
});

// --- Retrait et effacement --------------------------------------------------------

test('le retrait enlève la ligne, révoque son aperçu et notifie', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const onRemove = vi.fn();
  const onFilesChange = vi.fn();
  const screen = await render(<Host multiple onRemove={onRemove} onFilesChange={onFilesChange} />);

  pick(input(screen.container), [image('a.png'), pdf('b.pdf')]);
  await expect.poll(() => names(screen.container)).toEqual(['a.png', 'b.pdf']);
  const url = screen.container.querySelector('img.ui-file-upload-list-thumb')!.getAttribute('src');

  await screen.getByRole('button', { name: 'Supprimer le fichier : a.png' }).click();

  await expect.poll(() => names(screen.container)).toEqual(['b.pdf']);
  expect(revoke).toHaveBeenCalledWith(url);
  expect(onRemove.mock.calls[0]![0].name).toBe('a.png');
  expect(onFilesChange.mock.lastCall![0].map((f: UiUploadFile) => f.name)).toEqual(['b.pdf']);
});

test('Effacer vide la sélection, les messages et les aperçus', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const onClear = vi.fn();
  const onFilesChange = vi.fn();
  const screen = await render(
    <Host mode="drag" multiple accept="image/*" onClear={onClear} onFilesChange={onFilesChange} />,
  );

  pick(input(screen.container), [image('a.png'), pdf('refus.pdf')]);
  await expect.element(screen.getByRole('alert')).toBeInTheDocument();

  await screen.getByRole('button', { name: 'Effacer' }).click();

  await expect.poll(() => rows(screen.container)).toHaveLength(0);
  expect(screen.container.querySelector('[role="alert"]')).toBeNull();
  expect(revoke).toHaveBeenCalled();
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(onFilesChange).toHaveBeenLastCalledWith([]);
});

// --- Glisser-déposer ---------------------------------------------------------------

test('la zone se signale au survol, et le dépôt ajoute les fichiers', async () => {
  const screen = await render(<Host mode="drag" multiple />);
  const root = screen.container.querySelector('.ui-file-upload')!;
  const zone = screen.container.querySelector('.ui-file-upload-zone')!;

  drag(zone, 'dragover');
  await expect.poll(() => root.classList.contains('_dragging')).toBe(true);

  // Une sortie qui passe d'un enfant à l'autre reste DANS la zone.
  drag(zone, 'dragleave', [], { relatedTarget: zone.querySelector('.ui-file-upload-zone-title') });
  await new Promise((r) => requestAnimationFrame(r));
  expect(root).toHaveClass('_dragging');

  drag(zone, 'dragleave', [], { relatedTarget: document.body });
  await expect.poll(() => root.classList.contains('_dragging')).toBe(false);

  drag(zone, 'dragover');
  drag(zone, 'drop', [pdf('a.pdf'), pdf('b.pdf')]);

  await expect.poll(() => names(screen.container)).toEqual(['a.pdf', 'b.pdf']);
  expect(root).not.toHaveClass('_dragging');
});

test('désactivé, ni le champ ni le dépôt ne prennent de fichier', async () => {
  const screen = await render(<Host mode="drag" disabled />);
  const root = screen.container.querySelector('.ui-file-upload')!;

  expect(root).toHaveClass('_disabled');
  expect(input(screen.container)).toBeDisabled();

  drag(root, 'dragover');
  drag(root, 'drop', [pdf()]);
  await new Promise((r) => requestAnimationFrame(r));

  expect(root).not.toHaveClass('_dragging');
  expect(rows(screen.container)).toHaveLength(0);
});

// --- Envoi délégué -------------------------------------------------------------------

test("l'envoi délégué rend la main à l'application, qui pilote progression et issue", async () => {
  let request: UiUploadHandlerEvent | undefined;
  const onUploadError = vi.fn();
  const screen = await render(
    <Host
      mode="drag"
      multiple
      customUpload
      onCustomUpload={(e) => (request = e)}
      onUploadError={onUploadError}
    />,
  );

  pick(input(screen.container), [pdf('a.pdf'), pdf('b.pdf')]);
  const envoyer = screen.getByRole('button', { name: 'Téléverser' });
  await expect.element(envoyer).toBeEnabled();
  await envoyer.click();

  expect(request!.files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
  await expect
    .element(screen.getByRole('status', { name: 'Téléversement de a.pdf' }))
    .toBeInTheDocument();
  // Plus rien en attente : le bouton se désactive.
  await expect.element(envoyer).toBeDisabled();

  request!.setProgress(request!.files[0]!, 40);
  await expect
    .element(screen.getByRole('progressbar', { name: 'Progression du téléversement de a.pdf' }))
    .toHaveAttribute('aria-valuenow', '40');

  request!.markUploaded(request!.files[0]!);
  request!.markError(request!.files[1]!, 'Refusé par le serveur');

  await expect.poll(() => screen.container.querySelectorAll('[role="progressbar"]').length).toBe(0);
  const [a, b] = rows(screen.container);
  expect(a).not.toHaveClass('_error');
  expect(b).toHaveClass('_error');
  expect(b!.querySelector('.ui-file-upload-list-meta')).toHaveTextContent('Refusé par le serveur');
  expect(onUploadError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'upload', message: 'Refusé par le serveur' }),
  );
});

test('auto envoie dès la sélection, et le bouton Téléverser disparaît', async () => {
  const onCustomUpload = vi.fn();
  const screen = await render(
    <Host mode="drag" auto customUpload onCustomUpload={onCustomUpload} />,
  );

  pick(input(screen.container), [pdf('a.pdf')]);

  await expect.poll(() => onCustomUpload.mock.calls.length).toBe(1);
  expect(onCustomUpload.mock.calls[0]![0].files.map((f: UiUploadFile) => f.name)).toEqual([
    'a.pdf',
  ]);
  expect(screen.container.querySelectorAll('.ui-file-upload-toolbar .ui-button')).toHaveLength(1);
  await expect.element(screen.getByRole('button', { name: 'Effacer' })).toBeVisible();
});

test("sans adresse ni envoi délégué, il n'y a rien à téléverser", async () => {
  const screen = await render(<Host mode="drag" />);

  pick(input(screen.container), [pdf()]);

  await expect.element(screen.getByRole('button', { name: 'Téléverser' })).toBeDisabled();
});

// --- Envoi intégré ---------------------------------------------------------------------

test("l'envoi intégré poste le fichier, suit sa progression et annonce l'issue", async () => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  const onUploadComplete = vi.fn();
  const screen = await render(
    <Host
      mode="drag"
      url="/api/pieces"
      method="put"
      fieldName="document"
      withCredentials
      onUploadComplete={onUploadComplete}
    />,
  );
  const file = pdf('bail.pdf');

  pick(input(screen.container), [file]);
  await screen.getByRole('button', { name: 'Téléverser' }).click();

  const xhr = FakeXhr.all[0]!;
  expect(xhr.method).toBe('PUT');
  expect(xhr.url).toBe('/api/pieces');
  expect(xhr.withCredentials).toBe(true);
  expect(xhr.body!.get('document')).toBeInstanceOf(File);
  expect((xhr.body!.get('document') as File).name).toBe('bail.pdf');

  xhr.progress(50, 100);
  await expect.element(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');

  xhr.respond(201);
  await expect.poll(() => onUploadComplete.mock.calls.length).toBe(1);
  expect(onUploadComplete.mock.calls[0]![0].xhr).toBe(xhr);
  expect(onUploadComplete.mock.calls[0]![0].files[0].status).toBe('completed');
  // Le rappel tire dans le gestionnaire de la requête, AVANT le rendu : le DOM se sonde.
  await expect.poll(() => screen.container.querySelector('[role="progressbar"]')).toBeNull();
});

test('une réponse hors 2xx et une coupure réseau finissent en erreur, avec leur message', async () => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  const onUploadError = vi.fn();
  const screen = await render(
    <Host mode="drag" multiple url="/api" onUploadError={onUploadError} />,
  );

  pick(input(screen.container), [pdf('a.pdf'), pdf('b.pdf')]);
  await screen.getByRole('button', { name: 'Téléverser' }).click();

  FakeXhr.all[0]!.respond(500);
  FakeXhr.all[1]!.fail();

  await expect.poll(() => onUploadError.mock.calls.length).toBe(2);
  const metas = () =>
    rows(screen.container).map((r) => r.querySelector('.ui-file-upload-list-meta')!.textContent);
  await expect.poll(metas).toEqual(['Erreur 500', 'Erreur réseau']);
  expect(onUploadError.mock.calls.map((c) => c[0].reason)).toEqual(['upload', 'upload']);
});

test('retirer un fichier en cours d’envoi annule sa requête', async () => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  const screen = await render(<Host mode="drag" url="/api" />);

  pick(input(screen.container), [pdf('a.pdf')]);
  await screen.getByRole('button', { name: 'Téléverser' }).click();
  await screen.getByRole('button', { name: 'Supprimer le fichier : a.pdf' }).click();

  expect(FakeXhr.all[0]!.aborted).toBe(true);
  await expect.poll(() => rows(screen.container)).toHaveLength(0);
});

test('une notification tardive appelle la version À JOUR du rappel', async () => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  const premier = vi.fn();
  const second = vi.fn();
  const screen = await render(<Host mode="drag" url="/api" onUploadComplete={premier} />);

  pick(input(screen.container), [pdf()]);
  await screen.getByRole('button', { name: 'Téléverser' }).click();

  // L'appelant change de rappel pendant que la requête est en vol.
  await screen.rerender(<Host mode="drag" url="/api" onUploadComplete={second} />);
  FakeXhr.all[0]!.respond(200);

  await expect.poll(() => second.mock.calls.length).toBe(1);
  expect(premier).not.toHaveBeenCalled();
});

// --- Cycle de vie ------------------------------------------------------------------------

test('au démontage, les aperçus sont révoqués et les requêtes annulées', async () => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const screen = await render(<Host mode="drag" url="/api" />);

  pick(input(screen.container), [image('a.png')]);
  await expect.poll(() => rows(screen.container)).toHaveLength(1);
  const url = screen.container.querySelector('img.ui-file-upload-list-thumb')!.getAttribute('src');
  await screen.getByRole('button', { name: 'Téléverser' }).click();

  await screen.unmount();

  expect(revoke).toHaveBeenCalledWith(url);
  expect(FakeXhr.all[0]!.aborted).toBe(true);
});

test('en mode strict, le double montage ne révoque pas les aperçus vivants', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const screen = await render(
    <StrictMode>
      <Host />
    </StrictMode>,
  );

  pick(input(screen.container), [image('a.png')]);

  await expect.poll(() => rows(screen.container)).toHaveLength(1);
  const thumb = screen.container.querySelector<HTMLImageElement>('img.ui-file-upload-list-thumb')!;
  await expect.poll(() => thumb.complete && thumb.naturalWidth >= 0).toBe(true);
  expect(revoke).not.toHaveBeenCalled();
});

// --- Rendus personnalisés -----------------------------------------------------------------

test('renderToolbar reçoit des actions qui marchent', async () => {
  const onCustomUpload = vi.fn();
  const screen = await render(
    <Host
      mode="drag"
      multiple
      customUpload
      onCustomUpload={onCustomUpload}
      renderToolbar={(files, { choose, upload, clear }) => (
        <>
          <button type="button" onClick={choose}>
            Choisir
          </button>
          <button type="button" onClick={upload}>
            Envoyer ({files.length})
          </button>
          <button type="button" onClick={clear}>
            Vider
          </button>
        </>
      )}
    />,
  );
  const click = vi.spyOn(input(screen.container), 'click').mockImplementation(() => {});

  await screen.getByRole('button', { name: 'Choisir' }).click();
  expect(click).toHaveBeenCalledTimes(1);

  pick(input(screen.container), [pdf('a.pdf')]);
  await screen.getByRole('button', { name: 'Envoyer (1)' }).click();
  expect(onCustomUpload).toHaveBeenCalledTimes(1);

  await screen.getByRole('button', { name: 'Vider' }).click();
  await expect.element(screen.getByRole('button', { name: 'Envoyer (0)' })).toBeVisible();
});

test('renderFile remplace une ligne, dans son élément de liste', async () => {
  const screen = await render(
    <Host
      multiple
      renderFile={(f, { remove }) => (
        <button type="button" onClick={() => remove(f)}>
          Retirer {f.name}
        </button>
      )}
    />,
  );

  pick(input(screen.container), [pdf('a.pdf'), pdf('b.pdf')]);
  await expect.element(screen.getByRole('button', { name: 'Retirer a.pdf' })).toBeVisible();
  expect(screen.container.querySelectorAll('li.ui-file-upload-item')).toHaveLength(2);
  expect(rows(screen.container)).toHaveLength(0);

  await screen.getByRole('button', { name: 'Retirer a.pdf' }).click();
  await expect
    .poll(() => screen.container.querySelectorAll('li.ui-file-upload-item').length)
    .toBe(1);
});

test('renderContent remplace toute la section, même vide', async () => {
  function Grid() {
    const [seen, setSeen] = useState(0);
    return (
      <Host
        multiple
        onFilesChange={(files) => setSeen(files.length)}
        renderContent={(files, { clear }) => (
          <>
            <output>{`${files.length} dans la grille, ${seen} vus`}</output>
            <button type="button" onClick={clear}>
              Tout retirer
            </button>
          </>
        )}
      />
    );
  }
  const screen = await render(<Grid />);

  expect(screen.container.querySelector('.ui-file-upload-content output')).toHaveTextContent(
    '0 dans la grille, 0 vus',
  );

  pick(input(screen.container), [pdf('a.pdf'), pdf('b.pdf')]);
  await expect.element(screen.getByText('2 dans la grille, 2 vus')).toBeVisible();

  await screen.getByRole('button', { name: 'Tout retirer' }).click();
  await expect.element(screen.getByText('0 dans la grille, 0 vus')).toBeVisible();
});

test('showFileList à false masque la liste sans perdre la sélection', async () => {
  const screen = await render(<Host showFileList={false} />);

  pick(input(screen.container), [pdf('a.pdf')]);

  await expect
    .poll(() => screen.container.querySelector('.ui-file-upload-field-text')?.textContent)
    .toBe('a.pdf');
  expect(screen.container.querySelector('.ui-file-upload-content')).toBeNull();
});
