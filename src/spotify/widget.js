import { Browser } from '@capacitor/browser';
import { isConnected, startAuth, disconnect, handleAuthCode, getWebRedirectParams } from './auth.js';
import { getCurrentlyPlaying, getQueue, play, pause, skipToNext, skipToPrevious, playTrackUri } from './api.js';
import { config } from '../config.js';
import { isElectron, isCapacitor } from '../lib/platform.js';
import { setMarqueeText } from '../lib/marquee.js';
import { ICON_PLAY, ICON_PAUSE } from '../lib/icons.js';

const POLL_MS = 5000;
const MAX_QUEUE_ITEMS = 2;

function formatMs(ms) {
  const safeMs = ms && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function trackArtists(track) {
  return (track.artists || []).map((artist) => artist.name).join(', ');
}

export function initSpotify() {
  const els = {
    albumArt: document.getElementById('album-art'),
    albumArtIcon: document.getElementById('album-art-icon'),
    title: document.getElementById('track-title'),
    artist: document.getElementById('track-artist'),
    progressFill: document.getElementById('progress-fill'),
    progressCurrent: document.getElementById('progress-current'),
    progressTotal: document.getElementById('progress-total'),
    queueList: document.getElementById('queue-list'),
    connectBtn: document.getElementById('spotify-connect-btn'),
    status: document.getElementById('spotify-status'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
  };

  let progressState = null; // { startProgress, startTime, duration, isPlaying }

  function updateProgressUI(progress, duration) {
    els.progressFill.style.width = duration ? `${Math.min(100, (progress / duration) * 100)}%` : '0%';
    els.progressCurrent.textContent = formatMs(progress);
    els.progressTotal.textContent = formatMs(duration);
  }

  // Runs every animation frame for a smooth progress bar; the displayed
  // mm:ss only changes once per second since formatMs floors to seconds.
  function tickProgress() {
    if (progressState?.isPlaying) {
      const elapsed = performance.now() - progressState.startTime;
      const progress = Math.min(progressState.duration, progressState.startProgress + elapsed);
      updateProgressUI(progress, progressState.duration);
    }
    requestAnimationFrame(tickProgress);
  }

  // latencyMs estimates how long ago the API actually measured progress_ms
  // (roughly half the request round-trip time), so the local clock starts
  // closer to the real current position instead of lagging behind it.
  function renderNowPlaying(data, latencyMs = 0) {
    const track = data?.item;

    if (!track) {
      setMarqueeText(els.title, 'Nothing playing');
      els.artist.textContent = '';
      els.albumArt.style.backgroundImage = '';
      els.albumArtIcon.innerHTML = ICON_PLAY;
      progressState = null;
      updateProgressUI(0, 0);
      return;
    }

    setMarqueeText(els.title, track.name);
    els.artist.textContent = trackArtists(track);

    const artUrl = track.album?.images?.[0]?.url;
    els.albumArt.style.backgroundImage = artUrl ? `url("${artUrl}")` : '';

    const reportedProgress = data.progress_ms ?? 0;
    const duration = track.duration_ms ?? 0;
    const isPlaying = data.is_playing ?? false;
    const startProgress = isPlaying ? Math.min(duration, reportedProgress + latencyMs) : reportedProgress;

    progressState = { startProgress, startTime: performance.now(), duration, isPlaying };
    updateProgressUI(startProgress, duration);
    els.albumArtIcon.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
  }

  function renderQueue(data) {
    const queue = data?.queue ?? [];
    els.queueList.innerHTML = '';

    if (!queue.length) {
      const li = document.createElement('li');
      li.className = 'queue-empty';
      li.textContent = 'Queue is empty';
      els.queueList.appendChild(li);
      return;
    }

    queue.slice(0, MAX_QUEUE_ITEMS).forEach((track) => {
      const li = document.createElement('li');
      li.className = 'queue-track';
      li.title = 'Play now (replaces current queue)';
      li.addEventListener('click', () => withControlFeedback(() => playTrackUri(track.uri)));

      const art = document.createElement('div');
      art.className = 'queue-art';
      const images = track.album?.images || [];
      const artUrl = images[images.length - 1]?.url || images[0]?.url;
      if (artUrl) art.style.backgroundImage = `url("${artUrl}")`;

      const info = document.createElement('div');
      info.className = 'queue-info';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'queue-title';
      setMarqueeText(titleDiv, track.name);

      const artistDiv = document.createElement('div');
      artistDiv.className = 'queue-artist';
      artistDiv.textContent = trackArtists(track);

      info.append(titleDiv, artistDiv);
      li.append(art, info);
      els.queueList.appendChild(li);
    });
  }

  let hasError = false;

  function setControlsEnabled(enabled) {
    els.prevBtn.disabled = !enabled;
    els.albumArt.disabled = !enabled;
    els.nextBtn.disabled = !enabled;
  }

  // Spotify's player state takes a moment to update after a control command,
  // so wait briefly before polling for the new state.
  async function withControlFeedback(action) {
    setControlsEnabled(false);
    try {
      await action();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await poll();
    } catch (err) {
      console.error('Spotify control failed', err);
      hasError = true;
      els.status.textContent = err.message || 'Connection error';
    } finally {
      setControlsEnabled(true);
    }
  }

  async function refreshConnectionUI() {
    const connected = await isConnected();
    els.connectBtn.textContent = connected ? 'Disconnect Spotify' : 'Connect Spotify';
    setControlsEnabled(connected);
    if (!hasError) {
      els.status.textContent = connected ? 'Connected' : 'Not connected';
    }
    return connected;
  }

  async function poll() {
    const connected = await isConnected();
    if (!connected) return;

    try {
      const requestStart = performance.now();
      const nowPlaying = await getCurrentlyPlaying();
      const latencyMs = (performance.now() - requestStart) / 2;
      const queue = await getQueue();

      renderNowPlaying(nowPlaying, latencyMs);
      renderQueue(queue);
      hasError = false;
      els.status.textContent = 'Connected';
    } catch (err) {
      console.error('Spotify poll failed', err);
      hasError = true;
      els.status.textContent = err.message || 'Connection error';
    }
  }

  els.prevBtn.addEventListener('click', () => withControlFeedback(skipToPrevious));
  els.nextBtn.addEventListener('click', () => withControlFeedback(skipToNext));
  els.albumArt.addEventListener('click', () =>
    withControlFeedback(() => (progressState?.isPlaying ? pause() : play())),
  );

  els.connectBtn.addEventListener('click', async () => {
    if (await isConnected()) {
      await disconnect();
      renderNowPlaying(null);
      renderQueue(null);
      hasError = false;
      await refreshConnectionUI();
    } else {
      await startAuth();
    }
  });

  if (!config.spotifyClientId) {
    els.status.textContent = 'No Spotify Client ID configured';
    els.connectBtn.disabled = true;
    return;
  }

  async function onAuthCode(code, state) {
    try {
      await handleAuthCode(code, state);
      await refreshConnectionUI();
      await poll();
    } catch (err) {
      console.error('Spotify auth failed', err);
      hasError = true;
      els.status.textContent = err.message || 'Connection error';
    }
  }

  if (isElectron() && window.electronAPI) {
    window.electronAPI.onSpotifyAuthCode(({ code, state }) => onAuthCode(code, state));
  }

  if (isCapacitor()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async ({ url }) => {
        const params = new URL(url).searchParams;
        const code = params.get('code');
        const state = params.get('state');
        if (!code) return;

        await Browser.close();
        await onAuthCode(code, state);
      });
    });
  }

  (async () => {
    const redirect = getWebRedirectParams();
    if (redirect) {
      await onAuthCode(redirect.code, redirect.state);
    } else {
      await refreshConnectionUI();
      await poll();
    }
    setInterval(poll, POLL_MS);
    requestAnimationFrame(tickProgress);
  })();
}
