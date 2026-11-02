// Cartel del frontón: trazos propios de firma, compartidos por los tubos y su halo.
// No depende de una fuente externa ni de una imagen de la fachada.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Coordenadas de dibujo, con Y hacia abajo. Taylor Swift arriba; Museum debajo.
const STROKES = [
  // T: barra larga y asta ligeramente irregular, como en la referencia.
  'M 25 110 C 110 75 235 40 337 45',
  'M 151 88 C 148 135 148 196 151 232',
  // aylor: un solo gesto; la y desciende sin tocar la segunda línea.
  'M 218 157 C 197 141 177 163 185 178 C 192 192 215 177 219 157 C 214 179 221 183 236 176 C 250 170 258 156 261 155 C 250 177 258 188 274 174 L 292 154 C 285 187 275 222 254 262 C 233 304 208 309 213 280 C 220 249 259 216 300 185 C 332 160 365 121 369 66 C 371 24 346 38 331 79 C 314 126 305 172 317 184 C 326 195 346 186 360 173 C 365 148 391 147 396 164 C 401 182 373 190 365 176 C 358 160 384 159 398 169 C 414 179 431 174 444 161 L 453 150 C 443 168 454 176 467 169 C 479 159 485 158 485 169 C 484 178 499 181 516 173',
  // S: gran curva abierta y lazo inferior.
  'M 670 75 C 685 27 630 4 583 21 C 537 37 531 76 559 103 C 582 124 618 139 630 165 C 645 197 607 220 576 204 C 559 195 562 181 576 183 C 594 185 593 197 580 200',
  // w e i: enlaces con irregularidad de firma.
  'M 638 145 C 647 168 656 178 667 157 L 677 143 C 671 165 683 177 696 157 C 706 142 711 143 712 154 C 713 166 730 163 744 146 C 737 159 740 169 755 164 C 769 161 778 150 783 143 C 773 164 786 173 804 163',
  'M 783 120 L 785 118',
  // f y t: ascendentes altas y barras que se prolongan a la derecha.
  'M 805 190 C 797 153 803 115 830 84 C 853 49 866 72 849 110 C 830 138 807 141 789 144 C 814 139 838 138 861 142 C 871 128 885 91 891 76 C 882 114 868 156 875 169 C 883 184 905 176 916 163',
  'M 819 98 C 873 100 927 99 977 107',
  'M 800 182 C 818 180 839 177 858 179',
  // Museum: menor, con el mismo trazo fino y un amplio remate final.
  'M 355 310 C 365 276 371 253 377 238 C 381 263 384 288 391 303 C 403 277 417 251 430 235 C 426 259 425 285 438 310',
  'M 449 283 C 442 307 450 315 464 302 L 478 283 C 470 304 476 315 492 304 L 509 290 C 519 278 532 284 521 291 C 504 297 500 301 513 304 C 532 308 533 318 515 320 C 506 320 501 317 500 314',
  'M 533 306 C 553 307 571 294 565 286 C 557 276 543 291 546 305 C 551 320 575 312 587 296 C 580 312 588 317 601 307 L 617 289 C 608 310 615 320 629 307 L 645 291 C 639 305 636 314 642 310 C 656 286 670 284 663 307 C 678 286 692 285 684 306 C 701 285 714 291 707 306 C 699 324 727 317 750 310 C 766 306 784 308 797 311',
];

const SCALE = 0.0104;
const CENTER_Y = 11.55;
const DRAW_CENTER = [500, 175];

function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 896;
  const g = canvas.getContext('2d');
  // Margen transparente para que el resplandor no se corte en el borde.
  g.scale(2, 2); g.translate(12, 38);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // Solo el resplandor importa: trazo fino y desenfoque repetido, sin masa sólida detrás de las letras.
  for (const [blur, repeats] of [[90, 3], [48, 3], [22, 2], [9, 1]]) {
    g.shadowColor = '#ff1a8c'; g.shadowBlur = blur;
    g.strokeStyle = 'rgba(255,40,150,1)'; g.lineWidth = 3;
    for (let i = 0; i < repeats; i++) for (const stroke of STROKES) g.stroke(new Path2D(stroke));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildMuseumNeon(root, centerX) {
  const group = new THREE.Group();
  group.name = 'museum-pink-neon';
  group.userData.text = 'Taylor Swift Museum';
  group.position.set(centerX, CENTER_Y, 28.84); root.add(group);

  // Se fusionan todos los tubos: una sola llamada de dibujo para la firma completa.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${STROKES.map(d => `<path fill="none" stroke="white" d="${d}"/>`).join('')}</svg>`;
  const paths = new SVGLoader().parse(svg).paths;
  const parts = [], cores = [];
  for (const path of paths) for (const subPath of path.subPaths) {
    const segments = Math.max(8, Math.ceil(subPath.getLength() / 4));
    const points = subPath.getSpacedPoints(segments).map(p => new THREE.Vector3(
      (p.x - DRAW_CENTER[0]) * SCALE, (DRAW_CENTER[1] - p.y) * SCALE, 0,
    ));
    const curve = new THREE.CatmullRomCurve3(points);
    parts.push(new THREE.TubeGeometry(curve, segments, 0.05, 8, false));
    cores.push(new THREE.TubeGeometry(curve, segments, 0.022, 6, false));
  }
  const geometry = mergeGeometries(parts), coreGeometry = mergeGeometries(cores);
  parts.concat(cores).forEach(part => part.dispose());
  const tubes = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: new THREE.Color(3.4, 0.02, 0.5), toneMapped: false,
  }));
  tubes.name = 'museum-neon-tubes'; group.add(tubes);
  // Alma casi blanca del tubo: el borde queda magenta saturado, como el gas encendido.
  const core = new THREE.Mesh(coreGeometry, new THREE.MeshBasicMaterial({
    color: new THREE.Color(4.5, 1.6, 2.6), toneMapped: false,
  }));
  core.name = 'museum-neon-core'; core.position.z = 0.012; group.add(core);

  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1024 * SCALE, 448 * SCALE), new THREE.MeshBasicMaterial({
    map: haloTexture(), transparent: true,
    depthWrite: false, toneMapped: false, opacity: 1, blending: THREE.AdditiveBlending,
  }));
  // El centro del canvas incluye el margen (12, 38) del dibujo.
  halo.position.set(0, -11 * SCALE, -0.025);
  halo.name = 'museum-neon-halo'; group.add(halo);

  // Luz real sobre la piedra: alcance corto y sin sombras ni contaminación del hall.
  const lights = [-2.7, 0, 2.7].map(x => {
    const light = new THREE.PointLight(0xff1a8e, 0, 6, 1.6);
    light.position.set(x, x === 0 ? 0.2 : -0.05, 0.65);
    light.name = 'museum-neon-stone-light'; light.userData.noShadow = true;
    group.add(light); return light;
  });

  return {
    group, lights,
    update(outside) { lights.forEach(light => { light.intensity = 9 * outside; }); },
  };
}
