// Fearless: papel marfil, roble y latón. Las texturas se comparten entre objetos.
import * as THREE from 'three';
import { createFearlessPropTextures } from './fearless-props.js';

function canvasTexture(width, height, fill, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); context.fillStyle = fill; context.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return { canvas, context, texture };
}

export function createFearlessMaterials() {
  const props = createFearlessPropTextures();
  const wall = canvasTexture(1024, 2048, '#eee2cb');
  wall.context.fillStyle = '#a07343'; wall.context.fillRect(0, 1536, 1024, 512);
  const floor = canvasTexture(1024, 1024, '#ac814e');
  // Cada repetición del piso cubre 1.6 m: ocho tablas de 20 cm.
  floor.texture.repeat.set(14 / 1.6, 10 / 1.6);
  const furniture = canvasTexture(256, 1024, '#9b7043');
  const grain = canvasTexture(256, 256, '#888888', false);
  // Relieve fino compartido para papel, cuero y latón, sin animación ni recargas.
  let seed = 1306;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pixels = grain.context.getImageData(0, 0, 256, 256);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = 120 + Math.floor(random() * 28);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
  }
  grain.context.putImageData(pixels, 0, 0); grain.texture.needsUpdate = true;

  const wallMaterial = new THREE.MeshStandardMaterial({ map: wall.texture, roughness: 0.94 });
  wallMaterial.name = 'fearless-ivory-paper-and-oak';
  // Escala en metros: también funciona cuando la intro divide o vuelve a sellar la pared sur.
  wallMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 vFearlessWallUv;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec3 paperPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vec3 paperNormal = normalize(mat3(modelMatrix) * normal);
      float paperHorizontal = abs(paperNormal.x) > abs(paperNormal.z) ? paperPosition.z : paperPosition.x;
      vFearlessWallUv = vec2(paperHorizontal / 2.0, paperPosition.y / 4.0);
    `);
    shader.fragmentShader = 'varying vec2 vFearlessWallUv;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        diffuseColor *= texture2D(map, vFearlessWallUv);
      #endif
    `);
  };
  wallMaterial.customProgramCacheKey = () => 'fearless-wall-metres-v1';
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floor.texture, roughness: 0.78, color: 0xe6d7c2 });
  floorMaterial.name = 'fearless-matte-oak-floor';
  const wood = new THREE.MeshStandardMaterial({ map: furniture.texture, color: 0xc2a383, roughness: 0.77 });
  wood.name = 'fearless-honey-oak-furniture';
  const darkWood = wood.clone(); darkWood.name = 'fearless-dark-oak'; darkWood.color.set(0x86684b);
  const brass = new THREE.MeshStandardMaterial({ map: props.brass, color: 0xb99550, metalness: 0.82, roughness: 0.43, bumpMap: grain.texture, bumpScale: 0.001, emissive: 0x120b02 });
  brass.name = 'fearless-brushed-brass';
  const paper = new THREE.MeshStandardMaterial({ map: props.pages, color: 0xfff9ec, roughness: 0.96, bumpMap: grain.texture, bumpScale: 0.0015 }); paper.name = 'fearless-printed-pages';
  const leather = new THREE.MeshStandardMaterial({ map: props.leather, color: 0x612b30, roughness: 0.84, bumpMap: grain.texture, bumpScale: 0.004 }); leather.name = 'fearless-bound-leather';
  const flower = new THREE.MeshStandardMaterial({ map: props.flower, alphaTest: .45, side: THREE.DoubleSide, roughness: .9, emissive: 0x140900 }); flower.name = 'fearless-golden-petals';
  const leaf = new THREE.MeshStandardMaterial({ map: props.leaf, alphaTest: .45, side: THREE.DoubleSide, roughness: .94 }); leaf.name = 'fearless-leaf-veins';
  const stem = new THREE.MeshStandardMaterial({ map: props.foliage, color: 0x76954e, roughness: .95 }); stem.name = 'fearless-green-stem';
  const pot = new THREE.MeshStandardMaterial({ map: props.terracotta, color: 0xb57c51, roughness: .93, bumpMap: grain.texture, bumpScale: .003 }); pot.name = 'fearless-thrown-terracotta';
  const soil = new THREE.MeshStandardMaterial({ map: props.soil, roughness: 1 }); soil.name = 'fearless-potting-soil';
  const wax = new THREE.MeshStandardMaterial({ map: props.wax, roughness: .8 }); wax.name = 'fearless-candle-wax';
  const cloth = color => new THREE.MeshStandardMaterial({ map: props.cloth, color, roughness: .94, bumpMap: grain.texture, bumpScale: .0015 });
  const ceiling = new THREE.MeshStandardMaterial({ map: props.paper, color: 0x38291f, roughness: .96 }); ceiling.name = 'fearless-ceiling-plaster';
  const butterflyStyle = { right: props.wing, left: props.wingLeft, body: props.body };
  const guitarStyle = { body: props.guitarFace, upper: props.guitarWood, side: furniture.texture, neck: props.fretboard, hole: props.body };

  const loader = new THREE.TextureLoader();
  const ready = Promise.all([
    loader.loadAsync('assets/textures/fearless/oak-albedo.jpg'),
    loader.loadAsync('assets/textures/fearless/ivory-wallpaper.jpg'),
    props.ready,
  ]).then(([oak, wallpaper, detailsLoaded]) => {
    if (!detailsLoaded) throw new Error('No se cargaron las texturas de mariposas y flores');
    floor.context.drawImage(oak.image, 0, 0, 1024, 1024);
    // Una tabla sin juntas transversales para que los muebles no parezcan hechos de baldosas.
    furniture.context.drawImage(oak.image, oak.image.width * 0.012, 0, oak.image.width * 0.098, oak.image.height, 0, 0, 256, 1024);
    wall.context.drawImage(wallpaper.image, 0, 0, 1024, 1024);
    wall.context.drawImage(wallpaper.image, 0, 1024, 1024, 1024);
    wall.context.drawImage(oak.image, 0, 1536, 1024, 1024);
    for (let x = 0; x < 1024; x += 128) {
      wall.context.fillStyle = 'rgba(49,30,15,.2)'; wall.context.fillRect(x, 1536, 2, 512);
      wall.context.fillStyle = 'rgba(255,233,195,.2)'; wall.context.fillRect(x + 3, 1536, 1, 512);
    }
    [wall.texture, floor.texture, furniture.texture].forEach(texture => { texture.needsUpdate = true; });
    // Sólo se conservan los mapas compartidos compuestos, no texturas de carga adicionales.
    oak.dispose(); wallpaper.dispose();
    return true;
  }).catch(error => { console.error('[Fearless] No se pudieron cargar los materiales:', error); return false; });

  return { wall: wallMaterial, floor: floorMaterial, wood, darkWood, brass, paper, leather, flower, leaf, stem, pot, soil, wax, cloth, ceiling, butterflyStyle, guitarStyle, props, ready };
}
