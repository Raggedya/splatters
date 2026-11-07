// SVG paths, not font/emoji glyphs. No image assets or rendering framework.
const paths={play:'M8 5 19 12 8 19Z',pause:'M8 5V19M16 5V19',heart:'M20.4 5.7a5 5 0 0 0-7.1 0L12 7l-1.3-1.3a5 5 0 0 0-7.1 7.1L12 21l8.4-8.2a5 5 0 0 0 0-7.1Z',share:'M12 15V3M8 7l4-4 4 4M6 10H4v11h16V10h-2',next:'M5 5 15 12 5 19ZM19 5v14',burst:'M12 3c1.7 0 .6 4.5 2.4 5.2 1.8.7 4.9-2.7 5.6-1.2.8 1.5-3.6 3.1-3.4 5 .2 2 4.6 3.1 3.5 4.5-1.2 1.3-4.2-1.7-5.9-.7-1.6 1-.4 5.6-2.2 5.2-1.8-.3-.9-4.3-2.6-5.1-1.8-.8-5.4 2-5.9.3-.5-1.7 3.7-2.4 3.8-4.4.1-1.9-3.7-3.8-2.5-5 1.2-1.2 3.4 2.1 5.1 1.2C11.5 7.2 10.3 3 12 3Z'};
paths.replay='M20 4v6h-6M20 10a8 8 0 1 0 .1 4';
export function icon(element,name,filled=false){const key=name+filled;if(element.dataset.icon===key)return;element.dataset.icon=key;const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('fill',filled?'currentColor':'none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.55');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');path.setAttribute('d',paths[name]);svg.append(path);element.replaceChildren(svg);}
// One pointer press owns one burst. Its compatibility click is consumed, not
// interpreted as a fresh action. Keyboard activation explicitly starts anew.
export class PressGate{
 constructor(){this.pointer=null;this.ignoreClick=false;this.seen=new WeakSet();}
 down(e){if(this.seen.has(e))return false;this.seen.add(e);if(e.isPrimary===false||e.button>0||this.pointer!==null)return false;this.pointer=e.pointerId;this.ignoreClick=true;return true;}
 up(e){if(e.pointerId===this.pointer)this.pointer=null;}
 click(e){if(this.ignoreClick){this.ignoreClick=false;return false;}return e.detail===0&&!e.pointerType;}
 key(e){if(e.repeat||![' ','Enter'].includes(e.key))return false;this.ignoreClick=false;return true;}
 cancel(){this.pointer=null;this.ignoreClick=false;}
}
// Bounded cached-field sampling only. Never read pixels back from the screen.
export function darkAt(field,x,y,w,h){if(!field?.source||!field.cover)return false;let sum=0;for(const dx of[-12,0,12])for(const dy of[-6,0,6]){const xx=Math.max(0,Math.min(field.w-1,Math.floor((x+dx)/w*field.w))),yy=Math.max(0,Math.min(field.h-1,Math.floor((y+dy)/h*field.h))),i=yy*field.w+xx,j=i*4;let alpha=Math.max(0,Math.min(1,(field.cover[i]-.1)*3));alpha=alpha*alpha*(3-2*alpha);const luma=(field.source[j]*.2126+field.source[j+1]*.7152+field.source[j+2]*.0722)/255;sum+=(field.complete?luma:1-alpha+alpha*luma);}return sum/9<.48;}
// Presentation only: the paint field remains the sole coverage authority.
export function revealPresentation(field){
 const coverage=Number.isFinite(field?.visibleCoverage)?Math.max(0,Math.min(1,field.visibleCoverage)):0;
 const complete=!!field?.complete,finishing=!complete&&!!field?.finishingAssist;
 return{number:complete?100:Math.min(99,Math.floor(coverage*100)),fraction:complete?1:Math.min(.99,coverage),caption:finishing?'FINISHING…':complete?'ARTWORK COMPLETE':'ARTWORK REVEALED',state:complete?'complete':finishing?'finishing':'revealing'};
}
