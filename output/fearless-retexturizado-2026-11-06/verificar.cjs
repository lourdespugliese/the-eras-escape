const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.cwd(),out=__dirname;
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
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[],failedAssets=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,1200));});
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))failedAssets.push(r.url());});
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.route('**/js/main.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
   body+='\nwindow.__test={scene,camera,ctx,renderer,composer,intro,room1,room2,room3,room4,room5,room6,player};';
   await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__test,{timeout:90000});
  assert.equal(await page.evaluate(()=>window.__test.room1.materials.ready),true,'Material assets must load');
  await page.evaluate(()=>{window.__test.intro.onLock();document.querySelector('#overlay').style.display='none';});
  await page.waitForTimeout(2200);
  const shots=[
   {name:'entrada',x:2,y:1.7,z:3.2,tx:2,ty:1.55,tz:-4},
   {name:'diagonal',x:-3.2,y:1.7,z:2.6,tx:3,ty:1.55,tz:-1},
   {name:'contraplano',x:7.2,y:1.7,z:-2.6,tx:1,ty:1.55,tz:1},
   {name:'libro',x:3.1,y:1.7,z:2.7,tx:2,ty:1.05,tz:2.8},
   {name:'piso-pared',x:5.8,y:1.7,z:-2.7,tx:8.65,ty:0.65,tz:-3.1},
  ];
  for(const v of shots){
   await page.evaluate(v=>{const t=window.__test;t.camera.position.set(v.x,v.y,v.z);t.camera.lookAt(v.tx,v.ty,v.tz);},v);
   await page.waitForTimeout(650);await page.screenshot({path:path.join(out,v.name+'.png')});console.log(v.name);
  }
  const initial=await page.evaluate(()=>({locked:window.__test.room1.door.locked,solved:window.__test.ctx.game.solved,bounds:window.__test.room1.bounds,wall:window.__test.room1.materials.wall.name}));
  assert.equal(initial.locked,true);assert.equal(initial.solved,0);
  await page.evaluate(()=>{
   const t=window.__test;t.camera.position.set(2,1.7,3.2);t.camera.lookAt(2,1.55,-4);
   const near=(a,b)=>Math.abs(a-b)<0.02;
   for(const x of [-2.7,-0.1,-1.4,-4]){
    const item=t.ctx.interaction.items.find(i=>near(i.mesh.position.x,x)&&near(i.mesh.position.z,.5)&&i.mesh.isGroup);
    if(!item||!item.enabled())throw Error('Pedestal musical no disponible');item.onInteract();
   }
   for(const [x,z,targetZ] of [[-3.3,-3.4,-3],[5.5,4,0],[-.8,4.2,3]]){
    const item=t.ctx.interaction.items.find(i=>near(i.mesh.position.x,x)&&near(i.mesh.position.z,z)&&near(i.mesh.position.y,.74)&&i.mesh.isGroup);
    if(!item||!item.enabled())throw Error('Objeto de historia no disponible');item.onInteract();
    const plinth=t.ctx.interaction.items.find(i=>near(i.mesh.position.x,8.25)&&near(i.mesh.position.z,targetZ)&&near(i.mesh.position.y,0)&&i.mesh.isGroup);
    if(!plinth||!plinth.enabled())throw Error('Pedestal de historia no disponible');plinth.onInteract();
   }
  });
  await page.waitForFunction(()=>window.__test.ctx.game.solved===2,{timeout:12000});
  await page.waitForFunction(()=>window.__test.ctx.interaction.items.find(i=>i.prompt().includes('Guitarra Dorada'))?.enabled(),{timeout:20000});
  await page.screenshot({path:path.join(out,'resuelta.png')});
  const solved=await page.evaluate(()=>{
   const t=window.__test,item=t.ctx.interaction.items.find(i=>i.prompt().includes('Guitarra Dorada'));
   const result={solved:t.ctx.game.solved,guitarVisible:item.mesh.visible,guitarReady:item.enabled(),wallTextureLoaded:t.room1.materials.wall.map.version>1};
   if(!item.mesh.visible||!item.enabled())throw Error('La recompensa no se puede recoger');
   item.onInteract();return {...result,collected:t.ctx.game.items.has('guitar'),doorUnlocked:!t.room1.door.locked};
  });
  assert.equal(solved.collected,true);assert.equal(solved.doorUnlocked,true);assert.equal(solved.wallTextureLoaded,true);
  await page.waitForFunction(()=>!window.__test.room1.door.mesh.visible,{timeout:12000});
  const entrance=await page.evaluate(()=>{
   const t=window.__test;t.intro.returnToHall();return {museumVisible:t.ctx.museum.root.visible,position:t.camera.position.toArray()};
  });
  assert.equal(entrance.museumVisible,true);
  fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify({initial,solved,entrance,errors,failedAssets,shots},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
  console.log(JSON.stringify({initial,solved,entrance,errors,failedAssets}));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
