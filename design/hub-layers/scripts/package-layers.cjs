#!/usr/bin/env node
'use strict';

/**
 * Usage: node design/hub-layers/scripts/package-layers.cjs [hub-layers-directory]
 *
 * Requires the final manifest.json, source.png and every full-canvas layer.
 * Packages existing artwork; it never rewrites the source PNG/SVG assets.
 * PSD binary layout follows Adobe's official PSD specification:
 * https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
 * PSD and ORA contain raster layers. Editable original SVGs remain in the kit.
 */
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const bundled = process.env.CODEX_NODE_MODULES ||
  'C:\\Users\\luigi\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules';
const sharp = require(path.join(bundled, 'sharp'));
const JSZip = require(path.join(bundled, 'jszip'));
const { PNG } = require(path.join(bundled, 'pngjs'));

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const EXPORTS = {
  psd: 'the-eras-escape-layers.psd',
  ora: 'the-eras-escape-layers.ora',
  zip: 'the-eras-escape-animation-kit.zip',
  composite: 'composite.png'
};
const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const i16 = n => { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; };
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const i32 = n => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
const ascii = s => Buffer.from(s, 'ascii');
const pad = (b, multiple) => Buffer.concat([b, Buffer.alloc((multiple - b.length % multiple) % multiple)]);
const xml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const zipPath = p => p.split(path.sep).join('/');

function safePath(relativePath) {
  assert.equal(typeof relativePath, 'string', 'Every layer must have a local file path');
  const full = path.resolve(root, relativePath);
  const relative = path.relative(root, full);
  assert(relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative),
    'A manifest path escapes the delivery directory: ' + relativePath);
  return full;
}
function opacityOf(layer) {
  if (layer.opacity == null) return 1;
  const value = Number(layer.opacity);
  assert(Number.isFinite(value) && value >= 0, 'Invalid opacity: ' + layer.id);
  return Math.min(1, value > 1 ? value / 255 : value);
}
function asciiLayerName(name) {
  const plain = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '-');
  const bytes = Buffer.from(plain.slice(0, 255), 'ascii');
  return pad(Buffer.concat([Buffer.from([bytes.length]), bytes]), 4);
}
function unicodeName(name) {
  const utf16be = Buffer.from(name, 'utf16le').swap16();
  const data = Buffer.concat([u32(name.length), utf16be]);
  return Buffer.concat([ascii('8BIMluni'), u32(data.length), pad(data, 2)]);
}
function additionalLayerId(index) {
  return Buffer.concat([ascii('8BIMlyid'), u32(4), u32(index + 1)]);
}
function layerName(layer) {
  return (layer.group ? '[' + layer.group + '] ' : '') + (layer.name || layer.id);
}
function psdRecord(layer, index, width, height) {
  const pixels = width * height;
  const extra = Buffer.concat([
    u32(0), // no user layer mask
    u32(0), // no custom blending ranges
    asciiLayerName(layerName(layer)),
    unicodeName(layerName(layer)),
    additionalLayerId(index)
  ]);
  const channelInfo = [-1, 0, 1, 2].map(id => Buffer.concat([i16(id), u32(pixels + 2)]));
  return Buffer.concat([
    i32(0), i32(0), i32(height), i32(width),
    u16(4), ...channelInfo,
    ascii('8BIMnorm'),
    Buffer.from([Math.round(opacityOf(layer) * 255), 0, layer.visible === false ? 2 : 0, 0]),
    u32(extra.length), extra
  ]);
}
function channelPlane(rgba, channel, pixels) {
  const plane = Buffer.allocUnsafe(pixels);
  for (let i = 0, j = channel; i < pixels; i++, j += 4) plane[i] = rgba[j];
  return plane;
}
async function writeChunk(stream, data) {
  if (!stream.write(data)) await once(stream, 'drain');
}
async function writePSD(layers, rendered, compositeRaw, width, height, filename) {
  const topDown = [...layers].reverse();
  const records = topDown.map((layer, index) => psdRecord(layer, index, width, height));
  const pixels = width * height;
  const channelBytes = topDown.length * 4 * (pixels + 2);
  const unpaddedInfo = 2 + records.reduce((n, r) => n + r.length, 0) + channelBytes;
  const infoPad = unpaddedInfo % 2;
  const infoLength = unpaddedInfo + infoPad;
  const maskLength = 4 + infoLength + 4;
  assert(maskLength < 0x100000000, 'PSD exceeds version-1 section limits');
  const stream = fs.createWriteStream(filename);
  const failure = new Promise((_, reject) => stream.on('error', reject));
  const work = (async () => {
    await writeChunk(stream, Buffer.concat([
      ascii('8BPS'), u16(1), Buffer.alloc(6), u16(4), u32(height), u32(width), u16(8), u16(3),
      u32(0), // color mode data
      u32(0), // image resources
      u32(maskLength),
      u32(infoLength), i16(-topDown.length), ...records
    ]));
    for (const layer of topDown) {
      const decoded = PNG.sync.read(rendered.get(layer.id).png);
      assert.equal(decoded.width, width);
      assert.equal(decoded.height, height);
      for (const channel of [3, 0, 1, 2]) {
        await writeChunk(stream, u16(0)); // raw per-channel compression
        await writeChunk(stream, channelPlane(decoded.data, channel, pixels));
      }
    }
    if (infoPad) await writeChunk(stream, Buffer.alloc(1));
    await writeChunk(stream, u32(0)); // no global mask
    await writeChunk(stream, u16(0)); // raw merged image compression
    for (const channel of [0, 1, 2, 3]) {
      await writeChunk(stream, channelPlane(compositeRaw, channel, pixels));
    }
    stream.end();
    await once(stream, 'finish');
  })();
  await Promise.race([work, failure]);
}
function verifyPSD(filename, expectedLayers, width, height) {
  const fd = fs.openSync(filename, 'r');
  const size = fs.fstatSync(fd).size;
  let pos = 0;
  function read(length) {
    const result = Buffer.alloc(length);
    assert.equal(fs.readSync(fd, result, 0, length, pos), length, 'Truncated PSD');
    pos += length;
    return result;
  }
  const nextU16 = () => read(2).readUInt16BE();
  const nextU32 = () => read(4).readUInt32BE();
  try {
    assert.equal(read(4).toString('ascii'), '8BPS');
    assert.equal(nextU16(), 1);
    assert(read(6).every(value => value === 0));
    assert.equal(nextU16(), 4);
    assert.equal(nextU32(), height);
    assert.equal(nextU32(), width);
    assert.equal(nextU16(), 8);
    assert.equal(nextU16(), 3);
    const colorModeLength = nextU32();
    pos += colorModeLength;
    const resourceLength = nextU32();
    pos += resourceLength;
    const maskLength = nextU32();
    const maskEnd = pos + maskLength;
    const infoLength = nextU32();
    const infoEnd = pos + infoLength;
    const count = read(2).readInt16BE();
    assert.equal(count, -expectedLayers, 'Merged transparency layer count');
    const channelLengths = [];
    for (let index = 0; index < expectedLayers; index++) {
      const rectangle = read(16);
      assert.equal(rectangle.readInt32BE(0), 0);
      assert.equal(rectangle.readInt32BE(4), 0);
      assert.equal(rectangle.readInt32BE(8), height);
      assert.equal(rectangle.readInt32BE(12), width);
      assert.equal(nextU16(), 4);
      for (const id of [-1, 0, 1, 2]) {
        assert.equal(read(2).readInt16BE(), id);
        const length = nextU32();
        assert.equal(length, width * height + 2);
        channelLengths.push(length);
      }
      assert.equal(read(8).toString('ascii'), '8BIMnorm');
      read(4); // opacity, clipping, flags, filler
      const extraLength = nextU32();
      pos += extraLength;
      assert(pos <= infoEnd);
    }
    for (const length of channelLengths) {
      assert.equal(nextU16(), 0);
      pos += length - 2;
    }
    assert(infoEnd - pos >= 0 && infoEnd - pos <= 1, 'Unexpected layer-info padding');
    pos = infoEnd;
    assert.equal(nextU32(), 0);
    assert.equal(pos, maskEnd);
    assert.equal(nextU16(), 0);
    assert.equal(size - pos, width * height * 4, 'Merged PSD data size');
    return { width, height, channels: 4, bitDepth: 8, mode: 'RGB', layers: expectedLayers, bytes: size };
  } finally { fs.closeSync(fd); }
}
async function verifyORA(buffer, layers, width, height) {
  const archive = await JSZip.loadAsync(buffer, { checkCRC32: true });
  assert.equal(await archive.file('mimetype').async('string'), 'image/openraster');
  const stack = await archive.file('stack.xml').async('string');
  assert(stack.includes('w="' + width + '"') && stack.includes('h="' + height + '"'));
  assert.equal((stack.match(/<layer /g) || []).length, layers.length);
  for (const layer of layers) assert(archive.file('data/' + layer.exportName), 'Missing ORA layer ' + layer.id);
  const merged = PNG.sync.read(await archive.file('mergedimage.png').async('nodebuffer'));
  assert.equal(merged.width, width);
  assert.equal(merged.height, height);
  // OpenRaster requires the first ZIP entry to be an uncompressed mimetype.
  assert.equal(buffer.readUInt32LE(0), 0x04034b50);
  assert.equal(buffer.readUInt16LE(8), 0);
  const firstNameLength = buffer.readUInt16LE(26);
  assert.equal(buffer.subarray(30, 30 + firstNameLength).toString('utf8'), 'mimetype');
  return { layers: layers.length, files: Object.keys(archive.files).length, bytes: buffer.length, crc32: 'passed' };
}
async function collectFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await collectFiles(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}
async function main() {
  const manifest = JSON.parse(await fsp.readFile(safePath('manifest.json'), 'utf8'));
  const width = Number(manifest.width), height = Number(manifest.height);
  assert.equal(width, 1672, 'Unexpected canvas width');
  assert.equal(height, 941, 'Unexpected canvas height');
  assert(Array.isArray(manifest.layers) && manifest.layers.length > 0, 'Missing manifest layers');
  const layers = manifest.layers.map((layer, index) => ({ ...layer, _index: index }))
    .sort((a, b) => Number(a.z || 0) - Number(b.z || 0) || a._index - b._index);
  assert(layers.length < 32768, 'Too many PSD layers');
  assert.equal(new Set(layers.map(layer => layer.id)).size, layers.length, 'Duplicate layer IDs');
  await fsp.access(safePath('source.png'));
  for (const layer of layers) {
    await fsp.access(safePath(layer.file));
    assert(/^[a-z0-9][a-z0-9_-]*$/i.test(layer.id), 'Unsafe layer ID: ' + layer.id);
  }
  const out = safePath('exports/png');
  await fsp.mkdir(out, { recursive: true });
  const rendered = new Map();
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    const input = safePath(layer.file);
    const metadata = await sharp(input, { limitInputPixels: width * height * 4 }).metadata();
    assert.equal(metadata.width, width, 'Layer is not full-canvas: ' + layer.file);
    assert.equal(metadata.height, height, 'Layer is not full-canvas: ' + layer.file);
    const png = await sharp(input).toColourspace('srgb').ensureAlpha().png().toBuffer();
    layer.exportName = String(index + 1).padStart(2, '0') + '-' + layer.id + '.png';
    await fsp.writeFile(path.join(out, layer.exportName), png);
    rendered.set(layer.id, { png });
    console.log('Rasterizada ' + (index + 1) + '/' + layers.length + ': ' + layer.name);
  }
  const composites = [];
  for (const layer of layers.filter(layer => layer.visible !== false)) {
    let input = rendered.get(layer.id).png;
    const opacity = opacityOf(layer);
    if (opacity < 1) {
      const decoded = PNG.sync.read(input);
      for (let i = 3; i < decoded.data.length; i += 4) decoded.data[i] = Math.round(decoded.data[i] * opacity);
      input = PNG.sync.write(decoded);
    }
    composites.push({ input, left: 0, top: 0, blend: 'over' });
  }
  const compositePNG = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(composites).png().toBuffer();
  await fsp.writeFile(safePath(EXPORTS.composite), compositePNG);
  const compositeDecoded = PNG.sync.read(compositePNG);
  const ora = new JSZip();
  ora.file('mimetype', 'image/openraster', { compression: 'STORE', createFolders: false });
  const stackRows = [...layers].reverse().map(layer =>
    '    <layer name="' + xml(layerName(layer)) + '" src="data/' + layer.exportName +
    '" opacity="' + opacityOf(layer) + '" visibility="' + (layer.visible === false ? 'hidden' : 'visible') +
    '" composite-op="svg:src-over" x="0" y="0" />');
  ora.file('stack.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<image version="0.0.1" w="' + width +
    '" h="' + height + '" name="The Eras Escape — Capas"><stack name="Capas">\n' +
    stackRows.join('\n') + '\n  </stack></image>\n', { createFolders: false });
  for (const layer of layers) ora.file('data/' + layer.exportName, rendered.get(layer.id).png, { createFolders: false });
  ora.file('mergedimage.png', compositePNG, { createFolders: false });
  ora.file('Thumbnails/thumbnail.png', await sharp(compositePNG).resize(256, 256, { fit: 'inside' }).png().toBuffer(),
    { createFolders: false });
  const oraBuffer = await ora.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const oraReport = await verifyORA(oraBuffer, layers, width, height);
  await fsp.writeFile(safePath(EXPORTS.ora), oraBuffer);
  await writePSD(layers, rendered, compositeDecoded.data, width, height, safePath(EXPORTS.psd));
  const psdReport = verifyPSD(safePath(EXPORTS.psd), layers.length, width, height);

  const kit = new JSZip();
  const include = new Set();
  for (const file of [
    'manifest.json', 'layers-data.js', 'source.png', 'preview.html', 'README.md',
    'image-prompts.json', 'PROMPTS.md', 'vector-layers.json', 'alpha-report.json',
    EXPORTS.composite, EXPORTS.ora, EXPORTS.psd
  ]) if (fs.existsSync(safePath(file))) include.add(safePath(file));
  for (const folder of ['layers', 'vectors', 'exports/png']) {
    for (const file of await collectFiles(safePath(folder))) include.add(file);
  }
  for (const layer of layers) include.add(safePath(layer.file));
  // Deliver the local viewer's CSS/JS if they are external files.
  for (const file of await fsp.readdir(root, { withFileTypes: true })) {
    if (file.isFile() && /\.(?:css|js)$/i.test(file.name)) include.add(path.join(root, file.name));
  }
  for (const full of include) {
    const relative = zipPath(path.relative(root, full));
    assert(!relative.startsWith('raw/') && !relative.startsWith('scripts/'));
    kit.file(relative, await fsp.readFile(full), { createFolders: false });
  }
  const kitBuffer = await kit.generateAsync({
    type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 }
  });
  const verifiedKit = await JSZip.loadAsync(kitBuffer, { checkCRC32: true });
  for (const full of include) assert(verifiedKit.file(zipPath(path.relative(root, full))));
  await fsp.writeFile(safePath(EXPORTS.zip), kitBuffer);
  console.log(JSON.stringify({
    canvas: { width, height }, layers: layers.length,
    composite: EXPORTS.composite,
    ora: { file: EXPORTS.ora, ...oraReport },
    psd: { file: EXPORTS.psd, ...psdReport },
    zip: { file: EXPORTS.zip, files: include.size, bytes: kitBuffer.length, crc32: 'passed' },
    note: 'PSD/ORA usan capas raster; los SVG originales editables se conservan en vectors/.'
  }, null, 2));
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
