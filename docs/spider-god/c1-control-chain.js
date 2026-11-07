const SPEED=21.6,HELD_SPEED=36,RESUME_DELAY=5000;
const wrap=(value,length)=>((value%length)+length)%length;

export function installControlCarousel(rail,strip,previous,next,reduced,signal){
 const dock=rail.parentElement,track=strip.parentElement;
 const on=(target,event,handler,capture=false)=>target.addEventListener(event,handler,{signal,capture});
 const copy=document.createElement('div');
 copy.className='cta-strip';
 copy.setAttribute('aria-hidden','true');
 const copies=new Map();
 const tiles=()=>[...strip.querySelectorAll('button:not([hidden]),a:not([hidden])')];

 let cycle=0,offset=0,native=0,looping=false,frame=0,last=0,timer=0;
 let hovered=false,gesture=null,held=null,ignoredClick=null,dragged=false;

 function canMove(){
  return looping&&!document.hidden&&(held||(!hovered&&!gesture&&!timer&&!dock.querySelector(':focus-visible')));
 }
 function sync(){
  if(canMove()){
   if(!frame)frame=requestAnimationFrame(move);
  }else{
   cancelAnimationFrame(frame);
   frame=last=0;
  }
 }
 function rest(){
  if(signal.aborted)return;
  clearTimeout(timer);
  timer=setTimeout(()=>{timer=0;sync();},RESUME_DELAY);
  sync();
 }
 function setOffset(value){
  offset=wrap(value,cycle);
  rail.scrollLeft=Math.round(offset);
  native=rail.scrollLeft;
  // Native scroll offsets may be whole CSS pixels. Translate only the residual fraction.
  track.style.transform='translate3d('+(native-offset)+'px,0,0)';
 }
 function move(now){
  frame=0;
  if(!canMove()){last=0;return;}
  if(last)setOffset(offset-(held?.direction||1)*(held?HELD_SPEED:SPEED)*(now-last)/1000);
  last=now;
  sync();
 }
 function updateArrows(){
  if(looping){previous.disabled=next.disabled=false;return;}
  const end=Math.max(0,rail.scrollWidth-rail.clientWidth);
  previous.disabled=rail.scrollLeft<=1;
  next.disabled=rail.scrollLeft>=end-1;
 }
 function refresh(){
  const width=strip.getBoundingClientRect().width;
  const padding=parseFloat(getComputedStyle(rail).paddingLeft)||0;
  const overflow=width+2*padding>rail.clientWidth+1;
  dock.classList.toggle('is-overflowing',overflow);
  previous.hidden=next.hidden=!overflow;
  looping=overflow&&!reduced.matches;
  if(looping){
   cycle=width+(parseFloat(getComputedStyle(track).columnGap)||0);
   copies.clear();
   const nodes=tiles().map(tile=>{
    const clone=tile.cloneNode(true);
    clone.removeAttribute('id');
    for(const child of clone.querySelectorAll('[id]'))child.removeAttribute('id');
    clone.tabIndex=-1;
    clone.style.order=getComputedStyle(tile).order;
    copies.set(clone,tile);
    return clone;
   });
   copy.replaceChildren(...nodes);
   if(!copy.isConnected)track.append(copy);
   // Refreshes during a native swipe must not reset its scroll position.
   if(!gesture&&rail.scrollLeft===native)setOffset(offset);
  }else{
   copy.remove();
   copies.clear();
   track.style.transform='';
   offset=native=rail.scrollLeft;
  }
  updateArrows();
  sync();
 }
 function step(direction){
  const tile=tiles()[0];
  if(!tile)return;
  const width=tile.getBoundingClientRect().width+(parseFloat(getComputedStyle(strip).columnGap)||0);
  if(looping)setOffset(offset-direction*width);
  else rail.scrollBy({left:direction*width,behavior:'instant'});
  rest();
 }
 function startArrow(button,direction,key){
  if(!looping||held)return;
  held={button,direction,key,at:performance.now()};
  last=0;
  sync();
 }
 function endArrow(tap){
  if(!held)return;
  const {direction,at}=held;
  held=null;
  last=0;
  if(tap&&performance.now()-at<175)step(direction);
  else rest();
 }

 for(const [button,direction] of [[previous,-1],[next,1]]){
  on(button,'pointerdown',event=>{
   ignoredClick=null;
   if(event.button!==0||!looping||held)return;
   startArrow(button,direction,event.pointerId);
   ignoredClick=button;
   button.setPointerCapture(event.pointerId);
  });
  on(button,'pointermove',event=>{
   if(held?.key!==event.pointerId||held.button!==button)return;
   const box=button.getBoundingClientRect();
   if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)endArrow(false);
  });
  on(button,'lostpointercapture',event=>{if(held?.key===event.pointerId)endArrow(false);});
  on(button,'click',event=>{
   if(ignoredClick===button&&event.detail>0){ignoredClick=null;return;}
   step(direction);
  });
  on(button,'keydown',event=>{
   if(!looping||![' ','Enter'].includes(event.key))return;
   event.preventDefault();
   if(!event.repeat)startArrow(button,direction,event.key);
  });
  on(button,'blur',()=>{if(held?.button===button&&typeof held.key==='string')endArrow(false);});
 }
 on(window,'pointerup',event=>{if(held?.key===event.pointerId)endArrow(true);});
 on(window,'pointercancel',event=>{if(held?.key===event.pointerId)endArrow(false);});
 on(window,'keyup',event=>{
  if(held?.key!==event.key)return;
  event.preventDefault();
  endArrow(true);
 });
 on(dock,'pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;sync();}});
 on(dock,'pointerleave',event=>{if(event.pointerType==='mouse'){hovered=false;rest();}});
 on(rail,'pointerdown',event=>{
  if(event.button!==0)return;
  dragged=false;
  gesture={id:event.pointerId,x:event.clientX};
  sync();
 });
 on(window,'pointermove',event=>{
  if(gesture?.id===event.pointerId&&Math.abs(event.clientX-gesture.x)>7)dragged=true;
 });
 function releaseGesture(event){
  if(gesture?.id!==event.pointerId)return;
  if(event.type==='pointercancel')dragged=true;
  gesture=null;
  rest();
 }
 on(window,'pointerup',releaseGesture);
 on(window,'pointercancel',releaseGesture);
 on(window,'blur',()=>{
  hovered=false;
  gesture=null;
  endArrow(false);
  rest();
 });
 on(rail,'click',event=>{
  const tile=event.target.closest('a,button');
  if(!tile)return;
  if(dragged&&event.detail>0){event.preventDefault();event.stopImmediatePropagation();return;}
  const real=copies.get(tile);
  if(real){
   event.preventDefault();
   event.stopImmediatePropagation();
   real.click();
  }
 },true);
 on(rail,'scroll',()=>{
  if(rail.scrollLeft!==native){
   offset=native=rail.scrollLeft;
   track.style.transform='';
   rest();
  }
  if(!looping)updateArrows();
 });
 on(rail,'keydown',event=>{
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight'||previous.hidden)return;
  event.preventDefault();
  step(event.key==='ArrowLeft'?-1:1);
 });
 on(dock,'focusin',sync);
 on(dock,'focusout',()=>queueMicrotask(rest));
 on(document,'visibilitychange',()=>{if(document.hidden)endArrow(false);sync();});
 on(reduced,'change',()=>{endArrow(false);refresh();});
 const observer=new ResizeObserver(refresh);
 observer.observe(rail);
 const mutations=new MutationObserver(records=>{
  if(records.some(record=>record.type==='childList'||record.target.getAttribute(record.attributeName)!==record.oldValue))refresh();
 });
 mutations.observe(strip,{subtree:true,childList:true,attributeOldValue:true,attributeFilter:['hidden','aria-pressed','href','disabled','title']});
 signal.addEventListener('abort',()=>{
  cancelAnimationFrame(frame);
  clearTimeout(timer);
  observer.disconnect();
  mutations.disconnect();
 },{once:true});
 return {refresh};
}
