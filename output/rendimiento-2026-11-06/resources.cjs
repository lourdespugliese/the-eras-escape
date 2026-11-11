const {chromium}=require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),root=process.cwd();
const server=http.createServer((req,res)=>{
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
 if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>');}
 const file=path.resolve(root,'.'+req.url.split('?')[0]);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type','application/javascript');res.end(data);});
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 const result=await page.evaluate(async()=>{
  const THREE=await import('three'),{Reflector}=await import('three/addons/objects/Reflector.js'),{setupStreaming}=await import('/js/streaming.js');
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,1,.1,100),renderer=new THREE.WebGLRenderer();renderer.setSize(64,64);scene.fog=new THREE.Fog(0,2,26);
  const tex=color=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,32,32);return new THREE.CanvasTexture(c);};
  const sharedTex=tex('#ff0000'),exclusiveTex=tex('#0000ff'),near=new THREE.Group(),far=new THREE.Group(),privateGeo=new THREE.BoxGeometry(),sharedGeo=new THREE.BoxGeometry();
  near.add(new THREE.Mesh(sharedGeo,new THREE.MeshBasicMaterial({map:sharedTex})));
  far.add(new THREE.Mesh(privateGeo,new THREE.MeshBasicMaterial({map:exclusiveTex})));
  const sharedCube=new THREE.Mesh(sharedGeo,new THREE.MeshBasicMaterial({map:sharedTex}));sharedCube.position.x=3;far.add(sharedCube);
  const mirror=new Reflector(new THREE.PlaneGeometry(3,3),{textureWidth:64,textureHeight:64});mirror.rotation.x=-Math.PI/2;mirror.position.y=-1;far.add(mirror);far.position.z=-200;scene.add(near,far);
  const rt=new THREE.WebGLRenderTarget(64,64);renderer.setRenderTarget(mirror.getRenderTarget());renderer.clear();renderer.setRenderTarget(rt);
  camera.position.set(0,0,-197);camera.lookAt(0,0,-200);renderer.render(scene,camera);camera.position.set(0,0,3);camera.lookAt(0,0,0);renderer.render(scene,camera);
  const before={...renderer.info.memory};let sharedDisposals=0;sharedTex.addEventListener('dispose',()=>sharedDisposals++);
  const entries=[{name:'near',group:near,bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},resident:true},{name:'far',group:far,bounds:{minX:-5,maxX:5,minZ:-205,maxZ:-195},resident:true}];
  const stream=setupStreaming({scene,camera,renderer,entries});stream.update();const sleeping={...renderer.info.memory};
  check(sleeping.textures<before.textures && sleeping.geometries<before.geometries,'GPU resources were not freed');check(sharedDisposals===0,'Shared texture was disposed');check(stream.stats.evictedTargets===1,'Mirror target not evicted');
  camera.position.set(0,0,-197);camera.lookAt(0,0,-200);stream.update();renderer.render(scene,camera);const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(rt,32,32,1,1,pixel);
  check(pixel[2]>pixel[0]+30,'Texture failed to restore on GPU');check(far.parent===scene,'Room did not reattach');
  camera.position.set(0,0,3);camera.lookAt(0,0,0);stream.update();renderer.render(scene,camera);camera.position.set(0,0,-197);camera.lookAt(0,0,-200);stream.update();renderer.render(scene,camera);renderer.readRenderTargetPixels(rt,32,32,1,1,pixel);check(pixel[2]>pixel[0]+30,'Second return lost texture');
  const restored={...renderer.info.memory};renderer.dispose();return {before,sleeping,restored,pixel:[...pixel],sharedResourcesProtected:true,repeatedReturn:true,reflectionTargetRestored:true};
 });assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'resources.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify(result));
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
