import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiCard } from './ui-card';

test('le corps est rendu, et les zones absentes ne le sont pas', async () => {
  const screen = await render(<UiCard>Contenu</UiCard>);

  expect(screen.container.querySelector('.ui-card-content')!.textContent).toBe('Contenu');
  expect(screen.container.querySelector('.ui-card-header')).toBeNull();
  expect(screen.container.querySelector('.ui-card-media')).toBeNull();
  expect(screen.container.querySelector('.ui-card-footer')).toBeNull();
});

test('un sous-titre seul suffit à rendre l’en-tête', async () => {
  const screen = await render(<UiCard subheader="Seulement le sous-titre" />);

  expect(screen.container.querySelector('.ui-card-header')).toBeInTheDocument();
  expect(screen.container.querySelector('.ui-card-title')).toBeNull();
});

test('un corps vide marque la zone plutôt que de la supprimer', async () => {
  const screen = await render(<UiCard header="Titre" />);

  expect(screen.container.querySelector('.ui-card-content')).toHaveClass('_empty');
});

test('les cinq zones se rendent ensemble, dans l’ordre', async () => {
  const screen = await render(
    <UiCard
      media={<i data-role="media" />}
      header="Titre"
      subheader="Sous-titre"
      footer={<i data-role="pied" />}
    >
      Corps
    </UiCard>,
  );
  const root = screen.container.querySelector('.ui-card')!;

  expect(root.querySelector('.ui-card-media')).toBeInTheDocument();
  expect(root.querySelector('.ui-card-title')!.textContent).toBe('Titre');
  expect(root.querySelector('.ui-card-subtitle')!.textContent).toBe('Sous-titre');
  expect(root.querySelector('.ui-card-footer')).toBeInTheDocument();
  expect(root.firstElementChild).toHaveClass('ui-card-media');
});

test('la variante compose sa classe', async () => {
  const screen = await render(<UiCard variant="elevated">Corps</UiCard>);

  expect(screen.container.querySelector('.ui-card')).toHaveClass('_elevated');
});

// Le rôle de repère n'a de sens qu'avec un nom : anonyme, il encombrerait la
// liste des repères sans rien y apporter.
test('sans nom, la carte n’est pas un point de repère', async () => {
  const screen = await render(<UiCard>Corps</UiCard>);

  expect(screen.container.querySelector('.ui-card')).not.toHaveAttribute('role');
});

test('nommée, la carte devient une région', async () => {
  const screen = await render(<UiCard aria-label="Forfait Équipe">Corps</UiCard>);

  await expect.element(screen.getByRole('region', { name: 'Forfait Équipe' })).toBeInTheDocument();
});

test('fluid occupe toute la largeur du parent', async () => {
  const screen = await render(
    <div style={{ display: 'flex', width: 400 }}>
      <UiCard fluid>Corps</UiCard>
    </div>,
  );

  expect(screen.container.querySelector('.ui-card')!.getBoundingClientRect().width).toBe(400);
});

test('dans une rangée, les cartes s’alignent en hauteur', async () => {
  const screen = await render(
    <div style={{ display: 'flex', width: 400, alignItems: 'stretch' }}>
      <UiCard fluid>Court</UiCard>
      <UiCard fluid>
        Un contenu nettement plus long, qui tient sur plusieurs lignes et fait grandir sa carte.
      </UiCard>
    </div>,
  );
  const [a, b] = [...screen.container.querySelectorAll('.ui-card')];

  expect(a!.getBoundingClientRect().height).toBe(b!.getBoundingClientRect().height);
});
