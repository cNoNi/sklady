export type Rated = { id: number; name: string; mmr: number };
export type Split = { teamA: Rated[]; teamB: Rated[]; sumA: number; sumB: number; diff: number };

/**
 * Sprawdza wszystkie 126 unikalnych podziałów 10 graczy na 5v5 i zwraca `limit`
 * najbardziej wyrównanych (wg różnicy sum MMR). Remisy są losowane, a strony A/B tasowane.
 */
export function computeSplits(players: Rated[], limit = 20): Split[] {
  if (players.length !== 10) throw new Error("Potrzeba dokładnie 10 graczy.");
  const total = players.reduce((s, p) => s + p.mmr, 0);

  const found: { mask: number; sumA: number; diff: number; tie: number }[] = [];
  for (let mask = 1; mask < 1024; mask += 2) {
    // gracz 0 zawsze w A – unika lustrzanych duplikatów
    let bits = 0;
    for (let x = mask; x; x >>= 1) bits += x & 1;
    if (bits !== 5) continue;
    let sumA = 0;
    for (let i = 0; i < 10; i++) if (mask & (1 << i)) sumA += players[i].mmr;
    found.push({ mask, sumA, diff: Math.abs(total - 2 * sumA), tie: Math.random() });
  }
  found.sort((a, b) => a.diff - b.diff || a.tie - b.tie);

  return found.slice(0, limit).map((f) => {
    const a: Rated[] = [];
    const b: Rated[] = [];
    players.forEach((p, i) => (f.mask & (1 << i) ? a : b).push(p));
    const swap = Math.random() < 0.5;
    const [teamA, teamB] = swap ? [b, a] : [a, b];
    const sum = (t: Rated[]) => t.reduce((s, p) => s + p.mmr, 0);
    return { teamA, teamB, sumA: sum(teamA), sumB: sum(teamB), diff: f.diff };
  });
}

/** Zwraca `limit` całkowicie losowych podziałów 5v5, bez patrzenia na MMR. */
export function randomSplits(players: Rated[], limit = 20): Split[] {
  if (players.length !== 10) throw new Error("Potrzeba dokładnie 10 graczy.");
  const sum = (t: Rated[]) => t.reduce((s, p) => s + p.mmr, 0);
  return Array.from({ length: limit }, () => {
    const order = shuffle(players);
    const teamA = order.slice(0, 5);
    const teamB = order.slice(5);
    const sumA = sum(teamA);
    const sumB = sum(teamB);
    return { teamA, teamB, sumA, sumB, diff: Math.abs(sumA - sumB) };
  });
}

/** Opisowa ocena wyrównania – bezpieczna do pokazania, gdy MMR jest ukryty. */
export function describeBalance(diff: number, total: number): { label: string; level: 0 | 1 | 2 | 3 } {
  const r = total > 0 ? diff / total : 0;
  if (r <= 0.005) return { label: "Idealnie wyrównane", level: 0 };
  if (r <= 0.02) return { label: "Bardzo wyrównane", level: 1 };
  if (r <= 0.05) return { label: "Wyrównane", level: 2 };
  return { label: "Widoczna różnica poziomu", level: 3 };
}

export const ROLES = ["top", "jg", "mid", "adc", "support"] as const;
export type Role = (typeof ROLES)[number];

/** Losowo przydziela każdemu z 5 graczy drużyny inną linię. */
export function assignRoles<T>(team: T[]): (T & { role: Role })[] {
  if (team.length !== ROLES.length) throw new Error("Drużyna musi mieć 5 graczy.");
  const roles = shuffle(ROLES);
  return team.map((p, i) => ({ ...p, role: roles[i] }));
}

/** Tasowanie Fishera–Yatesa; zwraca nową tablicę. */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
