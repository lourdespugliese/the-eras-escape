const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.cwd(), out = path.join(__dirname, 'capturas');
fs.mkdirSync(out, { recursive: true });
(async () => {
 const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser = await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 try {
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
 await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.route('**/js/main.js',async route=>{const res=await route.fetch();await route.fulfill({response:res,body:await res.text()+'\nwindow.__capture={scene,camera,ctx,renderer,intro,jumpToRoom,rooms:[room1,room2,room3,room4,room5,room6]};'});});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__capture,{timeout:90000});
 await page.evaluate(()=>{window.__capture.intro.onLock();document.querySelector('#overlay').style.display='none';});
 await page.waitForTimeout(5000);
 const onlyForest=process.argv.includes('--forest');
 const report=onlyForest ? JSON.parse(fs.readFileSync(path.join(__dirname,'registro.json'),'utf8')).rooms : [];
 const names=['fearless','1989','reputation','lover','folklore-evermore','midnights'];
 for(let i=0;i<6;i++) {
  if(onlyForest && i!==4) continue;
  const room=await page.evaluate(i=>{const t=window.__capture;t.jumpToRoom(i+1,t.rooms);return {name:t.ctx.rooms[i].name,bounds:t.rooms[i].bounds};},i);
  const b=room.bounds,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
  const views=[{name:'entrada',x:cx,z:b.maxZ-1.8,tx:cx,tz:b.minZ+1}, {name:'diagonal',x:b.minX+1.8,z:b.maxZ-2.4,tx:cx+1,tz:cz-1}, {name:'contraplano',x:b.maxX-1.8,z:b.minZ+2.4,tx:cx-1,tz:cz+1}];
  if(i===4){views[1]={name:'diagonal',x:-11.5,z:cz+3,tx:-11.5,tz:cz-3};views[2]={name:'contraplano',x:8,z:cz+10,tx:8,tz:cz+2};}
  for(const v of views){
   await page.evaluate(v=>{const t=window.__capture;t.camera.position.set(v.x,1.7,v.z);t.camera.lookAt(v.tx,1.55,v.tz);},v);
   await page.waitForTimeout(1400);
   const file=`${i+1}-${names[i]}-${v.name}.png`;
   await page.screenshot({path:path.join(out,file)});
   console.log(file);
  }
  if(onlyForest) report[i]={...room,slug:names[i],views}; else report.push({...room,slug:names[i],views});
 }
 fs.writeFileSync(path.join(__dirname,'registro.json'),JSON.stringify({capturedAt:new Date().toISOString(),viewport:{width:1440,height:900},rooms:report,errors},null,2));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
