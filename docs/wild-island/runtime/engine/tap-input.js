// One pointer stream for page-wide taps; never listen for synthetic mouse clicks.
export const INTERACTIVE='button,a,input,select,textarea,summary,[role="button"],[contenteditable="true"],audio,video';
export class TapGesture {
 constructor({touchMovement=9}={}){this.touchMovement=touchMovement;this.seenDown=new WeakSet();this.cancel();}
 begin(e,blocked=false,ballId=null){
  if(this.seenDown.has(e))return;this.seenDown.add(e);
  if(e.isPrimary===false){this.cancel();return;}if(this.down?.id===e.pointerId)return;
  this.cancel();if(blocked||e.button>0)return;
  this.down={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,ballId,tolerance:e.pointerType==='touch'?this.touchMovement:9};
 }
 move(e){if(this.down?.id===e.pointerId&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>this.down.tolerance)this.cancel();}
 end(e,blocked=false){const p=this.down;if(!p||p.id!==e.pointerId||e.timeStamp<p.time)return false;this.cancel();return!blocked&&e.timeStamp-p.time<450&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<=p.tolerance;}
 cancel(){this.down=null;}
}
