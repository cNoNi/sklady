"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

type Player = { id: number; name: string; mmr: number; aliases: string[] };

const parseAliases = (t: string) => t.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
const backupJson = (ps: Player[]) =>
  JSON.stringify(ps.map(({ name, mmr, aliases }) => ({ name, mmr, aliases })));

export default function AdminPanel({
  initialPlayers,
  initialShowMmr,
}: {
  initialPlayers: Player[];
  initialShowMmr: boolean;
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [showMmr, setShowMmr] = useState(initialShowMmr);
  const [settingsMsg, setSettingsMsg] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [mmr, setMmr] = useState("");
  const [aliases, setAliases] = useState("");
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [backup, setBackup] = useState(backupJson(initialPlayers));
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function refresh(): Promise<Player[]> {
    const { players: fresh } = await api<{ players: Player[] }>("/api/admin/players");
    setPlayers(fresh);
    return fresh;
  }

  async function toggleMmr(next: boolean) {
    const prev = showMmr;
    setShowMmr(next);
    setSettingsMsg("");
    try {
      await api("/api/admin/settings", "PUT", { showMmr: next });
      setSettingsMsg(next ? "MMR jest teraz widoczny dla graczy." : "MMR jest teraz ukryty przed graczami.");
    } catch (e) {
      setShowMmr(prev);
      setSettingsMsg(e instanceof Error ? e.message : "Nie udało się zapisać ustawienia.");
    }
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setMmr("");
    setAliases("");
  }

  async function save() {
    setFormMsg(null);
    try {
      const body = { name, mmr, aliases: parseAliases(aliases) };
      if (editId !== null) await api(`/api/admin/players/${editId}`, "PUT", body);
      else await api("/api/admin/players", "POST", body);
      resetForm();
      setBackup(backupJson(await refresh()));
      setFormMsg({ ok: true, text: "Zapisano." });
    } catch (e) {
      setFormMsg({ ok: false, text: e instanceof Error ? e.message : "Błąd zapisu." });
    }
  }

  function edit(p: Player) {
    setEditId(p.id);
    setName(p.name);
    setMmr(String(p.mmr));
    setAliases(p.aliases.join(", "));
    setFormMsg(null);
    window.scrollTo({ top: 0 });
  }

  async function remove(p: Player) {
    if (!confirm(`Usunąć gracza ${p.name} razem z jego nickami?`)) return;
    try {
      await api(`/api/admin/players/${p.id}`, "DELETE");
      if (editId === p.id) resetForm();
      setBackup(backupJson(await refresh()));
    } catch (e) {
      setFormMsg({ ok: false, text: e instanceof Error ? e.message : "Nie udało się usunąć." });
    }
  }

  async function importBackup() {
    if (!confirm("To zastąpi całą bazę graczy danymi z pola. Kontynuować?")) return;
    try {
      const parsed: unknown = JSON.parse(backup);
      if (!Array.isArray(parsed)) throw new Error("Nieprawidłowy format danych.");
      const { count } = await api<{ count: number }>("/api/admin/import", "POST", { players: parsed });
      setBackup(backupJson(await refresh()));
      setBackupMsg({ ok: true, text: `Wczytano ${count} graczy.` });
    } catch (e) {
      setBackupMsg({
        ok: false,
        text: e instanceof SyntaxError ? "Nieprawidłowy format danych." : e instanceof Error ? e.message : "Błąd importu.",
      });
    }
  }

  async function logout() {
    await api("/api/admin/logout", "POST");
    router.refresh();
  }

  const sorted = [...players].sort((a, b) => b.mmr - a.mmr);

  return (
    <>
      <div className="card">
        <h2>Ustawienia</h2>
        <label className="switch">
          <input type="checkbox" checked={showMmr} onChange={(e) => toggleMmr(e.target.checked)} />
          <span>Pokazuj MMR graczom na stronie głównej</span>
        </label>
        <p className="hint">
          Gdy wyłączone, serwer nie wysyła MMR, sum ani różnic do przeglądarki graczy – widzą tylko
          składy i opisową ocenę wyrównania. W tym panelu MMR zawsze jest widoczny.
        </p>
        {settingsMsg && <div className="msg" role="status">{settingsMsg}</div>}
      </div>

      <div className="card">
        <h2>{editId !== null ? "Edytuj gracza" : "Dodaj gracza"}</h2>
        <div className="grid2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Główny nick" aria-label="Główny nick" autoComplete="off" />
          <input value={mmr} onChange={(e) => setMmr(e.target.value)} type="number" inputMode="numeric" placeholder="MMR" aria-label="MMR" />
        </div>
        <textarea
          rows={2}
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          style={{ marginTop: 8 }}
          placeholder="Pozostałe nicki, oddzielone przecinkami lub nową linią"
          aria-label="Pozostałe nicki"
        />
        <div className="row">
          <button className="pri" onClick={save}>Zapisz gracza</button>
          {editId !== null && <button className="sec" onClick={() => { resetForm(); setFormMsg(null); }}>Anuluj</button>}
        </div>
        {formMsg && <div className={`msg ${formMsg.ok ? "ok" : "bad"}`} role="status">{formMsg.text}</div>}
      </div>

      <div className="card">
        <h2>Baza graczy ({players.length})</h2>
        {sorted.length === 0 && <p className="sub">Baza jest pusta. Dodaj pierwszego gracza powyżej.</p>}
        {sorted.map((p) => (
          <div className="pl" key={p.id}>
            <div>
              <b>{p.name}</b> · <span className="mmr">{p.mmr}</span>
              <small>{p.aliases.length ? `także: ${p.aliases.join(", ")}` : "brak dodatkowych nicków"}</small>
            </div>
            <div>
              <button className="sec sm" onClick={() => edit(p)}>Edytuj</button>{" "}
              <button className="sec sm" onClick={() => remove(p)}>Usuń</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Kopia zapasowa i import</h2>
        <p className="sub" style={{ marginBottom: 8 }}>
          Format: <code>[{`{"name":"Kuba","mmr":2450,"aliases":["Kubix"]}`}]</code>. Wczytanie zastępuje całą bazę
          (działa też z kopią ze starej, jednoplikowej wersji strony).
        </p>
        <textarea rows={5} value={backup} onChange={(e) => setBackup(e.target.value)} aria-label="Dane JSON" />
        <div className="row">
          <button className="sec" onClick={() => { setBackup(backupJson(players)); setBackupMsg(null); }}>Odśwież z bazy</button>
          <button className="sec" onClick={importBackup}>Wczytaj z pola</button>
        </div>
        {backupMsg && <div className={`msg ${backupMsg.ok ? "ok" : "bad"}`} role="status">{backupMsg.text}</div>}
      </div>

      <div className="row">
        <a className="sec linkbtn" href="/">Strona główna</a>
        <button className="sec" onClick={logout}>Wyloguj</button>
      </div>
    </>
  );
}
