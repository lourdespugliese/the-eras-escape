import * as THREE from 'three';

function texture(size, draw) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function createFearlessPropTextures() {
  let seed = 1306;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const grain = (context, size, base, amount = 1300) => {
    context.fillStyle = base; context.fillRect(0, 0, size, size);
    for (let i = 0; i < amount; i++) {
      context.fillStyle = i % 3 ? 'rgba(50,40,25,.08)' : 'rgba(255,255,255,.2)';
      context.fillRect(random() * size, random() * size, 1 + random() * 3, 1);
    }
  };
  const brass = texture(256, (c, s) => {
    grain(c, s, '#f0ede4');
    for (let y = 0; y < s; y += 2) { c.fillStyle = `rgba(90,75,50,${.03 + random() * .06})`; c.fillRect(0, y, s, 1); }
  });
  const paper = texture(256, (c, s) => { grain(c, s, '#f1e8d4', 1800); });
  const pages = texture(512, (c, s) => {
    grain(c, s, '#f3ebd7', 2400);
    c.fillStyle = '#6b5131'; c.font = 'italic 34px Georgia'; c.fillText('Recuerdos', 50, 76);
    c.strokeStyle = '#b39b6c'; c.lineWidth = 1; c.strokeRect(30, 28, s - 60, s - 56);
    c.font = '22px Georgia';
    ['Las mariposas siempre', 'conocen el camino.', '', 'Observa el orden en', 'que descansan y la', 'música volverá a sonar.'].forEach((line, i) => c.fillText(line, 52, 138 + i * 37));
    c.fillStyle = '#bba880'; c.fillRect(52, 430, 160, 1);
  });
  const leather = texture(256, (c, s) => {
    grain(c, s, '#d6c8c3', 2800);
    c.strokeStyle = '#a69886'; c.lineWidth = 2; c.strokeRect(12, 12, s - 24, s - 24);
    c.strokeStyle = '#e9d8b6'; c.lineWidth = 1; c.strokeRect(17, 17, s - 34, s - 34);
    c.fillStyle = '#e9d8b6'; c.font = '16px Georgia'; c.textAlign = 'center'; c.fillText('FEARLESS', s / 2, s / 2);
  });
  const cloth = texture(256, (c, s) => {
    grain(c, s, '#eeeeea');
    for (let i = 0; i < s; i += 4) { c.fillStyle = 'rgba(90,85,75,.14)'; c.fillRect(i, 0, 1, s); c.fillRect(0, i, s, 1); }
    c.strokeStyle = '#c1bdb4'; c.setLineDash([3, 3]); c.strokeRect(9, 9, s - 18, s - 18);
  });
  const terracotta = texture(256, (c, s) => {
    grain(c, s, '#e8c7aa', 2600);
    for (let y = 12; y < s; y += 12) { c.strokeStyle = 'rgba(80,42,23,.12)'; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(s / 3, y - 2, s * .7, y + 2, s, y); c.stroke(); }
    c.fillStyle = '#f1d8ba'; c.fillRect(0, 10, s, 8); c.fillStyle = '#a57451'; c.fillRect(0, 20, s, 3);
  });
  const soil = texture(128, (c, s) => { grain(c, s, '#3b2e20', 2000); });
  const leaf = texture(256, (c, s) => {
    const g = c.createLinearGradient(60, 0, 180, 0); g.addColorStop(0, '#26482b'); g.addColorStop(.5, '#678843'); g.addColorStop(1, '#355b31');
    c.fillStyle = g; c.beginPath(); c.moveTo(128, 6); c.bezierCurveTo(245, 110, 190, 214, 128, 250); c.bezierCurveTo(62, 214, 11, 110, 128, 6); c.fill();
    c.strokeStyle = '#a2b770'; c.lineWidth = 2; c.beginPath(); c.moveTo(128, 20); c.lineTo(128, 248); c.stroke();
    for (let y = 65; y < 220; y += 24) { c.strokeStyle = 'rgba(186,205,126,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(128, y + 24); c.lineTo(75 + Math.abs(y - 140) * .25, y); c.moveTo(128, y + 24); c.lineTo(181 - Math.abs(y - 140) * .25, y); c.stroke(); }
  });
  const foliage = texture(128, (c, s) => { grain(c, s, '#648149', 2200); });
  const wax = texture(256, (c, s) => {
    grain(c, s, '#f4ead4');
    for (let x = 16; x < s; x += 37) { const drip = c.createLinearGradient(0, 0, 0, s * .7); drip.addColorStop(0, '#fff8e7'); drip.addColorStop(1, '#e5d6b8'); c.fillStyle = drip; c.fillRect(x, 0, 5, 50 + random() * 110); }
  });
  const flame = texture(128, (c) => {
    const g = c.createLinearGradient(0, 8, 0, 124); g.addColorStop(0, 'rgba(255,185,36,.05)'); g.addColorStop(.5, '#ffca53'); g.addColorStop(.85, '#fff5bd'); g.addColorStop(1, 'rgba(255,150,20,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(65, 5); c.bezierCurveTo(60, 45, 18, 67, 37, 103); c.bezierCurveTo(55, 133, 94, 116, 94, 90); c.bezierCurveTo(94, 57, 68, 35, 65, 5); c.fill();
  });
  const body = texture(128, (c, s) => { grain(c, s, '#705634', 1200); for (let y = 0; y < s; y += 9) { c.fillStyle = '#3b2c19'; c.fillRect(0, y, s, 1); } });
  const fretboard = texture(256, (c, s) => {
    grain(c, s, '#493225');
    for (let x = 78; x <= 178; x += 20) { c.fillStyle = '#c7b78b'; c.fillRect(x, 0, 1, s); }
    for (let y = 16; y < s; y += 24) { c.fillStyle = '#998460'; c.fillRect(65, y, 126, 2); }
  });
  const guitarFace = texture(512, (c, s) => {
    grain(c, s, '#d8b976');
    for (let x = 0; x < s; x += 4) { c.fillStyle = `rgba(88,51,14,${.03 + random() * .10})`; c.fillRect(x, 0, 1, s); }
    for (const radius of [77, 82, 87, 93]) { c.strokeStyle = '#62472a'; c.lineWidth = radius % 2 ? 2 : 3; c.beginPath(); c.arc(s / 2, s / 2, radius, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#715233'; c.fillRect(210, 78, 92, 15);
    for (let x = 244; x <= 269; x += 5) { c.fillStyle = '#eadcaa'; c.fillRect(x, 0, 1, s); }
  });
  const guitarWood = texture(512, (c, s) => {
    grain(c, s, '#d8b976');
    for (let x = 0; x < s; x += 4) { c.fillStyle = `rgba(88,51,14,${.03 + random() * .10})`; c.fillRect(x, 0, 1, s); }
  });
  const gem = texture(64, (c, s) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, s, s); c.fillStyle = '#d6e5ee'; c.beginPath(); c.moveTo(0, s); c.lineTo(s, 0); c.lineTo(s, s); c.fill(); });
  const wing = new THREE.Texture(); wing.colorSpace = THREE.SRGBColorSpace; wing.anisotropy = 4;
  const wingLeft = wing.clone(); wingLeft.repeat.x = -1; wingLeft.offset.x = 1;
  const flower = new THREE.Texture(); flower.colorSpace = THREE.SRGBColorSpace; flower.anisotropy = 4;
  const loader = new THREE.TextureLoader();
  const ready = Promise.all([loader.loadAsync('assets/textures/fearless/butterfly-wing.webp'), loader.loadAsync('assets/textures/fearless/golden-flower.webp')]).then(([wingSource, flowerSource]) => {
    wing.image = wingSource.image; wingLeft.image = wingSource.image; flower.image = flowerSource.image;
    [wing, wingLeft, flower].forEach(map => { map.needsUpdate = true; });
    wingSource.dispose(); flowerSource.dispose(); return true;
  }).catch(error => { console.error('[Fearless] No se pudieron cargar alas y flores:', error); return false; });
  return { brass, paper, pages, leather, cloth, terracotta, soil, leaf, foliage, wax, flame, body, fretboard, guitarFace, guitarWood, gem, wing, wingLeft, flower, ready };
}
