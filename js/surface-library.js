import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const rounded = new Map();
export function roundedGeometry(w, h, d, radius = .035) {
  const r = Math.min(radius, Math.min(w, h, d) * .22);
  const key = [w, h, d, r].join('/');
  if (!rounded.has(key)) rounded.set(key, new RoundedBoxGeometry(w, h, d, 2, r));
  return rounded.get(key);
}

export function randomGenerator(seed = 71) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function canvasSurface(w, h, draw, data = false) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const context = canvas.getContext('2d'); draw(context, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 8;
  return { canvas, context, texture, update() { texture.needsUpdate = true; } };
}

export function physicalUV(mesh, horizontal = 2, vertical = horizontal) {
  const { position, normal, uv } = mesh.geometry.attributes;
  if (!uv) return;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + mesh.position.x, y = position.getY(i) + mesh.position.y, z = position.getZ(i) + mesh.position.z;
    const top = Math.abs(normal.getY(i)) > .5;
    uv.setXY(i, (Math.abs(normal.getX(i)) > .5 ? z : x) / horizontal, (top ? z : y) / vertical);
  }
  uv.needsUpdate = true;
}

// Shared static maps. Different materials retain independent colors/emissive feedback.
export function createSurfaceLibrary(era) {
  const random = randomGenerator(era === 'forest' ? 1989 : era === 'lover' ? 2019 : 1313);
  const maps = {};
  const make = (name, size, draw, data = false) => {
    const surface = canvasSurface(size, size, draw, data); maps[name] = surface.texture; return surface;
  };
  make('grain', 128, (c,w,h) => {
    const data = c.createImageData(w,h);
    for(let i=0;i<data.data.length;i+=4){const v=184+Math.floor(random()*48);data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}
    c.putImageData(data,0,0);
  }, true);
  make('enamel',256,(c,w,h)=>{
    c.fillStyle='#e9e9e6';c.fillRect(0,0,w,h);
    for(let i=0;i<1800;i++){c.fillStyle=`rgba(67,65,59,${random()*.05})`;c.fillRect(random()*w,random()*h,.7,.7);}
  });
  make('metal',512,(c,w,h)=>{
    for(let y=0;y<h;y++){const v=211+Math.floor(random()*17);c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(0,y,w,1);}
    c.strokeStyle='rgba(50,55,62,.07)';c.lineWidth=.6;
    for(let i=0;i<180;i++){const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*34,y+.3);c.stroke();}
  });
  const fabric=make('fabric',512,(c,w,h)=>{
    c.fillStyle='#d6d5d0';c.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=3){c.fillStyle=i%2?'#dbdad5':'#c4c3bf';c.fillRect(i,0,1,h);c.fillStyle='rgba(255,255,255,.15)';c.fillRect(0,i,w,1);}
  });
  const wood=make('wood',512,(c,w,h)=>{c.fillStyle='#a89a7f';c.fillRect(0,0,w,h);});
  make('paper',256,(c,w,h)=>{
    c.fillStyle='#e7dfcb';c.fillRect(0,0,w,h);
    for(let i=0;i<2600;i++){c.fillStyle=`rgba(94,78,47,${random()*.12})`;c.fillRect(random()*w,random()*h,.5+random(),.5);}
    c.strokeStyle='rgba(106,89,55,.14)';c.lineWidth=2;c.strokeRect(2,2,w-4,h-4);
  });
  make('stone',512,(c,w,h)=>{
    c.fillStyle='#b1b1aa';c.fillRect(0,0,w,h);
    for(let i=0;i<12000;i++){const v=80+Math.floor(random()*120);c.fillStyle=`rgba(${v},${v},${v},.16)`;c.fillRect(random()*w,random()*h,1+random()*3,1+random()*2);}
    c.strokeStyle='rgba(57,65,71,.12)';c.lineWidth=1;
    for(let k=0;k<6;k++){let x=random()*w;c.beginPath();c.moveTo(x,0);for(let y=32;y<h;y+=32){x+=(random()-.5)*40;c.lineTo(x,y);}c.stroke();}
  });
  make('vinyl',512,(c)=>{
    c.fillStyle='#36373c';c.fillRect(0,0,512,512);
    for(let r=45;r<256;r+=2){c.strokeStyle=r%4?'#55565d':'#25262b';c.lineWidth=.6;c.beginPath();c.arc(256,256,r,0,Math.PI*2);c.stroke();}
    c.fillStyle=era==='lover'?'#a83e70':'#343665';c.beginPath();c.arc(256,256,54,0,Math.PI*2);c.fill();c.fillStyle='#e6dfd2';c.font='13px Georgia';c.textAlign='center';c.fillText(era.toUpperCase(),256,251);c.font='10px Georgia';c.fillText('SIDE A',256,269);
  });
  make('ribbedGlass',256,(c,w,h)=>{
    c.fillStyle='#d2cfbe';c.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=12){const gr=c.createLinearGradient(x,0,x+12,0);gr.addColorStop(0,'rgba(72,67,54,.25)');gr.addColorStop(.45,'rgba(255,255,240,.2)');gr.addColorStop(1,'rgba(72,67,54,.25)');c.fillStyle=gr;c.fillRect(x,0,12,h);}
    c.fillStyle='rgba(40,35,28,.3)';c.fillRect(0,0,w,5);c.fillRect(0,h-5,w,5);
  });
  const jobs=[],loader=new THREE.TextureLoader();
  function loadInto(surface,url,after) {
    jobs.push(loader.loadAsync(url).then(source=>{
      surface.context.clearRect(0,0,surface.canvas.width,surface.canvas.height);
      surface.context.drawImage(source.image,0,0,surface.canvas.width,surface.canvas.height);
      if(after)after(surface.context,surface.canvas.width,surface.canvas.height,source.image);
      surface.update();source.dispose();
    }));
    return surface.texture;
  }
  if(era!=='forest')loadInto(fabric,'assets/textures/world/silver-linen.webp');
  loadInto(wood,'assets/textures/fearless/oak-albedo.webp',(c,w,h,image)=>{c.drawImage(image,80,0,210,image.height,0,0,w,h);});
  function imageMap(name,url,size=1024,color='#777',after) {
    const s=make(name,size,(c,w,h)=>{c.fillStyle=color;c.fillRect(0,0,w,h);});loadInto(s,url,after);return s.texture;
  }
  const finish=(color,options={})=>{
    const metal=(options.metalness||0)>=.3;
    const material=new THREE.MeshStandardMaterial({color,map:metal?maps.metal:maps.enamel,roughness:.65,bumpMap:maps.grain,bumpScale:.001,...options});
    material.name=`${era}-${metal?'brushed-metal':'satin-enamel'}`;return material;
  };
  const cloth=(color,options={})=>{const m=finish(color,{map:maps.fabric,roughness:.96,bumpMap:maps.fabric,bumpScale:.0015,...options});m.name=era+'-woven-fabric';return m;};
  const timber=(color,options={})=>{const m=finish(color,{map:maps.wood,roughness:.86,bumpMap:maps.wood,bumpScale:.003,...options});m.name=era+'-timber';return m;};
  return {maps,make,imageMap,loadInto,finish,cloth,timber,ready:()=>Promise.all(jobs).then(()=>true).catch(error=>{console.error(era+' material loading failed',error);return false;})};
}

export function stitchedMap(source, color = null) {
  return canvasSurface(512,512,(c,w,h)=>{
    if(source)c.drawImage(source,0,0,w,h);else{c.fillStyle=color||'#d1d1cf';c.fillRect(0,0,w,h);}
    c.strokeStyle='rgba(37,31,38,.2)';c.lineWidth=2;c.strokeRect(12,12,w-24,h-24);
    c.setLineDash([3,4]);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1;c.strokeRect(17,17,w-34,h-34);
  });
}
