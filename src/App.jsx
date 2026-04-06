import { useState, useEffect } from "react";

const API_KEY = import.meta.env.VITE_WEATHER_KEY;
const CITY = "Lagos";

const weatherIcons = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Mist: "🌫️",
  Haze: "🌫️",
};

export default function LagosWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchWeather() {
      if (!API_KEY) {
        setError("Weather API key is not configured (VITE_WEATHER_KEY missing)");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.message
              ? `${res.status}: ${body.message}`
              : `Request failed with status ${res.status}`
          );
        }
        const data = await res.json();
        setWeather(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, []);

  const condition = weather?.weather?.[0]?.main;
  const icon = weatherIcons[condition] || "🌡️";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.city}>Lagos, NG</div>

        {loading && <div style={styles.state}>Loading...</div>}
        {error && <div style={styles.error}>⚠️ {error}</div>}

        {weather && (
          <>
            <div style={styles.icon}>{icon}</div>
            <div style={styles.temp}>
              {Math.round(weather.main.temp)}°C
            </div>
            <div style={styles.desc}>
              {weather.weather[0].description}
            </div>
            <div style={styles.row}>
              <Stat label="Feels like" value={`${Math.round(weather.main.feels_like)}°C`} />
              <Stat label="Humidity" value={`${weather.main.humidity}%`} />
              <Stat label="Wind" value={`${Math.round(weather.wind.speed)} m/s`} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statVal}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "24px",
    padding: "40px",
    width: "320px",
    textAlign: "center",
    color: "#fff",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  city: {
    fontSize: "13px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
    marginBottom: "16px",
  },
  icon: { fontSize: "64px", margin: "8px 0" },
  temp: { fontSize: "72px", fontWeight: "200", lineHeight: 1 },
  desc: {
    textTransform: "capitalize",
    color: "rgba(255,255,255,0.6)",
    fontSize: "15px",
    margin: "8px 0 24px",
  },
  row: {
    display: "flex",
    justifyContent: "space-around",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: "20px",
    marginTop: "8px",
  },
  stat: { display: "flex", flexDirection: "column", gap: "4px" },
  statVal: { fontSize: "18px", fontWeight: "500" },
  statLabel: { fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" },
  state: { fontSize: "16px", color: "rgba(255,255,255,0.5)", padding: "32px 0" },
  error: { color: "#ff6b6b", fontSize: "13px", padding: "16px 0" },
};