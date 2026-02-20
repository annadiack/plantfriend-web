export type SensorSnapshot = {
  ts: string; // ISO
  tempC: number;
  humidity: number;
  pressureHpa: number;
  noiseDb: number;
  co2ppm: number;
  soilMoisture: number; // 0-100
};

export function getMockPlantDashboard(plantId: string) {
  // deterministic-ish seed from id
  const base = plantId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  const now = Date.now();
  const points: SensorSnapshot[] = Array.from({ length: 24 }).map((_, i) => {
    const t = now - (23 - i) * 60 * 60 * 1000; // last 24h hourly
    const wave = Math.sin((i / 24) * Math.PI * 2);

    const tempC = 19.2 + (base % 5) * 0.1 + wave * 0.8;
    const humidity = 38 + (base % 7) + wave * 6;
    const pressureHpa = 1016 + (base % 3) + wave * 2;
    const noiseDb = 36 + (base % 4) + Math.max(0, wave) * 4;
    const co2ppm = 480 + (base % 40) + Math.max(0, -wave) * 80;
    const soilMoisture = 42 + (base % 10) - i * 0.6 + Math.max(0, -wave) * 2;

    return {
      ts: new Date(t).toISOString(),
      tempC: round1(tempC),
      humidity: Math.round(clamp(humidity, 20, 90)),
      pressureHpa: round1(pressureHpa),
      noiseDb: Math.round(clamp(noiseDb, 20, 80)),
      co2ppm: Math.round(clamp(co2ppm, 350, 2000)),
      soilMoisture: Math.round(clamp(soilMoisture, 5, 85)),
    };
  });

  const latest = points[points.length - 1];

  return { latest, points };
}

function clamp(x: number, a: number, b: number) {
  return Math.min(b, Math.max(a, x));
}
function round1(x: number) {
  return Math.round(x * 10) / 10;
}
