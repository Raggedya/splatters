import {publishedArtistLinks,externalLinkKey} from './runtime/studio/model.js';
import {songDestination} from './c1-song-link.js';

export function artistNavigation(catalogue,entry){
 const links=publishedArtistLinks(catalogue),destinations=new Set(links.map(l=>externalLinkKey(l.url))),song=songDestination(entry);
 return{links,songURL:song&&!destinations.has(externalLinkKey(song))?song:null,duplicates:url=>!!url&&destinations.has(externalLinkKey(url))};
}
export function renderArtistNavigation(container,links){
 const fragment=document.createDocumentFragment();
 for(const link of links){const a=document.createElement('a');a.className='artist-link';a.dataset.artistLink=link.id;a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.title=link.title;a.setAttribute('aria-label',link.title);
  const glyph=document.createElement('span');glyph.className='glyph';glyph.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 3h7v7M21 3 10 14M10 5H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/></svg>';
  const label=document.createElement('span');label.className='artist-link-label';label.textContent=link.title;a.append(glyph,label);fragment.append(a);
 }container.replaceChildren(fragment);
}
