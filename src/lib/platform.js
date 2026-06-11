export function getPlatform() {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) return 'capacitor';
  return 'web';
}

export function isCapacitor() {
  return getPlatform() === 'capacitor';
}
