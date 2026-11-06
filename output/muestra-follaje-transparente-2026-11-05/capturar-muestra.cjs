const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'), fs=require('fs'), path=require('path');
const root=process.cwd(), out=__dirname;
fs.mkdirSync(path.join(out,'cuadros'),{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try {
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,600));});
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
 await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.route('**/js/roomforest.js',async route=>{
  let body=fs.readFileSync(path.join(root,'js/roomforest.js'),'utf8');
  body="import { installTreePreview } from '/output/muestra-follaje-transparente-2026-11-05/wind-preview.js';\n"+body;
  body=body.replace('  // Gran árbol del cruce', '  installTreePreview(ctx, [coneA, coneB, coneC, blobA, blobB], trunks);\n\n  // Gran árbol del cruce');
  await route.fulfill({status:200,contentType:'application/javascript',body});
 });
 await page.route('**/js/main.js',async route=>{
  let body=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
  body=body.replace('  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;', '  if(window.__previewFrozen) return;\n  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;');
  body+='\nwindow.__capture={scene,camera,ctx,renderer,composer,intro,jumpToRoom,rooms:[room1,room2,room3,room4,room5,room6]};';
  await route.fulfill({status:200,contentType:'application/javascript',body});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__capture?.ctx.treePreview?.ready(),{timeout:90000});
 if(process.argv.includes('--scout')){
  await page.evaluate(()=>{const c=window.__capture;c.intro.onLock();c.jumpToRoom(5,c.rooms);document.querySelector('#overlay').style.display='none';});
  const views=[{name:'entrada',x:0,z:14.2,tx:0,tz:4,y:1.7,ty:3.7},{name:'cabana',x:-11.5,z:3,tx:-5,tz:4,y:1.7,ty:3.2},{name:'nieve',x:8,z:10,tx:8,tz:3,y:1.7,ty:3.3},{name:'claro',x:-2,z:7,tx:-8,tz:4,y:1.7,ty:4.0}];
  for(const v of views){
   await page.evaluate(v=>{const c=window.__capture,b=c.rooms[4].bounds,cz=(b.minZ+b.maxZ)/2;c.camera.position.set(v.x,v.y,cz+v.z);c.camera.lookAt(v.tx,v.ty,cz+v.tz);},v);
   await page.waitForTimeout(1600);
   await page.screenshot({path:path.join(out,'vista-'+v.name+'.png'),animations:'disabled'});
   console.log(v.name);
  }
  return;
 }
 await page.evaluate(()=>{
  const c=window.__capture;c.intro.onLock();c.jumpToRoom(5,c.rooms);
  const b=c.rooms[4].bounds,cz=(b.minZ+b.maxZ)/2;
  c.camera.position.set(-11.5,1.7,cz+3);c.camera.lookAt(-5,3.2,cz+4);
  document.querySelector('#overlay').style.display='none';
 });
 await page.waitForTimeout(2200);
 await page.evaluate(()=>{window.__previewFrozen=true;});
 const diagnostics=await page.evaluate(()=>{
  const c=window.__capture,u=c.ctx.treePreview.uniforms;u.previewDetail.value=0;u.previewStrength.value=0;u.previewCutout.value=0;c.composer.render();
  return {groups:c.ctx.treePreview.groups,render:{...c.renderer.info.render},textures:c.renderer.info.memory.textures};
 });
 await page.screenshot({path:path.join(out,'antes.png'),animations:'disabled'});
 const frameCount=60,fps=10;
 for(let i=0;i<frameCount;i++){
  await page.evaluate(time=>{const c=window.__capture,u=c.ctx.treePreview.uniforms;u.previewDetail.value=0.70;u.previewStrength.value=1;u.previewCutout.value=1;c.ctx.treePreview.setTime(time);c.renderer.shadowMap.needsUpdate=true;c.composer.render();},i/fps);
  await page.screenshot({path:path.join(out,'cuadros',String(i).padStart(3,'0')+'.png'),animations:'disabled',timeout:60000});
  if(i%10===0)console.log(`Cuadro ${i+1}/${frameCount}`);
 }
 fs.copyFileSync(path.join(out,'cuadros','000.png'),path.join(out,'despues.png'));
 const after=await page.evaluate(()=>({render:{...window.__capture.renderer.info.render},textures:window.__capture.renderer.info.memory.textures,gifFrames:window.__capture.ctx.treePreview.frameCount,textureVersion:window.__capture.ctx.treePreview.texture.version}));
 fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify({frameCount,fps,durationSeconds:6,before:diagnostics,after,errors,note:'Visual prototype, not a GPU timing benchmark. Original game source unchanged. Particle state is frozen to isolate canopy motion.'},null,2));
 console.log(JSON.stringify({errors,frames:frameCount}));
 if(errors.length)process.exitCode=1;
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
