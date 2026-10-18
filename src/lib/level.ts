import { createContext, useContext } from 'react';

/** Who the page is written for: high-school biology ("learner") or protein scientists ("expert"). */
export type Level = 'learner' | 'expert';

const KEY = 'bioai.level';
export function initialLevel(): Level {
  try {
    const q = new URLSearchParams(window.location.search).get('level');
    if (q === 'learner' || q === 'expert') return q;
    const s = window.localStorage.getItem(KEY);
    if (s === 'learner' || s === 'expert') return s;
  } catch { /* storage blocked: fall through */ }
  return 'learner';
}
export function saveLevel(l: Level) {
  try { window.localStorage.setItem(KEY, l); } catch { /* not essential */ }
}

export const LevelContext = createContext<Level>('learner');
export const useLevel = () => useContext(LevelContext);
/** Pick the text for the current level. */
export const pick = <T,>(level: Level, t: { learner: T; expert: T }) => t[level];
