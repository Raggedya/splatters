import {ARCADE} from './c1-tuning.js';
// Pure C1 world geometry. CSS uses +z toward the camera; flight travels toward -z.
export const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
export const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
export const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const unit=a=>mul(a,1/Math.hypot(a.x,a.y,a.z));
export const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export function planeFromMatrix(m,center,width,height){
 const u=unit({x:m[0],y:m[1],z:m[2]}),v=unit({x:m[4],y:m[5],z:m[6]});
 return {center,u,v,normal:unit(cross(u,v)),width,height};
}
export const pointOnPlane=(p,u,v)=>add(p.center,add(mul(p.u,(u-.5)*p.width),mul(p.v,(v-.5)*p.height)));
export function uvOnPlane(p,q){const d=sub(q,p.center);return {u:.5+dot(d,p.u)/p.width,v:.5+dot(d,p.v)/p.height};}
export function project(p,camera){const scale=camera.z/(camera.z-p.z);return{x:camera.x+(p.x-camera.x)*scale,y:camera.y+(p.y-camera.y)*scale,scale};}
export function unproject(p,z,camera){const scale=(camera.z-z)/camera.z;return{x:camera.x+(p.x-camera.x)*scale,y:camera.y+(p.y-camera.y)*scale,z};}
export function boundedPull(x,y,maxY=ARCADE.maxPullY){y=Math.max(0,Math.min(maxY,y));x=Math.max(-ARCADE.maxPullX,Math.min(ARCADE.maxPullX,x));const length=Math.hypot(x,y),s=Math.min(1,104/(length||1));return{x:x*s,y:y*s};}
export function elasticGeometry(anchor,eye,restLength=104){const dx=eye.x-anchor.x,dy=eye.y-anchor.y,length=Math.hypot(dx,dy);return{left:anchor.x,top:anchor.y,length,angle:Math.atan2(dy,dx)*180/Math.PI,thickness:10*Math.sqrt(restLength/Math.max(restLength,length))};}
// Solve the swept sphere's leading contact with the tilted plane analytically,
// including acceleration; no endpoint rectangle and no speed-dependent tunnelling.
export function intersectPlane(position,velocity,acceleration,dt,plane,radius=0){
 const a=.5*dot(acceleration,plane.normal),b=dot(velocity,plane.normal),c=dot(sub(position,plane.center),plane.normal)-radius;
 let roots=[];if(Math.abs(a)<1e-10){if(Math.abs(b)>1e-10)roots=[-c/b];}else{const d=b*b-4*a*c;if(d>=0){const q=-.5*(b+Math.sign(b||1)*Math.sqrt(d));roots=[q/a,c/q];}}
 const t=roots.filter(t=>Number.isFinite(t)&&t>=-1e-8&&t<=dt+1e-8&&b+2*a*t<0).sort((a,b)=>a-b)[0];if(t===undefined)return null;
 const center=add(position,add(mul(velocity,t),mul(acceleration,.5*t*t))),point=sub(center,mul(plane.normal,radius)),uv=uvOnPlane(plane,point);
 return {time:Math.max(0,t),center,point,...uv,inside:uv.u>=-1e-8&&uv.u<=1+1e-8&&uv.v>=-1e-8&&uv.v<=1+1e-8};
}
export function createShot(pull,geometry,id=1,automatic=false){
 const {plane,camera,ready}=geometry;
 pull=boundedPull(pull.x,pull.y,geometry.maxPullY||ARCADE.maxPullY);
 const length=Math.hypot(pull.x,pull.y),restZ=camera.z*ARCADE.launcherDepth,z=restZ+Math.min(34,length*.4);
 const position=unproject({x:ready.x+pull.x,y:ready.y+pull.y},z,camera);
 const uv=barrelUV(pull,geometry),target=pointOnPlane(plane,uv.u,uv.v),radius=23.5*(geometry.launcher?.factor||1)*(camera.z-restZ)/camera.z;
 // Solve the entire accelerated trajectory once at release. After the spring
 // phase, this velocity plus gravity meets the sphere-contact point at T.
 // The live swept-plane collision still determines and emits the actual hit.
 const end=add(target,mul(plane.normal,radius)),duration=ARCADE.flightDurationTarget-ARCADE.flightPowerReduction*Math.min(1,pull.y/(geometry.maxPullY||ARCADE.maxPullY));
 const launchVelocity=mul(sub(sub(end,position),{x:0,y:.5*ARCADE.gravity*duration*duration,z:0}),1/(duration-ARCADE.springSeconds*.5));
 const speed=Math.hypot(launchVelocity.x,launchVelocity.y,launchVelocity.z),direction=unit(launchVelocity);
 return{id,automatic,position,velocity:{x:0,y:0,z:0},direction,speed,age:0,radius,crossed:false,done:false,target:{...uv,point:target},duration};
}

export function advanceShot(ball,dt,plane){
 const events=[];let remaining=dt;
 while(remaining>1e-9&&!ball.done){const spring=ball.age<ARCADE.springSeconds-1e-9,step=Math.min(remaining,spring?ARCADE.springSeconds-ball.age:remaining),a=add({x:0,y:ARCADE.gravity,z:0},spring?mul(ball.direction,ball.speed/ARCADE.springSeconds):{x:0,y:0,z:0});
  const hit=!ball.crossed?intersectPlane(ball.position,ball.velocity,a,step,plane,ball.radius):null;
  if(hit){ball.crossed=true;events.push({type:hit.inside?'hit':'miss',id:ball.id,automatic:ball.automatic,...hit});if(hit.inside){ball.position=hit.center;ball.age+=hit.time;ball.done=true;break;}}
  ball.position=add(ball.position,add(mul(ball.velocity,step),mul(a,.5*step*step)));ball.velocity=add(ball.velocity,mul(a,step));ball.age+=step;remaining-=step;
  if(ball.position.z< -1800||ball.age>3.5){ball.done=true;events.push({type:'exit',id:ball.id});}
 }return events;
}
export class LauncherSession{
 constructor(geometry,onHit=()=>{}){this.geometry=geometry;this.onHit=onHit;this.phase='waiting';this.clock=0;this.launches=0;this.hits=0;this.misses=0;this.events=[];this.pull={x:0,y:0};this.pointer=null;this.ball=null;this.recoilAge=1;this.lastPull={x:0,y:0};this.tutorial=false;this.manual=false;}
 start(){if(this.phase!=='waiting')return false;this.phase='ready';this.tutorial=true;return true;}
 begin(id,x,y,maxY=this.geometry.maxPullY||ARCADE.maxPullY){if(this.phase!=='ready'||this.pointer!==null)return false;this.pointer=id;this.anchor={x,y};this.maxY=maxY;this.phase='dragging';this.rawPull={x:0,y:0};return true;}
 move(id,x,y){if(id!==this.pointer||this.phase!=='dragging')return false;this.rawPull=boundedPull((x-this.anchor.x)*ARCADE.dragSensitivity,(y-this.anchor.y)*ARCADE.dragSensitivity,this.maxY);this.pull=smoothPull(this.pull,this.rawPull,1/60);return true;}
 release(id){if(id!==this.pointer||this.phase!=='dragging')return false;this.pointer=null;const pull=this.pull,raw=this.rawPull||pull;this.pull={x:0,y:0};if(Math.hypot(raw.x,raw.y)<ARCADE.minimumPull||raw.y<ARCADE.minimumDown){this.phase='ready';return false;}this.manual=true;this.tutorial=false;this.fire(pull);return true;}
 cancel(){this.pointer=null;this.pull={x:0,y:0};if(this.phase==='dragging')this.phase='ready';}
 fire(pull,automatic=false){if(this.ball)return false;this.ball=createShot(pull,this.geometry,++this.launches,automatic);this.lastPull=pull;this.recoilAge=0;this.phase='flight';this.events.push({type:'launch',id:this.launches,automatic,pull:{...pull},clock:this.clock});return true;}
 tick(dt){if(this.phase==='waiting'||this.disposed)return;this.clock+=dt;this.recoilAge+=dt;if(this.phase==='dragging')this.pull=smoothPull(this.pull,this.rawPull,dt);
  if(this.ball){for(const e of advanceShot(this.ball,dt,this.geometry.plane)){this.events.push({...e,clock:this.clock});if(e.type==='hit'){this.hits++;this.onHit(e);}if(e.type==='miss')this.misses++;}if(this.ball.done){const auto=this.ball.automatic;this.ball=null;this.phase='ready';if(auto&&!this.manual)this.tutorial=true;}}
  if(this.events.length>200)this.events.splice(0,this.events.length-200);
 }
 recoil(reduced=false){if(this.phase==='dragging')return this.pull;const t=this.recoilAge;if(t>.5)return{x:0,y:0};const a=reduced?0:Math.exp(-t*13)*Math.cos(t*38);return{x:this.lastPull.x*a,y:this.lastPull.y*a};}
 dispose(){this.disposed=true;this.ball=null;this.cancel();this.phase='disposed';}
}

// Predict the very same physics; never used to redirect a live projectile.
export function predictShot(pull,geometry,dt=1/120){
 const ball=createShot(pull,geometry),points=[{...ball.position}];let contact;
 for(let i=0;i<600&&!ball.done;i++){const events=advanceShot(ball,dt,geometry.plane);points.push({...ball.position});contact ||= events.find(e=>e.type==='hit'||e.type==='miss');if(contact)break;}
 const uv=barrelUV(pull,geometry);return {points,contact,aim:pointOnPlane(geometry.plane,uv.u,uv.v)};
}
// Development/test inverse mapping; normal player input never calls this.
export function inputForTarget(u,v,geometry){
 const margin=ARCADE.impactMargin;if(u<margin||u>1-margin||v<margin||v>1-margin)throw Error('Target outside safe canvas');
 const maxY=geometry.maxPullY||ARCADE.maxPullY;let p={x:0,y:(maxY+ARCADE.minimumPull)/2};
 for(let pass=0;pass<6;pass++){
  let lo=-ARCADE.maxPullX,hi=ARCADE.maxPullX;
  for(let n=0;n<40;n++){const x=(lo+hi)/2;if(barrelUV({x,y:p.y},geometry).u>u)lo=x;else hi=x;}p.x=(lo+hi)/2;
  lo=ARCADE.minimumPull;hi=maxY;
  for(let n=0;n<40;n++){const y=(lo+hi)/2;if(barrelUV({x:p.x,y},geometry).v>v)lo=y;else hi=y;}p.y=(lo+hi)/2;
 }
 return p;
}

export function barrelUV(pull,geometry){
 const p=boundedPull(pull.x,pull.y,geometry.maxPullY||ARCADE.maxPullY),x=p.x/ARCADE.maxPullX,t=Math.max(0,Math.min(1,(p.y-ARCADE.minimumPull)/((geometry.maxPullY||ARCADE.maxPullY)-ARCADE.minimumPull))),m=ARCADE.impactMargin;
 // Variation is smooth, tiny and vanishes at the bounds. Preview and live
 // trajectory share it; there is no random or last-moment redirection.
 const ripple=0;
 return {u:Math.max(m,Math.min(1-m,.5-(.5-m)*(Math.sign(x)*aimCurve(Math.abs(x),'horizontal'))+ripple*x*(1-Math.abs(x)))),v:Math.max(m,Math.min(1-m,1-m-(1-2*m)*aimCurve(t,'vertical')+ripple*4*t*(1-t)))};
}

// Broad centre/edge and lower-canvas zones, joined continuously without gaps.
export function aimCurve(t,axis){
 const knots=axis==='horizontal'?[[0,0],[.25,.08],[.65,.88],[1,1]]:[[0,0],[.45,.3],[.75,.78],[1,1]];
 t=Math.max(0,Math.min(1,t));for(let i=1;i<knots.length;i++){const [a,u]=knots[i-1],[b,v]=knots[i];if(t<=b){const q=(t-a)/(b-a),smooth=q*q*(3-2*q);return u+(v-u)*smooth;}}return 1;
}
export function smoothPull(current,target,dt){const a=1-Math.exp(-dt/ARCADE.inputSmoothingSeconds);return{x:current.x+(target.x-current.x)*a,y:current.y+(target.y-current.y)*a};}
