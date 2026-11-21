import { THREE, base, oro, logo3d, bokeh, listo, CON_LOGO, TAU } from './comun.js';
const { renderer, scene, camera } = base(0x050302);
scene.fog = new THREE.Fog(0x050302, 12, 34);
const NX = 70, NZ = 44, S = 0.5;
const geo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6); geo.translate(0, -0.5, 0);
const cap = new THREE.SphereGeometry(0.13, 14, 10);
const mat = oro(0.4), mat2 = oro(0.12); mat.color.set(0x6a4a20);
const im = new THREE.InstancedMesh(geo, mat, NX * NZ), ic = new THREE.InstancedMesh(cap, mat2, NX * NZ);
scene.add(im, ic);
const key = new THREE.DirectionalLight(0xffd2a0, 1.6); key.position.set(-6, 9, 4); scene.add(key);
const red = new THREE.PointLight(0xc01010, 90, 25); red.position.set(0, 1.5, 0); scene.add(red);
scene.add(new THREE.AmbientLight(0x301810, 0.4));
let logo = null;
if (CON_LOGO) { logo = await logo3d(4.6, 0.2); scene.add(logo); }
const bk = bokeh(scene, 50, [-16, 16, 2, 9, -20, -6], 21);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
listo(p => {
  let k = 0;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const x = (i - NX / 2 + 0.5) * S, z = (j - NZ / 2) * S - 2;
    const r = Math.hypot(x, z + 2);
    let y = 0.75 * Math.sin(r * 0.7 - 2 * p) * Math.exp(-r * 0.05) + 0.3 * Math.sin(x * 0.4 + z * 0.25 + p);
    v.set(x, y, z); sc.set(1, 4, 1);
    m4.compose(v, q, sc); im.setMatrixAt(k, m4);
    m4.compose(v, q, new THREE.Vector3(1, 1, 1)); ic.setMatrixAt(k, m4); k++;
  }
  im.instanceMatrix.needsUpdate = true; ic.instanceMatrix.needsUpdate = true;
  const a = 0.35 * Math.sin(p);
  camera.position.set(13 * Math.sin(a), 3.6 + 0.3 * Math.sin(2 * p), 13 * Math.cos(a));
  camera.lookAt(0, 1.2, -2);
  if (logo) { logo.position.set(0, 2.6 + 0.12 * Math.sin(2 * p), -1); logo.lookAt(camera.position); logo.rotation.y += 0.1 * Math.sin(p + 1); }
  red.intensity = 70 + 30 * Math.sin(2 * p);
  bk(p);
  renderer.render(scene, camera);
});
