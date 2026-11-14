export class FirstPlaySequence {
 reset(replay=false){this.stage=replay&&this.stage!=='play'?'launcher':'play';}
 interact(){if(this.stage==='play')this.stage='launcher';}
 launchedManually(){this.stage='done';}
}
