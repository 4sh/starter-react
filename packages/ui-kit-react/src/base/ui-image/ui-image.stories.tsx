import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiButton } from '../../actions/ui-button';

import { UiImage, UiImageProvider, type UiImageAssetsMap } from './ui-image';

/**
 * Une table d'images de démonstration. Un projet génère la sienne, et la fournit
 * par `UiImageProvider` : le kit ne peut pas connaître les images d'une
 * application.
 */
const ASSETS: UiImageAssetsMap = {
  'logo.svg': { common: { base: 'logo' } },
};

const PHOTO = 'https://picsum.photos/id/1015/640/400';
const PORTRAIT = 'https://picsum.photos/id/1025/400/640';

const meta: Meta<typeof UiImage> = {
  title: 'Components/ui/base/ui-image',
  component: UiImage,
  args: {
    alt: 'Paysage de montagne',
    width: 320,
    height: 200,
  },
  argTypes: {
    src: { control: 'text' },
    name: { control: 'text' },
    alt: { control: 'text' },
    width: { control: 'number' },
    height: { control: 'number' },
    fill: { control: 'boolean' },
    priority: { control: 'boolean' },
    secured: { control: 'boolean' },
    preview: { control: 'boolean' },
    downloadable: { control: 'boolean' },
    previewVisible: { control: false },
    previewIndicator: { control: false },
  },
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=0-1',
    },
  },
  decorators: [
    (Story) => (
      <UiImageProvider assets={ASSETS}>
        <Story />
      </UiImageProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UiImage>;

/** Une URL distante, rendue par un `<img>` ordinaire. */
export const Remote: Story = {
  args: { src: PHOTO },
};

/** `fill` fait remplir le conteneur à l'image, au lieu de porter ses dimensions. */
export const Fill: Story = {
  args: { src: PHOTO, fill: true, width: undefined, height: undefined },
  render: (args) => (
    <div style={{ width: 320, height: 200, overflow: 'hidden', borderRadius: 8 }}>
      <UiImage {...args} />
    </div>
  ),
};

/**
 * Un SVG **local** est converti en éléments React, ce qui lui fait hériter du
 * CSS : la couleur des deux vient de `currentColor`, donc du texte autour.
 */
export const InlineSvg: Story = {
  args: { src: undefined, name: 'logo.svg', width: 64, height: 64, alt: undefined },
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <div style={{ color: 'var(--actions-high-surface-default)' }}>
        <UiImage {...args} />
      </div>
      <div style={{ color: 'var(--informative-successhigh-surface-default)' }}>
        <UiImage {...args} />
      </div>
    </div>
  ),
};

/** Rien à afficher : une vignette prend la place, sans jamais casser la mise en page. */
export const Placeholder: Story = {
  args: { src: undefined, name: undefined, alt: 'Image absente' },
};

/** L'image échoue, et le repli local prend le relais. */
export const Fallback: Story = {
  args: { src: 'https://example.invalid/introuvable.png', fallback: 'logo.svg' },
};

/** L'image échoue sans repli : la vignette reste. */
export const FailedNoFallback: Story = {
  args: { src: 'https://example.invalid/introuvable.png' },
};

/** Cliquer l'image ouvre la vue agrandie : zoom, rotation, déplacement. */
export const Preview: Story = {
  args: { src: PHOTO, preview: true },
};

/** La vue agrandie propose aussi le téléchargement. */
export const PreviewDownloadable: Story = {
  args: { src: PHOTO, preview: true, downloadable: true, downloadName: 'paysage.jpg' },
};

/** Une photo en portrait, pour voir le recadrage après un quart de tour. */
export const PreviewPortrait: Story = {
  args: { src: PORTRAIT, preview: true, alt: 'Portrait', width: 200, height: 320 },
};

/** L'indicateur de survol se remplace. */
export const CustomIndicator: Story = {
  args: {
    src: PHOTO,
    preview: true,
    previewIndicator: <span style={{ fontSize: '0.875rem' }}>Agrandir</span>,
  },
};

/** L'aperçu s'ouvre aussi par le code, sans passer par l'image. */
function ControlledPreviewDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <UiImage
        src={PHOTO}
        alt="Paysage"
        width={320}
        height={200}
        preview
        previewVisible={open}
        onPreviewVisibleChange={setOpen}
      />
      <UiButton label="Ouvrir l'aperçu" level="low" onClick={() => setOpen(true)} />
    </div>
  );
}

export const ControlledPreview: Story = {
  render: () => <ControlledPreviewDemo />,
};

/**
 * `secured` passe par la fonction de l'application plutôt que par le navigateur :
 * c'est ce dont a besoin un point d'accès derrière un en-tête d'autorisation.
 */
export const Secured: Story = {
  args: { src: 'https://exemple.test/image-protegee.png', secured: true },
  render: (args) => (
    <UiImageProvider
      assets={ASSETS}
      fetchSecured={async () => {
        // Un faux client authentifié : il rend une image locale plutôt que
        // d'aller sur le réseau, pour que la story soit reproductible.
        const response = await fetch('assets/img/common/logo/logo.svg');
        return response.blob();
      }}
    >
      <UiImage {...args} alt="Image protégée" width={120} height={120} />
    </UiImageProvider>
  ),
};

/** La requête protégée échoue : la vignette prend la place. */
export const SecuredError: Story = {
  args: { src: 'https://exemple.test/interdit.png', secured: true, alt: 'Image protégée' },
  render: (args) => (
    <UiImageProvider assets={ASSETS} fetchSecured={() => Promise.reject(new Error('401'))}>
      <UiImage {...args} />
    </UiImageProvider>
  ),
};
