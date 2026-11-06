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
  await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'commit',timeout:60000});
  await page.waitForFunction(()=>window.__test,null,{timeout:180000}).catch(error=>{console.error(JSON.stringify({errors,failedAssets}));throw error;});
  console.log('game-initialized');
  assert.deepEqual(await page.evaluate(()=>Promise.all([window.__test.room1.materials.ready,window.__test.room2.materials.ready])),[true,true]);
  await page.evaluate(()=>{const t=window.__test;t.intro.onLock();t.jumpToRoom(2,[t.room1,t.room2,t.room3,t.room4,t.room5,t.room6]);document.querySelector('#overlay').style.display='none';});
  await page.waitForTimeout(1800);
  const shots=[
   {name:'entrada',x:0,y:1.7,z:-10.8,tx:0,ty:1.55,tz:-21},
   {name:'diagonal',x:-4.7,y:1.7,z:-11.4,tx:1,ty:1.55,tz:-16.5},
   {name:'contraplano',x:4.7,y:1.7,z:-19.6,tx:-1,ty:1.55,tz:-14.5},
   {name:'parada-materiales',x:3.6,y:1.7,z:-13.9,tx:6.1,ty:.8,tz:-12.4},
   {name:'camara',x:5.0,y:1.35,z:-15.95,tx:5.7,ty:.97,tz:-16.02},
   {name:'taxi',x:-2.4,y:1.45,z:-10.7,tx:-4.16,ty:.65,tz:-12.12},
   {name:'rueda',x:-2.9,y:.65,z:-11.2,tx:-3.66,ty:.26,tz:-11.42},
   {name:'edificios',x:-3.9,y:2.1,z:-18.9,tx:-5.8,ty:1.9,tz:-18.5},
   {name:'quiosco',x:3.7,y:1.6,z:-18.9,tx:5.3,ty:1.12,tz:-19.8},
   {name:'armario',x:3.9,y:1.5,z:-10.6,tx:4.15,ty:1.1,tz:-9.75},
   {name:'mesa-piezas',x:0,y:1.9,z:-15.7,tx:0,ty:.9,tz:-16.8},
   {name:'gaviota',x:-2.8,y:3.4,z:-19.6,tx:-3.9,ty:3.42,tz:-19.92},
  ];
  for(const v of shots){
   await page.evaluate(v=>{const t=window.__test;t.camera.position.set(v.x,v.y,v.z);t.camera.lookAt(v.tx,v.ty,v.tz);},v);
   await page.waitForTimeout(650);await page.screenshot({path:path.join(out,v.name+'.png')});console.log(v.name);
  }
  const coverage=await page.evaluate(()=>{
   const t=window.__test,materials=new Set(),missing=[];
   for(const root of [t.room2.group,t.room2.propsRoot,t.room2.door.mesh])root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
     if(!material.isMeshStandardMaterial)continue;
     materials.add(material);if(!material.map)missing.push(material.name||mesh.name||mesh.geometry.type);
    }
   });
   return {physicalMaterials:materials.size,withoutColorTexture:missing};
  });
  assert.deepEqual(coverage.withoutColorTexture,[],'Todos los materiales físicos deben tener su textura de color');
  const initial=await page.evaluate(()=>{
   const t=window.__test;
   window.__pieces=t.ctx.interaction.items.filter(i=>i.prompt()==='Presiona E para recoger la pieza del rompecabezas.');
   return {pieces:window.__pieces.length,locked:t.room2.door.locked,solved:t.ctx.game.solved,taxiPieceLocked:!window.__pieces[2].enabled(),cabinetPieceHidden:!window.__pieces[3].mesh.visible,wall:t.room2.materials.wall.name,floor:t.room2.materials.floor.name,fearless:t.room1.materials.wall.name};
  });
  assert.equal(initial.pieces,4);assert.equal(initial.locked,true);assert.equal(initial.solved,0);assert.equal(initial.taxiPieceLocked,true);assert.equal(initial.cabinetPieceHidden,true);
  await page.evaluate(()=>{
   const t=window.__test;
   window.__pieces[0].onInteract();
   t.camera.position.set(-4.9,1.7,-15.76);t.scene.updateMatrixWorld(true);
   if(!window.__pieces[1].enabled())throw Error('La pieza tras el contenedor no se puede alcanzar desde su lado visible');
   window.__pieces[1].onInteract();
   const taxi=t.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para abrir la puerta del taxi.');
   if(!taxi.enabled())throw Error('La puerta del taxi no se puede abrir');taxi.onInteract();
  });
  await page.waitForFunction(()=>window.__pieces[2].enabled(),null,{timeout:12000});
  await page.evaluate(()=>{
   const t=window.__test;window.__pieces[2].onInteract();
   const wheels=t.ctx.interaction.items.filter(i=>i.prompt()==='Presiona E para cambiar el dígito.');
   if(wheels.length!==4)throw Error('Faltan dígitos del candado');
   [1,9,8,9].forEach((digit,index)=>{for(let n=0;n<digit;n++)wheels[index].onInteract();});
   if(!window.__pieces[3].mesh.visible||!window.__pieces[3].enabled())throw Error('El código 1989 no reveló la pieza');
   window.__pieces[3].onInteract();
   const slots=t.ctx.interaction.items.filter(i=>i.prompt().includes('colocar / cambiar la pieza'));
   if(slots.length!==4)throw Error('Faltan huecos del rompecabezas');
   slots.forEach(slot=>slot.onInteract());
   t.camera.position.set(2.5,1.7,-17.5);t.camera.lookAt(5.7,1.4,-16.02);
  });
  await page.waitForFunction(()=>window.__test.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para recoger la Polaroid.')?.enabled(),null,{timeout:25000});
  await page.screenshot({path:path.join(out,'polaroid-resuelta.png')});
  const solved=await page.evaluate(()=>{
   const t=window.__test,item=t.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para recoger la Polaroid.');
   const result={solved:t.ctx.game.solved,allPiecesCollected:window.__pieces.every(i=>!i.mesh.visible),photoVisible:item.mesh.visible,photoReady:item.enabled()};
   item.onInteract();return {...result,collected:t.ctx.game.items.has('polaroid'),doorUnlocked:!t.room2.door.locked};
  });
  assert.equal(solved.solved,1);assert.equal(solved.allPiecesCollected,true);assert.equal(solved.collected,true);assert.equal(solved.doorUnlocked,true);
  await page.waitForFunction(()=>!window.__test.room2.door.mesh.visible,null,{timeout:16000});
  await page.evaluate(()=>{const t=window.__test,b=t.room3.bounds;t.camera.position.set((b.minX+b.maxX)/2,1.7,b.maxZ-2);});
  await page.waitForTimeout(500);
  const transition=await page.evaluate(()=>({muted1989:window.__test.room2.lights.mute<1,doorOpen:!window.__test.room2.door.mesh.visible}));
  assert.equal(transition.muted1989,true);
  fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify({initial,solved,transition,coverage,errors,failedAssets,shots,note:'Puzzle checked through its actual interaction callbacks, including taxi gate, line of sight, cabinet code and photo reward. Not a performance benchmark.'},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
  console.log(JSON.stringify({initial,solved,transition,coverage,errors,failedAssets}));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
