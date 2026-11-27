// Explicit owner-authorised assistance. Connected wet fronts, never remote stamps.
export const REVEAL_TARGETS=[0,.10,.19,.30,.38,.47,.56,.65,.73,.82,.88,.94,.975,1];
const opacity=c=>{const t=Math.min(1,Math.max(0,c*2.5));return t*t*(3-2*t);};
export class RevealAssist {
 constructor(field){this.f=field;this.last=new Float32Array(field.n);this.directGain=0;this.assistedGain=0;this.plan=null;this.shots=0;this.age=0;}
 recordDirect(){const f=this.f;for(let i=0;i<f.n;i++)this.directGain+=Math.max(0,opacity(f.cover[i])-opacity(this.last[i]));this.last.set(f.cover);}
 start(shots){
  this.recordDirect();this.shots=shots;const f=this.f,n=f.n,w=f.w,h=f.h;
  // Multi-source wet-edge distances. Every new cell has a wet predecessor; upward
  // capillary spread costs more than downward flow. Deterministic texture
  // gives branching fronts instead of a circle or straight wipe.
  const dist=new Float64Array(n).fill(Infinity),cost=new Float32Array(n);
  let opaque=0;for(let i=0;i<n;i++){if(f.cover[i]>=.4){dist[i]=0;opaque++;}const x=i%w,y=(i/w)|0;cost[i]=1+.28*Math.sin(x*.23+Math.sin(y*.11)*2)+.16*Math.cos(y*.29+x*.07);}
  if(!opaque){this.plan=null;return;}
  // Four bounded chamfer sweeps avoid heap allocation and long mobile stalls.
  // Each finite distance still follows an earlier wet predecessor.
  for(let pass=0;pass<2;pass++){
   for(let i=0;i<n;i++){const x=i%w,c=cost[i];if(x>0)dist[i]=Math.min(dist[i],dist[i-1]+c*1.1);if(i>=w)dist[i]=Math.min(dist[i],dist[i-w]+c*.8);}
   for(let i=n-1;i>=0;i--){const x=i%w,c=cost[i];if(x<w-1)dist[i]=Math.min(dist[i],dist[i+1]+c*1.1);if(i<n-w)dist[i]=Math.min(dist[i],dist[i+w]+c*1.45);}
  }
  const goal=Math.ceil(n*REVEAL_TARGETS[Math.min(13,shots)]),cells=[];
  for(let i=0;i<n;i++)if(dist[i]>0)cells.push(i);
  cells.sort((a,b)=>dist[a]-dist[b]);const count=Math.max(0,goal-opaque);cells.length=Math.min(cells.length,count);
  const reach=cells.length?dist[cells.at(-1)]:0,duration=shots>=13?4.8:2.6;
  this.plan=cells.length?{cells,dist,reach,duration,cursor:0,live:[]}:null;this.age=0;
 }
 step(dt){this.recordDirect();const p=this.plan;if(!p)return false;this.age+=dt;const f=this.f,ramp=.22;
  // Constant travel time along irregular paths, then a rounded local meniscus.
  while(p.cursor<p.cells.length&&p.dist[p.cells[p.cursor]]/p.reach*p.duration<=this.age)p.live.push(p.cells[p.cursor++]);
  let changed=false;
  p.live=p.live.filter(i=>{const t=Math.min(1,(this.age-p.dist[i]/p.reach*p.duration)/ramp),v=.40001*t*t*(3-2*t),before=f.cover[i];if(v>before){f.cover[i]=v;f.mass[i]=Math.max(f.mass[i],.35+.18*Math.sin(i*.19));f.wet[i]=1;f.dryAt[i]=Infinity;this.assistedGain+=opacity(v)-opacity(before);changed=true;}return t<1;});
  this.last.set(f.cover);if(p.cursor===p.cells.length&&!p.live.length)this.plan=null;return changed;
 }
 get active(){return !!this.plan;}
 get state(){return {shots:this.shots,active:this.active,directCoverageGain:this.directGain/this.f.n,assistedCoverageGain:this.assistedGain/this.f.n,mode:'connected wet-edge assistance',remainingFrontCells:this.plan?this.plan.cells.length-this.plan.cursor+this.plan.live.length:0};}
}
