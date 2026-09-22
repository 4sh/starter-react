import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiStep,
  UiStepItem,
  UiStepList,
  UiStepPanel,
  UiStepPanels,
  UiStepper,
  useUiStepper,
  type UiStepperProps,
  type UiStepValue,
} from './ui-stepper';

function Host(props: Partial<UiStepperProps>) {
  return (
    <UiStepper defaultValue={1} {...props}>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Compte</UiStep>
        <UiStep value={2}>Profil</UiStep>
        <UiStep value={3}>Confirmation</UiStep>
      </UiStepList>
      <UiStepPanels>
        <UiStepPanel value={1}>Contenu 1</UiStepPanel>
        <UiStepPanel value={2}>Contenu 2</UiStepPanel>
        <UiStepPanel value={3}>Contenu 3</UiStepPanel>
      </UiStepPanels>
    </UiStepper>
  );
}

const steps = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.ui-step')];
const headers = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>('.ui-step-header'),
];
const panels = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-step-panel'),
];
const markers = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-step-marker'),
];

// --- Progression -----------------------------------------------------------
// L'avancement se DÉDUIT de l'étape courante : c'est ce qui distingue un
// stepper d'une bande d'onglets.
test('l’état d’une étape se déduit de sa place dans la séquence', async () => {
  const screen = await render(<Host defaultValue={2} />);
  const all = steps(screen.container);

  expect(all[0]).toHaveClass('_completed');
  expect(all[1]).toHaveClass('_active');
  expect(all[2]).not.toHaveClass('_completed', '_active');
});

// La séquence se lit dans les `children`, donc elle est juste dès le PREMIER
// rendu, sans passe de mesure.
test('les marqueurs sont numérotés dans l’ordre', async () => {
  const screen = await render(<Host />);

  expect(markers(screen.container).map((m) => m.textContent)).toEqual(['1', '2', '3']);
});

test('completedIcon remplace le numéro des étapes franchies', async () => {
  const screen = await render(<Host defaultValue={3} completedIcon="check" />);

  expect(markers(screen.container)[0]!.querySelector('.ui-icon')).toHaveClass('fa-check');
  expect(markers(screen.container)[2]).toHaveTextContent('3');
});

test('l’icône d’une étape gagne sur le numéro et sur completedIcon', async () => {
  const screen = await render(
    <UiStepper defaultValue={2} completedIcon="check">
      <UiStepList aria-label="Étapes">
        <UiStep value={1} icon="pen">
          Rédaction
        </UiStep>
        <UiStep value={2}>Relecture</UiStep>
      </UiStepList>
    </UiStepper>,
  );

  expect(markers(screen.container)[0]!.querySelector('.ui-icon')).toHaveClass('fa-pen');
});

// --- Sémantique horizontale ------------------------------------------------
test('en horizontal, la bande est une tablist et les étapes des onglets', async () => {
  const screen = await render(<Host defaultValue={2} />);

  expect(screen.container.querySelector('[role="tablist"]')).toHaveAttribute(
    'aria-label',
    'Étapes',
  );
  expect(headers(screen.container)[1]).toHaveAttribute('role', 'tab');
  expect(headers(screen.container)[1]).toHaveAttribute('aria-selected', 'true');
  expect(headers(screen.container)[0]).toHaveAttribute('aria-selected', 'false');
  expect(panels(screen.container)[1]).toHaveAttribute('role', 'tabpanel');
});

// `aria-current="step"` dit OÙ l'on en est, ce qu'`aria-selected` ne dit pas.
test('l’étape courante porte aria-current', async () => {
  const screen = await render(<Host defaultValue={2} />);

  expect(screen.container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  expect(headers(screen.container)[1]).toHaveAttribute('aria-current', 'step');
});

test('chaque en-tête pointe son panneau, et réciproquement', async () => {
  const screen = await render(<Host />);

  expect(headers(screen.container)[0]!.getAttribute('aria-controls')).toBe(
    panels(screen.container)[0]!.id,
  );
  expect(panels(screen.container)[0]!.getAttribute('aria-labelledby')).toBe(
    headers(screen.container)[0]!.id,
  );
});

// Un `aria-controls` qui ne résout rien est refusé : la bande seule est un
// usage prévu, celui de l'indicateur d'avancement.
test('sans panneaux, aucun aria-controls n’est posé', async () => {
  const screen = await render(
    <UiStepper defaultValue={2}>
      <UiStepList aria-label="Progression">
        <UiStep value={1}>Devis</UiStep>
        <UiStep value={2}>Validation</UiStep>
      </UiStepList>
    </UiStepper>,
  );

  for (const header of headers(screen.container)) {
    expect(header).not.toHaveAttribute('aria-controls');
  }
});

// --- Sémantique verticale --------------------------------------------------
// Un onglet qui contiendrait son propre panneau est de l'ARIA invalide : en
// vertical, le motif devient celui de l'accordéon.
test('en vertical, la sémantique passe à l’accordéon', async () => {
  const screen = await render(
    <UiStepper orientation="vertical" defaultValue={2} aria-label="Commande">
      <UiStepItem value={1}>
        <UiStep>Panier</UiStep>
        <UiStepPanel>Contenu 1</UiStepPanel>
      </UiStepItem>
      <UiStepItem value={2}>
        <UiStep>Livraison</UiStep>
        <UiStepPanel>Contenu 2</UiStepPanel>
      </UiStepItem>
    </UiStepper>,
  );
  const racine = screen.container.querySelector('.ui-stepper')!;

  expect(racine).toHaveAttribute('role', 'group');
  expect(racine).toHaveAttribute('aria-label', 'Commande');
  expect(screen.container.querySelector('[role="tablist"]')).toBeNull();
  expect(headers(screen.container)[1]).not.toHaveAttribute('role');
  expect(headers(screen.container)[1]).toHaveAttribute('aria-expanded', 'true');
  expect(headers(screen.container)[0]).toHaveAttribute('aria-expanded', 'false');
  expect(panels(screen.container)[1]).toHaveAttribute('role', 'region');
});

// L'item porte la valeur pour les deux enfants : c'est ce qui garde le balisage
// vertical court.
test('l’item prête sa valeur à son étape et à son panneau', async () => {
  const screen = await render(
    <UiStepper orientation="vertical" defaultValue="b" aria-label="Commande">
      <UiStepItem value="a">
        <UiStep>Un</UiStep>
        <UiStepPanel>Contenu A</UiStepPanel>
      </UiStepItem>
      <UiStepItem value="b">
        <UiStep>Deux</UiStep>
        <UiStepPanel>Contenu B</UiStepPanel>
      </UiStepItem>
    </UiStepper>,
  );

  expect(steps(screen.container)[0]).toHaveClass('_completed');
  expect(steps(screen.container)[1]).toHaveClass('_active');
  expect(panels(screen.container)[1]).toHaveClass('_active');
  expect(headers(screen.container)[1]!.id).toContain('step-b');
});

test('le dernier item ne tire pas de rail', async () => {
  const screen = await render(
    <UiStepper orientation="vertical" defaultValue="a" aria-label="Commande">
      <UiStepItem value="a">
        <UiStep>Un</UiStep>
      </UiStepItem>
      <UiStepItem value="b">
        <UiStep>Deux</UiStep>
      </UiStepItem>
    </UiStepper>,
  );
  const items = [...screen.container.querySelectorAll('.ui-step-item')];

  expect(items[0]).not.toHaveClass('_last');
  expect(items[1]).toHaveClass('_last');
});

// --- Activation ------------------------------------------------------------
test('cliquer une étape la rend courante', async () => {
  const onValueChange = vi.fn();
  const onStepChange = vi.fn();
  const screen = await render(<Host onValueChange={onValueChange} onStepChange={onStepChange} />);

  await screen.getByRole('tab', { name: 'Confirmation' }).click();

  await expect.poll(() => steps(screen.container)[2]!.className).toContain('_active');
  expect(onValueChange).toHaveBeenLastCalledWith(3);
  expect(onStepChange).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }));
});

test('recliquer l’étape courante ne notifie rien', async () => {
  const onStepChange = vi.fn();
  const screen = await render(<Host onStepChange={onStepChange} />);

  await screen.getByRole('tab', { name: 'Compte' }).click();
  await new Promise((r) => setTimeout(r, 30));

  expect(onStepChange).not.toHaveBeenCalled();
});

// Chaque en-tête atteignable est un arrêt de tabulation naturel : `Entrée` et
// `Espace` activent, sans clavier sur mesure.
test('les en-têtes sont des boutons natifs, tous dans le parcours', async () => {
  const screen = await render(<Host />);

  for (const header of headers(screen.container)) {
    expect(header.tagName).toBe('BUTTON');
    expect(header).toHaveAttribute('type', 'button');
    expect(header.tabIndex).toBe(0);
  }
});

test('une étape désactivée n’est ni activable ni atteignable', async () => {
  const screen = await render(
    <UiStepper defaultValue={1}>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Un</UiStep>
        <UiStep value={2} disabled>
          Deux
        </UiStep>
      </UiStepList>
    </UiStepper>,
  );

  expect(headers(screen.container)[1]).toBeDisabled();
  expect(steps(screen.container)[1]).toHaveClass('_disabled');
});

// En mode linéaire on ne saute pas en avant : ce qui reste à venir est fermé,
// ce qui est franchi reste accessible pour revenir en arrière.
test('linear ferme les étapes à venir, et garde les précédentes', async () => {
  const screen = await render(<Host linear defaultValue={2} />);

  expect(headers(screen.container)[0]).not.toBeDisabled();
  expect(headers(screen.container)[1]).not.toBeDisabled();
  expect(headers(screen.container)[2]).toBeDisabled();
});

// --- Panneaux --------------------------------------------------------------
// Le panneau reste monté : l'état d'un formulaire survit au passage d'une
// étape à l'autre.
test('un panneau inactif reste monté mais devient inerte', async () => {
  const screen = await render(<Host />);

  expect(panels(screen.container)).toHaveLength(3);
  expect(panels(screen.container)[1]).toHaveAttribute('inert');
  expect(panels(screen.container)[1]!.textContent).toContain('Contenu 2');
  expect(panels(screen.container)[0]).not.toHaveAttribute('inert');
});

test('le panneau courant est le seul dans le parcours clavier', async () => {
  const screen = await render(<Host defaultValue={2} />);

  expect(panels(screen.container).map((p) => p.getAttribute('tabindex'))).toEqual([
    null,
    '0',
    null,
  ]);
});

test('lazy ne rend le contenu qu’à la première activation, puis le garde', async () => {
  const screen = await render(<Host lazy />);

  expect(panels(screen.container)[1]!.textContent).not.toContain('Contenu 2');

  await screen.getByRole('tab', { name: 'Profil' }).click();
  await expect.poll(() => panels(screen.container)[1]!.textContent).toContain('Contenu 2');

  await screen.getByRole('tab', { name: 'Compte' }).click();
  await expect.poll(() => steps(screen.container)[0]!.className).toContain('_active');
  // Collé : paresseux ne veut pas dire démonté à chaque sortie.
  expect(panels(screen.container)[1]!.textContent).toContain('Contenu 2');
});

test('un panneau surcharge le lazy du groupe', async () => {
  const screen = await render(
    <UiStepper defaultValue={1} lazy>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Un</UiStep>
        <UiStep value={2}>Deux</UiStep>
      </UiStepList>
      <UiStepPanels>
        <UiStepPanel value={1}>Contenu 1</UiStepPanel>
        <UiStepPanel value={2} lazy={false}>
          Contenu 2
        </UiStepPanel>
      </UiStepPanels>
    </UiStepper>,
  );

  expect(panels(screen.container)[1]!.textContent).toContain('Contenu 2');
});

test('motion=false supprime la transition du panneau', async () => {
  const screen = await render(<Host motion={false} />);
  const repli = screen.container.querySelector('.ui-step-panel-collapse')!;

  expect(repli).toHaveClass('_no-motion');
  expect(getComputedStyle(repli).transitionProperty).toBe('none');
});

// --- Contrôles -------------------------------------------------------------
// Le pendant React de `next()` et `prev()` : un bouton « Suivant » vit dans un
// panneau, donc il lit le contexte plutôt qu'une poignée descendue du parent.
function Navigation() {
  const { next, prev, isFirst, isLast, value } = useUiStepper();

  return (
    <>
      <button type="button" onClick={prev} disabled={isFirst}>
        Précédent
      </button>
      <button type="button" onClick={next} disabled={isLast}>
        Suivant
      </button>
      <span data-courant="">{String(value)}</span>
    </>
  );
}

// La navigation est posée HORS des panneaux : un panneau qui n'est plus courant
// devient inerte, donc les boutons qu'il contient cessent d'être cliquables. En
// vrai on en met un par panneau, ce que montre la story `Linear`.
test('useUiStepper avance et recule dans la séquence', async () => {
  const screen = await render(
    <UiStepper defaultValue={1}>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Un</UiStep>
        <UiStep value={2}>Deux</UiStep>
        <UiStep value={3}>Trois</UiStep>
      </UiStepList>
      <Navigation />
    </UiStepper>,
  );

  expect(screen.container.querySelector('[data-courant]')).toHaveTextContent('1');
  expect(screen.getByRole('button', { name: 'Précédent' })).toBeDefined();

  await screen.getByRole('button', { name: 'Suivant' }).click();
  await expect.poll(() => screen.container.querySelector('[data-courant]')?.textContent).toBe('2');

  await screen.getByRole('button', { name: 'Précédent' }).click();
  await expect.poll(() => screen.container.querySelector('[data-courant]')?.textContent).toBe('1');
});

test('useUiStepper s’arrête aux bornes de la séquence', async () => {
  const screen = await render(
    <UiStepper defaultValue={2}>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Un</UiStep>
        <UiStep value={2}>Deux</UiStep>
      </UiStepList>
      <Navigation />
    </UiStepper>,
  );

  expect(screen.getByRole('button', { name: 'Suivant' }).element()).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Précédent' }).element()).not.toBeDisabled();
});

// --- Contrôlé --------------------------------------------------------------
test('en mode contrôlé, l’étape appartient à l’appelant', async () => {
  function Controlled() {
    const [step, setStep] = useState<UiStepValue>(1);
    return (
      <>
        <button type="button" onClick={() => setStep(3)}>
          Aller à la fin
        </button>
        <Host value={step} />
      </>
    );
  }
  const screen = await render(<Controlled />);

  await screen.getByRole('tab', { name: 'Profil' }).click();
  await new Promise((r) => setTimeout(r, 30));
  expect(steps(screen.container)[0]).toHaveClass('_active');

  await screen.getByRole('button', { name: 'Aller à la fin' }).click();
  await expect.poll(() => steps(screen.container)[2]!.className).toContain('_active');
});

// Corollaire du panneau inerte : ce qu'il contient cesse d'être atteignable dès
// qu'on quitte l'étape, ce qui est exactement ce qu'on veut d'un assistant.
test('les contrôles d’un panneau quitté ne sont plus atteignables', async () => {
  const screen = await render(
    <UiStepper defaultValue={1}>
      <UiStepList aria-label="Étapes">
        <UiStep value={1}>Un</UiStep>
        <UiStep value={2}>Deux</UiStep>
      </UiStepList>
      <UiStepPanels>
        <UiStepPanel value={1}>
          <button type="button">Action de l’étape 1</button>
        </UiStepPanel>
        <UiStepPanel value={2}>Contenu 2</UiStepPanel>
      </UiStepPanels>
    </UiStepper>,
  );
  const action = screen.container.querySelector<HTMLButtonElement>('.ui-step-panel button')!;

  expect(panels(screen.container)[0]).not.toHaveAttribute('inert');
  action.focus();
  expect(document.activeElement).toBe(action);

  await screen.getByRole('tab', { name: 'Deux' }).click();

  await expect.poll(() => panels(screen.container)[0]!.hasAttribute('inert')).toBe(true);
  action.focus();
  expect(document.activeElement).not.toBe(action);
});

test('le connecteur ne suit que les étapes franchies', async () => {
  const screen = await render(<Host defaultValue={2} />);
  const connecteurs = [...screen.container.querySelectorAll('.ui-step-separator')];

  // Deux connecteurs pour trois étapes : le dernier n'en a pas.
  expect(connecteurs).toHaveLength(2);
  expect(connecteurs[0]).toHaveClass('_completed');
  expect(connecteurs[1]).not.toHaveClass('_completed');
});

test('hors d’un stepper, l’étape le dit', async () => {
  await expect(render(<UiStep value={1}>Seule</UiStep>)).rejects.toThrow(/UiStepper/);
});
