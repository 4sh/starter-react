import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiFileUpload } from './ui-file-upload';
import type { UiUploadHandlerEvent } from './ui-file-upload.model';

/**
 * Un envoi simulé : chaque fichier avance sur une minuterie, puis se termine.
 * Il tient lieu de serveur pour que la progression et le spinner se voient ;
 * une vraie intégration renseigne `url`, ou fait le travail ici.
 */
function simulateUpload(event: UiUploadHandlerEvent): void {
  event.files.forEach((file, index) => {
    let progress = 0;
    const tick = (): void => {
      progress += 12 + Math.random() * 18;
      if (progress >= 100) {
        event.setProgress(file, 100);
        event.markUploaded(file);
      } else {
        event.setProgress(file, progress);
        setTimeout(tick, 260);
      }
    };
    setTimeout(tick, 200 + index * 180);
  });
}

const meta: Meta<typeof UiFileUpload> = {
  title: 'Components/ui/forms/ui-file-upload',
  component: UiFileUpload,
  args: {
    mode: 'field',
    size: 'default',
    multiple: false,
    auto: false,
    customUpload: false,
    disabled: false,
  },
  argTypes: {
    mode: { control: 'inline-radio', options: ['field', 'drag'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    multiple: { control: 'boolean' },
    accept: { control: 'text' },
    auto: { control: 'boolean' },
    customUpload: { control: 'boolean' },
    disabled: { control: 'boolean' },
    hint: { control: 'text' },
    renderFile: { control: false },
    renderContent: { control: false },
    renderToolbar: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=154-4706',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiFileUpload>;

const wide: CSSProperties = { width: 460, maxWidth: '90vw' };

/** Sélection de fichiers, glisser-déposer compris : l'équivalent du type « Field ». */
export const Basic: Story = {
  args: {
    mode: 'field',
    multiple: true,
    accept: 'image/*',
    'aria-label': 'Téléverser des fichiers',
  },
};

/** Avec `auto`, un fichier part dès qu'il est choisi. */
export const Auto: Story = {
  args: {
    mode: 'field',
    multiple: true,
    accept: 'image/*',
    auto: true,
    customUpload: true,
    'aria-label': 'Téléversement automatique',
    onCustomUpload: simulateUpload,
  },
};

/** Glisser-déposer, plusieurs fichiers, progression, et les trois validations. */
export const Advanced: Story = {
  args: { mode: 'drag' },
  render: (args) => (
    <div style={wide}>
      <UiFileUpload
        {...args}
        multiple
        customUpload
        accept="image/*,.pdf"
        maxFileSize={5_242_880}
        fileLimit={5}
        hint="JPG, PNG, PDF · 5 fichiers max · 5 Mo par fichier"
        aria-label="Téléverser des documents"
        onCustomUpload={simulateUpload}
      />
    </div>
  ),
};

/** `customUpload` remplace l'envoi intégré par la fonction de l'application. */
export const CustomUpload: Story = {
  render: () => (
    <div style={wide}>
      <UiFileUpload
        mode="drag"
        multiple
        customUpload
        accept="image/*"
        hint="Gestionnaire de téléversement personnalisé"
        aria-label="Téléversement personnalisé"
        onCustomUpload={(event) => {
          // Ici : envoyer `event.files` vers son propre service, puis signaler
          // la progression et l'issue par les fonctions fournies.
          simulateUpload(event);
        }}
      />
    </div>
  ),
};

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: 12,
  margin: 0,
  padding: 0,
  listStyle: 'none',
};
const cell: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 8,
  border: '1px solid var(--form-high-stroke-default)',
  background: 'var(--form-high-surface-default)',
};
const thumb: CSSProperties = { display: 'block', width: '100%', height: 96, objectFit: 'cover' };
const caption: CSSProperties = {
  display: 'block',
  padding: '6px 8px',
  fontSize: 12,
  color: 'var(--form-high-content-default)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
const removeButton: CSSProperties = { position: 'absolute', top: 6, right: 6 };

/** Aperçu en grille : `renderContent` reçoit tous les fichiers et rend la section. */
export const ImagePreview: Story = {
  render: () => (
    <div style={{ width: 520, maxWidth: '92vw' }}>
      <UiFileUpload
        mode="drag"
        multiple
        customUpload
        accept="image/*"
        hint="Images uniquement"
        aria-label="Téléverser des images"
        onCustomUpload={simulateUpload}
        renderContent={(files, { remove }) =>
          files.length > 0 && (
            <ul style={grid}>
              {files.map((f) => (
                <li key={f.id} style={cell}>
                  <img src={f.objectUrl} alt={f.name} style={thumb} />
                  <span style={removeButton}>
                    <UiButton
                      icon="xmark"
                      iconOnly
                      rounded
                      size="small"
                      level="low"
                      aria-label={`Supprimer ${f.name}`}
                      onClick={() => remove(f)}
                    />
                  </span>
                  <span style={caption} title={f.name}>
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      />
    </div>
  ),
};

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 12px',
  border: '1px solid var(--form-high-stroke-default)',
  borderRadius: 8,
  color: 'var(--form-high-content-default)',
};

/**
 * Tout se remplace par des props de rendu : `renderFile` (une ligne),
 * `renderContent` (la section) et `renderToolbar` (la barre d'actions).
 */
export const Template: Story = {
  render: () => (
    <div style={{ width: 480, maxWidth: '92vw' }}>
      <UiFileUpload
        mode="drag"
        multiple
        customUpload
        accept="image/*,.pdf"
        aria-label="Téléverser des fichiers"
        onCustomUpload={simulateUpload}
        renderToolbar={(files, { choose, upload, clear }) => (
          <>
            <UiButton label="Parcourir" size="small" onClick={choose} />
            <UiButton
              label={`Envoyer (${files.length})`}
              size="small"
              disabled={!files.length}
              onClick={upload}
            />
            <UiButton
              label="Vider"
              size="small"
              level="low"
              disabled={!files.length}
              onClick={clear}
            />
          </>
        )}
        renderFile={(f, { remove }) => (
          <div style={row}>
            <span>
              {f.name} · {f.status}
            </span>
            <UiButton
              label="Retirer"
              size="small"
              level="low"
              aria-label={`Retirer ${f.name}`}
              onClick={() => remove(f)}
            />
          </div>
        )}
      />
    </div>
  ),
};

/** Champ compact désactivé. */
export const Disabled: Story = {
  args: { mode: 'field', disabled: true, 'aria-label': 'Téléversement désactivé' },
};
