/**
 * Zelda-like 3D Game Engine
 * A simple 3D game engine inspired by The Legend of Zelda: Ocarina of Time
 * Built with Three.js
 */

class ZeldaLikeEngine {
    constructor(containerId) {
        // Engine properties
        this.container = document.getElementById(containerId);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.loadingScreen = document.querySelector('.loading-screen');
        this.loadingBar = document.getElementById('loading-bar');

        // Game state
        this.player = null;
        this.playerHealth = 3;
        this.maxHealth = 3;
        this.enemies = [];
        this.interactables = [];
        this.targetLocked = false;
        this.currentTarget = null;
        this.reticle = document.getElementById('target-reticle');

        // Setup
        this.setupThree();
        this.setupControls();
        this.setupLighting();
        this.setupWorld();
        this.createHealthUI();

        // Create day/night cycle
        this.setupDayNightCycle();

        // Initialize camera rotation
        if (this.mouseControls) {
            this.mouseControls.cameraRotation.y = Math.PI; // Start camera behind player
        }

        // Start the engine
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    // Setup Three.js
    setupThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Create camera
        this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.1, 1000);
        this.camera.position.set(0, 1.6, 5); // Eye level

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Create clock for animations
        this.clock = new THREE.Clock();
    }

    // Setup player controls
    setupControls() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            interact: false,
            targetLock: false
        };

        // Mouse control variables
        this.mouseControls = {
            isActive: false,
            sensitivity: 0.002,
            lastX: 0,
            lastY: 0,
            cameraRotation: new THREE.Euler(0, 0, 0, 'YXZ'),
            orbitDistance: 5,
            minPolarAngle: 0.1, // Radians - Prevent looking too far up
            maxPolarAngle: Math.PI / 1.8 // Radians - Prevent looking too far down
        };

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch (e.key.toLowerCase()) {
                case 'w': this.keys.forward = true; break;
                case 's': this.keys.backward = true; break;
                case 'a': this.keys.left = true; break;
                case 'd': this.keys.right = true; break;
                case ' ': this.keys.jump = true; break;
                case 'e': this.keys.interact = true; this.checkInteraction(); break;
                case 'f': this.toggleTargetLock(); break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.key.toLowerCase()) {
                case 'w': this.keys.forward = false; break;
                case 's': this.keys.backward = false; break;
                case 'a': this.keys.left = false; break;
                case 'd': this.keys.right = false; break;
                case ' ': this.keys.jump = false; break;
                case 'e': this.keys.interact = false; break;
            }
        });

        // Mouse controls for camera
        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                if (!this.mouseControls.isActive) {
                    this.playerAttack();
                }
            } else if (e.button === 2) { // Right click
                this.mouseControls.isActive = true;
                this.mouseControls.lastX = e.clientX;
                this.mouseControls.lastY = e.clientY;
                this.container.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) { // Right click
                this.mouseControls.isActive = false;
                this.container.style.cursor = 'default';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.mouseControls.isActive && !this.targetLocked) {
                // Calculate mouse movement
                const deltaX = e.clientX - this.mouseControls.lastX;
                const deltaY = e.clientY - this.mouseControls.lastY;
                this.mouseControls.lastX = e.clientX;
                this.mouseControls.lastY = e.clientY;

                // Update camera rotation based on mouse movement
                this.mouseControls.cameraRotation.y -= deltaX * this.mouseControls.sensitivity;
                this.mouseControls.cameraRotation.x -= deltaY * this.mouseControls.sensitivity;

                // Limit vertical rotation to prevent camera flipping
                this.mouseControls.cameraRotation.x = Math.max(
                    this.mouseControls.minPolarAngle,
                    Math.min(this.mouseControls.maxPolarAngle, this.mouseControls.cameraRotation.x)
                );
            }
        });

        // Prevent context menu on right-click
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Mouse wheel to adjust camera distance
        this.container.addEventListener('wheel', (e) => {
            if (!this.targetLocked) {
                // Adjust camera distance with mouse wheel
                this.mouseControls.orbitDistance += e.deltaY * 0.01;

                // Limit zoom range
                this.mouseControls.orbitDistance = Math.max(2, Math.min(10, this.mouseControls.orbitDistance));
            }
        });
    }

    // Setup lighting
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this.scene.add(ambientLight);

        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffcc, 0.8);
        this.sunLight.position.set(10, 30, 10);
        this.sunLight.castShadow = true;

        // Configure shadow
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -20;
        this.sunLight.shadow.camera.right = 20;
        this.sunLight.shadow.camera.top = 20;
        this.sunLight.shadow.camera.bottom = -20;

        this.scene.add(this.sunLight);
    }

    // Setup day/night cycle
    setupDayNightCycle() {
        this.dayTime = 0; // 0 to 1, where 0 is dawn, 0.25 is noon, 0.5 is dusk, 0.75 is midnight
        this.dayLength = 120; // seconds for a full day/night cycle

        // Create moon
        const moonGeometry = new THREE.SphereGeometry(5, 16, 16);
        const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xfffacd });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.moon);
    }

    // Update day/night cycle
    updateDayNightCycle(deltaTime) {
        // Update day time
        this.dayTime += deltaTime / this.dayLength;
        if (this.dayTime >= 1) {
            this.dayTime -= 1;
        }

        // Update sun position (circular path)
        const sunAngle = this.dayTime * Math.PI * 2;
        const sunDistance = 100;
        this.sunLight.position.x = Math.cos(sunAngle) * sunDistance;
        this.sunLight.position.y = Math.sin(sunAngle) * sunDistance;
        this.sunLight.position.z = 0;

        // Update moon position (opposite to sun)
        this.moon.position.copy(this.sunLight.position).multiplyScalar(-1);

        // Adjust light intensity based on time of day
        const dayIntensity = Math.sin(this.dayTime * Math.PI * 2);
        this.sunLight.intensity = Math.max(0, dayIntensity) * 0.8 + 0.2;

        // Change sky color based on time of day
        const nightColor = new THREE.Color(0x001133);
        const dayColor = new THREE.Color(0x87CEEB);
        const currentColor = new THREE.Color();

        if (dayIntensity > 0) {
            // Day to night
            currentColor.lerpColors(nightColor, dayColor, dayIntensity);
        } else {
            // Night
            currentColor.copy(nightColor);
        }

        this.scene.background = currentColor;
    }

    // Setup the game world
    setupWorld() {
        this.updateLoadingProgress(5);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x567d46,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.updateLoadingProgress(15);

        // Create player
        this.createPlayer();

        this.updateLoadingProgress(30);

        // Create some trees
        this.createTree(5, 0, 15);
        this.createTree(-8, 0, 12);
        this.createTree(12, 0, 20);
        this.createTree(-15, 0, 18);
        this.createTree(0, 0, 25);

        this.updateLoadingProgress(50);

        // Create a house
        this.createHouse(-20, 0, 15);

        this.updateLoadingProgress(65);

        // Create water
        this.createWater(15, -0.5, -15);

        this.updateLoadingProgress(75);

        // Create enemies
        this.createEnemy(10, 0, 10);
        this.createEnemy(-10, 0, -10);

        this.updateLoadingProgress(85);

        // Create collectible
        this.createCollectible(5, 0.5, -5);

        this.updateLoadingProgress(95);

        // Create sign
        this.createSign(3, 0, 3);

        this.updateLoadingProgress(100);

        // Hide loading screen
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
        }, 500);
    }

    // Update loading progress
    updateLoadingProgress(percent) {
        this.loadingBar.style.width = `${percent}%`;
    }

    // Create player character
    createPlayer() {
        // Player body
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
        this.player = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.player.position.y = 0.5;
        this.player.castShadow = true;
        this.scene.add(this.player);

        // Player head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.7;
        head.castShadow = true;
        this.player.add(head);

        // Player cap
        const capGeometry = new THREE.ConeGeometry(0.27, 0.5, 16);
        const capMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 0.4;
        cap.castShadow = true;
        head.add(cap);

        // Player sword
        const swordGeometry = new THREE.BoxGeometry(0.05, 0.6, 0.05);
        const swordMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        this.sword = new THREE.Mesh(swordGeometry, swordMaterial);
        this.sword.position.set(0.3, 0, -0.2);
        this.sword.rotation.z = Math.PI / 12;
        this.player.add(this.sword);

        // Sword handle
        const handleGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.08);
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.35;
        this.sword.add(handle);

        // Player shield
        const shieldGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.4);
        const shieldMaterial = new THREE.MeshStandardMaterial({ color: 0x0000aa });
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.position.set(-0.3, 0, -0.1);
        this.player.add(shield);

        // Player properties
        this.player.velocity = new THREE.Vector3(0, 0, 0);
        this.player.onGround = true;
        this.player.speed = 5;
        this.player.turnSpeed = 2;
        this.player.jumpHeight = 5;
        this.player.isAttacking = false;

        // Camera target (slightly above player's head)
        this.cameraTarget = new THREE.Object3D();
        this.cameraTarget.position.y = 2;
        this.player.add(this.cameraTarget);

        // Third-person camera setup
        this.cameraOffset = new THREE.Vector3(0, 1.5, 3);
        this.cameraLookOffset = new THREE.Vector3(0, 0.5, 0);
        this.cameraIdealPosition = new THREE.Vector3();

        return this.player;
    }

    // Create enemy
    createEnemy(x, y, z) {
        const enemyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemy.position.set(x, y + 0.5, z);
        enemy.castShadow = true;

        // Enemy eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0.15, -0.35);
        enemy.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.15, -0.35);
        enemy.add(rightEye);

        // Pupil
        const pupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.z = -0.05;
        leftEye.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.z = -0.05;
        rightEye.add(rightPupil);

        // Enemy properties
        enemy.health = 2;
        enemy.speed = 2;
        enemy.attackRange = 1.5;
        enemy.type = 'enemy';
        enemy.maxDetectionRange = 10;
        enemy.aggro = false;
        enemy.lastAttackTime = 0;
        enemy.attackCooldown = 2; // seconds

        this.scene.add(enemy);
        this.enemies.push(enemy);

        return enemy;
    }

    // Create a tree
    createTree(x, y, z) {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, y, z);

        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Tree leaves
        const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 4;
        leaves.castShadow = true;
        treeGroup.add(leaves);

        this.scene.add(treeGroup);

        return treeGroup;
    }

    // Create a house
    createHouse(x, y, z) {
        const houseGroup = new THREE.Group();
        houseGroup.position.set(x, y, z);

        // House base
        const baseGeometry = new THREE.BoxGeometry(6, 3, 5);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 1.5;
        base.castShadow = true;
        base.receiveShadow = true;
        houseGroup.add(base);

        // House roof
        const roofGeometry = new THREE.ConeGeometry(4, 2, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 4;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);

        // Door
        const doorGeometry = new THREE.PlaneGeometry(1, 2);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            side: THREE.DoubleSide
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 0.5, 2.51);
        houseGroup.add(door);

        // Windows
        const windowGeometry = new THREE.PlaneGeometry(1, 1);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0xADD8E6,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });

        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(-1.5, 1.5, 2.51);
        houseGroup.add(window1);

        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(1.5, 1.5, 2.51);
        houseGroup.add(window2);

        // Make the house interactable
        const interactBox = new THREE.Box3().setFromObject(door);
        interactBox.expandByScalar(1);
        this.interactables.push({
            object: door,
            box: interactBox,
            type: 'door',
            action: () => {
                alert('You entered the house!');
            }
        });

        this.scene.add(houseGroup);

        return houseGroup;
    }

    // Create water
    createWater(x, y, z) {
        const waterGeometry = new THREE.BoxGeometry(20, 0.5, 20);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x1E90FF,
            transparent: true,
            opacity: 0.7
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.position.set(x, y, z);
        this.scene.add(water);

        return water;
    }

    // Create collectible
    createCollectible(x, y, z) {
        const collectibleGroup = new THREE.Group();
        collectibleGroup.position.set(x, y, z);

        // Collectible base (heart container)
        const heartGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const heartMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        const heart = new THREE.Mesh(heartGeometry, heartMaterial);
        heart.castShadow = true;

        // Make it float and rotate
        heart.userData.originalY = y;
        heart.userData.rotationSpeed = 0.02;
        heart.userData.floatSpeed = 0.5;
        heart.userData.floatHeight = 0.2;
        heart.userData.time = 0;

        collectibleGroup.add(heart);
        this.scene.add(collectibleGroup);

        // Make it interactable
        const interactBox = new THREE.Box3().setFromObject(heart);
        interactBox.expandByScalar(1);
        this.interactables.push({
            object: heart,
            box: interactBox,
            type: 'collectible',
            action: () => {
                if (this.playerHealth < this.maxHealth) {
                    this.playerHealth++;
                    this.updateHealthUI();
                    this.scene.remove(collectibleGroup);

                    // Remove from interactables
                    const index = this.interactables.findIndex(i => i.object === heart);
                    if (index > -1) {
                        this.interactables.splice(index, 1);
                    }
                }
            }
        });

        return collectibleGroup;
    }

    // Create sign
    createSign(x, y, z) {
        const signGroup = new THREE.Group();
        signGroup.position.set(x, y, z);

        // Sign post
        const postGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 0.5;
        post.castShadow = true;
        signGroup.add(post);

        // Sign board
        const boardGeometry = new THREE.BoxGeometry(1, 0.7, 0.1);
        const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.y = 1;
        board.castShadow = true;
        signGroup.add(board);

        this.scene.add(signGroup);

        // Make it interactable
        const interactBox = new THREE.Box3().setFromObject(board);
        interactBox.expandByScalar(0.5);
        this.interactables.push({
            object: board,
            box: interactBox,
            type: 'sign',
            action: () => {
                alert('Welcome to Hyrule Field! Watch out for enemies!');
            }
        });

        return signGroup;
    }

    // Create health UI
    createHealthUI() {
        const healthContainer = document.getElementById('health-container');
        healthContainer.innerHTML = '';

        for (let i = 0; i < this.maxHealth; i++) {
            const heart = document.createElement('div');
            heart.className = i < this.playerHealth ? 'heart' : 'heart empty';
            healthContainer.appendChild(heart);
        }
    }

    // Update health UI
    updateHealthUI() {
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index < this.playerHealth) {
                heart.classList.remove('empty');
            } else {
                heart.classList.add('empty');
            }
        });
    }

    // Player attack
    playerAttack() {
        if (this.player.isAttacking) return;

        this.player.isAttacking = true;

        // Sword swing animation
        const initialRotation = this.sword.rotation.z;
        const swingAnimation = { value: initialRotation };

        // Detect hits on enemies
        this.enemies.forEach(enemy => {
            if (this.targetLocked && this.currentTarget === enemy) {
                // Face the enemy
                this.player.lookAt(enemy.position);
            }

            const distanceToEnemy = this.player.position.distanceTo(enemy.position);
            if (distanceToEnemy < 2) {
                // Damage enemy
                enemy.health -= 1;

                // Enemy knockback
                const knockbackDirection = new THREE.Vector3()
                    .subVectors(enemy.position, this.player.position)
                    .normalize()
                    .multiplyScalar(1);

                enemy.position.add(knockbackDirection);

                // Check if enemy is defeated
                if (enemy.health <= 0) {
                    this.scene.remove(enemy);

                    // Remove from enemies array
                    const index = this.enemies.indexOf(enemy);
                    if (index > -1) {
                        this.enemies.splice(index, 1);
                    }

                    // Remove as target if targeted
                    if (this.currentTarget === enemy) {
                        this.currentTarget = null;
                        this.targetLocked = false;
                        this.reticle.style.display = 'none';
                    }
                }
            }
        });

        // Reset after animation
        setTimeout(() => {
            this.player.isAttacking = false;
            this.sword.rotation.z = initialRotation;
        }, 500);
    }

    // Check for interaction
    checkInteraction() {
        if (!this.keys.interact) return;

        const playerBox = new THREE.Box3().setFromObject(this.player);

        this.interactables.forEach(interactable => {
            if (playerBox.intersectsBox(interactable.box)) {
                interactable.action();
            }
        });
    }

    // Toggle target lock
    toggleTargetLock() {
        if (this.enemies.length === 0) return;

        if (!this.targetLocked) {
            // Find closest enemy
            let closestEnemy = null;
            let closestDistance = Infinity;

            this.enemies.forEach(enemy => {
                const distance = this.player.position.distanceTo(enemy.position);
                if (distance < closestDistance && distance < 15) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            });

            if (closestEnemy) {
                this.currentTarget = closestEnemy;
                this.targetLocked = true;
                this.reticle.style.display = 'block';
            }
        } else {
            this.targetLocked = false;
            this.currentTarget = null;
            this.reticle.style.display = 'none';
        }
    }

    // Update target reticle position
    updateTargetReticle() {
        if (!this.targetLocked || !this.currentTarget) return;

        const vector = new THREE.Vector3();
        const widthHalf = this.width / 2;
        const heightHalf = this.height / 2;

        this.currentTarget.updateMatrixWorld();
        vector.setFromMatrixPosition(this.currentTarget.matrixWorld);
        vector.project(this.camera);

        vector.x = (vector.x * widthHalf) + widthHalf;
        vector.y = -(vector.y * heightHalf) + heightHalf;

        this.reticle.style.left = `${vector.x}px`;
        this.reticle.style.top = `${vector.y}px`;

        // Hide reticle if target is behind camera
        if (vector.z > 1) {
            this.reticle.style.display = 'none';
        } else {
            this.reticle.style.display = 'block';
        }
    }

    // Update enemies
    updateEnemies(deltaTime) {
        this.enemies.forEach(enemy => {
            // Get distance to player
            const distanceToPlayer = enemy.position.distanceTo(this.player.position);

            // Enemy AI behavior
            if (distanceToPlayer < enemy.maxDetectionRange) {
                enemy.aggro = true;

                // Move towards player if not in attack range
                if (distanceToPlayer > enemy.attackRange) {
                    const direction = new THREE.Vector3()
                        .subVectors(this.player.position, enemy.position)
                        .normalize();
                    direction.y = 0;

                    const movement = direction.multiplyScalar(enemy.speed * deltaTime);
                    enemy.position.add(movement);

                    // Face the player
                    const lookPos = new THREE.Vector3(
                        this.player.position.x,
                        enemy.position.y,
                        this.player.position.z
                    );
                    enemy.lookAt(lookPos);
                } else {
                    // Attack player if in range and cooldown is over
                    const currentTime = this.clock.getElapsedTime();
                    if (currentTime - enemy.lastAttackTime > enemy.attackCooldown) {
                        this.playerTakeDamage(1);
                        enemy.lastAttackTime = currentTime;
                    }
                }
            } else {
                enemy.aggro = false;
            }

            // Update enemy eyes to look at player
            if (enemy.aggro) {
                enemy.children.forEach(child => {
                    if (child.children.length > 0) {
                        child.lookAt(this.player.position);
                    }
                });
            }
        });
    }

    // Handle player damage
    playerTakeDamage(amount) {
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.updateHealthUI();

        // Player knockback
        const knockbackDirection = new THREE.Vector3()
            .subVectors(this.player.position, this.currentTarget ? this.currentTarget.position : this.camera.position)
            .normalize()
            .multiplyScalar(2);
        knockbackDirection.y = 1;
        this.player.position.add(knockbackDirection);

        // Death
        if (this.playerHealth <= 0) {
            alert('Game Over! Refresh to restart.');
        }
    }

    // Update collectibles
    updateCollectibles(deltaTime) {
        this.interactables.forEach(interactable => {
            if (interactable.type === 'collectible') {
                const collectible = interactable.object;

                // Update float animation
                collectible.userData.time += deltaTime;
                collectible.position.y = collectible.userData.originalY +
                    Math.sin(collectible.userData.time * collectible.userData.floatSpeed) *
                    collectible.userData.floatHeight;

                // Update rotation
                collectible.rotation.y += collectible.userData.rotationSpeed;
            }
        });
    }

    // THIS IS THE FIRST MISSING METHOD: Update player movement and physics
    updatePlayer(deltaTime) {
        if (!this.player) return;

        // Handle player movement
        const playerDirection = new THREE.Vector3(0, 0, 0);

        // Calculate forward direction based on camera orientation when not target locked
        let forward = new THREE.Vector3(0, 0, -1);
        let right = new THREE.Vector3(1, 0, 0);

        if (!this.targetLocked) {
            // Apply the camera's Y rotation to the movement directions
            forward.applyEuler(new THREE.Euler(0, this.mouseControls.cameraRotation.y, 0));
            right.applyEuler(new THREE.Euler(0, this.mouseControls.cameraRotation.y, 0));
        } else if (this.currentTarget) {
            // When target locked, forward is toward the target
            forward.subVectors(this.currentTarget.position, this.player.position).normalize();
            forward.y = 0;
            // Right is perpendicular to forward
            right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        }

        // Apply movement based on keys
        if (this.keys.forward) playerDirection.add(forward);
        if (this.keys.backward) playerDirection.sub(forward);
        if (this.keys.right) playerDirection.add(right);
        if (this.keys.left) playerDirection.sub(right);

        // Normalize movement vector
        if (playerDirection.length() > 0) {
            playerDirection.normalize();

            // Apply player speed
            playerDirection.multiplyScalar(this.player.speed * deltaTime);

            // Update player position
            this.player.position.add(playerDirection);

            // Rotate player to face movement direction if not target locked
            if (!this.targetLocked) {
                const lookAt = new THREE.Vector3();
                lookAt.copy(this.player.position).add(playerDirection);
                this.player.lookAt(lookAt);
            }
        }

        // Handle jumping
        if (this.keys.jump && this.player.onGround) {
            this.player.velocity.y = this.player.jumpHeight;
            this.player.onGround = false;
        }

        // Apply gravity
        if (!this.player.onGround) {
            this.player.velocity.y -= 9.8 * deltaTime;
            this.player.position.y += this.player.velocity.y * deltaTime;

            // Check ground collision
            if (this.player.position.y <= 0.5) {
                this.player.position.y = 0.5;
                this.player.velocity.y = 0;
                this.player.onGround = true;
            }
        }
    }

    // THIS IS THE SECOND MISSING METHOD: Update camera position
    updateCamera(deltaTime) {
        if (!this.player) return;

        if (this.targetLocked && this.currentTarget) {
            // Target lock camera: position behind player looking at target
            const playerToTarget = new THREE.Vector3();
            playerToTarget.subVectors(this.currentTarget.position, this.player.position).normalize();

            // Calculate position behind player
            const cameraPos = new THREE.Vector3();
            cameraPos.copy(this.player.position);
            cameraPos.sub(playerToTarget.multiplyScalar(this.mouseControls.orbitDistance));
            cameraPos.y += this.cameraOffset.y;

            // Smoothly move camera
            this.camera.position.lerp(cameraPos, 5 * deltaTime);

            // Look at midpoint between player and target
            const lookTarget = new THREE.Vector3();
            lookTarget.addVectors(this.player.position, this.currentTarget.position).multiplyScalar(0.5);
            this.camera.lookAt(lookTarget);
        } else {
            // Standard third-person camera
            // Calculate camera position based on orbit distance and rotation
            const cameraPos = new THREE.Vector3();

            // Convert spherical coordinates to Cartesian
            cameraPos.x = Math.sin(this.mouseControls.cameraRotation.y) * Math.cos(this.mouseControls.cameraRotation.x) * this.mouseControls.orbitDistance;
            cameraPos.y = Math.sin(this.mouseControls.cameraRotation.x) * this.mouseControls.orbitDistance + this.cameraOffset.y;
            cameraPos.z = Math.cos(this.mouseControls.cameraRotation.y) * Math.cos(this.mouseControls.cameraRotation.x) * this.mouseControls.orbitDistance;

            // Add to player position
            cameraPos.add(this.player.position);

            // Smoothly move camera
            this.camera.position.lerp(cameraPos, 5 * deltaTime);

            // Look at player
            const lookTarget = new THREE.Vector3();
            lookTarget.copy(this.player.position).add(this.cameraLookOffset);
            this.camera.lookAt(lookTarget);
        }

        // Simple camera collision detection (optional enhancement)
        // Prevent camera from going through solid objects
        const rayStart = new THREE.Vector3();
        rayStart.copy(this.player.position);
        rayStart.y += 1; // Eye level

        const rayDirection = new THREE.Vector3();
        rayDirection.subVectors(this.camera.position, rayStart).normalize();

        const raycaster = new THREE.Raycaster(rayStart, rayDirection);
        const intersects = raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const collision = intersects[0];
            const distanceToObstacle = collision.distance;

            // If camera would be inside an object, adjust its position
            if (distanceToObstacle < this.player.position.distanceTo(this.camera.position)) {
                // Place camera at collision point, slightly in front
                const adjustedPosition = new THREE.Vector3();
                adjustedPosition.copy(rayStart).add(rayDirection.multiplyScalar(distanceToObstacle * 0.9));
                this.camera.position.copy(adjustedPosition);
            }
        }
    }

    // Handle window resize
    onWindowResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    // Animation loop
    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // Update day/night cycle
        this.updateDayNightCycle(deltaTime);

        // Update player
        this.updatePlayer(deltaTime);

        // Update camera
        this.updateCamera(deltaTime);

        // Update enemies
        this.updateEnemies(deltaTime);

        // Update collectibles
        this.updateCollectibles(deltaTime);

        // Update target reticle
        this.updateTargetReticle();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Make the engine class available globally
window.ZeldaLikeEngine = ZeldaLikeEngine;