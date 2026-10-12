import { Pool, PoolClient, QueryResultRow } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id         SERIAL PRIMARY KEY,
  mmr        INTEGER NOT NULL CHECK (mmr BETWEEN 0 AND 100000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nicknames (
  id        SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  nick      TEXT NOT NULL,
  nick_norm TEXT NOT NULL UNIQUE,
  is_main   BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS nicknames_one_main_per_player
  ON nicknames (player_id) WHERE is_main;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
`;

// Współdzielone między przeładowaniami modułów w trybie dev.
const g = globalThis as unknown as { __pool?: Pool; __schema?: Promise<void> };

function getPool(): Pool {
  if (!g.__pool) {
    if (!process.env.DATABASE_URL) throw new Error("Brak zmiennej DATABASE_URL.");
    g.__pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return g.__pool;
}

/** Tworzy tabele przy pierwszym użyciu (idempotentnie). */
function ready(): Promise<void> {
  if (!g.__schema) {
    g.__schema = getPool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        g.__schema = undefined;
        throw e;
      });
  }
  return g.__schema;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  await ready();
  return getPool().query<T>(text, params);
}

export async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
