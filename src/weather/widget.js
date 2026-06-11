import { config } from '../config.js';
import { getCurrentPosition, reverseGeocode } from '../location/geo.js';

const WEATHER_REFRESH_MS = 10 * 60 * 1000; // weather changes slowly, poll every 10 min
const LOCATION_REFRESH_MS = 30 * 60 * 1000; // re-check location every 30 min

const ICONS = {
  '01': '☀️',
  '02': '⛅',
  '03': '☁️',
  '04': '☁️',
  '09': '🌧️',
  10: '🌦️',
  11: '⛈️',
  13: '❄️',
  50: '🌫️',
};

function iconFor(owmIconCode) {
  const key = owmIconCode ? owmIconCode.slice(0, 2) : '';
  return ICONS[key] || '🌡️';
}

async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${config.owmApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  return res.json();
}

export function initWeather() {
  const els = {
    icon: document.getElementById('weather-icon'),
    temp: document.getElementById('weather-temp'),
    desc: document.getElementById('weather-desc'),
    location: document.getElementById('weather-location'),
    locationStatus: document.getElementById('location-status'),
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
      els.icon.textContent = iconFor(weather?.icon);
      els.temp.textContent = `${Math.round(data.main.temp)}°C`;
      els.desc.textContent = weather?.description ?? '--';
      els.location.textContent = placeName || data.name || '--';
    } catch (err) {
      els.desc.textContent = 'Weather unavailable';
      console.error('Weather fetch failed', err);
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
    } catch (err) {
      els.locationStatus.textContent = 'Unavailable';
      els.desc.textContent = 'Location unavailable';
      console.error('Geolocation failed', err);
    }
  }

  refreshLocation();
  setInterval(refreshWeather, WEATHER_REFRESH_MS);
  setInterval(refreshLocation, LOCATION_REFRESH_MS);
}
