// Presentation only: one existing game clock, no timers/RAF/pixel buffers.
export class CompletionPresentation {
 constructor(){this.start=null;this.starts=0;this.cancelled=false;this.reduced=false;}
 observe(complete,clock,reduced=false){
  if(this.cancelled||!complete)return;
  if(this.start===null){this.start=clock;this.starts++;this.reduced=reduced;}
  if(reduced)this.reduced=true;
 }
 snapshot(clock){
  const age=this.start===null?0:Math.max(0,clock-this.start),duration=this.reduced?.16:1.1;
  const phase=this.cancelled?'cancelled':this.start===null?'idle':age>=duration?'gallery':this.reduced?'gentle-fade':age<.15?'settling':'ripple';
  return{phase,age,starts:this.starts,reduced:this.reduced,active:!['idle','cancelled','gallery'].includes(phase),rippleProgress:Math.max(0,Math.min(1,(age-.15)/.95))};
 }
 draw(g,w,h,clock){
  const state=this.snapshot(clock);if(!state.active)return;
  if(this.reduced){g.save();g.fillStyle=`rgba(255,255,255,${.025*(1-state.age/.16)})`;g.fillRect(0,0,w,h);g.restore();return;}
  if(state.phase!=='ripple')return;
  const t=state.rippleProgress,cx=w*.42,cy=h*.4,extent=Math.hypot(w*.58,h*.6),band=extent*.23,r=extent*t;
  const alpha=.055*Math.sin(Math.PI*t);if(alpha<=0)return;
  g.save();const light=g.createRadialGradient(cx,cy,Math.max(0,r-band),cx,cy,r+band);
  light.addColorStop(0,'rgba(255,255,255,0)');light.addColorStop(.5,`rgba(255,255,255,${alpha})`);light.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=light;g.fillRect(0,0,w,h);g.restore();
 }
 dispose(){this.cancelled=true;}
}
