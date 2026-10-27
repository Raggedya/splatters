// Own only gestures that start in the launcher region. The iframe and controls
// never enter this stream. Non-passive Touch Events cover iOS rubber-banding.
export function installLauncherInput({region,grab,session,geometry,draw,wake,message,signal}){
 const on=(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal});let touch=null;
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 on(region,'touchstart',e=>{if(touch===null)touch=e.changedTouches[0]?.identifier;prevent(e);},{passive:false});
 const owns=e=>touch!==null&&[...e.changedTouches].some(t=>t.identifier===touch);
 on(document,'touchmove',e=>{if(owns(e))prevent(e);},{passive:false,capture:true});
 for(const type of ['touchend','touchcancel'])on(document,type,e=>{if(owns(e)){prevent(e);touch=null;}},{passive:false,capture:true});
 on(region,'pointerdown',e=>{
  if(e.isPrimary===false||e.button>0)return;prevent(e);const s=session(),g=geometry();if(!s||!g)return;
  if(Math.hypot(e.clientX-g.ready.x,e.clientY-g.ready.y)>76)return;
  if(!s.begin(e.pointerId,e.clientX,e.clientY,g.maxPullY))return;
  region.setPointerCapture(e.pointerId);draw();wake();message('Pull farther down to aim higher; sideways to aim across.');
 });
 on(region,'pointermove',e=>{if(session()?.move(e.pointerId,e.clientX,e.clientY)){prevent(e);draw();wake();}});
 on(region,'pointerup',e=>{const s=session();if(!s||s.pointer!==e.pointerId)return;prevent(e);const launched=s.release(e.pointerId);if(region.hasPointerCapture(e.pointerId))region.releasePointerCapture(e.pointerId);draw();if(launched){message('Ball in flight — canvas contact bursts automatically.');wake();}});
 for(const type of ['pointercancel','lostpointercapture'])on(region,type,e=>{const s=session();if(s?.pointer===e.pointerId){s.cancel();draw();}});
 on(region,'click',prevent);on(region,'contextmenu',prevent);on(region,'dragstart',prevent);on(grab,'selectstart',prevent);
 on(document,'visibilitychange',()=>{if(document.hidden)touch=null;});
 on(window,'blur',()=>{touch=null;session()?.cancel();draw();});
 return ()=>{touch=null;session()?.cancel();};
}
