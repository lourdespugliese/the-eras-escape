const { chromium } = require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.cwd(),out=__dirname;
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');res.end(data);});
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
   body+='\nwindow.__test={scene,camera,ctx,renderer,composer,intro,room1,room2,room3,room4,room5,room6,player,jumpToRoom};';
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
   await page.waitForTimeout(650);console.log('shot',n,name);
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

  await jump(3);
  await shot(3,'entrada',[0,1.7,4.2],[0,1.55,-5]);await shot(3,'trono',[3.4,1.6,1.1],[5.1,1.4,0]);await shot(3,'porcelana',[.75,1.3,.65],[0,.9,-.2]);await shot(3,'escamas',[5,1.1,-2.9],[5.66,1.25,-2.7]);
  report.rooms.reputation={coverage:await audit(3)};
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
  
  assert.equal(await page.evaluate(()=>window.__repTest.recordPlayer.visible),true);
  for(let i=0;i<4;i++)for(let hit=0;hit<2;hit++){
   await page.waitForFunction(()=>{const s=window.__repTest.state();return s.now-s.swingStart>.6;},null,{timeout:10000});
   await page.evaluate(i=>{const t=window.__test,r=window.__repTest,p=r.targets[i].pts[6];const dx=-p.x,dz=r.CZ-p.z,len=Math.hypot(dx,dz);t.camera.position.set(p.x+dx/len*1.5,1.7,p.z+dz/len*1.5);t.camera.lookAt(p.x,p.y,p.z);r.swing();},i);
   await page.waitForFunction(({i,hp})=>window.__repTest.targets[i].hp===hp,{i,hp:1-hit},{timeout:12000});
   console.log('snake',i,'hp',1-hit);
  }
  await page.waitForFunction(()=>window.__test.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para recoger la serpiente plateada.')?.enabled(),null,{timeout:20000});
  await page.evaluate(()=>{const t=window.__test,r=window.__repTest;t.camera.position.set(3.1,1.7,r.CZ+1);t.camera.lookAt(4.95,1.8,r.CZ);});
  await page.screenshot({path:path.join(out,'3-reputation/premio.png')});
  const solvedRep=await page.evaluate(()=>{const t=window.__test,r=window.__repTest;const result={word:r.state().solved,allSnakesDefeated:r.targets.every(v=>v.dead),solved:t.ctx.game.solved,secret:r.state().mirrorBroken};t.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para recoger la serpiente plateada.').onInteract();return {...result,collected:t.ctx.game.items.has('snake'),doorUnlocked:!t.room3.door.locked,batHidden:!r.heldBat.visible};});
  assert.equal(solvedRep.word,true);assert.equal(solvedRep.allSnakesDefeated,true);assert.equal(solvedRep.solved,1);assert.equal(solvedRep.collected,true);assert.equal(solvedRep.doorUnlocked,true);assert.equal(solvedRep.batHidden,true);
  await page.waitForFunction(()=>!window.__test.room3.door.mesh.visible,null,{timeout:18000});
  report.rooms.reputation.solved=solvedRep;
  await jump(4);
  const loverShots=[['entrada',[0,1.7,4.2],[0,1.7,-4.8]],['diagonal',[-4.2,1.7,3.6],[1,1.55,-1]],['contraplano',[4.2,1.7,-3.6],[-1,1.55,1]],['sofa',[-3.5,1.4,4.4],[-5.2,.8,3.4]],['cofre',[3.3,1.35,-3.9],[3.9,.6,-5.4]],['altar',[-3.8,1.6,-3.7],[-3.8,1,-5.5]],['puf',[3.9,1.1,-3.1],[4.9,.4,-3.7]],['nubes',[-1,2,1],[-3,3.25,-2.5]],['tunel',[0,1.7,9],[0,1.6,6.2]]];
  for(const [name,p,t]of loverShots)await shot(4,name,p,t);
  report.rooms.lover={coverage:await audit(4)};
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

  await jump(5);
  const forestShots=[['entrada',[0,1.7,14.2],[0,3,4]],['claro',[-3.8,1.7,7.7],[0,3.5,4]],['corteza',[1.7,1.8,5.5],[0,2.3,4]],['otono',[-6,1.7,4],[-11,1.3,2]],['cabana',[-11.5,1.7,1.9],[-11.5,1.7,-3]],['interior',[-10.6,1.6,-1.9],[-12.1,1.1,-4.2]],['cartas',[-11.9,1.45,-1.7],[-12.6,.8,-2.6]],['nieve',[8,1.7,6.6],[8,1.7,-1]],['musgo',[8.5,1.6,-2.8],[8.2,1.4,-4.8]],['guardianes',[15,1.7,-6.8],[15,1.4,-9.5]],['lago',[13.4,1.7,-14.8],[10.8,.1,-14.6]]];
  for(const[name,p,t]of forestShots)await shot(5,name,p,t);
  report.rooms.forest={coverage:await audit(5)};
  assert.equal(await page.evaluate(()=>window.__test.ctx.interaction.items.find(i=>i.prompt()==='Presiona E para abrir la caja.').enabled()),false);
  for(const [i,clicks]of[7,4,3].entries())for(let n=0;n<clicks;n++)await prompt('Presiona E para girar el dial.',{index:i});
  assert.equal(await page.evaluate(()=>window.__forest.done.cabin),true);
  await move(5,8,10);await page.waitForFunction(()=>!window.__forest.state().trapBusy,null,{timeout:7000});assert.equal(await page.evaluate(()=>window.__forest.state().trail),0);
  await prompt('Presiona E para acercar la mano a la luciérnaga.');await move(5,8,0);
  assert.equal(await page.evaluate(()=>window.__forest.state().trail),1);
  await prompt('Presiona E para tocar el musgo.');await move(5,12,-2);
  assert.equal(await page.evaluate(()=>window.__forest.state().trail),2);
  await prompt('Presiona E para abrir la caja de música.');await move(5,15,-8.5);
  assert.equal(await page.evaluate(()=>window.__forest.state().trail),3);
  for(const name of ['Raíz','Tronco','Rama','Hoja'])await prompt('Presiona E para despertar la piedra «'+name+'».');
  await move(5,15,-14);assert.equal(await page.evaluate(()=>window.__forest.state().trail),4);
  await prompt('Presiona E para abrir la caja.');assert.equal(await page.evaluate(()=>window.__forest.barrier.open),true);
  await shot(5,'sauce',[0,1.7,-13.5],[0,3.3,-8]);await shot(5,'sendero-abierto',[15,1.7,-5.8],[15,1.5,-10]);
  for(const symbol of ['copo','hoja','luna','casa','estrella'])await prompt('Presiona E para encender el farol de la '+symbol+'.');
  await enabled('Presiona E para recoger la Llave antigua.');await shot(5,'llave',[-1.7,1.7,-12.1],[0,1.4,-10.7]);await prompt('Presiona E para recoger la Llave antigua.');
  report.rooms.forest.solved=await page.evaluate(()=>({parts:{...window.__forest.done},gates:window.__forest.gates.filter(Boolean).every(g=>g.open),collected:window.__test.ctx.game.items.has('oldkey'),doorUnlocked:!window.__test.room5.door.locked}));
  assert.equal(report.rooms.forest.solved.collected,true);console.log('forest-passed');

  await jump(6);
  const midShots=[['entrada',[0,1.7,15.2],[0,3.3,-8]],['salon',[-5.7,1.7,12],[-10.4,1,8.6]],['sillon',[-9.3,1.35,6.1],[-12.4,.8,7.2]],['telefono',[-8.75,1.1,9.6],[-9.5,.65,9]],['reloj-suelo',[3.6,4.5,7.8],[0,.1,0]],['bola',[2.5,5.3,2.5],[0,6.1,0]],['ajedrez',[6.8,2.3,-7.3],[11,.7,-11]],['piezas',[9,1.6,-8],[10.3,.7,-10]],['relojes',[10.9,1.8,11.8],[12.5,1.5,12]],['reloj-pared',[0,3.6,-11.5],[0,6.3,-16.7]],['cortinas',[3.4,2.2,-13],[5.2,3.5,-16.7]],['luna',[-4.3,6.7,-5.8],[-6,8.95,-8]]];
  for(const[name,p,t]of midShots)await shot(6,name,p,t);
  report.rooms.midnights={coverage:await audit(6)};
  await prompt('Presiona E para sumar una hora.');assert.equal(await page.evaluate(()=>window.__test.room6.puzzle.totalMin()),580);
  for(const [i,clicks]of[1,3,3,1].entries())for(let n=0;n<clicks;n++)await prompt('Presiona E para girar la rueda.',{index:i});
  await prompt('Presiona E para descolgar y llamar.');await page.waitForTimeout(1800);await page.evaluate(()=>window.__test.room6.puzzle.reader.hide());
  for(let i=0;i<5;i++)await prompt('Presiona E para sumar una hora.');for(let i=0;i<6;i++)await prompt('Presiona E para sumar 5 minutos.');for(let i=0;i<3;i++)await prompt('Presiona E para sumar 1 minuto.');
  await enabled('Presiona E para tomar el engranaje dorado.');await prompt('Presiona E para tomar el engranaje dorado.');
  await page.evaluate(()=>{const t=window.__test,p=t.room6.puzzle.board.pcs.find(p=>p.t==='R');t.ctx.interaction.items.find(i=>i.mesh===p.gr).onInteract();});
  await prompt('Presiona E para mover a a7.');
  await enabled('Presiona E para tomar el engranaje plateado.');await prompt('Presiona E para tomar el engranaje plateado.');
  await prompt('Presiona E para examinar el reloj.');assert.equal(await page.evaluate(()=>window.__test.room6.puzzle.state.night),false);
  const rightClock=await page.evaluate(()=>window.__mid.deskClocks.findIndex(c=>c.hh%12===0&&c.mm===0));
  await prompt('Presiona E para examinar el reloj.',{index:rightClock});await enabled('Presiona E para tomar el engranaje de bronce.');await prompt('Presiona E para tomar el engranaje de bronce.');
  await prompt('Presiona E para colocar los engranajes.');await enabled('Presiona E para recoger la Llave final.');
  await shot(6,'finale',[3,1.7,4],[0,2,0]);await prompt('Presiona E para recoger la Llave final.');
  report.rooms.midnights.solved=await page.evaluate(()=>({state:{...window.__test.room6.puzzle.state},orbsLit:window.__test.room6.puzzle.orbsLit(),collected:window.__test.ctx.game.items.has('finalkey'),doorUnlocked:!window.__test.room6.door.locked}));
  assert.equal(report.rooms.midnights.solved.collected,true);assert.equal(report.rooms.midnights.solved.orbsLit,13);console.log('midnights-passed');
  fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify(report,null,2));
  for(const [name,room]of Object.entries(report.rooms))assert.deepEqual(room.coverage.withoutColorTexture,[],name+' tiene materiales sin textura');
  report.note='Puzzle checks use actual interaction callbacks and camera movement. Test-only closure access is injected by browser routes. No performance claim.';
  fs.writeFileSync(path.join(out,'verificacion.json'),JSON.stringify(report,null,2));assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
