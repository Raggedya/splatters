import{PaintField}from'./paint.js';
import{pullVector,loaded,advance,launch,BALL_RADIUS}from'./physics.js';
import{play,toggle as toggleSound}from'./audio.js';
import{clubs,screens,club as initialClub,safeMembershipUrl,logoPalette,membershipArtwork,whiteArtwork}from'./club.js';
import{loadBestShots,recordBestShots,hydrateBestShots}from'./best-shots.js';
import{createRotation}from'./rotation.js';
import{stats}from'./stats.js';
import{clubHeart}from'./likes.js';
const $=id=>document.getElementById(id),canvas=$('canvas'),g=canvas.getContext('2d'),arena=canvas.parentElement;
const heart=clubHeart($('clubLove'));
let club=initialClub,loadToken=0,palette=null,field,member,memberBox={x:0,y:0,w:1,h:1},logoDoneAnnounced=false,w=1,h=1,box={x:0,y:0,w:1,h:1},origin={x:0,y:0},maxPull=65,pull={x:0,y:0},held=null,start=null,projectile=null,pops=0,phase='loading',first=true,popRing=null,last=0,accumulator=0,displayed=-1;
const frames=[],rotation=createRotation(screens.map(screen=>screen.id));
function resize(){const r=canvas.getBoundingClientRect(),oldW=w,oldH=h;w=r.width;h=r.height;const d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);g.setTransform(d,0,0,d,0,0);const stageStyle=getComputedStyle(arena),inset=parseFloat(stageStyle.getPropertyValue('--control-inset')),controlWidth=parseFloat(stageStyle.getPropertyValue('--control-width'));maxPull=Math.max(24,Math.min(72,w*.18,h*.18,(w-2*inset-2*controlWidth)/2-BALL_RADIUS-3));origin={x:w/2,y:h-maxPull-12};if(field){const memberW=member?Math.min((w-44)*.88,322):0,memberH=memberW*152/960,maxH=origin.y-memberH-64,scale=Math.min((w-36)/field.image.naturalWidth,maxH/field.image.naturalHeight);box={w:field.image.naturalWidth*scale,h:field.image.naturalHeight*scale,x:(w-field.image.naturalWidth*scale)/2,y:Math.max(14,(origin.y-memberH-36-field.image.naturalHeight*scale)/2)};memberBox={x:(w-memberW)/2,y:origin.y-memberH-38,w:memberW,h:memberH};$('instruction').style.top=(origin.y-29)+'px';const a=$('membership');a.style.left=memberBox.x+'px';a.style.top=(memberBox.y-(Math.max(44,memberBox.h)-memberBox.h)/2)+'px';a.style.width=memberBox.w+'px';a.style.height=Math.max(44,memberBox.h)+'px';}if(projectile){projectile.x*=w/oldW;projectile.y*=h/oldH;projectile.vx*=w/oldW;projectile.vy*=h/oldH}cancel();}
new ResizeObserver(resize).observe(arena);
function message(text){if($('gameStatus').textContent!==text)$('gameStatus').textContent=text}
function recordScreen(){return`${club.paintScreenId||'default'}:${safeMembershipUrl(club.membershipUrl)?'logo-and-membership':'logo-only'}`}
function updateBest(){$('previousBest').textContent=loadBestShots(club.id,recordScreen())??'—'}
window.addEventListener('splat:best-shots-updated',updateBest);
function updateCue(){const cue=$('pullCue');cue.hidden=!first||phase!=='playing';if(!cue.hidden){cue.style.left=(origin.x+pull.x+23)+'px';cue.style.top=Math.min(h-33,origin.y+pull.y-12)+'px'}}
function controls(){const flying=!!projectile;$('restart').disabled=phase==='loading';$('pop').disabled=!flying&&phase!=='complete';$('pop').classList.toggle('ready',flying);$('popText').textContent=phase==='complete'?'Paint it again':flying?'SPLAT!':'Pull to launch';heart.show(phase==='complete');updateCue()}
function cancel(){const id=held;held=null;start=null;pull={x:0,y:0};if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);updateCue()}
function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function fire(vector){if(!field||projectile||phase!=='playing')return;projectile=launch(origin,vector,Math.max(210,h*.86));stats.launch();first=false;updateCue();play('launch');message('Tap now, while the ball is over the logo.');controls()}
function pop(){if(!projectile||!field)return;const p=projectile;projectile=null;pops++;$('count').textContent=String(pops).padStart(2,'0');const x=(p.x-box.x)/box.w*field.w,y=(p.y-box.y)/box.h*field.h,result=field.complete?{changed:0,touched:0}:field.deposit(x,y,field.w*.16),offer=member&&!member.complete?member.deposit((p.x-memberBox.x)/memberBox.w*member.w,(p.y-memberBox.y)/memberBox.h*member.h,box.w*.16/memberBox.w*member.w):{changed:0,touched:0};popRing={x:p.x,y:p.y,age:0};play('pop');message(result.changed>.001||offer.changed>.001?'Let it ooze. Find another unpainted patch.':result.touched||offer.touched?'That patch is coated. Aim for a fresh area.':'Aim into the open space above the ball.');controls()}
function reset(clearPaint=true){cancel();projectile=null;pops=0;first=true;phase='playing';displayed=-1;logoDoneAnnounced=false;if(clearPaint){stats.screen(club.id);field?.reset();member?.reset()}$('membership').hidden=true;document.body.classList.remove('completed');$('complete').hidden=true;$('count').textContent='00';$('fillLabel').textContent='COMPLETED';message('Pull down. Release. Tap to discover the colours.');updateBest();controls();updateProgress()}
// Both masks share a 180-unit width: count their painted mask pixels together,
// independently of responsive CSS sizing, so resizing cannot change the score.
function updateProgress(){if(!field)return;const done=field.complete&&(!member||member.complete),area=field.area+(member?.area||0),covered=field.filled*field.area+(member?member.filled*member.area:0),percent=done?100:Math.min(99,Math.floor(covered/area*100));if(percent!==displayed){displayed=percent;$('percent').innerHTML=percent+'<span>%</span>';$('progress').setAttribute('aria-valuenow',percent);}const revealed=member?.complete&&safeMembershipUrl(club.membershipUrl);if(revealed&&$('membership').hidden)stats.reveal();$('membership').hidden=!revealed;if(field.complete&&!logoDoneAnnounced){logoDoneAnnounced=true;if(member&&!member.complete)message('Emblem complete. Paint just beneath it to find the hidden button.')}if(field.complete&&(!member||member.complete)&&phase!=='complete'){phase='complete';stats.complete();stats.flush();recordBestShots(club.id,recordScreen(),pops);updateBest();projectile=null;cancel();document.body.classList.add('completed');$('complete').hidden=false;$('fillLabel').textContent='COMPLETED';message(`${club.name}${club.kind==='sponsors'?' artwork':' emblem'}${member?' and membership button':''} completed in ${pops} pops.`);controls();play('launch')}}
canvas.addEventListener('pointerdown',e=>{if(!field||projectile||e.isPrimary===false||e.button>0||phase!=='playing')return;if(e.cancelable)e.preventDefault();const p=point(e);if(Math.hypot(p.x-origin.x,p.y-origin.y)>36){message('Grab the ball below the logo and pull down.');return}held=e.pointerId;start=p;pull={x:0,y:0};canvas.setPointerCapture(e.pointerId)});
// During flight the whole page is a splat target, including the score/footer
// below the canvas. Keep real controls and membership links independent.
document.addEventListener('pointerdown',e=>{if(!projectile||phase!=='playing'||e.isPrimary===false||e.button>0||e.target.closest('button,a,input,select,textarea,[role="button"],[role="link"],[contenteditable]'))return;if(e.cancelable)e.preventDefault();pop()});
canvas.addEventListener('pointermove',e=>{if(held!==e.pointerId)return;if(e.cancelable)e.preventDefault();pull=pullVector(start,point(e),maxPull);updateCue();message(loaded(pull)?'Release to launch. Tap again to splat.':'Pull down a little further.');});
canvas.addEventListener('pointerup',e=>{if(held!==e.pointerId)return;if(e.cancelable)e.preventDefault();const vector={...pull},valid=loaded(vector);cancel();if(valid)fire(vector);else message('Pull the ball down. Release. Tap to splat.')});
for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,cancel);
// Non-passive handling is local to an already active canvas gesture. Browser
// controls and the DOM buttons remain independent and keyboard accessible.
canvas.addEventListener('touchmove',e=>{if(held!==null&&e.cancelable)e.preventDefault()},{passive:false});
window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{cancel();last=0});
canvas.addEventListener('keydown',e=>{if(![' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){cancel();return}if(e.key===' '){if(projectile)pop();else fire({x:0,y:55});return}if(phase==='playing'&&!projectile){const x=e.key==='ArrowLeft'?34:e.key==='ArrowRight'?-34:0;fire({x,y:55})}});
$('pop').addEventListener('click',()=>phase==='complete'?reset():pop());$('restart').addEventListener('click',()=>selectClub(rotation.next()));$('clubSelect').addEventListener('change',e=>selectClub(rotation.next(e.target.value)));
$('membership').addEventListener('click',()=>stats.click());
$('sound').addEventListener('click',()=>{const enabled=toggleSound();$('sound').setAttribute('aria-pressed',enabled);$('sound').setAttribute('aria-label',enabled?'Mute sound':'Enable sound');$('sound').innerHTML=enabled?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4ZM16 8q5 4 0 8M19 5q8 7 0 14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4ZM16 8l5 8m0-8-5 8"/></svg>';if(enabled)play('launch')});
function ball(x,y,flight=false){g.save();const r=flight?9:11;g.shadowColor='#a1e5da65';g.shadowBlur=10;g.shadowOffsetY=5;const grad=g.createRadialGradient(x-r*.35,y-r*.4,1,x,y,r);grad.addColorStop(0,'#719ca7');grad.addColorStop(.28,'#284b5d');grad.addColorStop(1,'#031a29');g.fillStyle=grad;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.shadowColor='transparent';g.strokeStyle='#e1f7d995';g.lineWidth=1;g.stroke();g.fillStyle='#edf9ebaa';g.beginPath();g.ellipse(x-3,y-4,3,1.5,-.5,0,Math.PI*2);g.fill();g.restore()}
function draw(now){g.clearRect(0,0,w,h);if(!field)return;
 field.draw(g,box);
 if(member)member.draw(g,memberBox);
 if(phase==='complete')return;
 if(popRing){g.strokeStyle=`rgba(88,116,91,${Math.max(0,.35-popRing.age)})`;g.lineWidth=1;g.beginPath();g.arc(popRing.x,popRing.y,9+popRing.age*70,0,Math.PI*2);g.stroke()}
 if(projectile){g.save();for(let i=0;i<projectile.trail.length;i++){const p=projectile.trail[i];g.globalAlpha=i/projectile.trail.length*.2;g.fillStyle='#d6ed75';g.beginPath();g.arc(p.x,p.y,2.8*i/projectile.trail.length+.5,0,Math.PI*2);g.fill()}g.restore();ball(projectile.x,projectile.y,true);return}
 const tip={x:origin.x+pull.x,y:origin.y+pull.y};
 g.strokeStyle='#90a77d28';g.lineWidth=1;g.beginPath();g.ellipse(origin.x,origin.y+12,25,5,0,0,Math.PI*2);g.stroke();
 if(held!==null){
  g.lineCap='round';for(const side of [-1,1]){g.strokeStyle='#879a7038';g.lineWidth=4;g.beginPath();g.moveTo(origin.x+side*20,origin.y-2);g.lineTo(tip.x+side*5,tip.y+4);g.stroke();g.strokeStyle='#d6ed75';g.lineWidth=1.5;g.stroke()}
  if(loaded(pull)){const p=launch(origin,pull,Math.max(210,h*.86));g.fillStyle='#d6ed75';g.globalAlpha=.2;for(let i=0;i<100;i++){advance(p,.012,w,h);if(i%9===0){g.beginPath();g.arc(p.x,p.y,1.6,0,Math.PI*2);g.fill()}if(p.y>h)break}g.globalAlpha=1;}
 }
 ball(tip.x,tip.y);
}
function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(dt>0){frames.push(dt*1000);if(frames.length>180)frames.shift()}if(!document.hidden&&field){if(projectile){const steps=Math.max(1,Math.ceil(dt/(1/180)));for(let i=0;i<steps;i++)if(projectile&&advance(projectile,dt/steps,w,h))pop();if(projectile){projectile.trail.push({x:projectile.x,y:projectile.y});if(projectile.trail.length>14)projectile.trail.shift()}}if(popRing){popRing.age+=dt;if(popRing.age>.45)popRing=null}accumulator+=dt;if(accumulator>=1/30){field.step(Math.min(accumulator,.05),pops,now/1000);field.updateSurface();if(member){member.step(Math.min(accumulator,.05),pops,now/1000);member.updateSurface()}accumulator=0;updateProgress()}}draw(now);requestAnimationFrame(frame)}
async function selectClub(id){
 const next=screens.find(team=>team.id===id);if(!next)return;
 stats.screen(next.id);
 heart.select(next);
 const token=++loadToken;cancel();projectile=null;field=null;member=null;palette=null;club=next;phase='loading';pops=0;first=true;popRing=null;last=0;accumulator=0;displayed=-1;
 $('membership').hidden=true;$('membership').removeAttribute('href');$('loadError').hidden=true;$('canvas').setAttribute('aria-busy','true');$('count').textContent='00';updateBest();$('percent').innerHTML='0<span>%</span>';$('progress').setAttribute('aria-valuenow','0');$('clubSelect').value=id;$('levelIndex').textContent=String(rotation.position).padStart(2,'0')+' / '+screens.length;document.body.classList.remove('completed');controls();
 try{
  await hydrateBestShots();if(token!==loadToken)return;updateBest();
  const image=new Image();image.src=new URL(next.emblem,import.meta.url).href;await image.decode();if(token!==loadToken)return;
  const sampled=logoPalette(image),art=next.whitePaint?await whiteArtwork(image):image,url=safeMembershipUrl(next.membershipUrl),button=url?await membershipArtwork(sampled):null;if(token!==loadToken)return;
  field=new PaintField(art,{lighting:next.lighting});member=button?new PaintField(button,{minimumPops:1}):null;palette=sampled;
  if(url){$('membership').href=url;$('membership').setAttribute('aria-label',`Become a member of ${next.name} FC (opens in a new tab)`)}
  $('progress').setAttribute('aria-label',member?`${next.name} logo and membership button filled with paint`:`${next.name} logo filled with paint`);$('canvas').setAttribute('aria-label',`${next.name}. Grab the ball, pull down and release. Tap anywhere on the screen to splat. Arrow keys aim; Space launches or pops.`);$('canvas').removeAttribute('aria-busy');reset(false);resize();
  const address=new URL(location.href);address.searchParams.set('club',id);history.replaceState(null,'',address);
  message(`${next.name}. Pull down to release your Paintball. Tap again to Splat.`);
 }catch{if(token===loadToken){phase='error';$('canvas').removeAttribute('aria-busy');$('loadError').hidden=false;$('loadError').textContent=`Could not load ${next.name}. Choose another club, then try again.`;controls()}}
}
$('clubSelect').replaceChildren(...screens.map(team=>{const option=document.createElement('option');option.value=team.id;option.textContent=team.name;return option}));
const requested=new URLSearchParams(location.search).get('club');selectClub(rotation.next(screens.some(screen=>screen.id===requested)?requested:undefined));requestAnimationFrame(frame);
window.splat={get state(){return{ready:!!field&&phase!=='loading',clubId:club.id,clubName:club.name,clubIndex:clubs.indexOf(club),clubCount:clubs.length,screenCount:screens.length,screenKind:club.kind||'club',rotationPosition:rotation.position,palette:palette&&{...palette},phase,pops,percent:displayed,projectile:projectile&&{x:projectile.x,y:projectile.y,vx:projectile.vx,vy:projectile.vy},origin:{...origin},box:{...box},memberBox:{...memberBox},membership:member?.diagnostics(),viewport:{w,h},aiming:held!==null,maxPull,paint:field?.diagnostics(),averageFrameMs:frames.length?frames.reduce((a,b)=>a+b,0)/frames.length:0}},readPaint(target='logo'){const f=target==='membership'?member:field;return f&&{width:f.w,height:f.h,mask:Array.from(f.mask),cover:Array.from(f.cover)}}};
