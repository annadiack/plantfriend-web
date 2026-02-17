"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

type Plant = {
  id: string;
  name: string;
  location: string | null;
  watering_interval_days: number;
  last_watered_at: string | null;
  notes: string | null;
};

function daysSince(dateIso: string | null) {
  if (!dateIso) return Number.POSITIVE_INFINITY;
  const d = new Date(dateIso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function PlantsPage() {
  const router = useRouter();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [interval, setInterval] = useState(7);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/");
      await loadPlants();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlants() {
    setLoading(true);
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setPlants(data as Plant[]);
    setLoading(false);
  }

  const dueToday = useMemo(() => {
    return plants.filter((p) => daysSince(p.last_watered_at) >= p.watering_interval_days);
  }, [plants]);

  async function addPlant() {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) return router.push("/");

    if (!name.trim()) return;

    const { error } = await supabase.from("plants").insert({
      user_id: uid,
      name: name.trim(),
      location: location.trim() || null,
      watering_interval_days: interval,
      last_watered_at: null,
      notes: null,
    });

    if (!error) {
      setName("");
      setLocation("");
      setInterval(7);
      await loadPlants();
    }
  }

  async function markWatered(id: string) {
    const { error } = await supabase
      .from("plants")
      .update({ last_watered_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) await loadPlants();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1>Meine Pflanzen 🌿</h1>
        <button onClick={signOut}>Logout</button>
      </div>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Heute fällig: {dueToday.length}</h2>
        {dueToday.length > 0 ? (
          <ul>
            {dueToday.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong> {p.location ? `(${p.location})` : ""}{" "}
                <button onClick={() => markWatered(p.id)} style={{ marginLeft: 8 }}>
                  Gegossen ✅
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Alles gut – heute ist nichts dringend.</p>
        )}
      </section>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Neue Pflanze hinzufügen</h2>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 8 }}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Standort" value={location} onChange={(e) => setLocation(e.target.value)} />
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value || "7", 10))}
            title="Gießintervall (Tage)"
          />
          <button onClick={addPlant}>Hinzufügen</button>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Alle Pflanzen ({plants.length})</h2>
        {loading ? (
          <p>Lade…</p>
        ) : plants.length === 0 ? (
          <p>Noch keine Pflanzen drin. Leg los 🙂</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {plants.map((p) => {
              const since = daysSince(p.last_watered_at);
              const isDue = since >= p.watering_interval_days;
              return (
                <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 12 }}>
                  <h3 style={{ marginTop: 0 }}>{p.name}</h3>
                  <p style={{ margin: "6px 0" }}>Standort: {p.location ?? "—"}</p>
                  <p style={{ margin: "6px 0" }}>Intervall: alle {p.watering_interval_days} Tage</p>
                  <p style={{ margin: "6px 0" }}>
                    Letztes Gießen: {p.last_watered_at ? new Date(p.last_watered_at).toLocaleString() : "nie"}
                  </p>
                  <p style={{ margin: "6px 0", fontWeight: 600 }}>Status: {isDue ? "FÄLLIG 🔔" : "OK ✅"}</p>
                  <button onClick={() => markWatered(p.id)}>Gegossen ✅</button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
