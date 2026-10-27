import {purchaseDestination,visitURL} from './runtime/studio/model.js';
export function artistDestination(config,entry){
 if(entry?.actions&&Object.hasOwn(entry.actions,'bandcampUrl'))return visitURL(entry.actions.bandcampUrl);
 const value=entry?.artist?.bandcampArtistUrl||config?.catalogue?.bandcampArtistUrl||config?.bandcampArtistUrl;
 // Explicit artist/shared destinations take precedence. Otherwise use only
 // the hostname of an already-verified song purchase URL, never an artist name.
 if(value){try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.bandcamp\.com$/.test(u.hostname)&&/^(\/|\/(track|album)\/[^/]+\/?)$/.test(u.pathname)&&!u.hash)return u.href;}catch{}}
 const purchase=purchaseDestination(entry);return purchase?new URL(purchase).origin+'/':null;
}
// One pair of real controls is reparented only while invisible and inert.
export class CompletionUI {
 constructor({scene,launcher,nav,root,buy,next,visit,merch=null,reduced}){Object.assign(this,{scene,launcher,nav,root,buy,next,visit,merch,reduced});this.version=0;this.phase='playing';this.animations=new Set();}
 setPhase(phase){this.phase=phase;this.scene.dataset.completion=phase;}
 async fade(el,from,to,ms){if(this.reduced.matches){el.style.opacity=to;return;}const a=el.animate([{opacity:from},{opacity:to}],{duration:ms,easing:'ease',fill:'forwards'});this.animations.add(a);try{await a.finished;el.style.opacity=to;}catch{}finally{a.cancel();this.animations.delete(a);}}
 cancel(){this.version++;for(const a of this.animations)a.cancel();this.animations.clear();}
 async finish(){if(this.phase!=='playing')return;const v=this.version;this.setPhase('settling');
  if(!this.reduced.matches)await new Promise(r=>setTimeout(r,700));if(v!==this.version)return;
  this.setPhase('launcher-fade');this.buy.inert=this.next.inert=true;
  await Promise.all([this.fade(this.launcher,1,0,1200),this.fade(this.buy,1,0,250),this.fade(this.next,1,0,250)]);if(v!==this.version)return;
  this.next.hidden=this.nextAvailable===false;const group=this.root.querySelector('.completion-pair');if(this.merch&&!this.merch.hidden){group.append(this.buy,this.merch,this.visit,this.next);this.root.classList.add('with-merch');}else{group.append(this.buy,this.next);this.root.classList.remove('with-merch');}this.root.hidden=false;this.root.inert=true;this.buy.style.opacity=this.next.style.opacity='1';this.setPhase('actions-fade');
  await this.fade(this.root,0,1,400);if(v!==this.version)return;
  this.buy.inert=this.next.inert=this.root.inert=false;this.setPhase('actions');
 }
 async reset(){this.cancel();const v=this.version;this.setPhase('resetting');this.root.inert=true;this.buy.inert=this.next.inert=true;
  if(!this.root.hidden)await this.fade(this.root,Number(getComputedStyle(this.root).opacity),0,180);if(v!==this.version)return false;
  this.root.hidden=true;this.root.classList.remove('with-merch');this.root.append(this.visit);this.next.hidden=false;this.nav.append(this.next,this.buy);this.buy.style.opacity=this.next.style.opacity='1';this.buy.inert=this.next.inert=false;
  const from=Number(getComputedStyle(this.launcher).opacity);this.setPhase('playing');this.fade(this.launcher,from,1,400);return true;
 }
 dispose(){this.cancel();}
}
