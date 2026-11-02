// Banco de pruebas del cartel: renderiza la fachada con la cámara de la referencia (1724x912) y guarda capturas.
// Uso: node render.cjs <prefijo> [variantes.json]   — cada variante es código JS que se evalúa antes de su captura.
const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..');
const prefix = process.argv[2] || 'render';
const variants = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : { base: '' };
const views = {
  exterior: 't.camera.position.set(2, 0.5, 55); t.camera.rotation.set(0, 0, 0);',
  detalle: 't.camera.position.set(2, 10.5, 43); t.camera.lookAt(2, 11.55, 28.84);',
  cerca: 't.camera.position.set(2, 1.8, 38); t.camera.lookAt(2, 11.2, 28.84);',
  diagonal: 't.camera.position.set(-9, 1.2, 44); t.camera.lookAt(2, 10.8, 28.84);',
  tubo: 't.camera.position.set(4.5, 11.6, 33.5); t.camera.lookAt(4.2, 11.5, 28.84);',
};
const wanted = (process.env.VIEWS || 'exterior').split(',');

(async () => {
  const types = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(req.url.split('?')[0]);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filename, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
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
    page.on('console', message => { if (message.type() === 'error' || message.text().includes('[neon]')) errors.push(message.text()); });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/?perf`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__perf?.ctx?.museum, null, { timeout: 60000 });
    await page.evaluate(async () => {
      const t = window.__perf;
      t.camera.position.set(2, 0.5, 55); t.camera.rotation.set(0, 0, 0);
      document.querySelector('#overlay').style.display = 'none';
      await Promise.race([t.ctx.museum.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Museum assets timeout')), 60000))]);
    });
    await page.waitForFunction(() => window.__perf.ctx.museum.neon.uniforms.neonWarmDim.value > 0, null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    for (const [name, code] of Object.entries(variants)) {
      if (code) await page.evaluate(`(() => { const t = window.__perf, m = t.ctx.museum; ${code} })()`);
      for (const view of wanted) {
        await page.evaluate(`(() => { const t = window.__perf; ${views[view]} })()`);
        await page.waitForTimeout(900);
        const file = path.join(__dirname, `${prefix}-${name}${view === 'exterior' ? '' : '-' + view}.png`);
        await page.screenshot({ path: file });
        console.log('captura', path.basename(file));
      }
    }
    if (errors.length) console.log('errores:', JSON.stringify(errors, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
