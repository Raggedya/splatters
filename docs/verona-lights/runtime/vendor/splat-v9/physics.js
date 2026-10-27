// Isolated adaptation of Halftime Heroes' opposite-pull aiming, minimum-pull
// guard and radius-correct reflection. No imports or writes to the baseline.
export const BALL_RADIUS=10;
export function pullVector(start,p,max){const x=p.x-start.x,y=Math.max(0,p.y-start.y),n=Math.hypot(x,y),s=Math.min(1,max/(n||1));return{x:x*s,y:y*s}}
export const loaded=p=>p.y>=8&&Math.hypot(p.x,p.y)>=12;
export function advance(p,dt,w,h){p.vy+=16*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const lo=BALL_RADIUS,hi=w-BALL_RADIUS;while(p.x<lo||p.x>hi){if(p.x<lo){p.x=2*lo-p.x;p.vx=Math.abs(p.vx)}else{p.x=2*hi-p.x;p.vx=-Math.abs(p.vx)}}if(p.y<lo){p.y=2*lo-p.y;p.vy=Math.abs(p.vy)}p.age+=dt;return p.y>h+20||p.age>2.5}
export function launch(origin,pull,speed){const n=Math.hypot(pull.x,pull.y)||1;return{x:origin.x,y:origin.y,vx:-pull.x/n*speed,vy:-pull.y/n*speed,age:0,trail:[]}}
