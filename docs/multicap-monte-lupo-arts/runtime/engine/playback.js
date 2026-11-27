// One owned HTMLMediaElement and one abortable listener set per entry.
export class Playback{
 constructor(element,{src,onPlaying=()=>{},onPause=()=>{},onWaiting=()=>{},onEnded=()=>{},onError=()=>{},onTime=()=>{}}){
  this.element=element;this.disposed=false;this.requesting=false;this.ended=false;this.serial=0;this.listeners=new AbortController();
  const on=(name,fn)=>element.addEventListener(name,()=>{if(!this.disposed)fn();},{signal:this.listeners.signal});
  const ended=()=>{if(!this.ended){this.ended=true;this.requesting=false;onEnded();}};
  on('playing',()=>{if(element.paused||element.readyState<2)return;this.requesting=false;this.ended=false;onPlaying();});
  // Browsers normally emit pause before ended. Neither may freeze painting at EOF.
  on('pause',()=>{if(element.ended)ended();else onPause();});on('ended',ended);
  on('waiting',()=>{if(!element.ended)onWaiting();});on('stalled',()=>{if(element.readyState<3&&!element.ended)onWaiting();});
  on('error',()=>{this.requesting=false;onError('The bundled music could not load. Painting remains stopped.');});
  on('timeupdate',()=>onTime(element.currentTime||0));this.onError=onError;this.onPause=onPause;
  element.preload='auto';element.src=src;element.load();
 }
 async play(){if(this.disposed||this.requesting)return;this.requesting=true;const serial=++this.serial;try{if(this.element.ended)this.element.currentTime=0;await this.element.play();if(!this.disposed&&serial===this.serial)this.requesting=false;}catch(e){if(this.disposed||serial!==this.serial)return;this.requesting=false;this.onError(e.name==='NotAllowedError'?'Playback was blocked. Press Play to try again.':'The local music could not play. Reload or retry Play.');}}
 pause(){if(this.disposed)return;this.serial++;this.requesting=false;this.onPause();this.element.pause();}
 dispose(){if(this.disposed)return;this.disposed=true;this.serial++;this.requesting=false;this.listeners.abort();this.element.pause();this.element.removeAttribute('src');this.element.load();this.element.remove();}
}
