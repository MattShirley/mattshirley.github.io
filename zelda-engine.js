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
        this.collidables = []; // NEW: Array to track objects the player can collide with
        this.targetLocked = false;
        this.currentTarget = null;
        this.reticle = document.getElementById('target-reticle');
        
        // Debug mode - set to true to visualize collisions
        this.debugMode = true;
        this.debugObjects = [];

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
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ENHANCED: Better shadows
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
            targetLock: false,
            reset: false
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

        // Helper method to toggle debug visuals
        this.toggleDebugVisuals = () => {
            this.debugObjects.forEach(obj => {
                obj.visible = this.debugMode;
            });
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
                case 'r': this.resetPlayerPosition(); break;  // Add emergency reset
                
                // Add debug toggle
                case '0': 
                    this.debugMode = !this.debugMode; 
                    console.log("Debug mode:", this.debugMode);
                    this.toggleDebugVisuals();
                    break;
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
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.3);
        this.scene.add(ambientLight);

        // ENHANCED: Add hemisphere light for better environmental lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x567d46, 0.3);
        this.scene.add(hemisphereLight);

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
        this.sunLight.shadow.bias = -0.0005; // ENHANCED: Reduce shadow acne

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
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 40, 40); // ENHANCED: More segments for detail

        // ENHANCED: Add slight terrain variation
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];

            // Keep the center area flat for gameplay
            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter > 10) {
                // Add subtle elevation
                vertices[i + 1] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
            }
        }

        // Update normals for proper lighting
        groundGeometry.computeVertexNormals();

        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x567d46,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.3; // Lower the ground to avoid collision with player
        ground.receiveShadow = true;
        this.scene.add(ground);

        // ENHANCED: Add grid for better orientation
        const gridHelper = new THREE.GridHelper(100, 20, 0x000000, 0x333333);
        gridHelper.position.y = 0.5; // Raised grid to match player's ground level
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

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

        this.updateLoadingProgress(90);

        // Create sign
        this.createSign(3, 0, 3);

        // ENHANCED: Add environmental details
        this.createEnvironmentalDetails();

        this.updateLoadingProgress(100);

        // Hide loading screen
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
        }, 500);
    }

    // ENHANCED: Create environmental details
    createEnvironmentalDetails() {
        // Create rocks
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            const size = 0.2 + Math.random() * 0.3;

            // Skip if too close to center (player start)
            if (Math.sqrt(x*x + z*z) < 5) continue;

            this.createRock(x, 0, z, size);
        }

        // Create grass patches
        for (let i = 0; i < 50; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;

            // Skip if too close to center
            if (Math.sqrt(x*x + z*z) < 5) continue;

            this.createGrassPatch(x, 0, z);
        }

        // Create a path
        this.createPath();
    }

    // ENHANCED: Create a rock
    createRock(x, y, z, size) {
        const rockGeometry = new THREE.DodecahedronGeometry(size, 1);
        const grayValue = 0.4 + Math.random() * 0.2;
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(grayValue, grayValue, grayValue),
            roughness: 0.9,
            metalness: 0.1
        });

        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(x, y + size/2, z);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        rock.castShadow = true;
        rock.receiveShadow = true;

        this.scene.add(rock);

        // Add collision for rocks
        // Using a slightly smaller collision radius to allow player to step over small rocks
        const collisionRadius = size > 0.25 ? size * 0.8 : 0;
        
        if (collisionRadius > 0) {
            const collisionData = {
                object: rock,
                type: 'rock',
                position: new THREE.Vector3(x, y, z), // Add explicit position
                radius: collisionRadius
            };
            
            this.collidables.push(collisionData);
            
            // Add visual debug if debug mode is on
            if (this.debugMode) {
                const debugGeometry = new THREE.SphereGeometry(collisionRadius, 16, 16);
                const debugMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    wireframe: true, 
                    transparent: true,
                    opacity: 0.5
                });
                const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
                debugMesh.position.copy(rock.position);
                this.scene.add(debugMesh);
                this.debugObjects.push(debugMesh);
            }
        }

        return rock;
    }

    // ENHANCED: Create grass patch
    createGrassPatch(x, y, z) {
        const patchGroup = new THREE.Group();
        patchGroup.position.set(x, y, z);

        const bladeCount = 5 + Math.floor(Math.random() * 7);

        for (let i = 0; i < bladeCount; i++) {
            const height = 0.2 + Math.random() * 0.3;
            const width = 0.05 + Math.random() * 0.05;

            const bladeGeometry = new THREE.PlaneGeometry(width, height);
            const bladeMaterial = new THREE.MeshStandardMaterial({
                color: 0x4CAF50,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });

            // Adjust color for variety
            const hue = 0.3 + (Math.random() * 0.1); // Green hue with slight variation
            bladeMaterial.color.setHSL(hue, 0.7, 0.4 + Math.random() * 0.2);

            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);

            // Position within patch
            blade.position.set(
                (Math.random() - 0.5) * 0.5,
                height / 2,
                (Math.random() - 0.5) * 0.5
            );

            // Random rotation
            blade.rotation.y = Math.random() * Math.PI;

            // Add to patch
            patchGroup.add(blade);

            // Tag for wind animation
            blade.userData.type = 'grass';
            blade.userData.windFactor = 0.5 + Math.random() * 0.5;
        }

        this.scene.add(patchGroup);
        return patchGroup;
    }

    // ENHANCED: Create a path to help with orientation
    createPath() {
        // Create a winding path with points - all points much lower to avoid player collision
        const pathPoints = [
            new THREE.Vector3(0, -0.1, 0),      // Lower path vertices
            new THREE.Vector3(5, -0.1, 5),
            new THREE.Vector3(10, -0.1, 0),
            new THREE.Vector3(15, -0.1, -5),
            new THREE.Vector3(10, -0.1, -10),
            new THREE.Vector3(0, -0.1, -15),
            new THREE.Vector3(-10, -0.1, -10),
            new THREE.Vector3(-15, -0.1, 0),
            new THREE.Vector3(-10, -0.1, 10),
            new THREE.Vector3(0, -0.1, 15)
        ];

        // Create a smooth curve
        const curve = new THREE.CatmullRomCurve3(pathPoints);
        curve.closed = true;

        // Create the path geometry - smaller radius
        const pathGeometry = new THREE.TubeGeometry(curve, 100, 0.4, 8, false);
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: 0xC2B280, // Sandy path color
            roughness: 1,
            metalness: 0
        });

        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.receiveShadow = true;
        this.scene.add(path);

        return path;
    }

    // Update loading progress
    updateLoadingProgress(percent) {
        this.loadingBar.style.width = `${percent}%`;
    }

    // Create player character
    createPlayer() {
        // Create a group for the entire player character
        this.player = new THREE.Group();
        
        // Position player higher above the ground to avoid being stuck in the pathway
        this.player.position.set(0, 1.0, 0);
        this.scene.add(this.player);
        
        // Create a group for the actual character model
        const characterModel = new THREE.Group();
        
        // DO NOT rotate the character model - leave it in its original orientation
        // so we can control its rotation separately from the sword
        
        this.player.add(characterModel);
        
        // ----- Character Model in T-Pose -----
        
        // Head - slightly oval shape for cartoonish but human look
        const headGeometry = new THREE.SphereGeometry(0.25, 12, 10);
        // Compress slightly on Z axis for a more oval face
        headGeometry.scale(1, 1.1, 0.9);
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffe0bd,
            roughness: 0.3,
            metalness: 0
        });
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 1.5; // Position at top of body
        head.castShadow = true;
        characterModel.add(head);
        
        // Face features
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 0.03, 0.2);
        head.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 0.03, 0.2);
        head.add(rightEye);
        
        // Eyebrows
        const eyebrowGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.02);
        const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0x513915 });
        
        const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        leftEyebrow.position.set(-0.1, 0.13, 0.2);
        leftEyebrow.rotation.z = -0.1; // Slight angle
        head.add(leftEyebrow);
        
        const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        rightEyebrow.position.set(0.1, 0.13, 0.2);
        rightEyebrow.rotation.z = 0.1; // Slight angle
        head.add(rightEyebrow);
        
        // Nose
        const noseGeometry = new THREE.ConeGeometry(0.04, 0.08, 4);
        noseGeometry.rotateX(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeometry, skinMaterial);
        nose.position.set(0, 0, 0.25);
        head.add(nose);
        
        // Mouth - simple line
        const mouthGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.01);
        const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x9e5343 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.12, 0.2);
        head.add(mouth);
        
        // Green cap
        const capMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228b22, // Forest green
            roughness: 0.7,
            metalness: 0 
        });
        
        // Base of cap
        const capBaseGeometry = new THREE.CylinderGeometry(0.27, 0.27, 0.12, 8);
        const capBase = new THREE.Mesh(capBaseGeometry, capMaterial);
        capBase.position.y = 0.25;
        capBase.rotation.x = 0.1; // Tilt forward slightly
        head.add(capBase);
        
        // Pointed part of cap
        const capTopGeometry = new THREE.ConeGeometry(0.25, 0.45, 8);
        const capTop = new THREE.Mesh(capTopGeometry, capMaterial);
        capTop.position.set(0, 0.2, -0.05);
        capTop.rotation.x = -0.6; // Tilt backward
        capBase.add(capTop);
        
        // Torso - green tunic with slight taper
        const tunicMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228b22, // Same green as cap
            roughness: 0.8,
            metalness: 0 
        });
        
        // Upper body/torso
        const torsoGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.3);
        const torso = new THREE.Mesh(torsoGeometry, tunicMaterial);
        torso.position.y = 1.1;
        torso.castShadow = true;
        characterModel.add(torso);
        
        // Lower tunic (skirt portion)
        const lowerTunicGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.3, 8);
        const lowerTunic = new THREE.Mesh(lowerTunicGeometry, tunicMaterial);
        lowerTunic.position.y = 0.8;
        lowerTunic.castShadow = true;
        characterModel.add(lowerTunic);
        
        // Belt
        const beltGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8);
        const beltMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x614126, // Dark brown
            roughness: 0.4,
            metalness: 0.1 
        });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.y = 0.95;
        characterModel.add(belt);
        
        // Arms materials
        const sleevesMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228b22, // Green tunic
            roughness: 0.8 
        });
        
        // Left arm
        const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, sleevesMaterial);
        leftUpperArm.position.set(-0.35, 1.15, 0);
        // In T-pose, arms go straight out
        leftUpperArm.rotation.z = Math.PI / 2;
        leftUpperArm.castShadow = true;
        characterModel.add(leftUpperArm);
        
        const forearmGeometry = new THREE.CylinderGeometry(0.07, 0.08, 0.4, 8);
        const leftForearm = new THREE.Mesh(forearmGeometry, skinMaterial);
        leftForearm.position.set(-0.4, 0, 0);
        leftForearm.castShadow = true;
        leftUpperArm.add(leftForearm);
        
        // Left hand
        const handGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        handGeometry.scale(1, 0.8, 0.5);
        const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
        leftHand.position.set(0, -0.2, 0);
        leftHand.castShadow = true;
        leftForearm.add(leftHand);
        
        // Right arm
        const rightUpperArm = new THREE.Mesh(upperArmGeometry, sleevesMaterial);
        rightUpperArm.position.set(0.35, 1.15, 0);
        // In T-pose, arms go straight out
        rightUpperArm.rotation.z = -Math.PI / 2;
        rightUpperArm.castShadow = true;
        characterModel.add(rightUpperArm);
        
        const rightForearm = new THREE.Mesh(forearmGeometry, skinMaterial);
        rightForearm.position.set(0.4, 0, 0);
        rightForearm.castShadow = true;
        rightUpperArm.add(rightForearm);
        
        // Right hand
        const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
        rightHand.position.set(0, -0.2, 0);
        rightHand.castShadow = true;
        rightForearm.add(rightHand);
        
        // Legs
        const pantsMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x614126, // Brown
            roughness: 0.8 
        });
        
        // Left leg
        const thighGeometry = new THREE.CylinderGeometry(0.11, 0.1, 0.4, 8);
        const leftThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
        leftThigh.position.set(-0.15, 0.6, 0);
        leftThigh.castShadow = true;
        characterModel.add(leftThigh);
        
        const calfGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.4, 8);
        const leftCalf = new THREE.Mesh(calfGeometry, pantsMaterial);
        leftCalf.position.y = -0.4;
        leftCalf.castShadow = true;
        leftThigh.add(leftCalf);
        
        // Left boot
        const bootGeometry = new THREE.BoxGeometry(0.14, 0.1, 0.2);
        const bootMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d2314, // Dark brown
            roughness: 0.5,
            metalness: 0.1 
        });
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(0, -0.25, 0.05);
        leftBoot.castShadow = true;
        leftCalf.add(leftBoot);
        
        // Right leg
        const rightThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
        rightThigh.position.set(0.15, 0.6, 0);
        rightThigh.castShadow = true;
        characterModel.add(rightThigh);
        
        const rightCalf = new THREE.Mesh(calfGeometry, pantsMaterial);
        rightCalf.position.y = -0.4;
        rightCalf.castShadow = true;
        rightThigh.add(rightCalf);
        
        // Right boot
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(0, -0.25, 0.05);
        rightBoot.castShadow = true;
        rightCalf.add(rightBoot);
        
        // ----- End Character Model -----
        
        // Create a sword holder object to make rotation easier
        this.swordHolder = new THREE.Object3D();
        this.swordHolder.position.set(0, 1.1, 0); // Position at center of player torso
        
        // In Zelda games, the sword is held on the character's back or at their side
        // and points in the same direction the character is facing
        
        this.player.add(this.swordHolder);
        
        // Create a better-looking sword with blade and hilt
        // Blade
        const swordBladeGeometry = new THREE.BoxGeometry(0.05, 0.6, 0.1);
        const swordMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            roughness: 0.2,
            metalness: 0.8 
        });
        this.sword = new THREE.Mesh(swordBladeGeometry, swordMaterial);
        // Position the sword to point forward
        // This makes it point in the same direction as the character's face
        this.sword.position.set(0, 0, 0.4); // Move forward (positive Z is forward)
        this.sword.rotation.x = -Math.PI / 2; // Point sword forward
        this.swordHolder.add(this.sword);
        
        // Sword handle
        const handleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d2314, // Dark brown
            roughness: 0.7,
            metalness: 0.1
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.4;
        handle.rotation.x = Math.PI / 2;
        this.sword.add(handle);
        
        // Sword hilt
        const hiltGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.04);
        const hiltMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xd4af37, // Gold
            roughness: 0.3,
            metalness: 0.9
        });
        const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
        hilt.position.y = -0.3;
        this.sword.add(hilt);
        
        // Add debug helper to visualize attack hitbox
        if (this.debugMode) {
            const hitboxGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const hitboxMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.3,
                wireframe: true
            });
            this.attackHitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
            this.attackHitbox.position.set(0, 0, 1.0); // Position in front of player (positive Z)
            this.player.add(this.attackHitbox);
        }

        // Create a shield holder
        this.shieldHolder = new THREE.Object3D();
        this.shieldHolder.position.set(0, 1.1, 0); // Position at center of torso
        this.player.add(this.shieldHolder);
        
        // Create a better shield with emblem
        const shieldBaseGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.4);
        // Taper the shield slightly with a custom shape
        for (let i = 0; i < shieldBaseGeometry.attributes.position.count; i++) {
            const y = shieldBaseGeometry.attributes.position.getY(i);
            if (y < 0) { // Lower part of shield
                const factor = 1 + (y * 0.5); // Taper more at bottom
                shieldBaseGeometry.attributes.position.setZ(
                    i, 
                    shieldBaseGeometry.attributes.position.getZ(i) * factor
                );
            }
        }
        
        const shieldMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x244985, // Dark blue
            roughness: 0.4,
            metalness: 0.3 
        });
        const shield = new THREE.Mesh(shieldBaseGeometry, shieldMaterial);
        shield.position.set(-0.3, 0, 0); // Position on the left side
        this.shieldHolder.add(shield);
        
        // Shield emblem
        const emblemGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 3);
        const emblemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xd4af37, // Gold
            roughness: 0.2,
            metalness: 0.8 
        });
        const emblem = new THREE.Mesh(emblemGeometry, emblemMaterial);
        emblem.position.z = 0.2;
        emblem.position.y = 0.1;
        emblem.rotation.x = Math.PI / 2;
        shield.add(emblem);
        
        // Player properties
        this.player.velocity = new THREE.Vector3(0, 0, 0);
        this.player.onGround = true;
        this.player.speed = 5;
        this.player.turnSpeed = 2;
        this.player.jumpHeight = 5;
        this.player.isAttacking = false;
        this.player.radius = 0.3; // For collision detection

        // Store references to limbs for animations
        this.player.leftArm = leftUpperArm;
        this.player.rightArm = rightUpperArm;
        this.player.leftLeg = leftThigh;
        this.player.rightLeg = rightThigh;
        
        // Camera target (slightly above player's head)
        this.cameraTarget = new THREE.Object3D();
        this.cameraTarget.position.y = 2;
        this.player.add(this.cameraTarget);

        // Third-person camera setup
        this.cameraOffset = new THREE.Vector3(0, 1.5, 3);
        this.cameraLookOffset = new THREE.Vector3(0, 0.5, 0);
        this.cameraIdealPosition = new THREE.Vector3();

        // Position player in an open area away from path
        this.player.position.set(5, 1.0, 5);

        return this.player;
    }
    
    // Ensure player spawns in a free area
    ensurePlayerSpawnClearance() {
        // Check if player is colliding with anything at spawn
        if (this.checkCollision(this.player.position)) {
            console.log("Player spawned inside an object, adjusting position");
            
            // Try different positions around the origin until we find one without collisions
            const testPositions = [
                new THREE.Vector3(2, 0.5, 0),
                new THREE.Vector3(-2, 0.5, 0),
                new THREE.Vector3(0, 0.5, 2),
                new THREE.Vector3(0, 0.5, -2),
                new THREE.Vector3(3, 0.5, 3),
                new THREE.Vector3(-3, 0.5, 3),
                new THREE.Vector3(3, 0.5, -3),
                new THREE.Vector3(-3, 0.5, -3)
            ];
            
            for (const pos of testPositions) {
                if (!this.checkCollision(pos)) {
                    this.player.position.copy(pos);
                    console.log("Found clear spawn position at", pos);
                    return;
                }
            }
            
            // If all else fails, move the player higher
            this.player.position.y = 5;
            console.log("Elevated player to avoid collisions");
        }
    }

    // Create enemy - enhanced version with animated legs
    createEnemy(x, y, z) {
        // Create a group for the entire enemy
        const enemy = new THREE.Group();
        enemy.position.set(x, y + 0.8, z); // Raised a bit to account for legs
        
        // Add a default health value (used to track damage)
        enemy.health = 2; // Takes 2 hits to kill
        
        // Main body
        const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xaa0000,
            roughness: 0.7,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        enemy.add(body);

        // Enemy eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.22, 0.15, -0.35);
        body.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.22, 0.15, -0.35);
        body.add(rightEye);

        // Pupils with improved look
        const pupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 0.1,
            metalness: 0.1
        });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.z = -0.05;
        leftEye.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.z = -0.05;
        rightEye.add(rightPupil);
        
        // Add a mouth
        const mouthGeometry = new THREE.SphereGeometry(0.15, 16, 8);
        // Cut the sphere in half for a mouth shape
        for (let i = 0; i < mouthGeometry.attributes.position.count; i++) {
            const y = mouthGeometry.attributes.position.getY(i);
            if (y > 0) {
                mouthGeometry.attributes.position.setY(i, y * 0.3);
            }
        }
        
        const mouthMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 0.2 
        });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.15, -0.35);
        mouth.rotation.x = Math.PI / 5; // Tilt slightly
        body.add(mouth);
        
        // Add teeth
        const toothGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.07);
        const toothMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.3 
        });
        
        const leftTooth = new THREE.Mesh(toothGeometry, toothMaterial);
        leftTooth.position.set(-0.08, 0.03, 0.05);
        mouth.add(leftTooth);
        
        const rightTooth = new THREE.Mesh(toothGeometry, toothMaterial);
        rightTooth.position.set(0.08, 0.03, 0.05);
        mouth.add(rightTooth);
        
        // Add spherical legs
        const legGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x880000, // Slightly darker than body
            roughness: 0.8 
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.3, -0.6, 0);
        leftLeg.castShadow = true;
        body.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.3, -0.6, 0);
        rightLeg.castShadow = true;
        body.add(rightLeg);
        
        // Add horns for a more menacing look
        const hornGeometry = new THREE.ConeGeometry(0.1, 0.25, 8);
        const hornMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x880000,
            roughness: 0.7
        });
        
        const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        leftHorn.position.set(-0.25, 0.4, -0.1);
        leftHorn.rotation.x = -Math.PI / 6;
        leftHorn.rotation.z = -Math.PI / 6;
        body.add(leftHorn);
        
        const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        rightHorn.position.set(0.25, 0.4, -0.1);
        rightHorn.rotation.x = -Math.PI / 6;
        rightHorn.rotation.z = Math.PI / 6;
        body.add(rightHorn);

        // Store references to animate legs
        enemy.body = body;
        enemy.leftLeg = leftLeg;
        enemy.rightLeg = rightLeg;
        enemy.walkTime = 0; // For animation timing
        
        // Enemy properties
        // Note: health is now set at creation time above
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

        // ENHANCED: Add collision detection for tree
        const collisionRadius = 0.8;
        const collisionData = {
            object: treeGroup,
            type: 'tree',
            position: new THREE.Vector3(x, y, z),
            radius: collisionRadius  // Collision radius
        };
        
        this.collidables.push(collisionData);
        
        // Add visual debug if debug mode is on
        if (this.debugMode) {
            const debugGeometry = new THREE.CylinderGeometry(collisionRadius, collisionRadius, 2, 16);
            const debugMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            debugMesh.position.set(x, 1, z);
            this.scene.add(debugMesh);
            this.debugObjects.push(debugMesh);
        }

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

        // ENHANCED: Add collision for house
        this.collidables.push({
            object: houseGroup,
            type: 'house',
            position: new THREE.Vector3(x, y, z),
            size: new THREE.Vector3(6, 3, 5) // Size of the house box
        });

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
        const heartMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0x330000, // ENHANCED: Add glow effect
            emissiveIntensity: 0.5
        });
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

        // Add collision for sign
        this.collidables.push({
            object: signGroup,
            type: 'sign',
            position: new THREE.Vector3(x, y, z),
            radius: 0.5
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

    // ENHANCED: Player attack with proper animation and feedback
    playerAttack() {
        if (this.player.isAttacking) return;

        this.player.isAttacking = true;
        console.log("Player attacking!");

        // If target locked, ensure we're facing the enemy before attacking
        if (this.targetLocked && this.currentTarget) {
            // When locked on in Ocarina of Time, Link always faces the enemy
            const targetDirection = new THREE.Vector3()
                .subVectors(this.currentTarget.position, this.player.position)
                .normalize();
            targetDirection.y = 0; // Keep on horizontal plane
            
            // Face TOWARD the target (just like Link does when Z-targeting)
            const lookAtPosition = this.player.position.clone().add(targetDirection);
            this.player.lookAt(lookAtPosition);
            
            console.log("Attacking while locked on target - character facing toward target");
        }

        // Store initial sword position and rotation
        const initialRotation = this.sword.rotation.x; // Now using X rotation for sword
        const initialPosition = this.sword.position.clone();

        // Create attack animation object
        const attackAnimation = {
            duration: 400, // ms - slightly faster swing
            startTime: performance.now(),
            complete: false
        };

        // ENHANCED: Create sword trail effect
        this.createSwordTrail();
        
        // Determine attack direction vector (directly in front of player)
        const attackDirection = new THREE.Vector3(0, 0, 1);
        attackDirection.applyQuaternion(this.player.quaternion);
        
        // Calculate attack position - exactly where the sword will strike
        const attackPosition = this.player.position.clone().add(
            attackDirection.multiplyScalar(1.2)
        );
        
        // Visualize attack area in debug mode
        if (this.debugMode && this.attackHitbox) {
            this.attackHitbox.visible = true;
            setTimeout(() => {
                if (this.attackHitbox) this.attackHitbox.visible = false;
            }, 400);
        }
        
        console.log("Attack direction:", attackDirection);
        console.log("Attack position:", attackPosition);

        // Detect hits on enemies - moved to mid-swing for better timing
        setTimeout(() => {
            const hitEnemies = [];
            this.enemies.forEach(enemy => {
                const distanceToEnemy = this.player.position.distanceTo(enemy.position);
                
                // Calculate angle between player's forward direction and direction to enemy
                const toEnemy = new THREE.Vector3()
                    .subVectors(enemy.position, this.player.position)
                    .normalize();
                toEnemy.y = 0; // Keep on horizontal plane
                
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.quaternion);
                const angleToEnemy = forward.angleTo(toEnemy);
                
                // Check if enemy is in front of player (within 45 degrees) and in range
                const inAttackAngle = angleToEnemy < Math.PI / 4; // 45 degrees
                const attackRange = this.targetLocked && this.currentTarget === enemy ? 3.0 : 2.0;
                
                console.log(`Enemy distance: ${distanceToEnemy.toFixed(2)}, angle: ${(angleToEnemy * 180 / Math.PI).toFixed(2)}°`);
                
                // Calculate if sword can hit enemy - better aligned with visual cues
                // Use positive Z since the sword now points forward with the character
                const swordTip = new THREE.Vector3(0, 0, 1.5).applyQuaternion(this.player.quaternion).add(this.player.position);
                const swordDistance = enemy.position.distanceTo(swordTip);
                console.log(`Sword tip distance to enemy: ${swordDistance.toFixed(2)}`);
                
                // Use wider attack angle when target locked and consider the sword's position
                if ((this.targetLocked && this.currentTarget === enemy && distanceToEnemy < attackRange) || 
                    (distanceToEnemy < attackRange && inAttackAngle) ||
                    (swordDistance < 1.5)) {
                    
                    console.log("Hit enemy!", enemy);
                    
                    // Damage enemy
                    enemy.health -= 1;
                    hitEnemies.push(enemy);

                    // Enemy knockback - keep it on the horizontal plane to avoid falling through the ground
                    const knockbackDirection = new THREE.Vector3()
                        .subVectors(enemy.position, this.player.position)
                        .normalize();
                    
                    // Ensure knockback is only horizontal (no Y component)
                    knockbackDirection.y = 0;
                    knockbackDirection.multiplyScalar(1);

                    // Apply knockback on horizontal plane only
                    enemy.position.x += knockbackDirection.x;
                    enemy.position.z += knockbackDirection.z;
                    
                    // Ensure enemy stays at proper height
                    enemy.position.y = Math.max(enemy.position.y, 0.8); // Minimum height to prevent falling

                    // ENHANCED: Visual feedback for hit at the actual hit location
                    const hitLocation = enemy.position.clone().sub(knockbackDirection.multiplyScalar(0.3));
                    this.createHitEffect(hitLocation);

                    // Flash enemy red - find the body which has the material
                    if (enemy.body && enemy.body.material) {
                        const originalColor = enemy.body.material.color.clone();
                        enemy.body.material.color.set(0xFF0000);
                        setTimeout(() => {
                            if (enemy.parent && enemy.body) { // Check if enemy still exists
                                enemy.body.material.color.copy(originalColor);
                            }
                        }, 200);
                    }

                    // Check if enemy is defeated - make sure health can't go below 0
                    enemy.health = Math.max(0, enemy.health);
                    
                    if (enemy.health <= 0) {
                        console.log("Enemy defeated!");
                        
                        // ENHANCED: Create death effect
                        this.createDeathEffect(enemy.position);

                        // Wait a moment for the death effect before removing
                        setTimeout(() => {
                            // Double-check the enemy still exists and isn't already removed
                            if (enemy && enemy.parent) {
                                this.scene.remove(enemy);
                            }

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
                        }, 100);
                    }
                }
            });
        }, 200); // Execute hit detection earlier in the swing

        // Animate the sword swing
        const animateSwordSwing = (timestamp) => {
            if (!this.player.isAttacking) return;

            const elapsed = timestamp - attackAnimation.startTime;
            const progress = Math.min(elapsed / attackAnimation.duration, 1);

            if (progress < 0.5) {
                // Forward swing (0 to 0.5)
                const swingProgress = progress * 2; // Scale to 0-1
                
                // Swing sword forward - now using swordHolder to rotate entire sword group
                this.swordHolder.rotation.y = this.lerp(0, -Math.PI/2, this.easeOutQuad(swingProgress));
                
                // Also adjust the sword's own rotation for extra effect
                this.sword.rotation.x = this.lerp(initialRotation, initialRotation + Math.PI/4, this.easeOutQuad(swingProgress));
            } else {
                // Return swing (0.5 to 1)
                const returnProgress = (progress - 0.5) * 2; // Scale to 0-1
                
                // Return sword to original position
                this.swordHolder.rotation.y = this.lerp(-Math.PI/2, 0, this.easeInOutQuad(returnProgress));
                this.sword.rotation.x = this.lerp(initialRotation + Math.PI/4, initialRotation, this.easeInOutQuad(returnProgress));
            }

            if (progress < 1) {
                requestAnimationFrame(animateSwordSwing);
            } else {
                // Reset after animation completes
                this.swordHolder.rotation.y = 0;
                this.sword.rotation.x = initialRotation;
                this.player.isAttacking = false;
            }
        };

        // Start animation
        requestAnimationFrame(animateSwordSwing);
    }

    // ENHANCED: Create sword trail effect
    createSwordTrail() {
        // Get sword tip position in world space - now at the end of sword
        const swordTip = new THREE.Vector3(0, 0, 0.7); // End of sword (positive Z)
        this.sword.localToWorld(swordTip);

        // Create sword trail geometry
        const trailGeometry = new THREE.BufferGeometry();
        const vertices = [];

        // Get player's forward direction
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.quaternion);
        
        // Get perpendicular vector to create the arc of the sword swing
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.quaternion);
        const up = new THREE.Vector3(0, 1, 0);
        
        // Create curved path for trail that follows the sword's sweeping motion
        const radius = 0.9; // Slightly wider arc
        const swingAngle = Math.PI / 2; // 90-degree swing
        
        console.log("Creating sword trail, player facing:", forward);

        // Create a horizontal swing arc (matches the new sword animation)
        for (let i = 0; i <= 18; i++) {
            // Create a curved arc
            const segment = i / 18;
            
            // Calculate the swing angle for this segment - now horizontal sweep
            const segmentAngle = swingAngle * segment;
            
            // Calculate the position for this segment - rotating around player's vertical axis
            const swingRotation = new THREE.Quaternion().setFromAxisAngle(
                up,          // Rotate around Y axis (vertical)
                -segmentAngle // Negative angle for correct sweep direction
            );
            
            // Start vector is forward and slightly right
            const startVec = forward.clone().multiplyScalar(radius);
            startVec.add(right.clone().multiplyScalar(radius * 0.3));
            
            // Apply rotation for this segment
            startVec.applyQuaternion(swingRotation);
            
            // Add slight vertical arc to the swing
            const verticalOffset = Math.sin(segment * Math.PI) * 0.2;
            
            // Find position in world space
            const worldPos = this.player.position.clone().add(new THREE.Vector3(
                startVec.x,
                verticalOffset + 0.5, // Keep trail at sword height
                startVec.z
            ));
            
            // Add the point to the trail
            vertices.push(
                worldPos.x,
                worldPos.y,
                worldPos.z
            );
        }

        trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Create trail material with a better visual effect
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x00BFFF, // Deeper blue glow
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        // Create trail mesh
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(trail);

        // Animate trail fade out
        const startTime = performance.now();
        const duration = 350; // Match animation speed

        const animateTrail = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (trail.material) {
                trail.material.opacity = 0.8 * (1 - progress);
            }

            if (progress < 1) {
                requestAnimationFrame(animateTrail);
            } else {
                this.scene.remove(trail);
            }
        };

        requestAnimationFrame(animateTrail);
    }

    // ENHANCED: Create hit effect at position
    createHitEffect(position) {
        // Create particles for hit effect
        const particleCount = 8;
        const particles = new THREE.Group();

        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFF9500,
                transparent: true
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Random starting position near hit point
            particle.position.set(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2 + 0.5,
                (Math.random() - 0.5) * 0.2
            );

            // Random velocity
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                Math.random() * 0.05,
                (Math.random() - 0.5) * 0.05
            );

            particles.add(particle);
        }

        // Position particles at hit location
        particles.position.copy(position);
        this.scene.add(particles);

        // Animate particles
        const startTime = performance.now();
        const duration = 400;

        const animateParticles = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            particles.children.forEach(particle => {
                // Move particle
                particle.position.add(particle.userData.velocity);

                // Add gravity
                particle.userData.velocity.y -= 0.002;

                // Fade out
                particle.material.opacity = 1 - progress;
            });

            if (progress < 1) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particles);
            }
        };

        requestAnimationFrame(animateParticles);
    }

    // ENHANCED: Create death effect
    createDeathEffect(position) {
        // Create explosion particles
        const particleCount = 15;
        const particleGroup = new THREE.Group();

        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFF3D00,
                transparent: true
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Random direction outward
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.1;
            particle.position.set(
                Math.cos(angle) * radius,
                (Math.random() - 0.5) * 0.2,
                Math.sin(angle) * radius
            );

            // Random velocity outward
            particle.userData.velocity = particle.position.clone().normalize().multiplyScalar(0.08);
            particle.userData.velocity.y = Math.random() * 0.08; // Add upward component

            particleGroup.add(particle);
        }

        // Position at enemy location
        particleGroup.position.copy(position);
        this.scene.add(particleGroup);

        // Animate explosion
        const startTime = performance.now();
        const duration = 600;

        const animateExplosion = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            particleGroup.children.forEach(particle => {
                // Move particle
                particle.position.add(particle.userData.velocity);

                // Add gravity
                particle.userData.velocity.y -= 0.003;

                // Fade out
                particle.material.opacity = 1 - progress;

                // Scale up slightly
                const scale = 1 + progress;
                particle.scale.set(scale, scale, scale);
            });

            if (progress < 1) {
                requestAnimationFrame(animateExplosion);
            } else {
                this.scene.remove(particleGroup);
            }
        };

        requestAnimationFrame(animateExplosion);
    }

    // ENHANCED: Helper functions for animations
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
        if (this.enemies.length === 0) {
            console.log("No enemies to target");
            return;
        }

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
                
                // Immediately face the enemy when locking on
                const targetDirection = new THREE.Vector3()
                    .subVectors(closestEnemy.position, this.player.position)
                    .normalize();
                targetDirection.y = 0; // Keep on horizontal plane
                
                const targetPosition = new THREE.Vector3()
                    .copy(this.player.position)
                    .add(targetDirection);
                this.player.lookAt(targetPosition);
                
                console.log("Target locked on enemy at distance:", closestDistance);
            } else {
                console.log("No enemies within range");
            }
        } else {
            this.targetLocked = false;
            this.currentTarget = null;
            this.reticle.style.display = 'none';
            console.log("Target lock released");
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

    // Update enemies with animation
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
                    
                    // Apply movement on horizontal plane only
                    enemy.position.x += movement.x;
                    enemy.position.z += movement.z;
                    
                    // Ensure enemy stays at proper height
                    enemy.position.y = Math.max(enemy.position.y, 0.8);

                    // Face the player
                    const lookPos = new THREE.Vector3(
                        this.player.position.x,
                        enemy.position.y,
                        this.player.position.z
                    );
                    enemy.lookAt(lookPos);
                    
                    // Animate legs when moving
                    if (enemy.leftLeg && enemy.rightLeg) {
                        // Update animation time
                        enemy.walkTime += deltaTime * 5; // Control animation speed
                        
                        // Create a shuffling animation by moving legs up and down in alternating pattern
                        const leftLegHeight = Math.sin(enemy.walkTime) * 0.2;
                        const rightLegHeight = Math.sin(enemy.walkTime + Math.PI) * 0.2; // Opposite phase
                        
                        // Apply leg movement
                        enemy.leftLeg.position.y = -0.6 + leftLegHeight;
                        enemy.rightLeg.position.y = -0.6 + rightLegHeight;
                        
                        // Add slight side-to-side motion for leg shuffling effect
                        const sideSway = Math.sin(enemy.walkTime) * 0.05;
                        enemy.leftLeg.position.x = -0.3 - sideSway;
                        enemy.rightLeg.position.x = 0.3 + sideSway;
                        
                        // Small bounce effect for the whole body
                        if (enemy.body) {
                            enemy.body.position.y = Math.abs(Math.sin(enemy.walkTime * 2)) * 0.05;
                        }
                    }
                } else {
                    // Attack player if in range and cooldown is over
                    const currentTime = this.clock.getElapsedTime();
                    if (currentTime - enemy.lastAttackTime > enemy.attackCooldown) {
                        this.playerTakeDamage(1);
                        enemy.lastAttackTime = currentTime;
                        
                        // Animate attack by moving forward slightly
                        if (enemy.body) {
                            const attackDirection = new THREE.Vector3()
                                .subVectors(this.player.position, enemy.position)
                                .normalize()
                                .multiplyScalar(0.2);
                            
                            // Quick forward lunge animation
                            const startPosition = enemy.body.position.clone();
                            const endPosition = startPosition.clone().add(attackDirection);
                            
                            // Create a simple animation sequence
                            const animateAttack = (progress) => {
                                if (progress < 0.5) {
                                    // Move forward
                                    const t = progress * 2; // Scale to 0-1 for first half
                                    enemy.body.position.copy(startPosition).lerp(endPosition, this.easeOutQuad(t));
                                } else {
                                    // Move back
                                    const t = (progress - 0.5) * 2; // Scale to 0-1 for second half
                                    enemy.body.position.copy(endPosition).lerp(startPosition, this.easeInQuad(t));
                                }
                                
                                if (progress < 1) {
                                    setTimeout(() => animateAttack(progress + 0.1), 20);
                                }
                            };
                            
                            animateAttack(0);
                        }
                    }
                    
                    // Keep legs in place when not moving
                    if (enemy.leftLeg && enemy.rightLeg) {
                        enemy.leftLeg.position.y = -0.6;
                        enemy.rightLeg.position.y = -0.6;
                        enemy.leftLeg.position.x = -0.3;
                        enemy.rightLeg.position.x = 0.3;
                    }
                }
            } else {
                enemy.aggro = false;
                
                // Reset leg positions when not aggro
                if (enemy.leftLeg && enemy.rightLeg) {
                    enemy.leftLeg.position.y = -0.6;
                    enemy.rightLeg.position.y = -0.6;
                    enemy.leftLeg.position.x = -0.3;
                    enemy.rightLeg.position.x = 0.3;
                    
                    if (enemy.body) {
                        enemy.body.position.y = 0;
                    }
                }
            }

            // Update enemy eyes to look at player
            if (enemy.aggro && enemy.body) {
                // Make the entire body face the player first
                const lookPos = new THREE.Vector3(
                    this.player.position.x,
                    enemy.position.y,
                    this.player.position.z
                );
                enemy.lookAt(lookPos);
                
                // Then fine-tune eye tracking
                enemy.body.children.forEach(child => {
                    if (child.children.length > 0 && child.name !== "mouth") {
                        child.lookAt(this.player.position);
                    }
                });
                
                // Add an "alert" behavior when first spotting the player
                if (!enemy.wasAggro && enemy.aggro) {
                    // Flash the eyes red briefly
                    const eyes = enemy.body.children.filter(c => c.children.length > 0);
                    eyes.forEach(eye => {
                        const originalColor = eye.material.color.clone();
                        eye.material.color.set(0xff0000);
                        setTimeout(() => {
                            if (eye.material) { // Check if enemy still exists
                                eye.material.color.copy(originalColor);
                            }
                        }, 300);
                    });
                }
            }
            
            // Track aggro state changes
            enemy.wasAggro = enemy.aggro;
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

        // ENHANCED: Visual feedback for damage
        const flashInterval = setInterval(() => {
            this.player.visible = !this.player.visible;
        }, 100);

        setTimeout(() => {
            clearInterval(flashInterval);
            this.player.visible = true;
        }, 500);

        // Death
        if (this.playerHealth <= 0) {
            alert('Game Over! Refresh to restart.');

            // ENHANCED: Death animation
            this.player.rotation.x = -Math.PI / 2; // Fall over
        }

        // ENHANCED: Create hit effect at player position
        this.createHitEffect(this.player.position.clone());
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

                // ENHANCED: Add pulsing glow effect
                const pulseIntensity = (Math.sin(collectible.userData.time * 3) * 0.25) + 0.75;
                collectible.material.emissiveIntensity = pulseIntensity;

                // Check for proximity to player for visual feedback
                const distanceToPlayer = this.player.position.distanceTo(collectible.parent.position);
                if (distanceToPlayer < 3) {
                    // Speed up rotation and pulse when player is near
                    collectible.rotation.y += collectible.userData.rotationSpeed * 2;
                }
            }
        });
    }

    // ENHANCED: Update player movement and physics with collision detection and animations
    updatePlayer(deltaTime) {
        if (!this.player) return;

        // Store original position for collision detection
        const originalPosition = this.player.position.clone();

        // Handle player movement
        const playerDirection = new THREE.Vector3(0, 0, 0);

        // Calculate forward direction based on camera orientation when not target locked
        let forward = new THREE.Vector3(0, 0, -1);
        let right = new THREE.Vector3(1, 0, 0);
        
        // Determine movement directions based on target lock state
        if (this.targetLocked && this.currentTarget) {
            // ===== TARGET LOCKED MODE =====
            // Get direction vector to the target
            const targetDirection = new THREE.Vector3()
                .subVectors(this.currentTarget.position, this.player.position)
                .normalize();
            targetDirection.y = 0; // Keep on horizontal plane
            
            // In target lock mode:
            // - "forward" means "move toward the target" 
            // - "backward" means "move away from the target"
            forward = targetDirection.clone();
            
            // Calculate right direction perpendicular to forward
            right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
            
            // In Ocarina of Time's target lock (Z-targeting):
            // The character always faces TOWARD the target
            // This allows the player to circle-strafe while maintaining focus on the enemy
            const lookAtTarget = this.player.position.clone().add(targetDirection);
            
            // Set player rotation to face directly at the target
            this.player.lookAt(lookAtTarget);
        } else {
            // ===== FREE MOVEMENT MODE =====
            // Movement directions aligned with camera view
            forward.applyEuler(new THREE.Euler(0, this.mouseControls.cameraRotation.y, 0));
            right.applyEuler(new THREE.Euler(0, this.mouseControls.cameraRotation.y, 0));
        }

        // Apply movement based on keys
        if (this.keys.forward) playerDirection.add(forward);
        if (this.keys.backward) playerDirection.sub(forward);
        if (this.keys.right) playerDirection.add(right);
        if (this.keys.left) playerDirection.sub(right);

        // Add subtle bobbing effect and animate limbs when walking
        if (playerDirection.length() > 0) {
            // Update walk animation time
            this.player.userData.walkTime = (this.player.userData.walkTime || 0) + deltaTime * 5;
            const walkTime = this.player.userData.walkTime;
            
            // Animate limbs if references exist
            if (this.player.leftLeg && this.player.rightLeg) {
                // Leg swing animation
                const legSwing = Math.PI/8; // Maximum swing angle
                
                // Legs move in opposite phases
                this.player.leftLeg.rotation.x = Math.sin(walkTime) * legSwing;
                this.player.rightLeg.rotation.x = Math.sin(walkTime + Math.PI) * legSwing;
                
                // Arm swing animation (opposite to legs for natural walk)
                if (this.player.leftArm && this.player.rightArm) {
                    const armSwing = Math.PI/10; // Arm swing angle
                    
                    // Store original rotations if not already stored
                    if (this.player.leftArm.userData.originalRotation === undefined) {
                        this.player.leftArm.userData.originalRotation = this.player.leftArm.rotation.z;
                        this.player.rightArm.userData.originalRotation = this.player.rightArm.rotation.z;
                    }
                    
                    // Arms swing opposite to legs for natural walking
                    const leftArmOriginal = this.player.leftArm.userData.originalRotation;
                    const rightArmOriginal = this.player.rightArm.userData.originalRotation;
                    
                    this.player.leftArm.rotation.x = Math.sin(walkTime + Math.PI) * armSwing;
                    this.player.rightArm.rotation.x = Math.sin(walkTime) * armSwing;
                    
                    // Maintain original side position
                    this.player.leftArm.rotation.z = leftArmOriginal;
                    this.player.rightArm.rotation.z = rightArmOriginal;
                }
            }
            
            // Subtle body bob
            const bobHeight = Math.sin(walkTime * 2) * 0.03; // Doubled frequency for realistic gait
            
            // Apply bob to character's children (head, etc.)
            this.player.children.forEach(child => {
                if (child.position.y > 0.5 && !(child === this.swordHolder || child === this.shieldHolder)) {
                    // Only bob non-weapon parts
                    child.position.y = child.userData.originalY || child.position.y;
                    child.position.y += bobHeight;
                }
            });
        } else {
            // Reset animations when not moving
            if (this.player.leftLeg && this.player.rightLeg) {
                this.player.leftLeg.rotation.x = 0;
                this.player.rightLeg.rotation.x = 0;
                
                if (this.player.leftArm && this.player.rightArm) {
                    this.player.leftArm.rotation.x = 0;
                    this.player.rightArm.rotation.x = 0;
                    
                    // Restore original arm positions (T-pose)
                    if (this.player.leftArm.userData.originalRotation !== undefined) {
                        this.player.leftArm.rotation.z = this.player.leftArm.userData.originalRotation;
                        this.player.rightArm.rotation.z = this.player.rightArm.userData.originalRotation;
                    }
                }
            }
        }

        // Normalize movement vector and apply velocity
        if (playerDirection.length() > 0) {
            playerDirection.normalize();

            // Apply player speed
            playerDirection.multiplyScalar(this.player.speed * deltaTime);

            // Calculate new position
            const newPosition = this.player.position.clone().add(playerDirection);

            // Check for collisions before applying movement
            if (!this.checkCollision(newPosition)) {
                // No collision, move freely
                this.player.position.copy(newPosition);
            } else {
                // Try sliding along X axis first
                const slideX = this.player.position.clone();
                slideX.x = newPosition.x;

                if (!this.checkCollision(slideX)) {
                    this.player.position.copy(slideX);
                } else {
                    // Try sliding along Z axis if X failed
                    const slideZ = this.player.position.clone();
                    slideZ.z = newPosition.z;

                    if (!this.checkCollision(slideZ)) {
                        this.player.position.copy(slideZ);
                    } else {
                        // Try to step over small obstacles
                        const elevatedPosition = newPosition.clone();
                        elevatedPosition.y += 0.1; // Try slightly higher
                        
                        if (!this.checkCollision(elevatedPosition)) {
                            this.player.position.copy(elevatedPosition);
                        }
                    }
                }
            }

            // Handle player orientation
            if (!this.targetLocked) {
                // In Ocarina of Time, the character always faces in the direction they're moving
                const moveDir = playerDirection.clone().normalize();
                
                // Face IN the direction of movement (just like in Zelda OoT)
                // If moving forward (W), character faces FORWARD (away from camera)
                // If moving backward (S), character faces BACKWARD (toward camera)
                // If moving left (A), character faces LEFT
                // If moving right (D), character faces RIGHT
                const moveTarget = this.player.position.clone().add(moveDir);
                this.player.lookAt(moveTarget);
            }
            // In target-locked mode, orientation was already set above

            // Add footstep effect when moving
            this.player.userData.lastStepTime = this.player.userData.lastStepTime || 0;
            this.player.userData.stepInterval = 0.3; // seconds between footsteps

            if (performance.now() / 1000 - this.player.userData.lastStepTime > this.player.userData.stepInterval) {
                // Create subtle dust at feet when moving
                if (this.player.onGround) {
                    this.createFootstepDust(this.player.position.clone());
                    this.player.userData.lastStepTime = performance.now() / 1000;
                }
            }
        }

        // Handle jumping
        if (this.keys.jump && this.player.onGround) {
            this.player.velocity.y = this.player.jumpHeight;
            this.player.onGround = false;
            console.log("Player jumping");
        }

        // Apply gravity
        if (!this.player.onGround) {
            this.player.velocity.y -= 9.8 * deltaTime;
            this.player.position.y += this.player.velocity.y * deltaTime;

            // Check ground collision - use 1.0 as the ground level now
            if (this.player.position.y <= 1.0) {
                this.player.position.y = 1.0;
                this.player.velocity.y = 0;
                this.player.onGround = true;
                console.log("Player landed on ground");

                // Create landing dust effect if falling from height
                if (this.player.velocity.y < -3) {
                    this.createFootstepDust(this.player.position.clone(), 2);
                }
            }
        }
    }

    // ENHANCED: Check for collision with objects in the world
    checkCollision(position) {
        // Immediately return false if we're checking a position too high in the air
        // This allows the player to jump over obstacles
        if (position.y > 3.0) {
            return false;
        }
        
        // Check collisions with all collidable objects
        for (const collidable of this.collidables) {
            // Skip if the collidable doesn't have required properties
            if (!collidable.position && !collidable.object) {
                continue;
            }
            
            // Get the actual position either from the collidable's position or from its object
            const collidablePosition = collidable.position || collidable.object.position;
            
            switch (collidable.type) {
                case 'tree':
                case 'sign':
                case 'rock':
                    // Radial collision detection for cylindrical objects
                    const dx = position.x - collidablePosition.x;
                    const dz = position.z - collidablePosition.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    // Reduced collision radius to allow player to move more freely
                    const adjustedRadius = collidable.radius * 0.8;

                    // Adjust collision distance based on player radius plus object radius
                    if (distance < this.player.radius + adjustedRadius) {
                        // Debug output
                        console.log(`Collision with ${collidable.type} at distance ${distance.toFixed(2)}, required distance: ${(this.player.radius + adjustedRadius).toFixed(2)}`);
                        return true; // Collision detected
                    }
                    break;

                case 'house':
                    // Box collision detection for house
                    const minX = collidablePosition.x - collidable.size.x / 2 - this.player.radius;
                    const maxX = collidablePosition.x + collidable.size.x / 2 + this.player.radius;
                    const minZ = collidablePosition.z - collidable.size.z / 2 - this.player.radius;
                    const maxZ = collidablePosition.z + collidable.size.z / 2 + this.player.radius;

                    if (position.x > minX && position.x < maxX &&
                        position.z > minZ && position.z < maxZ) {
                        console.log(`Collision with house at position ${position.x}, ${position.z}`);
                        return true; // Collision detected
                    }
                    break;
            }
        }

        return false; // No collision
    }

    // ENHANCED: Create dust effect for footsteps or landing
    createFootstepDust(position, scale = 1) {
        const dustCount = 3 * scale;
        const dustGroup = new THREE.Group();

        for (let i = 0; i < dustCount; i++) {
            const size = (0.05 + Math.random() * 0.05) * scale;
            const dustGeometry = new THREE.SphereGeometry(size, 4, 4);
            const dustMaterial = new THREE.MeshBasicMaterial({
                color: 0xCCCCCC,
                transparent: true,
                opacity: 0.4
            });

            const dust = new THREE.Mesh(dustGeometry, dustMaterial);

            // Position slightly above ground and with random offset
            dust.position.set(
                (Math.random() - 0.5) * 0.2 * scale,
                0.05,
                (Math.random() - 0.5) * 0.2 * scale
            );

            // Random upward and outward velocity
            dust.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.03 * scale,
                0.03 + Math.random() * 0.02 * scale,
                (Math.random() - 0.5) * 0.03 * scale
            );

            dustGroup.add(dust);
        }

        // Position at player's feet
        dustGroup.position.copy(position);
        dustGroup.position.y = 0.05;
        this.scene.add(dustGroup);

        // Animate dust particles
        const startTime = performance.now();
        const duration = 600 * scale;

        const animateDust = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            dustGroup.children.forEach(dust => {
                // Move dust particle
                dust.position.add(dust.userData.velocity);

                // Add slight gravity and air resistance
                dust.userData.velocity.y -= 0.001;
                dust.userData.velocity.multiplyScalar(0.97);

                // Fade out
                dust.material.opacity = 0.4 * (1 - progress);

                // Expand slightly
                const scale = 1 + progress * 0.5;
                dust.scale.set(scale, scale, scale);
            });

            if (progress < 1) {
                requestAnimationFrame(animateDust);
            } else {
                this.scene.remove(dustGroup);
            }
        };

        requestAnimationFrame(animateDust);
    }

    // ENHANCED: Update camera position with improved collision and cinematic effects
    updateCamera(deltaTime) {
        if (!this.player) return;

        if (this.targetLocked && this.currentTarget) {
            // Get direction vector from player to target
            const playerToTarget = new THREE.Vector3();
            playerToTarget.subVectors(this.currentTarget.position, this.player.position).normalize();
            
            // Get the current player-to-target distance
            const distanceToTarget = this.player.position.distanceTo(this.currentTarget.position);
            
            // Calculate optimal camera position slightly higher and behind player
            const cameraPos = new THREE.Vector3();
            // Start at player position
            cameraPos.copy(this.player.position);
            // Move backward along the player-to-target axis (in reverse)
            const backDistance = this.mouseControls.orbitDistance + 1.0; // Slightly further back
            const backVector = playerToTarget.clone().multiplyScalar(-backDistance);
            cameraPos.add(backVector);
            // Raise camera height based on distance to target (higher when further away)
            const heightFactor = 1.5 + (distanceToTarget * 0.1); // Dynamic height
            cameraPos.y += this.cameraOffset.y * heightFactor;

            // Add offset to right side for more cinematic view during combat
            const rightVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), playerToTarget).normalize();
            cameraPos.add(rightVector.multiplyScalar(1.0));

            // Smoothly move camera with dynamic speed based on how fast the target is moving
            const targetMoveSpeed = (this.currentTarget.lastPosition) ? 
                this.currentTarget.position.distanceTo(this.currentTarget.lastPosition) / deltaTime : 0;
            this.currentTarget.lastPosition = this.currentTarget.position.clone();
            
            // Faster camera movement when target is moving quickly
            const lerpSpeed = 5 + (targetMoveSpeed * 2);
            this.camera.position.lerp(cameraPos, lerpSpeed * deltaTime);

            // Calculate ideal look target - dynamic positioning between player and enemy
            // When enemy is closer, look more at the enemy; when further, look more at midpoint
            const proximityFactor = Math.min(1, 4 / distanceToTarget);
            const lookTarget = new THREE.Vector3();
            lookTarget.copy(this.player.position).lerp(
                this.currentTarget.position, 
                0.3 + (proximityFactor * 0.4) // Weighted more toward enemy at close range
            );
            // Add slight height for better angle
            lookTarget.y += 0.7;
            
            this.camera.lookAt(lookTarget);

            // ENHANCED: Add dynamic camera shake during combat based on distance
            if (this.player.isAttacking) {
                const shakeIntensity = 0.015 - (distanceToTarget * 0.002); // More intense at close range
                const shakeAmount = Math.max(0.003, Math.min(0.015, shakeIntensity)); 
                this.camera.position.x += (Math.random() - 0.5) * shakeAmount;
                this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
                this.camera.position.z += (Math.random() - 0.5) * shakeAmount;
            }
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

            // ENHANCED: Add slight camera lag effect for more natural movement
            if (this.lastPlayerPos) {
                const playerMoveDelta = new THREE.Vector3().subVectors(this.player.position, this.lastPlayerPos);
                const moveMagnitude = playerMoveDelta.length();

                if (moveMagnitude > 0.01) { // Only apply when significant movement occurs
                    const lagFactor = 0.05;
                    const lag = playerMoveDelta.clone().multiplyScalar(-lagFactor);
                    cameraPos.add(lag);
                }
            }

            // Remember player position for next frame
            this.lastPlayerPos = this.player.position.clone();

            // Smoothly move camera with dynamic damping based on player movement
            const playerSpeed = this.player.velocity ? this.player.velocity.length() : 0;
            const dampingFactor = 5 + (playerSpeed * 0.5); // More damping when moving fast
            this.camera.position.lerp(cameraPos, dampingFactor * deltaTime);

            // Look at player with slight offset for better perspective
            const lookTarget = new THREE.Vector3();
            lookTarget.copy(this.player.position).add(this.cameraLookOffset);
            this.camera.lookAt(lookTarget);
        }

        // ENHANCED: More advanced camera collision detection
        // Prevent camera from going through solid objects
        const rayStart = new THREE.Vector3();
        rayStart.copy(this.player.position);
        rayStart.y += 1; // Eye level

        const rayDirection = new THREE.Vector3();
        rayDirection.subVectors(this.camera.position, rayStart).normalize();

        const rayLength = this.player.position.distanceTo(this.camera.position);
        const raycaster = new THREE.Raycaster(rayStart, rayDirection, 0.1, rayLength);

        // Check against all collidable objects
        const collidableObjects = this.scene.children.filter(obj => {
            // Filter out the player and non-solid objects
            return obj !== this.player;
        });

        const intersects = raycaster.intersectObjects(collidableObjects, true);

        if (intersects.length > 0) {
            const collision = intersects[0];

            // If camera would be inside an object, adjust its position
            if (collision.distance < rayLength) {
                // Place camera at collision point, slightly in front
                const adjustedPosition = new THREE.Vector3();
                adjustedPosition.copy(rayStart).add(rayDirection.multiplyScalar(collision.distance * 0.9));

                // Smoothly move to new position
                this.camera.position.lerp(adjustedPosition, 10 * deltaTime);

                // ENHANCED: Fade out objects between camera and player for visibility
                const hit = collision.object;
                if (hit.material && !hit.userData.wasTransparent) {
                    hit.userData.originalOpacity = hit.material.opacity || 1;
                    hit.userData.wasTransparent = hit.material.transparent;
                    hit.material.transparent = true;
                    hit.material.opacity = 0.3;

                    // Restore original values when camera moves away
                    setTimeout(() => {
                        if (hit.material) {
                            hit.material.opacity = hit.userData.originalOpacity;
                            hit.material.transparent = hit.userData.wasTransparent;
                        }
                    }, 1000);
                }
            }
        }

        // ENHANCED: Apply subtle camera shake on landing from jump
        if (this.player.onGround && this.player.velocity && this.player.velocity.y < -5) {
            const shakeAmount = Math.min(Math.abs(this.player.velocity.y) * 0.01, 0.05);

            const applyShake = () => {
                this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
                shakeAmount *= 0.9; // Decay the shake

                if (shakeAmount > 0.001) {
                    requestAnimationFrame(applyShake);
                }
            };

            requestAnimationFrame(applyShake);
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
    
    // Reset player position if stuck
    resetPlayerPosition() {
        // Find a clear position to place the player
        console.log("Resetting player position due to being stuck");
        
        // Try several positions until we find one without collisions
        const testPositions = [
            new THREE.Vector3(0, 0.5, 0),
            new THREE.Vector3(5, 0.5, 5),
            new THREE.Vector3(-5, 0.5, -5),
            new THREE.Vector3(10, 0.5, 0),
            new THREE.Vector3(0, 0.5, 10)
        ];
        
        for (const pos of testPositions) {
            if (!this.checkCollision(pos)) {
                // Teleport player to this position
                this.player.position.copy(pos);
                console.log("Reset player to position", pos);
                
                // Reset velocity and set to ground
                this.player.velocity.set(0, 0, 0);
                this.player.onGround = true;
                
                // Create a teleport effect
                this.createFootstepDust(this.player.position.clone(), 3);
                return true;
            }
        }
        
        // If no safe position found, move up
        this.player.position.set(0, 5, 0);
        this.player.velocity.set(0, 0, 0);
        console.log("Elevated player to avoid all obstacles");
        return true;
    }

    // ENHANCED: Update environment elements for more liveliness
    updateEnvironment(deltaTime) {
        // Update grass and foliage (subtle wind animation)
        this.scene.traverse(object => {
            if (object.userData && object.userData.type === 'grass') {
                // Simple wind effect
                const time = performance.now() * 0.001;
                const windStrength = 0.03;
                const windFrequency = 1;

                const windX = Math.sin(time * windFrequency) * windStrength * object.userData.windFactor;
                const windZ = Math.cos(time * windFrequency * 0.7) * windStrength * object.userData.windFactor;

                // Apply wind rotation
                object.rotation.x = windX;
                object.rotation.z = windZ;
            }
        });
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

        // Update environment
        this.updateEnvironment(deltaTime);

        // Update target reticle
        this.updateTargetReticle();

        // Render scene with post-processing effects
        this.renderer.render(this.scene, this.camera);
    }
}

// Make the engine class available globally
window.ZeldaLikeEngine = ZeldaLikeEngine;