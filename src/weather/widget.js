import { config } from '../config.js';
import { getCurrentPosition, reverseGeocode } from '../location/geo.js';
import { WEATHER_ICONS, ICON_THERMOMETER } from '../lib/icons.js';

const WEATHER_REFRESH_MS = 10 * 60 * 1000; // weather changes slowly, poll every 10 min
const FORECAST_REFRESH_MS = 30 * 60 * 1000; // forecast data updates ~every 3h server-side
const LOCATION_REFRESH_MS = 30 * 60 * 1000; // re-check location every 30 min

const FORECAST_DAYS_AHEAD = 5;
const FORECAST_VIEWBOX_W = 220;
const FORECAST_VIEWBOX_H = 80;
const FORECAST_GRAPH_TOP = 12; // top margin reserved for temp labels
const FORECAST_GRAPH_BOTTOM = 50; // bottom ~30 units reserved for day labels
const FORECAST_PADDING_X = 12;

const dayShortFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

function iconFor(owmIconCode) {
  const key = owmIconCode ? owmIconCode.slice(0, 2) : '';
  return WEATHER_ICONS[key] || ICON_THERMOMETER;
}

async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${config.owmApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  return res.json();
}

async function fetchForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${config.owmApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast request failed: ${res.status}`);
  return res.json();
}

// Groups the 3-hour forecast entries into per-day highs for the next few
// days, skipping today (the current-weather panel already covers "now").
function aggregateDailyHighs(forecastData, daysAhead = FORECAST_DAYS_AHEAD) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = new Map(); // 'YYYY-MM-DD' -> { date, high }

  for (const entry of forecastData.list ?? []) {
    const temp = entry.main?.temp;
    if (temp == null) continue;

    const date = new Date(entry.dt * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((dayStart - today) / 86400000);
    if (dayDiff < 1 || dayDiff > daysAhead) continue;

    const key = dayStart.toISOString().slice(0, 10);
    const existing = byDay.get(key);
    if (existing) {
      existing.high = Math.max(existing.high, temp);
    } else {
      byDay.set(key, { date: dayStart, high: temp });
    }
  }

  return [...byDay.values()].sort((a, b) => a.date - b.date).slice(0, daysAhead);
}

function renderForecastSvg(days) {
  if (!days.length) return '';

  const temps = days.map((d) => d.high);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = max - min || 1; // avoid divide-by-zero when all temps are equal

  const usableW = FORECAST_VIEWBOX_W - FORECAST_PADDING_X * 2;
  const stepX = days.length > 1 ? usableW / (days.length - 1) : 0;

  const points = days.map((d, i) => {
    const x = FORECAST_PADDING_X + i * stepX;
    const normalized = (d.high - min) / range;
    const y = FORECAST_GRAPH_BOTTOM - normalized * (FORECAST_GRAPH_BOTTOM - FORECAST_GRAPH_TOP);
    return { x, y, day: d };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const circles = points
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="var(--accent)" />`)
    .join('');
  const tempLabels = points
    .map(
      (p) =>
        `<text x="${p.x.toFixed(1)}" y="${(p.y - 6).toFixed(1)}" text-anchor="middle" class="forecast-temp-label">${Math.round(p.day.high)}°</text>`,
    )
    .join('');
  const dayLabels = points
    .map(
      (p) =>
        `<text x="${p.x.toFixed(1)}" y="66" text-anchor="middle" class="forecast-label">${dayShortFmt.format(p.day.date)}</text>`,
    )
    .join('');

  return `<svg viewBox="0 0 ${FORECAST_VIEWBOX_W} ${FORECAST_VIEWBOX_H}" preserveAspectRatio="xMidYMid meet" class="forecast-svg" role="img" aria-label="${FORECAST_DAYS_AHEAD}-day temperature forecast">
    <polyline points="${polylinePoints}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    ${circles}
    ${tempLabels}
    ${dayLabels}
  </svg>`;
}

export function initWeather() {
  const els = {
    icon: document.getElementById('weather-icon'),
    temp: document.getElementById('weather-temp'),
    desc: document.getElementById('weather-desc'),
    location: document.getElementById('weather-location'),
    locationStatus: document.getElementById('location-status'),
    forecast: document.getElementById('weather-forecast'),
  };

  if (!config.owmApiKey) {
    els.desc.textContent = 'No weather API key configured';
    els.locationStatus.textContent = 'N/A';
    return;
  }

  let coords = null;
  let placeName = null;

  async function refreshWeather() {
    if (!coords) return;
    try {
      const data = await fetchCurrentWeather(coords.lat, coords.lon);
      const weather = data.weather?.[0];
      els.icon.innerHTML = iconFor(weather?.icon);
      els.temp.textContent = `${Math.round(data.main.temp)}°C`;
      els.desc.textContent = weather?.description ?? '--';
      els.location.textContent = placeName || data.name || '--';
    } catch (err) {
      els.desc.textContent = 'Weather unavailable';
      console.error('Weather fetch failed', err);
    }
  }

  async function refreshForecast() {
    if (!coords) return;
    try {
      const data = await fetchForecast(coords.lat, coords.lon);
      const days = aggregateDailyHighs(data);
      els.forecast.innerHTML = renderForecastSvg(days);
    } catch (err) {
      els.forecast.innerHTML = '';
      console.error('Forecast fetch failed', err);
    }
  }

  async function refreshLocation() {
    try {
      coords = await getCurrentPosition();
      els.locationStatus.textContent = `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}`;

      try {
        placeName = await reverseGeocode(coords.lat, coords.lon, config.owmApiKey);
        if (placeName) {
          els.location.textContent = placeName;
          els.locationStatus.textContent = placeName;
        }
      } catch (err) {
        console.error('Reverse geocode failed', err);
      }

      await refreshWeather();
      await refreshForecast();
    } catch (err) {
      els.locationStatus.textContent = 'Unavailable';
      els.desc.textContent = 'Location unavailable';
      console.error('Geolocation failed', err);
    }
  }

  refreshLocation();
  setInterval(refreshWeather, WEATHER_REFRESH_MS);
  setInterval(refreshForecast, FORECAST_REFRESH_MS);
  setInterval(refreshLocation, LOCATION_REFRESH_MS);
}
