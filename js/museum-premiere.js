// Banners fotográficos y reflectores del estreno. Todos pertenecen al grupo de la intro.
import * as THREE from 'three';

const BANNERS = [
  { id: 'fearless', x: -14, center: 0.28, top: 0.34, height: 0.34 },
  { id: '1989', x: -10, center: 0.45, top: 0.05, height: 0.65 },
  { id: 'reputation', x: -6, center: 0.5, top: 0.45, height: 0.4 },
  { id: 'lover', x: 6, center: 0.49, top: 0.05, height: 0.6 },
  { id: 'folklore', x: 10, center: 0.45, top: 0.47, height: 0.38 },
  { id: 'midnights', x: 14, center: 0.5, top: 0.1, height: 0.65 },
];
const WIDTH = 2.64, HEIGHT = 7.15;
const UP = new THREE.Vector3(0, 1, 0);

function buildRedCarpet(group, centerX, ground) {
  const width = 3.45, lift = 0.045;
  const profile = [[62, ground + lift], [35.012, ground + lift]];
  for (let step = 0; step < 6; step++) {
    const front = 35 - step + 0.012, top = ground + (step + 1) * 0.2 + lift;
    profile.push([front, top], [front - 1, top]);
  }
  profile.push([25.13, lift]);
  const positions = [], uvs = [], indices = [];
  let length = 0;
  profile.forEach(([z, y], index) => {
    if (index) length += Math.hypot(z - profile[index - 1][0], y - profile[index - 1][1]);
    positions.push(centerX - width / 2, y, z, centerX + width / 2, y, z);
    uvs.push(0, length, 1, length);
    if (index) { const i = index * 2; indices.push(i - 2, i - 1, i, i, i - 1, i + 1); }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  // Microtrama repetible para que la tela absorba la luz en lugar de parecer plástico.
  const fibers = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4;
    fibers[i] = 128 + (x % 2 ? 5 : -5); fibers[i + 1] = 128 + (y % 2 ? 5 : -5);
    fibers[i + 2] = 255; fibers[i + 3] = 255;
  }
  const normalMap = new THREE.DataTexture(fibers, 64, 64);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(24, 7); normalMap.generateMipmaps = true;
  normalMap.minFilter = THREE.LinearMipmapLinearFilter; normalMap.magFilter = THREE.LinearFilter;
  normalMap.needsUpdate = true;
  const material = new THREE.MeshPhysicalMaterial({ color: 0xb4142e, roughness: 0.98,
    metalness: 0, normalMap, normalScale: new THREE.Vector2(0.2, 0.2),
    sheen: 0.7, sheenColor: 0xc62640, sheenRoughness: 0.85, specularIntensity: 0.18,
    emissive: 0x390410, emissiveIntensity: 0.22 });
  const carpet = new THREE.Mesh(geometry, material); carpet.name = 'premiere-red-carpet';
  carpet.receiveShadow = true; group.add(carpet);
  return carpet;
}

function haloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), fill = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  fill.addColorStop(0, 'rgba(255,255,255,1)');
  fill.addColorStop(0.15, 'rgba(210,230,255,.5)');
  fill.addColorStop(1, 'rgba(160,200,255,0)');
  g.fillStyle = fill; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      origin: { value: new THREE.Vector3() }, axis: { value: new THREE.Vector3(0, 1, 0) },
      beamColor: { value: new THREE.Color(0xd3e3ff) }, strength: { value: 0.2 },
    },
    vertexShader: `varying vec3 worldPoint;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        worldPoint = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `uniform vec3 origin; uniform vec3 axis; uniform vec3 beamColor;
      uniform float strength; varying vec3 worldPoint;
      void main() {
        vec3 ray = normalize(worldPoint - cameraPosition);
        vec3 offset = cameraPosition - origin;
        float alignment = dot(ray, axis);
        float divisor = max(0.0001, 1.0 - alignment * alignment);
        float along = (dot(offset, axis) - alignment * dot(offset, ray)) / divisor;
        float rayDistance = alignment * along - dot(offset, ray);
        vec3 separation = offset + ray * rayDistance - axis * along;
        float radius = 0.18 + max(along, 0.0) * 0.062;
        float radial = length(separation) / radius;
        float edge = 1.0 - smoothstep(0.25, 1.0, radial);
        float longitudinal = pow(max(0.0, 1.0 - along / 60.0), 1.15);
        float nearFade = smoothstep(-0.2, 0.5, along);
        float alpha = strength * edge * longitudinal * nearFade;
        if (alpha < 0.002 || rayDistance < 0.0) discard;
        gl_FragColor = vec4(beamColor * 1.5, alpha);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.FrontSide, toneMapped: false,
  });
}

export function buildMuseumPremiere({ root, colliders, centerX = 2, ground = -1.2, brass }) {
  const group = new THREE.Group(); group.name = 'museum-premiere'; root.add(group);
  const redCarpet = buildRedCarpet(group, centerX, ground);
  const loader = new THREE.TextureLoader(), banners = [], fixtures = [], pools = [];
  const pending = [];
  const casing = new THREE.MeshStandardMaterial({ color: 0x13171d, metalness: 0.65, roughness: 0.36 });
  const lensMaterial = new THREE.MeshBasicMaterial({ color: 0xe5f0ff, toneMapped: false });
  const glow = haloTexture();
  const cylinder = (radius, length, mat) => new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 20), mat);

  BANNERS.forEach((def, index) => {
    const holder = new THREE.Group(); holder.name = `banner-${def.id}`;
    holder.position.set(centerX + def.x, 4.45, 27.1); group.add(holder);
    // Las fotos permanecen intactas en disco: el encuadre del banner se define en las UVs.
    let map;
    pending.push(new Promise((resolve, reject) => {
      map = loader.load(`assets/banners/${def.id}.jpg`, texture => {
        const aspect = texture.image.width / texture.image.height;
        const width = Math.min(1, WIDTH / HEIGHT * def.height / aspect);
        texture.repeat.set(width, def.height);
        texture.offset.set(THREE.MathUtils.clamp(def.center - width / 2, 0, 1 - width), 1 - def.top - def.height);
        texture.needsUpdate = true; resolve();
      }, undefined, error => {
        console.error(`[premiere] No se pudo cargar el banner ${def.id}`, error); reject(error);
      });
    }));
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const cloth = new THREE.MeshPhysicalMaterial({ map, emissiveMap: map, color: 0xffffff,
      emissive: 0xffffff, emissiveIntensity: 0.22, roughness: 0.82, metalness: 0,
      side: THREE.DoubleSide, clearcoat: 0.08 });
    const geo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 12, 28);
    const mesh = new THREE.Mesh(geo, cloth); mesh.name = `banner-cloth-${def.id}`;
    mesh.castShadow = true; mesh.receiveShadow = true; holder.add(mesh);
    const base = geo.attributes.position.array.slice();
    banners.push({ mesh, base, phase: index * 1.7 });
    for (const y of [-HEIGHT / 2, HEIGHT / 2]) {
      const rod = cylinder(0.045, WIDTH + 0.24, brass); rod.rotation.z = Math.PI / 2; rod.position.y = y; holder.add(rod);
    }
    for (const x of [-WIDTH / 2, WIDTH / 2]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.025, HEIGHT, 0.025), brass);
      trim.position.set(x, 0, 0.04); holder.add(trim);
    }
  });

  [-1, 1].forEach(side => {
    const pool = new THREE.PointLight(0xd5e6ff, 0, 11, 2);
    pool.position.set(centerX + side * 15, ground + 0.9, 36.8); group.add(pool); pools.push(pool);
    [12.8, 17.2].forEach((distance, index) => {
      const base = new THREE.Group(); base.name = `premiere-light-${side}-${index}`;
      base.position.set(centerX + side * distance, ground, 37.2 + index * 0.5); group.add(base);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.25, 0.76), casing); foot.position.y = 0.15; base.add(foot);
      [-0.35, 0.35].forEach(x => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.18), casing);
        arm.position.set(x, 0.5, 0); base.add(arm);
      });
      const swivel = new THREE.Group(); swivel.position.y = 0.65; base.add(swivel);
      const head = cylinder(0.27, 0.6, casing); swivel.add(head);
      const rim = cylinder(0.29, 0.04, brass); rim.position.y = 0.3; swivel.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), lensMaterial);
      lens.rotation.x = -Math.PI / 2; lens.position.y = 0.325; swivel.add(lens);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xcfe2ff,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      halo.position.y = 0.34; halo.scale.setScalar(1.8); swivel.add(halo);
      const geometry = new THREE.CylinderGeometry(3.9, 0.18, 60, 32, 1, true);
      geometry.translate(0, 30.34, 0);
      const beam = new THREE.Mesh(geometry, beamMaterial()); beam.name = 'premiere-beam';
      beam.renderOrder = 2; beam.raycast = () => {}; swivel.add(beam);
      beam.onBeforeRender = () => {
        beam.material.uniforms.origin.value.set(0, 0.34, 0).applyMatrix4(beam.matrixWorld);
        beam.material.uniforms.axis.value.copy(UP).transformDirection(beam.matrixWorld);
      };
      colliders.push({ minX: base.position.x - 0.48, maxX: base.position.x + 0.48,
        minZ: base.position.z - 0.42, maxZ: base.position.z + 0.42 });
      fixtures.push({ swivel, beam, halo, side, index });
    });
  });

  let frame = 0;
  const direction = new THREE.Vector3();
  return {
    group, banners, fixtures, redCarpet,
    ready: Promise.all(pending),
    update(dt, time, outside) {
      // Desactivar los haces al entrar evita que el humo atraviese el techo del hall.
      fixtures.forEach(({ swivel, beam, halo, side, index }) => {
        direction.set(side * (index === 0 ? 0.28 : -0.3) + Math.sin(time * 0.16 + index) * 0.035, 1, -0.12).normalize();
        swivel.quaternion.setFromUnitVectors(UP, direction);
        beam.visible = outside > 0.02; halo.visible = beam.visible;
        beam.material.uniforms.strength.value = 0.2 * outside;
        halo.material.opacity = 0.85 * outside;
      });
      pools.forEach(light => { light.intensity = 13 * outside; });
      if (outside < 0.02 || !group.parent.visible || ++frame % 3) return;
      banners.forEach(({ mesh, base, phase }) => {
        const p = mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = base[i * 3], y = base[i * 3 + 1];
          const free = Math.sin((y / HEIGHT + 0.5) * Math.PI);
          p.array[i * 3 + 2] = Math.sin(x * 4.5 + time * 0.7 + phase) * 0.055 * free;
        }
        p.needsUpdate = true; mesh.geometry.computeVertexNormals();
      });
    },
  };
}
