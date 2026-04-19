import { useState } from 'react';
import { RUN_KEY } from './meta.js';

export function useFragments() {
  const [collected, setCollected] = useState(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(RUN_KEY) || '{}');
      return Array.isArray(raw.fragments) ? raw.fragments : [];
    } catch { return []; }
  });

  const collect = (id) => {
    setCollected(prev => prev.includes(id) ? prev : [...prev, id]);
  };
  const clear = () => setCollected([]);
  return { collected, collect, clear, setCollected };
}
