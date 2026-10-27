import {artworkKey} from './catalogue.js';
const validCompletion=c=>c&&typeof c.assisted==='boolean'&&Number.isInteger(c.pops)&&c.pops>=0&&Number.isFinite(Date.parse(c.at))&&(!c.assisted||(Number.isFinite(c.coverageBeforeAssist)&&c.coverageBeforeAssist>=.955&&c.coverageBeforeAssist<=1));
// Independent keys prevent a favourite toggle from overwriting a completion.
export class ProgressStore{
 constructor(storage){this.storage=storage;this.memory=new Map();this.persistent=!!storage;}
 key(type,entry){return `fpm:2c:${type}:${artworkKey(entry)}`;}
 read(key){try{const raw=this.storage?.getItem(key);if(raw!==null&&raw!==undefined){const value=JSON.parse(raw);this.memory.set(key,value);return value;}}catch{this.persistent=false;}return this.memory.get(key)||null;}
 write(key,value){this.memory.set(key,value);try{if(!this.storage)throw new Error('No storage');this.storage.setItem(key,JSON.stringify(value));return true;}catch{this.persistent=false;return false;}}
 favourite(entry){const r=this.read(this.key('favourite',entry));return r?.schemaVersion===1&&r.value===true;}
 toggleFavourite(entry){const value=!this.favourite(entry),saved=this.write(this.key('favourite',entry),{schemaVersion:1,value});return{value,saved};}
 completion(entry){const r=this.read(this.key('completion',entry));return r?.schemaVersion===1&&validCompletion(r.value)?r.value:null;}
 complete(entry,record){if(!validCompletion(record))throw new TypeError('Invalid completion record');const prior=this.completion(entry);if(prior)return{record:prior,added:false,saved:this.persistent};const value={entry:entry.id,artwork:artworkKey(entry),assisted:record.assisted,coverageBeforeAssist:record.coverageBeforeAssist??null,pops:record.pops,at:record.at};return{record:value,added:true,saved:this.write(this.key('completion',entry),{schemaVersion:1,value})};}
 count(entries){return new Set(entries.filter(e=>this.completion(e)).map(artworkKey)).size;}
 importLegacy(first){
  // Preserve former 2A records; never delete or change the old keys.
  try{
   if(!this.read(this.key('favourite',first))&&this.storage?.getItem('fpm:2a:favourite:rehearsal-v1')==='true')this.write(this.key('favourite',first),{schemaVersion:1,value:true});
   const old=JSON.parse(this.storage?.getItem('fpm:2a:last-completion')||'null');
   if(old?.entry===first.id&&validCompletion(old)&&!this.completion(first))this.complete(first,old);
  }catch{this.persistent=false;}
 }
}
