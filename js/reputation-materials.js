import * as THREE from 'three';

// Maps are prepared once. Animation and puzzle feedback keep their existing materials.
function surface(w, h, color, draw, data = false) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, w, h);
  if (draw) draw(g, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 8;
  return { canvas, g, texture };
}

export function fitReputationWall(mesh) {
  const { position, normal, uv } = mesh.geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    const u = Math.abs(normal.getX(i)) > .5 ? position.getZ(i) + mesh.position.z : position.getX(i) + mesh.position.x;
    uv.setXY(i, u / 3, (position.getY(i) + mesh.position.y) / 4);
  }
  uv.needsUpdate = true;
}

export function createReputationMaterials(size) {
  let seed = 3317;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const grain = surface(128, 128, '#ddd', (g,w,h) => {
    for (let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const v=180+Math.floor(random()*55); g.fillStyle=`rgb(${v},${v},${v})`; g.fillRect(x,y,1,1);
    }
  }, true);
  const metal = surface(512,512,'#c8c6be',(g,w,h)=>{
    for(let y=0;y<h;y++){const v=213+Math.floor(random()*14);g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(0,y,w,1);}
    g.strokeStyle='rgba(50,45,38,.055)';g.lineWidth=1;
    for(let i=0;i<110;i++){const x=random()*w,y=random()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+random()*50,y+.5);g.stroke();}
  });
  const enamel = surface(256,256,'#eeeeeb',(g,w,h)=>{
    for(let i=0;i<1800;i++){g.fillStyle=`rgba(55,59,64,${random()*.04})`;g.fillRect(random()*w,random()*h,1,1);}
  });
  const stone=surface(1024,1024,'#292c30');stone.texture.repeat.set(size/3,size/3);
  const drape=surface(512,1024,'#4b1728');
  const seat=surface(512,1024,'#4b1728');
  const scales=surface(512,256,'#9ba0a4',(g,w,h)=>{
    for(let y=-8;y<h+12;y+=12)for(let x=-12;x<w+16;x+=16){
      const xx=x+((y/12)&1)*8,v=135+Math.floor(random()*28);
      g.fillStyle=`rgb(${v},${v+3},${v+6})`;g.strokeStyle='rgba(35,42,48,.65)';g.lineWidth=.9;
      g.beginPath();g.moveTo(xx,y);g.quadraticCurveTo(xx+16,y-3,xx+16,y+3);g.quadraticCurveTo(xx+13,y+12,xx+8,y+14);g.quadraticCurveTo(xx,y+10,xx,y);g.fill();g.stroke();
      g.strokeStyle='rgba(235,240,245,.28)';g.beginPath();g.moveTo(xx+3,y+2);g.lineTo(xx+12,y+1);g.stroke();
    }
  });
  const belly=surface(256,256,'#b1b5b6',(g,w,h)=>{
    for(let x=0;x<w;x+=16){g.fillStyle='#8c959c';g.fillRect(x,0,2,h);g.fillStyle='#d3d6d4';g.fillRect(x+3,0,2,h);}
  });
  const iris=surface(128,64,'#c4a055',(g,w,h)=>{
    for(let x=0;x<w;x++){g.strokeStyle=`rgba(56,39,12,${random()*.5})`;g.beginPath();g.moveTo(x,0);g.lineTo(x+(random()-.5)*10,h);g.stroke();}
  });
  const porcelain=surface(256,256,'#e0dbca',(g,w,h)=>{
    g.fillStyle='#ab945b';g.fillRect(0,11,w,3);g.fillRect(0,h-14,w,3);
    g.strokeStyle='rgba(75,88,94,.46)';g.lineWidth=1.3;
    for(let x=12;x<w;x+=32){g.beginPath();g.moveTo(x,h*.62);g.bezierCurveTo(x-12,h*.5,x+14,h*.38,x,h*.27);g.stroke();for(let y=75;y<155;y+=20){g.beginPath();g.ellipse(x+4,y,6,2,-.5,0,Math.PI*2);g.stroke();}}
  });
  const wood=surface(512,512,'#b28e61');
  const grip=surface(256,256,'#c7c7c7',(g,w,h)=>{
    for(let y=-w;y<h+w;y+=26){g.strokeStyle='#777';g.lineWidth=2;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+w*.4);g.stroke();g.strokeStyle='#e3e3e3';g.lineWidth=1;g.beginPath();g.moveTo(0,y+3);g.lineTo(w,y+3+w*.4);g.stroke();}
  });
  const vinyl=surface(512,512,'#33343a',(g)=>{
    for(let r=55;r<256;r+=2){g.strokeStyle=r%4?'#55565d':'#25262b';g.lineWidth=.7;g.beginPath();g.arc(256,256,r,0,Math.PI*2);g.stroke();}
    g.fillStyle='#6a2237';g.beginPath();g.arc(256,256,60,0,Math.PI*2);g.fill();g.fillStyle='#d5cdbc';g.font='16px Georgia';g.textAlign='center';g.fillText('REPUTATION',256,246);g.font='11px Georgia';g.fillText('SIDE A',256,270);
  });
  const finish=(color,options={})=>new THREE.MeshStandardMaterial({map:enamel.texture,color,roughness:.62,bumpMap:grain.texture,bumpScale:.001,...options});
  const brass=finish(0xb4a16d,{map:metal.texture,metalness:.65,roughness:.48,emissive:0x100e08});brass.name='Reputation-aged-brass';
  const floor=finish(0xffffff,{map:stone.texture,roughness:.43,metalness:.12});floor.name='Reputation-honed-charcoal';
  const upholstery=finish(0xffffff,{map:seat.texture,roughness:.96,bumpScale:.002});upholstery.name='Reputation-wine-velvet';
  const curtains=finish(0xffffff,{map:drape.texture,roughness:.97,bumpScale:.002});
  const ceramic=finish(0xffffff,{map:porcelain.texture,roughness:.31});ceramic.name='Reputation-painted-porcelain';
  const ceiling=finish(0x252b32,{roughness:.96});
  const batWood=finish(0xd7b484,{map:wood.texture,roughness:.64});
  const batGrip=finish(0x25262b,{map:grip.texture,roughness:.95,bumpMap:grip.texture,bumpScale:.001});
  const loader=new THREE.TextureLoader();
  const ready=Promise.all([
    loader.loadAsync('assets/textures/reputation/honed-charcoal.webp'),
    loader.loadAsync('assets/textures/reputation/wine-velvet.webp'),
    loader.loadAsync('assets/textures/fearless/oak-albedo.webp'),
  ]).then(([s,v,o])=>{
    stone.g.drawImage(s.image,0,0,1024,1024);
    stone.g.fillStyle='rgba(118,127,140,.065)';stone.g.fillRect(0,0,1024,1024);
    stone.g.strokeStyle='rgba(8,11,15,.4)';stone.g.lineWidth=1.5;stone.g.strokeRect(0,0,1024,1024);
    drape.g.drawImage(v.image,0,0,512,1024);
    for(let x=0;x<512;x+=64){const gradient=drape.g.createLinearGradient(x,0,x+64,0);gradient.addColorStop(0,'rgba(5,2,7,.55)');gradient.addColorStop(.45,'rgba(255,228,238,.05)');gradient.addColorStop(1,'rgba(5,2,7,.55)');drape.g.fillStyle=gradient;drape.g.fillRect(x,0,64,1024);}
    seat.g.drawImage(v.image,0,0,512,1024);
    seat.g.strokeStyle='rgba(12,3,10,.5)';seat.g.lineWidth=3;seat.g.strokeRect(14,14,484,996);
    for(let y=180;y<960;y+=220)for(let x=128;x<512;x+=256){seat.g.strokeStyle='rgba(15,3,10,.28)';seat.g.beginPath();seat.g.moveTo(x-110,y-100);seat.g.lineTo(x,y);seat.g.lineTo(x+110,y-100);seat.g.stroke();seat.g.fillStyle='#29121c';seat.g.beginPath();seat.g.arc(x,y,5,0,Math.PI*2);seat.g.fill();}
    // One board: avoid mapping the floor's plank joints across the bat.
    wood.g.drawImage(o.image,80,0,210,o.image.height,0,0,512,512);
    for(const map of [stone,drape,seat,wood])map.texture.needsUpdate=true;
    s.dispose();v.dispose();o.dispose();return true;
  }).catch(error=>{console.error('Reputation: no se pudieron cargar las texturas',error);return false;});
  return {finish,brass,floor,upholstery,curtains,ceramic,ceiling,batWood,batGrip,scales:scales.texture,belly:belly.texture,iris:iris.texture,vinyl:vinyl.texture,metal:metal.texture,grain:grain.texture,ready};
}
