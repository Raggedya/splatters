// Gate B: static material/composition study. No session, flight or gameplay handlers.
import{LivingField}from'/engine/living-field.js';
import{icon}from'/engine/floating-controls.js';
import{paintStudy}from'./wet-material.js';
const params=new URLSearchParams(location.search),snapshot=params.get('snapshot')||'2541643d-8818-4396-a30e-e3da420321a3',requested=Number(params.get('surface')??32),level=[0,32,50,100].includes(requested)?requested:32;
const stage=['fresh','running','settled','complete'].includes(params.get('paint'))?params.get('paint'):(level===100?'complete':'running');
const full=level===100||stage==='complete';
const $=id=>document.getElementById(id),scene=document.querySelector('.scene');
let source,plaster,relief,field,study,coverage=0,observer,disposed=false;
const image=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
async function main(){
 if(!/^[a-f0-9-]{36}$/.test(snapshot))throw Error('Invalid preview snapshot');
 const r=await fetch('/api/previews/'+snapshot,{cache:'no-store'});if(!r.ok)throw Error('Saved preview is unavailable');const config=await r.json(),entry=config.catalogue?.entries?.find(e=>e.audio.kind==='bandcamp-embed');if(!entry)throw Error('This snapshot has no official Bandcamp entry');
 const artwork=new URL(entry.artwork.src,location.origin+'/');artwork.searchParams.set('preview',snapshot);if(artwork.origin!==location.origin||!artwork.pathname.startsWith('/studio-assets/'))throw Error('Unexpected artwork reference');
 source=await image(artwork.href);plaster=await image('assets/browser/plaster-b1.webp');relief=await image('assets/browser/paint-relief-b1.webp');
 for(const e of document.querySelectorAll('.elastic'))e.src='assets/browser/elastic-b1.webp';
 const gloss=document.createElement('canvas');gloss.id='wet-lighting';gloss.setAttribute('aria-label','Separate neutral wet-paint relief lighting');$('surface').after(gloss);
 const stateLinks=document.createElement('nav');stateLinks.className='study-links';stateLinks.setAttribute('aria-label','Static material studies');
 for(const [state,label]of [['fresh','Fresh'],['running','Running'],['settled','Settled'],['complete','100%']]){const a=document.createElement('a');a.href='?paint='+state+(state==='complete'?'&surface=100':'&surface=50');a.textContent=label;if(stage===state)a.setAttribute('aria-current','page');stateLinks.append(a);}document.querySelector('footer').prepend(stateLinks);
 const provider=new URL(entry.audio.src);if(provider.origin!=='https://bandcamp.com'||!provider.pathname.startsWith('/EmbeddedPlayer/'))throw Error('Unsupported player');
 // Official embed palette parameters only; the provider renders its own controls.
 // Existing album identifier/size stay unchanged. No playback inspection/control.
 provider.pathname=provider.pathname.replace(/bgcol=[a-f0-9]{6}/i,'bgcol=181a1b').replace(/linkcol=[a-f0-9]{6}/i,'linkcol=d5b575');
 $('bandcamp').src=provider.href;$('bandcamp').title='Official Bandcamp player — '+entry.title;
 $('current-game').href='/?edition=enhanced&band='+encodeURIComponent(config.bandId)+'&snapshot='+snapshot;
 $('credits').textContent='Artwork: '+(entry.artwork.credit||'owner-supplied artwork')+'. '+entry.audio.attribution+'. '+entry.audio.license+'. Gate B is a static design review, not a connected game. Bandcamp playback is independent.';
 for(const[id,name]of[['save','heart'],['share','share'],['replay','replay'],['next','next']])icon($(id).querySelector('.glyph'),name);
 // Render static examples using the unchanged organic material/mask implementation.
 // These sample deposits are not user gameplay or reported achievements.
 if(level>0&&!full){let seed=872;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);field=new LivingField(source,{key:'gate-b-static:'+entry.artwork.id,w:360,h:360*source.naturalHeight/source.naturalWidth,random});
  // Same deposits in each study, sampled at fixed ages; no live simulation.
  const count=level===32?8:13;
  for(let n=0;n<count;n++){const a=n*2.39996,rad=Math.min(.32,Math.sqrt(n)*.067),x=field.w*(.5+Math.cos(a)*rad),y=field.h*(.41+Math.sin(a)*rad);field.deposit(x,y,field.w*(n===0?.18:.105));}
  const steps=stage==='fresh'?6:stage==='running'?85:115;
  for(let k=0;k<steps;k++)field.step(.04,0,field.time+.04);
 }
 coverage=full?1:0;
 scene.classList.toggle('complete',full);$('start').hidden=level!==0||full;
 const buy=entry.purchase;if(full&&buy?.verified&&buy.url){const u=new URL(buy.url);if(u.protocol==='https:'&&/(^|\.)bandcamp\.com$/.test(u.hostname)){const a=$('buy');a.href=u.href;a.hidden=false;}}
 observer=new ResizeObserver(render);observer.observe(document.querySelector('.artwork-stage'));render();
 window.gateB={staticPrototype:true,stage,requestedLevel:level,get coverage(){return coverage;},artworkSrc:source.src,bandId:config.bandId,songId:entry.id,originalSize:[source.naturalWidth,source.naturalHeight],get material(){return study?.stats;},get renderSize(){return[$('surface').width,$('surface').height];},fidelity(){const c=$('surface'),ref=document.createElement('canvas');ref.width=c.width;ref.height=c.height;ref.getContext('2d').drawImage(source,0,0,c.width,c.height);const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data,b=ref.getContext('2d').getImageData(0,0,c.width,c.height).data;let differences=0;for(let i=0;i<a.length;i++)differences+=a[i]!==b[i];return{differences,channels:a.length,domain:'unprojected base artwork only; independent lighting intentionally changes displayed pixels'};}};
}
function render(){if(!source||disposed)return;const area=document.querySelector('.artwork-stage').getBoundingClientRect(),ratio=source.naturalWidth/source.naturalHeight,width=Math.max(20,Math.min(area.width-32,(area.height-35)*ratio)),height=width/ratio;scene.style.setProperty('--canvas-width',width+'px');scene.style.setProperty('--canvas-height',height+'px');const c=$('surface'),dpr=Math.min(devicePixelRatio,2);c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);const g=c.getContext('2d'),gloss=$('wet-lighting');gloss.width=c.width;gloss.height=c.height;
 if(full||field){study=paintStudy(source,relief,field,full,c.width,c.height);coverage=study.coverage;}
 if(full)g.drawImage(source,0,0,c.width,c.height);else{g.drawImage(plaster,0,0,c.width,c.height);if(study)g.drawImage(study.colour,0,0);}
 if(study)gloss.getContext('2d').drawImage(study.lighting,0,0);
 scene.style.setProperty('--progress',coverage);$('number').textContent=String(full?100:Math.floor(coverage*100));
}
window.addEventListener('pagehide',()=>{disposed=true;observer?.disconnect();field?.dispose();},{once:true});
main().catch(e=>{const el=$('error');el.hidden=false;el.textContent='Visual preview unavailable: '+e.message;});
