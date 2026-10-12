import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/errors";
import { parseInput, replaceAllPlayers } from "@/lib/players";

export const dynamic = "force-dynamic";

/** Zastępuje całą bazę. Przyjmuje { players: [{ name, mmr, aliases }] } (kompatybilne ze starą kopią zapasową). */
export async function POST(req: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const body: unknown = await req.json().catch(() => null);
    const list = (body as { players?: unknown } | null)?.players;
    if (!Array.isArray(list)) throw new HttpError(400, "Nieprawidłowy format danych.");
    const count = await replaceAllPlayers(list.map(parseInput));
    return NextResponse.json({ count });
  } catch (e) {
    return errorResponse(e);
  }
}
