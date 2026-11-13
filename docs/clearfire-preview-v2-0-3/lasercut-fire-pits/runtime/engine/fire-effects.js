// Render-only fire. Coordinates and ages come from the existing simulation.
const clamp=value=>Math.max(0,Math.min(1,value));

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
   const glow=context.createRadialGradient(effect.x,effect.y,0,effect.x,effect.y,radius);
   glow.addColorStop(0,'#fff6bb');
   glow.addColorStop(.39,'#ffac30');
   glow.addColorStop(.78,'#ed4e0b');
   glow.addColorStop(1,'#9b240000');
   context.globalAlpha=(1-age)**1.6*(reduced?.52:.79+.09*Math.sin(effect.age*52));
   context.fillStyle=glow;
   context.fillRect(effect.x-radius,effect.y-radius,radius*2,radius*2);
  }
  context.lineCap='round';context.lineJoin='round';
  for(const stream of streams){
   if(stream.tip<=stream.y)continue;
   const travel=Math.max(1,stream.distance??stream.available??1);
   const xAt=y=>stream.x+(stream.drift??0)*Math.sin(clamp((y-stream.y)/travel)*Math.PI/2);
   context.beginPath();
   context.moveTo(xAt(stream.y),stream.y);
   for(let y=stream.y+3;y<stream.tip;y+=3)context.lineTo(xAt(y),y);
   context.lineTo(xAt(stream.tip),stream.tip);
   const glow=context.createLinearGradient(0,stream.y,0,stream.tip);
   const pulse=reduced?.72:.72+.18*Math.sin(field.time*18+stream.x*.29);
   glow.addColorStop(0,'#8e2309b0');glow.addColorStop(.48,'#ec4a08');glow.addColorStop(1,'#ff9c24');
   context.globalAlpha=pulse;
   context.strokeStyle=glow;context.lineWidth=stream.r*1.45;context.stroke();
   context.strokeStyle='#ffe3a0';context.lineWidth=stream.r*.45;context.stroke();
  }
  context.restore();
  context.globalCompositeOperation='destination-in';
  context.drawImage(mask,0,0,columns,rows);
  context.globalCompositeOperation='source-over';
  target.drawImage(canvas,0,0,width,height);
 }
}
