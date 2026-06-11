// Renders text into a container. If it overflows the container's width,
// replaces it with a seamless looping scroll; otherwise renders it as plain
// (centered/static) text.
export function setMarqueeText(container, text) {
  container.textContent = text;
  container.classList.remove('marquee-active');

  requestAnimationFrame(() => {
    if (container.scrollWidth <= container.clientWidth + 1) return;

    container.textContent = '';
    container.classList.add('marquee-active');

    const track = document.createElement('div');
    track.className = 'marquee-track';

    const item = document.createElement('span');
    item.className = 'marquee-item';
    item.textContent = text;

    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');

    track.append(item, clone);
    container.appendChild(track);

    const distance = item.getBoundingClientRect().width;
    track.style.setProperty('--marquee-duration', `${Math.max(6, distance / 35)}s`);
  });
}
