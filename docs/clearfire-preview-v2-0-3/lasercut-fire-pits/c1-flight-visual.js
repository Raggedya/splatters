import {advanceShot,project} from './c1-physics.js';

export function projectileTransform(p,scale){
 const dy=(47*scale-47)*(1008/1020-1)/2;
 return 'translate3d('+(p.x-23.5)+'px,'+(p.y-23.5+dy)+'px,0) scale('+scale+')';
}

export function flightFrames(ball,geometry){
 const preview={...ball},sample=()=>({age:preview.age,point:project(preview.position,geometry.camera)});
 const samples=[sample()];
 while(!preview.done){
  const events=advanceShot(preview,1/60,geometry.plane);
  if(events.some(event=>event.type==='miss'||event.type==='exit'))return null;
  samples.push(sample());
 }
 const duration=preview.age;
 if(!(duration>0))return null;
 const frames=samples.map(({age,point})=>({
  offset:age/duration,
  transform:projectileTransform(point,ball.radius*2*point.scale/47)
 }));
 const trail=samples.map(({age,point},index)=>{
  const prior=samples[Math.max(0,index-1)].point,scale=ball.radius*2*point.scale/47;
  const dy=(47*scale-47)*(1008/1020-1)/2;
  const angle=Math.atan2(point.y-prior.y,point.x-prior.x)*180/Math.PI;
  return {offset:age/duration,opacity:index ? .12 : 0,
   transform:'translate3d('+((point.x+prior.x)/2-23.5)+'px,'+((point.y+prior.y)/2-23.5+dy)+'px,0) rotate('+angle+'deg) scale('+scale*1.12+','+scale+')'};
 });
 return {frames,trail,duration:duration*1000};
}
