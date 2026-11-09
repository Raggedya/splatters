import {formatVisits} from './c1-visits.js';
export const eventUUID=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
export function createTelemetry({config,enabled=false,fetcher=fetch,uuid=eventUUID,onTotal=()=>{}}){
 let endpoint;try{endpoint=new URL(config.analytics?.endpoint);if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||(endpoint.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(endpoint.hostname)))throw Error();}catch{enabled=false;}
 const sessionId=uuid(),pending=new Set();
 async function refresh(){if(!enabled)return;try{const r=await fetcher(new URL('/api/visits?band='+encodeURIComponent(config.bandId),endpoint),{cache:'no-store',signal:AbortSignal.timeout(5000)});if(r.ok){const d=await r.json();if(Number.isSafeInteger(d.total)&&d.total>=0)onTotal(d.total);}}catch{}}
 function emit(name,songId=null,paintingId=null){if(!enabled||pending.size>=64)return;const event={schemaVersion:1,eventId:uuid(),bandId:config.bandId,songId,name,sessionId,paintingId};
  const task=(async()=>{for(let attempt=0;attempt<2;attempt++){try{const r=await fetcher(new URL('/api/events',endpoint),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),keepalive:true,signal:AbortSignal.timeout(5000)});if(r.ok){if(name==='page_view')void refresh();return;}if(r.status<500)return;}catch{}}})();pending.add(task);task.finally(()=>pending.delete(task));return task;
 }
 return{emit,refresh,flush:()=>Promise.all([...pending])};
}
let client={emit(){},refresh(){}};
export const activity=(...args)=>client.emit(...args);
export function initialiseAnalytics(config){
 const params=new URLSearchParams(location.search),enabled=document.documentElement.dataset.release==='1'&&!navigator.webdriver&&!['review','preview','debug','test','snapshot'].some(k=>params.has(k));
 client=createTelemetry({config,enabled,onTotal:total=>{const el=document.getElementById('visits-total');if(el){el.textContent=formatVisits(total);el.style.fontSize=Math.min(10,46/(el.textContent.length*.6))+'px';el.setAttribute('aria-label',`${total} public page visits`);}}});
 client.emit('page_view');void client.refresh();
}
