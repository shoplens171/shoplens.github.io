// ── Three.js Orb ──
const canvas = document.getElementById('orbCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(320, 320);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 4.5);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const light1 = new THREE.PointLight(0xb5f23a, 2.5, 10);
light1.position.set(-2, 2, 3);
scene.add(light1);

const light2 = new THREE.PointLight(0x7c5cfc, 2, 10);
light2.position.set(2, -1, 2);
scene.add(light2);

const light3 = new THREE.DirectionalLight(0xffffff, 0.8);
light3.position.set(0, 5, 5);
scene.add(light3);

// Main glass orb
const orbGeo = new THREE.SphereGeometry(1.2, 64, 64);
const orbMat = new THREE.MeshPhysicalMaterial({
  color: 0x6633cc,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.6,
  thickness: 1.5,
  transparent: true,
  opacity: 0.92,
  envMapIntensity: 1.2,
});
const orbMesh = new THREE.Mesh(orbGeo, orbMat);
scene.add(orbMesh);

// Green bubbles on surface
const bubblePositions = [
  [0.6, 0.8, 0.7],
  [-0.5, 0.9, 0.8],
  [0.9, -0.3, 0.7],
  [-0.8, -0.5, 0.6],
  [0.2, -1.0, 0.6],
  [-0.3, 0.3, 1.1],
  [0.7, 0.4, -0.8],
  [-0.6, -0.8, -0.6],
];

bubblePositions.forEach(([x, y, z], i) => {
  const size = 0.18 + Math.random() * 0.22;
  const geo = new THREE.SphereGeometry(size, 32, 32);
  const mat = new THREE.MeshPhysicalMaterial({
    color: i % 3 === 0 ? 0x7c5cfc : 0xb5f23a,
    metalness: 0.0,
    roughness: 0.0,
    transmission: 0.5,
    transparent: true,
    opacity: 0.9,
    thickness: 0.8,
  });
  const bubble = new THREE.Mesh(geo, mat);
  const len = Math.sqrt(x*x + y*y + z*z);
  const r = 1.15;
  bubble.position.set(x/len*r, y/len*r, z/len*r);
  scene.add(bubble);
});

// White organic web lines
const webMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
const webPoints = [
  [[-0.5, 0.9, 0.8], [0.6, 0.8, 0.7]],
  [[0.6, 0.8, 0.7], [0.9, -0.3, 0.7]],
  [[-0.5, 0.9, 0.8], [-0.8, -0.5, 0.6]],
  [[0.9, -0.3, 0.7], [0.2, -1.0, 0.6]],
  [[-0.3, 0.3, 1.1], [0.6, 0.8, 0.7]],
  [[-0.3, 0.3, 1.1], [-0.5, 0.9, 0.8]],
  [[-0.8, -0.5, 0.6], [0.2, -1.0, 0.6]],
];

webPoints.forEach(([a, b]) => {
  const points = [new THREE.Vector3(...a), new THREE.Vector3(...b)];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  scene.add(new THREE.Line(geo, webMat));
});

// Orbital rings
function makeRing(rx, ry, rz, color, opacity) {
  const geo = new THREE.TorusGeometry(1.7, 0.008, 8, 120);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.set(rx, ry, rz);
  scene.add(ring);
  return ring;
}

const ring1 = makeRing(1.2, 0.3, -0.3, 0xb5f23a, 0.6);
const ring2 = makeRing(1.0, -0.5, 0.6, 0xa78bfa, 0.4);

// Base platform
const platGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.08, 64);
const platMat = new THREE.MeshPhysicalMaterial({
  color: 0xc8b8ff,
  metalness: 0.1,
  roughness: 0.1,
  transparent: true,
  opacity: 0.35,
});
const platform = new THREE.Mesh(platGeo, platMat);
platform.position.y = -1.5;
scene.add(platform);

// Animate
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.012;

  orbMesh.position.y = Math.sin(t) * 0.15;
  orbMesh.rotation.y += 0.004;

  ring1.rotation.z += 0.006;
  ring2.rotation.z -= 0.004;

  platform.position.y = -1.5 + Math.sin(t) * 0.15;

  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  const size = Math.min(window.innerWidth * 0.42, 320);
  renderer.setSize(size, size);
});

// Scroll reveal for feature cards
const cards = document.querySelectorAll('.feat');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, i * 130);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

cards.forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(28px)';
  card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(card);
});

// CTA click
const cta = document.querySelector('.cta-card');
cta?.addEventListener('click', () => {
  alert('📷 AI image upload coming soon!');
});

const navBtn = document.querySelector('.nav-btn');
navBtn?.addEventListener('click', () => {
  cta?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
