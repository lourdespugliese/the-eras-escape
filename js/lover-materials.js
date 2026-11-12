import * as THREE from 'three';
import { createLoverCloudMaterial } from './lover-cloud-material.js';
import { createSurfaceLibrary, canvasSurface, randomGenerator, stitchedMap } from './surface-library.js';

export function createLoverMaterials(size) {
  const lib=createSurfaceLibrary('lover'),random=randomGenerator(2019);
  const plaster=lib.imageMap('plaster','assets/textures/world/pearl-plaster.webp',1024,'#ead5dd');
  const nacre=lib.imageMap('nacre','assets/textures/lover/nacre-mosaic.webp',1024,'#e7cbdc');
  const cloudTexture=lib.imageMap('cloudCotton','assets/textures/lover/cloud-cotton.webp',1024,'#eee5e9');
  const wall=canvasSurface(768,1024,(c,w,h)=>{
    const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#bfcadd');gr.addColorStop(.4,'#d9c4d8');gr.addColorStop(1,'#e0b0c6');c.fillStyle=gr;c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(255,242,234,.07)';c.lineWidth=1;
    for(let i=0;i<650;i++){const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*18,y-9);c.stroke();}
  });
  const tileRelief=canvasSurface(512,512,(c,w,h)=>{
    c.fillStyle='#d8d8d8';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=64){c.fillStyle='#606060';c.fillRect(x,y,64,2);c.fillRect(x,y,2,64);c.strokeStyle='#eeeeee';c.lineWidth=2;c.strokeRect(x+4,y+4,56,56);}
  },true);
  const floor=canvasSurface(1024,1024,(c,w,h)=>{
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){
      c.fillStyle=(x+y)%2?'#d8a6b8':'#eee4db';c.fillRect(x*512,y*512,512,512);
      c.strokeStyle='rgba(255,250,239,.42)';c.lineWidth=2;c.strokeRect(x*512+2,y*512+2,508,508);
    }
    c.strokeStyle='rgba(138,113,122,.11)';c.lineWidth=1.3;
    for(let k=0;k<35;k++){let x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=(random()-.5)*75;y+=18+random()*25;c.lineTo(x,y);}c.stroke();}
    c.strokeStyle='rgba(114,96,101,.3)';c.lineWidth=2;for(const a of [0,512,1024]){c.beginPath();c.moveTo(a,0);c.lineTo(a,h);c.moveTo(0,a);c.lineTo(w,a);c.stroke();}
  });floor.texture.repeat.set(size/3,size/3);
  const cotton=lib.make('cotton',256,(c,w,h)=>{
    c.fillStyle='#e6e6e2';c.fillRect(0,0,w,h);for(let i=0;i<8000;i++){c.fillStyle=random()<.5?'rgba(97,109,123,.055)':'rgba(255,255,255,.1)';c.fillRect(random()*w,random()*h,.6,.6);}
  });
  const wing=canvasSurface(256,320,(c)=>{
    c.fillStyle='#e9e5eb';c.beginPath();c.moveTo(18,158);c.bezierCurveTo(65,10,227,4,233,66);c.bezierCurveTo(247,130,166,161,175,169);c.bezierCurveTo(249,188,204,298,155,288);c.bezierCurveTo(95,280,54,225,18,158);c.fill();
    c.strokeStyle='#8e7e98';c.lineWidth=2;for(let i=0;i<7;i++){c.beginPath();c.moveTo(20,158);c.quadraticCurveTo(96,105+i*14,207-i*9,45+i*34);c.stroke();}
    c.strokeStyle='#b6a3bb';c.lineWidth=2;c.beginPath();c.moveTo(20,158);c.bezierCurveTo(75,25,214,14,221,70);c.bezierCurveTo(230,130,152,157,161,174);c.bezierCurveTo(222,196,196,273,154,274);c.stroke();
    c.fillStyle='#fff9f1';for(let i=0;i<9;i++){const a=i*.48;c.beginPath();c.ellipse(183+Math.sin(a)*29,52+i*24,4,6,.5,0,Math.PI*2);c.fill();}
  });
  const leftWing=wing.texture.clone();leftWing.repeat.x=-1;leftWing.offset.x=1;
  const stitched=stitchedMap(null);
  const ready=lib.ready().then(ok=>{
    if(!ok)return false;
    wall.context.globalAlpha=.2;wall.context.globalCompositeOperation='multiply';wall.context.drawImage(plaster.image,0,0,768,1024);wall.context.globalCompositeOperation='source-over';wall.context.globalAlpha=1;wall.update();
    const woven=stitchedMap(lib.maps.fabric.image);stitched.context.drawImage(woven.canvas,0,0);stitched.update();woven.texture.dispose();return true;
  });
  const finish=lib.finish;
  const mosaic=new THREE.MeshPhysicalMaterial({map:nacre,metalness:.32,roughness:.34,clearcoat:.45,clearcoatRoughness:.28,iridescence:.45,iridescenceIOR:1.35,iridescenceThicknessRange:[150,310],bumpMap:tileRelief.texture,bumpScale:.004});
  mosaic.name='lover-pastel-nacre-mosaic';
  const opal=mosaic.clone();opal.map=lib.maps.enamel;opal.bumpMap=lib.maps.grain;opal.bumpScale=.0006;opal.color.set(0xffe3ee);opal.iridescence=.75;opal.name='lover-opalescent-heart';
  const cloudCanopy=createLoverCloudMaterial(cloudTexture);
  return {maps:lib.maps,finish,ready,mosaic,opal,cloudCanopy,cotton:finish(0xffffff,{map:cotton.texture,roughness:1,bumpMap:lib.maps.grain,bumpScale:.002,emissive:0x14141b}),butterfly:{right:wing.texture,left:leftWing,body:lib.maps.fabric},
    wall:finish(0xffffff,{map:wall.texture,roughness:.94,bumpMap:lib.maps.grain,bumpScale:.002}),
    floor:finish(0xffffff,{map:floor.texture,roughness:.4,metalness:.08}),
    ceiling:finish(0xc8ced7,{map:plaster,roughness:.96}),
    cloth:(color,options={})=>lib.cloth(color,{map:stitched.texture,...options}),
    pearl:(color=0xfff3e9,options={})=>finish(color,{map:plaster,roughness:.38,metalness:.08,...options}),
    heart:(color)=>finish(color,{roughness:.24,metalness:.14,emissive:new THREE.Color(color).multiplyScalar(.18)}),
  };
}
