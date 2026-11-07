import {enquiryEmail} from './runtime/studio/model.js';

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
 constructor({root,settings,artist,galleryURL,delay=2000}){
  this.artist=artist;this.settings=settings;this.galleryURL=galleryURL;this.delay=delay;
  this.current=null;this.timer=null;this.suppressed=false;
  this.button=document.createElement('button');
  this.button.id='art-enquire';this.button.type='button';
  this.button.textContent=settings.enquiries?'ENQUIRE ABOUT THIS ARTWORK':'ABOUT THIS ARTWORK';
  this.button.hidden=true;this.button.setAttribute('aria-haspopup','dialog');
  this.panel=document.createElement('dialog');this.panel.id='art-card';this.panel.setAttribute('aria-labelledby','art-card-title');
  const heading=document.createElement('h2');heading.id='art-card-title';
  const artistLine=document.createElement('p');artistLine.className='art-card-artist';
  const information=document.createElement('p');information.className='art-card-information';
  const send=document.createElement('a');send.className='art-send';send.textContent='SEND ENQUIRY';
  const note=document.createElement('p');note.className='art-mail-note';note.textContent='Your email app opens a draft for you to review and send.';
  send.hidden=note.hidden=!settings.enquiries;
  const close=document.createElement('button');close.type='button';close.textContent='Close';close.className='art-close';
  this.panel.append(heading,artistLine,information,send,note,close);
  this.heading=heading;this.artistLine=artistLine;this.information=information;this.send=send;
  this.button.onclick=()=>this.open();
  close.onclick=()=>this.panel.close();
  this.panel.onclick=event=>{
   if(event.target!==this.panel)return;
   const box=this.panel.getBoundingClientRect();
   if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)this.panel.close();
  };
  root.append(this.button);document.body.append(this.panel);
 }
 hide(){
  clearTimeout(this.timer);this.timer=null;this.button.hidden=true;this.button.classList.remove('art-visible');
  if(this.panel.open)this.panel.close();
 }
 reset(){this.hide();this.current=null;this.suppressed=false;}
 update({artwork,number,complete,interacting}){
  const key=artwork.id+':'+artwork.revision;
  if(this.current?.key!==key){
   this.hide();this.current={key,artwork,number};this.suppressed=false;
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
  if(!this.current||this.button.hidden)return;
  const {artwork,number}=this.current,title=artwork.title?.trim()||'Artwork '+number;
  this.heading.textContent=title;this.artistLine.textContent=this.artist;
  this.information.textContent=artwork.information||'';this.information.hidden=!artwork.information;
  if(this.settings.enquiries)this.send.href=enquiryLink({email:this.settings.email,artist:this.artist,number,title,galleryURL:this.galleryURL});
  this.panel.showModal();
 }
 dispose(){this.reset();this.button.remove();this.panel.remove();}
}

