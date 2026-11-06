import * as THREE from 'three';
import { roundedGeometry, physicalUV } from './surface-library.js';
import { buildLoverCloudCeiling } from './lover-clouds.js';

// Decorative geometry stays against the walls and above the playable space.
// The original door openings, collision boxes and puzzle coordinates are retained.
export function buildLoverArchitecture({ g, materials, heartGeo, size }) {
  const root = new THREE.Group(); root.name = 'lover-iridescent-architecture'; g.add(root);
  const half = size / 2, wallFace = half - .25;
  const ivory = materials.pearl(0xf4dfd2, { roughness: .48 });
  const rose = materials.pearl(0xe9b9c6, { roughness: .58 });
  const champagne = materials.finish(0xd5b58f, { metalness: .55, roughness: .42 });
  const softLight = materials.finish(0xffebd1, { emissive: 0xffd2a1, emissiveIntensity: .42, roughness: .72 });
  const archFill = materials.pearl(0xe8c0d4, { roughness: .85 });
  const plinth = materials.pearl(0xe7cbd5, { roughness: .68 });
  const flutes = [], fluteRadius = .027, fluteHeight = 2.48;
  const box = (parent, w, h, d, material, x, y, z) => {
    const m = new THREE.Mesh(roundedGeometry(w,h,d,.018),material);
    m.position.set(x,y,z); parent.add(m); return m;
  };
  function archPoints(cx, radius, spring, bottom, z) {
    const points=[new THREE.Vector3(cx-radius,bottom,z),new THREE.Vector3(cx-radius,spring,z)];
    for(let i=0;i<=48;i++){
      const angle=Math.PI-i/48*Math.PI;
      points.push(new THREE.Vector3(cx+Math.cos(angle)*radius,spring+Math.sin(angle)*radius,z));
    }
    points.push(new THREE.Vector3(cx+radius,bottom,z));return points;
  }
  function arch(parent,cx,radius,spring) {
    const points=archPoints(cx,radius,spring,1.14,0);
    const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(p.x,p.y)));
    const panel=new THREE.Mesh(new THREE.ShapeGeometry(shape,48),archFill);
    panel.position.z=.035;panel.name='lover-arched-plaster-panel';parent.add(panel);
    physicalUV(panel,2.5,2.5);
    for(const [offset,width,material,z]of [[.07,.045,ivory,.055],[0,.018,champagne,.086],[-.055,.008,softLight,.082]]){
      const path=new THREE.CurvePath(),pts=archPoints(cx,radius+offset,spring,1.14,z);
      for(let i=1;i<pts.length;i++)path.add(new THREE.LineCurve3(pts[i-1],pts[i]));
      const molding=new THREE.Mesh(new THREE.TubeGeometry(path,112,width,6,false),material);
      molding.name='lover-layered-arch-molding';parent.add(molding);
    }
  }
  function opalHeart(parent,x,y,scale=.34) {
    const rim=new THREE.Mesh(heartGeo,champagne);rim.scale.set(scale*1.1,scale*1.1,scale*.4);rim.position.set(x,y,.09);
    const inlay=new THREE.Mesh(heartGeo,materials.opal);inlay.scale.set(scale,scale,scale*.45);inlay.position.set(x,y,.112);
    inlay.name='lover-opal-heart';parent.add(rim,inlay);
  }
  function column(parent,x) {
    box(parent,.44,.09,.16,ivory,x,1.17,.05);
    box(parent,.44,.08,.15,ivory,x,3.7,.05);
    for(let i=0;i<7;i++){
      const p=new THREE.Vector3(x+(i-3)*fluteRadius*1.92,2.44,.072);
      parent.updateMatrixWorld(true);flutes.push(p.applyMatrix4(parent.matrix));
    }
  }
  const walls=[
    {x:0,z:-wallFace,ry:0,door:true,arches:[[-3.65,1.72,1.72],[3.65,1.72,1.72]],columns:[-5.5,-1.7,1.7,5.5]},
    {x:0,z:wallFace,ry:Math.PI,door:true,arches:[[-3.65,1.72,1.72],[3.65,1.72,1.72]],columns:[-5.5,-1.7,1.7,5.5]},
    {x:-wallFace,z:0,ry:Math.PI/2,door:false,arches:[[0,2.08,1.5],[-4,1.08,2.05],[4,1.08,2.05]],columns:[-5.5,-2.45,2.45,5.5]},
    {x:wallFace,z:0,ry:-Math.PI/2,door:false,arches:[[0,2.08,1.5],[-4,1.08,2.05],[4,1.08,2.05]],columns:[-5.5,-2.45,2.45,5.5]},
  ];
  for(const wall of walls){
    const group=new THREE.Group();group.position.set(wall.x,0,wall.z);group.rotation.y=wall.ry;root.add(group);
    const spans=wall.door?[[-5.8,-1.54],[1.54,5.8]]:[[-5.8,5.8]];
    for(const [left,right]of spans){
      const width=right-left,center=(left+right)/2;
      const mosaic=new THREE.Mesh(new THREE.PlaneGeometry(width,1.02),materials.mosaic);
      mosaic.position.set(center,.59,.012);physicalUV(mosaic,1.6,1.6);mosaic.name='lover-nacre-wainscot';group.add(mosaic);
      box(group,width,.1,.055,plinth,center,.055,.025);
      box(group,width,.065,.085,ivory,center,1.12,.04);
      box(group,width,.014,.092,champagne,center,1.16,.049);
    }
    box(group,11.6,.055,.06,rose,0,3.79,.03);
    box(group,11.6,.012,.07,softLight,0,3.825,.045);
    for(const [x,r,spring]of wall.arches)arch(group,x,r,spring);
    for(const x of wall.columns)column(group,x);
    if(wall.door){
      // Vertical framing respects the full 3 m opening and 3.2 m door height.
      for(const side of [-1,1])box(group,.045,3.24,.08,champagne,side*1.54,1.62,.075);
      box(group,3.12,.045,.08,champagne,0,3.25,.075);
      for(const x of [-3.65,3.65])opalHeart(group,x,2.9);
    }else{
      for(const x of [-3.25,3.25])opalHeart(group,x,2.95,.29);
    }
  }
  const ribs=new THREE.InstancedMesh(new THREE.CylinderGeometry(fluteRadius,fluteRadius,fluteHeight,8),rose,flutes.length);
  const transform=new THREE.Object3D();
  flutes.forEach((position,i)=>{transform.position.copy(position);transform.updateMatrix();ribs.setMatrixAt(i,transform.matrix);});
  ribs.instanceMatrix.needsUpdate=true;ribs.name='lover-fluted-columns';root.add(ribs);

  // Close the attic above the old wall height; otherwise rays through a cloud gap
  // can see the black exterior beyond the room's former flat roof.
  for(const wall of walls){
    const seal=new THREE.Mesh(new THREE.PlaneGeometry(size+.12,2.4),materials.cloudCanopy);
    seal.position.set(wall.x,4.8,wall.z);seal.rotation.y=wall.ry;seal.name='lover-cloud-perimeter-seal';seal.userData.noReceiveShadow=true;root.add(seal);
  }
  const canopy=buildLoverCloudCeiling(materials.cloudCanopy);root.add(canopy);
  return {root,canopy,ribs};
}
