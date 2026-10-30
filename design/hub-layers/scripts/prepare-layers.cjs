/* Mechanical export only: AI cutouts remain in raw/; align and pad them to a shared canvas. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const bundled = 'C:/Users/luigi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const localRequire = createRequire(path.join(bundled, '_hub_require.cjs'));
const sharp = localRequire('sharp');
const root = path.resolve(__dirname, '..');
const W = 1672, H = 941;
const specs = JSON.parse(fs.readFileSync(path.join(root, 'image-prompts.json'), 'utf8'));

async function alphaBounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0, partial = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * 4 + 3];
    if (a < 8) transparent++;
    if (a > 8 && a < 248) partial++;
    if (a > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  }
  if (right < left) throw Error('Empty asset: ' + file);
  return { left, top, width: right-left+1, height: bottom-top+1, sourceWidth: info.width, sourceHeight: info.height, transparentFraction: transparent/(info.width*info.height), partialAlphaPixels: partial };
}

(async () => {
  const layers = [], report = [];
  fs.mkdirSync(path.join(root, 'layers'), { recursive: true });
  for (const spec of specs) {
    const raw = path.join(root, 'raw', spec.id + '.png');
    if (!fs.existsSync(raw)) throw Error('Missing generated asset: ' + raw);
    const bounds = await alphaBounds(raw);
    let out;
    if (!spec.transparent) {
      out = await sharp(raw).resize(W, H, { fit: 'fill' }).flatten({ background: '#efe0ce' }).png().toBuffer();
    } else {
      if (bounds.transparentFraction < 0.04) throw Error('Asset does not have usable transparency: ' + spec.id);
      const keepCanvas = spec.id === 'confetti';
      let sprite = sharp(raw).ensureAlpha();
      if (!keepCanvas) sprite = sprite.extract({ left:bounds.left, top:bounds.top, width:bounds.width, height:bounds.height });
      const sized = await sprite.resize(spec.width, spec.height, { fit: 'fill' }).png().toBuffer();
      out = await sharp({ create: { width:W, height:H, channels:4, background:{r:0,g:0,b:0,alpha:0} } }).composite([{ input:sized, left:spec.x, top:spec.y }]).png().toBuffer();
    }
    fs.writeFileSync(path.join(root, spec.file), out);
    const {prompt, transparent, ...meta} = spec;
    layers.push({...meta, type:'raster', fullCanvas:true, visible:true, provenance:'Reconstrucción generativa basada en la imagen original', localPivot:{x:(spec.pivot.x*W-spec.x)/spec.width,y:(spec.pivot.y*H-spec.y)/spec.height}});
    report.push({id:spec.id,...bounds});
  }
  const vectors = JSON.parse(fs.readFileSync(path.join(root, 'vector-layers.json'), 'utf8'));
  const parents = {'lock-1989':'1989','lock-reputation':'reputation','lock-lover':'lover','lock-folklore':'forest','lock-midnights':'midnights'};
  layers.push(...vectors.map(v => ({...v, ...(parents[v.id] ? {parent:parents[v.id]} : {}), fullCanvas:true, provenance:'Reconstrucción vectorial editable'})));
  layers.sort((a,b) => a.z-b.z || a.id.localeCompare(b.id));
  const manifest = {version:1,title:'The Eras Escape · Pulsera por capas',width:W,height:H,source:'source.png',composition:'composite.png',note:'Reconstrucción para animación a partir de una imagen plana. Los objetos, zonas ocultas y tipografía presentan diferencias respecto del original.',generation:'Herramienta integrada image_gen; prompts en image-prompts.json.',coordinateSystem:'Píxeles del lienzo; cada archivo tiene lienzo completo. Pivotes globales normalizados 0..1.',layers};
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(root,'layers-data.js'),'window.HUB_LAYERS = '+JSON.stringify(manifest,null,2)+';\n');
  fs.writeFileSync(path.join(root,'alpha-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({layers:layers.length,raster:specs.length,vector:vectors.length,canvas:[W,H],alphaValidated:report.filter(r=>r.id!=='paper').length}));
})().catch(e=>{console.error(e);process.exitCode=1});
