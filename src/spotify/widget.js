import { Browser } from '@capacitor/browser';
import { isConnected, startAuth, disconnect, handleAuthCode, getWebRedirectParams } from './auth.js';
import { getMe, getCurrentlyPlaying, getQueue, play, pause, skipToNext, skipToPrevious, playTrackUri, setVolume } from './api.js';
import { config } from '../config.js';
import { isCapacitor } from '../lib/platform.js';
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

// Both handle tracks and podcast episodes: episodes have no artists/album,
// their show name and artwork live on the item itself.
function itemSubtitle(item) {
  if (item.type === 'episode') return item.show?.name || 'Podcast';
  return (item.artists || []).map((artist) => artist.name).join(', ');
}

function itemImages(item) {
  return (item.type === 'episode' ? item.images : item.album?.images) || [];
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
    volumeSlider: document.getElementById('volume-slider'),
  };

  let progressState = null; // { startProgress, startTime, duration, isPlaying }
  let isAdjustingVolume = false;

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

    if (!isAdjustingVolume && data?.device?.volume_percent != null) {
      els.volumeSlider.value = String(data.device.volume_percent);
    }

    if (!track) {
      // A 200 with no item still tells us what's occupying the player (e.g.
      // an ad break on a free account) — don't misreport it as idle.
      setMarqueeText(els.title, data?.currently_playing_type === 'ad' ? 'Ad playing' : 'Nothing playing');
      els.artist.textContent = '';
      els.albumArt.style.backgroundImage = '';
      els.albumArtIcon.innerHTML = ICON_PLAY;
      progressState = null;
      updateProgressUI(0, 0);
      return;
    }

    setMarqueeText(els.title, track.name);
    els.artist.textContent = itemSubtitle(track);

    const artUrl = itemImages(track)[0]?.url;
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
      const images = itemImages(track);
      const artUrl = images[images.length - 1]?.url || images[0]?.url;
      if (artUrl) art.style.backgroundImage = `url("${artUrl}")`;

      const info = document.createElement('div');
      info.className = 'queue-info';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'queue-title';
      setMarqueeText(titleDiv, track.name);

      const artistDiv = document.createElement('div');
      artistDiv.className = 'queue-artist';
      artistDiv.textContent = itemSubtitle(track);

      info.append(titleDiv, artistDiv);
      li.append(art, info);
      els.queueList.appendChild(li);
    });
  }

  let hasError = false;
  let isBusy = false;
  let isPolling = false;
  let pollCooldownUntil = 0;
  let accountName = null;

  function connectedLabel() {
    return accountName ? `Connected as ${accountName}` : 'Connected';
  }

  function setControlsEnabled(enabled) {
    els.prevBtn.disabled = !enabled;
    els.albumArt.disabled = !enabled;
    els.nextBtn.disabled = !enabled;
    els.volumeSlider.disabled = !enabled;
  }

  // Spotify's player state takes a moment to update after a control command,
  // so wait briefly before polling for the new state. Uses a plain flag
  // (rather than the `disabled` attribute) so the other control buttons
  // don't visually flash their disabled state on every press.
  async function withControlFeedback(action) {
    if (isBusy) return;
    isBusy = true;
    try {
      await action();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await poll();
    } catch (err) {
      console.error('Spotify control failed', err);
      hasError = true;
      els.status.textContent = err.message || 'Connection error';
      if (err.authExpired) await refreshConnectionUI();
    } finally {
      isBusy = false;
    }
  }

  async function refreshConnectionUI() {
    const connected = await isConnected();
    els.connectBtn.textContent = connected ? 'Disconnect Spotify' : 'Connect Spotify';
    setControlsEnabled(connected);
    if (!connected) {
      accountName = null;
    } else if (!accountName) {
      try {
        const me = await getMe();
        accountName = me?.display_name || me?.id || null;
      } catch (err) {
        console.error('Spotify profile fetch failed', err);
      }
    }
    if (!hasError) {
      els.status.textContent = connected ? connectedLabel() : 'Not connected';
    }
    return connected;
  }

  async function poll() {
    const connected = await isConnected();
    if (!connected) return;

    // Spotify told us via Retry-After to back off; skip ticks until that
    // cooldown elapses instead of hammering the same rate-limited endpoint
    // every POLL_MS. Keep the countdown visible so the skip doesn't leave a
    // stale "Connected" on screen.
    if (Date.now() < pollCooldownUntil) {
      const secondsLeft = Math.ceil((pollCooldownUntil - Date.now()) / 1000);
      els.status.textContent = `Rate limited, retrying in ${secondsLeft}s`;
      return;
    }

    // Polling on 429s retries with backoff inside spotifyFetch, which can take
    // a while. Without this guard, the setInterval below would keep firing
    // every POLL_MS and pile up overlapping retrying requests, making any
    // rate limit worse and never letting it recover.
    if (isPolling) return;
    isPolling = true;

    try {
      const requestStart = performance.now();
      const nowPlaying = await getCurrentlyPlaying();
      const latencyMs = (performance.now() - requestStart) / 2;
      // Render before fetching the queue so a queue failure can't blank the
      // now-playing panel too.
      renderNowPlaying(nowPlaying, latencyMs);
      renderQueue(await getQueue());
      hasError = false;
      els.status.textContent = connectedLabel();
    } catch (err) {
      console.error('Spotify poll failed', err);
      hasError = true;
      if (err.retryAfterSec) {
        pollCooldownUntil = Date.now() + err.retryAfterSec * 1000;
        els.status.textContent = `Rate limited, retrying in ${err.retryAfterSec}s`;
      } else {
        els.status.textContent = err.message || 'Connection error';
      }
      // The session may have been wiped mid-poll (dead refresh token) — flip
      // the button/controls back to the disconnected state instead of leaving
      // a "Disconnect" button on a dead session.
      if (err.authExpired) await refreshConnectionUI();
    } finally {
      isPolling = false;
    }
  }

  els.prevBtn.addEventListener('click', () => withControlFeedback(skipToPrevious));
  els.nextBtn.addEventListener('click', () => withControlFeedback(skipToNext));
  els.albumArt.addEventListener('click', () =>
    withControlFeedback(() => (progressState?.isPlaying ? pause() : play())),
  );

  els.volumeSlider.addEventListener('pointerdown', () => {
    isAdjustingVolume = true;
  });
  els.volumeSlider.addEventListener('touchstart', () => {
    isAdjustingVolume = true;
  }, { passive: true });
  els.volumeSlider.addEventListener('change', async () => {
    try {
      await setVolume(Number(els.volumeSlider.value));
      hasError = false;
      els.status.textContent = connectedLabel();
    } catch (err) {
      console.error('Spotify volume change failed', err);
      hasError = true;
      els.status.textContent = err.message || 'Connection error';
    } finally {
      isAdjustingVolume = false;
    }
  });
  els.volumeSlider.addEventListener('pointerup', () => {
    isAdjustingVolume = false;
  });

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
      // Reflect whatever actually got stored (e.g. tokens persisted but the
      // immediate poll/refresh failed), so the button doesn't get stuck on
      // "Connect Spotify" after a successful login.
      await refreshConnectionUI();
    }
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
