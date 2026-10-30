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
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error' || (m.type()==='warning' && m.text().includes('[museum]')))errors.push(m.text())});
await page.route('**/js/main.js',async route=>{const res=await route.fetch();await route.fulfill({response:res,body:(await res.text())+'\nwindow.__museumTest={scene,camera,ctx,renderer,intro};'});});
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__museumTest,{timeout:60000});
await page.evaluate(()=>{const t=window.__museumTest;t.camera.position.set(2,.5,55);t.camera.rotation.set(0,0,0);document.querySelector('#overlay').style.display='none';});
await page.evaluate(() => window.__museumTest.ctx.museum.ready); await page.waitForTimeout(3500);await page.screenshot({path:'output/retexturizado-concepto-2026-10-30/exterior-motor-v2.png'});
await page.evaluate(()=>{const t=window.__museumTest;t.camera.position.set(2,1.7,24.8);t.camera.rotation.set(0,0,0);});
await page.waitForTimeout(4000); if(await page.evaluate(()=>window.__museumTest.ctx.museum.root.getObjectByName('museum-rain').visible))errors.push('Rain visible inside museum'); await page.screenshot({path:'output/retexturizado-concepto-2026-10-30/interior-motor-v2.png'});
await page.goto('http://127.0.0.1:'+server.address().port+'/?skip');
await page.waitForFunction(()=>window.__museumTest);
const transitions=await page.evaluate(()=>{
 const t=window.__museumTest; t.intro.onLock();
 const hidden=!t.ctx.museum.root.visible;
 t.intro.returnToHall();
 return {hiddenAfterSkip:hidden,visibleAfterReturn:t.ctx.museum.root.visible,returnZ:t.camera.position.z};
});
if(!transitions.hiddenAfterSkip || !transitions.visibleAfterReturn || transitions.returnZ!==23.2)errors.push('Museum transition regression');
console.log('transitions',transitions);
console.log(JSON.stringify({errors,diagnostics:await page.evaluate(()=>({materials:window.__museumTest.renderer.info.memory,render:window.__museumTest.renderer.info.render,errorBox:document.querySelector('body > div')?.textContent?.slice(0,200)}))},null,2));
await browser.close();server.close();if(errors.length)process.exitCode=1;
})();

