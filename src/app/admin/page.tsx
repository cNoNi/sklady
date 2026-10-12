import type { Metadata } from "next";
import AdminPanel from "@/components/AdminPanel";
import LoginForm from "@/components/LoginForm";
import { isAdmin } from "@/lib/auth";
import { listPlayers } from "@/lib/players";
import { getShowMmr } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Panel admina – Uczciwe składy 5v5",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const admin = await isAdmin();
  const data = admin ? await Promise.all([listPlayers(), getShowMmr()]) : null;

  return (
    <main>
      <h1>Panel admina</h1>
      <p className="sub">Gracze, nicki, MMR i widoczność MMR na stronie głównej.</p>
      {data ? <AdminPanel initialPlayers={data[0]} initialShowMmr={data[1]} /> : <LoginForm />}
    </main>
  );
}
