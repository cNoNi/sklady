# Uczciwe składy 5v5

Next.js (App Router) + TypeScript + PostgreSQL. Dzieli 10 graczy na dwie drużyny o jak najbardziej zbliżonym MMR.
Gracze rozpoznawani są po dowolnym ze swoich nicków.

## Uruchomienie (Docker)

```bash
cp .env.example .env       # uzupełnij ADMIN_PASSWORD i SESSION_SECRET
docker compose up -d --build
```

Strona działa pod `http://localhost:3000` (port zmienisz przez `APP_PORT`), panel admina pod `/admin`.
Dane graczy trzymane są w wolumenie `pgdata`, więc przetrwają restart i przebudowę kontenerów.
Baza nie jest wystawiona na zewnątrz – jest dostępna tylko dla aplikacji w sieci Dockera.
Tabele tworzą się automatycznie przy pierwszym zapytaniu.

Przydatne:

```bash
docker compose logs -f app          # logi aplikacji
docker compose up -d --build        # aktualizacja po zmianie kodu
docker compose down                 # zatrzymanie (dane zostają); `down -v` kasuje też bazę
docker compose exec db pg_dump -U sklady sklady > kopia.sql   # kopia bazy
```

Za reverse proxy z HTTPS ustaw w `.env` `COOKIE_SECURE=true`.

Bez Dockera: potrzebny własny PostgreSQL, zmienne z `.env.example` plus `DATABASE_URL`, potem `npm install && npm run dev`.

## Ukrywanie MMR

- Panel admina: **/admin** (hasło z `ADMIN_PASSWORD`). Przełącznik „Pokazuj MMR graczom” zapisuje się w bazie
  (tabela `settings`) i działa od razu, bez restartu.
- Do pierwszego przełączenia obowiązuje `DEFAULT_SHOW_MMR` (domyślnie `false` = ukryty).
- Ukrycie jest po stronie serwera: dobór składów liczy `POST /api/balance`, a gdy MMR jest ukryty, odpowiedź
  nie zawiera MMR, sum ani różnic. Zamiast tego pokazuje opisową ocenę („Idealnie wyrównane” itd.),
  a nicki w drużynach sortowane są alfabetycznie, żeby kolejność nie zdradzała rankingu.
- Publiczny `GET /api/nicknames` zwraca tylko nicki, bez MMR. Dane z MMR są dostępne wyłącznie w `/api/admin/*`
  (wymagają sesji admina).

## Migracja ze starej wersji

W `/admin` → „Kopia zapasowa i import” wklej JSON ze starej strony i kliknij „Wczytaj z pola”.

## Struktura

- `src/lib/balance.ts` – algorytm podziału (wszystkie 126 kombinacji)
- `src/lib/players.ts` – walidacja i zapis graczy (unikalność nicków wymuszona też w bazie)
- `src/lib/auth.ts` – sesja admina (cookie httpOnly podpisane HMAC)
- `src/app/api/*` – trasy API; `src/components/*` – UI
