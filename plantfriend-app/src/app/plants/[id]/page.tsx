"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Plant = {
  id: string;
  name: string;
  location: string | null;
};

type SensorPoint = {
  ts: string;
  tempC: number;
  humidity: number;
  pressureHpa: number;
  co2ppm: number;
  soilMoisture: number;
};

function clamp(x: number, a: number, b: number) {
  return Math.min(b, Math.max(a, x));
}
function round1(x: number) {
  return Math.round(x * 10) / 10;
}

function makeMockSeries(seed: string): { latest: SensorPoint; points: SensorPoint[] } {
  const base = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const now = Date.now();

  const points: SensorPoint[] = Array.from({ length: 24 }).map((_, i) => {
    const t = now - (23 - i) * 60 * 60 * 1000;
    const wave = Math.sin((i / 24) * Math.PI * 2);

    const tempC = 19.5 + (base % 5) * 0.2 + wave * 0.9;
    const humidity = 40 + (base % 10) + wave * 7;
    const pressureHpa = 1015 + (base % 4) + wave * 2;
    const co2ppm = 520 + (base % 60) + Math.max(0, -wave) * 120;
    const soilMoisture = 48 + (base % 12) - i * 0.7 + Math.max(0, -wave) * 3;

    return {
      ts: new Date(t).toISOString(),
      tempC: round1(tempC),
      humidity: Math.round(clamp(humidity, 20, 90)),
      pressureHpa: round1(pressureHpa),
      co2ppm: Math.round(clamp(co2ppm, 350, 2000)),
      soilMoisture: Math.round(clamp(soilMoisture, 5, 85)),
    };
  });

  return { latest: points[points.length - 1], points };
}

export default function PlantDashboardPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: plantId } = use(params);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { latest, points } = useMemo(() => makeMockSeries(plantId), [plantId]);

  useEffect(() => {
    (async () => {
      setErrorMsg(null);
      setLoading(true);

      const { data, error } = await supabase
        .from("plants")
        .select("id,name,location")
        .eq("id", plantId)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setPlant(null);
      } else {
        setPlant(data as Plant);
      }

      setLoading(false);
    })();
  }, [plantId]);

  const min = Math.min(...points.map((p) => p.soilMoisture));
  const max = Math.max(...points.map((p) => p.soilMoisture));
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  const polyline = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 300;
      const y = 80 - norm(p.soilMoisture) * 70;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <Link href="/plants" style={{ textDecoration: "none", color: "inherit", opacity: 0.85 }}>
            ← Zurück
          </Link>

          <h1 style={{ margin: "10px 0 0", fontSize: 30 }}>
            {(plant?.name ?? "Pflanze")} Dashboard
          </h1>

          <div style={{ opacity: 0.7, marginTop: 6 }}>
            {plant?.location ? `📍 ${plant.location}` : "📍 —"} · Letztes Update:{" "}
            {new Date(latest.ts).toLocaleString("de-CH")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={btn} type="button">🔄 Refresh</button>
          <button style={btn} type="button">⚙️ Sensor koppeln</button>
        </div>
      </div>

      {errorMsg && <p style={{ color: "tomato", marginTop: 12 }}>{errorMsg}</p>}
      {loading && <p style={{ marginTop: 12 }}>Lade Dashboard…</p>}

      {!loading && (
        <section style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Sensorübersicht</div>
            <div style={{ opacity: 0.65, fontSize: 12 }}>Mockdaten (später Raspberry Pi)</div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            <Metric label="Temperatur" value={`${latest.tempC} °C`} />
            <Metric label="Luftfeuchte" value={`${latest.humidity} %`} />
            <Metric label="Druck" value={`${latest.pressureHpa} hPa`} />
            <Metric label="CO₂" value={`${latest.co2ppm} ppm`} />
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
            <div style={subcard}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Erde</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1 }}>
                  {latest.soilMoisture}
                </div>
                <div style={{ opacity: 0.75 }}>%</div>
                <StatusPill soilMoisture={latest.soilMoisture} />
              </div>

              <div style={{ marginTop: 12 }}>
                <svg viewBox="0 0 300 80" width="100%" height="80" style={{ display: "block" }}>
                  <polyline points={polyline} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
                  <line x1="0" y1="79" x2="300" y2="79" stroke="rgba(255,255,255,0.12)" />
                </svg>

                <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                  <span>vor 24h</span>
                  <span>jetzt</span>
                </div>
              </div>
            </div>

            <div style={subcard}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Aktionen</div>
              <div style={{ display: "grid", gap: 10 }}>
                <button style={btn} type="button">💧 Als gegossen markieren</button>
                <button style={btn} type="button">🔔 Reminder einstellen</button>
                <button style={btn} type="button">📡 Pi verbinden (später)</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metric}>
      <div style={{ opacity: 0.7, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function StatusPill({ soilMoisture }: { soilMoisture: number }) {
  let text = "OK ✅";
  if (soilMoisture < 25) text = "FÄLLIG 🔔";
  if (soilMoisture < 15) text = "DRINGEND 🚨";

  return (
    <span
      style={{
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 900,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        opacity: 0.9,
      }}
    >
      {text}
    </span>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 18,
  padding: 16,
  background: "rgba(255,255,255,0.03)",
};

const subcard: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.18)",
};

const metric: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.12)",
};

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
};