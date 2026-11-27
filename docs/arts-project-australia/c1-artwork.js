// Keep the approved physical canvas proportions independently of upload shape.
export const CANVAS_WIDTH=1280,CANVAS_HEIGHT=1280,CANVAS_ASPECT=CANVAS_WIDTH/CANVAS_HEIGHT;
export function coverRect(iw,ih,w,h){
 if(![iw,ih,w,h].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid artwork dimensions');
 const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale;
 return {sx:(iw-sw)/2,sy:(ih-sh)/2,sw,sh,scale};
}
export function drawCover(g,image,w,h){const r=coverRect(image.naturalWidth||image.width,image.naturalHeight||image.height,w,h);g.drawImage(image,r.sx,r.sy,r.sw,r.sh,0,0,w,h);return r;}
export function coveredArtwork(image){
 const c=document.createElement('canvas');c.width=CANVAS_WIDTH;c.height=CANVAS_HEIGHT;
 const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);const crop=drawCover(g,image,c.width,c.height);
 Object.defineProperties(c,{naturalWidth:{value:c.width},naturalHeight:{value:c.height},sourceCrop:{value:crop}});return c;
}
