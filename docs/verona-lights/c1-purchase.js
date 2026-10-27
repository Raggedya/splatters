import {purchaseDestination} from './runtime/studio/model.js';
// Replay retains the invitation for this song. Next always starts a new session,
// even when the one-song preview wraps around to the same catalogue entry.
export class SongPurchase {
 constructor({availableFromStart=false}={}){this.availableFromStart=availableFromStart;}
 select(entry,replay=false){const preserve=replay&&entry.id===this.id;this.id=entry.id;this.url=purchaseDestination(entry);if(!preserve)this.unlocked=false;}
 update(launches){if(launches>=2)this.unlocked=true;return (this.availableFromStart||this.unlocked)&&this.url?this.url:null;}
}
