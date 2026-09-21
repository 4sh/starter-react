import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { UiInputTags, type UiInputTagsProps } from './ui-input-tags';

const VILLES = ['Bordeaux', 'Bayonne', 'Lyon', 'Nantes', 'Paris', 'Toulouse'];

const GROUPES = [
  { label: 'Nouvelle-Aquitaine', items: ['Bordeaux', 'Bayonne', 'La Rochelle'] },
  { label: 'Occitanie', items: ['Toulouse', 'Montpellier', 'Nîmes'] },
];

const meta: Meta<UiInputTagsProps<string>> = {
  title: 'Components/ui/forms/ui-input-tags',
  component: UiInputTags,
  args: {
    label: 'Mots-clés',
    placeholder: 'Ajouter…',
    size: 'default',
    level: 'default',
    allowDuplicate: false,
    addOnBlur: false,
    addOnTab: false,
    addOnPaste: false,
    typeahead: false,
    chipLevel: 'default',
    chipSubLevel: 'low',
    chipRounded: true,
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    chipLevel: {
      control: 'select',
      options: ['default', 'highlight', 'success', 'warning', 'error'],
    },
    chipSubLevel: { control: 'inline-radio', options: ['low', 'high'] },
    max: { control: { type: 'number', min: 1, max: 10 } },
    value: { control: false },
    defaultValue: { control: false },
    suggestions: { control: false },
    delimiter: { control: false },
    renderTag: { control: false },
    renderOption: { control: false },
    renderGroup: { control: false },
  },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=2119-3190',
    },
  },
};

export default meta;
type Story = StoryObj<UiInputTagsProps<string>>;

function Demo({ initial = [], ...props }: UiInputTagsProps<string> & { initial?: string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      <UiInputTags<string> {...props} value={tags} onValueChange={setTags} />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>[{tags.join(', ')}]</code>
    </div>
  );
}

/** Le composant NE FILTRE RIEN : l'appelant répond à `onComplete`. */
function DemoTypeahead({
  source = VILLES,
  ...props
}: UiInputTagsProps<string> & { source?: readonly unknown[] }) {
  const [tags, setTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<readonly unknown[]>([]);

  return (
    <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 'var(--units-sm)' }}>
      <UiInputTags<string>
        {...props}
        typeahead
        suggestions={suggestions}
        value={tags}
        onValueChange={setTags}
        onComplete={(query) => {
          const q = query.trim().toLowerCase();
          if (props.group) {
            setSuggestions(
              (source as typeof GROUPES)
                .map((g) => ({ ...g, items: g.items.filter((i) => i.toLowerCase().includes(q)) }))
                .filter((g) => g.items.length),
            );
            return;
          }
          setSuggestions((source as string[]).filter((v) => v.toLowerCase().includes(q)));
        }}
      />
      <code style={{ fontSize: 12, color: 'var(--global-text-subtle)' }}>[{tags.join(', ')}]</code>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };

export const WithTags: Story = {
  render: (args) => <Demo {...args} initial={['design', 'système']} />,
};

/** `delimiter` verse chaque partie complète dans un tag, à la frappe. */
export const Delimiter: Story = {
  args: { delimiter: ',', helperText: 'Tapez « a, b, c » : chaque virgule pose un tag.' },
  render: (args) => <Demo {...args} />,
};

export const Max: Story = {
  args: { max: 3, helperText: 'Trois au maximum. Atteint, la saisie se ferme.' },
  render: (args) => <Demo {...args} initial={['un', 'deux']} />,
};

export const AllowDuplicate: Story = {
  args: { allowDuplicate: true },
  render: (args) => <Demo {...args} initial={['doublon']} />,
};

export const AddOnBlur: Story = {
  args: { addOnBlur: true, helperText: 'Le texte restant devient un tag à la sortie du champ.' },
  render: (args) => <Demo {...args} />,
};

export const AddOnTab: Story = {
  args: { addOnTab: true, helperText: 'Tab pose le tag au lieu de quitter le champ.' },
  render: (args) => <Demo {...args} />,
};

export const AddOnPaste: Story = {
  args: {
    addOnPaste: true,
    helperText: 'Collez « a, b ; c » : le collage se découpe tout seul.',
  },
  render: (args) => <Demo {...args} />,
};

export const MaxLength: Story = {
  args: { maxLength: 8, helperText: 'Huit caractères par tag.' },
  render: (args) => <Demo {...args} />,
};

export const Small: Story = {
  args: { size: 'small' },
  render: (args) => <Demo {...args} initial={['un', 'deux']} />,
};

export const FloatLabel: Story = {
  args: { floatLabel: 'on', placeholder: undefined },
  render: (args) => <Demo {...args} initial={['design']} />,
};

export const Required: Story = {
  args: { required: true },
  render: (args) => <Demo {...args} />,
};

export const Error: Story = {
  args: { invalid: true, errorText: 'Au moins un mot-clé est attendu.' },
  render: (args) => <Demo {...args} />,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Demo {...args} initial={['design', 'système']} />,
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  render: (args) => <Demo {...args} initial={['design', 'système']} />,
};

/** Habillage des tags : toute la palette de `ui-chip` est disponible. */
export const ChipAppearance: Story = {
  args: { chipLevel: 'highlight', chipSubLevel: 'high', chipRounded: false },
  render: (args) => <Demo {...args} initial={['design', 'système']} />,
};

/** Panneau de suggestions. Une valeur déjà posée y est cochée, et désactivée. */
export const Typeahead: Story = {
  render: (args) => <DemoTypeahead {...args} label="Villes" placeholder="Chercher…" />,
};

export const TypeaheadGroups: Story = {
  render: (args) => (
    <DemoTypeahead {...args} group source={GROUPES} label="Villes" placeholder="Chercher…" />
  ),
};

export const TypeaheadOnFocus: Story = {
  render: (args) => (
    <DemoTypeahead
      {...args}
      completeOnFocus
      minLength={0}
      autoOptionFocus
      label="Villes"
      placeholder="Cliquez pour voir la liste"
    />
  ),
};

/**
 * `renderTag` remplace le contenu d'un tag, jamais son rôle d'option. Le
 * contenu projeté **ne doit contenir aucun contrôle focalisable** : le tag est
 * déjà une `option` interactive, et imbriquer un `<button>` dedans est invalide
 * (`nested-interactive`). La croix est donc une décoration `aria-hidden`, et le
 * retrait au clavier passe par Suppr sur le tag.
 */
export const CustomTag: Story = {
  args: {
    renderTag: ({ label, remove }) => (
      <>
        <strong style={{ fontSize: 12 }}>#{label}</strong>
        {/* Décoration : pas de `<button>`, pas de `tabindex`. */}
        <span
          aria-hidden="true"
          onClick={remove}
          style={{ cursor: 'pointer', color: 'var(--form-low-content-default)' }}
        >
          ×
        </span>
      </>
    ),
  },
  render: (args) => <Demo {...args} initial={['design', 'système']} />,
};

/**
 * Le panneau vit dans le calque supérieur : aucun ancêtre en `overflow: hidden`
 * ne le rogne.
 */
export const EscapesOverflow: Story = {
  render: (args) => (
    <div
      style={{
        height: 140,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 'var(--units-md)',
        border: '1px dashed var(--global-border-default)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <DemoTypeahead {...args} label="Villes" placeholder="Chercher…" />
    </div>
  ),
};
