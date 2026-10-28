// Formulaire de constat : validation et saisie à la belge. Audit Detective — Gauthier Doumont.
import { fireEvent, render, screen } from '@testing-library/react';
import { level001 } from '../src/content/levels/level-001';
import { FindingForm } from '../src/ui/game/FindingForm';
import { parseAmount } from '../src/ui/format';

describe('FindingForm', () => {
  it('refuse un constat incomplet, puis efface les erreurs à la saisie', () => {
    const onAdd = vi.fn();
    render(<FindingForm level={level001} pins={[]} onAdd={onAdd} onCancel={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le constat' }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('débit = crédit');
    fireEvent.change(screen.getByLabelText(/^Compte touché/), { target: { value: '440' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('accepte un constat complet et équilibré', () => {
    const onAdd = vi.fn();
    render(<FindingForm level={level001} pins={['journal-achats#a0413']} onAdd={onAdd} onCancel={() => undefined} />);
    const set = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.change(screen.getByLabelText(/^Compte touché/), { target: { value: '440' } });
    set('Assertion', 'existence');
    set("Montant de l'anomalie (€)", '3 392,00');
    fireEvent.click(screen.getByLabelText('Erreur'));
    fireEvent.click(screen.getByRole('button', { name: '+ Ligne' }));
    set('Compte ligne 1', '440');
    set('Débit ligne 1', '3392');
    set('Compte ligne 2', '604');
    set('Crédit ligne 2', '3200');
    set('Compte ligne 3', '411');
    set('Crédit ligne 3', '192');
    fireEvent.click(screen.getByRole('checkbox', { name: /Journal des achats/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le constat' }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onAdd.mock.calls[0]![0]).toMatchObject({ account: '440', amount: 3392, qualification: 'erreur' });
  });
});

describe('parseAmount', () => {
  it('lit les montants à la belge', () => {
    expect(parseAmount('3 392,00')).toBe(3392);
    expect(parseAmount('3.392,50')).toBe(3392.5);
    expect(parseAmount('192.5')).toBe(192.5);
    expect(parseAmount('abc')).toBeNaN();
  });
});

describe('FindingForm — information en annexe', () => {
  it('accepte un constat sans écriture quand l’annexe seule est en cause', () => {
    const onAdd = vi.fn();
    render(<FindingForm level={level001} pins={['journal-achats#a0413']} onAdd={onAdd} onCancel={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/^Compte touché/), { target: { value: '604' } });
    fireEvent.change(screen.getByLabelText('Assertion'), { target: { value: 'presentation' } });
    fireEvent.change(screen.getByLabelText("Montant de l'anomalie (€)"), { target: { value: '1000' } });
    fireEvent.click(screen.getByLabelText('Fraude'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Aucune écriture/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Journal des achats/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le constat' }));
    expect(onAdd.mock.calls[0]![0]).toMatchObject({ correction: [] });
  });
});
