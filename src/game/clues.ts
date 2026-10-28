// Indices épinglables : une ligne de document (`doc#ligne`) ou une réponse d'entretien (`topic:perso.sujet`).
import type { Level } from '../content/types';

export function documentClueId(documentId: string, lineId: string): string {
  return `${documentId}#${lineId}`;
}

export function topicClueId(characterId: string, topicId: string): string {
  return `topic:${characterId}.${topicId}`;
}

export type ClueInfo = { source: string; text: string };

export function describeClue(level: Level, clueId: string): ClueInfo | undefined {
  if (clueId.startsWith('topic:')) {
    const [characterId, topicId] = clueId.slice('topic:'.length).split('.');
    const character = level.characters.find((c) => c.id === characterId);
    const topic = character?.topics.find((t) => t.id === topicId);
    if (!character || !topic) return undefined;
    return { source: `Entretien — ${character.name}`, text: topic.answer.join(' ') };
  }
  const [documentId, lineId] = clueId.split('#');
  const doc = level.documents.find((d) => d.id === documentId);
  const line = doc?.lines.find((l) => l.id === lineId);
  if (!doc || !line) return undefined;
  return { source: doc.title, text: line.cells.filter(Boolean).join(' · ') };
}
