// Static manufacturer finishes. Uploaded pixels/files are never overwritten.
const cache=new WeakMap();
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
function silhouette(image,name){
 const scale=Math.min(1,768/Math.max(image?.naturalWidth||1,image?.naturalHeight||1));
 const w=Math.max(1,Math.round((image?.naturalWidth||1)*scale)),h=Math.max(1,Math.round((image?.naturalHeight||1)*scale));
 if(!image?.naturalWidth)return wordmark(name);
 const c=canvas(w,h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,w,h);
 let pixels;try{pixels=g.getImageData(0,0,w,h);}catch{return wordmark(name);}
 const d=pixels.data,border=[];
 for(let x=0;x<w;x++){border.push(x*4,((h-1)*w+x)*4);}
 for(let y=1;y<h-1;y++){border.push(y*w*4,(y*w+w-1)*4);}
 const transparent=border.filter(i=>d[i+3]<16).length/border.length;
 let method='alpha';
 if(transparent<.9){
  // Only remove a confidently uniform opaque background. Complex images use
  // a clean manufacturer wordmark instead of destructive guessed segmentation.
  const opaque=border.filter(i=>d[i+3]>245);
  if(opaque.length/border.length<.95)return wordmark(name);
  const buckets=new Map();
  for(const i of opaque){const key=[0,1,2].map(k=>Math.round(d[i+k]/16)).join(',');const bucket=buckets.get(key)||[];bucket.push(i);buckets.set(key,bucket);}
  const dominant=[...buckets.values()].sort((a,b)=>b.length-a.length)[0],sample=dominant[0];
  const cluster=opaque.filter(i=>Math.hypot(d[i]-d[sample],d[i+1]-d[sample+1],d[i+2]-d[sample+2])<22);
  if(cluster.length/opaque.length<.55)return wordmark(name);
  const bg=[0,1,2].map(k=>cluster.reduce((s,i)=>s+d[i+k],0)/cluster.length);
  const distance=i=>Math.hypot(d[i]-bg[0],d[i+1]-bg[1],d[i+2]-bg[2]);
  for(let i=0;i<d.length;i+=4)d[i+3]=Math.round(d[i+3]*Math.max(0,Math.min(1,(distance(i)-12)/45)));
  method='uniform-background';
 }
 let minX=w,minY=h,maxX=-1,maxY=-1,count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(d[i+3]>32){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++;}d[i]=d[i+1]=d[i+2]=255;}
 if(count<16||count/(w*h)>.85)return wordmark(name);
 g.putImageData(pixels,0,0);
 const result=canvas(maxX-minX+17,maxY-minY+17);
 result.getContext('2d').drawImage(c,minX,minY,maxX-minX+1,maxY-minY+1,8,8,maxX-minX+1,maxY-minY+1);
 return {mask:result,method};
}
function wordmark(name){
 const c=canvas(768,160),g=c.getContext('2d');g.fillStyle='#fff';g.font='600 66px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText(name||'ClearFire',384,80,730);return {mask:c,method:'wordmark-fallback'};
}
function finish(mask,brass,hero=false){
 const c=canvas(mask.width,mask.height),g=c.getContext('2d'),w=c.width,h=c.height;
 const a=mask.getContext('2d').getImageData(0,0,w,h).data;
 const metal=g.createImageData(w,h),d=metal.data;
 const alpha=(x,y)=>x<0||y<0||x>=w||y>=h?0:a[(y*w+x)*4+3]/255;
 const bevel=Math.max(1,Math.round(w/300));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,v=alpha(x,y);
  const light=(alpha(x+bevel,y+bevel)-alpha(x-bevel,y-bevel));
  const brushed=Math.sin(y*2.3)*1.3;
  const sheen=1-Math.abs(y/h-.32);
  const silver=190+Math.sin(y/h*Math.PI*2)*48-y/h*40;
  const base=hero?[silver,silver,silver+2]:brass?[125+sheen*47,88+sheen*39,43+sheen*27]:[45+sheen*34,46+sheen*32,46+sheen*28];
  for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,base[k]+light*(brass?75:[85,67,40][k])+brushed));
  d[i+3]=Math.round(v*255);
 }
 const face=canvas(w,h);face.getContext('2d').putImageData(metal,0,0);
 // The extrusion is baked once, not a filter/composite in the animation loop.
 g.shadowColor='#000';g.shadowBlur=bevel*2;g.shadowOffsetY=bevel*2;
 g.drawImage(mask,bevel,bevel*2);g.shadowColor='transparent';
 g.globalCompositeOperation='source-in';g.fillStyle='#080809';g.fillRect(0,0,w,h);
 g.globalCompositeOperation='source-over';g.drawImage(face,0,0);return c;
}
export function manufacturerMetal(image,name='ClearFire'){
 if(image&&cache.has(image))return cache.get(image);
 const {mask,method}=silhouette(image,name),result={steel:finish(mask,false),brass:finish(mask,true),hero:finish(mask,false,true),method};
 if(image)cache.set(image,result);return result;
}
export function firepitBadge(metal,name){
 const scene=document.querySelector('.scene');if(!scene)return;
 let badge=scene.querySelector('.clearfire-firepit-badge');
 if(!badge){badge=canvas(1,1);badge.className='clearfire-firepit-badge';badge.setAttribute('role','img');scene.append(badge);}
 badge.width=metal.brass.width;badge.height=metal.brass.height;badge.getContext('2d').drawImage(metal.brass,0,0);
 badge.setAttribute('aria-label',name+' manufacturer badge');badge.dataset.logoTreatment=metal.method;
}

export function manufacturerHero(metal,name){
 const scene=document.querySelector('.scene');if(!scene)return;
 let holder=scene.querySelector('.clearfire-hero-brand');
 if(!holder){holder=document.createElement('div');holder.className='clearfire-hero-brand';scene.append(holder);}
 let badge=holder.querySelector('canvas');if(!badge){badge=canvas(1,1);badge.setAttribute('role','img');holder.append(badge);}
 badge.width=metal.hero.width;badge.height=metal.hero.height;badge.getContext('2d').drawImage(metal.hero,0,0);
 badge.setAttribute('aria-label',name+' logo');badge.dataset.logoTreatment=metal.method;
}
