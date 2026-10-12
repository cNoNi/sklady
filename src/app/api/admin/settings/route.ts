import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/errors";
import { getShowMmr, setShowMmr } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    return NextResponse.json({ showMmr: await getShowMmr() });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const body: unknown = await req.json().catch(() => null);
    const showMmr = (body as { showMmr?: unknown } | null)?.showMmr;
    if (typeof showMmr !== "boolean") throw new HttpError(400, "Pole showMmr musi być typu boolean.");
    await setShowMmr(showMmr);
    return NextResponse.json({ showMmr });
  } catch (e) {
    return errorResponse(e);
  }
}
