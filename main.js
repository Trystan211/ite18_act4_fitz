import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";

// === Basic Scene Setup ===
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 30);
scene.add(camera);

// === Orbit Controls ===
new OrbitControls(camera, renderer.domElement);

// === Lighting ===
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const movingLight = new THREE.PointLight(0x8a2be2, 2, 50);
movingLight.position.set(10, 10, 10);
scene.add(movingLight);

// === Crystals ===
const crystalMaterial = new THREE.MeshPhongMaterial({
    color: 0x7fffd4,
    emissive: 0x7fffd4,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.9,
    shininess: 100,
});

function createCrystal(position) {
    const geometry = new THREE.ConeGeometry(1, 3, 8);
    const crystal = new THREE.Mesh(geometry, crystalMaterial);
    crystal.position.set(...position);
    scene.add(crystal);
}

// Generate Random Crystals
for (let i = 0; i < 30; i++) {
    createCrystal([
        (Math.random() - 0.5) * 50,
        Math.random() * 5,
        (Math.random() - 0.5) * 50,
    ]);
}

// === Shimmering Lake ===
const lake = (() => {
    const geometry = new THREE.PlaneGeometry(100, 100, 200, 200);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(0x1e90ff) },
            highlightColor: { value: new THREE.Color(0x87cefa) },
        },
        vertexShader: `
            uniform float time;
            varying vec2 vUv;
            varying float vWave;

            void main() {
                vUv = uv;
                vec3 pos = position;
                vWave = sin(pos.x * 0.2 + time) * 0.3 + cos(pos.z * 0.2 + time * 1.5) * 0.3;
                pos.y += vWave;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 highlightColor;
            varying vec2 vUv;
            varying float vWave;

            void main() {
                float intensity = vWave * 0.5 + 0.5;
                vec3 color = mix(baseColor, highlightColor, intensity);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, material);
})();
scene.add(lake);

// === Model ===
let centralModel = null;
new GLTFLoader().load(
    'https://trystan211.github.io/ite18_fitz_act4/metroid_primecreaturesmagmoor.glb',
    (gltf) => {
        centralModel = gltf.scene;
        centralModel.position.set(0, 1, 0);
        centralModel.scale.set(5, 5, 5);
        scene.add(centralModel);
        console.log("Model Loaded:", gltf.scene);
    },
    undefined,
    (error) => console.error("Failed to load model:", error)
);

// === Orbiting Particles ===
const particles = (() => {
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 10;
        positions[i * 3] = Math.cos(angle) * distance; // x
        positions[i * 3 + 1] = Math.random() * 5 - 2.5; // y
        positions[i * 3 + 2] = Math.sin(angle) * distance; // z
        speeds[i] = 0.001 + Math.random() * 0.002;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("speed", new THREE.Float32BufferAttribute(speeds, 1));

    const material = new THREE.PointsMaterial({
        color: 0x87cefa,
        size: 0.2,
        transparent: true,
        opacity: 0.9,
    });

    const points = new THREE.Points(geometry, material);
    return points;
})();
scene.add(particles);

// === Animation ===
const clock = new THREE.Clock();

function animate() {
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Update lake shader
    lake.material.uniforms.time.value = time;

    // Update particles
    const particlePositions = particles.geometry.attributes.position.array;
    const particleSpeeds = particles.geometry.attributes.speed.array;

    for (let i = 0; i < particlePositions.length / 3; i++) {
        const angle = Math.atan2(particlePositions[i * 3 + 2], particlePositions[i * 3]);
        const distance = Math.sqrt(
            particlePositions[i * 3] ** 2 + particlePositions[i * 3 + 2] ** 2
        );

        const speed = particleSpeeds[i];
        const newAngle = angle + speed;

        particlePositions[i * 3] = Math.cos(newAngle) * distance;
        particlePositions[i * 3 + 2] = Math.sin(newAngle) * distance;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    // Update moving light
    movingLight.position.set(
        10 * Math.sin(time * 0.5),
        10,
        10 * Math.cos(time * 0.5)
    );

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// === Responsive Resizing ===
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

