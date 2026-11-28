import {automaticShot,makeShot,advanceShot,chooseSplat,successorShot} from './shot.js';

export class PaintSession {
 constructor(field,{random=Math.random,w=300,h=450,mode='classic',physics=null,instantTriple=false,instantClassic=false,introDuration=null}={}){
  if(!['classic','triple'].includes(mode))throw new TypeError('Unknown painting mode');
  this.field=field;this.random=random;this.w=w;this.h=h;this.origin={x:w/2,y:h-Math.min(72,w*.18,h*.18)-12};
  this.phase='awaiting-audio';this.running=false;this.unlocked=false;this.firstLaunches=0;
  this.ball=null;this.pops=0;this.clock=0;this.accumulator=0;this.tutorialAge=0;this.tutorialDismissed=false;
  this.settleRemaining=0;this.events=[];this.paintCosts=[];this.lastSplat=null;this.disposed=false;
  this.mode=mode;this.pending=[];this.chain=null;this.sequenceId=0;this.projectileId=0;this.lastTouch=-Infinity;
  this.peakProjectiles=0;this.peakPending=0;this.overlapCosts=[];this.pendingCosts=[];
  this.physics=physics||{automaticShot,makeShot,advanceShot,successorShot};this.physicsCosts=[];
  this.instantTriple=instantTriple;this.acceptingTap=false;this.instantCosts=[];
  this.instantClassic=instantClassic;this.introDuration=introDuration;this.introDeadline=null;
 }
 get state(){return this.disposed?'disposed':this.unlocked&&!this.running?'paused':this.phase;}
 // Mirrors the approved ArtworkField assist threshold. Do not start a successor
 // between the measured threshold and the next paint update.
 get finishingSoon(){return this.field.finishingAssist||this.field.complete||(this.pops>=(this.field.minimumPops??4)&&this.field.visibleCoverage>=.955);}
 record(event){this.events.push(event);if(this.events.length>200)this.events.splice(0,this.events.length-200);}
 trackPeaks(){this.peakPending=Math.max(this.peakPending,this.pending.length+(this.ball&&this.ball.delayRemaining!==null?1:0));this.peakProjectiles=Math.max(this.peakProjectiles,this.pending.length+(this.ball?1:0));}
 identify(ball,stage=0){return Object.assign(ball,{id:++this.projectileId,stage,sequenceId:stage?this.chain.id:null});}
 resize(w,h,origin){const ow=this.w,oh=this.h;this.w=w;this.h=h;this.origin=origin;for(const ball of [this.ball,...this.pending.map(p=>p.ball)])if(ball){ball.x*=w/ow;ball.y*=h/oh;ball.vx*=w/ow;ball.vy*=h/oh;}}
 confirmAudio(){
  if(this.disposed)return;this.running=true;
  if(!this.unlocked){this.unlocked=true;this.phase='automatic-first-launch';this.ball=this.identify(this.physics.automaticShot(this.origin,this.w,this.h,this.random));this.introDeadline=this.introDuration===null?null:this.clock+this.introDuration;this.firstLaunches++;this.record({type:'automatic-launch',clock:this.clock});this.trackPeaks();}
 }
 pause(){this.running=false;}
 touchLauncher(){if(!this.running||!['tutorial-ready','manual-play'].includes(this.phase)||this.ball||this.pending.length||this.finishingSoon)return false;this.tutorialDismissed=true;this.phase='manual-play';return true;}
 fire(pull){
  if(!this.running||!['tutorial-ready','manual-play'].includes(this.phase)||this.ball||this.pending.length||this.disposed||this.finishingSoon)return false;
  this.touchLauncher();this.chain={id:++this.sequenceId,launched:1,impacts:0,ended:false,reason:null,slots:['flying','available','available']};
  this.ball=this.identify(this.physics.manualShot?this.physics.manualShot(this.origin,pull,this.w,this.h):this.physics.makeShot(this.origin,pull,Math.max(210,this.h*.86)),1);this.lastTouch=-Infinity;
  if(this.mode==='triple')this.phase='chain-flight';this.record({type:'manual-launch',clock:this.clock,sequenceId:this.chain.id,ballId:this.ball.id});this.trackPeaks();return true;
 }
 detonate(ballId=this.ball?.id){
  if(this.acceptingTap||!this.running||!this.ball||ballId!==this.ball.id||this.ball.delayRemaining!==null||this.finishingSoon)return false;
  if(this.ball.automatic){if(this.introDuration===null)return false;this.explode('intro-touch');return true;}
  if(this.instantClassic&&this.mode==='classic'){this.acceptingTap=true;try{this.explode('touch-instant');return true;}finally{this.acceptingTap=false;}}
  if(this.instantTriple&&this.mode==='triple')return this.instantPop();
  if(this.mode==='triple'&&this.clock-this.lastTouch<.08)return false;
  const frozen=this.ball;frozen.delayRemaining=1;frozen.vx=frozen.vy=0;
  this.record({type:'detonation-armed',clock:this.clock,x:frozen.x,y:frozen.y,ballId:frozen.id,sequenceId:frozen.sequenceId,stage:frozen.stage});
  if(this.mode==='classic'){this.phase='delayed-explosion';this.trackPeaks();return true;}
  this.lastTouch=this.clock;this.pending.push({ball:frozen,at:this.clock+1});this.ball=null;this.chain.slots[frozen.stage-1]='pending';
  if(this.chain.launched<3){
   this.ball=this.identify(this.physics.successorShot(frozen,this.w,this.h,this.random),++this.chain.launched);this.chain.slots[this.ball.stage-1]='flying';
   this.record({type:'successor-launch',clock:this.clock,sequenceId:this.chain.id,ballId:this.ball.id,stage:this.ball.stage,x:this.ball.x,y:this.ball.y,vx:this.ball.vx,vy:this.ball.vy});
  }else{this.chain.ended=true;this.chain.reason='three-touches';}
  this.settleChainPhase();this.trackPeaks();return true;
 }
 instantPop(){
  const began=performance.now(),previous=this.ball;this.acceptingTap=true;
  try{
   this.record({type:'tap-accepted',clock:this.clock,ballId:previous.id,stage:previous.stage,x:previous.x,y:previous.y});
   // Install the successor synchronously, BEFORE contact-paint preparation.
   // Its velocity is inherited verbatim: no random redirection/energy boost,
   // no frozen predecessor, no queued deadline and no additional render loop.
   this.ball=null;
   if(this.chain.launched<3){
    const speed=Math.hypot(previous.vx,previous.vy),next=this.physics.makeShot(previous,{x:-previous.vx,y:-previous.vy},speed);
    next.vx=previous.vx;next.vy=previous.vy;
    this.ball=this.identify(next,++this.chain.launched);this.chain.slots[this.ball.stage-1]='flying';
   }else{this.chain.ended=true;this.chain.reason='three-touches';}
   this.impact(previous,'touch-instant');
   if(this.finishingSoon){this.cancelSequence('finishing');this.phase='finishing';}
   else{
    if(this.ball)this.record({type:'successor-launch',clock:this.clock,sequenceId:this.chain.id,ballId:this.ball.id,stage:this.ball.stage,x:this.ball.x,y:this.ball.y,vx:this.ball.vx,vy:this.ball.vy});
    this.settleChainPhase();
   }
   this.trackPeaks();return true;
  }finally{this.acceptingTap=false;this.instantCosts.push(performance.now()-began);if(this.instantCosts.length>300)this.instantCosts.shift();}
 }
 impact(ball,reason){
  const size=chooseSplat(this.random,ball.automatic);this.field.deposit(ball.x/this.w*this.field.w,ball.y/this.h*this.field.h,this.field.w*size.fraction);
  this.pops++;this.lastSplat={...size,x:ball.x,y:ball.y,clock:this.clock,automatic:ball.automatic,reason,ballId:ball.id,sequenceId:ball.sequenceId,stage:ball.stage};
  if(this.chain&&ball.sequenceId===this.chain.id){this.chain.impacts++;this.chain.slots[ball.stage-1]='spent';}
  this.record({type:'splat',...this.lastSplat});
  if(ball.automatic){this.introDeadline=null;if(this.introDuration!==null){this.phase='tutorial-ready';this.tutorialAge=0;}else{this.phase='first-splash-settling';this.settleRemaining=.8;}}
 }
 explode(reason){
  const ball=this.ball;if(!ball)return;this.ball=null;this.impact(ball,reason);
  if(!ball.automatic){if(this.chain){this.chain.ended=true;this.chain.reason=reason;}this.settleChainPhase();}
 }
 settleChainPhase(){if(this.ball?.automatic||this.phase==='first-splash-settling')return;this.phase=this.ball?(this.mode==='triple'?'chain-flight':'manual-play'):this.pending.length?'chain-waiting':'manual-play';}
 cancelSequence(reason){
  const ids=[...(this.ball?[this.ball.id]:[]),...this.pending.map(p=>p.ball.id)];this.ball=null;this.pending=[];this.introDeadline=null;
  if(this.chain){this.chain.ended=true;this.chain.reason=reason;this.chain.slots=this.chain.slots.map(s=>['pending','flying'].includes(s)?'cancelled':s);}
  if(ids.length)this.record({type:'sequence-cancelled',reason,clock:this.clock,ballIds:ids});
 }
 setMode(mode){
  if(!['classic','triple'].includes(mode))throw new TypeError('Unknown painting mode');if(this.disposed||mode===this.mode)return;
  this.mode=mode;
  // The single automatic introduction finishes normally even if mode is changed.
  if(this.ball?.automatic||this.phase==='first-splash-settling')return;
  this.cancelSequence('mode-switch');this.chain=null;
  if(this.unlocked&&!this.finishingSoon&&this.phase!=='tutorial-ready')this.phase='manual-play';
 }
 tick(dt){
  if(!this.running||this.disposed)return;const previousClock=this.clock;this.clock+=dt;
  if(this.mode==='triple'&&this.finishingSoon&&!this.field.finishingAssist){this.cancelSequence('finishing');this.phase='finishing';}
  // Absolute deadlines share the paused active clock of physics and wet paint.
  const due=[];this.pending=this.pending.filter(p=>{p.ball.delayRemaining=Math.max(0,p.at-this.clock);if(p.ball.delayRemaining<1e-8){due.push(p);return false;}return true;});
  for(const p of due)this.impact(p.ball,'touch-delay');
  if(this.ball){
   if(this.ball.delayRemaining!==null){this.ball.delayRemaining=Math.max(0,this.ball.delayRemaining-dt);if(this.ball.delayRemaining<1e-8)this.explode('touch-delay');}
   else{const began=performance.now(),flightDt=this.ball.automatic&&this.introDeadline!==null?Math.min(dt,Math.max(0,this.introDeadline-previousClock)):dt,steps=Math.max(1,Math.ceil(flightDt/(1/180)));let ended=false;for(let i=0;i<steps&&this.ball;i++)if(this.physics.advanceShot(this.ball,flightDt/steps,this.w,this.h)){ended=true;break;}this.physicsCosts.push(performance.now()-began);if(this.physicsCosts.length>300)this.physicsCosts.shift();if(ended)this.explode('rest-or-lifetime');if(this.ball?.automatic&&this.introDeadline!==null&&this.clock+1e-8>=this.introDeadline)this.explode('intro-deadline');if(this.ball){this.ball.trail.push({x:this.ball.x,y:this.ball.y});if(this.ball.trail.length>14)this.ball.trail.shift();}}
  }
  if(this.mode==='triple'&&this.chain&&!this.finishingSoon)this.settleChainPhase();
  if(this.phase==='first-splash-settling'){this.settleRemaining-=dt;if(this.settleRemaining<=0){this.phase='tutorial-ready';this.tutorialAge=0;}}
  if(this.phase==='tutorial-ready')this.tutorialAge+=dt;
  this.accumulator+=dt;
  if(this.accumulator>=1/30){
   const began=performance.now(),step=Math.min(this.accumulator,.05);this.field.step(step,this.pops,this.field.time+step);this.field.updateSurface();this.accumulator=0;
   const cost=performance.now()-began;this.paintCosts.push(cost);if(this.paintCosts.length>300)this.paintCosts.shift();
   if((this.field.effects?.length||0)>1){this.overlapCosts.push(cost);if(this.overlapCosts.length>300)this.overlapCosts.shift();}
   if(this.pending.length||(this.ball&&this.ball.delayRemaining!==null)){this.pendingCosts.push(cost);if(this.pendingCosts.length>300)this.pendingCosts.shift();}
   if(this.field.finishingAssist){if(this.ball||this.pending.length)this.cancelSequence('finishing');this.phase=this.field.complete?'complete':'finishing';}
  }
 }
 dispose(){if(this.disposed)return;this.pause();this.cancelSequence('dispose');this.disposed=true;this.phase='disposed';this.field.dispose();}
}
