"use client";

import { useEffect, useId, useMemo, useState } from "react";

type NickEntry = { nick: string; playerId: number; player: string };
type TeamPlayer = { name: string; mmr?: number; role?: string };
type Variant = {
  teamA: TeamPlayer[];
  teamB: TeamPlayer[];
  quality: string;
  level: number;
  sumA?: number;
  sumB?: number;
  diff?: number;
};
type Result = { showMmr: boolean; variants: Variant[] };

const SLOTS = 10;
const ROLE_LABELS: Record<string, string> = { top: "Top", jg: "Jungle", mid: "Mid", adc: "ADC", support: "Support" };
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export default function Balancer() {
  const listId = useId();
  const [values, setValues] = useState<string[]>(Array(SLOTS).fill(""));
  const [entries, setEntries] = useState<NickEntry[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [idx, setIdx] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [withRoles, setWithRoles] = useState(false);

  useEffect(() => {
    fetch("/api/nicknames")
      .then((r) => r.json())
      .then((d: { nicks?: NickEntry[] }) => setEntries(d.nicks ?? []))
      .catch(() => setErrors(["Nie udało się pobrać listy nicków."]));
  }, []);

  const byNick = useMemo(() => new Map(entries.map((e) => [norm(e.nick), e])), [entries]);

  const status = useMemo(() => {
    const seen = new Map<number, number>();
    return values.map((v, i) => {
      if (!norm(v)) return { text: "", cls: "" };
      const e = byNick.get(norm(v));
      if (!e) return { text: "Nie ma takiego nicku w bazie", cls: "bad" };
      const prev = seen.get(e.playerId);
      if (prev !== undefined) {
        return { text: `To ten sam gracz co w polu ${prev + 1} (${e.player})`, cls: "bad" };
      }
      seen.set(e.playerId, i);
      return { text: norm(v) === norm(e.player) ? "Rozpoznano" : `= ${e.player}`, cls: "ok" };
    });
  }, [values, byNick]);

  async function submit() {
    setErrors([]);
    setBusy(true);
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicks: values, roles: withRoles }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(null);
        setErrors(
          Array.isArray(data.errors)
            ? data.errors.map((e: { slot: number; message: string }) => `Pole ${e.slot + 1}: ${e.message}`)
            : [data.error ?? "Nie udało się dobrać składów."]
        );
        return;
      }
      setResult(data as Result);
      setIdx(0);
    } catch {
      setResult(null);
      setErrors(["Brak połączenia z serwerem."]);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setValues(Array(SLOTS).fill(""));
    setResult(null);
    setErrors([]);
  }

  const v = result?.variants[idx];

  return (
    <>
      <div className="setup">
        <div className="card">
          <h2>Nicki graczy</h2>
          {values.map((val, i) => (
            <div className="slot" key={i}>
              <span className="n">{i + 1}.</span>
              <div>
                <input
                  list={listId}
                  value={val}
                  onChange={(e) => setValues((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="Nick gracza"
                  autoComplete="off"
                  aria-label={`Nick gracza ${i + 1}`}
                />
                <div className={`st ${status[i].cls}`}>{status[i].text}</div>
              </div>
            </div>
          ))}
          <datalist id={listId}>
            {entries.map((e) => (
              <option key={e.nick} value={e.nick} />
            ))}
          </datalist>
          <div className="row">
            <button className="pri" onClick={submit} disabled={busy}>
              {busy ? "Liczę…" : "Dobierz składy"}
            </button>
            <button className="sec" onClick={clear}>
              Wyczyść
            </button>
          </div>
          {errors.length > 0 && (
            <div className="msg bad" role="alert">
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}
        </div>

        <div className="card settings">
          <h2>Ustawienia losowania</h2>
          <label className="switch">
            <input type="checkbox" checked={withRoles} onChange={(e) => setWithRoles(e.target.checked)} />
            Losuj także linie
          </label>
          <p className="hint">Każdy gracz dostanie linię: top, jungle, mid, adc lub support – bez powtórzeń w drużynie.</p>
        </div>
      </div>

      {result && v && (
        <div>
          <div className="teams">
            <TeamBox cls="a" title="Drużyna A" total={v.sumA} players={v.teamA} />
            <TeamBox cls="b" title="Drużyna B" total={v.sumB} players={v.teamB} />
          </div>
          <p className="verdict">
            {result.showMmr && v.diff !== undefined && v.sumA !== undefined && v.sumB !== undefined ? (
              <>
                Różnica sumy MMR: <b>{v.diff}</b> (średnie: {Math.round(v.sumA / 5)} vs{" "}
                {Math.round(v.sumB / 5)}).{" "}
              </>
            ) : (
              <>
                Wyrównanie: <b>{v.quality}</b>.{" "}
              </>
            )}
            Wariant {idx + 1} z {result.variants.length}, od najuczciwszego.
          </p>
          <div className="row">
            <button className="sec" onClick={() => setIdx((i) => (i + 1) % result.variants.length)}>
              Pokaż kolejny wariant
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function TeamBox({ cls, title, total, players }: { cls: string; title: string; total?: number; players: TeamPlayer[] }) {
  return (
    <div className={`team ${cls}`}>
      <h3>
        <span>{title}</span>
        {total !== undefined && <span className="mmr">{total}</span>}
      </h3>
      <ul>
        {players.map((p) => (
          <li key={p.name}>
            <span>
              {p.role && <span className="role">{ROLE_LABELS[p.role] ?? p.role}</span>}
              {p.name}
            </span>
            {p.mmr !== undefined && <span className="mmr">{p.mmr}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
