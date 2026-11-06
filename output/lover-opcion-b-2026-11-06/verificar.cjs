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
  const report={rooms:{},errors,failedAssets};
  page.on('pageerror',e=>(errors.push(e.message),console.error('PAGE',e.message)));
  page.on('console',m=>{if(m.type()==='error')(errors.push(m.text().slice(0,1200)),console.error('CONSOLE',m.text().slice(0,1200)));});
  page.on('requestfailed',request=>console.log('request-failed',request.url(),request.failure()?.errorText));
  page.on('response',response=>{if(response.url().includes('/js/main.js'))console.log('main-loaded');});
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))failedAssets.push(r.url());});
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.route('**/js/main.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
   body+='\nwindow.__test={THREE,scene,camera,ctx,renderer,composer,intro,room1,room2,room3,room4,room5,room6,player,jumpToRoom};';
   await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.route('**/js/roomreputation.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/roomreputation.js'),'utf8');
   body=body.replace('return { ...room, door, lights, removeHall, materials, propsRoot: g };',`window.__repTest={tiles,targets,swing,CZ,heldBat,recordPlayer,snake,state:()=>({idx,solved,batHeld,batReady,mirrorBroken,now:nowRef,swingStart})};return { ...room, door, lights, removeHall, materials, propsRoot: g };`);
   await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.route('**/js/roomlover.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/roomlover.js'),'utf8');body=body.replace('// ================= Animación =================',`window.__lover={hearts,slots,buttons,done,rpGroup,finalHeart,state:()=>({prize,ready,rpShown})};\n// ================= Animación =================`);await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.route('**/js/roomforest.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/roomforest.js'),'utf8');body=body.replace('return { group: g, bounds,',`window.__forest={gates,done,got,reader,barrier,ringLamps,state:()=>({trail,keyReady,trapBusy})};return { group: g, bounds,`);await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.route('**/js/roommidnights.js',async route=>{
   let body=fs.readFileSync(path.join(root,'js/roommidnights.js'),'utf8');body=body.replace('return { state, finale, board, dialVals, reader,',`window.__mid={deskClocks};return { state, finale, board, dialVals, reader,`);await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?skip',{waitUntil:'commit',timeout:60000});
  await page.waitForFunction(()=>window.__test&&window.__repTest&&window.__lover&&window.__forest&&window.__mid,null,{timeout:300000}).catch(e=>{console.error(JSON.stringify({errors,failedAssets}));throw e;});
  console.log('game-initialized');
  assert.deepEqual(await page.evaluate(()=>Promise.all([1,2,3,4,5,6].map(n=>window.__test['room'+n].materials.ready))),[true,true,true,true,true,true]);
  await page.evaluate(()=>{window.__test.intro.onLock();document.querySelector('#overlay').style.display='none';});
  const jump=async n=>{await page.evaluate(n=>{const t=window.__test;t.jumpToRoom(n,[1,2,3,4,5,6].map(i=>t['room'+i]));},n);await page.waitForTimeout(1200);};
  const shot=async(n,name,p,target)=>{
   const folder=['','','','3-reputation','4-lover','5-forest','6-midnights'][n];
   await page.evaluate(({n,p,target})=>{const t=window.__test,b=t['room'+n].bounds,cz=(b.minZ+b.maxZ)/2;t.camera.position.set(p[0],p[1],p[2]+cz);t.camera.lookAt(target[0],target[1],target[2]+cz);}, {n,p,target});
   await page.waitForTimeout(650);await page.screenshot({path:path.join(out,folder,name+'.png')});console.log('shot',n,name);
  };
  const audit=async n=>page.evaluate(n=>{
   const t=window.__test,room=t['room'+n],seen=new Set(),missing=[],textures=new Set();
   const roots=[room.group,room.propsRoot,room.door.mesh,room.tunnel].filter(Boolean);
   for(const root of new Set(roots))root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m.isMeshStandardMaterial)continue;seen.add(m);if(!m.map)missing.push(m.name||o.geometry.type);for(const key of ['map','bumpMap','roughnessMap','normalMap'])if(m[key])textures.add(m[key]);}});
   return {physicalMaterials:seen.size,textures:textures.size,withoutColorTexture:missing};
  },n);
  const prompt=async(text,opts={})=>page.evaluate(({text,opts})=>{const list=window.__test.ctx.interaction.items.filter(i=>opts.includes?i.prompt().includes(text):i.prompt()===text);const item=list[opts.index||0];if(!item)throw Error('Falta interaccion '+text);if(opts.enabled!==false&&item.enabled&&!item.enabled())throw Error('Interaccion deshabilitada '+text);item.onInteract();}, {text,opts});
  const move=async(n,x,z)=>{await page.evaluate(({n,x,z})=>{const t=window.__test,b=t['room'+n].bounds;t.camera.position.set(x,1.7,(b.minZ+b.maxZ)/2+z);}, {n,x,z});await page.waitForTimeout(180);};
  const enabled=async text=>page.waitForFunction(text=>window.__test.ctx.interaction.items.some(i=>i.prompt()===text&&i.enabled()),text,{timeout:35000});

  await jump(4);
  const loverShots=[['entrada',[0,1.7,4.2],[0,1.7,-4.8]],['diagonal',[-4.2,1.7,3.6],[1,1.55,-1]],['contraplano',[4.2,1.7,-3.6],[-1,1.55,1]],['sofa',[-3.5,1.4,4.4],[-5.2,.8,3.4]],['cofre',[3.3,1.35,-3.9],[3.9,.6,-5.4]],['altar',[-3.8,1.6,-3.7],[-3.8,1,-5.5]],['puf',[3.9,1.1,-3.1],[4.9,.4,-3.7]],['nubes',[-1,2,1],[-3,3.25,-2.5]],['tunel',[0,1.7,9],[0,1.6,6.2]]];
  for(const [name,p,t]of loverShots)await shot(4,name,p,t);
  await shot(4,'techo-nubes',[0,2.5,3.7],[0,4.1,-1.2]);
  await shot(4,'nubes-cerca',[2.3,3,-.6],[-.7,4.15,-1.8]);
  await shot(4,'nacar',[-2.4,1.1,-4.5],[-2.8,.65,-5.7]);
  await shot(4,'arcos',[4.5,1.8,1.8],[5.7,2.25,0]);
  report.rooms.lover={coverage:await audit(4)};
  report.clouds=await page.evaluate(()=>{
    const t=window.__test,room=t.room4,canopy=room.architecture.canopy;
    const meshes=canopy.children.filter(m=>m.isInstancedMesh).map(m=>{m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;return {instances:m.count,vertices:m.geometry.attributes.position.count,thickness:b.max.y-b.min.y,width:b.max.x-b.min.x,hasColorTexture:!!m.material.map};});
    const ceiling=room.group.children.find(o=>o.isMesh&&o.geometry.type==='PlaneGeometry'&&o.rotation.x>0);
    return {banks:meshes.reduce((n,m)=>n+m.instances,0),meshes,flatCeilingHidden:ceiling.visible===false};
  });
  assert.equal(report.clouds.banks,16);assert.equal(report.clouds.flatCeilingHidden,true);for(const m of report.clouds.meshes)assert.ok(m.thickness>.6,'La nube debe ser un volumen cerrado, no un plano');

  await prompt('Presiona E para buscar.');
  await page.waitForFunction(()=>window.__lover.hearts.every(h=>h.state==='home'),null,{timeout:6000});
  // Fill the altar with a deliberately wrong permutation, then exchange its first two hearts.
  for(const color of [1,0,2,3,4,5,6])await page.evaluate(color=>{const l=window.__lover,ctx=window.__test.ctx,h=l.hearts.find(h=>h.c===color),slot=l.slots[[1,0,2,3,4,5,6].indexOf(color)];ctx.interaction.items.find(i=>i.mesh===h.group).onInteract();ctx.interaction.items.find(i=>i.mesh===slot.grp).onInteract();},color);
  assert.equal(await page.evaluate(()=>window.__lover.done.rainbow),false);
  await page.evaluate(()=>{const l=window.__lover,items=window.__test.ctx.interaction.items;for(const index of [0,1,0])items.find(i=>i.mesh===l.slots[index].grp).onInteract();});
  assert.equal(await page.evaluate(()=>window.__lover.done.rainbow),true);
  const buttons=await page.evaluate(()=>window.__test.ctx.interaction.items.filter(i=>i.prompt()==='Presiona E para cambiar el color.').length);assert.equal(buttons,4);
  for(const [index,clicks]of[1,2,1,3].entries())for(let n=0;n<clicks;n++)await prompt('Presiona E para cambiar el color.',{index});
  await enabled('Presiona E para recoger el corazón.');
  await shot(4,'corazon-resuelto',[1.8,1.7,1.2],[0,1.6,-1]);await shot(4,'tocadiscos',[3.2,1.5,-4.2],[3.9,1,-5.4]);
  await page.evaluate(()=>{const t=window.__test,l=window.__lover,item=t.ctx.interaction.items.find(i=>i.mesh===l.finalHeart);if(!item.enabled())throw Error('Premio Lover bloqueado');item.onInteract();});
  report.rooms.lover.solved=await page.evaluate(()=>({parts:{...window.__lover.done},secret:window.__lover.rpGroup.visible,collected:window.__test.ctx.game.items.has('heart'),doorUnlocked:!window.__test.room4.door.locked}));
  assert.equal(report.rooms.lover.solved.collected,true);assert.equal(report.rooms.lover.solved.secret,true);
  console.log('lover-passed');

  const proof=await page.evaluate(()=>{
   const t=window.__test,T=t.THREE,scene=new T.Scene();scene.background=new T.Color(0x2a3044);
   const mesh=new T.Mesh(t.room4.architecture.canopy.children[0].geometry,t.room4.materials.cloudCanopy.clone());scene.add(mesh);
   scene.add(new T.AmbientLight(0xe6e8ff,1.2));const warm=new T.DirectionalLight(0xffdcc4,2);warm.position.set(-2,5,3);scene.add(warm);const cool=new T.DirectionalLight(0xb6c9ff,1);cool.position.set(2,1,-3);scene.add(cool);
   const camera=new T.PerspectiveCamera(38,1.5,.1,50);camera.position.set(4,2.2,4.4);camera.lookAt(0,0,0);
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,800);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.render(scene,camera);
   const data=renderer.domElement.toDataURL('image/png');renderer.dispose();mesh.material.dispose();return data;
  });
  fs.writeFileSync(path.join(out,'modelo-nube.png'),Buffer.from(proof.split(',')[1],'base64'));
  assert.deepEqual(report.rooms.lover.coverage.withoutColorTexture,[]);assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
  fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
