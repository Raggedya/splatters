import {ambientConfiguration,AMBIENT_FILENAME,bandcampMusicPair} from './runtime/studio/ambient-music.js';
import {externalLinkKey} from './runtime/studio/model.js';

export async function loadAmbientMusic(config,{location=globalThis.location,fetcher=fetch}={}){
 if(config.catalogue.art?.musicMode!=='master')return null;
 const scope=config.musicPreviewScope;
 const endpoint=new URL(scope==='local'||scope==='sandbox'?'/studio/ambient-music/'+scope+'.json':'../'+AMBIENT_FILENAME,location.href);
 try{
  const response=await fetcher(endpoint,{cache:'no-cache',signal:AbortSignal.timeout(4000),redirect:'error'});
  if(!response.ok)return null;
  return ambientConfiguration(await response.json());
 }catch{return null;}
}

export function withAmbientMusic(catalogue,music){
 if(catalogue.art?.musicMode!=='master')return catalogue.entries;
 return catalogue.entries.map(entry=>{
  if(entry.audio?.kind!=='master-ambient')return {...entry,audio:{kind:'master-ambient'},purchase:null};
  const audio=music?{kind:'bandcamp-embed',src:music.src,trackUrl:music.trackUrl,destination:music.destination,
   title:music.title,revision:music.revision,attribution:'Official Bandcamp player',license:'Official embedded playback; no audio is hosted by sPlatters.'}:entry.audio;
  return {...entry,audio,purchase:null};
 });
}

export function effectiveBandcamp(entry,artistDestination){
 const audio=entry.audio;
 if(audio?.kind!=='bandcamp-embed'||audio.resolvedFrom&&externalLinkKey(audio.resolvedFrom)!==externalLinkKey(audio.trackUrl))return null;
 const fallback=bandcampMusicPair(audio);
 if(!fallback)return null;
 return [audio.destination,entry.actions?.bandcampUrl,artistDestination].filter(Boolean)
  .map(destination=>bandcampMusicPair({...audio,destination})).find(Boolean)||fallback;
}
