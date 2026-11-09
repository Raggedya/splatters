import {formatVisits} from './c1-visits.js';
export const eventUUID=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
const visitTimeout=30*60*1000;
function visitSession(storage,bandId,uuid,now){
 const key='atelier.visit.'+bandId;
 let sessionId=uuid(),visitorId;
 try{
  const prior=JSON.parse(storage?.getItem(key)||'null');
  if(prior?.id&&Number.isFinite(prior.at)&&now()>=prior.at&&now()-prior.at<visitTimeout)sessionId=prior.id;
  if(storage){
   visitorId=storage.getItem('atelier.tab')||uuid();
   storage.setItem('atelier.tab',visitorId);
  }
 }catch{visitorId=undefined;}
 return {sessionId,visitorId,touch(){try{storage?.setItem(key,JSON.stringify({id:sessionId,at:now()}));}catch{}}};
}
export function reportingDestination(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  url.search='';url.hash='';
  return url.href.length<=600?url.href:null;
 }catch{return null;}
}
export function createTelemetry({config,enabled=false,fetcher=fetch,uuid=eventUUID,storage,now=Date.now,onTotal=()=>{},onUnavailable=()=>{}}){
 let endpoint;try{endpoint=new URL(config.analytics?.endpoint);if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||(endpoint.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(endpoint.hostname)))throw Error();}catch{enabled=false;}
 const visit=enabled?visitSession(storage,config.bandId,uuid,now):null,pending=new Set();
 let receivedTotal=false;
 async function refresh(){if(!enabled)return;try{const r=await fetcher(new URL('/api/visits?band='+encodeURIComponent(config.bandId),endpoint),{cache:'no-store',signal:AbortSignal.timeout(5000)});if(r.ok){const d=await r.json();if(Number.isSafeInteger(d.total)&&d.total>=0){receivedTotal=true;onTotal(d.total);return;}}}catch{}if(!receivedTotal)onUnavailable();}
 function emit(name,songId=null,paintingId=null,context){
  if(!enabled||pending.size>=64)return;
  visit.touch();
  const eventId=name==='gallery_completed'?visit.sessionId+'-completed':uuid();
  const event={schemaVersion:2,eventId,bandId:config.bandId,songId,name,sessionId:visit.sessionId,paintingId,
   ...(name==='page_view'&&visit.visitorId?{visitorId:visit.visitorId}:{}),...(context?{context}:{})};
  const task=(async()=>{for(let attempt=0;attempt<2;attempt++){try{const r=await fetcher(new URL('/api/events',endpoint),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),keepalive:true,signal:AbortSignal.timeout(5000)});if(r.ok){if(name==='page_view')void refresh();return;}if(r.status<500)return;}catch{}}})();pending.add(task);task.finally(()=>pending.delete(task));return task;
 }
 return{emit,refresh,flush:()=>Promise.all([...pending])};
}
let client={emit(){},refresh(){}};
export const activity=(...args)=>client.emit(...args);
export function initialiseAnalytics(config){
 const params=new URLSearchParams(location.search),enabled=document.documentElement.dataset.release==='1'&&!navigator.webdriver&&!['review','preview','debug','test','snapshot'].some(k=>params.has(k));
 let storage;try{storage=sessionStorage;}catch{}
 const el=document.getElementById('visits-total');
 client=createTelemetry({config,enabled,storage,onTotal:total=>{if(el){el.textContent=formatVisits(total);el.style.fontSize=Math.min(10,46/(el.textContent.length*.6))+'px';el.title='Recorded gallery visits';el.setAttribute('aria-label',`${total} public gallery visits`);}},onUnavailable:()=>{if(el){el.title='Visit count unavailable';el.setAttribute('aria-label',el.title);}}});
 client.emit('page_view');void client.refresh();
}
