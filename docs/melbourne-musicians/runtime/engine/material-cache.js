// Local optimisation adapter for Splat V9 WetMaterial.render(false).
// Vendor modules, shape/lighting equations, resolution and buffers are unchanged.
// Cache immutable sampling coordinates/white classification; skip lighting only
// when its exact contribution is zero. Interpolation and blend ordering match
// V9; the same integer power uses multiplication, validated at RGBA output.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const reflection=[224,240,248];
export class MaterialCache {
 constructor(material){
  const f=material.field;this.w=f.surface.width;this.h=f.surface.height;this.fw=f.w;this.fh=f.h;
  this.x=new Int32Array(this.w);this.tx=new Float64Array(this.w);this.y=new Int32Array(this.h);this.ty=new Float64Array(this.h);
  this.white=new Uint8Array(this.w*this.h);
  for(let x=0;x<this.w;x++){const fx=clamp((x+.5)/this.w*f.w-.5,0,f.w-1.001),ix=Math.floor(fx);this.x[x]=ix;this.tx[x]=fx-ix;}
  for(let y=0;y<this.h;y++){const fy=clamp((y+.5)/this.h*f.h-.5,0,f.h-1.001),iy=Math.floor(fy);this.y[y]=iy;this.ty[y]=fy-iy;}
  const b=material.source.data;for(let j=0;j<b.length;j+=4)this.white[j/4]=b[j]>230&&b[j+1]>230&&b[j+2]>230?1:0;
  this.bytes=this.x.byteLength+this.tx.byteLength+this.y.byteLength+this.ty.byteLength+this.white.byteLength;
 }
 matches(material){const f=material.field;return f.surface.width===this.w&&f.surface.height===this.h&&f.w===this.fw&&f.h===this.fh;}
 render(m,{firstRow=0,lastRow=this.h}={}){
  const f=m.field,w=this.w,h=this.h,fw=this.fw,output=m.pixels,p=output.data,b=m.source.data,colours=m.litSource,nx=m.nx,ny=m.ny;
  for(let y=firstRow;y<lastRow;y++){
   const row=this.y[y]*fw,ty=this.ty[y];
   for(let x=0;x<w;x++){
    const j=(y*w+x)*4;if(!b[j+3]){p[j]=p[j+1]=p[j+2]=p[j+3]=0;continue;}
    const tx=this.tx[x],i=row+this.x[x],a=(1-tx)*(1-ty),c=tx*(1-ty),d=(1-tx)*ty,e=tx*ty;
    const coverage=f.cover[i]*a+f.cover[i+1]*c+f.cover[i+fw]*d+f.cover[i+fw+1]*e;
    let opacity=clamp((coverage-.1)*3);opacity=opacity*opacity*(3-2*opacity);p[j+3]=Math.round(b[j+3]*opacity);if(!p[j+3]){p[j]=p[j+1]=p[j+2]=0;continue;}
    const fresh=m.freshness[i]*a+m.freshness[i+1]*c+m.freshness[i+fw]*d+m.freshness[i+fw+1]*e;
    // In V9's wet*fresh + clean*(1-fresh), exact zero contributes no wet light.
    if(fresh===0){p[j]=m.clean[j];p[j+1]=m.clean[j+1];p[j+2]=m.clean[j+2];continue;}
    let vx=nx[i]*a+nx[i+1]*c+nx[i+fw]*d+nx[i+fw+1]*e,vy=ny[i]*a+ny[i+1]*c+ny[i+fw]*d+ny[i+fw+1]*e;
    const norm=1/Math.sqrt(vx*vx+vy*vy+1);vx*=norm;vy*=norm;const vz=norm;
    const diffuse=clamp(-vx*.38-vy*.55+vz*.75),white=this.white[j/4],shade=white?.77+diffuse*.23:clamp(.59+diffuse*.55,.59,1.04);
    let primary=clamp(-vx*.36-vy*.2+vz*.91),secondary=clamp(vx*.44-vy*.12+vz*.89);
    // Same twelfth-power reflection, using integer-power multiplication instead
    // of the generic pow path inside every visible pixel. Channel parity is
    // checked against the original renderer (including white/alpha fixtures).
    const squared=primary*primary,fourth=squared*squared,broad=fourth*fourth*fourth;
    primary=squared;primary*=primary;primary*=primary;primary*=primary;primary*=primary;primary*=primary;
    secondary*=secondary;secondary*=secondary;secondary*=secondary;secondary*=secondary;secondary*=secondary;secondary*=secondary;
    const specular=primary*.83+broad*.18+secondary*.16,light=clamp(specular,0,.9);
    for(let k=0;k<3;k++){const wet=clamp(colours[j+k]*shade*(1-light)+(white?255:reflection[k])*light,0,255);p[j+k]=Math.round(wet*fresh+m.clean[j+k]*(1-fresh));}
   }
  }
  return output;
 }
}
export function installMaterialCache(material){
 const original=material.render;let cache=new MaterialCache(material);
 material.render=function(finished=false){
  if(finished)return original.call(this,finished);
  if(!cache.matches(this))cache=new MaterialCache(this);
  return cache.render(this);
 };
 return cache.bytes;
}
