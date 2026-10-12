import { NextResponse } from "next/server";
import { computeSplits, describeBalance, type Rated } from "@/lib/balance";
import { query } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { normNick } from "@/lib/nick";
import { getShowMmr } from "@/lib/settings";

export const dynamic = "force-dynamic";

type PublicPlayer = { name: string; mmr?: number };

/**
 * Dobór składów odbywa się wyłącznie na serwerze. Gdy MMR jest ukryty, w odpowiedzi
 * nie ma ani wartości MMR, ani sum, ani różnic – tylko nicki i opisowa ocena wyrównania.
 */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => null);
    const nicks = (body as { nicks?: unknown } | null)?.nicks;
    if (!Array.isArray(nicks) || nicks.length !== 10 || nicks.some((n) => typeof n !== "string")) {
      throw new HttpError(400, "Wpisz dokładnie 10 nicków.");
    }
    const inputs = nicks as string[];
    const norms = inputs.map(normNick);

    const { rows } = await query<{ nick_norm: string; id: number; mmr: number; name: string }>(
      `SELECT n.nick_norm, p.id, p.mmr, m.nick AS name
         FROM nicknames n
         JOIN players p ON p.id = n.player_id
         JOIN nicknames m ON m.player_id = p.id AND m.is_main
        WHERE n.nick_norm = ANY($1::text[])`,
      [norms.filter(Boolean)]
    );
    const byNick = new Map(rows.map((r) => [r.nick_norm, r]));

    const errors: { slot: number; message: string }[] = [];
    const picked: Rated[] = [];
    const firstSlot = new Map<number, number>();
    inputs.forEach((raw, i) => {
      if (!norms[i]) return void errors.push({ slot: i, message: "Pole jest puste." });
      const r = byNick.get(norms[i]);
      if (!r) return void errors.push({ slot: i, message: `Nick „${raw.trim()}” nie występuje w bazie.` });
      const prev = firstSlot.get(r.id);
      if (prev !== undefined) {
        return void errors.push({
          slot: i,
          message: `${r.name} jest już wpisany w polu ${prev + 1} pod innym nickiem.`,
        });
      }
      firstSlot.set(r.id, i);
      picked.push({ id: r.id, name: r.name, mmr: r.mmr });
    });
    if (errors.length) return NextResponse.json({ errors }, { status: 400 });

    const showMmr = await getShowMmr();
    const present = (team: Rated[]): PublicPlayer[] =>
      showMmr
        ? [...team].sort((a, b) => b.mmr - a.mmr).map((p) => ({ name: p.name, mmr: p.mmr }))
        : team.map((p) => ({ name: p.name })).sort((a, b) => a.name.localeCompare(b.name, "pl"));

    const variants = computeSplits(picked).map((s) => {
      const b = describeBalance(s.diff, s.sumA + s.sumB);
      return {
        teamA: present(s.teamA),
        teamB: present(s.teamB),
        quality: b.label,
        level: b.level,
        ...(showMmr ? { sumA: s.sumA, sumB: s.sumB, diff: s.diff } : {}),
      };
    });

    return NextResponse.json({ showMmr, variants });
  } catch (e) {
    return errorResponse(e);
  }
}
