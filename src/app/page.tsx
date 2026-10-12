import Balancer from "@/components/Balancer";

export default function Home() {
  return (
    <main>
      <h1>Uczciwe składy 5v5</h1>
      <p className="sub">
        Wpisz 10 nicków. Strona rozpozna graczy po dowolnym ich nicku i podzieli ich na dwie
        drużyny o jak najbardziej zbliżonym poziomie.
      </p>
      <Balancer />
    </main>
  );
}
