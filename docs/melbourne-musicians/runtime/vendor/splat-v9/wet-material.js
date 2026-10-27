// A small height field, lit as wet enamel. The supplied PNG remains the colour
// layer and final alpha; this renderer adds light, never reinterpreted artwork.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function litColours(image,lighting){
 if(!lighting)return image.data;
 const source=image.data,out=new Uint8ClampedArray(source),reflection=[224,240,248],w=image.width,h=image.height;
 for(let y=Math.floor((lighting.top||0)*h);y<h;y++)for(let x=0;x<w;x++){
  if(y/h<(lighting.top||0))continue;const j=(y*w+x)*4;if(!source[j+3])continue;
  const maximum=Math.max(source[j],source[j+1],source[j+2])/255,fill=(lighting.darkLift||0)*clamp((.86-maximum)/.86),exposure=lighting.exposure||1;
  const chroma=Math.max(source[j],source[j+1],source[j+2])-Math.min(source[j],source[j+1],source[j+2]),chromatic=chroma>12&&chroma/(maximum*255)>.25,gain=chromatic?Math.min(exposure*(1+fill*5),1/maximum):exposure;
  for(let k=0;k<3;k++)out[j+k]=clamp(chromatic?source[j+k]*gain:source[j+k]*exposure*(1-fill)+reflection[k]*fill,0,255);
 }
 return out;
}
function distanceToEdge(mask,w,h,out){
 for(let i=0;i<out.length;i++)out[i]=mask[i]?Math.min(i%w+1,w-i%w,Math.floor(i/w)+1,h-Math.floor(i/w),128):0;
 for(let y=1;y<h;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i])out[i]=Math.min(out[i],out[i-1]+1,out[i-w]+1,out[i-w-1]+1.414,out[i-w+1]+1.414)}
 for(let y=h-2;y>=0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;if(mask[i])out[i]=Math.min(out[i],out[i+1]+1,out[i+w]+1,out[i+w-1]+1.414,out[i+w+1]+1.414)}
}
export class WetMaterial{
 constructor(field){
  this.field=field;const n=field.n;
  this.edge=new Float32Array(n);this.height=new Float32Array(n);this.smooth=new Float32Array(n);this.nx=new Float32Array(n);this.ny=new Float32Array(n);this.visible=new Uint8Array(n);this.freshness=new Float32Array(n);
  this.native=document.createElement('canvas');this.native.width=field.image.naturalWidth;this.native.height=field.image.naturalHeight;const g=this.native.getContext('2d');g.drawImage(field.image,0,0);this.original=g.getImageData(0,0,this.native.width,this.native.height);
  this.pixels=field.surfaceG.createImageData(field.surface.width,field.surface.height);
  const source=document.createElement('canvas');source.width=field.surface.width;source.height=field.surface.height;const sg=source.getContext('2d');sg.drawImage(field.image,0,0,source.width,source.height);this.source=sg.getImageData(0,0,source.width,source.height);this.cleanCanvas=source;
  // Fixed fill lighting is prepared once, keeping the live paint loop lean.
  this.litOriginal=litColours(this.original,field.lighting);this.litSource=litColours(this.source,field.lighting);
 }
 setFinish(image){const c=this.cleanCanvas,g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(image,0,0,c.width,c.height);this.clean=g.getImageData(0,0,c.width,c.height).data}
 shape(finished=false){
  const f=this.field,w=f.w,h=f.h,height=this.height,smooth=this.smooth;
  for(let i=0;i<f.n;i++){this.visible[i]=f.mask[i]&&(finished||f.cover[i]>.18)?1:0;const t=finished?0:clamp((f.dryAt[i]-f.time)/1.25);this.freshness[i]=t*t*(3-2*t)}
  distanceToEdge(this.visible,w,h,this.edge);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x;if(!this.visible[i]){height[i]=0;continue}
   // The rounded meniscus makes the coat physically substantial at every
   // boundary, including the genuine gaps in the club monogram.
   const bevel=Math.sqrt(clamp(this.edge[i]/3.6)),mass=finished?0:Math.min(5,f.mass[i]);
   height[i]=bevel*(1.25+this.freshness[i]*(Math.sqrt(mass)*1.5+(finished?0:.07*Math.sin(x*.11+y*.04)*Math.sin(y*.13))));
  }
  if(!finished)f.running.addHeight(height);
  // A small separable smoothing pass removes grid ridges without blurring the
  // paint's opacity or the source artwork. It only softens the surface normals.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;smooth[i]=(height[i]*6+(x?height[i-1]:0)+(x<w-1?height[i+1]:0))/8}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;height[i]=(smooth[i]*6+(y?smooth[i-w]:0)+(y<h-1?smooth[i+w]:0))/8}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x;this.nx[i]=((x?height[i-1]:0)-(x<w-1?height[i+1]:0))*.92;this.ny[i]=((y?height[i-w]:0)-(y<h-1?height[i+w]:0))*.92;
  }
 }
 render(finished=false){
  const f=this.field,w=finished?this.native.width:f.surface.width,h=finished?this.native.height:f.surface.height,base=finished?this.original:this.source;
  const output=finished?new ImageData(w,h):this.pixels,p=output.data,b=base.data,colours=finished?this.litOriginal:this.litSource,fw=f.w,fh=f.h,nx=this.nx,ny=this.ny,reflection=[224,240,248];
  for(let y=0;y<h;y++){
   const fy=clamp((y+.5)/h*fh-.5,0,fh-1.001),iy=Math.floor(fy),ty=fy-iy;
   for(let x=0;x<w;x++){
    const j=(y*w+x)*4;if(!b[j+3]){p[j]=p[j+1]=p[j+2]=p[j+3]=0;continue}
    const fx=clamp((x+.5)/w*fw-.5,0,fw-1.001),ix=Math.floor(fx),tx=fx-ix,i=iy*fw+ix;
    const a=(1-tx)*(1-ty),c=tx*(1-ty),d=(1-tx)*ty,e=tx*ty;
    const coverage=finished?1:f.cover[i]*a+f.cover[i+1]*c+f.cover[i+fw]*d+f.cover[i+fw+1]*e;
    // Opaque pigment with a narrow anti-aliased wet edge, not a cloudy reveal.
    let opacity=finished?1:clamp((coverage-.1)*3);opacity=opacity*opacity*(3-2*opacity);p[j+3]=Math.round(b[j+3]*opacity);if(!p[j+3]){p[j]=p[j+1]=p[j+2]=0;continue}
    let vx=nx[i]*a+nx[i+1]*c+nx[i+fw]*d+nx[i+fw+1]*e,vy=ny[i]*a+ny[i+1]*c+ny[i+fw]*d+ny[i+fw+1]*e;
    const norm=1/Math.sqrt(vx*vx+vy*vy+1);vx*=norm;vy*=norm;const vz=norm;
    const diffuse=clamp(-vx*.38-vy*.55+vz*.75),white=b[j]>230&&b[j+1]>230&&b[j+2]>230,shade=white?(finished?.78+diffuse*.22:.77+diffuse*.23):(finished?1:clamp(.59+diffuse*.55,.59,1.04));
    let primary=clamp(-vx*.36-vy*.2+vz*.91),secondary=clamp(vx*.44-vy*.12+vz*.89);
    const broad=primary**12;primary*=primary;primary*=primary;primary*=primary;primary*=primary;primary*=primary;primary*=primary;
    secondary*=secondary;secondary*=secondary;secondary*=secondary;secondary*=secondary;secondary*=secondary;secondary*=secondary;
    // Wide, cool softbox reflection with a crisp white core and a much quieter
    // opposite reflection. Curvature bends the light around pools and bulbs.
    const specular=primary*.83+broad*.18+secondary*.16;
    // A clean, continuous softbox reflection gives white enamel a polished
    // finish without preserving any impact-shaped ridges or frozen blobs.
    const finishBand=finished&&white?Math.exp(-(((x/w*.84+y/h*.54-.55)/.065)**2))*.82:0;
    const light=finished?(white?clamp(specular*.75+finishBand,0,.95):clamp((specular-.12)*.85,0,.65)):clamp(specular,0,.9);
    const fresh=finished?1:this.freshness[i]*a+this.freshness[i+1]*c+this.freshness[i+fw]*d+this.freshness[i+fw+1]*e;
    for(let k=0;k<3;k++){const wet=clamp(colours[j+k]*shade*(1-light)+(white?255:reflection[k])*light,0,255);p[j+k]=Math.round(finished?wet:wet*fresh+this.clean[j+k]*(1-fresh))}
   }
  }
  return output;
 }
 draw(){this.shape();this.field.surfaceG.putImageData(this.render(),0,0)}
 finish(){this.shape(true);return this.render(true)}
}
