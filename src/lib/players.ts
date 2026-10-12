import type { PoolClient } from "pg";
import { query, withTx } from "./db";
import { HttpError } from "./errors";
import { normNick } from "./nick";

export type Player = { id: number; name: string; mmr: number; aliases: string[] };
export type PlayerInput = { name: string; mmr: number; aliases: string[] };

const MAX_NICK = 40;
const MAX_ALIASES = 20;

type Row = { id: number; mmr: number; nick: string; is_main: boolean };

export async function listPlayers(): Promise<Player[]> {
  const { rows } = await query<Row>(
    `SELECT p.id, p.mmr, n.nick, n.is_main
       FROM players p JOIN nicknames n ON n.player_id = p.id
      ORDER BY p.id, n.is_main DESC, n.id`
  );
  const map = new Map<number, Player>();
  for (const r of rows) {
    let p = map.get(r.id);
    if (!p) {
      p = { id: r.id, name: "", mmr: r.mmr, aliases: [] };
      map.set(r.id, p);
    }
    if (r.is_main) p.name = r.nick;
    else p.aliases.push(r.nick);
  }
  return [...map.values()];
}

/** Waliduje i czyści dane gracza z żądania. */
export function parseInput(raw: unknown): PlayerInput {
  if (!raw || typeof raw !== "object") throw new HttpError(400, "Nieprawidłowe dane gracza.");
  const o = raw as Record<string, unknown>;

  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) throw new HttpError(400, "Podaj główny nick.");
  if (name.length > MAX_NICK) throw new HttpError(400, `Nick „${name}” jest za długi (max ${MAX_NICK} znaków).`);

  const mmr =
    typeof o.mmr === "number"
      ? o.mmr
      : typeof o.mmr === "string" && o.mmr.trim() !== ""
        ? Number(o.mmr)
        : NaN;
  if (!Number.isInteger(mmr) || mmr < 0 || mmr > 100000) {
    throw new HttpError(400, "MMR musi być liczbą całkowitą od 0 do 100000.");
  }

  const rawAliases = Array.isArray(o.aliases) ? o.aliases : [];
  const seen = new Set<string>([normNick(name)]);
  const aliases: string[] = [];
  for (const a of rawAliases) {
    const nick = typeof a === "string" ? a.trim() : "";
    if (!nick) continue;
    if (nick.length > MAX_NICK) throw new HttpError(400, `Nick „${nick}” jest za długi (max ${MAX_NICK} znaków).`);
    const k = normNick(nick);
    if (k === normNick(name)) continue; // alias równy głównemu nickowi – pomijamy po cichu
    if (seen.has(k)) throw new HttpError(400, `Nick „${nick}” powtarza się w tym samym graczu.`);
    seen.add(k);
    aliases.push(nick);
  }
  if (aliases.length > MAX_ALIASES) throw new HttpError(400, `Maksymalnie ${MAX_ALIASES} dodatkowych nicków.`);

  return { name, mmr, aliases };
}

async function savePlayerTx(c: PoolClient, input: PlayerInput, id?: number): Promise<number> {
  const nicks = [input.name, ...input.aliases];
  const norms = nicks.map(normNick);

  const clash = await c.query<{ nick: string; name: string }>(
    `SELECT n.nick, m.nick AS name
       FROM nicknames n JOIN nicknames m ON m.player_id = n.player_id AND m.is_main
      WHERE n.nick_norm = ANY($1::text[]) AND n.player_id <> $2`,
    [norms, id ?? 0]
  );
  if (clash.rows.length) {
    const r = clash.rows[0];
    throw new HttpError(409, `Nick „${r.nick}” należy już do gracza ${r.name}. Jeden nick może wskazywać tylko jedną osobę.`);
  }

  let playerId: number;
  if (id !== undefined) {
    const upd = await c.query("UPDATE players SET mmr = $1 WHERE id = $2", [input.mmr, id]);
    if (upd.rowCount === 0) throw new HttpError(404, "Nie ma takiego gracza.");
    await c.query("DELETE FROM nicknames WHERE player_id = $1", [id]);
    playerId = id;
  } else {
    const ins = await c.query<{ id: number }>("INSERT INTO players (mmr) VALUES ($1) RETURNING id", [input.mmr]);
    playerId = ins.rows[0].id;
  }

  for (let i = 0; i < nicks.length; i++) {
    await c.query(
      "INSERT INTO nicknames (player_id, nick, nick_norm, is_main) VALUES ($1, $2, $3, $4)",
      [playerId, nicks[i], norms[i], i === 0]
    );
  }
  return playerId;
}

export const createPlayer = (input: PlayerInput) => withTx((c) => savePlayerTx(c, input));
export const updatePlayer = (id: number, input: PlayerInput) => withTx((c) => savePlayerTx(c, input, id));

export async function deletePlayer(id: number): Promise<boolean> {
  const r = await query("DELETE FROM players WHERE id = $1", [id]);
  return (r.rowCount ?? 0) > 0;
}

/** Zastępuje całą bazę graczy (w jednej transakcji – przy błędzie nic się nie zmienia). */
export function replaceAllPlayers(inputs: PlayerInput[]): Promise<number> {
  return withTx(async (c) => {
    await c.query("DELETE FROM players");
    for (const input of inputs) await savePlayerTx(c, input);
    return inputs.length;
  });
}
