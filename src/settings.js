import { config } from './config.js';
import { geocodeCity } from './location/geo.js';
import { getLocationMode, setLocationMode, getManualLocation, setManualLocation } from './location/state.js';

export function initSettings() {
  const btn = document.getElementById('settings-btn');
  const overlay = document.getElementById('settings-overlay');
  const closeBtn = document.getElementById('settings-close-btn');
  const modeToggle = document.getElementById('location-mode-toggle');
  const manualRow = document.getElementById('manual-location-row');
  const input = document.getElementById('manual-location-input');
  const applyBtn = document.getElementById('manual-location-apply-btn');
  const status = document.getElementById('location-status');

  btn.addEventListener('click', () => {
    overlay.hidden = false;
  });

  closeBtn.addEventListener('click', () => {
    overlay.hidden = true;
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.hidden = true;
  });

  function renderMode() {
    const mode = getLocationMode();
    for (const b of modeToggle.querySelectorAll('.mode-btn')) {
      b.classList.toggle('active', b.dataset.mode === mode);
    }
    manualRow.hidden = mode !== 'manual';
    if (mode === 'manual' && !input.value) {
      input.value = getManualLocation()?.name || '';
    }
  }

  modeToggle.addEventListener('click', async (event) => {
    const mode = event.target.closest('.mode-btn')?.dataset.mode;
    if (!mode || mode === getLocationMode()) return;
    // The weather widget listens for this change and rewrites the status
    // line; it also prompts for a city if manual mode has none stored yet.
    await setLocationMode(mode);
    renderMode();
  });

  async function applyManualLocation() {
    const query = input.value.trim();
    if (!query) return;

    status.textContent = 'Looking up city...';
    try {
      const loc = await geocodeCity(query, config.owmApiKey);
      if (!loc) {
        status.textContent = 'City not found';
        return;
      }
      input.value = loc.name;
      await setManualLocation(loc);
    } catch (err) {
      console.error('City lookup failed', err);
      status.textContent = 'City lookup failed';
    }
  }

  applyBtn.addEventListener('click', applyManualLocation);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') applyManualLocation();
  });

  renderMode();
}
