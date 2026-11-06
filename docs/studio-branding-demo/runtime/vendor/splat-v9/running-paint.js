// Bounded, analytical rivulets augment the low-resolution viscous field. They
// move pigment through the original mask; their visible layer is lighting only.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class RunningPaint {
 constructor(field){this.field=field;this.streams=[];this.settled=[];}
 clear(){this.streams=[];this.settled=[];}
 inside(x,y,r){
  const f=this.field,yy=Math.round(y);
  if(yy<0||yy>=f.h)return false;
  for(const xx of [Math.floor(x-r),Math.round(x),Math.ceil(x+r)])if(xx<0||xx>=f.w||!f.mask[yy*f.w+xx])return false;
  return true;
 }
 seed(x,y,r,dryAt){
  const candidates=[];
  for(let k=0;k<15;k++){
   const cx=x+(k/14-.5)*r*1.45,cy=y+r*(.25+.23*Math.random()),radius=3.5+Math.random()*2;
   if(!this.inside(cx,cy,radius*1.45))continue;
   let available=0;
   while(available<70&&this.inside(cx,cy+available+1,radius*1.45))available++;
   if(available>=10)candidates.push({x:cx,y:cy,tip:cy,r:radius,available,age:0,dryAt,speed:10+Math.random()*4,stopped:false});
  }
  candidates.sort((a,b)=>b.available-a.available);
  const chosen=[];
  for(const c of candidates){if(chosen.every(s=>Math.abs(s.x-c.x)>10)){chosen.push(c);if(chosen.length===3)break;}}
  this.streams.push(...chosen);if(this.streams.length>24)this.streams.splice(0,this.streams.length-24);
 }
 coat(x,y,r,wet,dryAt){
  const f=this.field;
  for(let yy=Math.max(0,Math.floor(y-r));yy<=Math.min(f.h-1,Math.ceil(y+r));yy++)for(let xx=Math.max(0,Math.floor(x-r));xx<=Math.min(f.w-1,Math.ceil(x+r));xx++){
   const i=yy*f.w+xx;if(!f.mask[i])continue;
   const edge=clamp((1-Math.hypot(xx-x,yy-y)/r)*6);
   if(!edge)continue;
   f.cover[i]=Math.max(f.cover[i],edge);
   f.mass[i]=Math.max(f.mass[i],edge*.8);
   f.wet[i]=Math.max(f.wet[i],edge*wet);
   f.dryAt[i]=Math.max(f.dryAt[i],dryAt);
  }
 }
 step(dt){
  const f=this.field;
  const count=this.streams.length;this.streams=this.streams.filter(s=>s.dryAt>f.time);if(this.streams.length!==count)f.dirty=true;
  for(const s of this.streams){
   s.age+=dt;
   const previous=s.tip;
   if(!s.stopped){
    const next=s.tip+dt*s.speed*(1-Math.exp(-s.age*4))/(1+s.age*.16);
    if(next-s.y>=s.available||!this.inside(s.x,next,s.r*1.45))s.stopped=true;
    else s.tip=next;
   }
   // The head carries the opaque, rounded paint front. Repeated strokes merge
   // in the shared mass/coverage fields rather than replacing earlier paint.
   const wet=clamp(1-s.age/12,.3,1);
   for(let y=previous;y<=s.tip+.1;y+=.6)this.coat(s.x,y,s.r,wet,s.dryAt);
   this.coat(s.x,s.tip,s.r*1.45,wet,s.dryAt);
   f.dirty=true;
  }
 }
 addHeight(height,finished=false){
  const f=this.field;
  for(const s of finished?this.settled:this.streams){
   if(s.tip-s.y<1)continue;
   const r=s.r,head=r*1.45,t=clamp((s.dryAt-f.time)/1.25),fresh=t*t*(3-2*t);
   for(let y=Math.max(0,Math.floor(s.y-r));y<Math.min(f.h,Math.ceil(s.tip+head));y++)for(let x=Math.max(0,Math.floor(s.x-head));x<Math.min(f.w,Math.ceil(s.x+head));x++){
    const i=y*f.w+x;if(!f.mask[i]||f.cover[i]<.1)continue;
    const dx=x-s.x,dy=y-s.tip,bulb=Math.max(0,1-(dx*dx+dy*dy)/(head*head));
    const neck=Math.max(0,1-dx*dx/(r*r)),taper=clamp((y-s.y)/7)*clamp((s.tip+2-y)/4);
    height[i]+=Math.max(Math.sqrt(bulb)*2.1,Math.sqrt(neck)*taper*1.65)*fresh;
   }
  }
 }
 settle(){this.streams=[];this.settled=[];}
 get state(){return{streams:this.streams.length,longest:this.streams.reduce((n,s)=>Math.max(n,s.tip-s.y),0),settled:this.settled.length};}
}
