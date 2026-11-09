import {ArtworkField} from './artwork-field.js';
import {RunningPaint} from '../vendor/splat-v9/running-paint.js';
import {liquidShape,liquidDistance} from './liquid-shape.js';
import {paletteForRevision,impactColours} from './artwork-palette.js';
const clamp=v=>Math.max(0,Math.min(1,v));
class LiquidRuns extends RunningPaint {
 seed(x,y,r,dryAt){
  const f=this.field,random=f.random,candidates=[];
  for(let n=0;n<14;n++){
   const cx=x+(random()-.5)*r*1.5,cy=y+r*(.25+random()*.4),radius=.65+random()*.9;
   if(!this.inside(cx,cy,radius+1))continue;
   candidates.push({x:cx,y:cy,start:cy,tip:cy,r:radius,available:Math.min(f.h-cy-2,25+random()*95),dryAt,age:0,speed:17+random()*17,colours:f.lastColours,phase:random()*6.28});
  }
  const count=1+Math.floor(random()*3),chosen=[];
  for(const s of candidates)if(chosen.length<count&&chosen.every(p=>Math.abs(p.x-s.x)>5))chosen.push(s);
  this.streams.push(...chosen);if(this.streams.length>24)this.streams.splice(0,this.streams.length-24);
 }
 step(dt){
  const f=this.field;this.streams=this.streams.filter(s=>s.dryAt>f.time);
  for(const s of this.streams){s.age+=dt;if(s.stopped)continue;const old=s.tip;
   const velocity=s.speed*(1-Math.exp(-s.age*5))/(1+s.age*.05),next=Math.min(s.start+s.available,s.tip+velocity*dt);
   if(!this.inside(s.x,next,s.r+1)){s.stopped=true;continue;}
   s.tip=next;
   for(let y=old;y<=s.tip;y+=.6){const radius=s.r*(.68+.25*Math.sin(y*.14+s.phase));super.coat(s.x,y,radius,.85,s.dryAt);f.tint(s.x,y,radius+1,s.colours);}
   super.coat(s.x,s.tip,s.r*1.15,.95,s.dryAt);
   if(!s.branched&&s.age>1.3&&s.r>1.2&&this.streams.length<24){s.branched=true;this.streams.push({...s,x:s.x+2.3,y:s.tip,start:s.tip,tip:s.tip,r:s.r*.6,available:18,age:0,speed:s.speed*.7,branched:true});}
   if(s.tip>=s.start+s.available-.1)s.stopped=true;f.dirty=true;
  }
 }
 // Keep the vendor's wet-height pipeline; narrower radius produces fine rivulets.
}
export class LiquidField extends ArtworkField {
 constructor(image,{key='fixture',random=Math.random}={}){
  super(image);this.random=random;this.running=new LiquidRuns(this);
  this.geometryCosts=[];this.tintCosts=[];this.paletteCost=0;
  const start=performance.now();this.palette=paletteForRevision(key,this.source,this.w,this.h);this.paletteCost=performance.now()-start;
  this.material.litSource=new Uint8ClampedArray(this.material.litSource);this.lastColours=this.palette.slice(0,1);
  this.tintScratch=Array.from({length:4},()=>new Float64Array(this.surface.width));
  // A thinner liquid meniscus, still using the original full-detail wet shader.
  const shape=this.material.shape;this.material.shape=function(...args){shape.apply(this,args);for(let i=0;i<this.nx.length;i++){this.nx[i]*=.68;this.ny[i]*=.68;}};
 }
 tint(x,y,r,colours){
  if(!colours?.length)return;const m=this.material,sw=this.surface.width,sh=this.surface.height,sx=sw/this.w,sy=sh/this.h,p=m.litSource,source=m.source.data;
  const left=Math.max(0,Math.floor((x-r)*sx)),right=Math.min(sw,Math.ceil((x+r)*sx)),top=Math.max(0,Math.floor((y-r)*sy)),bottom=Math.min(sh,Math.ceil((y+r)*sy));
  const [sinA,cosA,sinB,cosB]=this.tintScratch;
  for(let xx=left;xx<right;xx++){const dx=xx/sx-x;sinA[xx]=Math.sin(dx*.09);cosA[xx]=Math.cos(dx*.09);sinB[xx]=Math.sin(dx*.17);cosB[xx]=Math.cos(dx*.17);}
  for(let yy=top;yy<bottom;yy++){const dy=yy/sy-y,sa=Math.sin(dy*.045),ca=Math.cos(dy*.045),sb=Math.sin(-dy*.11),cb=Math.cos(-dy*.11);for(let xx=left;xx<right;xx++){
   const j=(yy*sw+xx)*4,dx=xx/sx-x,dy=yy/sy-y;if(dx*dx+dy*dy>r*r)continue;
   const blend=colours.length>1?clamp(.5+.5*(sinA[xx]*ca+cosA[xx]*sa)):0,accent=colours.length>2?Math.max(0,sinB[xx]*cb+cosB[xx]*sb-.75)*.35:0;
   for(let k=0;k<3;k++){let pigment=colours[0][k]*(1-blend)+(colours[1]||colours[0])[k]*blend;if(accent)pigment=pigment*(1-accent)+colours[2][k]*accent;p[j+k]=source[j+k]*.48+pigment*.52;}
  }}
 }
 deposit(x,y,r=38){
  const began=performance.now(),shape=liquidShape(this.random),colours=impactColours(this.palette,this.source,this.w,this.h,x,y,r,this.random);
  this.lastColours=colours;const e={x,y,r,shape,age:0,dryAt:this.time+this.settleAfter,seed:0,drops:shape.drops,samples:[]};
  // Cache each silhouette once. Expansion reads scalar distances, not trigonometry.
  const extent=r*2.7;
  for(let yy=Math.max(0,Math.floor(y-extent));yy<Math.min(this.h,Math.ceil(y+extent));yy++)for(let xx=Math.max(0,Math.floor(x-extent));xx<Math.min(this.w,Math.ceil(x+extent));xx++){
   const i=yy*this.w+xx;if(!this.mask[i])continue;const d=liquidDistance(shape,(xx-x)/r,(yy-y)/r);if(d<1)e.samples.push({i,d});
  }
  this.geometryCosts.push(performance.now()-began);if(this.geometryCosts.length>100)this.geometryCosts.shift();
  const tintStart=performance.now();this.tint(x,y,extent,colours);this.tintCosts.push(performance.now()-tintStart);if(this.tintCosts.length>100)this.tintCosts.shift();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,result=this.stamp(e,r*(reduced?1:.5));
  if(result.touched){if(reduced){e.age=.22;this.running.seed(x,y,r,e.dryAt);}this.effects.push(e);this.dirty=true;this.measure();}
  this.lastGeometry={shape,colours,size:r,cells:e.samples.length};return result;
 }
 stamp(e,r){
  if(!e.samples)return super.stamp(e,r);const scale=r/e.r;let changed=0,touched=0;
  for(const {i,d}of e.samples){if(d>=scale)continue;const gain=clamp((1-d/scale)*22),before=this.cover[i];this.cover[i]=Math.max(before,gain);changed+=this.cover[i]-before;this.mass[i]=Math.max(this.mass[i],gain*(.65+.7*Math.sqrt(1-(d/scale)**2)));this.wet[i]=1;this.dryAt[i]=Math.max(this.dryAt[i],e.dryAt);touched++;}
  return{changed:changed/this.area,touched};
 }
}
