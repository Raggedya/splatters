const side='\\d+(?:[.,]\\d+)?\\s*(?:\\([whd]\\)\\s*)?';
const unit='(?:cm|mm|m|inches|inch|in|″|")';
const dimensionsPattern=new RegExp('^'+side+'(?:'+unit+'\\s*)?(?:[×x]|by)\\s*'+side+
 '(?:(?:'+unit+'\\s*)?(?:[×x]|by)\\s*'+side+')?'+unit+'$','i');
const dimensionsLabel=/^(?:(artwork|canvas|painting|physical)\s+)?(?:dimensions?|size)\s*:\s*/i;
const priceLabel=/^(?:(original|print)(?:\s+price)?|sale price|price)\s*:\s*/i;
const currencyCode='(?:AUD|USD|NZD|EUR|GBP|CAD|JPY|CHF|SGD|HKD|CNY|INR|ZAR|SEK|NOK|DKK|PLN|MXN|BRL)';
const currency='(?:'+currencyCode+'\\s*[$€£¥]?|(?:A|AU|US|NZ|CA|C)?\\$|[€£¥₹])\\s*';
const amount='(?:'+currency+')?\\d[\\d,.]*(?:\\s+'+currencyCode+')?';
const pricePattern=new RegExp('^(?:from\\s+)?'+amount+'(?:\\s*[-–]\\s*'+amount+')?(?:\\s*\\(was\\s+'+amount+'\\))?(?:\\s+(?:for (?:the )?)?(?:original|print|per print))?$','i');
const explicitCurrency=new RegExp('(?:^|\\s)'+currency+'\\d|\\d\\s+'+currencyCode+'\\b','i');
const detailLine=/^(?:title|medium|dimensions?|size|year|edition|material|availability|price|sale price|listed prices|description|artist|artwork|canvas|frame|image|resolution)\s*:/i;

function physicalSize(line){
 const value=line.replace(dimensionsLabel,'').trim();
 if(!dimensionsPattern.test(value))return '';
 return value.replace(/\s*\([whd]\)\s*/gi,' ').replace(/\s*(?:×|x|\bby\b)\s*/gi,' × ').replace(/\s+/g,' ').trim();
}

function artworkPrice(lines,title){
 const candidates=lines.flatMap(line=>{
  const label=priceLabel.exec(line);
  const value=line.replace(priceLabel,'').trim();
  if(!pricePattern.test(value)||(!label&&!explicitCurrency.test(value)))return [];
  const type=label?.[1]?.toLowerCase()||value.match(/\b(original|print)$/i)?.[1].toLowerCase();
  const display=label?.[0].toLowerCase().startsWith('sale')?'Sale '+value.replace(/\s*\(was\b.*\)$/i,''):value;
  return [{type,display}];
 });
 const kind=/\bprints?\b/i.test(title)?'print':/\boriginal\b/i.test(title)?'original':null;
 const explicit=kind&&candidates.filter(price=>price.type===kind);
 const allowed=explicit?.length?explicit:candidates.filter(price=>!price.type||!kind||price.type===kind);
 const distinct=[...new Set(allowed.map(({type,display})=>type&&!/\b(?:print|original)$/i.test(display)?
  (type==='print'?'Print ':'Original ')+display:display))];
 return distinct.length===1?distinct[0]:'';
}

export function artworkPlaqueDetails(artwork,number,total){
 const lines=String(artwork.information||'').trim().split(/\r?\n/).map(line=>line.trim());
 const first=lines[0];
 const titleField=lines.find(line=>/^title\s*:\s*\S/i.test(line));
 const heading=first&&first.length<=240&&!detailLine.test(first)&&!physicalSize(first)&&!explicitCurrency.test(first)&&
  !/^(?:from\b|sold\b|in stock\b|out of stock\b|on enquiry\b|https?:|<|[$€£¥]|\d+[.,]?\d*\s*(?:px|×|x)\s*\d)/i.test(first)&&
  (lines[1]===''||lines.slice(1).some(line=>detailLine.test(line)||physicalSize(line)||explicitCurrency.test(line))||
   lines.length===1&&!/[.!?]$/.test(first)&&!/\b(?:acrylic|oil|gouache|watercolou?r|ink|mixed media) on\b/i.test(first));
 const title=artwork.title?.trim()||titleField?.replace(/^title\s*:\s*/i,'')||(heading?first:'');
 const preferred=lines.filter(line=>dimensionsLabel.exec(line)?.[1]).map(physicalSize).filter(Boolean);
 const sizes=[...new Set(preferred.length?preferred:lines.map(physicalSize).filter(Boolean))];
 return {title,number:String(number).padStart(2,'0')+' / '+String(total).padStart(2,'0'),
  dimensions:sizes.length===1?sizes[0]:'',price:artworkPrice(lines,title)};
}
