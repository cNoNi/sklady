import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "admin_session";
const TTL_SECONDS = 60 * 60 * 8;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("Ustaw SESSION_SECRET (min. 16 znaków).");
  return s;
}

const mac = (payload: string) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("hex");

/** Porównanie w stałym czasie (przez skróty o równej długości). */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("Ustaw ADMIN_PASSWORD.");
  return safeEqual(input, pw);
}

export async function startSession(): Promise<void> {
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  (await cookies()).set(COOKIE, `${exp}.${mac(exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !safeEqual(sig, mac(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

/** Zwraca odpowiedź 401, jeśli to nie admin; w przeciwnym razie null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  return (await isAdmin())
    ? null
    : NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
}
