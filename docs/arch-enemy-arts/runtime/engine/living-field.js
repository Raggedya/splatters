import {LiquidField} from './liquid-field.js';
import {contain} from './living-layout.js';
import {paletteForRevision} from './artwork-palette.js';
import {PaintField} from '../vendor/splat-v9/paint.js';
import {MaterialCache} from './material-cache.js';
function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function environment(original,w,h,key,layout=contain){
 const sample=surface(180,Math.round(180*original.naturalHeight/original.naturalWidth)),sg=sample.getContext('2d',{willReadFrequently:true});sg.drawImage(original,0,0,sample.width,sample.height);
 const palette=paletteForRevision(key,sg.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height);
 const c=surface(640,Math.round(640*h/w)),g=c.getContext('2d'),box=layout(original.naturalWidth,original.naturalHeight,c.width,c.height);
 g.fillStyle=layout===contain?'#f4f2ef':'#fff';g.fillRect(0,0,c.width,c.height);
 if(layout===contain){const wash=g.createLinearGradient(0,0,c.width,c.height);wash.addColorStop(0,`rgba(${palette[0].join(',')},.12)`);wash.addColorStop(1,`rgba(${(palette[1]||palette[0]).join(',')},.08)`);g.fillStyle=wash;g.fillRect(0,0,c.width,c.height);}g.drawImage(original,box.x,box.y,box.w,box.h);
 Object.defineProperties(c,{naturalWidth:{value:c.width},naturalHeight:{value:c.height}});return{image:c,palette};
}
export class LivingField extends LiquidField{
 constructor(original,{key,w,h,random=Math.random,layout=contain}){
  const env=environment(original,w,h,key,layout);super(env.image,{key:key+':environment:'+w+'/'+h,random});this.original=original;this.artworkRevision=key;this.palette=env.palette;this.layout=layout;
  this.fit=layout(original.naturalWidth,original.naturalHeight,this.w,this.h);
  const mask=surface(this.surface.width,this.surface.height),g=mask.getContext('2d',{willReadFrequently:true}),b=layout(original.naturalWidth,original.naturalHeight,mask.width,mask.height);g.drawImage(original,b.x,b.y,b.w,b.h);
  const data=g.getImageData(0,0,mask.width,mask.height).data;this.coverageWeights=new Uint8Array(data.length/4);this.sourceArea=0;
  this.coverageIndices=[];for(let i=0;i<this.coverageWeights.length;i++){this.coverageWeights[i]=data[i*4+3];this.sourceArea+=data[i*4+3];if(data[i*4+3])this.coverageIndices.push(i);}mask.width=mask.height=0;this.measureSource();
  const cache=new MaterialCache(this.material),originalRender=this.material.render;
  // Coverage only grows during a session. Entirely untouched rows have exactly
  // zero RGBA, so they need no pixel shading. Rebuild creates a fresh zero buffer.
  this.material.render=function(finished=false){if(finished)return originalRender.call(this,true);const f=this.field;let first=f.h,last=-1;for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(f.cover[y*f.w+x]>0){first=Math.min(first,y);last=Math.max(last,y);break;}
   return cache.render(this,{firstRow:last<0?0:Math.max(0,Math.floor((first-1)*cache.h/f.h)),lastRow:last<0?0:Math.min(cache.h,Math.ceil((last+2)*cache.h/f.h))});};
 }
 measureSource(){if(!this.coverageWeights)return;let alpha=0;const pixels=this.material.pixels.data;for(const i of this.coverageIndices)alpha+=pixels[i*4+3]*this.coverageWeights[i]/255;this.visibleCoverage=this.complete?1:this.sourceArea?alpha/this.sourceArea:0;}
 // Avoid measuring the full environmental image and then measuring it again.
 // Identical V9 material draw; only the coverage denominator is artwork-specific.
 updateSurface(){const changed=this.dirty;PaintField.prototype.updateSurface.call(this);if(changed)this.measureSource();}
 drawClean(g,w,h){g.drawImage(this.image,0,0,w,h);const b=this.layout(this.original.naturalWidth,this.original.naturalHeight,w,h);g.drawImage(this.original,b.x,b.y,b.w,b.h);}
 rebuild(w,h){
  const next=new LivingField(this.original,{key:this.artworkRevision,w,h,random:this.random,layout:this.layout}),old=this.fit,fit=next.fit;
  for(let y=0;y<next.h;y++)for(let x=0;x<next.w;x++){
   const ox=Math.round(old.x+(x-fit.x)/fit.w*old.w),oy=Math.round(old.y+(y-fit.y)/fit.h*old.h);
   if(ox<0||oy<0||ox>=this.w||oy>=this.h)continue;const from=oy*this.w+ox,to=y*next.w+x;
   for(const key of ['cover','mass','wet','dryAt'])next[key][to]=this[key][from];
  }
  const sx=fit.w/old.w,sy=fit.h/old.h,position=p=>({...p,x:fit.x+(p.x-old.x)*sx,y:fit.y+(p.y-old.y)*sy});
  next.running.streams=this.running.streams.map(s=>({...position(s),start:fit.y+(s.start-old.y)*sy,tip:fit.y+(s.tip-old.y)*sy,r:s.r*sx,available:s.available*sy,speed:s.speed*sy}));
  for(const key of ['assisted','coverageBeforeAssist','assistAge','finishingAssist','complete','settleTime','settleDuration','time','filled'])next[key]=this[key];
  // Replay only the existing bounded transient shape data, not new impacts.
  next.effects=this.effects.map(e=>({...position(e),r:e.r*sx,samples:e.samples.map(({i,d})=>{const p=position({x:i%this.w,y:Math.floor(i/this.w)}),x=Math.floor(p.x),y=Math.floor(p.y);return{i:y*next.w+x,d,inside:x>=0&&x<next.w&&y>=0&&y<next.h};}).filter(p=>p.inside)}));
  next.dirty=true;next.updateSurface();if(this.complete&&this.settleTime<this.settleDuration){next.captureSettling();next.settleTime=this.settleTime;}next.visibleCoverage=this.visibleCoverage;return next;
 }
 dispose(){const environment=this.image;super.dispose();if(environment)environment.width=environment.height=0;this.coverageWeights=null;this.coverageIndices=null;this.original=null;}
}
