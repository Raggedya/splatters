import {compactEmbed,bandcamp} from './runtime/studio/model.js';

export function configuredEntry(entry,{allowSilentMaster=false}={}){
 if(!entry?.id||entry.enabled===false||entry.published===false||entry.unavailable||entry.audio?.unavailable||!entry.artwork?.src)return false;
 if(allowSilentMaster&&entry.audio?.kind==='master-ambient')return true;
 if(entry.audio?.kind!=='bandcamp-embed')return false;
 try{if(entry.audio.trackUrl&&!bandcamp(entry.audio.trackUrl))return false;compactEmbed(entry.audio.src);return true;}catch{return false;}
}
export async function eligibleCatalogue(catalogue,{available=async()=>true,allowSilentMaster=false}={}){
 const candidates=(catalogue||[]).filter(entry=>configuredEntry(entry,{allowSilentMaster})).slice(0,10),accepted=new Array(candidates.length).fill(false);let cursor=0;
 await Promise.all(Array.from({length:Math.min(3,candidates.length)},async()=>{while(cursor<candidates.length){const i=cursor++;try{accepted[i]=!!await available(candidates[i]);}catch{}}}));
 const ids=new Set();return candidates.filter((entry,i)=>{if(!accepted[i]||ids.has(entry.id))return false;ids.add(entry.id);return true;});
}
export function nextSongIndex(entries,index){return entries?.length>1?(index+1)%entries.length:null;}
