import * as THREE from 'three';
import { createSurfaceLibrary, canvasSurface, randomGenerator, stitchedMap } from './surface-library.js';

export function createMidnightsMaterials() {
  const lib=createSurfaceLibrary('midnights'),r=randomGenerator(1313);
  const navy=lib.imageMap('jacquard','assets/textures/world/midnight-jacquard.webp',1024,'#23304d');
  const terrazzo=lib.imageMap('terrazzo','assets/textures/1989/graphite-terrazzo.webp',1024,'#212938');
  const drape=canvasSurface(512,1024,(c,w,h)=>{c.fillStyle='#9292a2';c.fillRect(0,0,w,h);});
  const upholstery=stitchedMap(null);
  const disco=lib.make('disco',512,(c,w,h)=>{
    c.fillStyle='#404955';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){const v=145+Math.floor(r()*98);c.fillStyle=`rgb(${v},${v+Math.min(9,255-v)},${v+Math.min(15,255-v)})`;c.fillRect(x+1,y+1,29,29);c.fillStyle='rgba(255,255,255,.3)';c.fillRect(x+2,y+2,27,1);}
  });
  const rotary=lib.make('rotary',512,(c)=>{
    c.fillStyle='#aba58f';c.fillRect(0,0,512,512);
    c.strokeStyle='#575b5d';c.lineWidth=7;for(const radius of [235,150,70]){c.beginPath();c.arc(256,256,radius,0,Math.PI*2);c.stroke();}
    for(let k=0;k<10;k++){const a=(k/12)*Math.PI*2+.6,x=256+Math.sin(a)*190,y=256-Math.cos(a)*190;c.fillStyle='#252930';c.beginPath();c.arc(x,y,27,0,Math.PI*2);c.fill();c.fillStyle='#e8dfc9';c.font='bold 30px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(String((k+1)%10),x,y);}
    c.fillStyle='#d7cfb9';c.beginPath();c.arc(256,256,65,0,Math.PI*2);c.fill();c.fillStyle='#333c42';c.font='22px Georgia';c.textAlign='center';c.fillText('MIDNIGHTS',256,252);c.font='17px Georgia';c.fillText('13',256,281);
  });
  const moon=lib.make('moon',512,(c,w,h)=>{
    c.fillStyle='#d0ced5';c.fillRect(0,0,w,h);
    for(let i=0;i<700;i++){const x=r()*w,y=r()*h,rad=1+r()*28;c.fillStyle=`rgba(80,83,105,${.025+r()*.07})`;c.beginPath();c.ellipse(x,y,rad,rad*(.6+r()*.4),r()*3,0,Math.PI*2);c.fill();c.strokeStyle='rgba(245,241,244,.11)';c.lineWidth=1;c.stroke();}
  });
  const rug=lib.make('rug',1024,(c,w,h)=>{
    c.fillStyle='#4f4e75';c.fillRect(0,0,w,h);
    for(let rr=490;rr>60;rr-=48){c.strokeStyle=rr%96?'#aaa1ba':'#49445f';c.lineWidth=rr%96?3:11;c.beginPath();c.arc(w/2,h/2,rr,0,Math.PI*2);c.stroke();}
    for(let i=0;i<35000;i++){c.fillStyle=r()<.5?'rgba(226,213,233,.16)':'rgba(23,25,43,.14)';c.fillRect(r()*w,r()*h,.7,.7);}
  });
  const finish=lib.finish;
  const ready=lib.ready().then(ok=>{
    if(!ok)return false;
    drape.context.drawImage(navy.image,0,0,512,1024);
    for(let x=0;x<512;x+=64){const gr=drape.context.createLinearGradient(x,0,x+64,0);gr.addColorStop(0,'rgba(2,3,10,.6)');gr.addColorStop(.4,'rgba(208,214,255,.06)');gr.addColorStop(1,'rgba(2,3,10,.6)');drape.context.fillStyle=gr;drape.context.fillRect(x,0,64,1024);}drape.update();
    const sewn=stitchedMap(lib.maps.fabric.image);upholstery.context.drawImage(sewn.canvas,0,0);upholstery.update();sewn.texture.dispose();return true;
  });
  return {lib,maps:lib.maps,finish,ready,rotary:rotary.texture,moon:moon.texture,rug:rug.texture,
    wall:finish(0xdce6ff,{map:navy,emissive:0x070c1a,roughness:.95,bumpMap:navy,bumpScale:.003}),
    curtain:lib.cloth(0xb3b2d4,{map:drape.texture,side:THREE.DoubleSide}),
    chair:(color)=>lib.cloth(color,{map:upholstery.texture}),
    shade:(color,emissive,intensity)=>lib.cloth(color,{map:lib.maps.ribbedGlass,emissive,emissiveMap:lib.maps.ribbedGlass,emissiveIntensity:intensity,side:THREE.DoubleSide}),
    disco:finish(0xe1e5ec,{map:disco.texture,metalness:.95,roughness:.18,flatShading:true,emissive:0x121529,emissiveIntensity:.4}),
    timber:lib.timber,
    drawFloorBase(c,w,h){const pattern=c.createPattern(terrazzo.image,'repeat');c.save();c.scale(.26,.26);c.fillStyle=pattern;c.fillRect(0,0,w/.26,h/.26);c.restore();c.fillStyle='rgba(16,25,67,.62)';c.fillRect(0,0,w,h);},
  };
}
