import './style.css';
import { initClock } from './clock/widget.js';
import { initWeather } from './weather/widget.js';
import { initSpotify } from './spotify/widget.js';
import { initSettings } from './settings.js';
import { loadLocationSettings } from './location/state.js';

// iOS Safari only applies :active styles when a touchstart listener is
// registered somewhere in the document, otherwise it skips straight to
// :focus/:visited and tap feedback (e.g. the control button highlight)
// never appears.
document.addEventListener('touchstart', () => {}, { passive: true });

(async () => {
  // Clock and weather read the location mode synchronously on first render.
  await loadLocationSettings();

  initClock();
  initWeather();
  initSpotify();
  initSettings();
})();
