import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiButton } from '../../actions/ui-button';

import { UiDatepicker, type DatepickerValue } from './ui-datepicker';

/** Une date fixe : une story qui partirait de « aujourd'hui » changerait chaque jour. */
const ECHANTILLON = new Date(2026, 6, 8);
const ECHANTILLON_HEURE = new Date(2026, 6, 8, 14, 30);

const meta: Meta<typeof UiDatepicker> = {
  title: 'Components/ui/forms/ui-datepicker',
  component: UiDatepicker,
  args: {
    label: 'Date',
    valueType: 'date',
    locale: 'fr-FR',
    selectionMode: 'single',
    view: 'date',
    numberOfMonths: 1,
    firstDayOfWeek: 1,
    size: 'default',
    level: 'default',
    showIcon: true,
    showClear: true,
    allowInput: true,
    showTime: false,
    timeOnly: false,
    hourFormat: '24',
    stepMinute: 1,
    editableTime: true,
    showButtonBar: false,
    inline: false,
    showOnFocus: false,
    autoFlip: true,
    closeOnSelect: true,
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    locale: { control: 'text' },
    valueType: { control: 'inline-radio', options: ['date', 'iso'] },
    selectionMode: { control: 'inline-radio', options: ['single', 'multiple', 'range'] },
    view: { control: 'inline-radio', options: ['date', 'month', 'year'] },
    hourFormat: { control: 'inline-radio', options: ['24', '12'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    numberOfMonths: { control: { type: 'number', min: 1, max: 3 } },
    firstDayOfWeek: { control: { type: 'number', min: 0, max: 6 } },
    stepMinute: { control: { type: 'number', min: 1, max: 30 } },
    value: { control: false },
    defaultValue: { control: false },
    minDate: { control: false },
    maxDate: { control: false },
    disabledDates: { control: false },
    disabledDays: { control: false },
    dateFormat: { control: false },
    parseDate: { control: false },
    renderDay: { control: false },
    renderButtonBar: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2022-2453',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiDatepicker>;

/**
 * Les stories a etat declarent un vrai composant : `useState` dans un `render`
 * enfreint les regles des hooks. La valeur vive est affichee sous le champ, ce
 * qui rend visible le contrat `valueType` : une `Date` ou une chaine ISO.
 */
function Demo({
  initial = null,
  ...props
}: React.ComponentProps<typeof UiDatepicker> & { initial?: DatepickerValue }) {
  const [value, setValue] = useState<DatepickerValue>(initial);

  const rendu = Array.isArray(value)
    ? value.map((v) => (v instanceof Date ? v.toISOString() : v)).join(' · ')
    : value instanceof Date
      ? value.toISOString()
      : (value ?? '—');

  return (
    // 320 px cadre un CHAMP. Un calendrier en ligne, lui, se dimensionne
    // lui-meme : le plafonner ecrasait deux mois cote a cote a 125 px chacun,
    // en-tetes de colonnes superposes.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--units-sm)',
        width: props.inline ? 'fit-content' : 320,
      }}
    >
      <UiDatepicker {...props} value={value} onValueChange={setValue} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)', wordBreak: 'break-all' }}>
        {rendu}
      </code>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

export const WithValue: Story = {
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

export const Small: Story = {
  args: { size: 'small' },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

export const Required: Story = {
  args: { required: true, helperText: 'Champ obligatoire.' },
  render: (args) => <Demo {...args} />,
};

export const Error: Story = {
  args: { invalid: true, errorText: 'Date invalide.' },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

export const FloatLabel: Story = {
  args: { floatLabel: 'on' },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/**
 * `valueType="iso"` : le modele porte des chaines `"yyyy-MM-dd"`, pour un
 * consommateur qui ecrit directement contre un `LocalDate`. L'entree accepte
 * quand meme une `Date`.
 */
export const IsoValueType: Story = {
  args: { valueType: 'iso', helperText: 'Le modele porte une chaine ISO.' },
  render: (args) => <Demo {...args} initial="2026-07-08" />,
};

export const WithTime: Story = {
  args: { showTime: true, helperText: 'La ligne d’heure suit la grille.' },
  render: (args) => <Demo {...args} initial={ECHANTILLON_HEURE} />,
};

/** Compteurs seuls : les fleches restent utilisables, la frappe est coupee. */
export const StepperOnlyTime: Story = {
  args: { showTime: true, editableTime: false, stepMinute: 15 },
  render: (args) => <Demo {...args} initial={ECHANTILLON_HEURE} />,
};

export const Time12h: Story = {
  args: { showTime: true, hourFormat: '12' },
  render: (args) => <Demo {...args} initial={ECHANTILLON_HEURE} />,
};

/** Heure seule : le calendrier est masque, l'icone devient une horloge. */
export const TimeOnly: Story = {
  args: { timeOnly: true, showTime: true, label: 'Heure' },
  render: (args) => <Demo {...args} initial={ECHANTILLON_HEURE} />,
};

export const ButtonBar: Story = {
  args: { showButtonBar: true },
  render: (args) => <Demo {...args} />,
};

export const MinMax: Story = {
  args: {
    minDate: new Date(2026, 6, 5),
    maxDate: new Date(2026, 6, 20),
    helperText: 'Du 5 au 20 juillet 2026.',
  },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/** Les bornes acceptent aussi des chaines ISO, melangeables avec des `Date`. */
export const MinMaxIso: Story = {
  args: { minDate: '2026-07-05', maxDate: '2026-07-20', valueType: 'iso' },
  render: (args) => <Demo {...args} initial="2026-07-08" />,
};

export const DisabledWeekends: Story = {
  args: { disabledDays: [0, 6], helperText: 'Samedis et dimanches exclus.' },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

export const DisabledDates: Story = {
  args: {
    disabledDates: [new Date(2026, 6, 14), '2026-07-15', new Date(2026, 6, 16)],
    helperText: 'Trois jours exclus un a un.',
  },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/**
 * La croix d'effacement ne remplace la bascule que quand `showIcon` est coupe :
 * l'icone du calendrier gagne sinon l'unique emplacement, pour que le panneau
 * reste atteignable au clic une fois une date choisie.
 */
export const Clearable: Story = {
  args: { showIcon: false, showClear: true },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/**
 * Saisie clavier. Le masque auto-« / » s'arme sur un champ vide : tapez
 * « 08072026 ». Une fois une valeur posee, l'edition est du texte libre, lu au
 * flou ou a `Entree`.
 */
export const EditableInput: Story = {
  args: { allowInput: true, helperText: 'Tapez 08072026, ou corrigez un segment sur place.' },
  render: (args) => <Demo {...args} />,
};

/** Grille seule : le clic dans le champ ouvre alors le panneau. */
export const GridOnly: Story = {
  args: { allowInput: false, helperText: 'Le champ n’est pas tapable : il est le bouton.' },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/**
 * Ouverture au focus. Le panneau devient non modal : le champ reste vivant
 * dessous, et `Bas` fait entrer dans la grille.
 */
export const ShowOnFocus: Story = {
  args: { showOnFocus: true, helperText: 'Le panneau s’ouvre au focus, sans le voler.' },
  render: (args) => <Demo {...args} />,
};

/** MonthPicker tapable : le masque n'a que deux segments (mm/aaaa). */
export const AutoFormattedInputMonthPicker: Story = {
  args: { view: 'month', allowInput: true, label: 'Mois' },
  render: (args) => <Demo {...args} />,
};

export const EditableInputWithTime: Story = {
  args: { allowInput: true, showTime: true, helperText: 'Tapez 080720261430.' },
  render: (args) => <Demo {...args} />,
};

export const EditableInputWithTime12h: Story = {
  args: { allowInput: true, showTime: true, hourFormat: '12' },
  render: (args) => <Demo {...args} />,
};

/**
 * `dateFormat` et `parseDate` symetriques. Le placeholder automatique vient de
 * la sortie du formateur lui-meme, et l'ordre des champs tape est sonde depuis
 * elle : un formateur `en-US` sous une locale `fr-FR` reste coherent.
 */
export const CustomFormat: Story = {
  args: {
    label: 'Format personnalisé',
    locale: 'en-US',
    dateFormat: (d: Date) =>
      new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        d,
      ),
    parseDate: (text: string): Date | null => {
      const m = /^([a-z]+)\s+(\d{1,2}),\s*(\d{4})$/i.exec(text.trim());
      if (!m || !m[1] || !m[2] || !m[3]) return null;
      const mois = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ];
      const premier = m[1].toLowerCase();
      const idx = mois.findIndex((mo) => premier.startsWith(mo));
      if (idx < 0) return null;
      return new Date(Number(m[3]), idx, Number(m[2]));
    },
    helperText: 'Affichage « Jul 8, 2026 », parseDate symétrique.',
  },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/** Calendrier affiche en permanence : pas de declencheur, pas de calque. */
export const Inline: Story = {
  args: { inline: true },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

export const InlineWithTime: Story = {
  args: { inline: true, showTime: true, showButtonBar: true },
  render: (args) => <Demo {...args} initial={ECHANTILLON_HEURE} />,
};

/** Selection multiple : un clic (de)selectionne, le panneau ne se ferme pas. */
export const Multiple: Story = {
  args: { inline: true, selectionMode: 'multiple', label: 'Dates' },
  render: (args) => (
    <Demo
      {...args}
      initial={[new Date(2026, 6, 8), new Date(2026, 6, 15), new Date(2026, 6, 23)]}
    />
  ),
};

/** Plage : premier clic = debut, second = fin, bande continue entre les deux. */
export const Range: Story = {
  args: { inline: true, selectionMode: 'range', label: 'Période' },
  render: (args) => <Demo {...args} initial={[new Date(2026, 6, 8), new Date(2026, 6, 18)]} />,
};

/** Plage tapee : les deux dates dans le meme champ, separees par « - ». */
export const RangeTypedInput: Story = {
  args: {
    selectionMode: 'range',
    label: 'Période',
    allowInput: true,
    helperText: 'Tapez 0807202618072026 : le masque insère « / » et « - ».',
  },
  render: (args) => <Demo {...args} />,
};

/** Liste tapee : autant de dates que voulu, separees par « , ». */
export const MultipleTypedInput: Story = {
  args: {
    selectionMode: 'multiple',
    label: 'Dates',
    allowInput: true,
    helperText: 'Texte simple, lu au flou : « 08/07/2026, 15/07/2026 ».',
  },
  render: (args) => <Demo {...args} />,
};

export const MonthPicker: Story = {
  args: { view: 'month', label: 'Mois', inline: true },
  render: (args) => <Demo {...args} initial={new Date(2026, 6, 1)} />,
};

export const YearPicker: Story = {
  args: { view: 'year', label: 'Année', inline: true },
  render: (args) => <Demo {...args} initial={new Date(2026, 0, 1)} />,
};

export const TwoMonths: Story = {
  args: { inline: true, numberOfMonths: 2, selectionMode: 'range', label: 'Période' },
  render: (args) => <Demo {...args} initial={[new Date(2026, 6, 8), new Date(2026, 7, 3)]} />,
};

/** `renderButtonBar` recoit les deux actions et decide de tout le reste. */
export const CustomButtonBar: Story = {
  args: {
    inline: true,
    renderButtonBar: ({ today, clear }) => (
      <>
        <UiButton size="small" level="success" label="Ce jour" onClick={today} />
        <UiButton size="small" level="error" variant="outlined" label="Vider" onClick={clear} />
      </>
    ),
  },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/** `renderDay` remplace le contenu de la cellule, jamais la cellule elle-meme. */
export const DayTemplate: Story = {
  args: {
    inline: true,
    renderDay: (day) => (
      <span style={{ position: 'relative' }}>
        {day.day}
        {day.day % 7 === 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 'auto 0 -6px 0',
              height: 4,
              width: 4,
              margin: '0 auto',
              borderRadius: '50%',
              background: 'var(--informative-successhigh-surface-default)',
            }}
          />
        )}
      </span>
    ),
  },
  render: (args) => <Demo {...args} initial={ECHANTILLON} />,
};

/**
 * Le panneau vit dans le calque superieur : il echappe au rognage d'un ancetre
 * en `overflow: hidden`, et se retourne au-dessus du champ quand la place
 * manque en dessous.
 */
export const EscapesOverflow: Story = {
  args: { label: 'Date' },
  render: (args) => (
    <div
      style={{
        height: 150,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 'var(--units-md)',
        border: '1px dashed var(--global-border-default)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <Demo {...args} initial={ECHANTILLON} />
    </div>
  ),
};
