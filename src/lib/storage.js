import { Preferences } from '@capacitor/preferences';
import { isCapacitor } from './platform.js';

export async function getItem(key) {
  if (isCapacitor()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function setItem(key, value) {
  if (isCapacitor()) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

export async function removeItem(key) {
  if (isCapacitor()) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}
