const clamp=(v,a=0,b=255)=>Math.max(a,Math.min(b,v));
export const FALLBACK=Object.freeze([[28,102,142],[29,157,162],[196,151,64],[113,71,139],[193,92,112],[64,116,91]].map(Object.freeze));
const cache=new Map();
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export function lab(rgb){const [r,g,b]=rgb.map(linear),l=Math.cbrt(.41222147*r+.53633254*g+.05144599*b),m=Math.cbrt(.2119035*r+.68069955*g+.10739696*b),s=Math.cbrt(.08830246*r+.28171884*g+.6299787*b);return[.21045426*l+.79361779*m-.00407205*s,1.9779985*l-2.4285922*m+.4505937*s,.02590404*l+.78277177*m-.80867577*s];}
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
export function extractPalette(data,w,h){
 if(!data||data.length<w*h*4||!w||!h)return FALLBACK.map(c=>[...c]);
 const bins=new Map(),stride=Math.max(1,Math.ceil(w*h/10000));
 for(let i=0;i<w*h;i+=stride){const j=i*4;if(data[j+3]<32)continue;const rgb=[data[j],data[j+1],data[j+2]],v=Math.max(...rgb),low=Math.min(...rgb);if(v<24||low>238)continue;
  const key=rgb.map(c=>c>>5).join(','),bin=bins.get(key)||{sum:[0,0,0],n:0};for(let k=0;k<3;k++)bin.sum[k]+=rgb[k];bin.n++;bins.set(key,bin);
 }
 const choices=[...bins.values()].map(b=>{const rgb=b.sum.map(c=>Math.round(c/b.n));return{rgb,n:b.n,lab:lab(rgb)};});
 if(!choices.length)return FALLBACK.map(c=>[...c]);
 choices.sort((a,b)=>b.n-a.n);const chosen=[choices.shift()];
 while(choices.length&&chosen.length<6){let best=0,score=-1;for(let i=0;i<choices.length;i++){const c=choices[i],d=Math.min(...chosen.map(p=>distance(p.lab,c.lab))),s=d*Math.sqrt(c.n);if(s>score){score=s;best=i;}}chosen.push(choices.splice(best,1)[0]);}
 return chosen.map(c=>c.rgb);
}
export function paletteForRevision(key,data,w,h){
 if(cache.has(key))return cache.get(key);
 let colours;try{colours=extractPalette(data,w,h);}catch{colours=FALLBACK.map(c=>[...c]);}
 if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,colours);return colours;
}
export function impactColours(palette,data,w,h,x,y,r,random=Math.random){
 let local=null,sum=[0,0,0],weight=0;
 if(data)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const px=Math.round(clamp(x+dx*r*.25,0,w-1)),py=Math.round(clamp(y+dy*r*.25,0,h-1)),j=(py*w+px)*4;if(data[j+3]<32)continue;
  const v=Math.max(data[j],data[j+1],data[j+2]);if(v<18)continue;for(let k=0;k<3;k++)sum[k]+=data[j+k];weight++;
 }
 if(weight)local=lab(sum.map(c=>c/weight));
 const ranked=palette.map(c=>({c,d:local?distance(lab(c),local):0})).sort((a,b)=>a.d-b.d),primary=ranked[local?0:Math.floor(random()*ranked.length)].c;
 const related=ranked.filter(p=>p.c!==primary).sort((a,b)=>distance(lab(a.c),lab(primary))-distance(lab(b.c),lab(primary)));
 const count=random()<.35?1:random()<.75?2:3;
 const result=[primary];if(count>1&&related.length)result.push(related[Math.min(1,related.length-1)].c);
 if(count>2&&related.length>1){const accent=related.at(-1).c;if(!result.includes(accent))result.push(accent);}
 return result;
}
export function paletteCacheSize(){return cache.size;}
