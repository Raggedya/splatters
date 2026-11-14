import {flightFrames} from './c1-flight-visual.js';
// Only transform/opacity are animated. Frames are sampled from ATELIER's exact
// solver, at its original velocity and collision time; no independent easing.
export class FlightVisual {
 constructor(projectile,trail){this.projectile=projectile;this.trail=trail;this.reset();}
 start(ball,geometry,reduced,now=performance.now()){
  if(this.ball===ball)return false;
  this.reset();this.ball=ball;this.startedAt=now;
  const plan=flightFrames(ball,geometry);this.duration=plan?.duration||0;
  if(!plan||!this.projectile.animate)return false;
  const options={duration:plan.duration,easing:'linear',fill:'forwards'};
  for(const [element,frames,hidden]of [[this.projectile,plan.frames,false],[this.trail,plan.trail,reduced]]){
   element.hidden=hidden;element.style.width='47px';element.style.zIndex='9';
   const animation=element.animate(frames,options);animation.startTime=now;
   this.animations.push(animation);
  }
  this.active=true;return true;
 }
 pause(){for(const a of this.animations)a.pause();}
 resume(){for(const a of this.animations)a.play();}
 reset(){for(const a of this.animations||[])a.cancel();this.animations=[];this.active=false;this.ball=null;this.projectile.hidden=this.trail.hidden=true;}
}
