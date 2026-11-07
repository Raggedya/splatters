// Gate B.2: one-shot relief shading. No animation, physics or colour changes.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
export function paintStudy(source,relief,field,complete,w,h){
 const scale=w/644,n=w*h,colour=canvas(w,h),cg=colour.getContext('2d',{willReadFrequently:true});
 cg.drawImage(source,0,0,w,h);const original=cg.getImageData(0,0,w,h),pixels=cg.getImageData(0,0,w,h);
 const texture=canvas(w,h),tg=texture.getContext('2d');tg.filter='blur('+2.2*scale+'px)';tg.drawImage(relief,0,0,w,h);const tex=tg.getImageData(0,0,w,h).data;
 const mask=new Float32Array(n),height=new Float32Array(n),distance=new Float32Array(n),lighting=canvas(w,h),lg=lighting.getContext('2d'),lit=lg.createImageData(w,h);
 function sample(a,x,y){const fx=clamp(x/(w-1))*(field.w-1),fy=clamp(y/(h-1))*(field.h-1),ix=Math.floor(fx),iy=Math.floor(fy),jx=Math.min(field.w-1,ix+1),jy=Math.min(field.h-1,iy+1),u=fx-ix,v=fy-iy;return (a[iy*field.w+ix]*(1-u)+a[iy*field.w+jx]*u)*(1-v)+(a[jy*field.w+ix]*(1-u)+a[jy*field.w+jx]*u)*v;}
 let coverage=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,j=i*4,a=complete?1:smooth(sample(field.cover,x,y)*3.5);mask[i]=a;coverage+=a;pixels.data[j+3]=Math.round(original.data[j+3]*a);distance[i]=a>.5?1e4:0;}
 cg.putImageData(pixels,0,0);
 // Distance produces rounded paint edges and tubular narrow runs without changing the reveal mask.
 if(!complete){
  for(let y=1;y<h;y++)for(let x=1;x<w-1;x++){const i=y*w+x;distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-w]+1,distance[i-w-1]+1.414,distance[i-w+1]+1.414);}
  for(let y=h-2;y>=0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+w]+1,distance[i+w+1]+1.414,distance[i+w-1]+1.414);}
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,a=mask[i],grain=tex[i*4]/255;
  if(complete)height[i]=(grain-.5)*52*scale;
  else{const d=(distance[i]+a*.6)/scale,mass=sample(field.mass,x,y),round=Math.sqrt(Math.max(0,1-Math.exp(-d/3.7)));
   height[i]=a*(round*(6.4+Math.min(1.5,mass)*2.2)+(grain-.5)*26*round)*scale;
  }
 }
 let specPixels=0,maxAlpha=0,alphaSum=0,shadowPixels=0;
 const at=(x,y)=>height[Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x)))];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,j=i*4,a=mask[i];
  let nx=(height[i-1]-height[i+1])*.5,ny=(height[i-w]-height[i+w])*.5;const inv=1/Math.sqrt(nx*nx+ny*ny+1);nx*=inv;ny*=inv;const nz=inv;
  // Narrow studio softbox reflection and soft shoulder, plus restrained right rim.
  const dot=Math.max(0,nx*-.30+ny*-.38+nz*.875),side=Math.max(0,nx*.48+ny*-.18+nz*.858);
  let spec=(Math.pow(dot,70)*1.1+Math.pow(dot,18)*.24+Math.pow(side,90)*.20)*a;
  spec*=Math.min(1,Math.hypot(nx,ny)*5);
  // Short height-field rays cast contact shadows down-right of raised edges.
  let occlusion=0;
  if(!complete)for(let k=1;k<=9;k++){const t=k*scale,block=at(x-t*.72,y-t*.9)-height[i]-t*.8;occlusion=Math.max(occlusion,clamp(block/(1.8*scale))*(1-k/12));}
  let shadow=Math.max(0,-nx*.5-ny*.65)*.20*a+occlusion*.24;
  if(complete){
   // Keep high-contrast lettering and fine ink boundaries readable.
   let edge=0;for(let k=0;k<3;k++)edge=Math.max(edge,Math.abs(original.data[j-4+k]-original.data[j+4+k]),Math.abs(original.data[j-w*4+k]-original.data[j+w*4+k]));
   spec*=1-.7*clamp(edge/100);shadow*=.5;
  }
  const value=spec>shadow?255:8,strength=spec>shadow?Math.min(complete?.42:.78,spec):Math.min(.28,shadow),alpha=Math.round(strength*255);
  lit.data[j]=lit.data[j+1]=lit.data[j+2]=value;lit.data[j+3]=alpha;
  if(value===255&&alpha>12)specPixels++;if(value===8&&alpha>12)shadowPixels++;maxAlpha=Math.max(maxAlpha,alpha);alphaSum+=alpha;
 }
 lg.putImageData(lit,0,0);
 return {colour,lighting,coverage:coverage/n,stats:{maxLightingAlpha:maxAlpha/255,meanLightingAlpha:alphaSum/(n*255),specularPixelFraction:specPixels/n,shadowPixelFraction:shadowPixels/n,sourceColourUnfiltered:true,materialVersion:'B.2 rounded meniscus / local self-shadow',maskPreserved:true}};
}

