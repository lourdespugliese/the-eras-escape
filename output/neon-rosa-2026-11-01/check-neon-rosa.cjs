// Verificación del cartel rosa: geometría dentro del frontón, luz sobre la piedra solo desde fuera,
// transiciones de ?skip y vuelta al hall, sin errores. Uso: node output/neon-rosa-2026-11-01/check-neon-rosa.cjs
const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(req.url.split('?')[0]);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filename, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' })[path.extname(filename)] || 'application/octet-stream');
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 1724, height: 912 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('**/js/main.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nwindow.__museumTest={scene,camera,ctx,renderer,intro};' });
    });
    const url = 'http://127.0.0.1:' + server.address().port;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__museumTest, null, { timeout: 60000 });
    await page.evaluate(async () => {
      const t = window.__museumTest;
      t.camera.position.set(2, 0.5, 55); t.camera.rotation.set(0, 0, 0);
      document.querySelector('#overlay').style.display = 'none';
      await Promise.race([t.ctx.museum.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Museum assets timeout')), 60000))]);
    });
    await page.waitForFunction(() => window.__museumTest.ctx.museum.neon.uniforms.neonWarmDim.value > 0, null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    const exterior = await page.evaluate(() => {
      const { ctx, scene } = window.__museumTest, { neon } = ctx.museum, u = neon.uniforms;
      const tubes = neon.group.getObjectByName('museum-neon-tubes');
      const p = tubes.geometry.attributes.position;
      let outsidePediment = 0, hiddenByCornice = 0;
      // Borde inclinado de piedra: y = 13.6 - |x| * 3.8 / 18 (x local, centro del frontón). La cornisa tapa por debajo de y = 10.
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i) + neon.group.position.y;
        if (y < 9.9 || y > 13.6 - Math.abs(x) * 3.8 / 18 - 0.06) outsidePediment++;
        if (y < 10) hiddenByCornice++;
      }
      const stones = new Set();
      scene.traverse(o => { if (o.isMesh && o.material.customProgramCacheKey?.() === 'museum-neon-stone') stones.add(o.material); });
      return {
        text: neon.group.userData.text,
        mergedTubeMeshes: neon.group.children.filter(o => o.isMesh && o.name.includes('tubes')).length,
        triangles: tubes.geometry.index.count / 3, outsidePediment, hiddenByCornice,
        stoneLit: u.neonWarmDim.value === 1 && u.neonGlowColor.value.r > 0, litStoneMaterials: stones.size,
        pointLights: neon.group.children.filter(o => o.isLight).length,
        banners: ctx.museum.premiere.banners.length,
      };
    });
    await page.evaluate(() => {
      const t = window.__museumTest;
      t.camera.position.set(2, 1.7, 23.2); t.camera.rotation.set(0, 0, 0);
    });
    await page.waitForTimeout(600);
    const inside = await page.evaluate(() => {
      const u = window.__museumTest.ctx.museum.neon.uniforms;
      return { dim: u.neonWarmDim.value, glow: u.neonGlowColor.value.r + u.neonGlowColor.value.g + u.neonGlowColor.value.b };
    });
    await page.goto(url + '/?skip', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__museumTest, null, { timeout: 60000 });
    const transitions = await page.evaluate(() => {
      const t = window.__museumTest, u = t.ctx.museum.neon.uniforms;
      t.intro.onLock();
      const hiddenAfterSkip = !t.ctx.museum.root.visible, offAfterSkip = u.neonWarmDim.value === 0;
      t.intro.returnToHall();
      return { hiddenAfterSkip, offAfterSkip, restored: t.ctx.museum.root.visible, returnZ: t.camera.position.z };
    });
    const report = { exterior, inside, transitions, errors };
    fs.writeFileSync(path.join(__dirname, 'verificacion.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert.equal(exterior.text, 'Taylor Swift Museum');
    assert.equal(exterior.outsidePediment, 0, 'El cartel debe quedar dentro del frontón');
    assert.equal(exterior.hiddenByCornice, 0, 'Ningún tubo debe quedar detrás de la cornisa desde la plaza');
    assert.equal(exterior.mergedTubeMeshes, 1);
    assert.equal(exterior.pointLights, 0);
    assert(exterior.stoneLit && exterior.litStoneMaterials >= 3, 'La caliza del frontón y sus copias reciben la luz');
    assert.equal(exterior.banners, 6);
    assert.deepEqual(inside, { dim: 0, glow: 0 }, 'Dentro del hall la luz del cartel está apagada');
    assert(transitions.hiddenAfterSkip && transitions.offAfterSkip && transitions.restored);
    assert.equal(transitions.returnZ, 23.2);
    assert.deepEqual(errors, []);
    console.log('OK');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
