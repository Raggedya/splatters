// Adapter for the unchanged B.2 renderer: its canvas factory runs on OffscreenCanvas.
import {paintStudy} from './wet-material.js';
globalThis.document={createElement(type){if(type!=='canvas')throw Error('Canvas only');return new OffscreenCanvas(1,1);}};
let source,relief;
self.onmessage=({data:d})=>{try{
 if(d.type==='source'){source?.close();relief?.close();source=d.source;relief=d.relief;return;}
 const began=performance.now(),study=paintStudy(source,relief,d.field,false,d.width,d.height),colour=study.colour.transferToImageBitmap(),lighting=study.lighting.transferToImageBitmap();
 self.postMessage({id:d.id,width:d.width,height:d.height,colour,lighting,coverage:study.coverage,cost:performance.now()-began},[colour,lighting]);
 }catch(e){self.postMessage({id:d.id,error:e.message});}};
