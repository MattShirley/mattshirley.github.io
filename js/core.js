/**
 * Core module for the Zelda-like 3D Game Engine
 * Contains the main engine class and core functionality
 */

class Core {
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
        this.collidables = []; // Array to track objects the player can collide with
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
        this.setupDayNightCycle();

        // Initialize camera rotation
        if (this.mouseControls) {
            this.mouseControls.cameraRotation.y = Math.PI; // Start camera behind player
        }

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
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadows
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

        // Add hemisphere light for better environmental lighting
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
        this.sunLight.shadow.bias = -0.0005; // Reduce shadow acne

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

    // Handle window resize
    onWindowResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    // Update loading progress
    updateLoadingProgress(percent) {
        this.loadingBar.style.width = `${percent}%`;
    }

    // Helper functions for animations
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    // Check for collision with objects in the world
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
}

// Export the Core class
window.Core = Core;