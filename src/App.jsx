import { useState, useEffect } from "react";
import Anthropic from "@anthropic-ai/sdk";

const WEATHER_KEY = import.meta.env.VITE_WEATHER_KEY;
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

const weatherIcons = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Mist: "🌫️",
  Haze: "🌫️",
  Snow: "❄️",
  Fog: "🌫️",
};

// ── Hooks ──────────────────────────────────────────────────────────────────

function useWeather(city) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setWeather(null);
    setError(null);

    async function fetchWeather() {
      if (!WEATHER_KEY) {
        setError("VITE_WEATHER_KEY not configured");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_KEY}&units=metric`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `Status ${res.status}`);
        }
        setWeather(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, [city]);

  return { weather, loading, error };
}

function useForecast(city) {
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setSlots(null);
    setError(null);

    async function fetchForecast() {
      if (!WEATHER_KEY) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${city}&cnt=4&appid=${WEATHER_KEY}&units=metric`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `Status ${res.status}`);
        }
        const data = await res.json();
        setSlots(
          data.list.map((item) => ({
            time: new Date(item.dt * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            temp: Math.round(item.main.temp),
            condition: item.weather[0].main,
            description: item.weather[0].description,
          }))
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, [city]);

  return { slots, loading, error };
}

function useAIForecast(slots, cityName) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slots || !cityName) return;
    if (!ANTHROPIC_KEY) {
      setError("VITE_ANTHROPIC_KEY not configured");
      return;
    }

    setLoading(true);
    setSummary(null);
    setError(null);

    async function fetchAIForecast() {
      try {
        const client = new Anthropic({
          apiKey: ANTHROPIC_KEY,
          dangerouslyAllowBrowser: true,
        });

        const forecastText = slots
          .map((s) => `${s.time}: ${s.temp}°C, ${s.description}`)
          .join("\n");

        const message = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 256,
          thinking: { type: "adaptive" },
          messages: [
            {
              role: "user",
              content: `You are a weather forecaster. Based on these upcoming weather readings for ${cityName} over the next 12 hours, write exactly 2 concise, friendly sentences summarising what to expect. Do not include a greeting or label — just the 2 sentences.\n\n${forecastText}`,
            },
          ],
        });

        const text = message.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
        setSummary(text);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAIForecast();
  }, [slots, cityName]);

  return { summary, loading, error };
}

// ── Components ─────────────────────────────────────────────────────────────

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statVal}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function HourlyStrip({ slots }) {
  if (!slots) return null;
  return (
    <div style={styles.hourlyStrip}>
      {slots.map((s, i) => (
        <div key={i} style={styles.hourlySlot}>
          <div style={styles.hourlyTime}>{s.time}</div>
          <div style={styles.hourlyIcon}>{weatherIcons[s.condition] || "🌡️"}</div>
          <div style={styles.hourlyTemp}>{s.temp}°</div>
        </div>
      ))}
    </div>
  );
}

function AIForecastBox({ summary, loading, error }) {
  return (
    <div style={styles.aiForecast}>
      <div style={styles.aiLabel}>✨ AI Forecast</div>
      {loading && <div style={styles.aiText}>Generating forecast…</div>}
      {error && <div style={styles.aiError}>⚠️ {error}</div>}
      {summary && <div style={styles.aiText}>{summary}</div>}
    </div>
  );
}

function WeatherCard({ city, label }) {
  const { weather, loading: wLoading, error: wError } = useWeather(city);
  const { slots, loading: fLoading } = useForecast(city);
  const { summary, loading: aiLoading, error: aiError } = useAIForecast(
    slots,
    city
  );

  const condition = weather?.weather?.[0]?.main;
  const icon = weatherIcons[condition] || "🌡️";

  return (
    <div style={styles.card}>
      <div style={styles.city}>{label}</div>

      {wLoading && <div style={styles.state}>Loading…</div>}
      {wError && <div style={styles.error}>⚠️ {wError}</div>}

      {weather && (
        <>
          <div style={styles.icon}>{icon}</div>
          <div style={styles.temp}>{Math.round(weather.main.temp)}°C</div>
          <div style={styles.desc}>{weather.weather[0].description}</div>
          <div style={styles.row}>
            <Stat label="Feels like" value={`${Math.round(weather.main.feels_like)}°C`} />
            <Stat label="Humidity" value={`${weather.main.humidity}%`} />
            <Stat label="Wind" value={`${Math.round(weather.wind.speed)} m/s`} />
          </div>
        </>
      )}

      {!fLoading && <HourlyStrip slots={slots} />}

      <AIForecastBox
        summary={summary}
        loading={aiLoading}
        error={aiError}
      />
    </div>
  );
}

export default function App() {
  const [locationCity, setLocationCity] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locDenied, setLocDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationCity("Lagos");
      setLocationLabel("Lagos, NG");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          if (!WEATHER_KEY) {
            setLocationCity("Lagos");
            setLocationLabel("Lagos, NG");
            setLocLoading(false);
            return;
          }
          const res = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${coords.latitude}&lon=${coords.longitude}&limit=1&appid=${WEATHER_KEY}`
          );
          if (!res.ok) throw new Error("Geocoding failed");
          const [place] = await res.json();
          if (!place) throw new Error("No place found");
          setLocationCity(place.name);
          setLocationLabel(`${place.name}, ${place.country}`);
        } catch {
          setLocationCity("Lagos");
          setLocationLabel("Lagos, NG");
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        setLocDenied(true);
        setLocationCity("Lagos");
        setLocationLabel("Lagos, NG ⁽¹⁾");
        setLocLoading(false);
      },
      { timeout: 10000 }
    );
  }, []);

  return (
    <div style={styles.page}>
      {locDenied && (
        <div style={styles.banner}>
          📍 Location access denied — showing Lagos as default
        </div>
      )}
      <div style={styles.cards}>
        {locLoading ? (
          <div style={styles.card}>
            <div style={styles.city}>Your Location</div>
            <div style={styles.state}>📍 Requesting location…</div>
          </div>
        ) : (
          <WeatherCard city={locationCity} label={locationLabel} />
        )}
        <WeatherCard city="Nicosia" label="Cyprus, CY" />
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "24px",
    gap: "16px",
  },
  banner: {
    color: "rgba(255,255,255,0.55)",
    fontSize: "13px",
    letterSpacing: "0.5px",
  },
  cards: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    justifyContent: "center",
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
  // Hourly forecast strip
  hourlyStrip: {
    display: "flex",
    justifyContent: "space-around",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: "16px",
    marginTop: "16px",
  },
  hourlySlot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  hourlyTime: { fontSize: "11px", color: "rgba(255,255,255,0.4)" },
  hourlyIcon: { fontSize: "22px" },
  hourlyTemp: { fontSize: "13px", fontWeight: "500" },
  // AI forecast box
  aiForecast: {
    marginTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: "16px",
    textAlign: "left",
  },
  aiLabel: {
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    marginBottom: "8px",
  },
  aiText: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.7)",
    lineHeight: "1.6",
    fontStyle: "italic",
  },
  aiError: { fontSize: "12px", color: "#ff6b6b" },
};
