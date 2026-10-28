// Entretiens : questions, réponses épinglables et confrontation avec un indice du carnet.
import { useState } from 'react';
import { DENIALS } from '../../content/dialogues';
import type { Character, CharacterProfile, Level, Topic } from '../../content/types';
import { confessionClueId, describeClue, topicClueId } from '../../game/clues';
import { confessed, INTERVIEW_HOURS, type GameState } from '../../game/state';
import { formatHours } from '../format';
import type { Dispatch } from './GameScreen';

type Props = { level: Level; state: GameState; dispatch: Dispatch };

const PROFILE_LABELS: Record<CharacterProfile, string> = {
  cooperatif: 'coopératif',
  nerveux: 'nerveux',
  evasif: 'évasif',
  arrogant: 'sûr de lui',
  complice: 'sur la défensive',
};

export function InterviewsTab({ level, state, dispatch }: Props) {
  return (
    <section>
      <h2 className="tab-title">Entretiens</h2>
      <p className="muted">
        Chaque question coûte {formatHours(INTERVIEW_HOURS)}. Une réponse te semble fausse ? Confronte-la à un indice du carnet (
        {formatHours(INTERVIEW_HOURS)}).
      </p>
      {level.characters.map((character) => (
        <div key={character.id} className="character">
          <h3>
            {character.name} <span className="muted">· {character.role} · attitude : {PROFILE_LABELS[character.profile]}</span>
          </h3>
          <ul className="card-list">
            {character.topics.map((topic) => (
              <TopicCard key={topic.id} level={level} state={state} dispatch={dispatch} character={character} topic={topic} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

type TopicProps = Props & { character: Character; topic: Topic };

function TopicCard({ level, state, dispatch, character, topic }: TopicProps) {
  const [choosing, setChoosing] = useState(false);
  const key = `${character.id}.${topic.id}`;
  const asked = state.askedTopics.includes(key);
  const clueId = topicClueId(character.id, topic.id);
  const confessionId = confessionClueId(character.id, topic.id);
  const hasConfessed = confessed(level, state, character.id, topic.id);
  const attempts = state.confrontations.filter((a) => a.startsWith(`${key}|`)).map((a) => a.split('|')[1]!);
  const evidence = state.pins.filter((p) => !p.startsWith('topic:') && !attempts.includes(p));
  const denial = topic.lie?.denial ?? DENIALS[character.profile];

  const pinButton = (id: string, label: string) => {
    const pinned = state.pins.includes(id);
    return (
      <button type="button" className="secondary" aria-pressed={pinned} onClick={() => dispatch({ type: 'toggle-pin', clueId: id })}>
        {pinned ? '📌 Épinglé — retirer' : `📌 ${label}`}
      </button>
    );
  };

  if (!asked) {
    return (
      <li className="card static">
        <p className="question">« {topic.question} »</p>
        <button type="button" className="primary" onClick={() => dispatch({ type: 'ask-topic', characterId: character.id, topicId: topic.id })}>
          Poser la question ({formatHours(INTERVIEW_HOURS)})
        </button>
      </li>
    );
  }

  return (
    <li className="card static">
      <p className="question">« {topic.question} »</p>
      {topic.answer.map((line) => (
        <p key={line} className="quote">{line}</p>
      ))}
      <div className="form-actions start">{pinButton(clueId, 'Épingler la réponse')}</div>

      {attempts.length > 0 && !hasConfessed && (
        <div className="confrontation">
          <p className="muted">Confronté à : {attempts.map((a) => describeClue(level, a)?.text ?? a).join(' ; ')}</p>
          {denial.map((line) => (
            <p key={line} className="quote">{line}</p>
          ))}
        </div>
      )}

      {hasConfessed && topic.lie ? (
        <div className="confrontation confession">
          <p className="clue-source">Aveu</p>
          {topic.lie.confession.map((line) => (
            <p key={line} className="quote">{line}</p>
          ))}
          <div className="form-actions start">{pinButton(confessionId, 'Épingler l’aveu')}</div>
        </div>
      ) : choosing ? (
        <div className="confrontation">
          {evidence.length === 0 ? (
            <p className="muted">Épingle d’abord des lignes de documents qui contredisent cette réponse.</p>
          ) : (
            <ul className="sample-list">
              {evidence.map((id) => {
                const clue = describeClue(level, id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="link-button evidence"
                      onClick={() => {
                        dispatch({ type: 'confront', characterId: character.id, topicId: topic.id, clueId: id });
                        setChoosing(false);
                      }}
                    >
                      <strong>{clue?.source}</strong> — {clue?.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="form-actions start">
            <button type="button" className="secondary" onClick={() => setChoosing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="form-actions start">
          <button type="button" className="secondary" onClick={() => setChoosing(true)}>
            Confronter avec un indice ({formatHours(INTERVIEW_HOURS)})
          </button>
        </div>
      )}
    </li>
  );
}
