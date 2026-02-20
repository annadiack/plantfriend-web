"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Plant = {
  id: string;
  user_id?: string;
  name: string;
  location: string | null;
  watering_interval_days: number;
  last_watered_at: string | null;
  notes: string | null;
  created_at?: string;
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [intervalDays, setIntervalDays] = useState(7);

  useEffect(() => {
    (async () => {
      setErrorMsg(null);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        router.push("/");
        return;
      }

      await loadPlants();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlants() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("plants")
      .select("id,name,location,watering_interval_days,last_watered_at,notes,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setPlants([]);
    } else {
      setPlants((data ?? []) as Plant[]);
    }

    setLoading(false);
  }

  const dueToday = useMemo(() => {
    return plants.filter(
      (p) => daysSince(p.last_watered_at) >= p.watering_interval_days
    );
  }, [plants]);

  async function addPlant() {
    setErrorMsg(null);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setErrorMsg(sessionError.message);
      return;
    }

    const uid = sessionData.session?.user.id;
    if (!uid) {
      router.push("/");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Bitte gib einen Pflanzennamen ein.");
      return;
    }

    const safeInterval =
      Number.isFinite(intervalDays) && intervalDays >= 1 ? intervalDays : 7;

    const { error } = await supabase.from("plants").insert({
      user_id: uid,
      name: name.trim(),
      location: location.trim() || null,
      watering_interval_days: safeInterval,
      last_watered_at: null,
      notes: null,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setName("");
    setLocation("");
    setIntervalDays(7);
    await loadPlants();
  }

  async function markWatered(id: string) {
    setErrorMsg(null);

    const { error } = await supabase
      .from("plants")
      .update({ last_watered_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    await loadPlants();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 34 }}>Meine Pflanzen 🌿</h1>
        <button onClick={signOut} style={btn}>
          Logout
        </button>
      </div>

      {errorMsg && <p style={{ color: "tomato", marginTop: 12 }}>{errorMsg}</p>}

      {/* DUE TODAY */}
      <section style={{ ...card, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Heute fällig: {dueToday.length}</h2>

        {dueToday.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {dueToday.map((p) => (
              <li key={p.id} style={{ marginBottom: 8 }}>
                <strong>{p.name}</strong> {p.location ? `(${p.location})` : ""}
                <button
                  onClick={() => markWatered(p.id)}
                  style={{ ...btn, marginLeft: 10 }}
                >
                  Gegossen ✅
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0 }}>Alles gut – heute ist nichts dringend.</p>
        )}
      </section>

      {/* ADD PLANT */}
      <section style={{ ...card, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Neue Pflanze hinzufügen</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1fr auto",
            gap: 8,
          }}
        >
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
          />
          <input
            placeholder="Standort"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={input}
          />
          <input
            type="number"
            min={1}
            value={intervalDays}
            onChange={(e) =>
              setIntervalDays(parseInt(e.target.value || "7", 10))
            }
            title="Gießintervall (Tage)"
            style={input}
          />
          <button onClick={addPlant} style={btn}>
            Hinzufügen
          </button>
        </div>
      </section>

      {/* ALL PLANTS */}
      <section style={{ marginTop: 16 }}>
        <h2>Alle Pflanzen ({plants.length})</h2>

        {loading ? (
          <p>Lade…</p>
        ) : plants.length === 0 ? (
          <p>Noch keine Pflanzen drin. Leg los 🙂</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            {plants.map((p) => {
              const since = daysSince(p.last_watered_at);
              const isDue = since >= p.watering_interval_days;

              // ✅ Link-Block sitzt HIER korrekt innerhalb vom map()
              return (
                <Link
                  key={p.id}
                  href={`/plants/${p.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 16,
                      padding: 12,
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {p.name}
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.9 }}>
                      <div style={{ margin: "6px 0" }}>
                        Standort: {p.location ?? "—"}
                      </div>
                      <div style={{ margin: "6px 0" }}>
                        Intervall: alle {p.watering_interval_days} Tage
                      </div>
                      <div style={{ margin: "6px 0" }}>
                        Letztes Gießen:{" "}
                        {p.last_watered_at
                          ? new Date(p.last_watered_at).toLocaleString("de-CH")
                          : "nie"}
                      </div>
                      <div style={{ margin: "6px 0", fontWeight: 800 }}>
                        Status: {isDue ? "FÄLLIG 🔔" : "OK ✅"}
                      </div>
                    </div>

                    {/* ✅ Button funktioniert ohne Navigation */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markWatered(p.id);
                      }}
                      style={{ ...btn, marginTop: 10 }}
                    >
                      Gegossen ✅
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  padding: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.03)",
};

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
};

const input: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
  color: "white",
};