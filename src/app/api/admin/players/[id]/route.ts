import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/errors";
import { deletePlayer, parseInput, updatePlayer } from "@/lib/players";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function playerId(ctx: Ctx): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Nieprawidłowe ID gracza.");
  return id;
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    await updatePlayer(await playerId(ctx), parseInput(await req.json().catch(() => null)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    if (!(await deletePlayer(await playerId(ctx)))) throw new HttpError(404, "Nie ma takiego gracza.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
