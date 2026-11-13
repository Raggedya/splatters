import {SteelReveal} from './clearfire-renderer.js';
import {FireLayer,drawImpact} from './runtime/engine/fire-effects.js';
import {ArtworkEnquiry} from './c1-art.js';
import {effectiveBandcamp,loadAmbientMusic,withAmbientMusic} from './c1-ambient.js';
import {ProgressiveReveal} from './c1-progressive.js';
import {installControlCarousel} from './c1-control-chain.js';
import {ActionTiming} from './c1-action-timing.js';
import {ARTWORK_LIMIT,SHARED_DESIGN_LIMIT,commerceURL,songArtworks} from './runtime/studio/model.js';
import {artistNavigation,renderArtistNavigation} from './c1-artist-links.js';
import {eligibleCatalogue,nextSongIndex} from './c1-catalogue.js';
import {activity,initialiseAnalytics,eventUUID,reportingDestination} from './c1-analytics.js?v=2';
import {manualEmbed} from './c1-manual-player.js';
import {CompletionUI} from './c1-completion.js';
import {coveredArtwork,CANVAS_ASPECT} from './c1-artwork.js';
import {FirstPlaySequence} from './c1-onboarding.js?flow=direct152';
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
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),tutorial=new FirstPlayTutorial();const completion=new CompletionUI({scene,launcher,nav:$('cta-strip'),root:$('completion-actions'),buy:$('buy'),next:$('next'),merch:$('buy-merch'),reduced,onLayout:refreshRail});const actionTiming=new ActionTiming(()=>completion.finish());let cueVersion=0,requestedCue=null,cueAnimation=null;let storage;try{storage=localStorage;}catch{}const progress=new ProgressStore(storage);
const controlCarousel=installControlCarousel($('left-controls'),$('cta-strip'),$('cta-previous'),$('cta-next'),reduced,abort.signal);
let navigation=null,railCount=-1;let paint,material,paintAccumulator=0;const bursts=[];
const reportedLaunches=new WeakMap(),reportedReveals=new WeakSet(),paintingIds=new WeakMap(),completedArtworks=new Set();
let reportedGalleryCompletion=false;
let reveal=new ProgressiveReveal(),artworks=[],previousSource=null,nextSource=null,stageStartLaunch=0,assistanceHistory=[];
let handoffCueDismissed=false,artEnquiry=null,artPresentation=null;
let config,entries,index=0,source,plaster,relief,field,session,geometry,observer,raf=0,last=0,disposed=false,token=0,coverage=0,impactAt=-10,impact=null,renderCosts=[],frameCosts=[],previousProjection=null,worker=null,renderId=0,appliedRender=0;
const image=async url=>{const i=new Image();i.src=url;await i.decode();return i;};
function linenBlank(texture){
 const {naturalWidth:width,naturalHeight:height}=texture;
 const linen=Object.assign(document.createElement('canvas'),{width,height}),g=linen.getContext('2d');
 g.drawImage(texture,0,0);
 g.globalCompositeOperation='multiply';
 g.fillStyle='#fff4e4';
 g.fillRect(0,0,width,height);
 g.globalCompositeOperation='source-over';
 // The recess shadows belong to the blank linen. Revealed artwork is drawn above them.
 for(const [x,y,endX,endY,depth] of [
  [0,0,0,height*.058,.75],[0,0,width*.046,0,.62],
  [width,0,width*.956,0,.55],[0,height,0,height*.956,.49],
 ]){
  const shadow=g.createLinearGradient(x,y,endX,endY);
  shadow.addColorStop(0,`rgba(18,12,9,${depth})`);
  shadow.addColorStop(.32,`rgba(18,12,9,${depth*.48})`);
  shadow.addColorStop(1,'rgba(18,12,9,0)');
  g.fillStyle=shadow;
  g.fillRect(0,0,width,height);
 }
 return linen;
}
const grab=document.createElement('button');grab.className='c1-grab';grab.setAttribute('aria-label','Pull fireball down and release to launch. Arrow keys aim; Space launches.');launcher.append(grab);
const projectile=ball.cloneNode();projectile.className='c1-projectile';projectile.hidden=true;scene.append(projectile);const trail=projectile.cloneNode();trail.className='c1-trail';trail.src='assets/browser/fire-embers.webp';scene.append(trail);
const fire=new FireLayer();
const steel=new SteelReveal($('surface'),reduced);
const gloss=document.createElement('canvas');gloss.id='wet-lighting';$('surface').after(gloss);
const marker=document.createElement('div');marker.className='c1-impact';marker.hidden=true;object.append(marker);
const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.classList.add('c1-trajectory');overlay.setAttribute('aria-hidden','true');scene.append(overlay);const debug=params.get('debug')==='geometry';let forecast=null,lastForecast=null;
const status=document.createElement('p');status.id='c1-status';status.setAttribute('role','status');document.querySelector('footer').prepend(status);
scene.setAttribute('aria-label','Cinematic painting — pull and release, automatic canvas impacts');document.querySelector('.glass-controls').setAttribute('aria-label','Painting controls');
document.querySelector('.launcher-stage').setAttribute('aria-label','Interactive launcher');launcher.removeAttribute('aria-hidden');$('surface').setAttribute('aria-label','Artwork revealed only by canvas impacts');
for(const [id,name]of [['save','heart'],['share','share'],['replay','replay'],['next','next']]){icon($(id).querySelector('.glyph'),name);$(id).disabled=id!=='share';}
$('next').querySelector('.glyph path').setAttribute('d','M12 2 15 8.5 22 9.5 17 14.5 18 22 12 18.5 6 22 7 14.5 2 9.5 9 8.5Z');
for(const e of bands)e.src='assets/browser/elastic-b1.webp';
function refreshRail(force=false){
 const rail=$('cta-strip'),count=rail.querySelectorAll('button:not([hidden]),a:not([hidden])').length;
 if(count===railCount&&!force)return;
 railCount=count;
 controlCarousel.refresh();
}
function message(text){if(status.textContent!==text)status.textContent=text;}
function applyPaint(study){const c=$('surface'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(config?.clearfire)steel.update(source.steelArtwork,study.mask,study.coverage,config.clearfire,paint.complete);else{g.drawImage(previousSource||plaster,0,0,c.width,c.height);g.drawImage(study.colour,0,0);}gloss.width=c.width;gloss.height=c.height;const lighting=gloss.getContext('2d');if(!config?.clearfire)lighting.drawImage(study.lighting,0,0,c.width,c.height);if(!paint.complete)fire.draw(lighting,field,paint.drips,study.mask,{width:c.width,height:c.height,burst:PAINT.burstSeconds,spread:PAINT.spreadSeconds,reduced:reduced.matches});coverage=reveal.update(study.coverage);scene.classList.toggle('complete',reveal.complete);scene.classList.toggle('settled',reveal.complete&&!paint.active);if(reveal.coverages[reveal.stage]===1)reportArtworkReveal();if(reveal.complete&&!paint.active){actionTiming.artworkComplete(coverage===1?1:0);}updateArtworkCounter();scene.style.setProperty('--progress',coverage);}
function artworkAnalytics(){
 const artwork=artworks[reveal.stage];
 return artwork?{artworkId:artwork.id,number:entries.slice(0,index).reduce((sum,entry)=>sum+songArtworks(entry).length,0)+reveal.stage+1}:null;
}
function reportArtworkReveal(){
 if(reportedReveals.has(paint))return;
 const artwork=artworkAnalytics();
 if(!artwork||!sessionSongId)return;
 reportedReveals.add(paint);
 activity('artwork_revealed',sessionSongId,eventUUID(),artwork);
 completedArtworks.add(artwork.artworkId);
 if(!reportedGalleryCompletion&&completedArtworks.size===entries.reduce((sum,entry)=>sum+songArtworks(entry).length,0)){
  reportedGalleryCompletion=true;
  activity('gallery_completed',sessionSongId);
 }
}
function updateArtworkCounter(){const counter=$('number'),value=reveal.completed+'/'+reveal.images;if(counter.textContent!==value)counter.textContent=value;}
function renderPaint(){if(!material)return;const began=performance.now();applyPaint(material.render(paint?.complete||false));appliedRender=++renderId;renderCosts.push(performance.now()-began);if(renderCosts.length>300)renderCosts.shift();if(paint)paint.dirty=false;}
function measure(){if(!source||disposed)return;
 const area=stage.getBoundingClientRect(),ratio=CANVAS_ASPECT,width=Math.max(20,Math.min(area.width-32,(area.height-35)*ratio)),height=width/ratio;
 scene.style.setProperty('--canvas-width',width+'px');scene.style.setProperty('--canvas-height',height+'px');const c=$('surface'),dpr=Math.min(devicePixelRatio,2);c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);material=new LiveMaterial(source,relief,field,c.width,c.height,{maskOnly:!!config?.clearfire});renderPaint();
 const css=getComputedStyle(stage),po=css.perspectiveOrigin.split(' ').map(parseFloat),matrix=new DOMMatrix(getComputedStyle(object).transform).toFloat64Array(),d=parseFloat(css.perspective);
 const camera={x:area.left+po[0],y:area.top+po[1],z:d},center={x:area.left+object.offsetLeft+width/2,y:area.top+object.offsetTop+height/2,z:0};
 const lr=launcher.getBoundingClientRect(),factor=lr.width/230,ready={x:lr.left+115*factor,y:lr.top+(40+47*(1008/1020)/2)*factor};
 geometry={camera,plane:planeFromMatrix(matrix,center,width,height),ready,launcher:{left:lr.left,top:lr.top,factor},maxPullY:Math.max(25,Math.min(ARCADE.maxPullY,document.querySelector('.glass-controls').getBoundingClientRect().top-ready.y-30))};
 if(session){if(session.ball){session.events.push({type:'resize-cancel',id:session.ball.id});session.ball=null;session.phase='ready';}session.cancel();session.geometry=geometry;}
 draw();
}
function artworkURL(artwork){
 const url=new URL(artwork.src,published?location.href:location.origin+'/');
 if(url.origin!==location.origin||!(published?url.pathname.startsWith(new URL('./media/',location.href).pathname):url.pathname.startsWith('/studio-assets/')))throw Error('Invalid artwork reference');
 if(!published)url.searchParams.set('preview',snapshot);
 return url;
}
async function prepareNextArtwork(artwork,version){
 if(!artwork)return;
 try{
  const loaded=await image(artworkURL(artwork).href);
  if(version!==token||disposed)return;
  nextSource=coveredArtwork(loaded);nextSource.steelArtwork=loaded;
  draw();
 }catch{
  if(version===token&&!disposed)fail(Error('Artwork '+(reveal.stage+2)+' could not load. Use Replay to try again.'));
 }
}
function onHit(e){
 if(nextSource&&reveal.successfulImpact()){
  assistanceHistory.push(paint.state.assistance);
  field.dispose();
  previousSource=source;source=nextSource;nextSource=null;
  stageStartLaunch=e.id-1;handoffCueDismissed=false;
  let seed=384;
  field=new LivingField(source,{key:'c1:secondary:'+artworks[reveal.stage].id,w:360,h:360,random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)});
  paint=new CinematicPaint(field);
  material=new LiveMaterial(source,relief,field,$('surface').width,$('surface').height,{maskOnly:!!config?.clearfire});
  void prepareNextArtwork(artworks[reveal.stage+1],token);
 }
 paint.impact(e.u,e.v,e.id-stageStartLaunch);
 impact={u:e.u,v:e.v,fieldX:e.u*field.w,fieldY:e.v*field.h,point:e.point,id:e.id};impactAt=session.clock;makeBurst(e);
 renderPaint();message(config?.clearfire?'Keep firing to reveal the design.':'Canvas hit. Pull the next ball to aim again.');
}
function updateArtPresentation(){
 if(config?.clearfire){
  const artwork=artworks[reveal.stage],title=artwork?.title||'Design '+(reveal.stage+1);
  if($('design-title').textContent!==title)$('design-title').textContent=title;
  const theme=$('design-theme');
  theme.textContent=artwork?.theme||'';
  theme.hidden=!artwork?.theme;
  const url=commerceURL(artwork?.sourceUrl),link=$('design-product');
  const visible=!!url&&reveal.coverages[reveal.stage]===1;
  link.hidden=!visible;if(visible&&link.getAttribute('href')!==url)link.href=url;
 }

 if(!artEnquiry)return;
 const stage=reveal.stage,complete=reveal.coverages[stage]===1&&!paint.active&&!session.ball,interacting=session.phase==='dragging';
 // The Robbie Gard paint loop never updates artwork UI. Notify ART only when its presentation state changes.
 if(artPresentation?.stage===stage&&artPresentation.complete===complete&&artPresentation.interacting===interacting)return;
 artPresentation={stage,complete,interacting};
 artEnquiry.update({artwork:artworks[stage],number:stage+1,total:reveal.images,complete,interacting});
}
function draw(){if(!geometry||!session||selecting)return;const counted=reportedLaunches.get(session)||0;for(const e of session.events.filter(e=>e.type==='launch'&&!e.automatic&&e.id>counted)){if(!paintingIds.has(session)){
  paintingIds.set(session,eventUUID());
  // The reporting protocol uses this event for a painting session's first action.
  activity('start_painting_click',sessionSongId,paintingIds.get(session));
 }activity('paintball_launch',sessionSongId,paintingIds.get(session));reportedLaunches.set(session,e.id);}
 if(!session.ball&&session.phase!=='dragging'){
  if(reveal.complete)session.phase='complete';
  else if(reveal.awaitingNextImpact&&!nextSource)session.phase='settling';
  else if(paint.complete)session.phase='ready';
  else if(paint.launches>=13)session.phase='settling';
 }
 updateArtPresentation();
 const destination=purchase.update(session.launches);$('buy').hidden=!destination||!!navigation?.duplicates(destination);if(destination)$('buy').href=destination;else $('buy').removeAttribute('href');refreshRail();
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
 if(session.manual)onboarding.launchedManually();
 else if(session.phase==='dragging')onboarding.interact();
 const handoff=reveal.awaitingNextImpact;
 if(handoff&&session.phase==='dragging')handoffCueDismissed=true;
 const showHandoffCue=handoff&&nextSource&&paint.complete&&!handoffCueDismissed&&session.phase==='ready';
 const cue=onboarding.stage==='play'&&playerReady?'play':
  showHandoffCue||(onboarding.stage==='launcher'&&session.tutorial&&session.phase==='ready')?'drag':'';
 let x=geometry.ready.x-11,y=geometry.ready.y-9;
 if(cue==='play'){const r=frame.getBoundingClientRect();x=r.left+49;y=r.bottom+1;}
 updateCue(cue,x,y,handoff&&handoffCueDismissed);
 if(session.clock-impactAt>.65)marker.hidden=true;
}
function loop(now){raf=0;if(disposed||document.hidden)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;const t=performance.now(),misses=session.misses;session.tick(dt);paintAccumulator+=dt;if(paintAccumulator>=1/PAINT.stepHz){paint.step(Math.min(.1,paintAccumulator));paintAccumulator=0;if(paint.dirty)renderPaint();}if(session.misses>misses)message('Miss — no design revealed. Let the ball pass, then aim again.');draw();frameCosts.push(performance.now()-t);if(frameCosts.length>600)frameCosts.shift();if(session.phase==='dragging'||session.phase==='flight'||session.phase==='intro'||session.recoilAge<.55||paint.active||bursts.length)raf=requestAnimationFrame(loop);else last=0;}
function wake(){if(!raf&&!disposed&&!document.hidden){last=0;raf=requestAnimationFrame(loop);}}
async function select(next,replay=false,preservePurchase=replay){
 if(selecting)return;artEnquiry?.reset();artPresentation=null;selecting=true;$('error').hidden=true;const version=++token;++renderId;
 for(const id of ['next','replay','save'])$(id).disabled=true;grab.disabled=true;
 if(session&&!archivedSessions.has(session)){transitionLog.push(...session.events.map(e=>({...e,songId:sessionSongId})));archivedSessions.add(session);}
 if(!replay){if(session)transitionLog.push({type:'next',songId:sessionSongId,nextSongId:entries[next].id});frame?.remove();frame=null;playerReady=false;}
 if(transitionLog.length>500)transitionLog.splice(0,transitionLog.length-500);
 session?.dispose();if(raf)cancelAnimationFrame(raf);raf=0;last=0;bursts.splice(0).forEach(b=>b.node.remove());paintAccumulator=0;updateCue('',0,0);
 handoffCueDismissed=false;
 steel.reset();coverage=0;scene.style.setProperty('--progress',0);const sg=$('surface').getContext('2d');sg.clearRect(0,0,$('surface').width,$('surface').height);if(config?.clearfire){sg.fillStyle='#000';sg.fillRect(0,0,$('surface').width,$('surface').height);}else sg.drawImage(plaster,0,0,$('surface').width,$('surface').height);gloss.getContext('2d').clearRect(0,0,gloss.width,gloss.height);marker.hidden=true;projectile.hidden=trail.hidden=true;
 field?.dispose();field=null;assistanceHistory=[];source=previousSource=nextSource=null;
 artworks=songArtworks(entries[next]);const reviewDesign=config?.clearfire?.preview?Number(params.get('design')):0;const selectedReview=Number.isInteger(reviewDesign)&&reviewDesign>=1&&reviewDesign<=artworks.length;if(selectedReview)artworks=[artworks[reviewDesign-1]];reveal=new ProgressiveReveal(artworks.length);updateArtworkCounter();stageStartLaunch=0;scene.classList.remove('complete','settled');
 try{
 completion.nextAvailable=nextSongIndex(entries,next)!==null;if(!await completion.reset()||version!==token)return;
 index=next;const entry=entries[index];if(!artEnquiry&&config.catalogue.art?.enabled)artEnquiry=new ArtworkEnquiry({root:scene,frame:object,settings:config.catalogue.art,catalogue:config.catalogue,artist:config.bandName||entry.artist.name,galleryURL:config.artPublicUrl||''});navigation=artistNavigation(config.catalogue,entry,effectiveBandcamp(entry,config.catalogue.art?.musicMode==='master'?null:config.bandcampArtistUrl));renderArtistNavigation($('artist-custom-links'),navigation.links);$('next').hidden=!completion.nextAvailable;actionTiming.reset();const promotion=Array.isArray(config.catalogue.artistLinks)?null:config.catalogue.promotion;const merch=commerceURL(promotion?.url||entry.actions?.merchUrl||''),merchURL=navigation.duplicates(merch)?null:merch;$('buy-merch').textContent=promotion?.url?promotion.title:'BUY MERCH';$('buy-merch').hidden=!merchURL;if(merchURL)$('buy-merch').href=merchURL;else $('buy-merch').removeAttribute('href');onboarding.reset(replay);purchase.select(entry,preservePurchase);$('buy').hidden=!purchase.update(0)||navigation.duplicates(purchase.url);refreshRail(true);message('Loading artwork…');
 const loaded=await image(artworkURL(artworks[0]).href);if(version!==token||disposed)return;
 source=coveredArtwork(loaded);source.steelArtwork=loaded;
 void prepareNextArtwork(artworks[1],version);
 if(worker){const bitmaps=await Promise.all([createImageBitmap(source),createImageBitmap(relief)]);if(version!==token){bitmaps.forEach(x=>x.close());return;}worker.postMessage({type:'source',source:bitmaps[0],relief:bitmaps[1]},bitmaps);}
 let seed=384;field=new LivingField(source,{key:'c1:'+entry.artwork.id,w:360,h:360*source.naturalHeight/source.naturalWidth,random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)});
 paint=new CinematicPaint(field);if(selectedReview){field.cover.fill(1);paint.complete=true;}
 const playerLoaded=(!replay||!frame)?createManualPlayer(entry,version):Promise.resolve();
 coverage=0;session=null;measure();session=new LauncherSession(geometry,onHit);sessionSongId=entry.id;impact=null;marker.hidden=true;lastForecast=forecast=null;scene.classList.remove('complete');
 updateLove(progress.favourite(entry));$('save').setAttribute('aria-pressed',progress.favourite(entry));icon($('save').querySelector('.glyph'),'heart',progress.favourite(entry));$('current-game').href=published?config.publicUrl:'/?edition=enhanced&band='+encodeURIComponent(config.bandId)+'&snapshot='+snapshot;
 $('credits').textContent='Artwork: '+(entry.artwork.credit||'owner-supplied artwork')+'. '+[entry.audio.attribution,entry.audio.license,'C1 physical collision study. Music playback is independent.'].filter(Boolean).join(' ');
 await playerLoaded;if(version!==token||disposed)return;
 session.start();
 if(!playerReady)onboarding.interact();
 message(onboarding.stage==='play'?'Press Play to hear the song.':'Pull back the fireball and release to burn through.');
 return true;
 }finally{if(version===token){selecting=false;for(const id of ['next','replay','save'])$(id).disabled=false;draw();}}
}
// Bandcamp does not expose playback state to this cross-origin page.
function guideAfterPlayerInteraction(){
 if(!playerReady||disposed||onboarding.stage!=='play')return;
 onboarding.interact();
 message('Pull back the fireball and release to burn through.');
 draw();
}
on(window,'blur',()=>setTimeout(()=>{
 if(frame&&document.activeElement===frame)guideAfterPlayerInteraction();
},0));
installLauncherInput({region:document.querySelector('.launcher-stage'),grab,session:()=>session,geometry:()=>geometry,draw,wake,message,signal:abort.signal});
on(grab,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','Enter','Escape'].includes(e.key)||!['ready','dragging'].includes(session.phase))return;e.preventDefault();if(e.key==='Escape'){session.cancel();draw();return;}if(session.pointer===null&&session.begin('keyboard',0,0,geometry.maxPullY)&&reveal.awaitingNextImpact)handoffCueDismissed=true;if(e.key===' '||e.key==='Enter'){if(Math.hypot(session.pull.x,session.pull.y)<8)session.move('keyboard',0,geometry.maxPullY*.60);session.release('keyboard');wake();}else session.move('keyboard',session.pull.x+(e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0),session.pull.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0));draw();});
on($('buy-merch'),'click',()=>activity('merch_click',sessionSongId));
$('buy').dataset.cta='song-purchase';
on(scene,'click',e=>{
 const link=e.target.closest('a[href]');
 if(!link||!sessionSongId||e.defaultPrevented)return;
 if(link.matches('.art-plaque-action')){
  const artwork=artworkAnalytics();
  if(artwork)activity('artwork_action_clicked',sessionSongId,null,artwork);
  return;
 }
 if(link.dataset.artistLink||link.dataset.cta||link.id==='buy-merch'){
  const url=reportingDestination(link.href),label=(link.getAttribute('aria-label')||link.textContent).trim().replace(/\s+/g,' ').slice(0,80);
  if(url&&label)activity('cta_clicked',sessionSongId,null,{label,url});
 }
 if(link.dataset.cta==='song-purchase')activity('buy_click',sessionSongId);
 else if(link.dataset.artistLink==='link-legacy-promotion')activity('merch_click',sessionSongId);
 else if(link.dataset.artistLink&&new URL(link.href).hostname.endsWith('.bandcamp.com'))activity('bandcamp_visit_click',sessionSongId);
});
on($('replay'),'click',()=>{if(!entries?.length||selecting)return;activity('replay_click',sessionSongId);select(index,true).catch(fail);});on($('next'),'click',()=>{if(!entries?.length||selecting)return;const exiting=sessionSongId;(()=>{const next=nextSongIndex(entries,index);return next===null?Promise.resolve(false):select(next,false,false);})().then(selected=>{if(selected)activity('next_click',exiting);}).catch(fail);});
on($('save'),'click',()=>{const saved=progress.toggleFavourite(entries[index]);activity(saved.value?'love_add':'love_remove',sessionSongId);$('save').setAttribute('aria-pressed',saved.value);icon($('save').querySelector('.glyph'),'heart',saved.value);updateLove(saved.value);message(saved.value?'Loved — added to favourites on this device.':'Removed from favourites.');});
const shareDialog=$('share-dialog'),shareURL=$('share-url'),shareFeedback=$('share-feedback');
function shareFallback(details){shareURL.value=details.url;$('share-note').textContent=details.privateLink?'This is a local preview. It only opens on the same Wi-Fi as this computer.':'Copy this link to share ClearFire.';shareFeedback.textContent='';shareDialog.showModal();shareURL.focus();shareURL.select();}
on($('share'),'click',()=>{const sharedSong=sessionSongId;activity('share_click',sharedSong);offerShare(navigator,shareDetails(location.href),message,shareFallback).then(result=>{if(result==='native')activity('share_api_resolved',sharedSong);});});
on($('share-close'),'click',()=>shareDialog.close());
on($('share-copy'),'click',async()=>{shareURL.focus();shareURL.select();shareURL.setSelectionRange(0,shareURL.value.length);try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(shareURL.value);}else if(!document.execCommand('copy'))throw Error('Clipboard unavailable');activity('share_copy',sessionSongId);shareFeedback.textContent='Link copied. '+(shareDetails(shareURL.value).privateLink?'Same Wi-Fi required.':'');}catch{shareFeedback.textContent='Automatic copy is unavailable. Touch and hold the selected link, then choose Copy.';shareURL.focus();shareURL.select();}});
on(document,'visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0;session?.cancel();}else{draw();wake();}});
on(window,'pagehide',()=>{disposed=true;steel.dispose();token++;artEnquiry?.dispose();completion.dispose();cueVersion++;cueAnimation?.cancel();cancelAnimationFrame(raf);worker?.terminate();session?.dispose();field?.dispose();observer?.disconnect();tutorial.dispose();abort.abort();projectile.remove();trail.remove();});
function fail(e){$('error').hidden=false;$('error').textContent='C1 preview unavailable: '+e.message;}
(async()=>{if(!/^[a-f0-9-]{36}$/.test(snapshot))throw Error('Invalid snapshot');const r=await fetch(published?'band.json':'/api/previews/'+snapshot,{cache:'no-store'});if(!r.ok)throw Error('Saved preview unavailable');config=await r.json();if(config.clearfire)configureBrand();initialiseAnalytics(config);try{if(published)throw Error('Published metadata is included');const meta=await(await fetch('/cinematic/artist-link.json?snapshot='+snapshot,{cache:'no-store'})).json();if(meta.bandId===config.bandId)config.bandcampArtistUrl=meta.bandcampArtistUrl;}catch{}const ambient=await loadAmbientMusic(config);entries=await eligibleCatalogue(withAmbientMusic(config.catalogue,ambient),{allowSilentMaster:config.catalogue.art?.musicMode==='master',available:async entry=>{const sequence=songArtworks(entry);if(config.clearfire?.sharedDesigns)return sequence.length>0&&sequence.length<=SHARED_DESIGN_LIMIT;if(sequence.length>ARTWORK_LIMIT)return false;for(const artwork of sequence){const response=await fetch(artworkURL(artwork),{method:'HEAD',cache:'force-cache',signal:AbortSignal.timeout(5000)});if(!response.ok)return false;}return true;}});if(!entries.length)throw Error('No playable artwork entry');[plaster,relief]=await Promise.all([image('assets/browser/plaster-b1.webp').then(linenBlank),image('assets/browser/paint-relief-b1.webp')]);
 const firstArtist=entries[0].artist,name=config.bandName||(typeof firstArtist==='string'?firstArtist:firstArtist?.name);
 if(name){$('artist-name').textContent=name;$('artist-plaque').title=name;$('artist-plaque').style.setProperty('--name-length',Array.from(name).length);$('artist-plaque').hidden=false;}
 await select(0);observer=new ResizeObserver(measure);observer.observe(stage);
 window.c1={inputForTarget:(u,v)=>inputForTarget(u,v,geometry),get state(){return{artworks:{images:reveal.images,stage:reveal.stage+1,coverages:[...reveal.coverages],overall:reveal.overall,completed:reveal.completed,awaitingNextImpact:reveal.awaitingNextImpact,awaitingSecondImpact:reveal.stage===0&&reveal.awaitingNextImpact,assistance:[...assistanceHistory,paint.state.assistance]},completion:completion.phase,artworkCrop:source?.sourceCrop||null,onboarding:onboarding.stage,phase:selecting?'loading':session.phase,launches:selecting?0:session.launches,hits:selecting?0:session.hits,misses:session.misses,coverage,pull:{...session.pull},ball:session.ball&&structuredClone(session.ball),events:structuredClone(session.events),impact,geometry:structuredClone(geometry),tutorial:session.tutorial,iframe:frame?.src||'',playerReady,selecting,songId:entries[index].id,artworkId:entries[index].artwork.id,activity:[...transitionLog,...(archivedSessions.has(session)?[]:session.events.map(e=>({...e,songId:sessionSongId})))],frameCosts:[...frameCosts],renderCosts:[...renderCosts],purchase:{visible:!$('buy').hidden,url:$('buy').getAttribute('href')},materialWorker:false,paint:paint.state,shadedPixels:material.shadedPixels,renderPending:appliedRender!==renderId,debug,forecast:forecast&&structuredClone(forecast.contact),impactVisible:bursts.length>0};},projectUV(u,v){return project(pointOnPlane(geometry.plane,u,v),geometry.camera);}};
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
 node.innerHTML='<canvas width="90" height="90" aria-hidden="true"></canvas>';bursts.push({node,born:performance.now()});if(bursts.length>PAINT.maxEffects)bursts.shift().node.remove();
}
function drawBurst(){for(let i=bursts.length-1;i>=0;i--){const b=bursts[i],age=(performance.now()-b.born)/1000;if(age>=.9){b.node.remove();bursts.splice(i,1);continue;}b.node.style.opacity=reduced.matches?'0':'1';if(!reduced.matches)drawImpact(b.node.firstChild,age);}}

function updateCue(cue,x,y,immediate=false){
 if(requestedCue===cue){if(tutorial.node.dataset.cue===cue){tutorial.node.style.left=x+'px';tutorial.node.style.top=y+'px';}return;}
 requestedCue=cue;const v=++cueVersion;cueAnimation?.cancel();
 (async()=>{
  if(!immediate&&!tutorial.node.hidden&&!reduced.matches){cueAnimation=tutorial.node.animate([{opacity:1},{opacity:0}],{duration:150,fill:'forwards'});try{await cueAnimation.finished;}catch{}if(v!==cueVersion)return;cueAnimation.cancel();}
  tutorial.node.hidden=true;if(!cue||v!==cueVersion)return;
  tutorial.node.dataset.cue=cue;tutorial.node.style.left=x+'px';tutorial.node.style.top=y+'px';tutorial.node.hidden=false;
  if(!reduced.matches){cueAnimation=tutorial.node.animate([{opacity:0},{opacity:1}],{duration:200});try{await cueAnimation.finished;}catch{}}
 })();
}

function updateLove(selected){$('save').setAttribute('aria-label',selected?'Love it — remove song from favourites':'Love it — add song to favourites');$('save').title=selected?'Remove from favourites':'Add to favourites';}

function createManualPlayer(entry,version){
 if(entry.audio.kind==='master-ambient'){
  const note=document.createElement('p');note.className='ambient-unavailable';
  note.textContent='Ambient music unavailable. You can still play.';
  frame=null;playerReady=false;document.querySelector('.player-slot').replaceChildren(note);
  return Promise.resolve();
 }
 const url=manualEmbed(entry.audio.src),current=document.createElement('iframe');current.id='bandcamp';current.title='Official Bandcamp player — '+(entry.audio.title||entry.title);current.referrerPolicy='no-referrer';frame=current;playerReady=false;
 const loaded=new Promise(resolve=>{const timer=setTimeout(resolve,25000);current.addEventListener('load',()=>{clearTimeout(timer);if(version!==token||frame!==current||disposed)return resolve();playerReady=true;resolve();},{once:true});});
 on(current,'focus',()=>{if(frame===current)guideAfterPlayerInteraction();});
 current.src=url;document.querySelector('.player-slot').replaceChildren(current);return loaded;
}

function configureBrand(){
 const logo=$('clearfire-logo'),settings=config.clearfire;
 const name=config.bandName||'ClearFire',brand={name,tagline:settings.tagline,demo:settings.demo};
 $('manufacturer-name').textContent=config.bandName||'ClearFire';
 steel.setBrand(brand);
 if(typeof settings.fireVideo==='string'&&/^\.\/media\/fire-[a-f0-9]{64}\.mp4$/.test(settings.fireVideo))
  steel.setVideo(new URL(settings.fireVideo,location.href).href);
 if(settings.logo){
  const url=new URL(settings.logo,location.href),directory=new URL('./media/',location.href);
  if(url.origin===directory.origin&&url.pathname.startsWith(directory.pathname)){
   logo.src=url.href;logo.hidden=false;
   logo.decode().then(()=>steel.setBrand({...brand,logo})).catch(()=>{});
  }
 }
 $('clearfire-tagline').textContent=settings.demo?'Illustrative wildlife stencil':settings.tagline||'';
 $('clearfire-tagline').hidden=!$('clearfire-tagline').textContent;
}
