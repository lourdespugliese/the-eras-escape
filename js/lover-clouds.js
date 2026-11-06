import * as THREE from 'three';
import { randomGenerator } from './surface-library.js';

// Quintic interpolation avoids the ridges of a trigonometric displacement.
// This deterministic volume noise is only evaluated while constructing the mesh.
function volumeNoise(seed) {
  const fade=t=>t*t*t*(t*(t*6-15)+10);
  const hash=(x,y,z)=>{
    let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^seed;
    h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295*2-1;
  };
  return (x,y,z)=>{
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),a=fade(x-ix),b=fade(y-iy),c=fade(z-iz);
    const lerp=(p,q,t)=>p+(q-p)*t;
    return lerp(lerp(lerp(hash(ix,iy,iz),hash(ix+1,iy,iz),a),lerp(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),
      lerp(lerp(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),lerp(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c);
  };
}

// An irregular envelope and several scales of density turbulence form one closed
// cotton-like volume. There are no visible sphere primitives or regular lobe rows.
// The detailed geometry is built once and reused by the instanced cloud banks.
function cloudBank(seed) {
  const random=randomGenerator(seed),noise=volumeNoise(seed),nx=66,ny=32,nz=52;
  const sx=6.6,sy=3.2,sz=5.2,dx=sx/nx,dy=sy/ny,dz=sz/nz;
  const index=(x,y,z)=>(z*(ny+1)+y)*(nx+1)+x;
  const count=(nx+1)*(ny+1)*(nz+1),field=new Float32Array(count);
  const lobes=[[-1.42,-.08,-.20],[-.64,.12,.58],[.08,-.16,-.42],[.85,.10,.46],[1.42,-.02,-.24],[-.30,.03,-.88]]
    .map(([x,y,z])=>({x:x+(random()-.5)*.3,y:y+(random()-.5)*.18,z:z+(random()-.5)*.3,
      rx:.82+random()*.32,ry:.49+random()*.2,rz:.76+random()*.32}));
  const smoothMin=(a,b,k)=>{
    const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;
  };
  for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
    const px=x*dx-sx/2,py=y*dy-sy/2,pz=z*dz-sz/2;
    // Broad, non-periodic warping removes the tidy outline of an ellipsoid union.
    const wx=px+.22*noise(px*.9+11,py*.8,pz*.9),
      wy=py+.16*noise(px*1.1,py*.9+19,pz*1.1),
      wz=pz+.22*noise(px*.9,py*.8,pz*.9+37);
    let distance=10;
    for(const l of lobes){
      const qx=wx-l.x,qy=wy-l.y,qz=wz-l.z;
      const q=Math.sqrt((qx/l.rx)**2+(qy/l.ry)**2+(qz/l.rz)**2);
      const derivative=Math.sqrt((qx/(l.rx*l.rx))**2+(qy/(l.ry*l.ry))**2+(qz/(l.rz*l.rz))**2);
      const d=derivative>1e-6?q*(q-1)/derivative:-Math.min(l.rx,l.ry,l.rz);
      distance=smoothMin(distance,d,.32);
    }
    // Long soft folds, intermediate cotton billows, and small broken silhouettes.
    // The highest octave is bounded by the sampling pitch; finer fibres live in
    // the material so this remains a lightweight static mesh rather than fog.
    const broad=.16*noise(px*1.9+5,py*2.3,pz*1.9),
      folds=.095*noise((px+pz*.36)*4.1,py*4.6+13,(pz-px*.36)*4.1),
      fibre=.038*noise((px-pz*.27)*8.2+29,py*8.2,(pz+px*.27)*8.2);
    field[index(x,y,z)]=-distance+broad+folds+fibre;
  }
  const positions=[],normals=[],uvs=[],vertexKeys=[];
  const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const threshold=0;
  const normalAt=(x,y,z)=>new THREE.Vector3(
    (field[index(Math.max(0,x-1),y,z)]-field[index(Math.min(nx,x+1),y,z)])/dx,
    (field[index(x,Math.max(0,y-1),z)]-field[index(x,Math.min(ny,y+1),z)])/dy,
    (field[index(x,y,Math.max(0,z-1))]-field[index(x,y,Math.min(nz,z+1))])/dz,
  );
  function interpolate(a,b){
    const t=(threshold-a.value)/(b.value-a.value);
    return {p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),key:Math.min(a.id,b.id)+'/'+Math.max(a.id,b.id)};
  }
  function triangle(a,b,c,outward){
    const cross=new THREE.Vector3().crossVectors(b.p.clone().sub(a.p),c.p.clone().sub(a.p));
    // The tetrahedron's linear density field defines which side is outside.
    // Smoothed shading normals may cross at narrow folds, so they cannot safely
    // determine winding (that produced tiny back-face holes in the old mesh).
    if(cross.dot(outward)<0)[b,c]=[c,b];
    for(const v of [a,b,c]){positions.push(v.p.x,v.p.y,v.p.z);normals.push(v.n.x,v.n.y,v.n.z);uvs.push(v.p.x/2,v.p.z/2);vertexKeys.push(v.key);}
  }
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const values=corners.map(([cx,cy,cz])=>field[index(x+cx,y+cy,z+cz)]);
    if(values.every(v=>v<threshold)||values.every(v=>v>=threshold))continue;
    const cube=corners.map(([cx,cy,cz],i)=>({id:index(x+cx,y+cy,z+cz),value:values[i],p:new THREE.Vector3((x+cx)*dx-sx/2,(y+cy)*dy-sy/2,(z+cz)*dz-sz/2),n:normalAt(x+cx,y+cy,z+cz)}));
    for(const ids of tetrahedra){
      const inside=ids.filter(i=>values[i]>=threshold),outside=ids.filter(i=>values[i]<threshold);
      if(!inside.length||!outside.length)continue;
      const innerCenter=new THREE.Vector3(),outerCenter=new THREE.Vector3();
      inside.forEach(i=>innerCenter.add(cube[i].p));outside.forEach(i=>outerCenter.add(cube[i].p));
      const outward=outerCenter.divideScalar(outside.length).sub(innerCenter.divideScalar(inside.length));
      if(inside.length===1||outside.length===1){
        const one=inside.length===1?inside[0]:outside[0],rest=inside.length===1?outside:inside;
        triangle(...rest.map(i=>interpolate(cube[one],cube[i])),outward);
      }else{
        const a=interpolate(cube[inside[0]],cube[outside[0]]),b=interpolate(cube[inside[0]],cube[outside[1]]);
        const c=interpolate(cube[inside[1]],cube[outside[0]]),d=interpolate(cube[inside[1]],cube[outside[1]]);
        triangle(a,b,c,outward);triangle(b,d,c,outward);
      }
    }
  }
  // Share vertices by their actual grid-edge identity. Spatial rounding could
  // collapse nearby but distinct intersections and create degenerate triangles.
  const lookup=new Map(),indices=[],uniquePositions=[],uniqueNormals=[],uniqueUVs=[];
  for(let i=0;i<positions.length/3;i++){
    const key=vertexKeys[i];
    let id=lookup.get(key);
    if(id===undefined){id=uniquePositions.length/3;lookup.set(key,id);uniquePositions.push(...positions.slice(i*3,i*3+3));uniqueNormals.push(...normals.slice(i*3,i*3+3));uniqueUVs.push(...uvs.slice(i*2,i*2+2));}
    indices.push(id);
  }
  // A restrained Taubin pass rounds the sampling-scale corners without turning
  // the broad irregular folds into spheres or noticeably shrinking the bank.
  const neighbours=Array.from({length:uniquePositions.length/3},()=>new Set());
  for(let i=0;i<indices.length;i+=3){
    const ids=indices.slice(i,i+3);
    for(let j=0;j<3;j++){neighbours[ids[j]].add(ids[(j+1)%3]);neighbours[ids[j]].add(ids[(j+2)%3]);}
  }
  for(let pass=0;pass<3;pass++)for(const amount of [.42,-.43]){
    const previous=uniquePositions.slice();
    for(let i=0;i<neighbours.length;i++)for(let axis=0;axis<3;axis++){
      let average=0;for(const neighbour of neighbours[i])average+=previous[neighbour*3+axis];
      uniquePositions[i*3+axis]+=amount*(average/neighbours[i].size-previous[i*3+axis]);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(uniquePositions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(uniqueNormals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uniqueUVs,2));geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Baked transmission hint: opaque downward bellies stay pink/lavender while
  // thinner outer folds and upward-facing rims can catch the hidden warm light.
  const cloudLight=new Float32Array(uniquePositions.length/3);
  for(let i=0;i<cloudLight.length;i++){
    const ny=geometry.attributes.normal.getY(i),y=uniquePositions[i*3+1];
    const rim=Math.min(1,Math.max(Math.abs(uniquePositions[i*3])/2.45,Math.abs(uniquePositions[i*3+2])/1.65));
    const slope=Math.sqrt(Math.max(0,1-ny*ny));
    cloudLight[i]=THREE.MathUtils.clamp(.03+.55*Math.pow((ny+1)*.5,.7)+.22*slope+.18*rim*rim+.1*Math.max(0,y),0,1);
  }
  geometry.setAttribute('cloudLight',new THREE.BufferAttribute(cloudLight,1));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function buildLoverCloudCeiling(material) {
  const group=new THREE.Group();group.name='lover-volumetric-cloud-banks';
  const transform=new THREE.Object3D(),random=randomGenerator(420);
  const colors=[0xffd4e2,0xdce5f5,0xffdce7,0xe8e5fa];
  const spots=[];
  for(let z=0;z<4;z++)for(let x=0;x<3;x++)spots.push({
    x:(x-1)*3.95+(z%2?-.14:.14)+(random()-.5)*.24,
    z:(z-1.5)*3.14+(random()-.5)*.28,
    y:4.51+random()*.25,rotation:(random()-.5)*.22+(z%2?Math.PI:0),
    sx:1.02+random()*.1,sy:.86+random()*.14,sz:1.04+random()*.08,
  });
  for(let variant=0;variant<3;variant++){
    const selected=spots.filter((_,i)=>i%3===variant),geometry=cloudBank(215+variant*37);
    const clouds=new THREE.InstancedMesh(geometry,material,selected.length);
    clouds.name='lover-solid-cloud-bank-'+variant;clouds.userData.noReceiveShadow=true;
    selected.forEach((p,i)=>{
      transform.position.set(p.x,p.y,p.z);
      transform.rotation.set(0,p.rotation,0);transform.scale.set(p.sx,p.sy,p.sz);transform.updateMatrix();
      clouds.setMatrixAt(i,transform.matrix);clouds.setColorAt(i,new THREE.Color(colors[(i+variant)%3]));
    });
    clouds.instanceMatrix.needsUpdate=true;clouds.instanceColor.needsUpdate=true;group.add(clouds);
  }
  // Warm backing is visible only in narrow spaces between the actual cloud bodies.
  const backing=new THREE.Mesh(new THREE.PlaneGeometry(12.15,12.15),new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,1.45,.45)}));
  backing.rotation.x=Math.PI/2;backing.position.y=5.7;backing.name='lover-concealed-cloud-light';group.add(backing);
  group.userData.solidBanks=spots.length;group.userData.geometryVariants=3;return group;
}
