import { query } from "./db";

/**
 * Czy MMR ma być widoczny dla graczy na stronie głównej.
 * Wartość ustawia admin w panelu /admin; do tego czasu działa DEFAULT_SHOW_MMR (domyślnie: ukryty).
 */
export async function getShowMmr(): Promise<boolean> {
  const { rows } = await query<{ value: unknown }>(
    "SELECT value FROM settings WHERE key = 'show_mmr'"
  );
  if (rows.length) return rows[0].value === true;
  return process.env.DEFAULT_SHOW_MMR === "true";
}

export async function setShowMmr(value: boolean): Promise<void> {
  await query(
    `INSERT INTO settings (key, value) VALUES ('show_mmr', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(value)]
  );
}
