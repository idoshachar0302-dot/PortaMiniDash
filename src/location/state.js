import { getItem, setItem } from '../lib/storage.js';

const MODE_KEY = 'location_mode';
const MANUAL_KEY = 'manual_location';

let mode = 'auto'; // 'auto' (device geolocation) | 'manual' (user-picked city)
let manual = null; // { name, lat, lon, tzOffsetSec? }
const listeners = [];

// Must run before the clock/weather widgets init so their first render
// already reflects the persisted mode.
export async function loadLocationSettings() {
  mode = (await getItem(MODE_KEY)) === 'manual' ? 'manual' : 'auto';
  try {
    manual = JSON.parse((await getItem(MANUAL_KEY)) || 'null');
  } catch {
    manual = null;
  }
}

export function getLocationMode() {
  return mode;
}

export function getManualLocation() {
  return manual;
}

export async function setLocationMode(next) {
  if (mode === next) return;
  mode = next;
  await setItem(MODE_KEY, next);
  notify();
}

export async function setManualLocation(loc) {
  manual = loc;
  await setItem(MANUAL_KEY, JSON.stringify(loc));
  notify();
}

// Called by the weather widget once it learns the manual location's UTC
// offset (OWM sends it with the weather data); persisted so the clock is
// right immediately on the next launch. Doesn't notify — nothing needs to
// re-fetch, the clock reads the offset on its next tick.
export async function setManualTimezoneOffset(tzOffsetSec) {
  if (!manual || manual.tzOffsetSec === tzOffsetSec) return;
  manual = { ...manual, tzOffsetSec };
  await setItem(MANUAL_KEY, JSON.stringify(manual));
}

export function onLocationSettingsChange(fn) {
  listeners.push(fn);
}

function notify() {
  for (const fn of listeners) fn();
}
