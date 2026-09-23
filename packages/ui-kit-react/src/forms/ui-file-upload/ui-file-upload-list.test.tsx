import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiFileUploadList } from './ui-file-upload-list';
import type { UiUploadFile, UiUploadStatus } from './ui-file-upload.model';

function sample(
  name: string,
  size: number,
  status: UiUploadStatus = 'pending',
  extra: Partial<UiUploadFile> = {},
): UiUploadFile {
  return {
    id: name,
    file: new File([], name),
    name,
    size,
    type: '',
    status,
    progress: 0,
    ...extra,
  };
}

const THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>');

test('une ligne montre le nom, la taille et le bouton de retrait nommé', async () => {
  const screen = await render(<UiFileUploadList file={sample('rapport.pdf', 2_621_440)} />);
  const row = screen.container.querySelector('.ui-file-upload-list')!;

  expect(row.querySelector('.ui-file-upload-list-name')).toHaveTextContent('rapport.pdf');
  expect(row.querySelector('.ui-file-upload-list-name')).toHaveAttribute('title', 'rapport.pdf');
  expect(row.querySelector('.ui-file-upload-list-meta')).toHaveTextContent('2.5 MB');
  expect(row.querySelector('.ui-file-upload-list-media .fa-file')).not.toBeNull();
  await expect
    .element(screen.getByRole('button', { name: 'Supprimer le fichier : rapport.pdf' }))
    .toBeVisible();
  expect(row.querySelector('[role="progressbar"]')).toBeNull();
});

test("pendant l'envoi, le spinner remplace l'icône et la progression apparaît", async () => {
  const screen = await render(
    <UiFileUploadList file={sample('demo.mp4', 18_400_000, 'uploading', { progress: 62 })} />,
  );

  await expect
    .element(screen.getByRole('status', { name: 'Téléversement de demo.mp4' }))
    .toBeInTheDocument();
  const bar = screen.getByRole('progressbar', { name: 'Progression du téléversement de demo.mp4' });
  await expect.element(bar).toHaveAttribute('aria-valuenow', '62');
  await expect.element(bar).toHaveAttribute('aria-valuemin', '0');
  await expect.element(bar).toHaveAttribute('aria-valuemax', '100');
  expect(
    screen.container.querySelector<HTMLElement>('.ui-file-upload-list-progress-bar')!.style.width,
  ).toBe('62%');
  expect(screen.container.querySelector('.ui-file-upload-list-meta')).toHaveTextContent(
    '17.5 MB · 62 %',
  );
});

test("en erreur, la ligne montre le message et l'icône d'alerte", async () => {
  const screen = await render(
    <UiFileUploadList file={sample('archive.zip', 52_000_000, 'error', { error: 'Trop gros' })} />,
  );
  const row = screen.container.querySelector('.ui-file-upload-list')!;

  expect(row).toHaveClass('_error');
  expect(row.querySelector('.ui-file-upload-list-meta')).toHaveTextContent('Trop gros');
  expect(row.querySelector('.fa-triangle-exclamation')).not.toBeNull();
});

test("sans message, l'erreur retombe sur failedLabel", async () => {
  const screen = await render(
    <UiFileUploadList file={sample('a.zip', 10, 'error')} failedLabel="Raté" />,
  );

  expect(screen.container.querySelector('.ui-file-upload-list-meta')).toHaveTextContent('Raté');
});

test('une image avec aperçu rend une vignette décorative', async () => {
  const screen = await render(
    <UiFileUploadList file={sample('photo.jpg', 843_776, 'completed', { objectUrl: THUMB })} />,
  );
  const thumb = screen.container.querySelector('img.ui-file-upload-list-thumb')!;

  expect(thumb).toHaveAttribute('src', THUMB);
  expect(thumb).toHaveAttribute('alt', '');
  expect(screen.container.querySelector('.ui-file-upload-list')).toHaveClass('_has-thumb');
});

test('le retrait rend le fichier, et removable le masque', async () => {
  const onRemove = vi.fn();
  const file = sample('note.txt', 4096);
  const screen = await render(<UiFileUploadList file={file} onRemove={onRemove} />);

  await screen.getByRole('button', { name: /Supprimer le fichier/ }).click();
  expect(onRemove).toHaveBeenCalledWith(file);

  await screen.rerender(<UiFileUploadList file={file} removable={false} />);
  expect(screen.container.querySelector('.ui-file-upload-list-remove')).toBeNull();
});

test('la taille small réduit la ligne et ses icônes', async () => {
  const screen = await render(<UiFileUploadList file={sample('note.txt', 4096)} size="small" />);

  expect(screen.container.querySelector('.ui-file-upload-list')).toHaveClass('_small');
  expect(screen.container.querySelector('.ui-file-upload-list-media .ui-icon')).toHaveClass('_sm');
});
