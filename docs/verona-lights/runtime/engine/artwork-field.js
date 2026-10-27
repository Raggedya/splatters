import {PaintField} from '../vendor/splat-v9/paint.js';
import {installMaterialCache} from './material-cache.js';

// The Splat simulation/material remain unchanged. Policy and final presentation
// are isolated here: renderer-alpha coverage, disclosed assist, clean photo.
export class ArtworkField extends PaintField {
  constructor(image) {
    super(image, {completionThreshold: Infinity, minimumPops: 4});
    this.renderCacheBytes=installMaterialCache(this.material);
    this.assisted = false;
    this.coverageBeforeAssist = null;
    this.assistAge = 0;
    this.finishingAssist = false;
  }
  updateSurface() {
    const changed = this.dirty;
    super.updateSurface();
    if (!changed || !this.material) return;
    // Equivalent fully revealed source area: sum rendered alpha / source alpha.
    // This uses the exact wet renderer's nonlinear opacity and bilinear sampling.
    if (!this.coverageDenominator) {
      let total = 0;
      for (let i=3; i<this.material.source.data.length; i+=4) total+=this.material.source.data[i];
      this.coverageDenominator=total;
    }
    let alpha = 0;
    if (this.complete) this.visibleCoverage=1;
    else {
      for (let i=3; i<this.material.pixels.data.length; i+=4) alpha+=this.material.pixels.data[i];
      this.visibleCoverage=this.coverageDenominator ? alpha/this.coverageDenominator : 0;
    }
  }
  step(dt,pops,now) {
    if (this.complete) {this.settleTime=Math.min(this.settleDuration,this.settleTime+dt);return;}
    super.step(dt,pops,now);
    if (!this.finishingAssist && pops>=this.minimumPops && this.visibleCoverage>=.955) {
      this.finishingAssist=true;
      this.assisted=true;
      this.coverageBeforeAssist=this.visibleCoverage;
    }
    if (!this.finishingAssist) return;
    this.assistAge+=dt;
    // Same finishing rate and duration as baseline Splat, without claiming manual fill.
    for(let i=0;i<this.n;i++) if(this.mask[i]) this.cover[i]=Math.min(1,this.cover[i]+dt*.65);
    this.measure();this.dirty=true;
    if(this.assistAge>1.5) {
      for(let i=0;i<this.n;i++) if(this.mask[i]) this.cover[i]=1;
      this.captureSettling();this.complete=true;this.filled=1;this.visibleCoverage=1;
      this.mass.fill(0);this.wet.fill(0);this.effects=[];this.running.settle();
    }
  }
  draw(g,box) {
    if(!this.complete) return super.draw(g,box);
    if(this.settleTime<this.settleDuration) {
      const t=this.settleTime/this.settleDuration,ease=t*t*(3-2*t),mix=this.settleMix.getContext('2d');
      const w=this.settleMix.width,h=this.settleMix.height;
      mix.clearRect(0,0,w,h);mix.globalCompositeOperation='source-over';mix.globalAlpha=1-ease;
      mix.drawImage(this.settleSnapshot,0,0,w,h);mix.globalCompositeOperation='lighter';mix.globalAlpha=ease;
      mix.drawImage(this.image,0,0,w,h);mix.globalAlpha=1;mix.globalCompositeOperation='source-over';
      g.drawImage(this.settleMix,box.x,box.y,box.w,box.h);
    } else g.drawImage(this.image,box.x,box.y,box.w,box.h);
  }
  dispose() {
    this.running.clear();this.effects=[];
    for(const c of [this.maskCanvas,this.surface,this.finishSurface,this.settleSnapshot,this.settleMix,this.material.native,this.material.cleanCanvas]) c.width=c.height=0;
    this.image=null;
  }
}
