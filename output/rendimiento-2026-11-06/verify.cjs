const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = process.cwd(), out = __dirname, baseline = process.argv.includes('--baseline');
// Snapshot the source so edits cannot change a measurement already in progress.
const source = new Map(fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => ['/js/' + f, fs.readFileSync(path.join(root, 'js', f))]));
if (baseline) {
  const {execFileSync} = require('child_process');
  for (const f of ['visibility.js','light-budget.js','lighting.js','forest-materials.js','roomforest.js','room1989.js','roomreputation.js','roomlover.js','roommidnights.js','intro.js','trophies.js','interaction.js','rooms.js','songshelf.js']) source.set('/js/'+f, execFileSync('git',['show','HEAD:js/'+f],{cwd:root}));
  let main = source.get('/js/main.js').toString();
  main = main.replace("import { createRoomRegistry, setupStreaming } from './streaming.js';", '').replace('const registry = createRoomRegistry(ctx);','');
  main = main.replace(/const room1 = registry.build\('Fearless',[\s\S]*?\n\}\);/, 'const room1 = buildFearlessRoom(ctx);\nctx.glitter = createGlitter(ctx);\ncreateFearlessPuzzle(ctx, room1);');
  main = main.replace(/registry.build\('[^']+', \(\) => (build\w+\(ctx, room\d\))\)/g,'$1');
  main = main.replace(/registry.build\('Vitrinas',[\s\S]*?\n\}\);/, 'buildTrophyHall(ctx);\nbuildSongShelf(ctx);');
  main = main.replace(/\/\/ Museum and trophies share materials[\s\S]*?if \(params.has\('perf'\)\) window.__perf = [^\n]+/, "if (params.has('perf')) window.__perf = {renderer,scene,camera,composer,ctx,player,visibility,lightBudget};");
  main = main.replace(/  \/\/ After updaters:[^\n]*\n  ctx.streaming.update\(dt\);/, '');
  source.set('/js/main.js', Buffer.from(main));
}
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]), relative = url === '/' ? '/index.html' : url;
  const file = path.resolve(root, '.' + relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  const send = (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream'); res.end(data); };
  if (source.has(relative)) return send(null, source.get(relative));
  fs.readFile(file, send);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [], failedAssets = [], warnings = [];
    page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.error(m.text().slice(0, 600)); } if (m.type() === 'warning') warnings.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('/assets/')) failedAssets.push(r.url()); });
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await page.route('https://fonts.gstatic.com/**', r => r.abort());
    await page.route('**/js/main.js', r => r.fulfill({ contentType: 'application/javascript', body: source.get('/js/main.js').toString() + '\nwindow.__test={scene,camera,ctx,renderer,composer,intro,room1,room2,room3,room4,room5,room6,player,jumpToRoom,visibility,lightBudget};' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/?skip&perf`, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__test && !document.body.classList.contains('is-loading'), null, { timeout: 300000 });
    console.log('initialized', baseline ? 'baseline' : 'optimized');
    await page.evaluate(() => { const t = window.__test; t.intro.onLock(); document.getElementById('overlay').style.display = 'none'; t.jumpToRoom(6, [t.room1,t.room2,t.room3,t.room4,t.room5,t.room6]); });
    await page.waitForFunction(() => window.__test.lightBudget.precompiled.length === 3, null, { timeout: 300000 });
    const report = { baseline, viewport: [1280,800], errors, failedAssets, warnings, views: {} };
    const views = [ [5,'forest-entry',0,14.2,0,4], [5,'forest-cabin',-11.5,1.9,-11.5,-3], [5,'forest-snow',8,6.6,8,-1], [6,'midnights',0,15.2,0,-8], [1,'fearless-return',0,3.2,0,-3] ];
    for (const [n,name,x,z,tx,tz] of views) {
      await page.evaluate(({n,x,z,tx,tz}) => { const t = window.__test, b = t['room'+n].bounds, cz = (b.minZ+b.maxZ)/2; t.camera.position.set(x,1.7,cz+z); t.camera.lookAt(tx,1.7,cz+tz); }, {n,x,z,tx,tz});
      await page.waitForTimeout(2500);
      report.views[name] = await page.evaluate(async () => {
        const t = window.__test, frames = [], calls = [], triangles = []; let last = performance.now();
        t.renderer.info.autoReset = false; t.renderer.info.reset();
        for (let i=0;i<35;i++) { await new Promise(requestAnimationFrame); const now=performance.now(); frames.push(now-last); last=now; calls.push(t.renderer.info.render.calls); triangles.push(t.renderer.info.render.triangles); t.renderer.info.reset(); }
        t.renderer.info.autoReset = true;
        const avg = a => a.reduce((x,y)=>x+y,0)/a.length;
        const stream = t.ctx.streaming;
        return { frameMs:avg(frames), calls:avg(calls), triangles:avg(triangles), memory:{...t.renderer.info.memory}, heap:performance.memory?.usedJSHeapSize, visibility:structuredClone(t.visibility.stats), streaming:stream?.stats, programs:t.renderer.info.programs.length, lights:t.lightBudget.active, pixelRatio:t.renderer.getPixelRatio(), shadowType:t.renderer.shadowMap.type };
      });
      await page.screenshot({ path: path.join(out, (baseline?'before-':'after-')+name+'.png') });
      console.log(name,JSON.stringify(report.views[name]));
    }
    if (!baseline) {
      report.regressions = await page.evaluate(async () => {
        const THREE = await import('three');
        const {setupStreaming} = await import('/js/streaming.js');
        const {partitionInstances} = await import('/js/spatial-instances.js');
        const check = (ok, message) => { if (!ok) throw Error(message); };
        const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70,1.6,.1,100);
        scene.fog = new THREE.Fog(0,2,26);
        const shared = new THREE.Texture(), privateTexture = new THREE.Texture();
        const sharedGeo = new THREE.BoxGeometry(), privateGeo = new THREE.BoxGeometry();
        const near = new THREE.Group(), far = new THREE.Group();
        near.add(new THREE.Mesh(sharedGeo,new THREE.MeshBasicMaterial({map:shared})));
        far.add(new THREE.Mesh(sharedGeo,new THREE.MeshBasicMaterial({map:shared})),new THREE.Mesh(privateGeo,new THREE.MeshBasicMaterial({map:privateTexture})));
        far.position.z=-200; scene.add(near,far);
        let sharedDisposals=0, textureDisposals=0, geometryDisposals=0;
        shared.addEventListener('dispose',()=>sharedDisposals++);
        privateTexture.addEventListener('dispose',()=>textureDisposals++);
        privateGeo.addEventListener('dispose',()=>geometryDisposals++);
        const entries = [ {name:'near',group:near,bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},resident:true}, {name:'far',group:far,bounds:{minX:-5,maxX:5,minZ:-205,maxZ:-195},resident:true} ];
        const stream = setupStreaming({scene,camera,renderer:{renderLists:{dispose(){}}},entries});
        stream.update(); stream.update(2);
        check(far.parent===null && near.parent===scene,'Distant room must detach');
        check(sharedDisposals===0 && textureDisposals===1 && geometryDisposals===1,'Dispose only exclusive resources, once');
        camera.position.z=-200; stream.update();
        check(far.parent===scene && entries[1].group===far && far.position.z===-200,'Restore original room objects');
        camera.position.z=0; stream.update();
        check(textureDisposals===2,'Eviction must work again after returning');
        const group=new THREE.Group(), geo=new THREE.BoxGeometry(), mat=new THREE.MeshStandardMaterial(), original=new THREE.InstancedMesh(geo,mat,3), matrix=new THREE.Matrix4(), color=new THREE.Color();
        group.add(original);
        const positions=[[-10,0,-10],[2,0,2],[12,0,12]], colors=[0xff0000,0x00ff00,0x0000ff];
        positions.forEach((p,i)=>{original.setMatrixAt(i,matrix.makeTranslation(...p));original.setColorAt(i,color.set(colors[i]));});
        const chunks=partitionInstances(original), restored=[];
        chunks.forEach(c=>{check(c.frustumCulled && c.material===mat && c.geometry===geo,'Retain original quality and enable culling');for(let i=0;i<c.count;i++){c.getMatrixAt(i,matrix);c.getColorAt(i,color);restored.push({p:[matrix.elements[12],matrix.elements[13],matrix.elements[14]],color:color.getHex()});}});
        check(restored.length===3 && positions.every((p,i)=>restored.some(r=>r.p.every((v,j)=>v===p[j])&&r.color===colors[i])),'No instance, colour or transform may be lost');
        return {sharedResourcesProtected:true,exclusiveResourcesDisposedOnce:true,roomIdentityAndStateRetained:true,repeatedEviction:true,allInstanceTransformsAndColorsRetained:true};
      });
      assert(report.views['forest-cabin'].streaming.sleeping.includes('Fearless'));
      assert(report.views['forest-cabin'].streaming.sleeping.includes('Museo'));
      assert(report.views['forest-cabin'].streaming.sleeping.includes('Vitrinas'));
      assert(report.views['forest-cabin'].memory.textures < report.views['fearless-return'].memory.textures);
      report.restoration = await page.evaluate(async () => {
        const t=window.__test, before=[...t.ctx.game.items];
        t.intro.returnToHall(); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
        if(!t.scene.getObjectByName('stream-museum') || !t.scene.getObjectByName('stream-Vitrinas')) throw Error('Museum did not wake on teleport');
        if(JSON.stringify(before)!==JSON.stringify([...t.ctx.game.items])) throw Error('Lost inventory while restoring museum');
        return {museumTeleport:true,inventoryRetained:true,doorStates:[t.room1,t.room2,t.room3,t.room4,t.room5].map(r=>!r.door.locked)};
      });
      await page.screenshot({path:path.join(out,'after-museum-restored.png')});
    }
    assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
    fs.writeFileSync(path.join(out, baseline ? 'baseline.json' : 'optimized.json'), JSON.stringify(report,null,2));
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode=1; server.close(); });
