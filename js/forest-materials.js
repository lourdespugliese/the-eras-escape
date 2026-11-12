import * as THREE from 'three';
import { createSurfaceLibrary, canvasSurface, randomGenerator } from './surface-library.js';

export function createForestMaterials() {
  const lib=createSurfaceLibrary('forest'),r=randomGenerator(77),wind={value:0};
  const bark=lib.imageMap('bark','assets/textures/world/forest-bark.webp',1024,'#8b8071');
  const earth=lib.imageMap('earth','assets/textures/world/forest-earth.webp',1024,'#68533d');
  const leaves=lib.imageMap('leaves','assets/textures/world/leaf-cluster.webp',512,'#aaa');
  const needles=lib.imageMap('needles','assets/textures/world/pine-spray.webp',512,'#bbb');
  leaves.repeat.set(3,2);needles.repeat.set(4,3);
  const willowLeaves=leaves.clone();willowLeaves.repeat.set(1,10);
  const snow=lib.make('snow',512,(c,w,h)=>{
    c.fillStyle='#dce5ed';c.fillRect(0,0,w,h);
    for(let i=0;i<14000;i++){const x=r()*w,y=r()*h;c.fillStyle=r()<.4?'rgba(108,143,171,.1)':'rgba(255,255,255,.26)';c.fillRect(x,y,.7+r()*2,.7+r()*2);}
  });
  const roof=lib.make('roof',512,(c,w,h)=>{
    c.fillStyle='#9b948c';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=64)for(let x=-64;x<w;x+=96){const xx=x+(y/64%2)*48,v=118+Math.floor(r()*60);c.fillStyle=`rgb(${v},${v-6},${v-12})`;c.fillRect(xx+2,y+2,92,60);c.fillStyle='rgba(19,22,15,.35)';c.fillRect(xx,y+61,96,3);for(let i=0;i<6;i++){c.fillStyle='rgba(255,250,224,.1)';c.fillRect(xx+8+r()*80,y+8+r()*45,1,10);}}
  });
  const growth=lib.make('growth',256,(c,w,h)=>{
    c.fillStyle='#50754a';c.fillRect(0,0,w,h);
    for(let i=0;i<5000;i++){c.fillStyle=r()<.5?'rgba(166,187,97,.4)':'rgba(18,55,34,.35)';c.beginPath();c.arc(r()*w,r()*h,.4+r()*2.5,0,Math.PI*2);c.fill();}
  });
  const ice=lib.make('ice',512,(c,w,h)=>{
    const gr=c.createRadialGradient(256,256,30,256,256,330);gr.addColorStop(0,'#b1cbd5');gr.addColorStop(1,'#6e9eb6');c.fillStyle=gr;c.fillRect(0,0,w,h);
    for(let k=0;k<22;k++){let x=r()*w,y=r()*h;c.strokeStyle='rgba(230,248,255,.32)';c.lineWidth=.5+r();c.beginPath();c.moveTo(x,y);for(let j=0;j<7;j++){x+=(r()-.5)*70;y+=(r()-.5)*70;c.lineTo(x,y);}c.stroke();}
    for(let k=0;k<140;k++){c.strokeStyle='rgba(230,248,255,.24)';c.beginPath();c.ellipse(r()*w,r()*h,1+r()*4,1+r()*2,0,0,Math.PI*2);c.stroke();}
  });
  const footprint=canvasSurface(128,256,(c)=>{
    c.fillStyle='#fff';c.beginPath();c.ellipse(64,81,37,64,-.08,0,Math.PI*2);c.fill();c.fillRect(37,153,54,65);
    c.globalCompositeOperation='destination-out';c.lineWidth=6;for(let y=35;y<140;y+=20){c.beginPath();c.moveTo(22,y);c.lineTo(106,y+8);c.stroke();}c.fillRect(61,28,6,112);c.fillRect(34,177,61,7);
  });
  const fallingLeaf=canvasSurface(64,64,(c)=>{
    c.fillStyle='#e9dfc4';c.beginPath();c.moveTo(32,2);c.bezierCurveTo(63,18,55,47,31,60);c.bezierCurveTo(9,45,3,19,32,2);c.fill();c.strokeStyle='#81715a';c.lineWidth=1.7;c.beginPath();c.moveTo(32,8);c.lineTo(31,61);c.stroke();
  });
  function sway(material, key) {
    const inject=shader=>{
      shader.uniforms.uFoliageTime=wind;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uFoliageTime;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 foliageAnchor=vec3(0.0);
        #ifdef USE_INSTANCING
          foliageAnchor=instanceMatrix[3].xyz;
        #endif
        float foliageFlex=smoothstep(-0.6,1.0,position.y);
        transformed.x+=sin(uFoliageTime*0.7+foliageAnchor.x*.41+foliageAnchor.z*.27)*.028*foliageFlex;
        transformed.z+=cos(uFoliageTime*.54+foliageAnchor.z*.31)*.018*foliageFlex;`);
      if (material.isMeshStandardMaterial) {
        // La cara visible de una hoja también recibe luz transmitida desde el reverso.
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', `
          #include <lights_physical_pars_fragment>
          void RE_Direct_ForestLeaf(const in IncidentLight light, const in vec3 position,
            const in vec3 normal, const in vec3 viewDirection, const in vec3 clearcoatNormal,
            const in PhysicalMaterial surface, inout ReflectedLight reflected) {
            RE_Direct_Physical(light, position, normal, viewDirection, clearcoatNormal, surface, reflected);
            float backlight = max(-dot(normal, light.direction), 0.0);
            reflected.directDiffuse += light.color * BRDF_Lambert(surface.diffuseColor) * (0.12 + 0.60 * backlight);
          }
          #undef RE_Direct
          #define RE_Direct RE_Direct_ForestLeaf
        `).replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * 0.11;
        `);
      }
    };
    material.onBeforeCompile=inject;material.customProgramCacheKey=()=>key;return material;
  }
  const foliage=sway(lib.finish(0xffffff,{map:leaves,alphaTest:.5,side:THREE.DoubleSide,roughness:.96,bumpScale:0,emissive:0x050704}),'forest-leaf-wind-v2');foliage.name='forest-cutout-leaves';
  const pine=sway(lib.finish(0xffffff,{map:needles,alphaTest:.45,side:THREE.DoubleSide,roughness:.97,emissive:0x040604,bumpMap:needles,bumpScale:.005}),'forest-pine-wind-v2');pine.name='forest-pine-needles';
  const foliageDepth=sway(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:leaves,alphaTest:.5,side:THREE.DoubleSide}),'forest-leaf-depth-v1');
  const pineDepth=sway(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:needles,alphaTest:.45,side:THREE.DoubleSide}),'forest-pine-depth-v1');
  const leafMaterial = (color, map = leaves) => {
    const material = sway(foliage.clone(), 'forest-leaf-wind-v2');
    material.color.set(color);
    material.map = map;
    return material;
  };
  const wood=(color=0x9c8b76,o={})=>lib.timber(color,o);
  const trunk=lib.finish(0xffffff,{map:bark,roughness:.98,bumpMap:bark,bumpScale:.025});trunk.name='forest-oak-bark';
  const cut=lib.make('endGrain',256,(c,w,h)=>{
    c.fillStyle='#a78a63';c.fillRect(0,0,w,h);for(let k=5;k<130;k+=5+r()*4){c.strokeStyle='rgba(73,48,25,.3)';c.lineWidth=.7+r();c.beginPath();c.ellipse(128,128,k,k*.92,.15,0,Math.PI*2);c.stroke();}
    c.strokeStyle='rgba(61,43,26,.5)';c.lineWidth=1;for(let i=0;i<5;i++){const a=r()*Math.PI*2;c.beginPath();c.moveTo(128+Math.cos(a)*80,128+Math.sin(a)*80);c.lineTo(128+Math.cos(a)*125,128+Math.sin(a)*125);c.stroke();}
  });
  const ground=(baseMap,w,d)=>{
    const m=lib.finish(0xffffff,{map:baseMap,roughness:1,bumpMap:lib.maps.grain,bumpScale:.008});
    m.userData.streamingTextures=[earth,snow.texture];
    m.onBeforeCompile=shader=>{
      shader.uniforms.uForestEarth={value:earth};shader.uniforms.uForestSnow={value:snow.texture};shader.uniforms.uForestSize={value:new THREE.Vector2(w/3,d/3)};
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uForestEarth; uniform sampler2D uForestSnow; uniform vec2 uForestSize;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        vec3 forestEarth=texture2D(uForestEarth,vMapUv*uForestSize).rgb;
        vec3 forestSnow=texture2D(uForestSnow,vMapUv*uForestSize).rgb;
        float winter=smoothstep(.57,.7,vMapUv.x);
        diffuseColor.rgb*=mix(vec3(.55)+forestEarth*1.8,forestSnow*1.12,winter);`);
    };m.customProgramCacheKey=()=> 'forest-seasonal-ground-v1';return m;
  };
  const cutWood=lib.finish(0xffffff,{map:cut.texture,roughness:.97});
  const ready=lib.ready().then(ok=>{if(ok)willowLeaves.needsUpdate=true;return ok;});
  return {lib,willowLeaves,cutWood,maps:lib.maps,finish:lib.finish,wood,trunk,foliage,pine,foliageDepth,pineDepth,leafMaterial,wind,ground,roof:roof.texture,growth:growth.texture,ice:ice.texture,endGrain:cut.texture,footprint:footprint.texture,fallingLeaf:fallingLeaf.texture,ready};
}
