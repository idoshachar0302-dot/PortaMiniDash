import { getLocationMode, getManualLocation } from '../location/state.js';

// en-US forces the same 12-hour AM/PM format as the NY clock regardless of
// the device's locale.
const localTimeFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' });
const localDateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
// Manual-location time is computed as UTC + the location's stored offset, so
// the shifted Date must be formatted in UTC to read as that location's wall
// clock.
const manualTimeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
const manualDateFmt = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
const nyTimeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
});
const nyDateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const nyStatusFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hour12: false,
});

const MARKET_OPEN_MINUTES = 9 * 60 + 30;
const MARKET_CLOSE_MINUTES = 16 * 60;

function getMarketStatus(date) {
  const parts = nyStatusFmt.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const weekday = parts.weekday;
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.minute, 10);
  const minutesSinceMidnight = hour * 60 + minute;

  const isWeekday = weekday !== 'Sat' && weekday !== 'Sun';
  const isMarketHours =
    minutesSinceMidnight >= MARKET_OPEN_MINUTES && minutesSinceMidnight < MARKET_CLOSE_MINUTES;

  return isWeekday && isMarketHours ? 'open' : 'closed';
}

export function initClock() {
  const els = {
    localTime: document.getElementById('local-time'),
    localDate: document.getElementById('local-date'),
    nyTime: document.getElementById('ny-time'),
    nyDate: document.getElementById('ny-date'),
    marketDot: document.getElementById('market-dot'),
    marketStatus: document.getElementById('market-status'),
  };

  function update() {
    const now = new Date();

    // Falls back to device time until the manual location's UTC offset is
    // known (the weather widget stores it after its first fetch).
    const manual = getLocationMode() === 'manual' ? getManualLocation() : null;
    if (manual?.tzOffsetSec != null) {
      const shifted = new Date(now.getTime() + manual.tzOffsetSec * 1000);
      els.localTime.textContent = manualTimeFmt.format(shifted);
      els.localDate.textContent = manualDateFmt.format(shifted);
    } else {
      els.localTime.textContent = localTimeFmt.format(now);
      els.localDate.textContent = localDateFmt.format(now);
    }
    els.nyTime.textContent = nyTimeFmt.format(now);
    els.nyDate.textContent = nyDateFmt.format(now);

    const status = getMarketStatus(now);
    els.marketDot.classList.toggle('open', status === 'open');
    els.marketDot.classList.toggle('closed', status === 'closed');
    els.marketStatus.textContent = status === 'open' ? 'Market Open' : 'Market Closed';
  }

  update();
  setInterval(update, 1000);
}
