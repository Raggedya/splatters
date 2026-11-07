import {advance,launch,BALL_RADIUS} from '../vendor/splat-v9/physics.js';

export const SIZE_BANDS=Object.freeze({small:[.075,.11],medium:[.13,.18],large:[.19,.235]});
export function chooseSplat(random=Math.random,first=false){
  const roll=random(),band=first?(roll<.4?'medium':'large'):(roll<.3?'small':roll<.75?'medium':'large');
  const [low,high]=SIZE_BANDS[band];return{band,fraction:low+(high-low)*random()};
}
export function makeShot(origin,pull,speed,automatic=false){return{...launch(origin,pull,speed),automatic,delayRemaining:null,stopped:false};}
export function advanceShot(p,dt,w,h){
  if(p.stopped||p.delayRemaining!==null)return false;
  // Baseline Splat supplies acceleration, integration, and side/top ricochets.
  // Ignore its old 2.5s expiry: this edition has damping + a bounded 4.8s lifetime.
  advance(p,dt,w,h);
  if(p.y>h-BALL_RADIUS){p.y=2*(h-BALL_RADIUS)-p.y;p.vy=-Math.abs(p.vy)*.78;}
  const damping=Math.exp(-.95*dt);p.vx*=damping;p.vy*=damping;
  const done=(p.age>.8&&Math.hypot(p.vx,p.vy)<32)||p.age>=4.8;
  if(done){p.x=Math.max(BALL_RADIUS,Math.min(w-BALL_RADIUS,p.x));p.y=Math.max(BALL_RADIUS,Math.min(h-BALL_RADIUS,p.y));p.vx=p.vy=0;p.stopped=true;}
  return done;
}
export function automaticShot(origin,w,h,random=Math.random){
  const base=Math.max(210,h*.86);
  for(let attempt=0;attempt<16;attempt++){
    const angle=(random()*2-1)*.85,speed=base*(.9+random()*.18),pull={x:-Math.sin(angle)*55,y:Math.cos(angle)*55};
    const shot=makeShot(origin,pull,speed,true),probe=structuredClone(shot);
    for(let i=0;i<865;i++)if(advanceShot(probe,1/180,w,h))break;
    if(probe.x>w*.14&&probe.x<w*.86&&probe.y>h*.15&&probe.y<h*.82)return shot;
  }
  // Deterministic, physically simulated fallback for an unusually hostile RNG.
  return makeShot(origin,{x:-18,y:55},base*.96,true);
}

// Same integrator as Classic, with a fresh bounded direction at the captured
// position. Only edge bias is applied: never inspect coverage or seek new paint.
export function successorShot(position,w,h,random=Math.random){
  const angle=random()*Math.PI*2,speed=Math.max(210,h*.86)*(.78+.22*random());
  let dx=Math.cos(angle),dy=Math.sin(angle);const inset=Math.max(24,w*.08);
  if(position.x<inset)dx=Math.abs(dx);else if(position.x>w-inset)dx=-Math.abs(dx);
  if(position.y<inset)dy=Math.abs(dy);else if(position.y>h-inset)dy=-Math.abs(dy);
  return makeShot({x:position.x,y:position.y},{x:-dx,y:-dy},speed);
}
