// Local 5A adapter. Recovered V9 integration remains available unchanged.
import {makeShot as baselineShot,chooseSplat} from './shot.js';
export const NATURAL=Object.freeze({drag:.24,restitution:.91,gravity:.035,lifetime:7.8,restSpeed:.07});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function makeShot(origin,pull,speed,automatic=false){
 const p=baselineShot(origin,pull,speed,automatic);p.contacts=0;p.peakSpeed=speed;return p;
}
export function manualShot(origin,pull,w,h){
 const maximum=Math.max(24,Math.min(72,w*.18,h*.18));
 const strength=clamp(Math.hypot(pull.x,pull.y)/maximum,0,1);
 const p=makeShot(origin,pull,h*(.55+1.45*strength**1.1));p.strength=strength;return p;
}
export function advanceShot(p,dt,w,h){
 if(p.stopped||p.delayRemaining!==null)return false;
 const steps=Math.max(1,Math.ceil(dt*240)),t=dt/steps,k=NATURAL.drag,g=h*NATURAL.gravity;
 for(let n=0;n<steps;n++){
  const decay=Math.exp(-k*t),distance=(1-decay)/k;
  p.x+=p.vx*distance;p.y+=(p.vy-g/k)*distance+g/k*t;
  p.vx*=decay;p.vy=p.vy*decay+g/k*(1-decay);
  for(const [axis,velocity,limit]of [['x','vx',w],['y','vy',h]]){
   // Reflect overshoot, including extreme test velocities, never clamp through a wall.
   let guard=0;while((p[axis]<10||p[axis]>limit-10)&&guard++<64){
    if(p[axis]<10){p[axis]=20-p[axis];p[velocity]=Math.abs(p[velocity])*NATURAL.restitution;}
    else{p[axis]=2*(limit-10)-p[axis];p[velocity]=-Math.abs(p[velocity])*NATURAL.restitution;}
    p.contacts=(p.contacts||0)+1;
   }
   p[axis]=clamp(p[axis],10,limit-10);
  }
  p.age+=t;
 }
 const done=(p.age>1&&Math.hypot(p.vx,p.vy)<h*NATURAL.restSpeed)||p.age>=NATURAL.lifetime;
 if(done){p.vx=p.vy=0;p.stopped=true;}return done;
}
export function automaticShot(origin,w,h,random=Math.random){
 for(let attempt=0;attempt<18;attempt++){
  const angle=(random()*2-1)*.7,p=makeShot(origin,{x:-Math.sin(angle),y:Math.cos(angle)},h*(.9+.18*random()),true),probe=structuredClone(p);
  for(let n=0;n<1500&&!probe.stopped;n++)advanceShot(probe,1/180,w,h);
  if(probe.x>w*.12&&probe.x<w*.88&&probe.y>h*.14&&probe.y<h*.84)return p;
 }
 return makeShot(origin,{x:-.3,y:1},h,true);
}
export function successorShot(position,w,h,random=Math.random){
 const angle=random()*Math.PI*2;let dx=Math.cos(angle),dy=Math.sin(angle);const inset=Math.max(24,w*.08);
 if(position.x<inset)dx=Math.abs(dx);else if(position.x>w-inset)dx=-Math.abs(dx);
 if(position.y<inset)dy=Math.abs(dy);else if(position.y>h-inset)dy=-Math.abs(dy);
 return makeShot(position,{x:-dx,y:-dy},h*(.95+.35*random()));
}
export {chooseSplat};
