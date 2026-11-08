import {commerceURL,enquiryEmail,publishedArtistLinks} from './runtime/studio/model.js';
import {artworkPlaqueDetails} from './c1-artwork-details.js';

export function artworkPlaqueLink(artwork,links){
 const url=commerceURL(artwork.sourceUrl);
 if(url){
  const source=new URL(url),pathname=source.pathname.replace(/\/+$/,'');
  const product=/\/(?:products?|product-page|p)\/[^/]+$/i.test(pathname);
  const generic=!pathname||/^\/(?:collections(?:\/[^/]+)?|pages\/[^/]+|shop|store|contact|about|gallery|artworks?|paintings|prints)$/i.test(pathname)||
   /\.(?:png|jpe?g|gif|webp|svg|avif)$/i.test(pathname)||links.some(link=>{
    const candidate=new URL(link.url);
    return candidate.origin===source.origin&&candidate.pathname.replace(/\/+$/,'')===pathname;
   });
  if(product||!generic)return {url,label:'Shop this artwork'};
 }
 const store=links.find(link=>link.icon==='shop'||/\b(?:shop|store)\b/i.test(link.title));
 if(store)return {url:store.url,label:'Visit the artist’s shop'};
 const contact=links.find(link=>/\b(?:contact|enquir(?:e|y|ies)|inquir(?:e|y|ies))\b/i.test(link.title));
 return contact?{url:contact.url,label:'Enquire about this artwork'}:null;
}

export function enquiryLink({email,artist,number,title,galleryURL}){
 if(!enquiryEmail(email))throw Error('Invalid artwork enquiry email.');
 const artwork=title?.trim()||'Artwork '+number;
 const subject='sPlatters ART Enquiry — '+artist+' — '+artwork;
 const body=['Hello,','','I have been viewing the following artwork in the sPlatters gallery and would like to enquire about it.','',
  'Artist: '+artist,'Artwork: '+artwork,'Gallery: '+(galleryURL||'Private Studio preview — this gallery has not been published.'),'',
  'Could you please provide further information about availability and purchasing?','','Thank you.'].join('\r\n');
 return 'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
}

export class ArtworkEnquiry{
 constructor({root,frame,settings,artist,galleryURL,catalogue,delay=2000}){
  this.artist=artist;this.settings=settings;this.galleryURL=galleryURL;this.delay=delay;
  this.current=null;this.timer=null;this.suppressed=false;
  this.button=document.createElement('button');
  this.button.type='button';this.button.setAttribute('aria-haspopup','dialog');
  this.plaque=settings.retractablePlaque===true;
  if(this.plaque){
   this.links=publishedArtistLinks(catalogue);
   const slot=document.createElement('div');slot.id='artwork-plaque';slot.inert=true;slot.dataset.position='closed';
   this.plaqueSlot=slot;
   const face=document.createElement('div');face.className='art-plaque-face';
   this.button.className='art-plaque-info';
   const details=document.createElement('span');details.className='art-plaque-details';
   this.fields=['number','title','dimensions','price'].map(name=>{
    const field=document.createElement('span');field.className='art-plaque-'+name;
    if(name==='title')this.button.prepend(field);else details.append(field);
    return [name,field];
   });
   this.button.append(details);
   this.trolley=document.createElement('a');this.trolley.className='art-plaque-trolley';this.trolley.hidden=true;
   this.trolley.target='_blank';this.trolley.rel='noopener noreferrer';
   this.trolley.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 3h3l3 12h12l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/></svg>';
   face.append(this.button,this.trolley);slot.append(face);frame.append(slot);
  }else{
   this.button.id='art-enquire';this.button.textContent=settings.enquiries?'ENQUIRE ABOUT THIS ARTWORK':'ABOUT THIS ARTWORK';
   this.button.hidden=true;root.append(this.button);
  }
  this.panel=document.createElement('dialog');this.panel.id='art-card';this.panel.setAttribute('aria-labelledby','art-card-title');
  const heading=document.createElement('h2');heading.id='art-card-title';
  const artistLine=document.createElement('p');artistLine.className='art-card-artist';
  const information=document.createElement('p');information.className='art-card-information';
  const source=document.createElement('a');source.className='art-send art-source';source.textContent='View artwork at source';
  source.hidden=true;source.target='_blank';source.rel='noopener noreferrer';
  const send=document.createElement('a');send.className='art-send';send.textContent='SEND ENQUIRY';
  send.target='_blank';send.rel='noopener noreferrer';
  const note=document.createElement('p');note.className='art-mail-note';note.textContent='Your email app opens a draft for you to review and send.';
  send.hidden=note.hidden=!settings.enquiries;
  const close=document.createElement('button');close.type='button';close.textContent='Close';close.className='art-close';
  this.panel.append(heading,artistLine,information,source,send,note,close);
  this.heading=heading;this.artistLine=artistLine;this.information=information;this.send=send;this.source=source;
  this.button.onclick=()=>this.open();
  close.onclick=()=>this.panel.close();
  this.panel.onclick=event=>{
   if(event.target!==this.panel)return;
   const box=this.panel.getBoundingClientRect();
   if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)this.panel.close();
  };
  document.body.append(this.panel);
 }
 hide(immediate=false){
  clearTimeout(this.timer);this.timer=null;
  if(this.plaque){
   this.plaqueSlot.inert=true;
   if(immediate)this.plaqueSlot.dataset.position='closed';
   else if(this.plaqueSlot.dataset.position==='open')this.plaqueSlot.dataset.position='retracting';
  }else{
   this.button.hidden=true;this.button.classList.remove('art-visible');
  }
  if(this.panel.open)this.panel.close();
 }
 reset(){this.hide(true);this.current=null;this.suppressed=false;}
 update({artwork,number,total,complete,interacting}){
  const key=artwork.id+':'+artwork.revision+':'+number;
  if(this.current?.key!==key){
   this.reset();this.current={key,artwork,number};
   if(this.plaque){
    const details=artworkPlaqueDetails(artwork,number,total);
    this.current.title=details.title;
    for(const [name,field] of this.fields){field.textContent=details[name];field.hidden=!details[name];}
    const title=details.title||'Artwork '+number;
    this.button.setAttribute('aria-label','About this artwork: '+title);
    this.button.title=title;
    const destination=artworkPlaqueLink(artwork,this.links);
    this.trolley.hidden=!destination;
    if(destination){
     this.trolley.href=destination.url;
     this.trolley.setAttribute('aria-label',destination.label);
     this.trolley.title=destination.label;
    }else this.trolley.removeAttribute('href');
   }
  }
  if(this.plaque){
   if(!complete||interacting){this.hide();return;}
   if(this.timer!==null||this.plaqueSlot.dataset.position==='open')return;
   this.timer=setTimeout(()=>{
    this.timer=null;this.plaqueSlot.dataset.position='open';this.plaqueSlot.inert=false;
   },2500);
   return;
  }
  if(interacting&&complete){this.suppressed=true;this.hide();return;}
  if(!complete||this.suppressed){this.hide();return;}
  if(this.timer!==null||!this.button.hidden)return;
  const expected=this.current;
  this.timer=setTimeout(()=>{
   this.timer=null;
   if(this.current!==expected||this.suppressed)return;
   this.button.hidden=false;
   this.button.classList.add('art-visible');
  },this.delay);
 }
 open(){
  if(!this.current||this.button.hidden||this.plaqueSlot?.inert||this.panel.open)return;
  const {artwork,number}=this.current,title=this.current.title||artwork.title?.trim()||'Artwork '+number;
  this.heading.textContent=title;this.artistLine.textContent=this.artist;
  this.information.textContent=artwork.information||'';this.information.hidden=!artwork.information;
  const destination=this.plaque&&commerceURL(artwork.sourceUrl);
  this.source.hidden=!destination;
  if(destination)this.source.href=destination;else this.source.removeAttribute('href');
  if(this.settings.enquiries)this.send.href=enquiryLink({email:this.settings.email,artist:this.artist,number,title,galleryURL:this.galleryURL});
  this.panel.showModal();
 }
 dispose(){this.reset();(this.plaqueSlot||this.button).remove();this.panel.remove();}
}

