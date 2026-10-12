"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", "POST", { password });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd logowania.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Zaloguj się</h2>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && login()}
        placeholder="Hasło administratora"
        aria-label="Hasło administratora"
        autoComplete="current-password"
      />
      <div className="row">
        <button className="pri" onClick={login} disabled={busy || !password}>
          Zaloguj
        </button>
      </div>
      {error && <div className="msg bad" role="alert">{error}</div>}
    </div>
  );
}
