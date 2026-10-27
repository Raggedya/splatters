export class FirstPlaySequence {
 reset(replay=false){this.stage=replay?'start':'play';}
 confirmMusic(){if(this.stage==='play')this.stage='start';}
 start(){if(this.stage!=='start')return false;this.stage='launcher';return true;}
 launchedManually(){this.stage='done';}
}
