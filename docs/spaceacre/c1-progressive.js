// Stage selection is driven only by a successful canvas impact. Rendering and
// elapsed time never advance the image. Each stage owns its existing mask.
export class ProgressiveReveal{
 constructor(images=1){this.images=images===2?2:1;this.stage=0;this.coverages=[0,0];}
 update(coverage){this.coverages[this.stage]=Math.max(this.coverages[this.stage],Math.min(1,Math.max(0,coverage)));return this.overall;}
 get awaitingSecondImpact(){return this.images===2&&this.stage===0&&this.coverages[0]===1;}
 successfulImpact(){if(!this.awaitingSecondImpact)return false;this.stage=1;return true;}
 get overall(){return this.images===1?this.coverages[0]:(this.coverages[0]+this.coverages[1])/2;}
 get complete(){return this.overall===1;}
}
