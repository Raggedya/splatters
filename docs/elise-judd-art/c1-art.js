import {commerceURL,enquiryEmail} from './runtime/studio/model.js';
import {artworkPlaqueDetails} from './c1-artwork-details.js';

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
 constructor({root,frame,settings,artist,galleryURL,delay=2000}){
  this.artist=artist;this.settings=settings;this.galleryURL=galleryURL;this.delay=delay;
  this.current=null;this.timer=null;this.suppressed=false;
  this.button=document.createElement('button');
  this.button.type='button';this.button.setAttribute('aria-haspopup','dialog');
  this.plaque=settings.retractablePlaque===true;
  if(this.plaque){
   this.button.id='artwork-plaque';this.button.inert=true;this.button.dataset.position='closed';
   const slot=document.createElement('span');slot.className='art-plaque-slot';
   const face=document.createElement('span');face.className='art-plaque-face';
   this.fields=['number','title','dimensions','price'].map(name=>{
    const field=document.createElement('span');field.className='art-plaque-'+name;
    if(name==='title'){
     const holder=document.createElement('span');holder.className='art-plaque-title-slot';
     holder.append(field);face.append(holder);
    }else face.append(field);
    return [name,field];
   });
   slot.append(face);this.button.append(slot);frame.append(this.button);
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
   this.button.inert=true;
   if(immediate)this.button.dataset.position='closed';
   else if(this.button.dataset.position==='open')this.button.dataset.position='retracting';
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
    this.button.style.setProperty('--art-title-length',Array.from(title).length);
   }
  }
  if(this.plaque){
   if(!complete||interacting){this.hide();return;}
   if(this.timer!==null||this.button.dataset.position==='open')return;
   this.timer=setTimeout(()=>{
    this.timer=null;this.button.dataset.position='open';this.button.inert=false;
   },300);
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
  if(!this.current||this.button.hidden||this.button.inert||this.panel.open)return;
  const {artwork,number}=this.current,title=this.current.title||artwork.title?.trim()||'Artwork '+number;
  this.heading.textContent=title;this.artistLine.textContent=this.artist;
  this.information.textContent=artwork.information||'';this.information.hidden=!artwork.information;
  const destination=this.plaque&&commerceURL(artwork.sourceUrl);
  this.source.hidden=!destination;
  if(destination)this.source.href=destination;else this.source.removeAttribute('href');
  if(this.settings.enquiries)this.send.href=enquiryLink({email:this.settings.email,artist:this.artist,number,title,galleryURL:this.galleryURL});
  this.panel.showModal();
 }
 dispose(){this.reset();this.button.remove();this.panel.remove();}
}

