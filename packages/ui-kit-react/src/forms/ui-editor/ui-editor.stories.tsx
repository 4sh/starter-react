import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UiEditor } from './ui-editor';
import { DEFAULT_EDITOR_TOOLS } from './ui-editor-commands';

const meta: Meta<typeof UiEditor> = {
  title: 'Components/ui/forms/ui-editor',
  component: UiEditor,
  args: {
    label: 'Description',
    placeholder: 'Rédigez votre texte…',
    tools: [...DEFAULT_EDITOR_TOOLS],
    minRows: 4,
    showCount: false,
    toolbarPosition: 'top',
    size: 'default',
    level: 'default',
  },
  argTypes: {
    label: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    placeholder: { control: 'text' },
    tools: { control: 'object' },
    minRows: { control: 'number' },
    maxLength: { control: 'number' },
    showCount: { control: 'boolean' },
    toolbarPosition: { control: 'inline-radio', options: ['top', 'bottom'] },
    size: { control: 'inline-radio', options: ['default', 'small'] },
    level: { control: 'inline-radio', options: ['default', 'success', 'error'] },
    floatLabel: { control: 'inline-radio', options: [undefined, 'over', 'in', 'on'] },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    value: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 750, maxWidth: '92vw' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/GZww5hdUA49LB8XWeWP6tl/-Projet----UI-Kit?node-id=3691-39299',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UiEditor>;

const RICH =
  '<p>Un paragraphe avec du <strong>gras</strong>, de l’<em>italique</em> et un <a href="https://example.com">lien</a>.</p>' +
  '<ul><li>Premier point</li><li>Second point</li></ul>';

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: RICH, helperText: 'Le contenu est stocké en HTML.' },
};

export const WithHelper: Story = {
  args: {
    label: 'Commentaire',
    placeholder: 'Votre avis…',
    helperText: 'Mise en forme simple : gras, italique, listes, liens.',
  },
};

/** La barre est configurable : seuls les outils listés sont rendus. */
export const MinimalToolbar: Story = {
  args: {
    label: 'Note',
    tools: ['bold', 'italic'],
    defaultValue: '<p>Barre réduite au gras et à l’italique.</p>',
  },
};

/**
 * `codeBlock` bascule le bloc sous le curseur entre `<pre>` et paragraphe. Pas de
 * coloration syntaxique : elle imposerait une dépendance tierce.
 */
export const CodeBlock: Story = {
  args: {
    label: 'Documentation',
    defaultValue: '<p>Un exemple :</p><pre>pnpm kit:build</pre><p>et la suite.</p>',
  },
};

/**
 * `fontFamily` et `fontSize` sont dans la barre par défaut. La police est fermée
 * aux trois familles du système, la taille à l'échelle typographique ; chacune
 * s'écrit en classe, adossée à un jeton. La liste des polices affiche le nom
 * réel de chaque famille, lu sur son jeton.
 */
export const FontFamily: Story = {
  args: {
    label: 'Contenu',
    defaultValue:
      '<p><span class="ui-editor-font-title">Une accroche en police de titre</span></p>' +
      '<p>Un paragraphe en police standard.</p>' +
      '<p><span class="ui-editor-font-monospace">const x = 1;</span></p>',
  },
};

/** Les quatre tailles de l'échelle typographique. */
export const FontSize: Story = {
  args: {
    label: 'Contenu',
    defaultValue:
      '<p><span class="ui-editor-size-xl">Très grand</span>, ' +
      '<span class="ui-editor-size-lg">grand</span>, normal, ' +
      '<span class="ui-editor-size-sm">petit</span>.</p>',
  },
};

/** `indent` et `outdent` ne sont pas dans la barre par défaut : on les ajoute par `tools`. */
export const IndentOutdent: Story = {
  args: {
    label: 'Plan',
    tools: ['bulletList', 'orderedList', 'separator', 'indent', 'outdent'],
    defaultValue:
      '<ul><li>Premier point</li><li>Second point<ul><li>Sous-point</li></ul></li></ul>',
  },
};

/**
 * Les quatre alignements sont dans la barre par défaut, exclusifs par
 * construction du navigateur. Le navigateur les écrit en `style="text-align: …"`,
 * que le nettoyage laisse passer : un paragraphe centré le reste au rechargement.
 */
export const TextAlign: Story = {
  args: {
    label: 'Contenu',
    defaultValue:
      '<p style="text-align: center;">Centré.</p>' +
      '<p style="text-align: right;">Aligné à droite.</p>' +
      '<p style="text-align: justify;">Justifié : ce paragraphe est assez long pour que la justification s’y voie clairement sur plusieurs lignes.</p>',
  },
};

/**
 * `textColor` et `highlightColor` ne sont pas dans la barre par défaut. Chacun
 * ouvre un `ui-swatch-picker` ancré à son bouton, qui montre un liseré de la
 * couleur active sous l'icône. La palette est celle du nuancier, pour que ses
 * pastilles et les classes écrites restent le même jeu de jetons.
 */
export const ColorPickers: Story = {
  args: {
    label: 'Contenu',
    tools: ['bold', 'italic', 'separator', 'textColor', 'highlightColor'],
    // red-700 et non red-500 : le texte de démonstration doit rester contrasté (axe).
    defaultValue:
      '<p><span class="ui-editor-color-red-700">Texte en rouge</span>, ' +
      '<span class="ui-editor-highlight-orange-100">surligné en orange clair</span> ' +
      'et du texte normal.</p>',
  },
};

export const ToolbarBottom: Story = {
  args: {
    label: 'Message',
    toolbarPosition: 'bottom',
    defaultValue: '<p>La barre d’outils est sous la zone de saisie.</p>',
  },
};

export const Small: Story = {
  args: { label: 'Compact', size: 'small', minRows: 3, defaultValue: '<p>Variante compacte.</p>' },
};

export const Success: Story = {
  args: {
    label: 'Bio',
    level: 'success',
    helperText: 'Parfait.',
    defaultValue: '<p>Contenu validé.</p>',
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: RICH },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: RICH },
};

/** Le compteur mesure le **texte**, jamais le balisage. */
export const CharacterCount: Story = {
  args: {
    label: 'Commentaire',
    placeholder: '280 caractères max',
    maxLength: 280,
    showCount: true,
    defaultValue: '<p>Un court message.</p>',
  },
};

/** Un champ requis, marqué en erreur une fois quitté vide. */
function RequiredDemo() {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  return (
    <UiEditor
      label="Description"
      required
      value={value}
      onValueChange={setValue}
      onBlur={() => setTouched(true)}
      invalid={touched && !value}
      helperText="Champ obligatoire."
      errorText="Ce champ est requis."
    />
  );
}

export const Required: Story = {
  render: () => <RequiredDemo />,
};

/** Contrôlé : la valeur vit chez l'appelant, et c'est du HTML. */
function ControlledDemo() {
  const [value, setValue] = useState(RICH);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <UiEditor
        label="Description"
        placeholder="Rédigez votre texte…"
        value={value}
        onValueChange={setValue}
      />
      <pre
        style={{
          margin: 0,
          padding: 12,
          whiteSpace: 'pre-wrap',
          fontSize: 12,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--global-background-muted)',
          color: 'var(--global-text-default)',
        }}
      >
        {value || '(vide)'}
      </pre>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

export const FloatLabel: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 320px)',
        gap: 20,
        alignItems: 'start',
      }}
    >
      <UiEditor floatLabel="on" label="Description" minRows={3} />
      <UiEditor floatLabel="on" label="Description" minRows={3} defaultValue={RICH} />
    </div>
  ),
};
