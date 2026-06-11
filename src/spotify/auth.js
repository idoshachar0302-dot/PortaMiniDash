import { Browser } from '@capacitor/browser';
import { config } from '../config.js';
import { generateRandomString, generateCodeChallenge } from '../lib/pkce.js';
import { getItem, setItem, removeItem } from '../lib/storage.js';
import { getPlatform } from '../lib/platform.js';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';

const KEYS = {
  accessToken: 'spotify_access_token',
  refreshToken: 'spotify_refresh_token',
  expiresAt: 'spotify_expires_at',
};

// PKCE verifier/state are short-lived, so sessionStorage is fine even on native
// (the auth flow happens in a single app session).
const SESSION_KEYS = {
  codeVerifier: 'spotify_pkce_verifier',
  state: 'spotify_pkce_state',
};

export function getRedirectUri() {
  switch (getPlatform()) {
    case 'capacitor':
      return 'deskdash://callback';
    default:
      return `${window.location.origin}/callback`;
  }
}

export async function isConnected() {
  return Boolean(await getItem(KEYS.refreshToken));
}

export async function startAuth() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);

  sessionStorage.setItem(SESSION_KEYS.codeVerifier, codeVerifier);
  sessionStorage.setItem(SESSION_KEYS.state, state);

  const params = new URLSearchParams({
    client_id: config.spotifyClientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  });

  const authUrl = `${AUTHORIZE_URL}?${params.toString()}`;
  const platform = getPlatform();

  if (platform === 'capacitor') {
    await Browser.open({ url: authUrl });
  } else {
    window.location.href = authUrl;
  }
}

async function storeTokens(data) {
  await setItem(KEYS.accessToken, data.access_token);
  if (data.refresh_token) {
    await setItem(KEYS.refreshToken, data.refresh_token);
  }
  const expiresAt = Date.now() + data.expires_in * 1000;
  await setItem(KEYS.expiresAt, String(expiresAt));
}

async function exchangeCodeForTokens(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: config.spotifyClientId,
    code_verifier: codeVerifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const reason = body?.error_description || body?.error || res.statusText;
    throw new Error(`Spotify token exchange failed (${res.status}): ${reason}`);
  }
  await storeTokens(await res.json());
}

// Called once we have ?code=&state= from a redirect, regardless of how it arrived
// (web /callback page or Capacitor deep link).
export async function handleAuthCode(code, state) {
  const expectedState = sessionStorage.getItem(SESSION_KEYS.state);
  const codeVerifier = sessionStorage.getItem(SESSION_KEYS.codeVerifier);
  sessionStorage.removeItem(SESSION_KEYS.state);
  sessionStorage.removeItem(SESSION_KEYS.codeVerifier);

  if (!state || state !== expectedState) {
    throw new Error('Spotify auth state mismatch');
  }

  await exchangeCodeForTokens(code, codeVerifier);
}

// Web only: on page load, check for ?code=&state= left by Spotify's redirect to /callback.
// Returns the code/state pair (and clears it from the URL) so the caller can run it
// through the same error handling as the Capacitor auth flow.
export function getWebRedirectParams() {
  if (getPlatform() !== 'web') return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code) return null;

  window.history.replaceState({}, '', '/');
  return { code, state };
}

async function refreshAccessToken() {
  const refreshToken = await getItem(KEYS.refreshToken);
  if (!refreshToken) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.spotifyClientId,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    await disconnect();
    return null;
  }

  const data = await res.json();
  await storeTokens(data);
  return data.access_token;
}

export async function getAccessToken() {
  const expiresAt = Number((await getItem(KEYS.expiresAt)) || 0);
  const accessToken = await getItem(KEYS.accessToken);

  if (accessToken && Date.now() < expiresAt - 30_000) {
    return accessToken;
  }

  return refreshAccessToken();
}

export async function disconnect() {
  await removeItem(KEYS.accessToken);
  await removeItem(KEYS.refreshToken);
  await removeItem(KEYS.expiresAt);
}
