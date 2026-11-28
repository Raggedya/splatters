// Local 5B geometry. Artwork fitting and projectile bounds are separate systems.
import {PAINTBALL} from './ball-renderer.js';
export const BALL_SCALE=1.25,FLIGHT_INSET=Math.ceil((PAINTBALL.flightRadius+PAINTBALL.rimExtent)*BALL_SCALE),AIM_INSET=Math.ceil((PAINTBALL.restRadius+PAINTBALL.rimExtent)*BALL_SCALE);
export function contain(iw,ih,w,h){const scale=Math.min(w/iw,h/ih);return{x:(w-iw*scale)/2,y:(h-ih*scale)/2,w:iw*scale,h:ih*scale};}
export function launcher(w,h){const range=Math.min(h*.35,h-150,w*.85),shift=Math.max(0,Math.min(h*.025,30-AIM_INSET-2));return{range,origin:{x:w/2,y:Math.max(90,h-range-30+shift)}};}
export function stretch(start,point,origin,w,h,range){
 let x=point.x-start.x,y=point.y-start.y;
 const length=Math.hypot(x,y),factor=length>range?range/length:1;x*=factor;y*=factor;
 return{x:Math.max(AIM_INSET-origin.x,Math.min(w-AIM_INSET-origin.x,x)),y:Math.max(AIM_INSET-origin.y,Math.min(h-AIM_INSET-origin.y,y))};
}
// Match the old portrait's energy scale, NOT the new fullscreen height.
export function energyHeight(w,h){return Math.min(w*.84,h*.582)*1.5;}
export function power(distance,range){const t=Math.max(0,Math.min(1,(distance-7)/Math.max(1,range-7)));return Math.sin(t*Math.PI/2)**1.15;}
