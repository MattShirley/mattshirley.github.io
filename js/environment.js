/**
 * Environment module for the Zelda-like 3D Game Engine
 * Contains world elements creation and environmental effects
 */

class Environment {
    // Setup the game world
    static setup(engine) {
        engine.updateLoadingProgress(5);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 40, 40); // More segments for detail

        // Add slight terrain variation
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
        engine.scene.add(ground);

        // Add grid for better orientation
        const gridHelper = new THREE.GridHelper(100, 20, 0x000000, 0x333333);
        gridHelper.position.y = 0.5; // Raised grid to match player's ground level
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
        engine.scene.add(gridHelper);

        engine.updateLoadingProgress(15);

        // Create player
        engine.player = Player.create(engine);

        engine.updateLoadingProgress(30);

        // Create trees
        Environment.createTree(engine, 5, 0, 15);
        Environment.createTree(engine, -8, 0, 12);
        Environment.createTree(engine, 12, 0, 20);
        Environment.createTree(engine, -15, 0, 18);
        Environment.createTree(engine, 0, 0, 25);

        engine.updateLoadingProgress(50);

        // Create a house
        Environment.createHouse(engine, -20, 0, 15);

        engine.updateLoadingProgress(65);

        // Create water
        Environment.createWater(engine, 15, -0.5, -15);

        engine.updateLoadingProgress(75);

        // Create enemies
        Enemy.create(engine, 10, 0, 10);
        Enemy.create(engine, -10, 0, -10);

        engine.updateLoadingProgress(85);

        // Create collectible
        Environment.createCollectible(engine, 5, 0.5, -5);

        engine.updateLoadingProgress(90);

        // Create sign
        Environment.createSign(engine, 3, 0, 3);

        // Add environmental details
        Environment.createEnvironmentalDetails(engine);

        engine.updateLoadingProgress(100);

        // Create health UI
        UI.createHealth(engine);

        // Hide loading screen
        setTimeout(() => {
            engine.loadingScreen.style.display = 'none';
        }, 500);
    }

    // Create environmental details
    static createEnvironmentalDetails(engine) {
        // Create rocks
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            const size = 0.2 + Math.random() * 0.3;

            // Skip if too close to center (player start)
            if (Math.sqrt(x*x + z*z) < 5) continue;

            Environment.createRock(engine, x, 0, z, size);
        }

        // Create grass patches
        for (let i = 0; i < 50; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;

            // Skip if too close to center
            if (Math.sqrt(x*x + z*z) < 5) continue;

            Environment.createGrassPatch(engine, x, 0, z);
        }

        // Create a path
        Environment.createPath(engine);
    }

    // Create a rock
    static createRock(engine, x, y, z, size) {
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

        engine.scene.add(rock);

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
            
            engine.collidables.push(collisionData);
            
            // Add visual debug if debug mode is on
            if (engine.debugMode) {
                const debugGeometry = new THREE.SphereGeometry(collisionRadius, 16, 16);
                const debugMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    wireframe: true, 
                    transparent: true,
                    opacity: 0.5
                });
                const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
                debugMesh.position.copy(rock.position);
                engine.scene.add(debugMesh);
                engine.debugObjects.push(debugMesh);
            }
        }

        return rock;
    }

    // Create grass patch
    static createGrassPatch(engine, x, y, z) {
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

        engine.scene.add(patchGroup);
        return patchGroup;
    }

    // Create a path
    static createPath(engine) {
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
        engine.scene.add(path);

        return path;
    }

    // Create a tree
    static createTree(engine, x, y, z) {
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

        engine.scene.add(treeGroup);

        // Add collision detection for tree
        const collisionRadius = 0.8;
        const collisionData = {
            object: treeGroup,
            type: 'tree',
            position: new THREE.Vector3(x, y, z),
            radius: collisionRadius  // Collision radius
        };
        
        engine.collidables.push(collisionData);
        
        // Add visual debug if debug mode is on
        if (engine.debugMode) {
            const debugGeometry = new THREE.CylinderGeometry(collisionRadius, collisionRadius, 2, 16);
            const debugMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            debugMesh.position.set(x, 1, z);
            engine.scene.add(debugMesh);
            engine.debugObjects.push(debugMesh);
        }

        return treeGroup;
    }

    // Create a house
    static createHouse(engine, x, y, z) {
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
        engine.interactables.push({
            object: door,
            box: interactBox,
            type: 'door',
            action: () => {
                alert('You entered the house!');
            }
        });

        engine.scene.add(houseGroup);

        // Add collision for house
        engine.collidables.push({
            object: houseGroup,
            type: 'house',
            position: new THREE.Vector3(x, y, z),
            size: new THREE.Vector3(6, 3, 5) // Size of the house box
        });

        return houseGroup;
    }

    // Create water
    static createWater(engine, x, y, z) {
        const waterGeometry = new THREE.BoxGeometry(20, 0.5, 20);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x1E90FF,
            transparent: true,
            opacity: 0.7
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.position.set(x, y, z);
        engine.scene.add(water);

        return water;
    }

    // Create a collectible heart
    static createCollectible(engine, x, y, z) {
        const collectibleGroup = new THREE.Group();
        collectibleGroup.position.set(x, y, z);

        // Collectible base (heart container)
        const heartGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const heartMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0x330000, // Add glow effect
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
        engine.scene.add(collectibleGroup);

        // Make it interactable
        const interactBox = new THREE.Box3().setFromObject(heart);
        interactBox.expandByScalar(1);
        engine.interactables.push({
            object: heart,
            box: interactBox,
            type: 'collectible',
            action: () => {
                if (engine.playerHealth < engine.maxHealth) {
                    engine.playerHealth++;
                    UI.updateHealth(engine);
                    engine.scene.remove(collectibleGroup);

                    // Remove from interactables
                    const index = engine.interactables.findIndex(i => i.object === heart);
                    if (index > -1) {
                        engine.interactables.splice(index, 1);
                    }
                }
            }
        });

        return collectibleGroup;
    }

    // Create a sign
    static createSign(engine, x, y, z) {
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

        engine.scene.add(signGroup);

        // Make it interactable
        const interactBox = new THREE.Box3().setFromObject(board);
        interactBox.expandByScalar(0.5);
        engine.interactables.push({
            object: board,
            box: interactBox,
            type: 'sign',
            action: () => {
                alert('Welcome to Hyrule Field! Watch out for enemies!');
            }
        });

        // Add collision for sign
        engine.collidables.push({
            object: signGroup,
            type: 'sign',
            position: new THREE.Vector3(x, y, z),
            radius: 0.5
        });

        return signGroup;
    }

    // Update collectibles
    static updateCollectibles(engine, deltaTime) {
        engine.interactables.forEach(interactable => {
            if (interactable.type === 'collectible') {
                const collectible = interactable.object;

                // Update float animation
                collectible.userData.time += deltaTime;
                collectible.position.y = collectible.userData.originalY +
                    Math.sin(collectible.userData.time * collectible.userData.floatSpeed) *
                    collectible.userData.floatHeight;

                // Update rotation
                collectible.rotation.y += collectible.userData.rotationSpeed;

                // Add pulsing glow effect
                const pulseIntensity = (Math.sin(collectible.userData.time * 3) * 0.25) + 0.75;
                collectible.material.emissiveIntensity = pulseIntensity;

                // Check for proximity to player for visual feedback
                const distanceToPlayer = engine.player.position.distanceTo(collectible.parent.position);
                if (distanceToPlayer < 3) {
                    // Speed up rotation and pulse when player is near
                    collectible.rotation.y += collectible.userData.rotationSpeed * 2;
                }
            }
        });
    }

    // Update environment elements
    static updateEnvironment(engine, deltaTime) {
        // Update grass and foliage (subtle wind animation)
        engine.scene.traverse(object => {
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
}

// Export the Environment class
window.Environment = Environment;