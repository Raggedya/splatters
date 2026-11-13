// Completion is earned by coverage, never by shot count. Only isolated specks
// (<=0.25% each, <=0.75% in total) receive a short final cleanup.
export class RevealAssist {
 constructor(field){this.f=field;this.plan=null;this.shots=0;this.age=0;this.cleaned=0;}
 start(shots){
  this.shots=shots;if(this.plan)return;
  const f=this.f,cells=[];let area=0;
  for(let i=0;i<f.n;i++)if(f.mask[i]){area++;if(f.cover[i]<.4)cells.push(i);}
  if(!cells.length||cells.length>area*.0075)return;
  const remaining=new Set(cells),limit=Math.floor(area*.0025);
  while(remaining.size){
   const first=remaining.values().next().value,queue=[first];remaining.delete(first);
   for(let q=0;q<queue.length;q++){
    const i=queue[q],x=i%f.w,y=Math.floor(i/f.w);
    // Eight-connected components: diagonally touching gaps are not specks.
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy;if(nx<0||nx>=f.w||ny<0||ny>=f.h)continue;
     const next=ny*f.w+nx;if(remaining.delete(next))queue.push(next);
    }
    if(queue.length>limit)return;
   }
  }
  this.plan=cells.map(i=>({i,from:f.cover[i]}));this.age=0;
 }
 step(dt){if(!this.plan)return false;this.age+=dt;const t=Math.min(1,this.age/.25),ease=t*t*(3-2*t);
  for(const {i,from} of this.plan){this.f.cover[i]=Math.max(this.f.cover[i],from+(.40001-from)*ease);this.f.mass[i]=Math.max(this.f.mass[i],.35);this.f.wet[i]=1;this.f.dryAt[i]=Infinity;}
  if(t===1){this.cleaned+=this.plan.length;this.plan=null;}return true;
 }
 get active(){return !!this.plan;}
 get state(){return{shots:this.shots,active:this.active,mode:'isolated speck cleanup only',assistedCoverageGain:this.cleaned/this.f.n,remainingFrontCells:this.plan?.length||0};}
}
