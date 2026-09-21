import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiAlert } from './ui-alert';

test('annonce le message dès son apparition', async () => {
  const screen = await render(<UiAlert title="Erreur" text="Le formulaire est invalide." />);
  const alert = screen.container.querySelector('.ui-alert')!;

  expect(alert).toHaveAttribute('role', 'alert');
  expect(alert).toHaveAttribute('aria-atomic', 'true');
  expect(alert.textContent).toContain('Le formulaire est invalide.');
});

test('compose ses classes de niveau et de taille', async () => {
  const screen = await render(
    <UiAlert title="Succès" text="Fait." level="success" subLevel="low" size="large" />,
  );

  expect(screen.container.querySelector('.ui-alert')).toHaveClass('_success', '_low', '_large');
});

test('l’icône de tête est celle du niveau', async () => {
  const screen = await render(<UiAlert level="warning" title="Attention" text="Vérifiez." />);

  expect(screen.container.querySelector('.ui-alert-icon .ui-icon')).toHaveClass('fa-warning');
});

test('icon={false} retire l’icône de tête', async () => {
  const screen = await render(<UiAlert level="error" icon={false} title="Erreur" text="Raté." />);

  expect(screen.container.querySelector('.ui-alert-icon')).toBeNull();
});

test('un titre seul se centre, l’icône n’ayant pas de ligne où s’aligner', async () => {
  const screen = await render(<UiAlert title="Import terminé" />);

  expect(screen.container.querySelector('.ui-alert')).toHaveClass('_title-only');
});

// Le contenu projeté est une ligne de plus : l'alignement en tête redevient le bon.
test('un contenu projeté annule le mode titre seul', async () => {
  const screen = await render(
    <UiAlert title="Import terminé">
      <a href="#rapport">Voir le rapport</a>
    </UiAlert>,
  );

  expect(screen.container.querySelector('.ui-alert')).not.toHaveClass('_title-only');
});

test('non contrôlée, l’alerte se retire elle-même', async () => {
  const onClose = vi.fn();
  const screen = await render(<UiAlert title="Info" text="Message." onClose={onClose} />);

  await screen.getByRole('button', { name: 'Fermer' }).click();

  await expect.poll(() => screen.container.querySelector('.ui-alert')).toBeNull();
  expect(onClose).toHaveBeenCalledTimes(1);
});

// `open` renseignée, l'état appartient au parent : le composant signale, il ne
// décide pas. Une alerte qui disparaîtrait quand même aurait deux sources de vérité.
test('contrôlée, elle reste affichée tant que le parent ne la retire pas', async () => {
  const onOpenChange = vi.fn();
  const screen = await render(
    <UiAlert open title="Info" text="Message." onOpenChange={onOpenChange} />,
  );

  await screen.getByRole('button', { name: 'Fermer' }).click();

  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(screen.container.querySelector('.ui-alert')).not.toBeNull();
});

test('closable={false} retire le bouton de fermeture', async () => {
  const screen = await render(<UiAlert closable={false} title="Info" text="Message." />);

  expect(screen.container.querySelector('.ui-alert-close')).toBeNull();
});

test('closeAriaLabel nomme le bouton de fermeture', async () => {
  const screen = await render(<UiAlert title="Info" text="Message." closeAriaLabel="Masquer" />);

  await expect.element(screen.getByRole('button', { name: 'Masquer' })).toBeInTheDocument();
});

test('sans life, rien ne disparaît tout seul', async () => {
  vi.useFakeTimers();
  try {
    const screen = await render(<UiAlert title="Info" text="Message." />);
    vi.advanceTimersByTime(10_000);
    expect(screen.container.querySelector('.ui-alert')).not.toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test('life fait disparaître l’alerte et prévient l’appelant', async () => {
  const onClose = vi.fn();
  const screen = await render(
    <UiAlert title="Enregistré" text="Fait." life={80} onClose={onClose} />,
  );

  await expect.poll(() => screen.container.querySelector('.ui-alert')).toBeNull();
  expect(onClose).toHaveBeenCalledTimes(1);
});

// Le motif « dernière valeur » : sans lui, un `onClose` écrit en ligne changerait
// à chaque rendu du parent, relancerait le délai, et l'alerte ne partirait jamais.
test('un rendu du parent ne relance pas le compte à rebours', async () => {
  const onClose = vi.fn();

  function Host() {
    return <UiAlert title="Enregistré" text="Fait." life={80} onClose={() => onClose()} />;
  }

  const screen = await render(<Host />);
  await screen.rerender(<Host />);

  await expect.poll(() => screen.container.querySelector('.ui-alert')).toBeNull();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('className et rest atterrissent sur la racine', async () => {
  const screen = await render(
    <UiAlert title="Info" text="Message." className="maison" data-test="x" />,
  );
  const alert = screen.container.querySelector('.ui-alert')!;

  expect(alert).toHaveClass('maison');
  expect(alert).toHaveAttribute('data-test', 'x');
});
