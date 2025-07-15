import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x808080,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Create a simple human character
function createHuman() {
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    group.add(head);
    
    // Arms
    const armGeometry = new THREE.CapsuleGeometry(0.1, 0.8, 4, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.7, 1, 0);
    leftArm.rotation.z = Math.PI / 4;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.7, 1, 0);
    rightArm.rotation.z = -Math.PI / 4;
    group.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 4, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, 0.4, 0);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, 0.4, 0);
    group.add(rightLeg);
    
    return group;
}

const human = createHuman();
scene.add(human);

// Camera position
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Animation
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start animation
animate(); 