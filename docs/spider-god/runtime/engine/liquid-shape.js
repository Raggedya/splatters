// Seeded non-periodic silhouette: an off-centre pool plus sparse tapered jets.
export function liquidShape(random=Math.random){
 const direction=random()*Math.PI*2,stretch=.8+random()*.55;
 const pools=[{x:0,y:0,rx:.65+random()*.23,ry:.57+random()*.22}];
 for(let i=0;i<4;i++){const a=random()*Math.PI*2,d=.2+random()*.42;pools.push({x:Math.cos(a)*d,y:Math.sin(a)*d,rx:.25+random()*.36,ry:.19+random()*.29});}
 const jets=Array.from({length:4+Math.floor(random()*5)},()=>{const a=direction+(random()-.5)*Math.PI*2;return{a,length:.85+random()*.85,width:.035+random()*.08};});
 const drops=Array.from({length:8+Math.floor(random()*10)},()=>{const a=random()*Math.PI*2;return{a,v:1.05+random()*.9,s:.55+random()*1.25};});
 for(const p of pools){p.ix=1/p.rx;p.iy=1/p.ry;}
 for(const jet of jets){jet.c=Math.cos(jet.a);jet.s=Math.sin(jet.a);}
 return{direction,stretch,c:Math.cos(direction),s:Math.sin(direction),pools,jets,drops};
}
export function liquidDistance(shape,dx,dy){
 const c=shape.c,s=shape.s,x=(dx*c+dy*s)/shape.stretch,y=(-dx*s+dy*c)*shape.stretch;
 let value=Infinity;
 for(const p of shape.pools){const px=(x-p.x)*p.ix,py=(y-p.y)*p.iy;value=Math.min(value,px*px+py*py);}
 for(const jet of shape.jets){const along=x*jet.c+y*jet.s,side=-x*jet.s+y*jet.c;if(along>.1&&along<jet.length){const width=jet.width*(1.15-along/jet.length)*2,d=Math.max(Math.abs(side)/width,along/jet.length);value=Math.min(value,d*d);}}
 return Math.sqrt(value);
}
