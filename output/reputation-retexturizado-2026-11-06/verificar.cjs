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
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[],failedAssets=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,1200));});
  page.on('requestfailed',request=>console.log('request-failed',request.url(),request.failure()?.errorText));
  page.on('response',response=>{if(response.url().includes('/js/main.js'))console.log('main-loaded');});
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))failedAssets.push(r.url());});
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.route('**/js/main.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
   body+='\nwindow.__test={scene,camera,ctx,renderer,composer,intro,room1,room2,room3,room4,room5,room6,player,jumpToRoom};';
   await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.route('**/js/roomreputation.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/roomreputation.js'),'utf8');
   body=body.replace('return { ...room, door, lights, removeHall, materials, propsRoot: g };',`window.__repTest={tiles,targets,swing,CZ,heldBat,recordPlayer,snake,state:()=>({idx,solved,batHeld,batReady,mirrorBroken,now:nowRef,swingStart})};return { ...room, door, lights, removeHall, materials, propsRoot: g };`);
   await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'commit',timeout:60000});
  await page.waitForFunction(()=>window.__test&&window.__repTest,null,{timeout:180000}).catch(error=>{console.error(JSON.stringify({errors,failedAssets}));throw error;});
  console.log('game-initialized');
  assert.deepEqual(await page.evaluate(()=>Promise.all([window.__test.room1.materials.ready,window.__test.room2.materials.ready,window.__test.room3.materials.ready])),[true,true,true]);
  await page.evaluate(()=>{const t=window.__test;t.intro.onLock();t.jumpToRoom(3,[t.room1,t.room2,t.room3,t.room4,t.room5,t.room6]);document.querySelector('#overlay').style.display='none';});
  await page.waitForTimeout(1800);
  const shots=[
   {name:'entrada',x:0,y:1.7,z:4.2,tx:0,ty:1.55,tz:-5},
   {name:'diagonal',x:-4.2,y:1.7,z:3.6,tx:1,ty:1.55,tz:-1},
   {name:'contraplano',x:4.2,y:1.7,z:-3.6,tx:-1,ty:1.55,tz:1},
   {name:'trono',x:3.4,y:1.6,z:1.1,tx:5.1,ty:1.4,tz:0},
   {name:'escamas',x:5.0,y:1.1,z:-2.9,tx:5.66,ty:1.25,tz:-2.7},
   {name:'porcelana',x:0.75,y:1.3,z:.65,tx:0,ty:.9,tz:-.2},
   {name:'cortinas',x:2.5,y:1.7,z:-4.4,tx:1.85,ty:1.7,tz:-5.7},
   {name:'espejo',x:2.8,y:1.7,z:4.2,tx:3.75,ty:2,tz:5.74},
   {name:'letras',x:-.3,y:1.7,z:-.9,tx:-1.2,ty:.04,tz:-2.6},
   {name:'recortes',x:-4.4,y:1.9,z:3,tx:-5.72,ty:2.1,tz:2.4},
  ];
  for(const v of shots){await page.evaluate(v=>{const t=window.__test,CZ=window.__repTest.CZ;t.camera.position.set(v.x,v.y,v.z+CZ);t.camera.lookAt(v.tx,v.ty,v.tz+CZ);},v);await page.waitForTimeout(650);await page.screenshot({path:path.join(out,v.name+'.png')});console.log(v.name);}
  const coverage=await page.evaluate(()=>{
   const t=window.__test,materials=new Set(),missing=[];
   for(const root of [t.room3.group,t.room3.propsRoot,t.room3.door.mesh,window.__repTest.heldBat])root.traverse(mesh=>{
    if(!mesh.isMesh)return;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
     if(!material.isMeshStandardMaterial)continue;materials.add(material);if(!material.map)missing.push(material.name||mesh.geometry.type);
    }
   });return {physicalMaterials:materials.size,withoutColorTexture:missing};
  });
  assert.deepEqual(coverage.withoutColorTexture,[]);
  const step=async(letter)=>{await page.evaluate(letter=>{const t=window.__test,r=window.__repTest,tl=r.tiles.find(v=>v.l===letter);t.camera.position.set(tl.x,1.7,r.CZ+tl.z);},letter);await page.waitForTimeout(150);};
  await step('H');
  assert.equal(await page.evaluate(()=>window.__repTest.state().idx),0);
  assert.equal(await page.evaluate(()=>window.__repTest.tiles.find(t=>t.l==='H').crack.visible),true);
  for(const [index,letter] of [...'REPUTATION'].entries()){await step(letter);assert.equal(await page.evaluate(()=>window.__repTest.state().idx),index+1);}
  console.log('word-solved');
  await page.waitForFunction(()=>window.__repTest.state().batReady,null,{timeout:20000});
  await page.evaluate(()=>{const t=window.__test,item=t.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para recoger el bate.');if(!item.enabled())throw Error('Bate deshabilitado');item.onInteract();});
  assert.equal(await page.evaluate(()=>window.__repTest.state().batHeld),true);
  assert.equal(await page.evaluate(()=>window.__test.room3.materials.brass.depthTest),true);
  await page.evaluate(()=>{const t=window.__test,r=window.__repTest;t.camera.position.set(3.75,1.7,r.CZ+4);t.camera.lookAt(3.75,2,r.CZ+5.74);r.swing();});
  await page.waitForFunction(()=>window.__repTest.state().mirrorBroken,null,{timeout:12000});
  await page.screenshot({path:path.join(out,'tocadiscos-secreto.png')});
  assert.equal(await page.evaluate(()=>window.__repTest.recordPlayer.visible),true);
  for(let i=0;i<4;i++)for(let hit=0;hit<2;hit++){
   await page.waitForFunction(()=>{const s=window.__repTest.state();return s.now-s.swingStart>.6;},null,{timeout:10000});
   await page.evaluate(i=>{const t=window.__test,r=window.__repTest,p=r.targets[i].pts[6];const dx=-p.x,dz=r.CZ-p.z,len=Math.hypot(dx,dz);t.camera.position.set(p.x+dx/len*1.5,1.7,p.z+dz/len*1.5);t.camera.lookAt(p.x,p.y,p.z);r.swing();},i);
   await page.waitForFunction(({i,hp})=>window.__repTest.targets[i].hp===hp,{i,hp:1-hit},{timeout:12000});
   console.log('snake',i,'hp',1-hit);
  }
  await page.waitForFunction(()=>window.__test.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para recoger la serpiente plateada.')?.enabled(),null,{timeout:20000});
  await page.evaluate(()=>{const t=window.__test,r=window.__repTest;t.camera.position.set(3.1,1.7,r.CZ+1);t.camera.lookAt(4.95,1.8,r.CZ);});
  await page.screenshot({path:path.join(out,'premio.png')});
  const solved=await page.evaluate(()=>{const t=window.__test,r=window.__repTest;const result={word:r.state().solved,allSnakesDefeated:r.targets.every(v=>v.dead),solved:t.ctx.game.solved,secret:r.state().mirrorBroken};t.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para recoger la serpiente plateada.').onInteract();return {...result,collected:t.ctx.game.items.has('snake'),doorUnlocked:!t.room3.door.locked,batHidden:!r.heldBat.visible};});
  assert.equal(solved.word,true);assert.equal(solved.allSnakesDefeated,true);assert.equal(solved.solved,1);assert.equal(solved.collected,true);assert.equal(solved.doorUnlocked,true);assert.equal(solved.batHidden,true);
  await page.waitForFunction(()=>!window.__test.room3.door.mesh.visible,null,{timeout:18000});
  fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify({solved,coverage,errors,failedAssets,shots,note:'Actual tile detection, swing timing and hit targeting checked. Test-only access is injected by browser routes; production exposes no puzzle shortcuts. Not a performance benchmark.'},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);console.log(JSON.stringify({solved,coverage,errors,failedAssets}));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
