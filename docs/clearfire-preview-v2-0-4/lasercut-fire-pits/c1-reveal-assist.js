// Coverage-triggered finish: the last 3% burns away, irrespective of gap shape.
// The caller supplies rendered alpha coverage so it agrees with the on-screen %.
export class RevealAssist {
 constructor(field){this.f=field;this.plan=null;this.shots=0;this.age=0;this.cleaned=0;}
 start(shots,coverage){
  if(this.plan||!Number.isFinite(coverage)||coverage<.97)return;
  const cells=[];for(let i=0;i<this.f.n;i++)if(this.f.mask[i]&&this.f.cover[i]<.4)cells.push({i,from:this.f.cover[i]});
  if(!cells.length)return;
  this.shots=shots;this.plan=cells;this.age=0;
 }
 step(dt){if(!this.plan)return false;this.age+=dt;const t=Math.min(1,this.age/.8),ease=t*t*(3-2*t);
  for(const {i,from} of this.plan){this.f.cover[i]=Math.max(this.f.cover[i],from+(.40001-from)*ease);this.f.mass[i]=Math.max(this.f.mass[i],.35);this.f.wet[i]=1;this.f.dryAt[i]=Infinity;}
  if(t===1){this.cleaned+=this.plan.length;this.plan=null;}return true;
 }
 get active(){return !!this.plan;}
 get state(){return{shots:this.shots,active:this.active,mode:'97% finishing burn',assistedCoverageGain:this.cleaned/this.f.n,remainingFrontCells:this.plan?.length||0};}
}
