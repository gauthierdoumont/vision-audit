// Tests de l'interface J0 — Audit Detective, créé par Gauthier Doumont.
import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '../src/ui/App';
import pkg from '../package.json';

describe('App', () => {
  it("affiche l'écran d'accueil avec les modes de jeu", () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Audit Detective' })).toBeTruthy();
    expect(screen.getByText('Campagne')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Autres modes/ }));
    expect(screen.getByText('Défi du jour')).toBeTruthy();
    expect(screen.getByText('Grand dossier')).toBeTruthy();
  });

  it('ouvre « À propos » avec le crédit, puis revient', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'À propos' }));
    expect(screen.getByText('Créé par Gauthier Doumont')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }));
    expect(screen.getByText('Campagne')).toBeTruthy();
  });
});

describe('package.json', () => {
  it("indique l'auteur", () => {
    expect(pkg.author).toBe('Gauthier Doumont');
  });
});
