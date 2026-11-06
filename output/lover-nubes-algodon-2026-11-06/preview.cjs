const {chromium}=require('C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=process.cwd(),out=__dirname;
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
  const url='http://127.0.0.1:'+server.address().port+'/output/lover-nubes-algodon-2026-11-06/preview.html';
  await page.goto(url,{waitUntil:'commit'});await page.waitForFunction(()=>window.__preview,null,{timeout:120000});
  fs.mkdirSync(path.join(out,'preview'),{recursive:true});
  for(const [name,p,target]of[
   ['entrada',[0,1.7,4.2],[0,1.7,-4.8]],
   ['techo',[0,2.5,3.7],[0,4.1,-1.2]],
   ['cerca',[2.3,3,-.6],[-.7,4.15,-1.8]],
   ['diagonal',[-4.2,1.7,3.6],[1,1.55,-1]],
   ['contraplano',[4.2,1.7,-3.6],[-1,1.55,1]],
  ]){
   await page.evaluate(({p,target})=>{const t=window.__preview;t.camera.position.set(...p);t.camera.lookAt(...target);t.render();},{p,target});
   await page.screenshot({path:path.join(out,'preview',name+'.png')});console.log('preview',name);
  }
  console.log(JSON.stringify(await page.evaluate(()=>{
   const t=window.__preview,canopy=t.room.architecture.canopy;
   return {banks:canopy.userData.solidBanks,variants:canopy.userData.geometryVariants,previewFrameIncludingPostprocess:{drawCalls:t.renderer.info.render.calls,triangles:t.renderer.info.render.triangles}};
  })));
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
