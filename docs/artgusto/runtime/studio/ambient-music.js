import {bandcamp,compactEmbed,visitURL} from './model.js';

export const AMBIENT_FILENAME='ambient-music.json';

export function bandcampMusicPair({trackUrl,src,destination}={}){
 const track=bandcamp(trackUrl);
 if(!track)return null;
 try{
  const url=new URL(track),player=compactEmbed(src);
  const kind=url.pathname.split('/')[1];
  if(!new URL(player.src).pathname.split('/').some(part=>part.startsWith(kind+'=')))return null;
  url.search='';url.hash='';url.pathname=url.pathname.replace(/\/$/,'');
  const link=destination?visitURL(destination):url.origin+'/';
  if(!link||new URL(link).origin!==url.origin)return null;
  return {trackUrl:url.href,src:player.src,destination:link};
 }catch{return null;}
}

export function ambientConfiguration(value){
 if(value?.version!==1||typeof value.revision!=='string'||!/^[a-f0-9-]{36}$/.test(value.revision)||
  !Number.isFinite(Date.parse(value.updatedAt))||typeof value.musician!=='string'||value.musician.length>200||
  typeof value.title!=='string'||value.title.length>200||typeof value.destination!=='string'||!value.destination)return null;
 const pair=bandcampMusicPair(value);
 return pair?{version:1,revision:value.revision,updatedAt:value.updatedAt,musician:value.musician,title:value.title,...pair}:null;
}
