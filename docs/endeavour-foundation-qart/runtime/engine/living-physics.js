import * as natural from './natural-physics.js';
import {launcher,power,energyHeight,FLIGHT_INSET} from './living-layout.js';
export const makeShot=natural.makeShot,successorShot=natural.successorShot;
export function manualShot(origin,pull,w,h){const strength=power(Math.hypot(pull.x,pull.y),launcher(w,h).range),p=makeShot(origin,pull,energyHeight(w,h)*2*strength);p.strength=strength;return p;}
export function advanceShot(p,dt,w,h){
 // Keep 5A drag/restitution/lifetime and its OLD height-based gravity/rest scale.
 // Same analytic 5A equations below; energy scale is independent of new bounds.
 return integrate(p,dt,w,h,energyHeight(w,h));
}
function integrate(p,dt,w,h,reference){
 if(p.stopped||p.delayRemaining!==null)return false;
 const count=Math.max(1,Math.ceil(dt*240)),t=dt/count,k=natural.NATURAL.drag,g=reference*natural.NATURAL.gravity;
 for(let n=0;n<count;n++){
  const decay=Math.exp(-k*t),distance=(1-decay)/k;
  p.x+=p.vx*distance;p.y+=(p.vy-g/k)*distance+g/k*t;p.vx*=decay;p.vy=p.vy*decay+g/k*(1-decay);
  for(const [axis,v,limit]of [['x','vx',w],['y','vy',h]]){let guard=0;while((p[axis]<FLIGHT_INSET||p[axis]>limit-FLIGHT_INSET)&&guard++<64){if(p[axis]<FLIGHT_INSET){p[axis]=2*FLIGHT_INSET-p[axis];p[v]=Math.abs(p[v])*natural.NATURAL.restitution;}else{p[axis]=2*(limit-FLIGHT_INSET)-p[axis];p[v]=-Math.abs(p[v])*natural.NATURAL.restitution;}p.contacts=(p.contacts||0)+1;}p[axis]=Math.max(FLIGHT_INSET,Math.min(limit-FLIGHT_INSET,p[axis]));}p.age+=t;
 }
 const done=p.age>1&&Math.hypot(p.vx,p.vy)<reference*natural.NATURAL.restSpeed||p.age>=natural.NATURAL.lifetime;
 if(done){p.vx=p.vy=0;p.stopped=true;}return done;
}
export function automaticShot(origin,w,h,random=Math.random){
 for(let attempt=0;attempt<18;attempt++){const angle=(random()*2-1)*.7,p=makeShot(origin,{x:-Math.sin(angle),y:Math.cos(angle)},energyHeight(w,h)*(.9+.18*random()),true),probe=structuredClone(p);for(let i=0;i<1500&&!probe.stopped;i++)advanceShot(probe,1/180,w,h);if(probe.x>w*.12&&probe.x<w*.88&&probe.y>h*.14&&probe.y<h*.84)return p;}
 return makeShot(origin,{x:-.3,y:1},energyHeight(w,h),true);
}
