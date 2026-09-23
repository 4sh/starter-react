import { expect, test } from 'vitest';

import { formatFileSize, isFileTypeAccepted, isImageFile } from './ui-file-upload.model';

const fichier = (name: string, type = '') => new File(['x'], name, { type });

test('formatFileSize rend une taille lisible en base 1024', () => {
  expect(formatFileSize(0)).toBe('0 B');
  expect(formatFileSize(-5)).toBe('0 B');
  expect(formatFileSize(512)).toBe('512 B');
  expect(formatFileSize(1024)).toBe('1 KB');
  expect(formatFileSize(2_621_440)).toBe('2.5 MB');
  // Au-delà de la dernière unité, on reste sur elle plutôt que d'inventer la suivante.
  expect(formatFileSize(1024 ** 6)).toBe('1048576 TB');
});

test('isFileTypeAccepted accepte tout sans filtre', () => {
  expect(isFileTypeAccepted(fichier('a.exe'), undefined)).toBe(true);
  expect(isFileTypeAccepted(fichier('a.exe'), '')).toBe(true);
  expect(isFileTypeAccepted(fichier('a.exe'), ' , ')).toBe(true);
});

test('isFileTypeAccepted lit les trois formes du filtre', () => {
  const accept = 'image/*, .PDF, text/plain';

  expect(isFileTypeAccepted(fichier('photo.png', 'image/png'), accept)).toBe(true);
  expect(isFileTypeAccepted(fichier('RAPPORT.pdf'), accept)).toBe(true);
  expect(isFileTypeAccepted(fichier('note.txt', 'text/plain'), accept)).toBe(true);
  expect(isFileTypeAccepted(fichier('page.html', 'text/html'), accept)).toBe(false);
  expect(isFileTypeAccepted(fichier('film.mp4', 'video/mp4'), accept)).toBe(false);
});

test('isImageFile ne regarde que le type MIME', () => {
  expect(isImageFile(fichier('a.png', 'image/png'))).toBe(true);
  expect(isImageFile(fichier('a.png'))).toBe(false);
  expect(isImageFile(fichier('a.pdf', 'application/pdf'))).toBe(false);
});
