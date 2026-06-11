export function getPlatform() {
  if (typeof window !== 'undefined' && window.electronAPI) return 'electron';
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) return 'capacitor';
  return 'web';
}

export function isElectron() {
  return getPlatform() === 'electron';
}

export function isCapacitor() {
  return getPlatform() === 'capacitor';
}
