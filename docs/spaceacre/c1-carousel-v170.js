export function installControlCarousel(rail,previous,next,reduced,signal){
 const on=(target,event,handler)=>target.addEventListener(event,handler,{signal});
 function refresh(){
  const end=Math.max(0,rail.scrollWidth-rail.clientWidth),overflow=end>1;
  rail.parentElement.classList.toggle('is-overflowing',overflow);
  previous.hidden=next.hidden=!overflow;
  previous.disabled=rail.scrollLeft<=1;
  next.disabled=rail.scrollLeft>=end-1;
 }
 function step(direction){
  const tile=rail.querySelector('button:not([hidden]),a:not([hidden])');
  if(!tile)return;
  const width=tile.getBoundingClientRect().width+(parseFloat(getComputedStyle(rail).columnGap)||0);
  rail.scrollBy({left:direction*width,behavior:reduced.matches?'instant':'smooth'});
 }
 on(previous,'click',()=>step(-1));
 on(next,'click',()=>step(1));
 on(rail,'scroll',refresh);
 on(rail,'keydown',event=>{
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
  if(previous.hidden)return;
  event.preventDefault();
  step(event.key==='ArrowLeft'?-1:1);
 });
 const observer=new ResizeObserver(refresh);
 observer.observe(rail);
 on(signal,'abort',()=>observer.disconnect());
 return {refresh};
}
