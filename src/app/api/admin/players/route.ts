import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { createPlayer, listPlayers, parseInput } from "@/lib/players";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    return NextResponse.json({ players: await listPlayers() });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const id = await createPlayer(parseInput(await req.json().catch(() => null)));
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
