import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Healthcheck dla Dockera: 200, gdy aplikacja odpowiada i baza działa, w przeciwnym razie 503. */
export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error", db: "unavailable" }, { status: 503 });
  }
}
