import {drawCover} from './c1-artwork.js';
// Incremental B.2-style height/normal lighting. Artwork RGB is never shaded here.
// Only changed field cells and their lighting halo are rebuilt; cached layers
// are composited at display resolution. No per-frame full-canvas ray tracing.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
export class LiveMaterial {
 constructor(source,relief,field,width,height){
  this.source=source;this.field=field;this.width=width;this.height=height;
  this.w=Math.min(384,width);this.h=Math.round(this.w*height/width);const n=this.w*this.h;
  this.colour=canvas(width,height);this.lighting=canvas(this.w,this.h);this.mask=canvas(this.w,this.h);
  this.alpha=new Float32Array(n);this.heightMap=new Float32Array(n);this.previousCover=new Float32Array(field.n).fill(-1);this.previousMass=new Float32Array(field.n);
  const tex=canvas(this.w,this.h),g=tex.getContext('2d',{willReadFrequently:true});g.filter='blur(1px)';g.drawImage(relief,0,0,this.w,this.h);this.texture=g.getImageData(0,0,this.w,this.h).data;
  this.original=canvas(this.w,this.h);const og=this.original.getContext('2d',{willReadFrequently:true});drawCover(og,source,this.w,this.h);this.pixels=og.getImageData(0,0,this.w,this.h).data;
  this.coverage=0;this.shadedPixels=0;
 }
 render(complete=false){const f=this.field,w=this.w,h=this.h;let left=f.w,top=f.h,right=-1,bottom=-1,sum=0;
  for(let i=0;i<f.n;i++){sum+=f.cover[i];if(f.cover[i]!==this.previousCover[i]||f.mass[i]!==this.previousMass[i]||complete!==this.complete){const x=i%f.w,y=Math.floor(i/f.w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);this.previousCover[i]=f.cover[i];this.previousMass[i]=f.mass[i];}}
  this.complete=complete;if(right<0)return this;
  left=Math.max(0,Math.floor((left-4)*w/f.w));right=Math.min(w,Math.ceil((right+5)*w/f.w));top=Math.max(0,Math.floor((top-4)*h/f.h));bottom=Math.min(h,Math.ceil((bottom+5)*h/f.h));
  const sample=(a,x,y)=>{const fx=clamp(x/(w-1))*(f.w-1),fy=clamp(y/(h-1))*(f.h-1),ix=Math.floor(fx),iy=Math.floor(fy),jx=Math.min(f.w-1,ix+1),jy=Math.min(f.h-1,iy+1),u=fx-ix,v=fy-iy;return(a[iy*f.w+ix]*(1-u)+a[iy*f.w+jx]*u)*(1-v)+(a[jy*f.w+ix]*(1-u)+a[jy*f.w+jx]*u)*v;};
  const rw=right-left,rh=bottom-top,mg=this.mask.getContext('2d'),lg=this.lighting.getContext('2d'),mask=mg.createImageData(rw,rh),light=lg.createImageData(rw,rh),scale=w/644;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const i=y*w+x,j=((y-top)*rw+x-left)*4,c=sample(f.cover,x,y),a=complete?1:smooth(c*2.5),mass=sample(f.mass,x,y),grain=this.texture[i*4]/255;
   this.alpha[i]=Math.round(a*255)/255;mask.data[j+3]=Math.round(a*255);
   this.heightMap[i]=complete?(grain-.5)*52*scale:a*(Math.sqrt(Math.max(0,c))*(6.4+Math.min(1.5,mass)*2.2)+(grain-.5)*22)*scale;
  }
  const at=(x,y)=>this.heightMap[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const i=y*w+x,j=((y-top)*rw+x-left)*4,a=this.alpha[i];
   let nx=(at(x-1,y)-at(x+1,y))*.5,ny=(at(x,y-1)-at(x,y+1))*.5,nz=1/Math.sqrt(nx*nx+ny*ny+1);nx*=nz;ny*=nz;
   const dot=Math.max(0,nx*-.30+ny*-.38+nz*.875),side=Math.max(0,nx*.48+ny*-.18+nz*.858);
   let spec=(Math.pow(dot,70)*1.1+Math.pow(dot,18)*.24+Math.pow(side,90)*.20)*a*Math.min(1,Math.hypot(nx,ny)*5);
   let shadow=Math.max(0,-nx*.5-ny*.65)*.2*a;
   if(!complete){for(let k=1;k<=3;k++)shadow=Math.max(shadow,clamp((at(x-k,y-k)-at(x,y)-k*.8)/(1.8*scale))*.18);}
   else{const k=i*4;let edge=0;if(x>0&&x<w-1&&y>0&&y<h-1)for(let c=0;c<3;c++)edge=Math.max(edge,Math.abs(this.pixels[k-4+c]-this.pixels[k+4+c]),Math.abs(this.pixels[k-w*4+c]-this.pixels[k+w*4+c]));spec*=1-.7*clamp(edge/100);shadow*=.5;}
   const white=spec>shadow;light.data[j]=light.data[j+1]=light.data[j+2]=white?255:8;light.data[j+3]=Math.round(255*(white?Math.min(complete?.28:.72,spec):Math.min(.24,shadow)));
  }
  this.coverage=this.alpha.reduce((a,b)=>a+b,0)/(w*h);mg.putImageData(mask,left,top);lg.putImageData(light,left,top);this.shadedPixels=rw*rh;
  // Composite the cached mask as one GPU draw. Fractional dirty-rectangle clips
  // can leave one-pixel RGB seams after repeated destination-in operations.
  const g=this.colour.getContext('2d');g.clearRect(0,0,this.width,this.height);drawCover(g,this.source,this.width,this.height);g.globalCompositeOperation='destination-in';g.drawImage(this.mask,0,0,this.width,this.height);g.globalCompositeOperation='source-over';return this;
 }
}
