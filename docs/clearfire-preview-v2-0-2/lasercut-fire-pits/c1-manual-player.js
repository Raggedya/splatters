export function manualEmbed(source){
 const u=new URL(source);if(u.origin!=='https://bandcamp.com'||u.username||u.password||!u.pathname.startsWith('/EmbeddedPlayer/'))throw Error('Invalid official player');
 u.pathname=u.pathname.split('/').filter(p=>!/^auto_?play=/i.test(p)).join('/').replace(/bgcol=[a-f0-9]{6}/i,'bgcol=181a1b').replace(/linkcol=[a-f0-9]{6}/i,'linkcol=d5b575');
 for(const key of [...u.searchParams.keys()])if(/^auto_?play$/i.test(key))u.searchParams.delete(key);
 u.hash='';return u.href;
}
