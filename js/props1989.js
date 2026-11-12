// Detalles compartidos de los objetos de 1989. Todos los mapas se preparan una vez.
import * as THREE from 'three';

function map(size, draw, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const context = canvas.getContext('2d'); draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

function panel(context, size) {
  context.strokeStyle = 'rgba(25,35,43,.20)'; context.lineWidth = 2;
  context.strokeRect(5, 5, size - 10, size - 10);
  context.strokeStyle = 'rgba(255,255,255,.38)'; context.lineWidth = 1;
  context.strokeRect(8, 8, size - 16, size - 16);
}

export function create1989PropTextures() {
  const paint = map(512, (c, s) => { c.fillStyle = '#efefef'; c.fillRect(0, 0, s, s); panel(c, s); });
  const steel = map(512, (c, s) => { c.fillStyle = '#dddddd'; c.fillRect(0, 0, s, s); });
  const fibers = map(256, (c, s) => {
    c.fillStyle = '#e8e4dc'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 1700; i++) {
      const x = (i * 73) % s, y = (i * 131 + Math.floor(i / s) * 11) % s;
      c.fillStyle = i % 3 ? 'rgba(90,80,65,.05)' : 'rgba(255,255,255,.3)';
      c.fillRect(x, y, 1 + i % 4, 1);
    }
  });
  const upholstery = map(256, (c, s) => {
    c.fillStyle = '#b9bdc2'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 4) { c.fillStyle = i % 8 ? '#a9adb2' : '#c4c7cb'; c.fillRect(i, 0, 1, s); }
    for (let x = 16; x < s; x += 48) {
      c.fillStyle = '#7b838c'; c.fillRect(x, 0, 2, s);
      c.strokeStyle = '#dee0e2'; c.lineWidth = 1; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(x + 4, 0); c.lineTo(x + 4, s); c.stroke(); c.setLineDash([]);
    }
  });
  const tread = map(256, (c, s) => {
    c.fillStyle = '#292e34'; c.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 24) for (let x = 0; x < s; x += 32) {
      c.strokeStyle = '#11161c'; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14, y + 10); c.lineTo(x + 28, y); c.stroke();
      c.strokeStyle = '#454b52'; c.lineWidth = 1; c.stroke();
    }
  });
  const wheel = map(512, (c, s) => {
    c.fillStyle = '#21262d'; c.fillRect(0, 0, s, s); c.translate(s / 2, s / 2);
    for (const r of [226, 216, 204, 163]) { c.strokeStyle = '#434b54'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    const metal = c.createRadialGradient(-35, -30, 10, 0, 0, 155); metal.addColorStop(0, '#d2d8dd'); metal.addColorStop(.65, '#87939e'); metal.addColorStop(1, '#414f5d');
    c.fillStyle = metal; c.beginPath(); c.arc(0, 0, 149, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i * Math.PI / 4); c.fillStyle = '#26323e'; c.fillRect(-15, -130, 30, 65); c.restore();
    }
    c.fillStyle = '#b4bec6'; c.beginPath(); c.arc(0, 0, 46, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.fillStyle = '#475463'; c.beginPath(); c.arc(Math.cos(a) * 64, Math.sin(a) * 64, 8, 0, Math.PI * 2); c.fill(); }
  });
  const glass = map(256, (c, s) => {
    c.fillStyle = '#d8e5e9'; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 9;
    c.beginPath(); c.moveTo(-50, s); c.lineTo(s * .65, 0); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(5, s); c.lineTo(s * .85, 0); c.stroke();
  });
  const lens = map(256, (c, s) => {
    const r = c.createRadialGradient(s * .43, s * .40, 1, s / 2, s / 2, s / 2);
    r.addColorStop(0, '#233e53'); r.addColorStop(.35, '#081521'); r.addColorStop(.64, '#1b4b60'); r.addColorStop(.84, '#0c1723'); r.addColorStop(1, '#435761');
    c.fillStyle = r; c.fillRect(0, 0, s, s);
    for (let radius = 45; radius < 124; radius += 17) { c.strokeStyle = 'rgba(155,205,218,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(s / 2, s / 2, radius, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = 'rgba(220,245,255,.5)'; c.beginPath(); c.ellipse(94, 90, 25, 9, -.6, 0, Math.PI * 2); c.fill();
  });
  const diffuser = map(128, (c, s) => {
    c.fillStyle = '#e5e4d8'; c.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 8) { c.fillStyle = x % 16 ? '#bfc5bf' : '#f4f0df'; c.fillRect(x, 0, 2, s); }
  });
  const feather = map(256, (c, s) => {
    c.fillStyle = '#efefec'; c.fillRect(0, 0, s, s);
    for (let y = -32; y < s; y += 28) for (let x = 0; x < s; x += 32) {
      c.strokeStyle = 'rgba(70,85,99,.22)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 5, y + 25, x + 16, y + 30); c.quadraticCurveTo(x + 27, y + 25, x + 32, y); c.stroke();
    }
  });
  const vinyl = map(512, (c, s) => {
    c.fillStyle = '#161b24'; c.fillRect(0, 0, s, s);
    for (let r = 50; r < 256; r += 3) { c.strokeStyle = r % 2 ? '#26303c' : '#10151c'; c.lineWidth = 1; c.beginPath(); c.arc(s / 2, s / 2, r, 0, Math.PI * 2); c.stroke(); }
  });
  const ceiling = map(512, (c, s) => {
    c.fillStyle = '#b5bec6'; c.fillRect(0, 0, s, s); panel(c, s);
    for (let y = 38; y < s - 20; y += 7) for (let x = 30; x < s - 20; x += 7) { c.fillStyle = '#9ca6b0'; c.fillRect(x, y, 1, 1); }
  });
  const trim = map(256, (c, s) => {
    c.fillStyle = '#cad0d5'; c.fillRect(0, 0, s, s); panel(c, s);
    for (const x of [17, s - 17]) for (const y of [17, s - 17]) {
      c.fillStyle = '#616e79'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c9cfd3'; c.fillRect(x - 2, y, 4, 1);
    }
  });
  const cameraBody = map(512, (c, s) => {
    c.fillStyle = '#e9e9e2'; c.fillRect(0, 0, s, s); panel(c, s);
    c.fillStyle = '#455968'; c.font = 'bold 36px Arial'; c.fillText('INSTANT', 30, 62);
    c.fillStyle = '#8e9aa0'; c.fillRect(30, 78, 174, 3);
    for (let y = 360; y < 454; y += 13) { c.fillStyle = '#bdc4c4'; c.fillRect(30, y, 122, 4); }
    for (const x of [20, s - 20]) for (const y of [20, s - 20]) { c.fillStyle = '#7a878f'; c.fillRect(x - 3, y - 3, 6, 6); }
  });
  const taxiSign = map(256, (c, s) => {
    c.fillStyle = '#e4dcb7'; c.fillRect(0, 0, s, s); c.strokeStyle = '#60522c'; c.lineWidth = 10; c.strokeRect(5, 5, s - 10, s - 10);
    c.fillStyle = '#242a30'; c.font = 'bold 76px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TAXI', s / 2, s / 2);
  });
  const taxiSide = map(512, (c, s) => {
    c.fillStyle = '#f3be2a'; c.fillRect(0, 0, s, s);
    // Compensación del lateral largo de la carrocería: los cuadros se ven cuadrados en el taxi.
    for (let x = 0; x < s; x += 9) for (let row = 0; row < 2; row++) { c.fillStyle = (x / 9 + row) % 2 ? '#292b29' : '#ece7d5'; c.fillRect(x, 32 + row * 42, 9, 42); }
    c.strokeStyle = 'rgba(66,48,8,.45)'; c.lineWidth = 2;
    [140, 345].forEach(x => { c.beginPath(); c.moveTo(x, 106); c.lineTo(x, s - 16); c.stroke(); });
    c.strokeRect(9, 10, s - 18, s - 20);
    c.save(); c.translate(s / 2, 0); c.scale(.22, 1);
    c.fillStyle = '#292b29'; c.font = 'bold 90px Arial'; c.textAlign = 'center'; c.fillText('NYC', 0, 305);
    c.font = '40px Arial'; c.fillText('TAXI', 0, 362); c.restore();
    c.fillStyle = '#84713b'; c.fillRect(160, 135, 42, 8); c.fillRect(365, 135, 42, 8);
  });
  const loader = new THREE.TextureLoader();
  const ready = Promise.all([loader.loadAsync('assets/textures/1989/enamel-detail.webp'), loader.loadAsync('assets/textures/1989/brushed-steel.webp')]).then(([enamel, brushed]) => {
    const c = paint.image.getContext('2d'); c.drawImage(enamel.image, 0, 0, 512, 512); panel(c, 512);
    const m = steel.image.getContext('2d'); m.drawImage(brushed.image, 0, 0, 512, 512); m.fillStyle = 'rgba(255,255,255,.3)'; m.fillRect(0, 0, 512, 512);
    paint.needsUpdate = steel.needsUpdate = true; enamel.dispose(); brushed.dispose(); return true;
  }).catch(error => { console.error('[1989] No se pudieron cargar las texturas de objetos:', error); return false; });
  return { paint, steel, fibers, upholstery, tread, wheel, glass, lens, diffuser, feather, vinyl, ceiling, trim, cameraBody, taxiSign, taxiSide, ready };
}
