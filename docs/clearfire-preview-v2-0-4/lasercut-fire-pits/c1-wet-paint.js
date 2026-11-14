import {RevealAssist} from './c1-reveal-assist.js?strategy=2';
import {RunningPaint} from './runtime/vendor/splat-v9/running-paint.js';
import {PAINT} from './c1-tuning.js';
// A finite burst: placement and overlap determine progress.
const STRATEGY_RADIUS=.2585;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
const seeded=()=>{let seed=384;return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);};
// Reuses LiquidField's seeded organic silhouette, stamp and shared mass/mask.
// This adapter keeps relief after motion stops; the old drying solver is not run.
export class CinematicPaint {
 constructor(field){this.field=field;this.assist=new RevealAssist(field);this.assistPending=0;this.drips=[];this.hits=0;this.launches=0;this.finishing=0;this.complete=false;this.dirty=true;this.steps=0;this.coater=new RunningPaint(field);}
 impact(u,v,launch=this.hits+1){const f=this.field;this.hits++;this.launches=Math.max(this.launches,launch);if(this.complete)return;
  // Identical local footprint for identical aim, independent of shot order.
  const random=f.random;f.random=seeded();
  try{f.deposit(u*f.w,v*f.h,f.w*STRATEGY_RADIUS);}finally{f.random=random;}
  if(f.effects.length>PAINT.maxEffects){const old=f.effects.shift();f.stamp(old,old.r);}
  this.assistPending=.48;this.dirty=true;
 }
 seed(e){const f=this.field,random=seeded();
  for(let n=0;n<PAINT.dripsPerHit;n++){
   const x=e.x+(n-(PAINT.dripsPerHit-1)/2)*e.r*.33+(random()-.5)*3,y=e.y+e.r*(.2+random()*.25),r=1.5+random()*1.1;
   if(!this.coater.inside(x,y,r+1))continue;
   this.drips.push({x,y,tip:y,r,age:0,drift:(random()-.5)*PAINT.lateralSpread*2,distance:Math.min(f.h-y-r-1,(f.h*.27)*(.7+random()*.5)),duration:PAINT.runSeconds*(.65+random()*.35)});
  }
  if(this.drips.length>PAINT.maxDrips)this.drips.splice(0,this.drips.length-PAINT.maxDrips);
 }
 considerFinish(coverage){if(!this.complete)this.assist.start(this.launches,coverage);}
 step(dt){const f=this.field;this.steps++;if(!this.active)return false;f.time+=dt;
  for(const e of f.effects){const previous=e.age;e.age+=dt;
   if(previous<PAINT.spreadSeconds){const t=ease(e.age/PAINT.spreadSeconds);f.stamp(e,e.r*(.5+.5*t));
    for(const d of e.drops){const dist=e.r*d.v*t;this.coater.coat(e.x+Math.cos(d.a)*dist,e.y+Math.sin(d.a)*dist,d.s,.95,e.dryAt);}
    
   }
   if(!e.seeded&&e.age>=PAINT.runStart){e.seeded=true;this.seed(e);}
  }
  f.effects=f.effects.filter(e=>e.age<PAINT.burstSeconds);
  for(const s of this.drips){if(s.age>=s.duration)continue;const old=s.tip;s.age=Math.min(s.duration,s.age+dt);const t=s.age/s.duration;
   // Integrated bell-shaped speed: acceleration followed by viscous arrest.
   s.tip=s.y+s.distance*(t*t*(3-2*t));
   for(let y=old;y<=s.tip;y+=.45)this.coater.coat(s.x+s.drift*Math.sin(Math.min(1,(y-s.y)/Math.max(1,s.distance))*Math.PI/2),y,s.r*(.76+.12*Math.sin(y*.19)),1,Infinity);
   this.coater.coat(s.x+s.drift*Math.sin(t*Math.PI/2),s.tip,s.r*1.35,1,Infinity);
   if(!s.branched&&s.age>=PAINT.branchAfter&&s.r>2&&this.drips.length<PAINT.maxDrips){s.branched=true;const x=s.x+s.drift*Math.sin(t*Math.PI/2);this.drips.push({...s,x,y:s.tip,tip:s.tip,age:0,r:s.r*.65,distance:s.distance*.4,drift:-s.drift*.7,duration:s.duration*.7,branched:true});}
  }
  this.drips=this.drips.filter(s=>s.age<s.duration);
  if(this.assistPending>0&&!f.effects.length&&!this.drips.length){this.assistPending=0;}
  this.assist.step(dt);
  f.measure();
  // The final 3% is filled by the coverage-triggered finishing burn.
  this.complete=f.cover.every((value,i)=>!f.mask[i]||value>=.4);
  if(this.complete){this.drips=[];f.effects=[];}
  this.dirty=true;return true;
 }
 get active(){return !this.complete&&(this.field.effects.length>0||this.drips.length>0||this.finishing>0||this.assistPending>0||this.assist.active);}
 get state(){return{active:this.active,effects:this.field.effects.length,drips:this.drips.map(s=>({...s})),complete:this.complete,hits:this.hits,steps:this.steps,assistance:this.assist.state};}
}
