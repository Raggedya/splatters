export function shareDetails(value){
 const url=new URL(value),h=url.hostname;
 const privateLink=h==='localhost'||h==='[::1]'||h.endsWith('.local')||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
 return {url:url.href,title:'sPlatters',text:privateLink?'Local sPlatters preview — only works on the same Wi-Fi.':'Paint the artwork while you listen.',privateLink};
}
export async function offerShare(nav,details,feedback,fallback){
 if(typeof nav.share==='function'){
  try{await nav.share({title:details.title,text:details.text,url:details.url});feedback(details.privateLink?'Share sheet closed — this preview requires the same Wi-Fi.':'Share sheet closed.');return 'native';}
  catch(e){if(e.name==='AbortError'){feedback('Sharing cancelled.');return 'cancelled';}}
 }
 fallback(details);feedback(details.privateLink?'Local preview: copy the link below. Same Wi-Fi required.':'Copy the link below.');return 'fallback';
}
