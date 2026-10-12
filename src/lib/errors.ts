import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  // 23505 = naruszenie unikalności w PostgreSQL (np. wyścig przy zapisie tego samego nicku)
  if (typeof e === "object" && e !== null && (e as { code?: string }).code === "23505") {
    return NextResponse.json({ error: "Ten nick jest już zajęty." }, { status: 409 });
  }
  console.error(e);
  return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
}
