import {publishedArtistLinks,externalLinkKey} from './runtime/studio/model.js';
import {makeArtistLinkGlyph} from './runtime/studio/artist-link-icons.js';
import {songDestination} from './c1-song-link.js';

export function artistNavigation(catalogue,entry,featured=null){
 let links=publishedArtistLinks(catalogue);
 if(featured){
  const key=externalLinkKey(featured.destination),host=new URL(featured.destination).hostname;
  links=links.filter(link=>externalLinkKey(link.url)!==key&&
   !(new URL(link.url).hostname===host&&/^(?:bandcamp|visit bandcamp|listen on bandcamp)$/i.test(link.title)));
  links.unshift({id:'link-automatic-bandcamp',title:'BANDCAMP',icon:'bandcamp',url:featured.destination});
 }
 const destinations=new Set(links.map(l=>externalLinkKey(l.url))),song=songDestination(entry);
 return{links,songURL:song&&!destinations.has(externalLinkKey(song))?song:null,duplicates:url=>!!url&&destinations.has(externalLinkKey(url))};
}
const brandHosts={
 'instagram.com':'instagram','spotify.com':'spotify','facebook.com':'facebook',
 'youtube.com':'youtube','youtu.be':'youtube','tiktok.com':'tiktok','bandcamp.com':'bandcamp',
};
function automaticIcon(link){
 const {hostname,pathname}=new URL(link.url);
 const brandHost=Object.keys(brandHosts).find(host=>hostname===host||hostname.endsWith('.'+host));
 if(brandHost)return brandHosts[brandHost];
 return link.id==='link-legacy-promotion'||/(^|\/)(shop|store|merch)(\/|$)/i.test(pathname)?'shop':'external';
}

export function renderArtistNavigation(container,links){
 const fragment=document.createDocumentFragment();
 for(const link of links){const a=document.createElement('a');a.className='artist-link';a.dataset.artistLink=link.id;a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.title=link.title;a.setAttribute('aria-label',link.title);
  const glyph=makeArtistLinkGlyph(link.icon||automaticIcon(link),'assets/browser/chain-icons');
  const label=document.createElement('span');label.className='artist-link-label';label.textContent=link.title;if(!/\s/.test(link.title))label.classList.add('single-word');a.classList.toggle('long-label',link.title.length>22);a.append(glyph,label);fragment.append(a);
 }container.replaceChildren(fragment);
}
