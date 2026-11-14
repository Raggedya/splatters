// Render-only fire. Coordinates and ages come from the existing simulation.
const clamp=value=>Math.max(0,Math.min(1,value));

let ballSprite,impactSprite;
function glowSprite(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const g=canvas.getContext('2d'),r=128;
 const glow=kind==='ball'?g.createRadialGradient(r-r*.19/1.34,r-r*.18/1.34,0,r,r,r):g.createRadialGradient(r,r,0,r,r,r);
 const stops=kind==='ball'?[[0,'#ffffe7'],[.34,'#ffe7a0'],[.59,'#ffa12f'],[.76,'#eb4c08'],[1,'#ff6b0b00']]:[[0,'#fff6bb'],[.39,'#ffac30'],[.78,'#ed4e0b'],[1,'#9b240000']];
 for(const [at,colour]of stops)glow.addColorStop(at,colour);
 g.fillStyle=glow;g.fillRect(0,0,256,256);return canvas;
}
export function drawFireball(context,x,y,radius,time){
 ballSprite??=glowSprite('ball');const r=radius*1.34;
 context.save();context.globalAlpha*=.93+.07*Math.sin(time*24);
 context.drawImage(ballSprite,x-r,y-r,r*2,r*2);context.restore();
}

export function impactSparks(id){
 return Array.from({length:18},(_,index)=>{
  const angle=index*2.399963+id*.71,radius=18+index%5*5;
  const x=45+Math.cos(angle)*radius,y=45+Math.sin(angle)*radius;
  const colour=['#fff1b5','#ffd15c','#ff7c17'][index%3];
  const size=1.6+index%4*.55;
  return `<ellipse cx="${x}" cy="${y}" rx="${size}" ry="${size*.45}" transform="rotate(${angle*180/Math.PI} ${x} ${y})" fill="${colour}"/>`;
 }).join('');
}

export class FireLayer{
 constructor(){this.streamCache=new WeakMap();}
 draw(target,field,streams,mask,{width,height,burst=.48,spread=.24,reduced=false}){
  if(field.complete||(!streams.length&&!field.effects.length))return;
  this.canvas??=document.createElement('canvas');
  const canvas=this.canvas,columns=Math.min(384,mask.width),rows=Math.max(1,Math.round(columns*mask.height/mask.width));
  if(canvas.width!==columns||canvas.height!==rows){canvas.width=columns;canvas.height=rows;}
  const context=canvas.getContext('2d');
  context.clearRect(0,0,columns,rows);
  context.save();
  context.scale(columns/field.w,rows/field.h);
  for(const effect of field.effects){
   const age=clamp(effect.age/burst);
   const radius=effect.r*(1-.5*(1-clamp(effect.age/spread))**3);
   if(age>=1||radius<=0)continue;
   impactSprite??=glowSprite('impact');
   context.globalAlpha=(1-age)**1.6*(reduced?.52:.79+.09*Math.sin(effect.age*52));
   context.drawImage(impactSprite,effect.x-radius,effect.y-radius,radius*2,radius*2);
  }
  context.lineCap='round';context.lineJoin='round';
  for(const stream of streams){
   if(stream.tip<=stream.y)continue;
   let cached=this.streamCache.get(stream);
   if(!cached||cached.tip!==stream.tip||cached.canvas!==canvas||cached.width!==columns||cached.height!==rows){
    const travel=Math.max(1,stream.distance??stream.available??1),xAt=y=>stream.x+(stream.drift??0)*Math.sin(clamp((y-stream.y)/travel)*Math.PI/2);
    const path=new Path2D();path.moveTo(xAt(stream.y),stream.y);
    for(let y=stream.y+3;y<stream.tip;y+=3)path.lineTo(xAt(y),y);
    path.lineTo(xAt(stream.tip),stream.tip);
    const glow=context.createLinearGradient(0,stream.y,0,stream.tip);
    glow.addColorStop(0,'#8e2309b0');glow.addColorStop(.48,'#ec4a08');glow.addColorStop(1,'#ff9c24');
    cached={path,glow,tip:stream.tip,canvas,width:columns,height:rows};this.streamCache.set(stream,cached);
   }
   context.globalAlpha=reduced?.72:.72+.18*Math.sin(field.time*18+stream.x*.29);
   context.strokeStyle=cached.glow;context.lineWidth=stream.r*1.45;context.stroke(cached.path);
   context.strokeStyle='#ffe3a0';context.lineWidth=stream.r*.45;context.stroke(cached.path);
  }
  context.restore();
  context.globalCompositeOperation='destination-in';context.drawImage(mask,0,0,columns,rows);
  context.globalCompositeOperation='source-over';target.drawImage(canvas,0,0,width,height);
 }
}
