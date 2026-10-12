/** Pomocnik do wywołań API z komponentów klienckich. Rzuca Error z komunikatem serwera. */
export async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 401) window.location.reload(); // sesja wygasła – wróć do logowania
    throw new Error(data.error ?? "Błąd żądania.");
  }
  return data as T;
}
