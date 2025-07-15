import * as THREE from 'three';
import { GUI } from 'dat.gui';

// Instructions modal functionality
let game;
let instructionsShown = false;

window.startGame = function() {
    const modal = document.getElementById('instructionsModal');
    const helpToggle = document.getElementById('helpToggle');
    
    modal.classList.add('hidden');
    helpToggle.classList.add('visible');
    instructionsShown = true;
    
    // Auto-hide instructions after 3 seconds if user doesn't click start
    setTimeout(() => {
        if (!instructionsShown) {
            modal.classList.add('hidden');
            helpToggle.classList.add('visible');
        }
    }, 3000);
}

window.toggleInstructions = function() {
    const modal = document.getElementById('instructionsModal');
    const helpToggle = document.getElementById('helpToggle');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        helpToggle.classList.remove('visible');
    } else {
        modal.classList.add('hidden');
        helpToggle.classList.add('visible');
    }
}

window.toggleCheatCodes = function() {
    const content = document.getElementById('cheatCodesContent');
    const toggle = document.getElementById('cheatToggle');
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        toggle.classList.remove('expanded');
    } else {
        content.classList.add('expanded');
        toggle.classList.add('expanded');
    }
}

// Add click listener to close modal when clicking overlay
window.addEventListener('load', () => {
    const modal = document.getElementById('instructionsModal');
    const instructionsContent = modal.querySelector('.instructions-content');
    
    modal.addEventListener('click', (e) => {
        // Only close if clicking the overlay (modal background), not the content
        if (e.target === modal) {
            const helpToggle = document.getElementById('helpToggle');
            modal.classList.add('hidden');
            helpToggle.classList.add('visible');
            instructionsShown = true;
        }
    });
    
    // Prevent clicks on the content from bubbling up to the modal
    instructionsContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Initialize the game
    game = new Game();
});

// Auto-hide instructions after 5 seconds if user doesn't interact
setTimeout(() => {
    if (!instructionsShown) {
        const modal = document.getElementById('instructionsModal');
        const helpToggle = document.getElementById('helpToggle');
        modal.classList.add('hidden');
        helpToggle.classList.add('visible');
    }
}, 5000);

class Game {
    constructor() {
        // Setup scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // Disable antialiasing for performance
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = false; // Disable shadows for better performance
        document.body.appendChild(this.renderer.domElement);

        // Performance tracking
        this.fps = 0;
        this.frames = 0;
        this.lastTime = performance.now();
        this.frameTime = 0;
        this.showFPS = true; // Set to false to disable FPS display

        // Camera controls
        this.cameraControls = {
            position: { x: 0, y: 3, z: 5 },
            lookAt: { x: 0, y: 0, z: 0 },
            followPlayer: true,
            distance: 11,
            height: 8,
            smoothness: 0.05, // Camera smoothing factor (lower = smoother)
            rotationSpeed: 0.05 // Speed of camera rotation
        };

        // Game state
        this.gameState = {
            isAttacking: false,
            moneyPoints: 100,
            lastAttackTime: 0,
            lastVampireSpawnTime: 0,
            vampires: [],
            moneyCats: [],
            savedCats: [],
            explosionParticles: [],
            lastCollisionCheck: 0,
            lasers: [],
            lastLaserAttackTime: 0,
            isLaserAttacking: false,
            isCallingCats: false,
            lastCatCallTime: 0,
            dog: null // Replace followerCats with a single dog
        };

        // Setup simple background
        this.setupBackground();

        // Setup player
        this.player = this.createPlayer();
        this.scene.add(this.player);
        
        // Position the player at the center of the scene
        this.player.position.set(0, 0, 0);

        // Setup multiple enemies
        this.setupEnemies();
        
        // Setup money cats
        this.setupMoneyCats();
        
        // Setup dog
        this.setupDog();

        // Setup camera position - adjusted to better view the player
        this.camera.position.set(
            this.cameraControls.position.x,
            this.cameraControls.position.y,
            this.cameraControls.position.z
        );
        this.camera.lookAt(
            this.cameraControls.lookAt.x,
            this.cameraControls.lookAt.y,
            this.cameraControls.lookAt.z
        );

        // Setup basic lighting
        this.setupLighting();

        // Movement controls
        this.moveSpeed = 0.2; // Doubled from 0.1 to 0.2
        this.keys = {};
        this.isMoving = false;
        this.animationTime = 0;
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Setup GUI
        this.setupGUI();

        // Setup HUD
        this.setupHUD();

        // Start animation loop
        this.animate();
    }

    setupGUI() {
        // Create GUI
        this.gui = new GUI();
        
        // Camera controls
        const cameraFolder = this.gui.addFolder('Camera Controls');
        cameraFolder.add(this.cameraControls, 'followPlayer').name('Follow Player');
        cameraFolder.add(this.cameraControls, 'distance', 1, 20).name('Distance');
        cameraFolder.add(this.cameraControls, 'height', 1, 10).name('Height');
        cameraFolder.add(this.cameraControls, 'smoothness', 0.01, 0.2).name('Smoothness');
        cameraFolder.add(this.cameraControls, 'rotationSpeed', 0.01, 0.2).name('Rotation Speed');
        
        // Camera position controls
        const positionFolder = cameraFolder.addFolder('Camera Position');
        positionFolder.add(this.cameraControls.position, 'x', -50, 50).name('X');
        positionFolder.add(this.cameraControls.position, 'y', 1, 20).name('Y');
        positionFolder.add(this.cameraControls.position, 'z', -50, 50).name('Z');
        
        // Look at controls
        const lookAtFolder = cameraFolder.addFolder('Look At');
        lookAtFolder.add(this.cameraControls.lookAt, 'x', -50, 50).name('X');
        lookAtFolder.add(this.cameraControls.lookAt, 'y', 0, 10).name('Y');
        lookAtFolder.add(this.cameraControls.lookAt, 'z', -50, 50).name('Z');
        
        // Performance settings
        const performanceFolder = this.gui.addFolder('Performance');
        performanceFolder.add(this, 'showFPS').name('Show FPS');
        
        // Player controls
        const playerFolder = this.gui.addFolder('Player');
        playerFolder.add(this.player.position, 'x', -50, 50).name('X');
        playerFolder.add(this.player.position, 'y', 0, 10).name('Y');
        playerFolder.add(this.player.position, 'z', -50, 50).name('Z');
        playerFolder.add({ moveSpeed: this.moveSpeed }, 'moveSpeed', 0.01, 0.5).onChange((value) => {
            this.moveSpeed = value;
        }).name('Move Speed');
        
        // Game settings
        const gameFolder = this.gui.addFolder('Game Settings');
        gameFolder.add(this.gameState, 'moneyPoints', 0, 1000).name('Money Points');
        
        // Add FPS display
        this.fpsElement = document.createElement('div');
        this.fpsElement.style.position = 'absolute';
        this.fpsElement.style.top = '10px';
        this.fpsElement.style.left = '10px';
        this.fpsElement.style.color = 'white';
        this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.fpsElement.style.padding = '5px';
        this.fpsElement.style.borderRadius = '5px';
        this.fpsElement.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(this.fpsElement);
    }

    setupHUD() {
        // Create stylized status bar
        this.setupStatusBar();
    }

    setupStatusBar() {
        // Create status bar container
        this.statusBar = document.createElement('div');
        this.statusBar.style.position = 'absolute';
        this.statusBar.style.bottom = '20px';
        this.statusBar.style.left = '50%';
        this.statusBar.style.transform = 'translateX(-50%)';
        this.statusBar.style.display = 'flex';
        this.statusBar.style.justifyContent = 'center';
        this.statusBar.style.alignItems = 'center';
        this.statusBar.style.gap = '20px';
        this.statusBar.style.padding = '10px 20px';
        this.statusBar.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.statusBar.style.borderRadius = '10px';
        this.statusBar.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        this.statusBar.style.fontFamily = 'Arial, sans-serif';
        this.statusBar.style.fontSize = '18px';
        this.statusBar.style.fontWeight = 'bold';
        this.statusBar.style.color = 'white';
        this.statusBar.style.border = '2px solid #4B0082'; // Purple border to match witch theme
        document.body.appendChild(this.statusBar);
        
        // Create money points display with icon
        this.statusMoneyDisplay = document.createElement('div');
        this.statusMoneyDisplay.style.display = 'flex';
        this.statusMoneyDisplay.style.alignItems = 'center';
        this.statusMoneyDisplay.style.gap = '8px';
        this.statusMoneyDisplay.innerHTML = `
            <span style="color: gold;">💰</span>
            <span>${this.gameState.moneyPoints}</span>
        `;
        this.statusBar.appendChild(this.statusMoneyDisplay);
        
        // Create separator
        const separator1 = document.createElement('div');
        separator1.style.width = '2px';
        separator1.style.height = '24px';
        separator1.style.backgroundColor = '#4B0082';
        this.statusBar.appendChild(separator1);
        
        // Create attack mode indicator with icon
        this.statusAttackIndicator = document.createElement('div');
        this.statusAttackIndicator.style.display = 'flex';
        this.statusAttackIndicator.style.alignItems = 'center';
        this.statusAttackIndicator.style.gap = '8px';
        this.statusAttackIndicator.innerHTML = `
            <span style="color: red;">⚔️</span>
            <span>OFF</span>
        `;
        this.statusBar.appendChild(this.statusAttackIndicator);
        
        // Create separator
        const separator2 = document.createElement('div');
        separator2.style.width = '2px';
        separator2.style.height = '24px';
        separator2.style.backgroundColor = '#4B0082';
        this.statusBar.appendChild(separator2);
        
        // Create vampire count display with icon
        this.statusVampireCountDisplay = document.createElement('div');
        this.statusVampireCountDisplay.style.display = 'flex';
        this.statusVampireCountDisplay.style.alignItems = 'center';
        this.statusVampireCountDisplay.style.gap = '8px';
        this.statusVampireCountDisplay.innerHTML = `
            <span style="color: #8B0000;">🧛</span>
            <span>${this.gameState.vampires.filter(v => !v.userData.isExploded).length}</span>
        `;
        this.statusBar.appendChild(this.statusVampireCountDisplay);
        
        // Create separator
        const separator3 = document.createElement('div');
        separator3.style.width = '2px';
        separator3.style.height = '24px';
        separator3.style.backgroundColor = '#4B0082';
        this.statusBar.appendChild(separator3);
        
        // Create saved cats count display with icon
        this.statusCatsCountDisplay = document.createElement('div');
        this.statusCatsCountDisplay.style.display = 'flex';
        this.statusCatsCountDisplay.style.alignItems = 'center';
        this.statusCatsCountDisplay.style.gap = '8px';
        this.statusCatsCountDisplay.innerHTML = `
            <span style="color: #FFD700;">🐱</span>
            <span>${this.gameState.savedCats.length}</span>
        `;
        this.statusBar.appendChild(this.statusCatsCountDisplay);
    }

    setupBackground() {
        // Simple blue background
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Create a very simple green ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x2d5a27, // Dark green
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.5;
        this.scene.add(ground);
        
        // Store ground bounds for player movement constraints
        this.groundBounds = {
            minX: -50,
            maxX: 50,
            minZ: -50,
            maxZ: 50
        };
    }

    setupLighting() {
        // Simple ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Simple directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 10, 0);
        this.scene.add(directionalLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setupEnemies() {
        // Create multiple vampires
        const vampireCount = 10; // Doubled from 5 to 10
        
        for (let i = 0; i < vampireCount; i++) {
            const vampire = this.createEnemy();
            this.scene.add(vampire);
            this.gameState.vampires.push(vampire);
            
            // Position the vampire randomly
            this.positionEnemyRandomly(vampire);
        }
    }

    positionEnemyRandomly(vampire) {
        // Random position within the map bounds
        const x = Math.random() * 80 - 40; // -40 to 40
        const z = Math.random() * 80 - 40; // -40 to 40
        
        // Ensure enemy is not too close to the player
        const distanceToPlayer = Math.sqrt(
            Math.pow(x - this.player.position.x, 2) + 
            Math.pow(z - this.player.position.z, 2)
        );
        
        // If too close to player, reposition
        if (distanceToPlayer < 10) {
            this.positionEnemyRandomly(vampire);
            return;
        }
        
        vampire.position.set(x, 0, z);
    }

    createEnemy() {
        const enemyGroup = new THREE.Group();

        // Materials for the money vampire
        const skinMaterial = new THREE.MeshBasicMaterial({ color: 0x8B0000 }); // Dark red skin
        const capeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black cape
        const fangMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // White fangs
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red glowing eyes
        const moneyMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold money

        // Head - reduced segments
        const headGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 2;
        enemyGroup.add(head);

        // Fangs - reduced segments
        const fangGeometry = new THREE.ConeGeometry(0.05, 0.2, 4);
        
        // Left fang
        const leftFang = new THREE.Mesh(fangGeometry, fangMaterial);
        leftFang.position.set(-0.1, 1.9, 0.25);
        leftFang.rotation.x = Math.PI;
        enemyGroup.add(leftFang);
        
        // Right fang
        const rightFang = new THREE.Mesh(fangGeometry, fangMaterial);
        rightFang.position.set(0.1, 1.9, 0.25);
        rightFang.rotation.x = Math.PI;
        enemyGroup.add(rightFang);

        // Eyes - reduced segments
        const eyeGeometry = new THREE.SphereGeometry(0.08, 6, 6);
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 2.1, 0.25);
        enemyGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 2.1, 0.25);
        enemyGroup.add(rightEye);

        // Body (cape) - reduced segments
        const capeGeometry = new THREE.CapsuleGeometry(0.5, 1.2, 4, 6);
        const cape = new THREE.Mesh(capeGeometry, capeMaterial);
        cape.position.y = 1;
        enemyGroup.add(cape);

        // Arms - reduced segments
        const armGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 4, 6);
        
        // Left arm
        const enemyLeftArm = new THREE.Mesh(armGeometry, skinMaterial);
        enemyLeftArm.position.set(-0.6, 1.2, 0);
        enemyLeftArm.rotation.z = Math.PI / 2;
        enemyGroup.add(enemyLeftArm);
        
        // Right arm
        const enemyRightArm = new THREE.Mesh(armGeometry, skinMaterial);
        enemyRightArm.position.set(0.6, 1.2, 0);
        enemyRightArm.rotation.z = -Math.PI / 2;
        enemyGroup.add(enemyRightArm);

        // Legs - reduced segments
        const legGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 4, 6);
        
        // Left leg
        const enemyLeftLeg = new THREE.Mesh(legGeometry, skinMaterial);
        enemyLeftLeg.position.set(-0.2, 0.2, 0);
        enemyGroup.add(enemyLeftLeg);
        
        // Right leg
        const enemyRightLeg = new THREE.Mesh(legGeometry, skinMaterial);
        enemyRightLeg.position.set(0.2, 0.2, 0);
        enemyGroup.add(enemyRightLeg);

        // Money bag - reduced segments
        const moneyBagGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const moneyBag = new THREE.Mesh(moneyBagGeometry, moneyMaterial);
        moneyBag.position.set(0, 0.5, 0);
        enemyGroup.add(moneyBag);

        // Store references for animation
        enemyGroup.userData = {
            leftArm: enemyLeftArm,
            rightArm: enemyRightArm,
            leftLeg: enemyLeftLeg,
            rightLeg: enemyRightLeg,
            originalArmRotations: {
                left: enemyLeftArm.rotation.z,
                right: enemyRightArm.rotation.z
            },
            originalLegRotations: {
                left: enemyLeftLeg.rotation.x,
                right: enemyRightLeg.rotation.x
            },
            animationTime: 0,
            isExploded: false
        };

        return enemyGroup;
    }

    createPlayer() {
        const playerGroup = new THREE.Group();

        // Reuse materials for better performance
        const hatMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hairMaterial = new THREE.MeshBasicMaterial({ color: 0x3d2314 }); // Brown hair
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc99 });
        const dressMaterial = new THREE.MeshBasicMaterial({ color: 0x4B0082 }); // Purple dress
        const armMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc99 });
        const legMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const goldMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold for money elements

        // Witch hat - revert to original segments
        const hatBaseGeometry = new THREE.CylinderGeometry(0.6, 0.8, 0.2, 8);
        const hatTopGeometry = new THREE.ConeGeometry(0.6, 1.2, 8);
        const hatBase = new THREE.Mesh(hatBaseGeometry, hatMaterial);
        const hatTop = new THREE.Mesh(hatTopGeometry, hatMaterial);
        hatBase.position.y = 2.4;
        hatTop.position.y = 3.2;
        playerGroup.add(hatBase);
        playerGroup.add(hatTop);
        
        // Add a gold buckle to the hat - revert to original segments
        const buckleGeometry = new THREE.TorusGeometry(0.1, 0.03, 8, 16);
        const buckle = new THREE.Mesh(buckleGeometry, goldMaterial);
        buckle.position.set(0, 2.4, 0.4);
        buckle.rotation.x = Math.PI / 2;
        playerGroup.add(buckle);

        // Hair - revert to original segments
        const hairGeometry = new THREE.SphereGeometry(0.35, 8, 8);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 2.1;
        hair.scale.y = 1.2;
        playerGroup.add(hair);
        
        // Add hair strands - revert to original count
        for (let i = 0; i < 8; i++) {
            const strandGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4);
            const strand = new THREE.Mesh(strandGeometry, hairMaterial);
            const angle = (i / 8) * Math.PI * 2;
            strand.position.set(
                Math.cos(angle) * 0.3,
                2.1,
                Math.sin(angle) * 0.3
            );
            strand.rotation.x = Math.PI / 2;
            playerGroup.add(strand);
        }

        // Head - revert to original segments
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2;
        playerGroup.add(head);
        
        // Eyes - revert to original segments
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 2.1, 0.25);
        playerGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 2.1, 0.25);
        playerGroup.add(rightEye);
        
        // Nose - revert to original segments
        const noseGeometry = new THREE.ConeGeometry(0.03, 0.1, 4);
        const nose = new THREE.Mesh(noseGeometry, headMaterial);
        nose.position.set(0, 2.05, 0.3);
        nose.rotation.x = -Math.PI / 2;
        playerGroup.add(nose);
        
        // Mouth - revert to original segments
        const mouthGeometry = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
        const mouth = new THREE.Mesh(mouthGeometry, new THREE.MeshBasicMaterial({ color: 0x990000 }));
        mouth.position.set(0, 1.95, 0.3);
        mouth.rotation.x = Math.PI / 2;
        playerGroup.add(mouth);

        // Body (dress) - revert to original segments
        const dressGeometry = new THREE.CapsuleGeometry(0.5, 1.2, 4, 8);
        const dress = new THREE.Mesh(dressGeometry, dressMaterial);
        dress.position.y = 1;
        playerGroup.add(dress);
        
        // Add gold trim to dress - revert to original segments
        const trimGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 16);
        const trim = new THREE.Mesh(trimGeometry, goldMaterial);
        trim.position.set(0, 1.6, 0);
        trim.rotation.x = Math.PI / 2;
        playerGroup.add(trim);
        
        // Add money symbols to dress - revert to original count
        for (let i = 0; i < 4; i++) {
            const symbolGeometry = new THREE.CircleGeometry(0.1, 8);
            const symbol = new THREE.Mesh(symbolGeometry, goldMaterial);
            const angle = (i / 4) * Math.PI * 2;
            symbol.position.set(
                Math.cos(angle) * 0.4,
                1.2,
                Math.sin(angle) * 0.4
            );
            symbol.rotation.y = -angle;
            playerGroup.add(symbol);
        }

        // Arms - revert to original segments
        const armGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 4, 8);
        
        // Left arm
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-0.6, 1.2, 0);
        this.leftArm.rotation.z = Math.PI / 2;
        playerGroup.add(this.leftArm);
        
        // Right arm
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(0.6, 1.2, 0);
        this.rightArm.rotation.z = -Math.PI / 2;
        playerGroup.add(this.rightArm);
        
        // Add sleeves to arms - revert to original segments
        const sleeveGeometry = new THREE.TorusGeometry(0.15, 0.05, 8, 16);
        
        // Left sleeve
        const leftSleeve = new THREE.Mesh(sleeveGeometry, dressMaterial);
        leftSleeve.position.set(-0.6, 1.6, 0);
        leftSleeve.rotation.z = Math.PI / 2;
        playerGroup.add(leftSleeve);
        
        // Right sleeve
        const rightSleeve = new THREE.Mesh(sleeveGeometry, dressMaterial);
        rightSleeve.position.set(0.6, 1.6, 0);
        rightSleeve.rotation.z = -Math.PI / 2;
        playerGroup.add(rightSleeve);

        // Legs - revert to original segments
        const legGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 4, 8);
        
        // Left leg
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.2, 0.2, 0);
        playerGroup.add(this.leftLeg);
        
        // Right leg
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.2, 0.2, 0);
        playerGroup.add(this.rightLeg);
        
        // Add boots - revert to original segments
        const bootGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
        
        // Left boot
        const leftBoot = new THREE.Mesh(bootGeometry, new THREE.MeshBasicMaterial({ color: 0x4B0082 }));
        leftBoot.position.set(-0.2, -0.3, 0);
        playerGroup.add(leftBoot);
        
        // Right boot
        const rightBoot = new THREE.Mesh(bootGeometry, new THREE.MeshBasicMaterial({ color: 0x4B0082 }));
        rightBoot.position.set(0.2, -0.3, 0);
        playerGroup.add(rightBoot);
        
        // Add gold buckles to boots - revert to original segments
        const bootBuckleGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.05);
        
        // Left boot buckle
        const leftBootBuckle = new THREE.Mesh(bootBuckleGeometry, goldMaterial);
        leftBootBuckle.position.set(-0.2, -0.25, 0.1);
        playerGroup.add(leftBootBuckle);
        
        // Right boot buckle
        const rightBootBuckle = new THREE.Mesh(bootBuckleGeometry, goldMaterial);
        rightBootBuckle.position.set(0.2, -0.25, 0.1);
        playerGroup.add(rightBootBuckle);
        
        // Add a broomstick - revert to original segments
        const broomstickGroup = new THREE.Group();
        
        // Broomstick handle
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown wood
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.rotation.x = Math.PI / 2;
        handle.position.set(0, 0.5, -0.5);
        broomstickGroup.add(handle);
        
        // Broomstick head
        const broomHeadGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const broomHeadMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
        const broomHead = new THREE.Mesh(broomHeadGeometry, broomHeadMaterial);
        broomHead.position.set(0, 0.5, -1.2);
        broomHead.rotation.x = -Math.PI / 2;
        broomstickGroup.add(broomHead);
        
        // Add gold trim to broomstick - revert to original segments
        const broomTrimGeometry = new THREE.TorusGeometry(0.03, 0.01, 8, 16);
        const broomTrim = new THREE.Mesh(broomTrimGeometry, goldMaterial);
        broomTrim.position.set(0, 0.5, -0.3);
        broomTrim.rotation.x = Math.PI / 2;
        broomstickGroup.add(broomTrim);
        
        // Add money bag - revert to original segments
        const moneyBagGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const moneyBag = new THREE.Mesh(moneyBagGeometry, goldMaterial);
        moneyBag.position.set(0.3, 0.8, 0);
        playerGroup.add(moneyBag);
        
        // Add money symbols to money bag - revert to original segments
        const moneySymbolGeometry = new THREE.CircleGeometry(0.05, 8);
        const moneySymbol = new THREE.Mesh(moneySymbolGeometry, new THREE.MeshBasicMaterial({ color: 0x4B0082 }));
        moneySymbol.position.set(0.3, 0.8, 0.15);
        moneySymbol.rotation.y = Math.PI / 2;
        playerGroup.add(moneySymbol);
        
        // Add the broomstick to the player group
        playerGroup.add(broomstickGroup);
        
        // Store references for animation
        this.playerGroup = playerGroup;
        this.originalArmRotations = {
            left: this.leftArm.rotation.z,
            right: this.rightArm.rotation.z
        };
        this.originalLegRotations = {
            left: this.leftLeg.rotation.x,
            right: this.rightLeg.rotation.x
        };
        
        // Store broomstick reference for animation
        this.broomstick = broomstickGroup;

        return playerGroup;
    }

    // Check if player is colliding with a vampire
    checkCollision(vampire) {
        if (vampire.userData.isExploded) return false;
        
        const playerPosition = this.player.position.clone();
        const vampirePosition = vampire.position.clone();
        
        // Simple distance-based collision detection
        const distance = playerPosition.distanceTo(vampirePosition);
        
        // Collision threshold (adjust as needed)
        return distance < 1.5;
    }

    // Optimize explosion particles
    createExplosion(vampire) {
        if (vampire.userData.isExploded) return;
        
        vampire.userData.isExploded = true;
        
        // Store vampire position for particles
        const vampirePosition = vampire.position.clone();
        
        // Hide the vampire
        vampire.visible = false;
        
        // Create explosion particles - reduced count
        const particleCount = 30; // Reduced from 50
        const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        
        // Create materials for different parts of the vampire
        const materials = [
            new THREE.MeshBasicMaterial({ color: 0x8B0000 }), // Dark red (skin)
            new THREE.MeshBasicMaterial({ color: 0x000000 }), // Black (cape)
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF }), // White (fangs)
            new THREE.MeshBasicMaterial({ color: 0xFF0000 }), // Red (eyes)
            new THREE.MeshBasicMaterial({ color: 0xFFD700 })  // Gold (money)
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const material = materials[Math.floor(Math.random() * materials.length)];
            const particle = new THREE.Mesh(particleGeometry, material);
            
            // Position at vampire's position
            particle.position.copy(vampirePosition);
            
            // Add random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            // Add gravity effect
            particle.gravity = 0.01;
            
            // Add to scene and particles array
            this.scene.add(particle);
            this.gameState.explosionParticles.push(particle);
        }
        
        // Add money points for defeating a vampire
        this.gameState.moneyPoints += 20;
        this.updateHUD();
        
        console.log("Vampire exploded! +20 money points");
    }

    // Update explosion particles
    updateExplosion() {
        // Update each particle
        for (let i = this.gameState.explosionParticles.length - 1; i >= 0; i--) {
            const particle = this.gameState.explosionParticles[i];
            
            // Apply velocity
            particle.position.add(particle.velocity);
            
            // Apply gravity
            particle.velocity.y -= particle.gravity;
            
            // Remove particles that fall below ground
            if (particle.position.y < -1) {
                this.scene.remove(particle);
                this.gameState.explosionParticles.splice(i, 1);
            }
        }
    }

    // Update HUD display
    updateHUD() {
        // Update status bar
        this.statusMoneyDisplay.innerHTML = `
            <span style="color: gold;">💰</span>
            <span>${this.gameState.moneyPoints}</span>
        `;
        
        this.statusAttackIndicator.innerHTML = `
            <span style="color: ${this.gameState.isAttacking ? 'green' : 'red'};">⚔️</span>
            <span>${this.gameState.isAttacking ? 'ON' : 'OFF'}</span>
        `;
        
        this.statusVampireCountDisplay.innerHTML = `
            <span style="color: #8B0000;">🧛</span>
            <span>${this.gameState.vampires.filter(v => !v.userData.isExploded).length}</span>
        `;
        
        this.statusCatsCountDisplay.innerHTML = `
            <span style="color: #FFD700;">🐱</span>
            <span>${this.gameState.savedCats.length}</span>
        `;
    }

    // Spawn a new vampire
    spawnVampire() {
        const currentTime = performance.now();
        
        // Only spawn a new vampire every 10 seconds and if there are fewer than 10 vampires
        if (currentTime - this.gameState.lastVampireSpawnTime > 10000 && 
            this.gameState.vampires.filter(v => !v.userData.isExploded).length < 10) {
            
            const vampire = this.createEnemy();
            this.scene.add(vampire);
            this.gameState.vampires.push(vampire);
            
            // Position the vampire randomly
            this.positionEnemyRandomly(vampire);
            
            this.gameState.lastVampireSpawnTime = currentTime;
            this.updateHUD();
        }
    }

    handleMovement() {
        this.isMoving = false;
        
        // Calculate new position based on input
        let newX = this.player.position.x;
        let newZ = this.player.position.z;
        
        // Get camera's forward and right vectors for relative movement
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement on the ground plane
        cameraDirection.normalize();
        
        // Calculate camera's right vector (perpendicular to forward)
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Calculate movement direction based on input
        const moveDirection = new THREE.Vector3();
        
        // Forward/backward movement (W/S only) - relative to camera
        if (this.keys['w']) {
            moveDirection.add(cameraDirection);
            this.isMoving = true;
        }
        if (this.keys['s']) {
            moveDirection.sub(cameraDirection);
            this.isMoving = true;
        }
        
        // Left/right movement (A/D only) - relative to camera
        if (this.keys['a']) {
            moveDirection.sub(cameraRight);
            this.isMoving = true;
        }
        if (this.keys['d']) {
            moveDirection.add(cameraRight);
            this.isMoving = true;
        }
        
        // Normalize movement direction
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            
            // Apply movement
            newX += moveDirection.x * this.moveSpeed;
            newZ += moveDirection.z * this.moveSpeed;
            
            // Make player face movement direction
            this.player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
        }
        
        // Check for attack mode (space key)
        this.gameState.isAttacking = this.keys[' '] || false;
        
        // Check for laser attack (P key)
        if (this.keys['p'] && !this.gameState.isLaserAttacking) {
            this.gameState.isLaserAttacking = true;
            this.gameState.lastLaserAttackTime = performance.now();
            this.createLaserAttack();
        }
        
        // Check for cat call (O key)
        if (this.keys['o'] && !this.gameState.isCallingCats) {
            this.gameState.isCallingCats = true;
            this.gameState.lastCatCallTime = performance.now();
            this.callMoneyCats();
        }
        
        // Apply boundary constraints
        newX = Math.max(this.groundBounds.minX, Math.min(this.groundBounds.maxX, newX));
        newZ = Math.max(this.groundBounds.minZ, Math.min(this.groundBounds.maxZ, newZ));
        
        // Update player position
        this.player.position.x = newX;
        this.player.position.z = newZ;

        // Update camera based on controls
        if (this.cameraControls.followPlayer) {
            // Follow player mode - camera always behind player
            const playerRotation = this.player.rotation.y;
            
            // Calculate target camera position behind player
            const targetCameraOffset = new THREE.Vector3(
                Math.sin(playerRotation) * this.cameraControls.distance,
                this.cameraControls.height,
                Math.cos(playerRotation) * this.cameraControls.distance
            );
            
            const targetCameraPosition = new THREE.Vector3(
                this.player.position.x - targetCameraOffset.x,
                this.player.position.y + targetCameraOffset.y,
                this.player.position.z - targetCameraOffset.z
            );
            
            // Smoothly interpolate camera position
            this.camera.position.lerp(targetCameraPosition, this.cameraControls.smoothness);
            
            // Handle camera rotation with arrow keys only
            if (this.keys['ArrowLeft']) {
                // Rotate camera left
                this.player.rotation.y += this.cameraControls.rotationSpeed;
            }
            if (this.keys['ArrowRight']) {
                // Rotate camera right
                this.player.rotation.y -= this.cameraControls.rotationSpeed;
            }
            
            // Smoothly look at player
            const currentLookAt = new THREE.Vector3();
            this.camera.getWorldDirection(currentLookAt);
            
            const targetLookAt = new THREE.Vector3();
            targetLookAt.subVectors(this.player.position, this.camera.position).normalize();
            
            // Interpolate look direction
            const interpolatedLookAt = new THREE.Vector3();
            interpolatedLookAt.copy(currentLookAt).lerp(targetLookAt, this.cameraControls.smoothness);
            
            // Apply the interpolated look direction
            const lookAtPosition = new THREE.Vector3();
            lookAtPosition.copy(this.camera.position).add(interpolatedLookAt);
            this.camera.lookAt(lookAtPosition);
        } else {
            // Free camera mode
            this.camera.position.set(
                this.cameraControls.position.x,
                this.cameraControls.position.y,
                this.cameraControls.position.z
            );
            this.camera.lookAt(
                this.cameraControls.lookAt.x,
                this.cameraControls.lookAt.y,
                this.cameraControls.lookAt.z
            );
        }

        // Animate limbs based on movement and attack state
        this.animationTime += 0.2;
        
        if (this.gameState.isAttacking) {
            // Wild flailing arms when attacking
            this.leftArm.rotation.z = this.originalArmRotations.left + Math.sin(this.animationTime * 3) * 1.5;
            this.rightArm.rotation.z = this.originalArmRotations.right - Math.sin(this.animationTime * 3) * 1.5;
            
            // Animate broomstick during attack
            if (this.broomstick) {
                this.broomstick.rotation.z = Math.sin(this.animationTime * 3) * 0.5;
                this.broomstick.rotation.x = Math.sin(this.animationTime * 3) * 0.3;
            }
        } else if (this.isMoving) {
            // Normal walking animation
            this.leftArm.rotation.z = this.originalArmRotations.left + Math.sin(this.animationTime) * 0.3;
            this.rightArm.rotation.z = this.originalArmRotations.right - Math.sin(this.animationTime) * 0.3;
            
            // Animate broomstick during movement
            if (this.broomstick) {
                this.broomstick.rotation.z = Math.sin(this.animationTime) * 0.2;
            }
        } else {
            // Reset arms to original position when not moving or attacking
            this.leftArm.rotation.z = this.originalArmRotations.left;
            this.rightArm.rotation.z = this.originalArmRotations.right;
            
            // Reset broomstick
            if (this.broomstick) {
                this.broomstick.rotation.z = 0;
                this.broomstick.rotation.x = 0;
            }
        }
        
        // Leg animation (only when moving)
        if (this.isMoving) {
            this.leftLeg.rotation.x = this.originalLegRotations.left + Math.sin(this.animationTime) * 0.3;
            this.rightLeg.rotation.x = this.originalLegRotations.right - Math.sin(this.animationTime) * 0.3;
        } else {
            this.leftLeg.rotation.x = this.originalLegRotations.left;
            this.rightLeg.rotation.x = this.originalLegRotations.right;
        }

        // Check for collision with vampires
        const currentTime = performance.now();
        if (currentTime - this.gameState.lastCollisionCheck > 100) { // Check every 100ms
            this.gameState.lastCollisionCheck = currentTime;
            
            // Check each vampire
            for (let i = this.gameState.vampires.length - 1; i >= 0; i--) {
                const vampire = this.gameState.vampires[i];
                
                if (this.checkCollision(vampire)) {
                    if (this.gameState.isAttacking) {
                        // Player is attacking, explode the vampire
                        this.createExplosion(vampire);
                    } else {
                        // Player is not attacking, lose money points
                        this.gameState.moneyPoints = Math.max(0, this.gameState.moneyPoints - 10);
                        this.updateHUD();
                        console.log("Lost 10 money points to vampire!");
                    }
                }
            }
            
            // Check each money cat
            for (let i = this.gameState.moneyCats.length - 1; i >= 0; i--) {
                const cat = this.gameState.moneyCats[i];
                
                if (this.checkCatCollision(cat)) {
                    // Save the cat
                    this.saveMoneyCat(cat);
                }
            }
        }

        // Update dog position
        this.updateDogPosition();

        // Animate vampires
        this.animateVampires();
        
        // Update money cats
        this.updateMoneyCats();
        
        // Update saved cats
        this.updateSavedCats();
        
        // Update dog
        this.updateDog();
        
        // Update explosion particles
        this.updateExplosion();
        
        // Spawn new vampires
        this.spawnVampire();
        
        // Update HUD
        this.updateHUD();
    }

    animateVampires() {
        // Animate each vampire
        this.gameState.vampires.forEach(vampire => {
            if (vampire.userData.isExploded) return;
            
            // Update animation time
            vampire.userData.animationTime = (vampire.userData.animationTime || 0) + 0.05;
            
            // Random meandering behavior
            if (!vampire.userData.directionChangeTime || performance.now() > vampire.userData.directionChangeTime) {
                // Change direction randomly every few seconds
                const randomAngle = Math.random() * Math.PI * 2;
                vampire.userData.currentDirection = new THREE.Vector3(
                    Math.sin(randomAngle),
                    0,
                    Math.cos(randomAngle)
                );
                
                // Set next direction change time (between 3-7 seconds)
                vampire.userData.directionChangeTime = performance.now() + 3000 + Math.random() * 4000;
                
                // Set random movement speed (between 0.01 and 0.03)
                vampire.userData.moveSpeed = 0.01 + Math.random() * 0.02;
            }
            
            // Move vampire in current direction
            if (vampire.userData.currentDirection) {
                vampire.position.x += vampire.userData.currentDirection.x * vampire.userData.moveSpeed;
                vampire.position.z += vampire.userData.currentDirection.z * vampire.userData.moveSpeed;
                
                // Make vampire face movement direction
                vampire.rotation.y = Math.atan2(vampire.userData.currentDirection.x, vampire.userData.currentDirection.z);
            }
            
            // Keep vampires within bounds
            vampire.position.x = Math.max(this.groundBounds.minX, Math.min(this.groundBounds.maxX, vampire.position.x));
            vampire.position.z = Math.max(this.groundBounds.minZ, Math.min(this.groundBounds.maxZ, vampire.position.z));
            
            // Bounce off boundaries
            if (vampire.position.x <= this.groundBounds.minX || vampire.position.x >= this.groundBounds.maxX) {
                vampire.userData.currentDirection.x *= -1;
            }
            if (vampire.position.z <= this.groundBounds.minZ || vampire.position.z >= this.groundBounds.maxZ) {
                vampire.userData.currentDirection.z *= -1;
            }
            
            // Animate vampire limbs
            // Arm animation
            vampire.userData.leftArm.rotation.z = vampire.userData.originalArmRotations.left + 
                Math.sin(vampire.userData.animationTime) * 0.5;
            vampire.userData.rightArm.rotation.z = vampire.userData.originalArmRotations.right - 
                Math.sin(vampire.userData.animationTime) * 0.5;
            
            // Leg animation
            vampire.userData.leftLeg.rotation.x = vampire.userData.originalLegRotations.left + 
                Math.sin(vampire.userData.animationTime) * 0.5;
            vampire.userData.rightLeg.rotation.x = vampire.userData.originalLegRotations.right - 
                Math.sin(vampire.userData.animationTime) * 0.5;
        });
    }

    // FPS counter
    updateFPS() {
        this.frames++;
        const time = performance.now();
        this.frameTime = time - this.lastTime;
        
        if (this.frameTime >= 1000) {
            this.fps = Math.round((this.frames * 1000) / this.frameTime);
            this.frames = 0;
            this.lastTime = time;
            
            // Update FPS display
            if (this.showFPS) {
                this.fpsElement.textContent = `FPS: ${this.fps}`;
                console.log(`FPS: ${this.fps}`);
            } else {
                this.fpsElement.textContent = '';
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update FPS counter
        this.updateFPS();
        
        // Handle movement
        this.handleMovement();
        
        // Update lasers
        this.updateLasers();
        
        this.renderer.render(this.scene, this.camera);
    }

    setupMoneyCats() {
        // Create multiple money cats
        const catCount = 8;
        
        for (let i = 0; i < catCount; i++) {
            const cat = this.createMoneyCat();
            this.scene.add(cat);
            this.gameState.moneyCats.push(cat);
            
            // Position the cat randomly
            this.positionCatRandomly(cat);
        }
    }
    
    positionCatRandomly(cat) {
        // Random position within the map bounds
        const x = Math.random() * 80 - 40; // -40 to 40
        const z = Math.random() * 80 - 40; // -40 to 40
        
        // Ensure cat is not too close to the player
        const distanceToPlayer = Math.sqrt(
            Math.pow(x - this.player.position.x, 2) + 
            Math.pow(z - this.player.position.z, 2)
        );
        
        // If too close to player, reposition
        if (distanceToPlayer < 10) {
            this.positionCatRandomly(cat);
            return;
        }
        
        cat.position.set(x, 0, z);
    }
    
    createMoneyCat() {
        const catGroup = new THREE.Group();
        
        // Materials for the money cat
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black body
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 }); // Yellow eyes
        
        // Body - reduced segments
        const bodyGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        catGroup.add(body);
        
        // Head - reduced segments
        const headGeometry = new THREE.SphereGeometry(0.2, 6, 6);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 0.7;
        catGroup.add(head);
        
        // Ears - reduced segments
        const earGeometry = new THREE.ConeGeometry(0.1, 0.2, 4);
        
        // Left ear
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-0.1, 0.9, 0);
        leftEar.rotation.x = -Math.PI / 2;
        catGroup.add(leftEar);
        
        // Right ear
        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.1, 0.9, 0);
        rightEar.rotation.x = -Math.PI / 2;
        catGroup.add(rightEar);
        
        // Eyes - reduced segments
        const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 0.75, 0.15);
        catGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 0.75, 0.15);
        catGroup.add(rightEye);
        
        // Tail - reduced segments
        const tailGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, 0.3, -0.3);
        tail.rotation.x = Math.PI / 2;
        catGroup.add(tail);
        
        // Store cat data
        catGroup.userData = {
            isSaved: false,
            savedTime: 0,
            originalY: 0.3,
            moveSpeed: 0.03 + Math.random() * 0.02, // Random speed between 0.03 and 0.05
            scaredDistance: 5 + Math.random() * 3, // Random scared distance between 5 and 8
            moneyValue: 5 + Math.floor(Math.random() * 6) // Random money value between 5 and 10
        };
        
        return catGroup;
    }
    
    // Check if player is colliding with a money cat
    checkCatCollision(cat) {
        if (cat.userData.isSaved) return false;
        
        const playerPosition = this.player.position.clone();
        const catPosition = cat.position.clone();
        
        // Simple distance-based collision detection
        const distance = playerPosition.distanceTo(catPosition);
        
        // Collision threshold (adjust as needed)
        return distance < 1.0;
    }
    
    // Save a money cat
    saveMoneyCat(cat) {
        if (cat.userData.isSaved) return;
        
        cat.userData.isSaved = true;
        cat.userData.savedTime = performance.now();
        
        // Add to saved cats array
        this.gameState.savedCats.push(cat);
        
        // Add money points for saving a cat
        this.gameState.moneyPoints += cat.userData.moneyValue;
        this.updateHUD();
        
        console.log(`Cat saved! +${cat.userData.moneyValue} money points`);
        
        // Create light effect
        this.createCatSaveEffect(cat);
    }
    
    // Create light effect for saved cat
    createCatSaveEffect(cat) {
        // Create spotlight
        const spotlight = new THREE.SpotLight(0xFFFF00, 1, 10, Math.PI / 6, 0.5);
        spotlight.position.set(cat.position.x, 10, cat.position.z);
        spotlight.target.position.set(cat.position.x, 0, cat.position.z);
        this.scene.add(spotlight);
        this.scene.add(spotlight.target);
        
        // Store spotlight in cat data
        cat.userData.spotlight = spotlight;
        
        // Create particle effect
        const particleCount = 20;
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position at cat's position
            particle.position.copy(cat.position);
            particle.position.y = 0.5;
            
            // Add random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            
            // Add to scene and particles array
            this.scene.add(particle);
            cat.userData.particles = cat.userData.particles || [];
            cat.userData.particles.push(particle);
        }
    }
    
    // Update saved cats
    updateSavedCats() {
        const currentTime = performance.now();
        
        this.gameState.savedCats.forEach(cat => {
            if (!cat.userData.isSaved) return;
            
            // Calculate time since saved
            const timeSinceSaved = currentTime - cat.userData.savedTime;
            
            // Float upward for 3 seconds
            if (timeSinceSaved < 3000) {
                // Float upward
                cat.position.y = cat.userData.originalY + (timeSinceSaved / 3000) * 5;
                
                // Update spotlight position
                if (cat.userData.spotlight) {
                    cat.userData.spotlight.position.y = 10 + (timeSinceSaved / 3000) * 5;
                    cat.userData.spotlight.target.position.y = cat.position.y;
                }
                
                // Update particles
                if (cat.userData.particles) {
                    cat.userData.particles.forEach(particle => {
                        particle.position.y = cat.position.y + 0.5;
                        particle.velocity.y += 0.01;
                        particle.position.add(particle.velocity);
                    });
                }
            } else if (timeSinceSaved < 5000) {
                // Fade out for 2 seconds
                const fadeOutProgress = (timeSinceSaved - 3000) / 2000;
                
                // Fade out cat
                cat.children.forEach(child => {
                    if (child.material) {
                        child.material.opacity = 1 - fadeOutProgress;
                        child.material.transparent = true;
                    }
                });
                
                // Fade out particles
                if (cat.userData.particles) {
                    cat.userData.particles.forEach(particle => {
                        particle.material.opacity = 1 - fadeOutProgress;
                        particle.material.transparent = true;
                    });
                }
                
                // Fade out spotlight
                if (cat.userData.spotlight) {
                    cat.userData.spotlight.intensity = 1 - fadeOutProgress;
                }
            } else {
                // Remove cat and effects after 5 seconds
                this.scene.remove(cat);
                if (cat.userData.spotlight) {
                    this.scene.remove(cat.userData.spotlight);
                    this.scene.remove(cat.userData.spotlight.target);
                }
                if (cat.userData.particles) {
                    cat.userData.particles.forEach(particle => {
                        this.scene.remove(particle);
                    });
                }
                
                // Remove from saved cats array
                const index = this.gameState.savedCats.indexOf(cat);
                if (index !== -1) {
                    this.gameState.savedCats.splice(index, 1);
                }
                
                // Remove from money cats array
                const catIndex = this.gameState.moneyCats.indexOf(cat);
                if (catIndex !== -1) {
                    this.gameState.moneyCats.splice(catIndex, 1);
                }
                
                // Update HUD
                this.updateHUD();
            }
        });
    }
    
    // Update money cats
    updateMoneyCats() {
        this.gameState.moneyCats.forEach(cat => {
            if (cat.userData.isSaved) return;
            
            // Calculate distance to player
            const distanceToPlayer = cat.position.distanceTo(this.player.position);
            
            // If cat is being called, run toward player
            if (cat.userData.isBeingCalled) {
                // Calculate direction to player
                const direction = new THREE.Vector3();
                direction.subVectors(this.player.position, cat.position);
                direction.y = 0; // Keep on ground
                direction.normalize();
                
                // Move toward player at increased speed
                cat.position.x += direction.x * cat.userData.callSpeed;
                cat.position.z += direction.z * cat.userData.callSpeed;
                
                // Make cat face player
                const angle = Math.atan2(direction.x, direction.z);
                cat.rotation.y = angle;
                
                // Check for collision with player
                if (distanceToPlayer < 1.0) {
                    // Save the cat
                    this.saveMoneyCat(cat);
                    cat.userData.isBeingCalled = false;
                }
                
                // Ensure cat stays within bounds
                cat.position.x = Math.max(this.groundBounds.minX, Math.min(this.groundBounds.maxX, cat.position.x));
                cat.position.z = Math.max(this.groundBounds.minZ, Math.min(this.groundBounds.maxZ, cat.position.z));
            }
            // If player is close, move away (normal behavior)
            else if (distanceToPlayer < cat.userData.scaredDistance) {
                // Calculate direction away from player
                const direction = new THREE.Vector3();
                direction.subVectors(cat.position, this.player.position);
                direction.y = 0; // Keep on ground
                direction.normalize();
                
                // Move away from player
                cat.position.x += direction.x * cat.userData.moveSpeed;
                cat.position.z += direction.z * cat.userData.moveSpeed;
                
                // Make cat face away from player
                const angle = Math.atan2(direction.x, direction.z);
                cat.rotation.y = angle;
                
                // Ensure cat stays within bounds
                cat.position.x = Math.max(this.groundBounds.minX, Math.min(this.groundBounds.maxX, cat.position.x));
                cat.position.z = Math.max(this.groundBounds.minZ, Math.min(this.groundBounds.maxZ, cat.position.z));
            } else {
                // Random movement when not scared
                if (Math.random() < 0.02) {
                    // Change direction occasionally
                    const randomAngle = Math.random() * Math.PI * 2;
                    cat.rotation.y = randomAngle;
                }
                
                // Move in current direction
                cat.position.x += Math.sin(cat.rotation.y) * cat.userData.moveSpeed * 0.5;
                cat.position.z += Math.cos(cat.rotation.y) * cat.userData.moveSpeed * 0.5;
                
                // Ensure cat stays within bounds
                cat.position.x = Math.max(this.groundBounds.minX, Math.min(this.groundBounds.maxX, cat.position.x));
                cat.position.z = Math.max(this.groundBounds.minZ, Math.min(this.groundBounds.maxZ, cat.position.z));
                
                // Bounce off boundaries
                if (cat.position.x <= this.groundBounds.minX || cat.position.x >= this.groundBounds.maxX) {
                    cat.rotation.y = Math.PI - cat.rotation.y;
                }
                if (cat.position.z <= this.groundBounds.minZ || cat.position.z >= this.groundBounds.maxZ) {
                    cat.rotation.y = -cat.rotation.y;
                }
            }
        });
    }

    // Optimize laser attack
    createLaserAttack() {
        // Get active vampires (not exploded)
        const activeVampires = this.gameState.vampires.filter(vampire => !vampire.userData.isExploded);
        
        if (activeVampires.length === 0) return;
        
        // Create a laser for each vampire
        activeVampires.forEach(vampire => {
            // Create laser beam - reduced segments
            const laserGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
            const laserMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xFF00FF, // Magenta color for laser
                transparent: true,
                opacity: 0.8
            });
            
            const laser = new THREE.Mesh(laserGeometry, laserMaterial);
            
            // Position laser at player's position
            laser.position.copy(this.player.position);
            laser.position.y = 1.5; // Position at witch's chest level
            
            // Calculate direction to vampire
            const direction = new THREE.Vector3();
            direction.subVectors(vampire.position, this.player.position);
            direction.y = 0; // Keep laser horizontal
            const distance = direction.length();
            direction.normalize();
            
            // Scale laser to reach vampire
            laser.scale.z = distance;
            
            // Rotate laser to point at vampire
            laser.lookAt(vampire.position);
            laser.rotateX(Math.PI / 2); // Adjust rotation to align with direction
            
            // Add laser to scene and game state
            this.scene.add(laser);
            this.gameState.lasers.push({
                mesh: laser,
                target: vampire,
                startTime: performance.now(),
                duration: 1000, // Laser duration in milliseconds
                isComplete: false,
                distance: distance,
                direction: direction.clone(),
                isTraveling: true,
                travelProgress: 0,
                travelSpeed: 0.05, // Speed of laser travel
                startPosition: this.player.position.clone(),
                endPosition: vampire.position.clone()
            });
            
            // Create laser source effect at witch
            this.createLaserSource(this.player.position);
        });
        
        // Play laser sound or effect
        console.log("LASER ATTACK!");
    }
    
    // Optimize laser source effect
    createLaserSource(position) {
        // Create a glowing sphere at source point - reduced segments
        const sourceGeometry = new THREE.SphereGeometry(0.2, 6, 6);
        const sourceMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFF00FF,
            transparent: true,
            opacity: 0.8
        });
        
        const source = new THREE.Mesh(sourceGeometry, sourceMaterial);
        source.position.copy(position);
        source.position.y = 1.5; // Position at witch's chest level
        
        this.scene.add(source);
        
        // Add to game state for animation
        this.gameState.lasers.push({
            mesh: source,
            startTime: performance.now(),
            duration: 1000, // Source duration in milliseconds
            isSource: true,
            isComplete: false
        });
    }
    
    // Optimize laser impact effect
    createLaserImpact(position) {
        // Create a glowing sphere at impact point - reduced segments
        const impactGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const impactMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFF00FF,
            transparent: true,
            opacity: 0.8
        });
        
        const impact = new THREE.Mesh(impactGeometry, impactMaterial);
        impact.position.copy(position);
        impact.position.y = 1.5; // Position at vampire's chest level
        
        this.scene.add(impact);
        
        // Add to game state for animation
        this.gameState.lasers.push({
            mesh: impact,
            startTime: performance.now(),
            duration: 500, // Impact duration in milliseconds
            isImpact: true,
            isComplete: false
        });
    }
    
    // Update lasers
    updateLasers() {
        const currentTime = performance.now();
        
        // Update each laser
        for (let i = this.gameState.lasers.length - 1; i >= 0; i--) {
            const laser = this.gameState.lasers[i];
            
            // Calculate progress (0 to 1)
            const elapsed = currentTime - laser.startTime;
            const progress = Math.min(elapsed / laser.duration, 1);
            
            if (laser.isImpact) {
                // Animate impact effect
                laser.mesh.scale.set(1 + progress, 1 + progress, 1 + progress);
                laser.mesh.material.opacity = 0.8 * (1 - progress);
                
                // Remove when complete
                if (progress >= 1) {
                    this.scene.remove(laser.mesh);
                    this.gameState.lasers.splice(i, 1);
                }
            } else if (laser.isSource) {
                // Animate source effect
                laser.mesh.scale.set(1 + Math.sin(progress * Math.PI * 4) * 0.2, 
                                    1 + Math.sin(progress * Math.PI * 4) * 0.2, 
                                    1 + Math.sin(progress * Math.PI * 4) * 0.2);
                
                // Remove when complete
                if (progress >= 1) {
                    this.scene.remove(laser.mesh);
                    this.gameState.lasers.splice(i, 1);
                }
            } else {
                // Handle traveling laser effect
                if (laser.isTraveling) {
                    // Update travel progress
                    laser.travelProgress += laser.travelSpeed;
                    
                    if (laser.travelProgress >= 1) {
                        // Laser has reached the target
                        laser.isTraveling = false;
                        
                        // Create impact effect at vampire
                        this.createLaserImpact(laser.endPosition);
                        
                        // Explode the vampire
                        this.createExplosion(laser.target);
                        
                        // Remove laser after a short delay
                        setTimeout(() => {
                            this.scene.remove(laser.mesh);
                            const index = this.gameState.lasers.indexOf(laser);
                            if (index !== -1) {
                                this.gameState.lasers.splice(index, 1);
                            }
                        }, 200);
                    } else {
                        // Update laser position based on travel progress
                        const currentPosition = new THREE.Vector3();
                        currentPosition.lerpVectors(laser.startPosition, laser.endPosition, laser.travelProgress);
                        laser.mesh.position.copy(currentPosition);
                        
                        // Scale laser to reach vampire
                        const currentDistance = laser.startPosition.distanceTo(currentPosition);
                        laser.mesh.scale.z = currentDistance;
                        
                        // Add pulsing effect to laser
                        const pulseScale = 1 + Math.sin(progress * Math.PI * 8) * 0.1;
                        laser.mesh.scale.x = pulseScale;
                        laser.mesh.scale.y = pulseScale;
                    }
                } else {
                    // Animate laser beam
                    laser.mesh.material.opacity = 0.8 * (1 - progress * 0.5);
                    
                    // Add pulsing effect to laser
                    const pulseScale = 1 + Math.sin(progress * Math.PI * 8) * 0.1;
                    laser.mesh.scale.x = pulseScale;
                    laser.mesh.scale.y = pulseScale;
                    
                    // When laser completes, explode the vampire
                    if (progress >= 1 && !laser.isComplete) {
                        laser.isComplete = true;
                        this.createExplosion(laser.target);
                    }
                    
                    // Remove laser after duration
                    if (progress >= 1.2) {
                        this.scene.remove(laser.mesh);
                        this.gameState.lasers.splice(i, 1);
                    }
                }
            }
        }
        
        // Reset laser attack state if all lasers are gone
        if (this.gameState.lasers.length === 0 && this.gameState.isLaserAttacking) {
            this.gameState.isLaserAttacking = false;
        }
    }

    // Call money cats to the player
    callMoneyCats() {
        console.log("Calling all money cats!");
        
        // Create a visual effect at the player's position to indicate the call
        this.createCatCallEffect();
        
        // Set all cats to run toward the player
        this.gameState.moneyCats.forEach(cat => {
            if (!cat.userData.isSaved) {
                cat.userData.isBeingCalled = true;
                cat.userData.callSpeed = 0.1; // Faster speed when being called
            }
        });
        
        // Reset the calling state after a delay
        setTimeout(() => {
            this.gameState.isCallingCats = false;
        }, 5000); // Reset after 5 seconds
    }
    
    // Optimize cat call effect
    createCatCallEffect() {
        // Create a pulsing circle on the ground - reduced segments
        const circleGeometry = new THREE.RingGeometry(0.5, 1, 16);
        const circleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        circle.position.copy(this.player.position);
        circle.position.y = 0.01; // Slightly above ground
        circle.rotation.x = -Math.PI / 2; // Flat on ground
        
        this.scene.add(circle);
        
        // Animate the circle
        const startTime = performance.now();
        const duration = 2000; // 2 seconds
        
        const animateCircle = () => {
            const currentTime = performance.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale and fade out
            const scale = 1 + progress * 3;
            circle.scale.set(scale, scale, scale);
            circle.material.opacity = 0.7 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateCircle);
            } else {
                this.scene.remove(circle);
            }
        };
        
        animateCircle();
        
        // Create a sound wave effect (visual only) - reduced count
        for (let i = 0; i < 2; i++) {
            setTimeout(() => {
                const waveGeometry = new THREE.RingGeometry(0.5, 1, 16);
                const waveMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xFFFF00,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });
                
                const wave = new THREE.Mesh(waveGeometry, waveMaterial);
                wave.position.copy(this.player.position);
                wave.position.y = 0.01; // Slightly above ground
                wave.rotation.x = -Math.PI / 2; // Flat on ground
                
                this.scene.add(wave);
                
                // Animate the wave
                const waveStartTime = performance.now();
                const waveDuration = 2000; // 2 seconds
                
                const animateWave = () => {
                    const waveCurrentTime = performance.now();
                    const waveElapsed = waveCurrentTime - waveStartTime;
                    const waveProgress = Math.min(waveElapsed / waveDuration, 1);
                    
                    // Scale and fade out
                    const waveScale = 1 + waveProgress * 3;
                    wave.scale.set(waveScale, waveScale, waveScale);
                    wave.material.opacity = 0.5 * (1 - waveProgress);
                    
                    if (waveProgress < 1) {
                        requestAnimationFrame(animateWave);
                    } else {
                        this.scene.remove(wave);
                    }
                };
                
                animateWave();
            }, i * 500); // Stagger the waves
        }
    }

    setupDog() {
        // Create a medium-sized brown dog that follows the player
        const dog = this.createDog();
        this.scene.add(dog);
        
        // Store dog data
        this.gameState.dog = {
            mesh: dog,
            targetPosition: new THREE.Vector3(),
            followDistance: 2.0, // Distance to follow behind player
            followSpeed: 0.08, // Speed of the dog
            animationTime: Math.random() * Math.PI * 2 // Random starting phase for animation
        };
        
        // Position the dog behind the player
        this.updateDogPosition();
    }
    
    createDog() {
        const dogGroup = new THREE.Group();
        
        // Materials for the dog
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown body
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black eyes
        const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black nose
        
        // Body - medium size
        const bodyGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        dogGroup.add(body);
        
        // Head
       
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 0.9;
        head.position.z = 0.3;
        dogGroup.add(head);
        
        // Ears
        const earGeometry = new THREE.ConeGeometry(0.15, 0.3, 8);
        
        // Left ear
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-0.15, 1.1, 0.3);
        leftEar.rotation.x = -Math.PI / 2;
        dogGroup.add(leftEar);
        
        // Right ear
        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.15, 1.1, 0.3);
        rightEar.rotation.x = -Math.PI / 2;
        dogGroup.add(rightEar);
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 0.95, 0.5);
        dogGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 0.95, 0.5);
        dogGroup.add(rightEye);
        
        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.9, 0.6);
        dogGroup.add(nose);
        
        // Snout
        const snoutGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.2, 8);
        const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
        snout.position.set(0, 0.9, 0.7);
        snout.rotation.x = Math.PI / 2;
        dogGroup.add(snout);
        
        // Tail
        const tailGeometry = new THREE.CylinderGeometry(0.08, 0.05, 0.6, 8);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, 0.4, -0.4);
        tail.rotation.x = Math.PI / 2;
        dogGroup.add(tail);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
        
        // Front left leg
        const frontLeftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        frontLeftLeg.position.set(-0.2, 0.2, 0.3);
        dogGroup.add(frontLeftLeg);
        
        // Front right leg
        const frontRightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        frontRightLeg.position.set(0.2, 0.2, 0.3);
        dogGroup.add(frontRightLeg);
        
        // Back left leg
        const backLeftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        backLeftLeg.position.set(-0.2, 0.2, -0.3);
        dogGroup.add(backLeftLeg);
        
        // Back right leg
        const backRightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        backRightLeg.position.set(0.2, 0.2, -0.3);
        dogGroup.add(backRightLeg);
        
        // Store dog data
        dogGroup.userData = {
            isDog: true,
            originalY: 0.4,
            animationTime: 0,
            legs: {
                frontLeft: frontLeftLeg,
                frontRight: frontRightLeg,
                backLeft: backLeftLeg,
                backRight: backRightLeg
            },
            tail: tail
        };
        
        return dogGroup;
    }
    
    updateDogPosition() {
        if (!this.gameState.dog) return;
        
        // Calculate target position behind the player
        const playerDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.quaternion);
        const targetPosition = new THREE.Vector3();
        
        // Position behind the player based on follow distance
        targetPosition.copy(this.player.position).sub(playerDirection.multiplyScalar(this.gameState.dog.followDistance));
        targetPosition.y = 0; // Keep on ground
        
        // Store target position
        this.gameState.dog.targetPosition.copy(targetPosition);
    }
    
    updateDog() {
        if (!this.gameState.dog) return;
        
        // Update animation time
        this.gameState.dog.animationTime += 0.05;
        
        // Calculate current position
        const currentPosition = this.gameState.dog.mesh.position;
        
        // Check if player is in attack mode
        const isPlayerAttacking = this.gameState.isAttacking;
        
        // Add bobbing animation - more intense when player is attacking
        const bobIntensity = isPlayerAttacking ? 0.15 : 0.05;
        this.gameState.dog.mesh.position.y = this.gameState.dog.mesh.userData.originalY + 
            Math.sin(this.gameState.dog.animationTime) * bobIntensity;
        
        // Add tail wagging animation - faster and more intense when player is attacking
        if (this.gameState.dog.mesh.userData.tail) {
            const tailWagSpeed = isPlayerAttacking ? 4 : 2;
            const tailWagIntensity = isPlayerAttacking ? 0.6 : 0.3;
            this.gameState.dog.mesh.userData.tail.rotation.z = Math.sin(this.gameState.dog.animationTime * tailWagSpeed) * tailWagIntensity;
        }
        
        // Add leg animation - more energetic when player is attacking
        if (this.gameState.dog.mesh.userData.legs) {
            const legs = this.gameState.dog.mesh.userData.legs;
            const animationTime = this.gameState.dog.animationTime;
            const legSpeed = isPlayerAttacking ? 3 : 2;
            const legIntensity = isPlayerAttacking ? 0.5 : 0.3;
            
            // Front legs
            legs.frontLeft.rotation.x = Math.sin(animationTime * legSpeed) * legIntensity;
            legs.frontRight.rotation.x = -Math.sin(animationTime * legSpeed) * legIntensity;
            
            // Back legs
            legs.backLeft.rotation.x = Math.sin(animationTime * legSpeed) * legIntensity;
            legs.backRight.rotation.x = -Math.sin(animationTime * legSpeed) * legIntensity;
        }
        
        // Add crazy behavior when player is attacking
        if (isPlayerAttacking) {
            // Find the nearest vampire
            let nearestVampire = null;
            let nearestDistance = Infinity;
            
            this.gameState.vampires.forEach(vampire => {
                if (vampire.userData.isExploded) return;
                
                const distance = vampire.position.distanceTo(currentPosition);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestVampire = vampire;
                }
            });
            
            // If there's a vampire nearby, attack it
            if (nearestVampire && nearestDistance < 20) {
                // Calculate direction to vampire
                const direction = new THREE.Vector3();
                direction.subVectors(nearestVampire.position, currentPosition);
                direction.y = 0; // Keep on ground
                
                // Normalize direction
                if (direction.length() > 0) {
                    direction.normalize();
                    
                    // Move toward vampire at increased speed
                    const attackSpeed = this.gameState.dog.followSpeed * 2.5;
                    currentPosition.add(direction.multiplyScalar(attackSpeed));
                    
                    // Make dog face vampire
                    this.gameState.dog.mesh.rotation.y = Math.atan2(direction.x, direction.z);
                    
                    // Check for collision with vampire
                    if (nearestDistance < 1.5) {
                        // Explode the vampire
                        this.createExplosion(nearestVampire);
                        
                        // Add a small delay before attacking another vampire
                        this.gameState.dog.lastAttackTime = performance.now();
                        
                        // Add barking animation
                        this.gameState.dog.mesh.rotation.z = Math.sin(this.gameState.dog.animationTime * 10) * 0.2;
                    }
                }
            } else {
                // If no vampires nearby, run in circles around the player
                const circleRadius = 3.0;
                const circleSpeed = 0.1;
                const circleAngle = this.gameState.dog.animationTime * circleSpeed;
                
                // Calculate position in a circle around the player
                const circleX = this.player.position.x + Math.cos(circleAngle) * circleRadius;
                const circleZ = this.player.position.z + Math.sin(circleAngle) * circleRadius;
                
                // Move dog toward the circle position
                const circleDirection = new THREE.Vector3(circleX, 0, circleZ);
                circleDirection.sub(currentPosition);
                
                if (circleDirection.length() > 0.1) {
                    circleDirection.normalize();
                    circleDirection.multiplyScalar(this.gameState.dog.followSpeed * 2); // Double speed when crazy
                    
                    // Apply movement
                    currentPosition.add(circleDirection);
                    
                    // Make dog face movement direction
                    this.gameState.dog.mesh.rotation.y = Math.atan2(circleDirection.x, circleDirection.z);
                }
                
                // Add occasional barking animation (head tilt)
                if (Math.sin(this.gameState.dog.animationTime * 5) > 0.8) {
                    this.gameState.dog.mesh.rotation.z = Math.sin(this.gameState.dog.animationTime * 10) * 0.2;
                } else {
                    this.gameState.dog.mesh.rotation.z = 0;
                }
            }
        } else {
            // Normal following behavior when not attacking
            // Move toward target position
            const direction = new THREE.Vector3();
            direction.subVectors(this.gameState.dog.targetPosition, currentPosition);
            
            // Only move if not close enough to target
            if (direction.length() > 0.1) {
                direction.normalize();
                direction.multiplyScalar(this.gameState.dog.followSpeed);
                
                // Apply movement
                currentPosition.add(direction);
                
                // Make dog face movement direction
                if (direction.length() > 0.01) {
                    this.gameState.dog.mesh.rotation.y = Math.atan2(direction.x, direction.z);
                }
            }
        }
    }
}