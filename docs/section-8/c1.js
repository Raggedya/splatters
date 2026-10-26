import {ProgressiveReveal} from './c1-progressive.js';
import {ActionTiming} from './c1-action-timing.js';
import {commerceURL} from './runtime/studio/model.js';
import {activity,initialiseAnalytics,eventUUID} from './c1-analytics.js';
import {manualEmbed} from './c1-manual-player.js';
import {CompletionUI,artistDestination} from './c1-completion.js';
import {coveredArtwork,CANVAS_ASPECT} from './c1-artwork.js';
import {FirstPlaySequence} from './c1-onboarding.js';
import {shareDetails,offerShare} from './c1-share.js';
import {SongPurchase} from './c1-purchase.js';
import {installLauncherInput} from './c1-input.js';
import {LivingField} from './runtime/engine/living-field.js';
import {icon} from './runtime/engine/floating-controls.js';
import {FirstPlayTutorial} from './runtime/engine/bandcamp-player.js';
import {ProgressStore} from './runtime/engine/progress-store.js';
import {CinematicPaint} from './c1-wet-paint.js';
import {LiveMaterial} from './c1-live-material.js';
import {PAINT,ARCADE} from './c1-tuning.js';
import {LauncherSession,planeFromMatrix,pointOnPlane,project,elasticGeometry,predictShot,inputForTarget} from './c1-physics.js';
const published=document.documentElement.dataset.release==='1';
const $=id=>document.getElementById(id),scene=document.querySelector('.scene'),object=document.querySelector('.canvas-object'),stage=document.querySelector('.artwork-stage'),launcher=document.querySelector('.launcher'),body=document.querySelector('.body'),ball=document.querySelector('.paintball'),cradle=document.querySelector('.cradle'),bands=[...document.querySelectorAll('.elastic')];let frame=$('bandcamp'),playerReady=false,selecting=false;const transitionLog=[],archivedSessions=new WeakSet();let sessionSongId=null;
const abort=new AbortController(),on=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal}),params=new URLSearchParams(location.search),snapshot=params.get('snapshot')||'2541643d-8818-4396-a30e-e3da420321a3';
const purchase=new SongPurchase({availableFromStart:true}),onboarding=new FirstPlaySequence();
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),tutorial=new FirstPlayTutorial();const completion=new CompletionUI({scene,launcher,nav:document.querySelector('.glass-controls'),root:$('completion-actions'),buy:$('buy'),next:$('next'),visit:$('visit-bandcamp'),merch:$('buy-merch'),reduced});const actionTiming=new ActionTiming(()=>completion.finish());let tutorialDone=false,cueVersion=0,requestedCue=null,cueAnimation=null;let storage;try{storage=localStorage;}catch{}const progress=new ProgressStore(storage);
let linkDiagnostics=[];let paint,material,paintAccumulator=0;const bursts=[];
const reportedLaunches=new WeakMap(),reportedCompletions=new WeakSet(),paintingIds=new WeakMap();
let reveal=new ProgressiveReveal(),primarySource=null,secondarySource=null,stageStartLaunch=0,revealLayers=[];
let config,entries,index=0,source,plaster,relief,field,session,geometry,observer,raf=0,last=0,disposed=false,token=0,coverage=0,impactAt=-10,impact=null,renderCosts=[],frameCosts=[],previousProjection=null,worker=null,renderId=0,appliedRender=0;
const image=async url=>{const i=new Image();i.src=url;await i.decode();return i;};
const grab=document.createElement('button');grab.className='c1-grab';grab.setAttribute('aria-label','Pull paintball down and release to launch. Arrow keys aim; Space launches.');launcher.append(grab);
const projectile=ball.cloneNode();projectile.className='c1-projectile';projectile.hidden=true;scene.append(projectile);const trail=projectile.cloneNode();trail.className='c1-trail';scene.append(trail);
const gloss=document.createElement('canvas');gloss.id='wet-lighting';$('surface').after(gloss);
const marker=document.createElement('div');marker.className='c1-impact';marker.hidden=true;object.append(marker);
const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.classList.add('c1-trajectory');overlay.setAttribute('aria-hidden','true');scene.append(overlay);const debug=params.get('debug')==='geometry';let forecast=null,lastForecast=null;
const status=document.createElement('p');status.id='c1-status';status.setAttribute('role','status');document.querySelector('footer').prepend(status);
scene.setAttribute('aria-label','Cinematic painting — pull and release, automatic canvas impacts');document.querySelector('.glass-controls').setAttribute('aria-label','Painting controls');
document.querySelector('.launcher-stage').setAttribute('aria-label','Interactive launcher');launcher.removeAttribute('aria-hidden');$('surface').setAttribute('aria-label','Artwork revealed only by canvas impacts');
for(const [id,name]of [['save','heart'],['share','share'],['replay','replay'],['next','next']]){icon($(id).querySelector('.glyph'),name);$(id).disabled=id!=='share';}
$('next').querySelector('.glyph path').setAttribute('d','M12 2 15 8.5 22 9.5 17 14.5 18 22 12 18.5 6 22 7 14.5 2 9.5 9 8.5Z');
for(const e of bands)e.src='assets/browser/elastic-b1.webp';
function message(text){text=[text,...linkDiagnostics].join(' ');if(status.textContent!==text)status.textContent=text;}
function applyPaint(study){const c=$('surface'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(reveal.stage===1?primarySource:plaster,0,0,c.width,c.height);g.drawImage(study.colour,0,0);gloss.width=c.width;gloss.height=c.height;gloss.getContext('2d').drawImage(study.lighting,0,0,c.width,c.height);coverage=reveal.update(study.coverage);scene.classList.toggle('complete',reveal.complete);scene.classList.toggle('settled',reveal.complete&&!paint.active);if(reveal.complete&&!paint.active){if(!reportedCompletions.has(session)){reportedCompletions.add(session);activity('artwork_complete',sessionSongId,paintingIds.get(session));}actionTiming.artworkComplete(coverage===1?1:0);}$('number').textContent=String(Math.floor(coverage*100));scene.style.setProperty('--progress',coverage);}
function renderPaint(){if(!material)return;const began=performance.now();applyPaint(material.render(paint?.complete||false));appliedRender=++renderId;renderCosts.push(performance.now()-began);if(renderCosts.length>300)renderCosts.shift();if(paint)paint.dirty=false;}
function measure(){if(!source||disposed)return;
 const area=stage.getBoundingClientRect(),ratio=CANVAS_ASPECT,width=Math.max(20,Math.min(area.width-32,(area.height-35)*ratio)),height=width/ratio;
 scene.style.setProperty('--canvas-width',width+'px');scene.style.setProperty('--canvas-height',height+'px');const c=$('surface'),dpr=Math.min(devicePixelRatio,2);c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);material=new LiveMaterial(source,relief,field,c.width,c.height);renderPaint();
 const css=getComputedStyle(stage),po=css.perspectiveOrigin.split(' ').map(parseFloat),matrix=new DOMMatrix(getComputedStyle(object).transform).toFloat64Array(),d=parseFloat(css.perspective);
 const camera={x:area.left+po[0],y:area.top+po[1],z:d},center={x:area.left+object.offsetLeft+width/2,y:area.top+object.offsetTop+height/2,z:0};
 const lr=launcher.getBoundingClientRect(),factor=lr.width/230,ready={x:lr.left+115*factor,y:lr.top+(40+47*(1008/1020)/2)*factor};
 geometry={camera,plane:planeFromMatrix(matrix,center,width,height),ready,launcher:{left:lr.left,top:lr.top,factor},maxPullY:Math.max(25,Math.min(ARCADE.maxPullY,document.querySelector('.glass-controls').getBoundingClientRect().top-ready.y-30))};
 if(session){if(session.ball){session.events.push({type:'resize-cancel',id:session.ball.id});session.ball=null;session.phase='ready';}session.cancel();session.geometry=geometry;}
 draw();
}
function onHit(e){
 if(reveal.successfulImpact()){
  revealLayers[0]={field,paint};stageStartLaunch=e.id-1;source=secondarySource;let seed=384;field=new LivingField(source,{key:'c1:secondary:'+entries[index].secondaryArtwork.id,w:360,h:360,random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)});paint=new CinematicPaint(field);material=new LiveMaterial(source,relief,field,$('surface').width,$('surface').height);revealLayers[1]={field,paint};
 }
 paint.impact(e.u,e.v,e.id-stageStartLaunch);
 impact={u:e.u,v:e.v,fieldX:e.u*field.w,fieldY:e.v*field.h,point:e.point,id:e.id};impactAt=session.clock;makeBurst(e);
 renderPaint();message('Canvas hit. Pull the next ball to aim again.');
}
function draw(){if(!geometry||!session||selecting)return;const counted=reportedLaunches.get(session)||0;for(const e of session.events.filter(e=>e.type==='launch'&&!e.automatic&&e.id>counted)){activity('paintball_launch',sessionSongId,paintingIds.get(session));reportedLaunches.set(session,e.id);}
 if(!session.ball&&session.phase!=='dragging'){if(reveal.complete)session.phase='complete';else if(paint.complete)session.phase='ready';else if(paint.launches>=13)session.phase='settling';}
 const destination=purchase.update(session.launches);$('buy').hidden=!destination;if(destination)$('buy').href=destination;else $('buy').removeAttribute('href');
 const offset=session.recoil(reduced.matches),f=geometry.launcher.factor,ox=offset.x/f,oy=offset.y/f;
 cradle.style.transform='translate('+ox+'px,'+oy+'px)';
 const eyes=[{x:84+ox,y:82+oy},{x:146+ox,y:82+oy}],anchors=[{x:25,y:14},{x:205,y:14}];
 bands.forEach((el,i)=>{const e=elasticGeometry(anchors[i],eyes[i]);el.style.left=e.left+'px';el.style.setProperty('top',e.top-e.thickness/2+'px','important');el.style.width=e.length+'px';el.style.height=e.thickness+'px';el.style.transform='rotate('+e.angle+'deg)'+(i?' scaleY(-1)':'');});
 const pull=session.pull,restDepth=geometry.camera.z*(1-ARCADE.launcherDepth),pullScale=restDepth/(restDepth-Math.min(34,Math.hypot(pull.x,pull.y)*.4));ball.style.transform='translate('+(pull.x/f)+'px,'+(pull.y/f)+'px) scale('+pullScale+')';ball.style.visibility=session.ball?'hidden':'visible';grab.disabled=session.phase!=='ready'&&session.phase!=='dragging';grab.style.transform='translate('+(pull.x/f)+'px,'+(pull.y/f)+'px)';
 drawTrajectory();drawBurst();
 if(session.ball){const p=project(session.ball.position,geometry.camera),size=session.ball.radius*2*p.scale,angle=previousProjection?Math.atan2(p.y-previousProjection.y,p.x-previousProjection.x)*180/Math.PI:0;
  projectile.hidden=false;projectile.style.width=size+'px';projectile.style.transform='translate('+(p.x-size/2)+'px,'+(p.y-size/2)+'px)';projectile.style.zIndex=session.ball.crossed?'1':'9';
  trail.hidden=reduced.matches||!previousProjection;trail.style.width=size+'px';trail.style.transform='translate('+((p.x+(previousProjection?.x||p.x))/2-size/2)+'px,'+((p.y+(previousProjection?.y||p.y))/2-size/2)+'px) rotate('+angle+'deg) scaleX(1.12)';trail.style.zIndex=projectile.style.zIndex;
  previousProjection=p;
 }else{projectile.hidden=trail.hidden=true;previousProjection=null;}
 if(session.manual){tutorialDone=true;onboarding.launchedManually();}
 const cue=onboarding.stage==='play'&&playerReady?'play':onboarding.stage==='start'?'start':onboarding.stage==='launcher'&&!tutorialDone&&session.tutorial&&session.phase==='ready'?'drag':'';

 let x=geometry.ready.x-14,y=geometry.ready.y-10;
 if(cue==='play'){const r=frame.getBoundingClientRect();x=Math.min(r.left+32,$('start').getBoundingClientRect().left-34);y=r.bottom+2;}
 if(cue==='start'){const r=$('start').getBoundingClientRect();x=r.left-37;y=r.top+(r.height-36)/2;}
 updateCue(cue,x,y);
 if(session.clock-impactAt>.65)marker.hidden=true;
}
function loop(now){raf=0;if(disposed||document.hidden)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;const t=performance.now(),misses=session.misses;session.tick(dt);paintAccumulator+=dt;if(paintAccumulator>=1/PAINT.stepHz){paint.step(Math.min(.1,paintAccumulator));paintAccumulator=0;if(paint.dirty)renderPaint();}if(session.misses>misses)message('Miss — no paint revealed. Let the ball pass, then aim again.');draw();frameCosts.push(performance.now()-t);if(frameCosts.length>600)frameCosts.shift();if(session.phase==='dragging'||session.phase==='flight'||session.phase==='intro'||session.recoilAge<.55||paint.active||bursts.length)raf=requestAnimationFrame(loop);else last=0;}
function wake(){if(!raf&&!disposed&&!document.hidden){last=0;raf=requestAnimationFrame(loop);}}
async function select(next,replay=false,preservePurchase=replay){
 if(selecting)return;selecting=true;$('error').hidden=true;const version=++token;++renderId;
 for(const id of ['next','replay','start','save'])$(id).disabled=true;grab.disabled=true;
 if(session&&!archivedSessions.has(session)){transitionLog.push(...session.events.map(e=>({...e,songId:sessionSongId})));archivedSessions.add(session);}
 if(!replay){if(session)transitionLog.push({type:'next',songId:sessionSongId,nextSongId:entries[next].id});frame?.remove();frame=null;playerReady=false;}
 if(transitionLog.length>500)transitionLog.splice(0,transitionLog.length-500);
 session?.dispose();if(raf)cancelAnimationFrame(raf);raf=0;last=0;bursts.splice(0).forEach(b=>b.node.remove());paintAccumulator=0;updateCue('',0,0);
 coverage=0;$('number').textContent='0';scene.style.setProperty('--progress',0);const sg=$('surface').getContext('2d');sg.clearRect(0,0,$('surface').width,$('surface').height);sg.drawImage(plaster,0,0,$('surface').width,$('surface').height);gloss.getContext('2d').clearRect(0,0,gloss.width,gloss.height);marker.hidden=true;projectile.hidden=trail.hidden=true;
 for(const layer of revealLayers)layer?.field?.dispose();field?.dispose();revealLayers=[];source=null;primarySource=secondarySource=null;reveal=new ProgressiveReveal();stageStartLaunch=0;scene.classList.remove('complete','settled');
 try{
 if(!await completion.reset()||version!==token)return;
 index=next;const entry=entries[index];actionTiming.reset();completion.nextAvailable=entries.length>1;const merchURL=commerceURL(entry.actions?.merchUrl||'');$('buy-merch').hidden=!merchURL;if(merchURL)$('buy-merch').href=merchURL;else $('buy-merch').removeAttribute('href');onboarding.reset(preservePurchase);purchase.select(entry,preservePurchase);const artistURL=artistDestination(config,entry);linkDiagnostics=[];if(!purchase.url)linkDiagnostics.push('Purchase link unavailable: configure a verified Bandcamp destination.');if(!artistURL)linkDiagnostics.push('Artist Bandcamp link unavailable.');$('visit-bandcamp').hidden=!artistURL;if(artistURL)$('visit-bandcamp').href=artistURL;else $('visit-bandcamp').removeAttribute('href');$('buy').hidden=!purchase.update(0);message('Loading artwork…');
 const art=new URL(entry.artwork.src,published?location.href:location.origin+'/');if(!published)art.searchParams.set('preview',snapshot);if(art.origin!==location.origin||!(published?art.pathname.startsWith(new URL('./media/',location.href).pathname):art.pathname.startsWith('/studio-assets/')))throw Error('Invalid artwork reference');const loaded=await image(art.href);if(version!==token||disposed)return;source=coveredArtwork(loaded);primarySource=source;secondarySource=null;if(entry.secondaryArtwork?.src){const secondURL=new URL(entry.secondaryArtwork.src,published?location.href:location.origin+'/');if(secondURL.origin!==location.origin||!(published?secondURL.pathname.startsWith(new URL('./media/',location.href).pathname):secondURL.pathname.startsWith('/studio-assets/')))throw Error('Invalid secondary artwork reference');if(!published)secondURL.searchParams.set('preview',snapshot);secondarySource=coveredArtwork(await image(secondURL.href));if(version!==token||disposed)return;}reveal=new ProgressiveReveal(secondarySource?2:1);stageStartLaunch=0;$('track-title').textContent=entry.title;$('track-artist').textContent=(typeof entry.artist==='string'?entry.artist:entry.artist?.name)||'';
 if(worker){const bitmaps=await Promise.all([createImageBitmap(source),createImageBitmap(relief)]);if(version!==token){bitmaps.forEach(x=>x.close());return;}worker.postMessage({type:'source',source:bitmaps[0],relief:bitmaps[1]},bitmaps);}
 let seed=384;field=new LivingField(source,{key:'c1:'+entry.artwork.id,w:360,h:360*source.naturalHeight/source.naturalWidth,random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)});
 paint=new CinematicPaint(field);revealLayers=[{field,paint}];
 const playerLoaded=(!replay||!frame)?createManualPlayer(entry,version):Promise.resolve();
 coverage=0;session=null;measure();session=new LauncherSession(geometry,onHit);sessionSongId=entry.id;impact=null;marker.hidden=true;lastForecast=forecast=null;scene.classList.remove('complete');$('start').hidden=false;$('start').style.opacity='1';$('start').disabled=true;$('start').title='Begin painting. Music playback remains independent.';
 updateLove(progress.favourite(entry));$('save').setAttribute('aria-pressed',progress.favourite(entry));icon($('save').querySelector('.glyph'),'heart',progress.favourite(entry));$('current-game').href=published?config.publicUrl:'/?edition=enhanced&band='+encodeURIComponent(config.bandId)+'&snapshot='+snapshot;
 $('credits').textContent='Artwork: '+(entry.artwork.credit||'owner-supplied artwork')+'. '+entry.audio.attribution+'. '+entry.audio.license+'. C1 physical collision study. Music playback is independent.';
 await playerLoaded;if(version!==token||disposed)return;$('start').disabled=false;message(onboarding.stage==='play'?'Play music, then LET’S PAINT':'LET’S PAINT when you’re ready.');return true;
 }finally{if(version===token){selecting=false;for(const id of ['next','replay','save'])$(id).disabled=false;draw();}}
}
// Explicit interest in the painting control, never a claim about iframe playback.
on($('start'),'focus',()=>{if(onboarding.stage==='play'){onboarding.confirmMusic();draw();}});
on($('start'),'click',()=>{if(onboarding.stage==='play')onboarding.confirmMusic();if(onboarding.start()&&session?.start()){paintingIds.set(session,eventUUID());activity('start_painting_click',sessionSongId,paintingIds.get(session));const version=token;$('start').disabled=true;updateCue('',0,0);completion.fade($('start'),1,0,180).then(()=>{if(version===token)$('start').hidden=true;});message('Pull back the paintball and release to paint.');wake();}});
installLauncherInput({region:document.querySelector('.launcher-stage'),grab,session:()=>session,geometry:()=>geometry,draw,wake,message,signal:abort.signal});
on(grab,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','Enter','Escape'].includes(e.key)||!['ready','dragging'].includes(session.phase))return;e.preventDefault();if(e.key==='Escape'){session.cancel();draw();return;}if(session.pointer===null)session.begin('keyboard',0,0,geometry.maxPullY);if(e.key===' '||e.key==='Enter'){if(Math.hypot(session.pull.x,session.pull.y)<8)session.move('keyboard',0,geometry.maxPullY*.60);session.release('keyboard');wake();}else session.move('keyboard',session.pull.x+(e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0),session.pull.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0));draw();});
on($('buy-merch'),'click',()=>activity('merch_click',sessionSongId));
on($('buy'),'click',()=>activity('buy_click',sessionSongId));on($('visit-bandcamp'),'click',()=>activity('bandcamp_visit_click',sessionSongId));
on($('replay'),'click',()=>{if(!entries?.length||selecting)return;activity('replay_click',sessionSongId);select(index,true).catch(fail);});on($('next'),'click',()=>{if(!entries?.length||selecting)return;const exiting=sessionSongId;select((index+1)%entries.length,false,false).then(selected=>{if(selected)activity('next_click',exiting);}).catch(fail);});
on($('save'),'click',()=>{const saved=progress.toggleFavourite(entries[index]);activity(saved.value?'love_add':'love_remove',sessionSongId);$('save').setAttribute('aria-pressed',saved.value);icon($('save').querySelector('.glyph'),'heart',saved.value);updateLove(saved.value);message(saved.value?'Loved — added to favourites on this device.':'Removed from favourites.');});
const shareDialog=$('share-dialog'),shareURL=$('share-url'),shareFeedback=$('share-feedback');
function shareFallback(details){shareURL.value=details.url;$('share-note').textContent=details.privateLink?'This is a local preview. It only opens on the same Wi-Fi as this computer.':'Copy this link to share sPlatters.';shareFeedback.textContent='';shareDialog.showModal();shareURL.focus();shareURL.select();}
on($('share'),'click',()=>{const sharedSong=sessionSongId;activity('share_click',sharedSong);offerShare(navigator,shareDetails(location.href),message,shareFallback).then(result=>{if(result==='native')activity('share_api_resolved',sharedSong);});});
on($('share-close'),'click',()=>shareDialog.close());
on($('share-copy'),'click',async()=>{shareURL.focus();shareURL.select();shareURL.setSelectionRange(0,shareURL.value.length);try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(shareURL.value);}else if(!document.execCommand('copy'))throw Error('Clipboard unavailable');activity('share_copy',sessionSongId);shareFeedback.textContent='Link copied. '+(shareDetails(shareURL.value).privateLink?'Same Wi-Fi required.':'');}catch{shareFeedback.textContent='Automatic copy is unavailable. Touch and hold the selected link, then choose Copy.';shareURL.focus();shareURL.select();}});
on(document,'visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0;session?.cancel();}else{draw();wake();}});
on(window,'pagehide',()=>{disposed=true;token++;completion.dispose();cueVersion++;cueAnimation?.cancel();cancelAnimationFrame(raf);worker?.terminate();session?.dispose();field?.dispose();observer?.disconnect();tutorial.dispose();abort.abort();projectile.remove();trail.remove();});
function fail(e){$('error').hidden=false;$('error').textContent='C1 preview unavailable: '+e.message;}
(async()=>{if(!/^[a-f0-9-]{36}$/.test(snapshot))throw Error('Invalid snapshot');const r=await fetch(published?'band.json':'/api/previews/'+snapshot,{cache:'no-store'});if(!r.ok)throw Error('Saved preview unavailable');config=await r.json();initialiseAnalytics(config);try{if(published)throw Error('Published metadata is included');const meta=await(await fetch('/cinematic/artist-link.json?snapshot='+snapshot,{cache:'no-store'})).json();if(meta.bandId===config.bandId)config.bandcampArtistUrl=meta.bandcampArtistUrl;}catch{}entries=config.catalogue.entries.filter(e=>e.audio.kind==='bandcamp-embed');if(!entries.length)throw Error('No official Bandcamp entry');[plaster,relief]=await Promise.all([image('assets/browser/plaster-b1.webp'),image('assets/browser/paint-relief-b1.webp')]);
 await select(0);observer=new ResizeObserver(measure);observer.observe(stage);
 window.c1={inputForTarget:(u,v)=>inputForTarget(u,v,geometry),get state(){return{linkDiagnostics:[...linkDiagnostics],artworks:{images:reveal.images,stage:reveal.stage+1,coverages:[...reveal.coverages],overall:reveal.overall,awaitingSecondImpact:reveal.awaitingSecondImpact,assistance:revealLayers.map(layer=>layer.paint.state.assistance)},completion:completion.phase,artistURL:$('visit-bandcamp').getAttribute('href'),artworkCrop:source?.sourceCrop||null,onboarding:onboarding.stage,phase:selecting?'loading':session.phase,launches:selecting?0:session.launches,hits:selecting?0:session.hits,misses:session.misses,coverage,pull:{...session.pull},ball:session.ball&&structuredClone(session.ball),events:structuredClone(session.events),impact,geometry:structuredClone(geometry),tutorial:session.tutorial,iframe:frame?.src||'',playerReady,selecting,songId:entries[index].id,artworkId:entries[index].artwork.id,activity:[...transitionLog,...(archivedSessions.has(session)?[]:session.events.map(e=>({...e,songId:sessionSongId})))],frameCosts:[...frameCosts],renderCosts:[...renderCosts],purchase:{visible:!$('buy').hidden,url:$('buy').getAttribute('href')},materialWorker:false,paint:paint.state,shadedPixels:material.shadedPixels,renderPending:appliedRender!==renderId,debug,forecast:forecast&&structuredClone(forecast.contact),impactVisible:bursts.length>0};},projectUV(u,v){return project(pointOnPlane(geometry.plane,u,v),geometry.camera);}};
})().catch(fail);

function drawTrajectory(){
 if(session.phase==='dragging'){forecast=predictShot(session.pull,geometry);lastForecast=forecast;}else forecast=null;
 const prediction=forecast||(debug?lastForecast:null);if(!prediction&&!debug){overlay.replaceChildren();return;}
 overlay.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);const xy=p=>{const q=project(p,geometry.camera);return `${q.x},${q.y}`;};let shapes='';
 if(debug&&session.phase==='dragging'){const raw=session.rawPull||session.pull;shapes+=`<line x1="${geometry.ready.x}" y1="${geometry.ready.y}" x2="${geometry.ready.x+raw.x}" y2="${geometry.ready.y+raw.y}" stroke="#ff9fe1"/><circle cx="${geometry.ready.x+raw.x}" cy="${geometry.ready.y+raw.y}" r="6" fill="none" stroke="#ff9fe1"/>`;}
 if(debug){const quad=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>xy(pointOnPlane(geometry.plane,u,v))).join(' ');shapes+=`<polygon points="${quad}" fill="none" stroke="#41e8ea" stroke-width="1.2"/>`;}
 if(prediction){const pts=prediction.points,contact=prediction.contact;
  if(debug)shapes+=`<polyline points="${pts.map(xy).join(' ')}" fill="none" stroke="#f5d079" stroke-width="1.2" stroke-dasharray="3 4"/>`;
  else for(let i=10;i<pts.length-2;i+=7){const q=project(pts[i],geometry.camera);shapes+=`<circle cx="${q.x}" cy="${q.y}" r="1.4" fill="#f9e3ad" opacity=".45"/>`;}
  if(debug){const aim=project(prediction.aim,geometry.camera);shapes+=`<path d="M${aim.x-5} ${aim.y}h10 M${aim.x} ${aim.y-5}v10" stroke="#fff"/>`;if(contact){const q=project(contact.point,geometry.camera);shapes+=`<circle cx="${q.x}" cy="${q.y}" r="6" fill="none" stroke="${contact.inside?'#80ff9b':'#ff806b'}"/><text x="18" y="110" fill="#fff" font-size="11">${contact.inside?'HIT':'MISS'} · white: barrel aim · ring: predicted contact</text>`;}}
 }
 if(debug&&impact){const q=project(impact.point,geometry.camera);shapes+=`<circle cx="${q.x}" cy="${q.y}" r="3" fill="#ff69cf"/>`;}
 overlay.innerHTML=shapes;
}
function makeBurst(e){
 const node=marker.cloneNode();node.hidden=false;node.style.left=e.u*100+'%';node.style.top=e.v*100+'%';object.append(node);
 const colours=field.lastColours||field.palette,parts=[];
 for(let i=0;i<18;i++){const a=i*2.399963+e.id*.71,r=18+(i%5)*5,x=45+Math.cos(a)*r,y=45+Math.sin(a)*r,c=colours[i%colours.length],size=1.6+i%4*.55;parts.push(`<ellipse cx="${x}" cy="${y}" rx="${size}" ry="${size*.82}" fill="rgb(${c.join(',')})" stroke="#17130e99" stroke-width=".7"/><ellipse cx="${x-size*.25}" cy="${y-size*.32}" rx="${size*.42}" ry="${size*.19}" fill="#fffde8cc"/>`);}
 node.innerHTML=`<svg viewBox="0 0 90 90" aria-hidden="true"><g>${parts.join('')}</g></svg>`;bursts.push({node,born:session.clock});if(bursts.length>PAINT.maxEffects)bursts.shift().node.remove();
}
function drawBurst(){for(let i=bursts.length-1;i>=0;i--){const b=bursts[i],age=session.clock-b.born,t=Math.min(1,age/PAINT.burstSeconds);if(t>=1){b.node.remove();bursts.splice(i,1);continue;}b.node.style.opacity=String(reduced.matches?0:1-t*t);const scale=.12+1.12*(1-Math.pow(1-t,3));b.node.querySelector('g').setAttribute('transform',`translate(45 45) scale(${scale}) translate(-45 -45)`);}}

function updateCue(cue,x,y){
 if(requestedCue===cue){if(tutorial.node.dataset.cue===cue){tutorial.node.style.left=x+'px';tutorial.node.style.top=y+'px';}return;}
 requestedCue=cue;const v=++cueVersion;cueAnimation?.cancel();
 (async()=>{
  if(!tutorial.node.hidden&&!reduced.matches){cueAnimation=tutorial.node.animate([{opacity:1},{opacity:0}],{duration:150,fill:'forwards'});try{await cueAnimation.finished;}catch{}if(v!==cueVersion)return;cueAnimation.cancel();}
  tutorial.node.hidden=true;if(!cue||v!==cueVersion)return;
  tutorial.node.dataset.cue=cue;tutorial.node.style.left=x+'px';tutorial.node.style.top=y+'px';tutorial.node.hidden=false;
  if(!reduced.matches){cueAnimation=tutorial.node.animate([{opacity:0},{opacity:1}],{duration:200});try{await cueAnimation.finished;}catch{}}
 })();
}

function updateLove(selected){$('save').setAttribute('aria-label',selected?'Love it — remove song from favourites':'Love it — add song to favourites');$('save').title=selected?'Remove from favourites':'Add to favourites';}

function createManualPlayer(entry,version){
 const url=manualEmbed(entry.audio.src),current=document.createElement('iframe');current.id='bandcamp';current.title='Official Bandcamp player — '+entry.title;current.referrerPolicy='no-referrer';frame=current;playerReady=false;
 const loaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{if(version===token&&frame===current){current.remove();frame=null;}reject(Error('Bandcamp player did not finish loading. Try Next to retry.'));},25000);current.addEventListener('load',()=>{clearTimeout(timer);if(version!==token||frame!==current||disposed)return resolve();playerReady=true;resolve();},{once:true});});
 current.src=url;document.querySelector('.player-slot').replaceChildren(current);return loaded;
}
