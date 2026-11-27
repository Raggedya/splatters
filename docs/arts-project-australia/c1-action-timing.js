// Artwork and playback completion are separate signals. The current Bandcamp
// integration supplies no verified ended signal, so only the approved fallback
// is active. A future supported provider may explicitly wire playbackEnded().
export class ActionTiming{
 constructor(show,{supportsPlaybackEnded=false}={}){this.show=show;this.supportsPlaybackEnded=supportsPlaybackEnded;this.reset();}
 reset(){this.artworkFinished=false;this.playbackFinished=false;this.presented=false;this.reason=null;}
 present(reason){if(this.presented)return false;this.presented=true;this.reason=reason;this.show(reason);return true;}
 artworkComplete(overallCoverage){if(overallCoverage!==1)return false;this.artworkFinished=true;return this.present('artwork-completion-fallback');}
 playbackEnded(){if(!this.supportsPlaybackEnded)return false;this.playbackFinished=true;return this.present('verified-playback-ended');}
}
