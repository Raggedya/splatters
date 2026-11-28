import {bandcamp} from './runtime/studio/model.js';

// Catalogue song destinations only; an artist homepage is not a substitute.
export function songDestination(entry){
 return bandcamp(entry?.audio?.trackUrl)||bandcamp(entry?.bandcampUrl)||bandcamp(entry?.purchase?.url)||null;
}
