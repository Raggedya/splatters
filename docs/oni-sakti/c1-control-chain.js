const speed = 22; // CSS pixels per second

export function installControlChain(rail, toggle, reduced, signal) {
 const dock = rail.parentElement;
 let tiles = [], order = [], stride = 0, canMove = false;
 let frame = 0, resizeFrame = 0, timer = 0, last = 0, remainder = 0, position = 0;
 let paused = false, hovered = false, held = false;
 const on = (target, event, listener) => target.addEventListener(event, listener, {signal});
 const stop = () => {
  cancelAnimationFrame(frame);
  frame = last = remainder = 0;
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

 function move(now) {
  frame = 0;
  // Native scroll remains in charge during swipes, wheel movement and keyboard focus.
  if (Math.abs(rail.scrollTop - position) > 1) {
   position = rail.scrollTop;
   rest();
   return;
  }
  if (last) remainder += Math.min(now - last, 50) * speed / 1000;
  last = now;
  const delta = Math.floor(remainder);
  remainder -= delta;
  if (delta) {
   let offset = position + delta;
   // Recycle the real tile only after it leaves the clip. No duplicate links or handlers.
   while (offset >= stride) {
    order.push(order.shift());
    order.forEach((tile, index) => { tile.style.order = index; });
    offset -= stride;
   }
   rail.scrollTop = offset;
   position = rail.scrollTop;
  }
  sync();
 }

 function refresh() {
  const visible = [...rail.querySelectorAll('button:not([hidden]), a:not([hidden])')];
  if (tiles.length !== visible.length || tiles.some((tile, i) => tile !== visible[i])) {
   for (const tile of tiles) tile.style.removeProperty('order');
   tiles = visible;
   order = [...tiles].sort((a, b) => getComputedStyle(a).order - getComputedStyle(b).order);
   rail.scrollTop = 0;
  }
  rail.classList.toggle('is-chain', tiles.length >= 6 && !reduced.matches);
  stride = (tiles[0]?.offsetHeight || 0) + (parseFloat(getComputedStyle(rail).rowGap) || 0);
  canMove = rail.classList.contains('is-chain') &&
   rail.clientHeight >= 44 && rail.scrollHeight - rail.clientHeight >= Math.ceil(stride);
  toggle.hidden = !canMove;
  position = rail.scrollTop;
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
  }
  refresh();
 });
 on(rail, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; sync(); } });
 on(rail, 'pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; sync(); } });
 on(rail, 'pointerdown', () => { held = true; sync(); });
 const release = () => { if (held) { held = false; rest(); } };
 on(window, 'pointerup', release);
 on(window, 'pointercancel', release);
 on(window, 'blur', () => { hovered = false; release(); });
 on(dock, 'focusin', sync);
 on(dock, 'focusout', () => queueMicrotask(sync));
 on(document, 'visibilitychange', sync);
 on(rail, 'scroll', () => {
  if (Math.abs(rail.scrollTop - position) > 1) {
   position = rail.scrollTop;
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
