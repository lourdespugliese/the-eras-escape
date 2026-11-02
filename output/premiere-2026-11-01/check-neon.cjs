const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const assert = require('node:assert/strict');
const root = process.cwd();
const output = path.join(root, 'output/premiere-2026-11-01');

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
    console.log('Browser ready');
    const page = await browser.newPage({ viewport: { width: 1724, height: 912 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.log('Page error:', error.message); });
    page.on('requestfailed', request => console.log('Request failed:', request.url(), request.failure()?.errorText));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('**/js/main.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nwindow.__museumTest={scene,camera,ctx,renderer,intro};' });
    });
    const url = 'http://127.0.0.1:' + server.address().port;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page loaded');
    await page.waitForFunction(() => window.__museumTest, { timeout: 60000 });
    console.log('Scene ready');
    await page.evaluate(async () => {
      const t = window.__museumTest;
      t.camera.position.set(2, 0.5, 55); t.camera.rotation.set(0, 0, 0);
      document.querySelector('#overlay').style.display = 'none';
      await Promise.race([t.ctx.museum.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Museum assets timeout')), 60000))]);
    });
    console.log('Textures ready');
    await page.waitForFunction(() => window.__museumTest.ctx.museum.neon.lights.every(l => l.intensity > 0));
    await page.waitForTimeout(2500);
    const exterior = await page.evaluate(() => {
      const { ctx } = window.__museumTest, { neon } = ctx.museum;
      const tubes = neon.group.getObjectByName('museum-neon-tubes');
      const p = tubes.geometry.attributes.position;
      let outsidePediment = 0;
      // El borde inclinado de piedra: y = 13.6 - |x - 2| * 3.8 / 18.
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i) + neon.group.position.y;
        if (y < 9.9 || y > 13.6 - Math.abs(x) * 3.8 / 18 - 0.06) outsidePediment++;
      }
      return {
        text: neon.group.userData.text, lightsOn: neon.lights.every(l => l.intensity > 0),
        mergedTubeMeshes: neon.group.children.filter(o => o.isMesh && o.name.includes('tubes')).length,
        triangles: tubes.geometry.index.count / 3, outsidePediment,
        banners: ctx.museum.premiere.banners.length,
        noClock: !ctx.museum.root.children.some(o => o.geometry?.type === 'CircleGeometry' && o.position.y > 10),
      };
    });
    await page.screenshot({ path: path.join(output, 'exterior-pink-neon.png') });
    await page.evaluate(() => {
      const t = window.__museumTest;
      t.camera.position.set(2, 10.5, 43); t.camera.lookAt(2, 11.55, 28.84);
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(output, 'pink-neon-detail.png') });
    await page.evaluate(() => {
      const t = window.__museumTest;
      t.camera.position.set(2, 1.7, 23.2); t.camera.rotation.set(0, 0, 0);
    });
    await page.waitForTimeout(500);
    const noSpillInside = await page.evaluate(() => window.__museumTest.ctx.museum.neon.lights.every(l => l.intensity === 0));
    await page.goto(url + '/?skip', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__museumTest, { timeout: 60000 });
    const transitions = await page.evaluate(() => {
      const t = window.__museumTest;
      t.intro.onLock();
      const hiddenAfterSkip = !t.ctx.museum.root.visible;
      const lightsOffAfterSkip = t.ctx.museum.neon.lights.every(l => l.intensity === 0);
      t.intro.returnToHall();
      return { hiddenAfterSkip, lightsOffAfterSkip, restored: t.ctx.museum.root.visible, returnZ: t.camera.position.z };
    });
    const report = { exterior, noSpillInside, transitions, errors };
    fs.writeFileSync(path.join(output, 'verification-pink-neon.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert.equal(exterior.text, 'Taylor Swift Museum');
    assert.equal(exterior.outsidePediment, 0, 'Neon must stay inside the pediment');
    assert.equal(exterior.mergedTubeMeshes, 1);
    assert.equal(exterior.banners, 6);
    assert(exterior.lightsOn && exterior.noClock && noSpillInside);
    assert(transitions.hiddenAfterSkip && transitions.lightsOffAfterSkip && transitions.restored);
    assert.equal(transitions.returnZ, 23.2);
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
