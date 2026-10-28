import type { Level } from '../../content/types';
import { topicClueId } from '../../game/clues';
import { INTERVIEW_HOURS, type GameState } from '../../game/state';
import { formatHours } from '../format';
import type { Dispatch } from './GameScreen';

type Props = { level: Level; state: GameState; dispatch: Dispatch };

export function InterviewsTab({ level, state, dispatch }: Props) {
  return (
    <section>
      <h2 className="tab-title">Entretiens</h2>
      <p className="muted">Chaque sujet abordé coûte {formatHours(INTERVIEW_HOURS)}. Une réponse peut s'épingler.</p>
      {level.characters.map((character) => (
        <div key={character.id} className="character">
          <h3>
            {character.name} <span className="muted">· {character.role}</span>
          </h3>
          <ul className="card-list">
            {character.topics.map((topic) => {
              const asked = state.askedTopics.includes(`${character.id}.${topic.id}`);
              const clueId = topicClueId(character.id, topic.id);
              const pinned = state.pins.includes(clueId);
              return (
                <li key={topic.id} className="card static">
                  <p className="question">« {topic.question} »</p>
                  {asked ? (
                    <>
                      {topic.answer.map((line) => (
                        <p key={line} className="quote">{line}</p>
                      ))}
                      <button
                        type="button"
                        className="secondary"
                        aria-pressed={pinned}
                        onClick={() => dispatch({ type: 'toggle-pin', clueId })}
                      >
                        {pinned ? '📌 Épinglée — retirer' : '📌 Épingler la réponse'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => dispatch({ type: 'ask-topic', characterId: character.id, topicId: topic.id })}
                    >
                      Poser la question ({formatHours(INTERVIEW_HOURS)})
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
