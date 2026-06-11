import './style.css';
import { initClock } from './clock/widget.js';
import { initWeather } from './weather/widget.js';
import { initSpotify } from './spotify/widget.js';
import { initSettings } from './settings.js';

// iOS Safari only applies :active styles when a touchstart listener is
// registered somewhere in the document, otherwise it skips straight to
// :focus/:visited and tap feedback (e.g. the control button highlight)
// never appears.
document.addEventListener('touchstart', () => {}, { passive: true });

initClock();
initWeather();
initSpotify();
initSettings();
