// A record is earned only by completing an same design.
export class FireScore {
 constructor(storage){this.storage=storage;this.key='';this.best=null;this.committed=false;}
 reset(collection){
  this.key='clearfire:screen-shots:v1:'+JSON.stringify(collection);
  this.best=null;this.committed=false;
  try{const n=JSON.parse(this.storage?.getItem(this.key)||'null');if(Number.isSafeInteger(n)&&n>0)this.best=n;}catch{}
 }
 update(shots,progress,eligible=true){
  const percent=progress>=1?100:Math.min(99,Math.floor(Math.max(0,progress)*100));
  let record=false;
  if(eligible&&progress>=1&&Number.isSafeInteger(shots)&&shots>0&&!this.committed){
   this.committed=true;
   if(this.best===null||shots<this.best){this.best=shots;record=true;try{this.storage?.setItem(this.key,JSON.stringify(shots));}catch{}}
  }
  return {shots,percent,best:this.best,record};
 }
}

export function installScore(counter,storage){
 const score=new FireScore(storage),panel=document.createElement('section');
 panel.className='clearfire-score';panel.setAttribute('aria-label','ClearFire challenge: reveal this design in the fewest shots');
 const count=counter.parentElement;
 count.before(panel);panel.append(count);count.classList.add('score-designs');count.querySelector('.complete-label').textContent='DESIGNS';
 for(const [id,label] of [['shots','SHOTS FIRED'],['percent','COMPLETED'],['best','BEST · SHOTS']]){
  const cell=document.createElement('div');cell.className='score-cell';
  const value=document.createElement('strong');value.id='score-'+id;value.textContent=id==='best'?'—':id==='percent'?'0%':'0';
  const caption=document.createElement('span');caption.textContent=label;cell.append(value,caption);panel.append(cell);
 }
 const track=document.createElement('div');track.className='score-track';track.innerHTML='<i></i>';track.setAttribute('role','progressbar');track.setAttribute('aria-label','Current design completed');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');panel.append(track);
 const note=document.createElement('div');note.className='score-note';note.textContent='FEWEST SHOTS WINS';panel.append(note);
 const values=['shots','percent','best'].map(id=>panel.querySelector('#score-'+id));let previous='';
 return {
  reset(collection){score.reset(collection);panel.classList.remove('new-record');previous='';},
  update(shots,progress,eligible){
   const s=score.update(shots,progress,eligible),stamp=JSON.stringify(s);if(stamp===previous)return;previous=stamp;
   values[0].textContent=s.shots;values[1].textContent=s.percent+'%';values[2].textContent=s.best??'—';
   track.firstChild.style.width=s.percent+'%';track.setAttribute('aria-valuenow',String(s.percent));
   if(s.record)panel.classList.add('new-record');
   note.textContent=panel.classList.contains('new-record')?'NEW PERSONAL BEST':s.percent===100?'DESIGN COMPLETE':'FEWEST SHOTS WINS';
   panel.title='Best = fewest shots to reveal this design. Misses count. Saved on this browser when storage is available.';
  }
 };
}
