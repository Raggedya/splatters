// A completed design is readable for three visible seconds, then returns to
// the branded cover. Replay/navigation can cancel the whole transition.
export class CompletionReturn {
 constructor(frame,reduced){this.frame=frame;this.reduced=reduced;this.active=false;this.generation=0;this.visibility=()=>this.onVisibility();document.addEventListener('visibilitychange',this.visibility);}
 show({panel,cover,advance,onError}){
  if(this.active)return;this.active=true;const generation=++this.generation;
  this.panel=panel;this.remaining=3000;this.beginFade=async()=>{
   if(generation!==this.generation)return;
   const overlay=document.createElement('canvas');overlay.className='clearfire-return-cover';overlay.width=cover.width;overlay.height=cover.height;overlay.getContext('2d').drawImage(cover,0,0);this.overlay=overlay;this.frame.append(overlay);
   const duration=this.reduced.matches?0:600;
   this.animation=overlay.animate([{opacity:0},{opacity:1}],{duration,fill:'forwards'});
   if(panel)this.panelAnimation=panel.animate([{opacity:1},{opacity:0}],{duration,fill:'forwards'});
   try{await this.animation.finished;if(generation!==this.generation)return;await advance();if(generation!==this.generation)return;this.cancel();}catch(error){if(generation===this.generation){this.cancel();onError(error);}}
  };
  if(!document.hidden)this.schedule();
 }
 schedule(){this.started=performance.now();this.timer=setTimeout(()=>{this.timer=null;this.remaining=0;void this.beginFade();},this.remaining);}
 onVisibility(){if(!this.active)return;if(document.hidden){if(this.timer){clearTimeout(this.timer);this.timer=null;this.remaining=Math.max(0,this.remaining-(performance.now()-this.started));}this.animation?.pause();this.panelAnimation?.pause();}else if(this.animation){this.animation.play();this.panelAnimation?.play();}else if(!this.timer)this.schedule();}
 cancel(){this.generation++;clearTimeout(this.timer);this.timer=null;this.animation?.cancel();this.panelAnimation?.cancel();this.animation=this.panelAnimation=null;this.overlay?.remove();this.overlay=null;this.active=false;}
 dispose(){this.cancel();document.removeEventListener('visibilitychange',this.visibility);}
}
