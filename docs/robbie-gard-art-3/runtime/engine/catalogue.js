const ID=/^[a-z0-9][a-z0-9-]{0,79}$/;
const isId=value=>typeof value==='string'&&ID.test(value);
function text(value,name){if(typeof value!=='string'||!value.trim()||value.length>200)throw new TypeError('Invalid catalogue '+name);return value;}
function asset(value,extension){if(typeof value!=='string'||!new RegExp('^\\./assets/[a-z0-9-]+\\.('+extension+')$').test(value))throw new TypeError('Invalid local asset');return value;}
function https(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new TypeError('Invalid credit URL');return url.href;}
export function artworkKey(entry){return `${entry.artist.id}:${entry.artwork.id}@${entry.artwork.revision}`;}
export function validateCatalogue(value){
 if(!value||value.schemaVersion!==1||!Array.isArray(value.entries)||value.entries.length!==2)throw new TypeError('This local catalogue requires exactly two entries.');
 const ids=new Set(),artworks=new Set();
 const entries=value.entries.map(entry=>{
  if(!isId(entry.id)||!isId(entry.artist?.id)||!isId(entry.artwork?.id)||!Number.isSafeInteger(entry.artwork?.revision)||entry.artwork.revision<1)throw new TypeError('Invalid stable identity');
  if(ids.has(entry.id)||artworks.has(artworkKey(entry)))throw new TypeError('Duplicate entry or artwork revision');ids.add(entry.id);artworks.add(artworkKey(entry));
  if(entry.audio?.license!=='CC BY 4.0')throw new TypeError('Test audio needs recorded CC BY 4.0 authorisation');
  return Object.freeze({id:entry.id,title:text(entry.title,'title'),artist:Object.freeze({id:entry.artist.id,name:text(entry.artist.name,'artist')}),artwork:Object.freeze({id:entry.artwork.id,revision:entry.artwork.revision,src:asset(entry.artwork.src,'png|jpg'),credit:text(entry.artwork.credit,'photo credit'),creditUrl:https(entry.artwork.creditUrl)}),audio:Object.freeze({src:asset(entry.audio.src,'mp3'),license:entry.audio.license,creditUrl:https(entry.audio.creditUrl)})});
 });return Object.freeze({schemaVersion:1,entries:Object.freeze(entries)});
}
export const catalogue=validateCatalogue({schemaVersion:1,entries:[
 {id:'rehearsal-v1',title:'Cipher',artist:{id:'kevin-macleod',name:'Kevin MacLeod'},artwork:{id:'rehearsal',revision:1,src:'./assets/rehearsal.png',credit:'cottonbro studio / Pexels',creditUrl:'https://www.pexels.com/photo/a-woman-singing-while-holding-a-mic-5650905/'},audio:{src:'./assets/cipher.mp3',license:'CC BY 4.0',creditUrl:'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100844'}},
 {id:'carefree-rehearsal-v1',title:'Carefree',artist:{id:'kevin-macleod',name:'Kevin MacLeod'},artwork:{id:'rehearsal-two',revision:1,src:'./assets/rehearsal-two.jpg',credit:'cottonbro studio / Pexels',creditUrl:'https://www.pexels.com/photo/photo-of-a-woman-singing-7090874/'},audio:{src:'./assets/carefree.mp3',license:'CC BY 4.0',creditUrl:'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037'}}
]});
