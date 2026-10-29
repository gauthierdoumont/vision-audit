// Débrief : solution consultée et explication des erreurs à l'écran. Audit Detective — Gauthier Doumont.
import { fireEvent, render, screen } from '@testing-library/react';
import { level001 as level } from '../src/content/levels/level-001';
import { scoreGame } from '../src/game/scoring';
import { createGame, gameReducer, type GameAction, type GameState } from '../src/game/state';
import { ConclusionTab } from '../src/ui/game/ConclusionTab';
import { DebriefScreen } from '../src/ui/screens/DebriefScreen';

const play = (...actions: GameAction[]): GameState => actions.reduce((state, action) => gameReducer(level, state, action), createGame(level));
const noop = () => undefined;

describe('débrief', () => {
  it('montre ta réponse, l’attendu et le pourquoi', () => {
    const state = play(
      { type: 'set-opinion', opinion: 'avec-reserve' },
      { type: 'set-continuity', continuity: false },
      {
        type: 'add-finding',
        finding: { id: 'f1', account: '440', assertion: 'exhaustivite', amount: 3392, qualification: 'fraude', correction: [], clues: [] },
      },
      { type: 'submit' },
    );
    render(<DebriefScreen level={level} state={state} result={scoreGame(level, state)} onReplay={noop} onHome={noop} />);
    expect(screen.getAllByText('Ta réponse :').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/existe-t-il vraiment/)).toBeTruthy();
    expect(screen.getByText(/accusation grave/)).toBeTruthy();
    expect(screen.getByText(/Ton choix/)).toBeTruthy();
  });

  it('anomalie manquée après solution consultée : où la chercher', () => {
    const state = play({ type: 'view-solution' });
    render(<DebriefScreen level={level} state={state} result={scoreGame(level, state)} onReplay={noop} onHome={noop} />);
    expect(screen.getByText(/Solution consultée/)).toBeTruthy();
    expect(screen.getByText('Où la chercher')).toBeTruthy();
  });
});

describe('conclusion', () => {
  it('« Voir la solution » demande confirmation', () => {
    const dispatch = vi.fn();
    render(<ConclusionTab level={level} state={createGame(level)} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: /Je sèche/ }));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Voir la solution' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'view-solution' });
  });
});
