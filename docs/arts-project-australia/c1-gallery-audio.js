// One soundtrack per gallery: artwork navigation does not restart playback.
export function createGalleryAudio(src,{document:doc=globalThis.document,onPlaying=()=>{}}={}){
 const root=doc.createElement('div'),audio=doc.createElement('audio'),play=doc.createElement('button'),note=doc.createElement('span');
 root.className='gallery-audio';audio.controls=true;audio.loop=true;audio.preload='auto';audio.src=src;
 audio.setAttribute('aria-label','Gallery music');play.type='button';play.textContent='Play music';play.hidden=true;
 note.setAttribute('role','status');note.hidden=true;
 root.append(audio,play,note);let disposed=false;
 async function start(){
  try{await audio.play();if(!disposed){play.hidden=true;note.hidden=true;}}
  catch(error){if(disposed)return;if(error.name==='NotAllowedError'){play.hidden=false;note.hidden=true;}else{note.textContent='Music unavailable';note.hidden=false;play.hidden=true;}}
 }
 play.addEventListener('click',()=>void start());
 audio.addEventListener('playing',()=>{play.hidden=true;note.hidden=true;onPlaying();});
 audio.addEventListener('error',()=>{note.textContent='Music unavailable';note.hidden=false;play.hidden=true;});
 return{root,audio,start,dispose(){disposed=true;audio.pause();audio.removeAttribute('src');audio.load();root.remove();}};
}
