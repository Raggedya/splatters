const speed = 22; // CSS pixels per second

export function installControlChain(rail, toggle, reduced, signal) {
 const dock = rail.parentElement;
 let tiles = [], order = [], stride = 0, tileHeight = 0, viewportHeight = 0, canMove = false;
 let frame = 0, resizeFrame = 0, timer = 0, last = 0, fraction = 0, position = 0;
 const angles = new Map();
 let paused = false, hovered = false, held = false;
 const on = (target, event, listener) => target.addEventListener(event, listener, {signal});
 const stop = () => {
  cancelAnimationFrame(frame);
  frame = last = 0;
 };
 const sync = () => {
  if (!canMove || paused || hovered || held || rail.querySelector(':focus-visible') ||
      timer || document.hidden) stop();
  else if (!frame) frame = requestAnimationFrame(move);
 };
 const rest = () => {
  clearTimeout(timer);
  timer = setTimeout(() => { timer = 0; sync(); }, 1100);
  sync();
 };

 function paint() {
  rail.style.setProperty('--chain-shift', `${-fraction}px`);
  order.forEach((tile, index) => {
   const top = index * stride - position - fraction;
   const exit = Math.max(0, -top / tileHeight);
   const enter = Math.max(0, (top + tileHeight - viewportHeight) / tileHeight);
   const angle = canMove ? Math.round(72 * (Math.min(1, exit) - Math.min(1, enter))) : 0;
   if (angles.get(tile) === angle) return;
   angles.set(tile, angle);
   tile.style.setProperty('--chain-angle', `${angle}deg`);
  });
 }

 function move(now) {
  frame = 0;
  // Native scroll remains in charge during swipes, wheel movement and keyboard focus.
  if (rail.scrollTop !== position) {
   position = rail.scrollTop;
   fraction = 0;
   paint();
   rest();
   return;
  }
  const elapsed = last ? Math.min(now - last, 50) : 0;
  last = now;
  if (elapsed) {
   let offset = position + fraction + elapsed * speed / 1000;
   // Recycle the real tile only after it leaves the clip. No duplicate links or handlers.
   while (offset >= stride) {
    order.push(order.shift());
    order.forEach((tile, index) => { tile.style.order = index; });
    offset -= stride;
   }
   // Keep native scrolling for input, and animate the fractional pixel on the tiles.
   const whole = Math.floor(offset);
   if (whole !== position) rail.scrollTop = whole;
   position = rail.scrollTop;
   fraction = offset - position;
   paint();
  }
  sync();
 }

 function refresh() {
  const visible = [...rail.querySelectorAll('button:not([hidden]), a:not([hidden])')];
  if (tiles.length !== visible.length || tiles.some((tile, i) => tile !== visible[i])) {
   for (const tile of tiles) {
    tile.style.removeProperty('order');
    tile.style.removeProperty('--chain-angle');
   }
   angles.clear();
   tiles = visible;
   order = [...tiles].sort((a, b) => getComputedStyle(a).order - getComputedStyle(b).order);
   rail.scrollTop = 0;
   fraction = 0;
  }
  rail.classList.toggle('is-chain', tiles.length >= 6 && !reduced.matches);
  tileHeight = parseFloat(tiles[0] ? getComputedStyle(tiles[0]).height : 0);
  viewportHeight = rail.clientHeight;
  stride = tileHeight + (parseFloat(getComputedStyle(rail).rowGap) || 0);
  canMove = rail.classList.contains('is-chain') &&
   rail.clientHeight >= 44 && rail.scrollHeight - rail.clientHeight >= Math.ceil(stride);
  toggle.hidden = !canMove;
  position = rail.scrollTop;
  if (!canMove) fraction = 0;
  paint();
  sync();
 }

 const observer = new ResizeObserver(() => {
  if (!resizeFrame) resizeFrame = requestAnimationFrame(() => {
   resizeFrame = 0;
   refresh();
  });
 });
 observer.observe(rail);
 on(reduced, 'change', () => {
  if (reduced.matches) {
   for (const tile of tiles) tile.style.removeProperty('order');
   order = [...tiles].sort((a, b) => getComputedStyle(a).order - getComputedStyle(b).order);
   rail.scrollTop = 0;
   fraction = 0;
  }
  refresh();
 });
 on(rail, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; sync(); } });
 on(rail, 'pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; sync(); } });
 on(rail, 'pointerdown', () => { held = true; sync(); });
 const release = () => { if (held) { held = false; rest(); } };
 on(window, 'pointerup', release);
 on(window, 'pointercancel', release);
 on(window, 'blur', () => { hovered = false; release(); sync(); });
 on(dock, 'focusin', sync);
 on(dock, 'focusout', () => queueMicrotask(sync));
 on(document, 'visibilitychange', sync);
 on(rail, 'scroll', () => {
  if (rail.scrollTop !== position) {
   position = rail.scrollTop;
   fraction = 0;
   paint();
   rest();
  }
 });
 on(toggle, 'click', () => {
  paused = !paused;
  toggle.setAttribute('aria-pressed', String(paused));
  sync();
 });
 signal.addEventListener('abort', () => {
  stop();
  clearTimeout(timer);
  cancelAnimationFrame(resizeFrame);
  observer.disconnect();
 }, {once:true});
 return {refresh};
}
