import {publishedArtistLinks,externalLinkKey} from './runtime/studio/model.js';
import {songDestination} from './c1-song-link.js';

export function artistNavigation(catalogue,entry){
 const links=publishedArtistLinks(catalogue),destinations=new Set(links.map(l=>externalLinkKey(l.url))),song=songDestination(entry);
 return{links,songURL:song&&!destinations.has(externalLinkKey(song))?song:null,duplicates:url=>!!url&&destinations.has(externalLinkKey(url))};
}
const brandHosts={
 'instagram.com':'instagram','spotify.com':'spotify','facebook.com':'facebook',
 'youtube.com':'youtube','youtu.be':'youtube','tiktok.com':'tiktok','bandcamp.com':'bandcamp',
};
const externalIcon='<path d="M14 3h7v7M21 3 10 14M10 5H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/>';
const shopIcon='<path d="M2 3h3l3 12h12l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/>';

function artistLinkGlyph(link){
 const glyph=document.createElement('span');
 glyph.className='glyph';
 glyph.setAttribute('aria-hidden','true');
 const {hostname,pathname}=new URL(link.url);
 const brand=Object.keys(brandHosts).find(host=>hostname===host||hostname.endsWith('.'+host));
 if(brand){
  const image=document.createElement('img');
  image.src='assets/browser/chain-icons/brand-'+brandHosts[brand]+'.png';
  image.alt='';
  glyph.append(image);
 }else{
  const shop=link.id==='link-legacy-promotion'||/(^|\/)(shop|store|merch)(\/|$)/i.test(pathname);
  glyph.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+(shop?shopIcon:externalIcon)+'</svg>';
 }
 return glyph;
}

export function renderArtistNavigation(container,links){
 const fragment=document.createDocumentFragment();
 for(const link of links){const a=document.createElement('a');a.className='artist-link';a.dataset.artistLink=link.id;a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.title=link.title;a.setAttribute('aria-label',link.title);
  const glyph=artistLinkGlyph(link);
  const label=document.createElement('span');label.className='artist-link-label';label.textContent=link.title;if(!/\s/.test(link.title))label.classList.add('single-word');a.classList.toggle('long-label',link.title.length>22);a.append(glyph,label);fragment.append(a);
 }container.replaceChildren(fragment);
}
