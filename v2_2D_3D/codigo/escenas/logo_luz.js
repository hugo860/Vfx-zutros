import { THREE, base, oro, logo3d, bokeh, listo, CON_LOGO, TAU } from './comun.js';
const { renderer, scene, camera } = base(0x060403);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// fluted art-deco wall: vertical gold-edged black panels
const wall = new THREE.Group(); scene.add(wall);
const negro = new THREE.MeshPhysicalMaterial({ color: 0x120a08, metalness: 0.2, roughness: 0.35, clearcoat: 0.6 });
const filo = oro(0.25);
for (let i = -26; i <= 26; i++) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 16, 24, 1, false, 0, Math.PI), negro);
  f.rotation.y = -Math.PI / 2; f.position.set(i * 0.56, 0, -2.6); f.receiveShadow = true; wall.add(f);
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.035, 16, 0.035), filo); l.position.set(i * 0.56 + 0.28, 0, -2.6); wall.add(l);
}
const sweep = new THREE.SpotLight(0xffd3a0, 500, 40, 0.32, 0.8); sweep.castShadow = true;
sweep.shadow.mapSize.set(2048, 2048); sweep.shadow.bias = -0.0004;
scene.add(sweep); scene.add(sweep.target);
const fill = new THREE.PointLight(0xff8060, 25, 30); fill.position.set(-6, -3, 6); scene.add(fill);
scene.add(new THREE.AmbientLight(0x3a2018, 0.5));
let logo = null;
if (CON_LOGO) { logo = await logo3d(6.2, 0.35); logo.traverse(o => o.castShadow = true); scene.add(logo); }
else { // centrepiece without logo: gold deco medallion
  logo = new THREE.Group();
  logo.add(new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.07, 24, 200), oro(0.2)));
  logo.add(new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.03, 24, 200), oro(0.15)));
  for (let i = 0; i < 24; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.02), oro(0.2));
    const a = i / 24 * TAU; r.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0); r.rotation.z = a - Math.PI / 2; logo.add(r); }
  logo.traverse(o => o.castShadow = true); scene.add(logo);
}
const bk = bokeh(scene, 40, [-12, 12, -7, 7, 2, 5], 9);
listo(p => {
  camera.position.set(3.2 * Math.sin(p), 0.6 + 0.5 * Math.sin(2 * p), 11.5 + 0.5 * Math.cos(p));
  camera.lookAt(0, 0, 0);
  // the light glides left->right->left like a slow scanner
  sweep.position.set(9 * Math.sin(p - 0.6), 4 + Math.cos(p), 9);
  sweep.target.position.set(2.5 * Math.sin(p - 0.6), 0, -2);
  logo.rotation.y = 0.12 * Math.sin(p + 0.5);
  bk(p);
  renderer.render(scene, camera);
});
