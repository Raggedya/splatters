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

 let cycle=0,offset=0,native=0,looping=false,frame=0,last=0,timer=0,animation=null;
 let launcherActive=false,hovered=false,gesture=null,held=null,ignoredClick=null,dragged=false;

 function canMove(){
  return looping&&!launcherActive&&!document.hidden&&(held||(!hovered&&!gesture&&!timer&&!dock.querySelector(':focus-visible')));
 }
 function stopAutomatic(){
  if(!animation)return;
  const elapsed=Number(animation.currentTime)||0;
  setOffset(cycle-elapsed*SPEED/1000);
  animation.cancel();
  animation=null;
 }
 function sync(){
  const moving=canMove();
  if(moving&&!held&&typeof track.animate==='function'){
   if(!animation){
    cancelAnimationFrame(frame);frame=last=0;
    // Only the track transform is animated. Both strips form a seamless
    // cycle, and the browser can advance it without a JS callback per frame.
    animation=track.animate([
     {transform:'translate3d('+(native-cycle)+'px,0,0)'},
     {transform:'translate3d('+native+'px,0,0)'}
    ],{duration:cycle*1000/SPEED,iterations:Infinity});
    animation.currentTime=(cycle-wrap(offset,cycle))*1000/SPEED;
   }
   return;
  }
  stopAutomatic();
  if(moving){
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
 function translate(){track.style.transform='translate3d('+(native-offset)+'px,0,0)';}
 function setOffset(value){offset=wrap(value,cycle);translate();}
 function alignNative(){
  // Rebase only when handing the track to native touch scrolling. The
  // compensating transform preserves the exact visible fractional position.
  offset=wrap(offset,cycle);
  rail.scrollLeft=Math.round(offset);
  native=rail.scrollLeft;
  translate();
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
  stopAutomatic();
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
   track.classList.add('is-looping');
   if(!copy.isConnected)track.append(copy);
   // Refreshes during a native swipe must not reset its scroll position.
   if(!gesture&&rail.scrollLeft===native)setOffset(offset);
  }else{
   copy.remove();
   track.classList.remove('is-looping');
   copies.clear();
   track.style.transform='';
   offset=native=rail.scrollLeft;
  }
  updateArrows();
  sync();
 }
 function step(direction){
  stopAutomatic();
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
  if(looping)alignNative();
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
  // Links use the browser's native activation on both strips. Only mirrored
  // in-gallery buttons need to invoke the original button's handler.
  if(real?.localName==='button'){
   event.preventDefault();
   event.stopImmediatePropagation();
   real.click();
  }
 },true);
 on(rail,'scroll',()=>{
  const position=rail.scrollLeft;
  if(position!==native){
   stopAutomatic();
   offset+=position-native;native=position;
   if(looping)translate();
   rest();
  }
  if(!looping)updateArrows();
 });
 on(rail,'keydown',event=>{
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight'||previous.hidden)return;
  event.preventDefault();
  step(event.key==='ArrowLeft'?-1:1);
 });
 on(dock,'focusin',event=>{
  sync();
  if(!looping||!strip.contains(event.target)||!event.target.matches(':focus-visible'))return;
  const tile=event.target.getBoundingClientRect(),viewport=rail.getBoundingClientRect();
  if(tile.left<viewport.left||tile.right>viewport.right){
   const first=strip.getBoundingClientRect();
   offset=Math.max(0,tile.left-first.left-2);
   alignNative();
  }
 });
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
  stopAutomatic();
  cancelAnimationFrame(frame);
  clearTimeout(timer);
  observer.disconnect();
  mutations.disconnect();
 },{once:true});
 return {refresh,setLauncherActive(active){
  if(launcherActive===active)return;
  launcherActive=active;sync();
 }};
}
