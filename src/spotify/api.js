import { getAccessToken } from './auth.js';

const BASE_URL = 'https://api.spotify.com/v1';
const MAX_RETRIES = 3;
// Spotify can send day-scale Retry-After values once an app exhausts its daily
// quota; honoring those verbatim would freeze the dashboard for hours.
const MAX_RETRY_AFTER_SEC = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spotifyFetch(path, options = {}, attempt = 0) {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const token = await getAccessToken();
  if (!token) {
    // Throw rather than return null: callers render null as "nothing playing"
    // (Spotify's 204), which would silently mask a dead session.
    const err = new Error('Spotify session expired — reconnect in settings');
    err.authExpired = true;
    throw err;
  }

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
    // Fall back to a conservative cooldown if Spotify doesn't send Retry-After
    // — a 1s default would defeat the purpose of backing off.
    const retryAfterSec = Math.min(Number(res.headers.get('Retry-After')) || 30, MAX_RETRY_AFTER_SEC);
    if (attempt >= maxRetries) {
      const err = new Error('Spotify API error: rate limited, please try again later');
      err.retryAfterSec = retryAfterSec;
      throw err;
    }
    // Respect Retry-After (seconds) and back off further on repeated 429s.
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

// Identifies which Spotify account this session belongs to — on a shared
// display it's easy to authorize the wrong account without noticing.
export function getMe() {
  return spotifyFetch('/me', { maxRetries: 0 });
}

// The dashboard polls these every few seconds, so on a 429 it's better to fail
// fast and let the next poll act as the retry than to block this poll for a
// possibly-long exponential backoff.
// additional_types: without it, playing a podcast returns item: null and the
// display would claim nothing is playing.
export function getCurrentlyPlaying() {
  return spotifyFetch('/me/player/currently-playing?additional_types=track,episode', { maxRetries: 0 });
}

export function getQueue() {
  return spotifyFetch('/me/player/queue', { maxRetries: 0 });
}

export function play() {
  return spotifyFetch('/me/player/play', { method: 'PUT' });
}

export function pause() {
  return spotifyFetch('/me/player/pause', { method: 'PUT' });
}

export function setVolume(percent) {
  return spotifyFetch(`/me/player/volume?volume_percent=${percent}`, { method: 'PUT' });
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
