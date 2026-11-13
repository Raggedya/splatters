export function drawFireball(context,x,y,radius,time){
 const shimmer=.93+.07*Math.sin(time*24);
 const glow=context.createRadialGradient(x-radius*.19,y-radius*.18,0,x,y,radius*1.34);
 glow.addColorStop(0,'#ffffe7');
 glow.addColorStop(.34,'#ffe7a0');
 glow.addColorStop(.59,'#ffa12f');
 glow.addColorStop(.76,'#eb4c08');
 glow.addColorStop(1,'#ff6b0b00');
 context.save();
 context.globalAlpha*=shimmer;
 context.fillStyle=glow;
 context.beginPath();
 context.arc(x,y,radius*1.34,0,2*Math.PI);
 context.fill();
 context.restore();
}

// Render-only, bounded heat. No simulation state or random generator is changed.
const clamp=v=>Math.max(0,Math.min(1,v));
let glow;
function sprite(){
 if(glow)return glow;
 glow=document.createElement('canvas');glow.width=glow.height=96;
 const g=glow.getContext('2d'),r=g.createRadialGradient(48,48,0,48,48,48);
 for(const [p,c] of [[0,'#ffffe6'],[.16,'#fff5a0'],[.4,'#ffb52f'],[.7,'#d8400800'],[1,'#60090000']])r.addColorStop(p,c);
 g.fillStyle=r;g.fillRect(0,0,96,96);return glow;
}
let atlas;
function impactAtlas(){
 if(atlas)return atlas;
 const c=document.createElement('canvas');c.width=90*24;c.height=90;const g=c.getContext('2d');
 for(let frame=0;frame<24;frame++){
  const age=frame*.9/24,t=age/.9;g.save();g.translate(frame*90,0);g.beginPath();g.rect(0,0,90,90);g.clip();
  const r=age<.08?6+age*180:Math.max(0,23*(1-age/.55));
  if(r){g.globalAlpha=(1-t)**2;g.drawImage(sprite(),45-r,45-r,r*2,r*2);}
  if(age<.18){g.globalAlpha=1-age/.18;g.strokeStyle='#ffcc64';g.lineWidth=1.3;g.beginPath();g.arc(45,45,3+age*160,0,Math.PI*2);g.stroke();}
  if(age<.08){g.globalAlpha=1;g.fillStyle='#fffce7';g.beginPath();g.arc(45,45,4+age*35,0,Math.PI*2);g.fill();}
  for(let i=0;i<8;i++){
   const a=i*2.399+.71,dx=Math.cos(a),dy=Math.sin(a),p=clamp(age/.35),x=45+dx*(8+p*16),y=45+dy*(8+p*16)-t*9;
   if(age>.05&&age<.55){g.globalAlpha=Math.sin(clamp((age-.05)/.5)*Math.PI)*.8;g.fillStyle=age<.15?'#ffd26b':age<.3?'#ff8c22':'#76280e';g.beginPath();g.moveTo(x-dy*4,y+dx*4);g.quadraticCurveTo(x+dx*12,y+dy*12-3,x+dx*8+dy*5,y+dy*8-dx*5);g.quadraticCurveTo(x+dy*2,y-dx*2,x-dy*4,y+dx*4);g.save();g.clip();g.drawImage(sprite(),x-8,y-12,20,24);g.restore();for(let j=0;j<3;j++){const size=(9+j*2)*(1-age/.65);g.drawImage(sprite(),45+dx*(p*13+j*2)-size,45+dy*(p*13+j*2)-age*20-size,size*2,size*2);}}
   if(age>.18){g.globalAlpha=(1-t)*.07;g.fillStyle='#171519';g.beginPath();g.ellipse(x,y-t*9,6,3,0,0,Math.PI*2);g.fill();}
  }
  for(let i=0;i<22;i++){const a=i*2.399963+.71,v=18+i%6*3,x=45+Math.cos(a)*v*(1-Math.exp(-t*3)),y=45+Math.sin(a)*v*(1-Math.exp(-t*3))+15*t*t;g.globalAlpha=(1-t)**1.3;g.fillStyle=age<.12?'#fff9d6':age<.4?'#ffc44f':'#a8320c';g.fillRect(x,y,.7+i%3*.35,1.1+i%2*.4);}
  g.restore();
 }
 // Materialise the recorded drawing commands before gameplay starts. Later
 // cropped copies must read cached pixels, not replay the atlas construction.
 const baked=g.getImageData(0,0,c.width,c.height);g.putImageData(baked,0,0);
 atlas=c;return atlas;
}
export function impactSparks(){
 const positions=Array.from({length:24},(_,i)=>-90*i).join(';');
 return `<svg x="0" y="0" width="90" height="90" style="overflow:hidden;width:90px;height:90px"><image href="${impactAtlas().toDataURL()}" width="2160" height="90"><animate attributeName="x" values="${positions}" calcMode="discrete" dur=".9s" fill="freeze"/></image></svg>`;
}

export class FireLayer{
 constructor(){impactAtlas();this.streams=new WeakMap();this.lastTime=-1;this.shimmer=typeof navigator!=='undefined'&&navigator.hardwareConcurrency>=8;this.cost=0;}
 draw(target,field,streams,mask,{width,height,reduced=false}){
  if(field.complete||(!streams.length&&!field.effects.length))return;
  const started=performance.now(),now=field.time,economy=this.cost>2;
  // Cross-canvas refraction can stall asynchronously: monitor the whole cadence,
  // not only the JavaScript submission cost of this small effect.
  if(this.drawAt&&started-this.drawAt>33.4)this.shimmer=false;
  this.drawAt=started;
  if(now<this.lastTime)this.streams=new WeakMap();this.lastTime=now;
  this.canvas??=document.createElement('canvas');const c=this.canvas,w=Math.min(256,mask.width),h=Math.round(w*mask.height/mask.width);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  const g=c.getContext('2d');g.clearRect(0,0,w,h);g.save();g.scale(w/field.w,h/field.h);
  for(let n=Math.max(0,field.effects.length-4);n<field.effects.length;n++){
   const e=field.effects[n],t=clamp(e.age/.9);if(t>=1)continue;
   const r=e.r*(.3+.6*Math.sin(Math.PI*clamp(e.age/.55)));
   g.globalAlpha=(1-t)**2*(reduced?.3:.85);g.drawImage(sprite(),e.x-r,e.y-r,r*2,r*2);
   // A few soft charcoal wisps; bounded and local to the collision.
   if(!reduced&&e.age>.12){g.fillStyle='#171519';g.globalAlpha=Math.sin(t*Math.PI)*.12;for(let k=0;k<3;k++){g.beginPath();g.ellipse(e.x+Math.sin(k*2.4)*r*.6,e.y-r*.4-t*12,r*.23,r*.15,0,0,Math.PI*2);g.fill();}}
  }
  // Discontinuous tapered shards follow the EXACT existing x/y/tip/drift paths.
  // No rounded strokes, no new coverage, and no change to flow simulation.
  for(let i=0;i<Math.min(streams.length,economy?48:96);i++){
   const s=streams[i];if(s.tip<=s.y)continue;
   let state=this.streams.get(s);if(!state){state={tip:s.tip,hot:now};this.streams.set(s,state);}if(s.tip!==state.tip){state.tip=s.tip;state.hot=now;}
   const cooling=clamp(1-(now-state.hot)/1.1);
   const travel=Math.max(1,s.distance??s.available??1),length=s.tip-s.y;
   // A charred-steel skin tempers the bright video visible through a flow path.
   // This is an overlay only: the reveal mask, coverage and original PNG remain intact.
   g.globalAlpha=.78;g.fillStyle='#101113';g.beginPath();
   for(let side=-1;side<=1;side+=2){for(let j=0;j<=6;j++){const p=side<0?j/6:1-j/6,y=s.y+length*p,x=s.x+(s.drift||0)*Math.sin(clamp((y-s.y)/travel)*Math.PI/2),edge=s.r*(1.35-.65*p)*(1+.12*Math.sin(j*2.7+i));if(side<0&&j===0)g.moveTo(x+side*edge,y);else g.lineTo(x+side*edge,y);}}
   g.closePath();g.fill();
   if(!cooling)continue;
   for(let k=0;k<Math.min(economy?5:10,Math.ceil(length/7));k++){
    const y=s.tip-k*7;if(y<s.y)break;const p=clamp((y-s.y)/travel),x=s.x+(s.drift||0)*Math.sin(p*Math.PI/2),heat=cooling*(1-k*.075),r=Math.max(.3,s.r*.48*(1-k*.065));
    g.globalAlpha=heat*.72;g.fillStyle=heat>.8?'#ffd16b':heat>.5?'#dc651b':'#72210e';
    g.beginPath();g.moveTo(x-r,y-3);g.lineTo(x+r*.65,y-1);g.lineTo(x+Math.sin(i+k)*r*.4,y+3);g.closePath();g.fill();
    if(!reduced&&k===0){g.globalAlpha=heat*.65;g.fillStyle='#ffb945';g.beginPath();g.moveTo(x-r,y);g.quadraticCurveTo(x+r*Math.sin(now*13+i),y-6,x+r*.3,y-9-3*Math.sin(now*17+i));g.lineTo(x+r,y);g.fill();}
   }
  }
  g.restore();g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0,w,h);g.globalCompositeOperation='source-over';
  target.drawImage(c,0,0,width,height);
  // Tiny refractive slices of the underlying steel, never a full-screen pass.
  const e=field.effects.at(-1),surface=document.getElementById('surface');
  if(this.shimmer&&!reduced&&e&&e.age>.08&&e.age<.3&&surface){const x=e.x/field.w*width,y=e.y/field.h*height,r=Math.min(18,e.r/field.w*width);target.save();target.globalAlpha=.12;for(let k=0;k<3;k++){const sy=Math.max(0,Math.min(height-3,y-r+k*r));target.drawImage(surface,Math.max(0,x-r),sy,r*2,2,Math.max(0,x-r+Math.sin(now*30+k)),sy,r*2,2);}target.restore();}
  this.cost=performance.now()-started;if(this.cost>2)this.shimmer=false;
 }
}



export function drawImpact(canvas,age){const frame=Math.min(23,Math.floor(age/.9*24));if(canvas.fireFrame===frame)return;canvas.fireFrame=frame;const g=canvas.getContext('2d');g.clearRect(0,0,90,90);g.drawImage(impactAtlas(),frame*90,0,90,90,0,0,90,90);}

