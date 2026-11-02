const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const http=require('http'),fs=require('fs'),path=require('path');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const name=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
 if(!name.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(name,(err,data)=>{if(err){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary'})[path.extname(name)]||'application/octet-stream');res.end(data);});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel: 'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1724,height:912}});
page.on('requestfailed',r=>console.log('request-failed',r.url(),r.failure()?.errorText));
await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
await page.route('https://fonts.gstatic.com/**',route=>route.abort());
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error' || (m.type()==='warning' && (m.text().includes('[museum]') || m.text().includes('[premiere]'))))errors.push(m.text())});
await page.route('**/js/main.js',async route=>{const res=await route.fetch();await route.fulfill({response:res,body:(await res.text())+'\nwindow.__museumTest={scene,camera,ctx,renderer,intro};'});});
await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__museumTest,{timeout:60000});
await page.evaluate(()=>{const t=window.__museumTest;t.camera.position.set(2,1.7,24.8);t.camera.rotation.set(0,0,0);document.querySelector('#overlay').style.display='none';});
await page.evaluate(()=>window.__museumTest.ctx.museum.ready);
await page.waitForFunction(()=>window.__museumTest.ctx.museum.hallAtmosphere.lights.every(l=>l.intensity>0));
await page.waitForFunction(()=>{
 let found=false; window.__museumTest.scene.traverse(o=>{if(o.isMesh && o.material?.userData?.museumStatue)found=true;});return found;
},{timeout:60000});
await page.waitForTimeout(1800);
const premiere=await page.evaluate(()=>{
 const h=window.__museumTest.ctx.museum.hallAtmosphere;
 const spots=h.lights.filter(l=>l.name==='hall-wall-downlight');
 let statue=false;window.__museumTest.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.museumStatue)statue=true;});return {downlights:spots.length,aimDown:spots.every(l=>l.target.position.y<l.position.y),hallActive:h.lights.every(l=>l.intensity>0),statueLoaded:statue};
});
if(premiere.downlights!==3||!premiere.aimDown)errors.push('Hall downlights regression');
await page.screenshot({path:'output/premiere-2026-11-01/interior-hall-downlights.png'});
await page.evaluate(()=>{const t=window.__museumTest;t.camera.position.set(2,1.7,23.2);t.camera.rotation.set(0,0,0);});
await page.waitForTimeout(800);await page.screenshot({path:'output/premiere-2026-11-01/interior-hall-downlights-close.png'});
await page.evaluate(()=>{window.__museumTest.camera.position.set(2,.5,55);});await page.waitForTimeout(500);
if(await page.evaluate(()=>window.__museumTest.ctx.museum.hallAtmosphere.lights.some(l=>l.intensity>0)))errors.push('Hall light spill outside');
await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>window.__museumTest);
const transitions=await page.evaluate(()=>{
 const t=window.__museumTest; t.intro.onLock();
 const hidden=!t.ctx.museum.root.visible;
 t.intro.returnToHall();
 return {hiddenAfterSkip:hidden,visibleAfterReturn:t.ctx.museum.root.visible,returnZ:t.camera.position.z};
});
if(!transitions.hiddenAfterSkip || !transitions.visibleAfterReturn || transitions.returnZ!==23.2)errors.push('Museum transition regression');
console.log('transitions',transitions);fs.writeFileSync('output/premiere-2026-11-01/verification-hall-downlights.json',JSON.stringify({premiere,transitions,errors},null,2));
console.log(JSON.stringify({errors,diagnostics:await page.evaluate(()=>({materials:window.__museumTest.renderer.info.memory,render:window.__museumTest.renderer.info.render,errorBox:document.querySelector('body > div')?.textContent?.slice(0,200)}))},null,2));
await browser.close();server.close();if(errors.length)process.exitCode=1;
})();

