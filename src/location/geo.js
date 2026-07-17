export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000, ...options },
    );
  });
}

export async function geocodeCity(query, apiKey) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

  const results = await res.json();
  if (!results.length) return null;

  const { name, country, lat, lon } = results[0];
  return { name: [name, country].filter(Boolean).join(', '), lat, lon };
}

export async function reverseGeocode(lat, lon, apiKey) {
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);

  const results = await res.json();
  if (!results.length) return null;

  const { name, country } = results[0];
  return { name, country };
}
