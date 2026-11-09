// Small shaded pigment bead, no image assets, blur filters or extra canvas.
export const PAINTBALL=Object.freeze({restRadius:11,flightRadius:9,rimExtent:1.35});
export function drawPaintball(g,x,y,flight=false,colour=[36,112,145],contrast=false,scale=1){
 const r=flight?PAINTBALL.flightRadius:PAINTBALL.restRadius,[red,green,blue]=colour,shade=f=>`rgb(${Math.round(red*f)},${Math.round(green*f)},${Math.round(blue*f)})`;
 g.save();if(scale!==1){g.translate(x,y);g.scale(scale,scale);x=0;y=0;}g.fillStyle='rgba(26,34,39,.12)';g.beginPath();g.ellipse(x+1,y+r*.7,r*.77,r*.32,0,0,Math.PI*2);g.fill();
 const body=g.createRadialGradient(x-r*.32,y-r*.37,r*.06,x+r*.15,y+r*.18,r*1.2);
 body.addColorStop(0,shade(1.36));body.addColorStop(.32,shade(1));body.addColorStop(.8,shade(.51));body.addColorStop(1,shade(.3));g.fillStyle=body;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
 if(contrast){g.strokeStyle='rgba(25,27,30,.65)';g.lineWidth=1;g.beginPath();g.arc(x,y,r+.85,0,Math.PI*2);g.stroke();g.strokeStyle='rgba(255,255,250,.91)';g.lineWidth=.85;g.beginPath();g.arc(x,y,r+.05,0,Math.PI*2);g.stroke();}
 g.strokeStyle='rgba(228,244,244,.36)';g.lineWidth=.65;g.beginPath();g.arc(x,y,r-.6,Math.PI*.98,Math.PI*1.64);g.stroke();
 const spec=g.createRadialGradient(x-r*.29,y-r*.36,0,x-r*.29,y-r*.36,r*.39);spec.addColorStop(0,'rgba(255,255,249,.76)');spec.addColorStop(.5,'rgba(255,255,249,.22)');spec.addColorStop(1,'rgba(255,255,249,0)');g.fillStyle=spec;g.beginPath();g.ellipse(x-r*.29,y-r*.36,r*.4,r*.31,-.5,0,Math.PI*2);g.fill();g.restore();
}
