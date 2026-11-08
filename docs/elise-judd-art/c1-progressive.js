// Stage selection is driven only by a successful canvas impact. Rendering and
// elapsed time never advance the image. Each stage owns its existing mask.
export class ProgressiveReveal{
 constructor(images=1){this.images=images;this.stage=0;this.coverages=Array(images).fill(0);}
 update(coverage){this.coverages[this.stage]=Math.max(this.coverages[this.stage],Math.min(1,Math.max(0,coverage)));return this.overall;}
 get awaitingNextImpact(){return this.stage<this.images-1&&this.coverages[this.stage]===1;}
 get completed(){return this.stage+Number(this.coverages[this.stage]===1);}
 successfulImpact(){if(!this.awaitingNextImpact)return false;this.stage++;return true;}
 get overall(){return (this.stage+this.coverages[this.stage])/this.images;}
 get complete(){return this.overall===1;}
}
