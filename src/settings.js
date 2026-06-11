export function initSettings() {
  const btn = document.getElementById('settings-btn');
  const overlay = document.getElementById('settings-overlay');
  const closeBtn = document.getElementById('settings-close-btn');

  btn.addEventListener('click', () => {
    overlay.hidden = false;
  });

  closeBtn.addEventListener('click', () => {
    overlay.hidden = true;
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.hidden = true;
  });
}
