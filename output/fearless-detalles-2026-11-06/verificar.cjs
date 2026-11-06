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
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))failedAssets.push(r.url());});
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.route('**/js/main.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
   body+='\nwindow.__test={scene,camera,ctx,renderer,composer,intro,room1,room2,room3,room4,room5,room6,player};';
   await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'commit',timeout:60000});
  await page.waitForFunction(()=>window.__test,null,{timeout:180000}).catch(error=>{console.error(JSON.stringify({errors,failedAssets}));throw error;});
  console.log('game-initialized');
  assert.equal(await page.evaluate(()=>window.__test.room1.materials.ready),true,'Material assets must load');
  await page.evaluate(()=>{window.__test.intro.onLock();document.querySelector('#overlay').style.display='none';});
  await page.waitForTimeout(2200);
  if(process.argv.includes('--plant-only')){
   await page.evaluate(()=>{const t=window.__test;t.camera.position.set(7.3,1.35,-3.2);t.camera.lookAt(8.2,.85,-4.2);});
   await page.waitForTimeout(650);
   await page.screenshot({path:path.join(out,'flores-hojas-pequenas.png')});
   assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
   console.log('Hojas reducidas: captura guardada, sin errores.');return;
  }
  const shots=[
   {name:'entrada',x:2,y:1.7,z:3.2,tx:2,ty:1.55,tz:-4},
   {name:'diagonal',x:-3.2,y:1.7,z:2.6,tx:3,ty:1.55,tz:-1},
   {name:'contraplano',x:7.2,y:1.7,z:-2.6,tx:1,ty:1.55,tz:1},
   {name:'mariposa',x:-4.1,y:1.7,z:-1.7,tx:-4.1,ty:2.2,tz:-3},
   {name:'flores',x:7.3,y:1.35,z:-3.2,tx:8.2,ty:.85,tz:-4.2},
   {name:'flor-detalle',flower:true},
   {name:'maceta',x:7.55,y:.8,z:-3.6,tx:8.2,ty:.25,tz:-4.2},
   {name:'libro',x:2,y:1.8,z:3.5,tx:2,ty:1.05,tz:2.8},
   {name:'guitarra',x:-2.9,y:1.4,z:2.65,tx:-4.05,ty:1.2,tz:2.8},
   {name:'baul',x:1.45,y:1.1,z:-3.25,tx:2.6,ty:.42,tz:-4.2},
   {name:'chaqueta',x:5.5,y:1.35,z:3.3,tx:5.5,ty:.9,tz:4},
   {name:'anillo',x:-2.65,y:1.15,z:-2.9,tx:-3.3,ty:.95,tz:-3.4},
   {name:'estrella',x:-.1,y:1.15,z:3.6,tx:-.8,ty:.98,tz:4.2},
  ];
  for(const v of shots){
   await page.evaluate(v=>{
    const t=window.__test;
    if(v.flower){
     const pot=t.room1.group.children.find(o=>o.name==='fearless-flower-pot'&&o.position.x>8&&o.position.z<0);
     const flower=pot.children.find(o=>o.name==='fearless-flower-head');t.scene.updateMatrixWorld(true);
     const target=flower.getWorldPosition(t.camera.position.clone());t.camera.position.copy(target);t.camera.position.x-=.44;t.camera.position.y+=.24;t.camera.position.z+=.32;t.camera.lookAt(target);
    }else{t.camera.position.set(v.x,v.y,v.z);t.camera.lookAt(v.tx,v.ty,v.tz);}
   },v);
   await page.waitForTimeout(650);await page.screenshot({path:path.join(out,v.name+'.png')});console.log(v.name);
  }
  const detailChecks=await page.evaluate(()=>{
   const t=window.__test,materials=new Set(),missing=[];let flowers=0,clueButterflies=0;
   t.room1.group.traverse(o=>{
    if(o.name==='fearless-flower-head')flowers++;
    if(o.name==='fearless-butterfly'&&o.children.some(child=>child.isMesh&&child.geometry.type==='CircleGeometry'&&child.material.isMeshBasicMaterial))clueButterflies++;
    if(!o.isMesh)return;
    for(const material of Array.isArray(o.material)?o.material:[o.material]){
     if(!material.isMeshStandardMaterial)continue;
     materials.add(material);if(!material.map)missing.push(material.name||o.geometry.type);
    }
   });
   const plant=t.ctx.interaction.items.find(i=>i.mesh.name==='fearless-flower-pot'&&i.mesh.position.x>8&&i.mesh.position.z<0);
   plant.onInteract();
   const swarmVisible=t.room1.group.children.filter(o=>o.isGroup&&o.visible&&o.children.some(child=>child.name==='fearless-butterfly')).length;
   return {physicalMaterials:materials.size,withoutColorTexture:missing,flowerHeads:flowers,clueButterflies,swarmVisible,petalAlphaTest:t.room1.materials.flower.alphaTest,wingLoaded:!!t.room1.materials.butterflyStyle.right.image,mirroredLeftWing:t.room1.materials.butterflyStyle.left.repeat.x===-1};
  });
  assert.deepEqual(detailChecks.withoutColorTexture,[]);assert.equal(detailChecks.flowerHeads,24);assert.equal(detailChecks.clueButterflies,4);assert.equal(detailChecks.swarmVisible,3);assert.equal(detailChecks.wingLoaded,true);assert.equal(detailChecks.mirroredLeftWing,true);
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
  await page.waitForFunction(()=>window.__test.ctx.game.solved===2,null,{timeout:12000});
  await page.waitForFunction(()=>window.__test.ctx.interaction.items.find(i=>i.prompt().includes('Guitarra Dorada'))?.enabled(),null,{timeout:20000});
  await page.screenshot({path:path.join(out,'resuelta.png')});
  const solved=await page.evaluate(()=>{
   const t=window.__test,item=t.ctx.interaction.items.find(i=>i.prompt().includes('Guitarra Dorada'));
   const result={solved:t.ctx.game.solved,guitarVisible:item.mesh.visible,guitarReady:item.enabled(),wallTextureLoaded:t.room1.materials.wall.map.version>1};
   if(!item.mesh.visible||!item.enabled())throw Error('La recompensa no se puede recoger');
   item.onInteract();return {...result,collected:t.ctx.game.items.has('guitar'),doorUnlocked:!t.room1.door.locked};
  });
  assert.equal(solved.collected,true);assert.equal(solved.doorUnlocked,true);assert.equal(solved.wallTextureLoaded,true);
  await page.waitForFunction(()=>!window.__test.room1.door.mesh.visible,null,{timeout:12000});
  const entrance=await page.evaluate(()=>{
   const t=window.__test;t.intro.returnToHall();return {museumVisible:t.ctx.museum.root.visible,position:t.camera.position.toArray()};
  });
  assert.equal(entrance.museumVisible,true);
  fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify({initial,solved,entrance,detailChecks,errors,failedAssets,shots},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
  console.log(JSON.stringify({initial,solved,entrance,detailChecks,errors,failedAssets}));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
