import {drawCover} from './c1-artwork.js';
import {manufacturerMetal,firepitBadge} from './clearfire-brand-metal.js';

const SIZE=112;
const clamp=value=>Math.max(0,Math.min(1,value));
const palette=[[3,2,3],[27,4,4],[100,13,3],[198,42,3],[255,110,8],[255,203,48],[255,250,205]];
const colours=Array.from({length:256},(_,index)=>{
 const position=index*(palette.length-1)/255,first=Math.floor(position),ratio=position-first;
 return palette[first].map((value,channel)=>Math.round(value+(palette[Math.min(palette.length-1,first+1)][channel]-value)*ratio));
});
const random=(x,y)=>{const hash=Math.imul(x,374761393)+Math.imul(y,668265263);return ((Math.imul(hash^(hash>>>13),1274126177)>>>0)&65535)/65535;};
function noise(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
 const sx=u*u*(3-2*u),sy=v*v*(3-2*v);
 const a=random(ix,iy)*(1-sx)+random(ix+1,iy)*sx,b=random(ix,iy+1)*(1-sx)+random(ix+1,iy+1)*sx;
 return a*(1-sy)+b*sy;
}
const surface=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});

export class SteelReveal{
 constructor(output,reduced){
  this.output=output;this.reduced=reduced;
  this.flame=surface(SIZE,SIZE);this.context=this.flame.getContext('2d');this.frame=this.context.createImageData(SIZE,SIZE);
  this.steel=surface(384,384);this.blackSteel=surface(384,384);this.composite=surface(384,384);
  this.cover=surface(384,384);this.setBrand({});
  this.updateMotion=()=>{this.syncVideo();if(document.hidden)this.stop();else if(this.coverage>0)this.draw(performance.now(),true);};
  document.addEventListener('visibilitychange',this.updateMotion);reduced.addEventListener('change',this.updateMotion);
 }
 setVideo(src){
  if(this.video||!src)return;
  const video=document.createElement('video');
  video.muted=video.defaultMuted=true;video.loop=true;video.playsInline=true;
  video.setAttribute('playsinline','');video.preload='metadata';
  // Keep the decoder attached without adding a visible player or hitbox.
  video.setAttribute('aria-hidden','true');video.tabIndex=-1;
  Object.assign(video.style,{position:'fixed',top:'0',left:'0',width:'1px',height:'1px',opacity:'0.001',pointerEvents:'none'});
  document.body.append(video);
  this.video=video;
  video.addEventListener('loadeddata',()=>{if(this.coverage>0)this.draw(performance.now(),true);});
  video.addEventListener('error',()=>{this.videoFailed=true;if(this.coverage>0)this.draw(performance.now(),true);});
  video.src=src;
 }
 syncVideo(){
  const v=this.video;
  if(!v)return;
  const playing=this.coverage>0&&!document.hidden&&!this.reduced.matches&&!this.videoFailed;
  if(playing===this.wantsVideo)return;
  this.wantsVideo=playing;
  if(!playing){v.pause();return;}
  v.play().catch(error=>{if(this.wantsVideo&&error.name!=='AbortError')this.videoFailed=true;});
 }
 drawVideo(g,now){
  const v=this.video;
  if(!v||this.videoFailed||v.readyState<2||!v.videoWidth||(!this.reduced.matches&&v.paused))return false;
  if(v.currentTime!==this.videoTime){this.videoTime=v.currentTime;this.videoAdvance=now;}
  if(!this.reduced.matches&&now-this.videoAdvance>1800)return false;
  const scale=384/Math.min(v.videoWidth,v.videoHeight);
  const w=scale*v.videoWidth,h=scale*v.videoHeight;
  try{
   g.drawImage(v,(384-w)/2,(384-h)/2,w,h);
   // Some decoders advance the media clock before providing drawable frames.
   // Probe only while starting/retrying, never during steady-state playback.
   if(!this.videoDrawable){
    if(g.getImageData(192,192,1,1).data[3]===0){
     if((this.videoProbeAt??=now)+1800<now){this.videoFailed=true;v.pause();}
     return false;
    }
    this.videoDrawable=true;
   }
   return true;
  }catch{return false;}
 }
 setBrand({name='ClearFire',logo,tagline='',demo=false}){
  const g=this.cover.getContext('2d'),size=this.cover.width;
  const tone=g.createLinearGradient(0,0,size,size);
  tone.addColorStop(0,'#19191b');tone.addColorStop(.48,'#0e0e10');tone.addColorStop(1,'#17171a');
  g.fillStyle=tone;g.fillRect(0,0,size,size);
  for(let y=0;y<size;y++){
   g.fillStyle='rgba(189,180,158,'+(.018+random(y,2)*.038)+')';
   g.fillRect(0,y,size*(.5+random(y,9)*.5),1);
  }
  for(const x of [18,size-18])for(const y of [18,size-18]){
   const bolt=g.createRadialGradient(x-2,y-2,0,x,y,7);
   bolt.addColorStop(0,'#8a837c');bolt.addColorStop(.6,'#272629');bolt.addColorStop(1,'#050507');
   g.fillStyle=bolt;g.beginPath();g.arc(x,y,7,0,Math.PI*2);g.fill();
  }
  const stamp=(label,y,pixels,weight)=>{
   g.textAlign='center';g.font=weight+' '+pixels+'px system-ui';
   g.fillStyle='#050506';g.fillText(label,size/2,y+2,310);
   const finish=g.createLinearGradient(0,y-pixels,0,y+5);
   finish.addColorStop(0,'#8f8b87');finish.addColorStop(.5,'#565351');finish.addColorStop(1,'#2b292a');
   g.fillStyle=finish;g.fillText(label,size/2,y,310);
  };
  const metal=manufacturerMetal(logo,name);
  firepitBadge(metal,name);
  if(logo&&!demo&&logo.naturalWidth){
   const scale=Math.min(290/metal.steel.width,104/metal.steel.height);
   const w=metal.steel.width*scale,h=metal.steel.height*scale;
   g.drawImage(metal.steel,(size-w)/2,185-h/2,w,h);
  }else if(demo){
   stamp('LASERCUT',177,55,800);stamp('F I R E   P I T S',216,23,650);
  }else stamp(name.toUpperCase(),198,Math.min(46,530/Math.max(name.length,1)),750);
  if(tagline||demo){
   g.fillStyle='#51453a';g.fillRect(56,239,272,1);
   stamp(demo?'YOU DREAM IT, WE BUILD IT':tagline,266,13,600);
  }
  if(this.mask)this.draw(performance.now(),true);
 }
 prepare(image){
  const g=this.steel.getContext('2d'),size=this.steel.width;
  g.clearRect(0,0,size,size);drawCover(g,image,size,size);
  g.globalCompositeOperation='source-in';
  const steel=g.createLinearGradient(0,0,size,size);
  steel.addColorStop(0,'#3b4142');steel.addColorStop(.34,'#232829');steel.addColorStop(.52,'#353938');steel.addColorStop(1,'#111516');
  g.fillStyle=steel;g.fillRect(0,0,size,size);g.globalCompositeOperation='source-over';
  const black=this.blackSteel.getContext('2d');
  black.clearRect(0,0,size,size);black.drawImage(this.steel,0,0);
  black.globalCompositeOperation='source-in';black.fillStyle='#000';black.fillRect(0,0,size,size);
  black.globalCompositeOperation='source-over';
  this.image=image;this.ignited=0;
 }
 update(image,mask,coverage,settings,complete){
  if(this.image!==image)this.prepare(image);
  this.mask=mask;this.coverage=coverage;this.settings=settings;
  this.syncVideo();
  if(complete&&!this.ignited)this.ignited=performance.now();
  // The existing animation loop consumes the newest mask. Do not also force
  // a second complete flame/video composite from every paint update.
  if(!this.raf||this.reduced.matches)this.draw(performance.now(),true);
 }
 draw(now,force=false){
  if(!this.mask)return;
  if(force||now-this.last>=41){
   const target=this.output.getContext('2d'),width=this.output.width,height=this.output.height;
   target.drawImage(this.cover,0,0,width,height);
   if(this.coverage>0){
    const time=this.reduced.matches?1.3:now*.001,boost=this.ignited?Math.max(0,1-(now-this.ignited)/1050):0;
    const intensity=.62+.55*(this.settings.flame??.7)+boost*.22;
    const g=this.composite.getContext('2d');
    g.globalCompositeOperation='source-over';g.clearRect(0,0,384,384);
    const video=this.drawVideo(g,now);
    if(!video){
     if(!this.lastFlame||now-this.lastFlame>=38){this.paintFlame(time,intensity);this.lastFlame=now;}
     g.drawImage(this.flame,0,0,384,384);
    }
    this.last=now;
    g.drawImage(video?this.blackSteel:this.steel,0,0);
    g.globalCompositeOperation='destination-in';g.drawImage(this.mask,0,0,384,384);
    g.globalCompositeOperation='source-over';target.drawImage(this.composite,0,0,width,height);
   }
  }
  if(this.coverage>0&&!this.reduced.matches&&!document.hidden&&!this.raf)
   this.raf=requestAnimationFrame(time=>{this.raf=0;this.draw(time);});
  else if(this.reduced.matches||this.coverage<=0)this.stop();
 }
 paintFlame(time,intensity){
  const bytes=this.frame.data,cool=this.settings.preset==='gold',deep=this.settings.preset==='ember';
  for(let y=0;y<SIZE;y++){
   const rise=1-y/(SIZE-1),fade=1-rise*.89;
   for(let x=0;x<SIZE;x++){
    const column=x/(SIZE-1);
    const sway=.26*Math.sin(rise*7-time*1.7+column*11);
    const turbulence=noise(column*7+sway,rise*3-time*2.7)*.65+noise(column*16+sway,rise*7-time*5.3)*.35;
    const tongue=Math.max(0,(turbulence-rise*.53)*intensity);
    const strength=clamp(tongue*1.47+fade*.20);
    const [r,g,b]=colours[Math.round(strength*255)],offset=(y*SIZE+x)*4;
    bytes[offset]=r;bytes[offset+1]=Math.min(255,g*(cool?1.24:deep?.67:1));bytes[offset+2]=b;bytes[offset+3]=255;
   }
  }
  const embers=Math.round(16*(this.settings.embers??.45));
  for(let i=0;i<embers;i++){
   const progress=(time*(.20+i%3*.065)+i*.173)%1,x=Math.round((.12+(i*.38197%1)*.76+.035*Math.sin(time+i))*SIZE),y=Math.round((.98-progress*.94)*SIZE);
   const offset=(y*SIZE+x)*4;
   bytes[offset]=255;bytes[offset+1]=Math.round(235-progress*130);bytes[offset+2]=Math.round(65*(1-progress));
  }
  this.context.putImageData(this.frame,0,0);
 }
 stop(){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;}
 reset(){this.stop();this.mask=null;this.image=null;this.coverage=0;this.last=0;this.lastFlame=0;this.syncVideo();}
 dispose(){this.reset();if(this.video){this.video.removeAttribute('src');this.video.load();this.video.remove();this.video=null;}document.removeEventListener('visibilitychange',this.updateMotion);this.reduced.removeEventListener('change',this.updateMotion);}
}
