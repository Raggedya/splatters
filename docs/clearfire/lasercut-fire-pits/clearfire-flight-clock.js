// Feed the unchanged ATELIER swept-collision solver small steps. Keep debt
// across visible frames instead of throwing away time after a slow paint frame.
export class FlightClock {
 constructor({step=1/120,maxSteps=240}={}){this.step=step;this.maxSteps=maxSteps;this.reset();}
 reset(now=null){this.last=now;this.accumulator=0;this.steps=0;}
 advance(now,tick){
  if(this.last===null){this.last=now;return 0;}
  this.accumulator+=Math.max(0,(now-this.last)/1000);this.last=now;
  let count=0;
  while(this.accumulator+1e-10>=this.step&&count<this.maxSteps){
   tick(this.step);this.accumulator=Math.max(0,this.accumulator-this.step);count++;
  }
  this.steps+=count;return count*this.step;
 }
}
