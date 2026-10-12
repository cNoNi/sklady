/** Normalizacja nicku: bez różnic wielkości liter i nadmiarowych spacji. */
export const normNick = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, " ");
