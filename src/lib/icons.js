// Inline SVG icons (currentColor-based, sized via the shared .icon class)
// used in place of emoji so appearance stays consistent across platforms
// (iOS renders emoji as colorful glyphs that clash with the dark UI).

export const ICON_PLAY =
  '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>';

export const ICON_PAUSE =
  '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>';

export const ICON_PREV =
  '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4a1 1 0 0 1 1 1v14a1 1 0 0 1-2 0V5a1 1 0 0 1 1-1Z"/><path d="M19.5 5.13a1 1 0 0 1 .5.87v12a1 1 0 0 1-1.55.83l-9-6a1 1 0 0 1 0-1.66l9-6a1 1 0 0 1 1.05-.04Z"/></svg>';

export const ICON_NEXT =
  '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 4a1 1 0 0 0-1 1v14a1 1 0 0 0 2 0V5a1 1 0 0 0-1-1Z"/><path d="M4.5 5.13a1 1 0 0 0-.5.87v12a1 1 0 0 0 1.55.83l9-6a1 1 0 0 0 0-1.66l-9-6a1 1 0 0 0-1.05-.04Z"/></svg>';

export const ICON_SETTINGS =
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';

// Weather icons keyed by the first two digits of the OpenWeatherMap icon code.
const STROKE_OPEN = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const SVG_CLOSE = '</svg>';

export const WEATHER_ICONS = {
  '01': `${STROKE_OPEN}<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>${SVG_CLOSE}`,
  '02': `${STROKE_OPEN}<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>${SVG_CLOSE}`,
  '03': `${STROKE_OPEN}<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>${SVG_CLOSE}`,
  '04': `${STROKE_OPEN}<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>${SVG_CLOSE}`,
  '09': `${STROKE_OPEN}<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M16 19v1"/><path d="M16 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/>${SVG_CLOSE}`,
  10: `${STROKE_OPEN}<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>${SVG_CLOSE}`,
  11: `${STROKE_OPEN}<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>${SVG_CLOSE}`,
  13: `${STROKE_OPEN}<path d="M2 12h20"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="M12 2v20"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>${SVG_CLOSE}`,
  50: `${STROKE_OPEN}<path d="M16 17H7"/><path d="M17 21H9"/><path d="M4.6 12.7a1 1 0 0 1-.3-1.7l.4-.3a8 8 0 0 1 7.4-5.7 6 6 0 0 1 5.9 5.5"/><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 0 0-1.01-1.93"/>${SVG_CLOSE}`,
};

export const ICON_THERMOMETER = `${STROKE_OPEN}<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>${SVG_CLOSE}`;
