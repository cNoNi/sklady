import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Publiczna lista nicków (bez MMR) – do podpowiedzi i walidacji pól na stronie głównej. */
export async function GET() {
  try {
    const { rows } = await query<{ nick: string; player_id: number; player: string }>(
      `SELECT n.nick, n.player_id, m.nick AS player
         FROM nicknames n JOIN nicknames m ON m.player_id = n.player_id AND m.is_main
        ORDER BY m.nick, n.is_main DESC, n.nick`
    );
    return NextResponse.json({
      nicks: rows.map((r) => ({ nick: r.nick, playerId: r.player_id, player: r.player })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
