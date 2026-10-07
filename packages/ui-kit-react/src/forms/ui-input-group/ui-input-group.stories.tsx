import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties } from 'react';

import { UiButton } from '../../actions/ui-button';
import { UiIcon } from '../../base/ui-icon';
import { UiCheckbox } from '../ui-checkbox';
import { UiInput } from '../ui-input';
import { UiInputNumber } from '../ui-input-number';
import { UiRadio } from '../ui-radio';
import { UiSelect } from '../ui-select';

import { UiInputGroup, UiInputGroupAddon, type UiInputGroupProps } from './ui-input-group';

const VILLES = ['Bordeaux', 'Lille', 'Lyon', 'Marseille', 'Paris'];

const DEVISES = ['EUR', 'USD', 'CHF', 'GBP'];

interface PhoneCode {
  name: string;
  code: string;
  dial: string;
}

const PHONE_CODES: PhoneCode[] = [
  { name: 'France', code: 'fr', dial: '+33' },
  { name: 'Belgique', code: 'be', dial: '+32' },
  { name: 'Suisse', code: 'ch', dial: '+41' },
  { name: 'Luxembourg', code: 'lu', dial: '+352' },
  { name: 'Allemagne', code: 'de', dial: '+49' },
  { name: 'Espagne', code: 'es', dial: '+34' },
  { name: 'Italie', code: 'it', dial: '+39' },
  { name: 'Royaume-Uni', code: 'gb', dial: '+44' },
  { name: 'États-Unis', code: 'us', dial: '+1' },
  { name: 'Canada', code: 'ca', dial: '+1' },
];

// Un contrôle garde sa largeur naturelle au lieu de partager la place restante.
const NATURAL_WIDTH = { '--ui-input-group-item-flex': 'none' } as CSSProperties;

// `dialIcon` pilote le chevron de l'indicatif : propre à la story téléphone.
type GroupArgs = UiInputGroupProps & { dialIcon?: boolean };

const meta: Meta<GroupArgs> = {
  title: 'Components/ui/forms/ui-input-group',
  component: UiInputGroup,
  args: {
    size: 'default',
    required: false,
    level: 'default',
    showMessageIcon: false,
    merged: false,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'small'] },
    label: { control: 'text' },
    required: { control: 'boolean' },
    message: { control: 'text' },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    showMessageIcon: { control: 'boolean' },
    messageIcon: { control: 'text' },
    merged: { control: 'boolean' },
    children: { control: false },
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--units-md)',
          width: 340,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<GroupArgs>;

/** Une cellule d'icône, puis une de texte de chaque côté du contrôle. */
export const Default: Story = {
  render: (args) => (
    <>
      <UiInputGroup {...args}>
        <UiInputGroupAddon>
          <UiIcon name="user" size="sm" />
        </UiInputGroupAddon>
        <UiInput placeholder="Nom d’utilisateur" aria-label="Nom d’utilisateur" size={args.size} />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiInputGroupAddon>https://</UiInputGroupAddon>
        <UiInput placeholder="mon-site" aria-label="Adresse du site" size={args.size} />
        <UiInputGroupAddon>.com</UiInputGroupAddon>
      </UiInputGroup>
    </>
  ),
};

/** Libellé au-dessus de la rangée, message en dessous : le rendu de `ui-field`. */
export const Field: Story = {
  name: 'Label & Message',
  args: {
    label: 'Site web',
    message: 'Le nom de domaine seul, sans « www. ».',
  },
  render: (args) => (
    <UiInputGroup {...args}>
      <UiInputGroupAddon>https://</UiInputGroupAddon>
      <UiInput placeholder="mon-site" aria-label="Nom de domaine" size={args.size} />
      <UiInputGroupAddon>.fr</UiInputGroupAddon>
    </UiInputGroup>
  ),
};

/** Le statut teinte le message et toutes les bordures du groupe. */
export const Levels: Story = {
  render: (args) => (
    <>
      <UiInputGroup size={args.size} label="Montant" message="Montant hors taxes.">
        <UiInputNumber defaultValue={1200} aria-label="Montant" size={args.size} />
        <UiInputGroupAddon>€</UiInputGroupAddon>
      </UiInputGroup>

      <UiInputGroup
        size={args.size}
        label="Montant"
        level="success"
        message="Montant dans le budget."
      >
        <UiInputNumber defaultValue={1200} aria-label="Montant" size={args.size} />
        <UiInputGroupAddon>€</UiInputGroupAddon>
      </UiInputGroup>

      <UiInputGroup
        size={args.size}
        label="Montant"
        level="error"
        message="Montant supérieur au plafond de 100 000 €."
      >
        <UiInputNumber defaultValue={120000} aria-label="Montant" size={args.size} invalid />
        <UiInputGroupAddon>€</UiInputGroupAddon>
      </UiInputGroup>
    </>
  ),
};

/** Une seule boîte autour de la rangée, sans trait entre les items. */
export const Merged: Story = {
  render: (args) => (
    <>
      <UiInputGroup size={args.size} label="Site web" merged>
        <UiInputGroupAddon>https://</UiInputGroupAddon>
        <UiInput placeholder="mon-site" aria-label="Nom de domaine" size={args.size} />
        <UiInputGroupAddon>.fr</UiInputGroupAddon>
      </UiInputGroup>

      <UiInputGroup size={args.size} label="Montant" merged>
        <UiInputNumber
          defaultValue={1200}
          aria-label="Montant"
          showButtons={false}
          size={args.size}
        />
        <UiSelect
          style={NATURAL_WIDTH}
          panelWidth="auto"
          aria-label="Devise"
          size={args.size}
          options={DEVISES}
          defaultValue="EUR"
        />
      </UiInputGroup>
    </>
  ),
};

/** Plusieurs cellules s'accumulent de chaque côté sans se toucher. */
export const Multiple: Story = {
  render: (args) => (
    <UiInputGroup {...args}>
      <UiInputGroupAddon>
        <UiIcon name="clock" size="sm" />
      </UiInputGroupAddon>
      <UiInputGroupAddon>
        <UiIcon name="star" size="sm" />
      </UiInputGroupAddon>
      <UiInputNumber defaultValue={100} aria-label="Prix" size={args.size} />
      <UiInputGroupAddon>€</UiInputGroupAddon>
      <UiInputGroupAddon>,00</UiInputGroupAddon>
    </UiInputGroup>
  ),
};

/** Un bouton se pose d'un côté ou de l'autre, et garde sa largeur naturelle. */
export const WithButton: Story = {
  render: (args) => (
    <>
      <UiInputGroup {...args}>
        <UiButton label="Rechercher" size={args.size} />
        <UiInput placeholder="Mot-clé" aria-label="Mot-clé" size={args.size} />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiInput placeholder="Mot-clé" aria-label="Mot-clé" size={args.size} />
        <UiButton
          icon="magnifying-glass"
          aria-label="Rechercher"
          level="low"
          variant="outlined"
          size={args.size}
        />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiButton icon="check" aria-label="Valider" level="success" size={args.size} />
        <UiInput placeholder="Vote" aria-label="Vote" size={args.size} />
        <UiButton icon="xmark" aria-label="Annuler" level="error" size={args.size} />
      </UiInputGroup>
    </>
  ),
};

/** Une case à cocher ou un bouton radio se logent dans une cellule. */
export const WithSelection: Story = {
  render: (args) => (
    <>
      <UiInputGroup {...args}>
        <UiInputGroupAddon>
          <UiCheckbox aria-label="Mémoriser le nom d’utilisateur" />
        </UiInputGroupAddon>
        <UiInput placeholder="Nom d’utilisateur" aria-label="Nom d’utilisateur" size={args.size} />
      </UiInputGroup>

      <UiInputGroup {...args}>
        <UiInput placeholder="Prix" aria-label="Prix" size={args.size} />
        <UiInputGroupAddon>
          <UiRadio name="mode-prix" value="ttc" aria-label="Prix TTC" />
        </UiInputGroupAddon>
      </UiInputGroup>
    </>
  ),
};

/** Une liste déroulante se colle comme n'importe quel autre contrôle. */
export const WithSelect: Story = {
  render: (args) => (
    <UiInputGroup {...args}>
      <UiInputGroupAddon>
        <UiIcon name="location-dot" size="sm" />
      </UiInputGroupAddon>
      <UiSelect
        options={VILLES}
        placeholder="Choisir une ville"
        aria-label="Ville"
        size={args.size}
      />
    </UiInputGroup>
  ),
};

// --- Numéro de téléphone ----------------------------------------------------

/** Drapeau décoratif, servi par les fichiers statiques de Storybook. */
function Flag({ code }: { code: string }) {
  return (
    <img
      src={`assets/img/common/svg/flags/${code}.svg`}
      alt=""
      width={20}
      height={15}
      style={{ borderRadius: 2, objectFit: 'cover' }}
    />
  );
}

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

// Règle de démo (9 chiffres) : la validation par pays reste au projet.
const phoneError = (value: string) =>
  value.replace(/\D/g, '').length >= 9 ? undefined : 'Numéro invalide';

function PhoneNumberDemo({ dialIcon = true, ...args }: GroupArgs) {
  const [phone, setPhone] = useState('06 12 34');
  const error = phoneError(phone);

  return (
    <UiInputGroup
      {...args}
      label="Téléphone"
      required
      level={error ? 'error' : 'default'}
      message={error}
    >
      {/* panelWidth="auto" : sinon la liste prend la largeur de l'indicatif. */}
      <UiSelect
        style={NATURAL_WIDTH}
        panelWidth="auto"
        aria-label="Indicatif du pays"
        showIcon={dialIcon}
        filter
        filterBy="name,dial,code"
        filterPlaceholder="Pays ou indicatif"
        options={PHONE_CODES}
        optionLabel="dial"
        defaultValue={PHONE_CODES[0]}
        size={args.size}
        renderSelectedItem={({ option }) => {
          const c = option as PhoneCode;
          return (
            <span style={row}>
              <Flag code={c.code} />
              <span>{c.dial}</span>
            </span>
          );
        }}
        renderOption={({ option }) => {
          const c = option as PhoneCode;
          return (
            <span style={{ ...row, width: '100%' }}>
              <Flag code={c.code} />
              <span>{c.name}</span>
              <span style={{ marginInlineStart: 'auto', color: 'var(--global-text-muted)' }}>
                {c.dial}
              </span>
            </span>
          );
        }}
      />
      <UiInput
        type="tel"
        placeholder="06 12 34 56 78"
        aria-label="Numéro de téléphone"
        value={phone}
        onValueChange={setPhone}
        required
        invalid={Boolean(error)}
        size={args.size}
      />
    </UiInputGroup>
  );
}

/** Indicatif (drapeau et code) collé au numéro, avec libellé et erreur réactive. */
export const PhoneNumber: Story = {
  name: 'Phone Number',
  args: { merged: true, dialIcon: true },
  argTypes: {
    dialIcon: {
      name: 'chevron (indicatif)',
      control: 'boolean',
      description: 'Chevron du `UiSelect` de l’indicatif (`showIcon`). Propre à cette story.',
    },
  },
  render: (args) => <PhoneNumberDemo {...args} />,
};

/** Le groupe transmet sa taille aux cellules ; les contrôles gardent la leur. */
export const Small: Story = {
  args: { size: 'small' },
  render: (args) => (
    <UiInputGroup {...args}>
      <UiInputGroupAddon>
        <UiIcon name="user" size="sm" />
      </UiInputGroupAddon>
      <UiInput placeholder="Nom d’utilisateur" aria-label="Nom d’utilisateur" size="small" />
      <UiButton
        icon="magnifying-glass"
        aria-label="Rechercher"
        level="low"
        variant="outlined"
        size="small"
      />
    </UiInputGroup>
  ),
};
