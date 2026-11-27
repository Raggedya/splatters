import {RunningPaint} from './running-paint.js';
import {WetMaterial} from './wet-material.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class PaintField{
 constructor(image,{minimumPops=4,completionThreshold=.955,lighting=null}={}){
  this.minimumPops=minimumPops;this.completionThreshold=completionThreshold;this.lighting=lighting;
  this.image=image;this.w=180;this.h=Math.round(this.w*image.naturalHeight/image.naturalWidth);this.n=this.w*this.h;
  this.maskCanvas=document.createElement('canvas');this.maskCanvas.width=image.naturalWidth;this.maskCanvas.height=image.naturalHeight;this.maskCanvas.getContext('2d').drawImage(image,0,0);
  const c=document.createElement('canvas');c.width=this.w;c.height=this.h;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,this.w,this.h);this.source=g.getImageData(0,0,this.w,this.h).data;
  this.mask=new Uint8Array(this.n);this.alpha=new Float32Array(this.n);this.area=0;
  for(let i=0;i<this.n;i++){this.alpha[i]=this.source[i*4+3]/255;this.mask[i]=this.alpha[i]>.12?1:0;this.area+=this.mask[i]}
  this.cover=new Float32Array(this.n);this.mass=new Float32Array(this.n);this.next=new Float32Array(this.n);this.wet=new Float32Array(this.n);this.settleAfter=5;this.dryAt=new Float64Array(this.n);this.nextDryAt=new Float64Array(this.n);
  this.surface=document.createElement('canvas');this.surface.width=540;this.surface.height=Math.round(540*this.h/this.w);this.surfaceG=this.surface.getContext('2d');
  this.finishSurface=document.createElement('canvas');this.finishSurface.width=image.naturalWidth;this.finishSurface.height=image.naturalHeight;this.running=new RunningPaint(this);
  this.settleSnapshot=document.createElement('canvas');this.settleSnapshot.width=image.naturalWidth;this.settleSnapshot.height=image.naturalHeight;this.settleMix=document.createElement('canvas');this.settleMix.width=image.naturalWidth;this.settleMix.height=image.naturalHeight;this.settleDuration=1.1;this.settleTime=this.settleDuration;const maskG=this.settleMix.getContext('2d');maskG.drawImage(image,0,0,this.settleMix.width,this.settleMix.height);this.settleAlpha=maskG.getImageData(0,0,this.settleMix.width,this.settleMix.height).data;maskG.clearRect(0,0,this.settleMix.width,this.settleMix.height);
  this.effects=[];this.material=new WetMaterial(this);this.reset();
 }
 reset(){this.settleTime=this.settleDuration;this.running.clear();this.buildFinish();this.cover.fill(0);this.mass.fill(0);this.wet.fill(0);this.dryAt.fill(0);this.nextDryAt.fill(0);this.effects=[];this.time=performance.now()/1000;this.filled=0;this.complete=false;this.finishing=0;this.dirty=true;this.updateSurface()}
 buildFinish(){
  const w=this.image.naturalWidth,h=this.image.naturalHeight,g=this.finishSurface.getContext('2d'),fresh=this.material.finish();
  // Source alpha stays verbatim: no sheen or settled bead can bridge a hole.
  g.putImageData(fresh,0,0);
  this.material.setFinish(this.finishSurface);
 }
 captureSettling(){
  const g=this.settleSnapshot.getContext('2d'),w=this.settleSnapshot.width,h=this.settleSnapshot.height;
  g.clearRect(0,0,w,h);g.drawImage(this.image,0,0,w,h);g.drawImage(this.surface,0,0,w,h);
  const pixels=g.getImageData(0,0,w,h);
  for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=this.settleAlpha[i];
  g.putImageData(pixels,0,0);
  this.settleDuration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:1.1;this.settleTime=0;
 }
 deposit(x,y,r=38){
  const effect={x,y,r,age:0,dryAt:this.time+this.settleAfter,seed:Math.random()*10,drops:Array.from({length:11},(_,i)=>({a:i/11*Math.PI*2+Math.random()*.3,v:.68+Math.random()*.42,s:2+Math.random()*2.4}))};
  // A dense contact patch arrives immediately, then squashes outward in 220 ms.
  // Expansion deposits real persistent pigment, rather than a decorative ring.
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const result=this.stamp(effect,r*(reduced?1:.5));if(result.touched){if(reduced){effect.age=.22;this.running.seed(x,y,r,effect.dryAt)}this.effects.push(effect);this.dirty=true;this.measure()}
  return result;
 }
 stamp(e,r){
  let changed=0,touched=0;const{x,y,seed}=e;
  for(let yy=Math.max(0,Math.floor(y-r*1.2));yy<Math.min(this.h,Math.ceil(y+r*1.2));yy++)for(let xx=Math.max(0,Math.floor(x-r*1.2));xx<Math.min(this.w,Math.ceil(x+r*1.2));xx++){
   const i=yy*this.w+xx;if(!this.mask[i])continue;const dx=xx-x,dy=yy-y,a=Math.atan2(dy,dx),radius=r*(1+.08*Math.sin(a*5+seed)+.045*Math.cos(a*9-seed)),d=Math.hypot(dx,dy)/radius;if(d>=1)continue;
   const gain=clamp((1-d)*22),before=this.cover[i];this.cover[i]=Math.max(before,gain);changed+=this.cover[i]-before;this.mass[i]=Math.max(this.mass[i],gain*(1.8+1.7*Math.sqrt(1-d*d)));this.wet[i]=1;this.dryAt[i]=Math.max(this.dryAt[i],e.dryAt);touched++;
  }
  return{changed:changed/this.area,touched};
 }
 measure(){let sum=0;for(let i=0;i<this.n;i++)if(this.mask[i])sum+=this.cover[i];this.filled=sum/this.area;return this.filled}
 move(from,to,amount){if(amount<=0)return;this.next[from]-=amount;this.next[to]+=amount;this.nextDryAt[to]=Math.max(this.nextDryAt[to],this.dryAt[from])}
 step(dt,pops,now=this.time+dt){
  if(this.complete){this.settleTime=Math.min(this.settleDuration,this.settleTime+dt);return}
  this.time=now;
  for(const e of this.effects){const previous=e.age;e.age+=dt;if(previous<.22){const t=clamp(e.age/.22),spread=1-(1-t)**3;this.stamp(e,e.r*(.5+.5*spread));for(const d of e.drops){const dist=e.r*d.v*spread;this.running.coat(e.x+Math.cos(d.a)*dist,e.y+Math.sin(d.a)*dist,d.s,.95,e.dryAt)}if(e.age>=.22)this.running.seed(e.x,e.y,e.r,e.dryAt)}}
  // Each splat keeps its own five-second deadline. Flow carries that deadline
  // with the paint; a later shot elsewhere cannot keep old blobs alive.
  for(let i=0;i<this.n;i++)if(this.dryAt[i]<=this.time&&(this.mass[i]||this.wet[i])){this.mass[i]=0;this.wet[i]=0;this.dirty=true}
  this.running.step(dt);let active=false;this.next.set(this.mass);this.nextDryAt.set(this.dryAt);
  for(let y=this.h-1;y>=0;y--)for(let x=0;x<this.w;x++){
   const i=y*this.w+x;if(!this.mask[i])continue;const m=this.mass[i];if(m<.012){this.wet[i]=Math.max(0,this.wet[i]-dt*.18);continue}active=true;
   const down=i+this.w;
   if(y<this.h-1&&this.mask[down]){const send=Math.min(m*.35,Math.max(0,m-this.mass[down]*.48)*dt*1.65*(.8+.2*Math.sin(x*.3)**2));this.move(i,down,send)}
   else for(const dir of [-1,1]){const j=i+dir;if(x+dir>=0&&x+dir<this.w&&this.mask[j]){const send=Math.max(0,m-this.mass[j]-.12)*dt*1.1;this.move(i,j,send)}}
   for(const dir of [-1,1]){const j=i+dir;if(x+dir>=0&&x+dir<this.w&&this.mask[j]){const send=Math.max(0,m-this.mass[j]-.55)*dt*.65;this.move(i,j,send)}}
  }
  for(let i=0;i<this.n;i++)if(this.mask[i]){this.mass[i]=Math.max(0,this.next[i]*(1-dt*.035));if(this.mass[i]>.025){this.cover[i]=Math.max(this.cover[i],clamp(this.mass[i]*2.4));this.wet[i]=Math.max(this.wet[i],clamp(this.mass[i]*1.6))}this.wet[i]=Math.max(0,this.wet[i]-dt*.04)}
  this.dryAt.set(this.nextDryAt);this.effects=this.effects.filter(e=>e.age<.65);
  if(active||this.effects.length)this.dirty=true;
  if(active||this.effects.length||this.finishing)this.measure();
  if(!this.complete&&pops>=this.minimumPops&&this.filled>=this.completionThreshold)this.finishing=this.finishing||.001;
  if(this.finishing&&!this.complete){this.finishing+=dt;for(let i=0;i<this.n;i++)if(this.mask[i])this.cover[i]=Math.min(1,this.cover[i]+dt*.65);this.measure();this.dirty=true;if(this.finishing>1.5){for(let i=0;i<this.n;i++)if(this.mask[i])this.cover[i]=1;this.captureSettling();this.complete=true;this.filled=1;this.mass.fill(0);this.wet.fill(0);this.effects=[];this.running.settle();this.buildFinish()}}
 }
 updateSurface(){
  if(!this.dirty)return;this.dirty=false;const g=this.surfaceG,w=this.surface.width,h=this.surface.height;
  if(this.complete){g.clearRect(0,0,w,h);g.drawImage(this.image,0,0,w,h);return}
  this.material.draw();
 }
 draw(g,box){
  if(this.complete){
   if(this.settleTime<this.settleDuration){
    const t=this.settleTime/this.settleDuration,ease=t*t*(3-2*t),mix=this.settleMix.getContext('2d'),w=this.settleMix.width,h=this.settleMix.height;
    mix.clearRect(0,0,w,h);mix.globalCompositeOperation='source-over';mix.globalAlpha=1-ease;mix.drawImage(this.settleSnapshot,0,0,w,h);
    // Add weighted premultiplied colours: unlike two source-over fades, this
    // keeps the fully painted interior opaque while its wet lighting settles.
    mix.globalCompositeOperation='lighter';mix.globalAlpha=ease;mix.drawImage(this.finishSurface,0,0,w,h);mix.globalAlpha=1;mix.globalCompositeOperation='source-over';
    g.drawImage(this.settleMix,box.x,box.y,box.w,box.h);
   }else g.drawImage(this.finishSurface,box.x,box.y,box.w,box.h);
   return;
  }
  // An unpainted target contributes no pixels at all: no ghost, outline, tile
  // or external shadow can disclose the invisible silhouette or its holes.
  g.drawImage(this.surface,box.x,box.y,box.w,box.h);
 }
 diagnostics(){let outside=0,wet=0;for(let i=0;i<this.n;i++){if(!this.mask[i]&&(this.cover[i]||this.mass[i]))outside++;if(this.wet[i]>.1)wet++}return{filled:this.filled,complete:this.complete,paintOutsideMask:outside,wetCells:wet,maskPixels:this.area,maskWidth:this.w,maskHeight:this.h,settling:this.complete&&this.settleTime<this.settleDuration,settleProgress:this.complete?(this.settleDuration?this.settleTime/this.settleDuration:1):0,running:this.running.state}}
}
