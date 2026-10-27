// Isolated lab validation only. Never import this into the game as a playback adapter.
function attributes(text,allowed){const result={},pattern=/\s*([a-z][a-z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/gy;let at=0;while(at<text.length){if(!text.slice(at).trim())break;pattern.lastIndex=at;const m=pattern.exec(text);if(!m||!allowed.includes(m[1])||Object.hasOwn(result,m[1]))throw Error('Unsupported, duplicate or unsafe embed attribute.');result[m[1]]=m[2]??m[3]??'';at=pattern.lastIndex;}return result;}
export function validateEmbed(value){
 if(typeof value!=='string'||value.length>8000)throw Error('Paste official embed code or its player URL, maximum 8000 characters.');
 let src=value.trim(),height=120;
 if(src.startsWith('<')){
  const frame=/^<iframe\b([^>]*)>([\s\S]*?)<\/iframe>$/i.exec(src);if(!frame)throw Error('Use one official iframe only; arbitrary HTML is not accepted.');
  const a=attributes(frame[1],['src','style','width','height','seamless','title','loading']);src=a.src||'';
  if(a.style){for(const rule of a.style.split(';').map(s=>s.trim()).filter(Boolean)){if(!/^(?:border\s*:\s*0(?:px)?|width\s*:\s*(?:\d+px|100%)|height\s*:\s*\d+px)$/i.test(rule))throw Error('Unsupported embed style. Copy the official generated code without custom HTML.');const h=/^height\s*:\s*(\d+)px$/i.exec(rule);if(h)height=Number(h[1]);}}
  if(a.height){if(!/^\d+$/.test(a.height))throw Error('Invalid player height.');height=Number(a.height);}
  const fallback=frame[2].trim();if(fallback){const link=/^<a\b([^>]*)>([^<>]*)<\/a>$/i.exec(fallback);if(!link)throw Error('Unsupported iframe fallback content.');const href=attributes(link[1],['href']).href;let u;try{u=new URL(href);}catch{throw Error('Invalid fallback link.');}if(u.protocol!=='https:'||u.username||u.password||u.port||!/(^|\.)bandcamp\.com$/.test(u.hostname))throw Error('Fallback link must be HTTPS Bandcamp.');}
 }
 if(!/^https:\/\/bandcamp\.com\/EmbeddedPlayer\/[a-z0-9=/-]+\/$/.test(src))throw Error('Use an official HTTPS bandcamp.com/EmbeddedPlayer/ reference. A track page URL is not an embed; use Share/Embed on Bandcamp.');
 const u=new URL(src),seen=new Set(),formats={album:/^\d+$/,track:/^\d+$/,size:/^(small|large)$/,bgcol:/^[a-f0-9]{6}$/,linkcol:/^[a-f0-9]{6}$/,tracklist:/^(true|false)$/,artwork:/^(small|big|none)$/,transparent:/^(true|false)$/,minimal:/^(true|false)$/};
 for(const part of u.pathname.slice('/EmbeddedPlayer/'.length).split('/').filter(Boolean)){const m=/^([a-z]+)=(.+)$/.exec(part);if(!m||!formats[m[1]]?.test(m[2])||seen.has(m[1]))throw Error('Unsupported player parameter. Use a standard official embed; no autoplay or custom script parameters.');seen.add(m[1]);}
 if(!seen.has('album')&&!seen.has('track'))throw Error('The official embed needs an existing album or track identifier.');
 if(!Number.isInteger(height)||height<42||height>700)throw Error('Player height must be 42–700 pixels. Do not clip provider controls.');
 return{src:u.href,height};
}
