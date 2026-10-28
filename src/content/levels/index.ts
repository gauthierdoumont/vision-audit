import type { Level } from '../types';
import { level001 } from './level-001';

export const LEVELS: Level[] = [level001];

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}
