import { NextResponse } from "next/server";
import { checkPassword, startSession } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => null);
    const password = (body as { password?: unknown } | null)?.password;
    if (typeof password !== "string" || !checkPassword(password)) {
      await new Promise((r) => setTimeout(r, 500)); // lekkie spowolnienie zgadywania
      return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
    }
    await startSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
