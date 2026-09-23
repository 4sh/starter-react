import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiFileUploadList } from './ui-file-upload-list';
import type { UiUploadFile, UiUploadStatus } from './ui-file-upload.model';

/** Un fichier d'exemple pour les stories de la ligne seule. */
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

// Un petit SVG en ligne, qui tient lieu de vignette d'image.
const THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#7c3aed"/><circle cx="40" cy="40" r="22" fill="#fbbf24"/></svg>',
  );

const meta: Meta<typeof UiFileUploadList> = {
  title: 'Components/ui/forms/ui-file-upload-list',
  component: UiFileUploadList,
  args: { size: 'default', removable: true },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'small'] },
    removable: { control: 'boolean' },
    file: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=155-2563',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiFileUploadList>;

export const Default: Story = { args: { file: sample('rapport-annuel.pdf', 2_621_440) } };

export const Small: Story = { args: { size: 'small', file: sample('note.txt', 4096) } };

/** Pendant l'envoi : `ui-spinner` prend la place de l'icône, et la progression apparaît. */
export const Uploading: Story = {
  args: { file: sample('video-demo.mp4', 18_400_000, 'uploading', { progress: 62 }) },
};

/** En échec : icône d'alerte et message, stylés par les jetons d'erreur. */
export const ErrorState: Story = {
  args: { file: sample('archive.zip', 52_000_000, 'error', { error: 'Fichier trop volumineux' }) },
};

/** Une image avec sa vignette (URL d'objet). */
export const ImageThumbnail: Story = {
  args: { file: sample('photo.jpg', 843_776, 'completed', { objectUrl: THUMB }) },
};
