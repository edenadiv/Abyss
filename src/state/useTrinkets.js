import { useState } from 'react';
import { TRINKETS } from '../mythology/trinkets.js';
import { RUN_KEY } from './meta.js';

export function useTrinkets() {
  const [owned, setOwned] = useState(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(RUN_KEY) || '{}');
      return Array.isArray(raw.trinkets) ? raw.trinkets : [];
    } catch { return []; }
  });

  const buy = (id) => {
    setOwned(prev => {
      const def = TRINKETS.find(t => t.id === id);
      if (!def) return prev;
      const existing = prev.find(t => t.id === id);
      if (existing) {
        return prev.map(t => t.id === id ? { ...t, charges: t.charges + def.charges } : t);
      }
      return [...prev, { id, charges: def.charges }];
    });
  };
  const consume = (id, amount = 1) => {
    setOwned(prev => prev.flatMap(t => {
      if (t.id !== id) return [t];
      const c = t.charges - amount;
      return c <= 0 ? [] : [{ ...t, charges: c }];
    }));
  };
  const has = (id) => owned.some(t => t.id === id && t.charges > 0);
  const clear = () => setOwned([]);
  return { owned, buy, consume, has, clear, setOwned };
}
