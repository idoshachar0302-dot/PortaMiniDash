import { getAccessToken } from './auth.js';

const BASE_URL = 'https://api.spotify.com/v1';
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spotifyFetch(path, options = {}, attempt = 0) {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body,
  });

  if (res.status === 204) return null; // nothing playing / empty queue / command accepted with no body

  if (res.status === 429) {
    if (attempt >= MAX_RETRIES) throw new Error('Spotify API error: rate limited, please try again later');
    // Respect Retry-After (seconds) and back off further on repeated 429s.
    const retryAfterSec = Number(res.headers.get('Retry-After')) || 1;
    await sleep(retryAfterSec * 1000 * 2 ** attempt);
    return spotifyFetch(path, options, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message || res.statusText;
    throw new Error(`Spotify API error (${res.status}): ${message}`);
  }

  return res.json();
}

export function getCurrentlyPlaying() {
  return spotifyFetch('/me/player/currently-playing');
}

export function getQueue() {
  return spotifyFetch('/me/player/queue');
}

export function play() {
  return spotifyFetch('/me/player/play', { method: 'PUT' });
}

export function pause() {
  return spotifyFetch('/me/player/pause', { method: 'PUT' });
}

export function skipToNext() {
  return spotifyFetch('/me/player/next', { method: 'POST' });
}

export function skipToPrevious() {
  return spotifyFetch('/me/player/previous', { method: 'POST' });
}

// Spotify has no "jump to this queue item" endpoint — playing a specific URI
// replaces the current playback context, so the rest of the queue is reset.
export function playTrackUri(uri) {
  return spotifyFetch('/me/player/play', { method: 'PUT', body: JSON.stringify({ uris: [uri] }) });
}
