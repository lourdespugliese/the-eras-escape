import * as THREE from 'three';
import { create1989PropTextures } from './props1989.js';

function surface(size, color, colorSpace = true) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return { canvas, context, texture };
}

// Coordenadas en metros: la misma escala para los tramos de pared y sus dinteles.
export function fit1989Wall(mesh, metres = 2) {
  const { position, normal, uv } = mesh.geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + mesh.position.x;
    const y = position.getY(i) + mesh.position.y;
    const z = position.getZ(i) + mesh.position.z;
    uv.setXY(i, (Math.abs(normal.getX(i)) > .5 ? z : x) / metres, y / metres);
  }
  uv.needsUpdate = true;
}

export function create1989Materials(size) {
  const props = create1989PropTextures();
  const concrete = surface(1024, '#667987');
  const terrazzo = surface(1024, '#252b31');
  terrazzo.texture.repeat.set(size / 2.4, size / 2.4);
  const brushed = surface(128, '#cccccc', false);
  const grain = surface(128, '#cccccc', false);
  let seed = 1989;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 128; y++) {
    const value = 165 + Math.floor(random() * 65);
    brushed.context.fillStyle = `rgb(${value},${value},${value})`;
    brushed.context.fillRect(0, y, 128, 1);
  }
  const data = grain.context.getImageData(0, 0, 128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const value = 195 + Math.floor(random() * 34);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = value;
  }
  grain.context.putImageData(data, 0, 0);
  brushed.texture.needsUpdate = grain.texture.needsUpdate = true;
  const wall = new THREE.MeshStandardMaterial({ map: concrete.texture, roughness: .94, bumpMap: grain.texture, bumpScale: .002 });
  wall.name = '1989-blue-concrete';
  const floor = new THREE.MeshStandardMaterial({ map: terrazzo.texture, roughness: .42, metalness: .08 });
  floor.name = '1989-graphite-terrazzo';
  const steel = new THREE.MeshStandardMaterial({ map: props.steel, color: 0xb1bfca, metalness: .82, roughness: .47, roughnessMap: brushed.texture, bumpMap: brushed.texture, bumpScale: .001 });
  steel.name = '1989-brushed-steel';
  const darkSteel = steel.clone(); darkSteel.color.set(0x34404e); darkSteel.name = '1989-dark-steel';
  const paints = new Map();
  function paint(color) {
    if (!paints.has(color)) {
      const material = new THREE.MeshStandardMaterial({ map: props.paint, color, roughness: .54, metalness: .12, bumpMap: grain.texture, bumpScale: .002 });
      material.name = '1989-satin-enamel'; paints.set(color, material);
    }
    return paints.get(color);
  }
  const news = surface(256, '#e5e0d3');
  news.context.fillStyle = '#343b43'; news.context.font = 'bold 22px Georgia'; news.context.fillText('NEW YORK', 15, 29);
  news.context.fillRect(14, 38, 228, 2);
  for (let column = 0; column < 3; column++) for (let line = 0; line < 28; line++) {
    news.context.fillStyle = `rgba(40,45,52,${.3 + random() * .35})`;
    news.context.fillRect(14 + column * 78, 49 + line * 7, 50 + random() * 18, 1);
  }
  news.texture.needsUpdate = true;
  const paper = new THREE.MeshStandardMaterial({ map: news.texture, roughness: .96 });
  paper.name = '1989-newsprint';
  const finish = (color, options = {}) => {
    const material = new THREE.MeshStandardMaterial({ map: props.paint, color, roughness: .58, metalness: .12, bumpMap: grain.texture, bumpScale: .002, ...options });
    material.name = '1989-detailed-enamel'; return material;
  };
  const rubber = new THREE.MeshStandardMaterial({ map: props.tread, roughness: .98, bumpMap: props.tread, bumpScale: .006 }); rubber.name = '1989-rubber-tread';
  const rim = new THREE.MeshStandardMaterial({ map: props.wheel, metalness: .42, roughness: .56 }); rim.name = '1989-tire-and-alloy-rim';
  const upholstery = new THREE.MeshStandardMaterial({ map: props.upholstery, color: 0x343f50, roughness: .95, bumpMap: props.upholstery, bumpScale: .003 }); upholstery.name = '1989-stitched-upholstery';
  const glass = new THREE.MeshPhysicalMaterial({ map: props.glass, color: 0xb8d9e2, transparent: true, opacity: .24, roughness: .16, metalness: 0, clearcoat: .4, depthWrite: false }); glass.name = '1989-glazing';
  const photoPaper = new THREE.MeshStandardMaterial({ map: props.fibers, color: 0xfff8e9, roughness: .91, bumpMap: grain.texture, bumpScale: .001 }); photoPaper.name = '1989-photo-paper';
  const signPlate = new THREE.MeshStandardMaterial({ map: props.trim, color: 0x273444, roughness: .54, metalness: .65 }); signPlate.name = '1989-sign-housing';
  const lens = new THREE.MeshPhysicalMaterial({ map: props.lens, roughness: .14, metalness: .25, clearcoat: .6 }); lens.name = '1989-optical-lens';
  const diffuser = new THREE.MeshStandardMaterial({ map: props.diffuser, color: 0xe6e5d5, roughness: .48, emissive: 0x6a5834, emissiveMap: props.diffuser, emissiveIntensity: .6 }); diffuser.name = '1989-ribbed-diffuser';
  const ceiling = new THREE.MeshStandardMaterial({ map: props.ceiling, color: 0x293743, roughness: .9, metalness: .16 }); ceiling.name = '1989-ceiling-panels';
  const taxiSign = new THREE.MeshStandardMaterial({ map: props.taxiSign, roughness: .58, emissive: 0x2b230d }); taxiSign.name = '1989-taxi-roof-sign';
  const taxiSide = new THREE.MeshStandardMaterial({ map: props.taxiSide, roughness: .48, metalness: .16, bumpMap: grain.texture, bumpScale: .002 }); taxiSide.name = '1989-taxi-livery';
  const loader = new THREE.TextureLoader();
  const ready = Promise.all([
    loader.loadAsync('assets/textures/1989/blue-concrete.jpg'),
    loader.loadAsync('assets/textures/1989/graphite-terrazzo.jpg'),
    props.ready,
  ]).then(([wallSource, floorSource, propsLoaded]) => {
    if (!propsLoaded) throw new Error('No se cargaron los mapas de objetos');
    concrete.context.drawImage(wallSource.image, 0, 0, 1024, 1024);
    concrete.context.fillStyle = 'rgba(25,35,45,.3)';
    concrete.context.fillRect(0, 0, 2, 1024); concrete.context.fillRect(0, 0, 1024, 2);
    terrazzo.context.drawImage(floorSource.image, 0, 0, 1024, 1024);
    terrazzo.context.strokeStyle = 'rgba(7,12,19,.45)'; terrazzo.context.lineWidth = 1.5;
    for (let i = 0; i < 1024; i += 256) {
      terrazzo.context.beginPath(); terrazzo.context.moveTo(i, 0); terrazzo.context.lineTo(i, 1024); terrazzo.context.stroke();
      terrazzo.context.beginPath(); terrazzo.context.moveTo(0, i); terrazzo.context.lineTo(1024, i); terrazzo.context.stroke();
    }
    concrete.texture.needsUpdate = terrazzo.texture.needsUpdate = true;
    wallSource.dispose(); floorSource.dispose(); return true;
  }).catch(error => { console.error('[1989] No se pudieron cargar los materiales:', error); return false; });
  return { wall, floor, steel, darkSteel, paint, paper, finish, props, rubber, rim, upholstery, glass, photoPaper, signPlate, lens, diffuser, ceiling, taxiSign, taxiSide, ready };
}
