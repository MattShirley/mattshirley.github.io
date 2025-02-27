/**
 * Player module for the Zelda-like 3D Game Engine
 * Contains player creation, movement, and combat functionality
 */

class Player {
    // Create player character
    static create(engine) {
        // Create a group for the entire player character
        const player = new THREE.Group();
        
        // Position player higher above the ground to avoid being stuck in the pathway
        player.position.set(0, 1.0, 0);
        engine.scene.add(player);
        
        // Create a group for the actual character model
        const characterModel = new THREE.Group();
        
        // DO NOT rotate the character model - leave it in its original orientation
        // so we can control its rotation separately from the sword
        
        player.add(characterModel);
        
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
        const swordHolder = new THREE.Object3D();
        swordHolder.position.set(0, 1.1, 0); // Position at center of player torso
        
        // In Zelda games, the sword is held on the character's back or at their side
        // and points in the same direction the character is facing
        
        player.add(swordHolder);
        
        // Create a better-looking sword with blade and hilt
        // Blade
        const swordBladeGeometry = new THREE.BoxGeometry(0.05, 0.6, 0.1);
        const swordMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            roughness: 0.2,
            metalness: 0.8 
        });
        const sword = new THREE.Mesh(swordBladeGeometry, swordMaterial);
        // Position the sword to point forward
        // This makes it point in the same direction as the character's face
        sword.position.set(0, 0, 0.4); // Move forward (positive Z is forward)
        sword.rotation.x = -Math.PI / 2; // Point sword forward
        swordHolder.add(sword);
        
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
        sword.add(handle);
        
        // Sword hilt
        const hiltGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.04);
        const hiltMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xd4af37, // Gold
            roughness: 0.3,
            metalness: 0.9
        });
        const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
        hilt.position.y = -0.3;
        sword.add(hilt);
        
        // Add debug helper to visualize attack hitbox
        if (engine.debugMode) {
            const hitboxGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const hitboxMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.3,
                wireframe: true
            });
            const attackHitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
            attackHitbox.position.set(0, 0, 1.0); // Position in front of player (positive Z)
            attackHitbox.visible = false; // Hide until attacking
            player.add(attackHitbox);
            player.attackHitbox = attackHitbox;
            engine.debugObjects.push(attackHitbox);
        }

        // Create a shield holder
        const shieldHolder = new THREE.Object3D();
        shieldHolder.position.set(0, 1.1, 0); // Position at center of torso
        player.add(shieldHolder);
        
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
        shieldHolder.add(shield);
        
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
        player.velocity = new THREE.Vector3(0, 0, 0);
        player.onGround = true;
        player.speed = 5;
        player.turnSpeed = 2;
        player.jumpHeight = 5;
        player.isAttacking = false;
        player.radius = 0.3; // For collision detection

        // Store references to limbs for animations
        player.leftArm = leftUpperArm;
        player.rightArm = rightUpperArm;
        player.leftLeg = leftThigh;
        player.rightLeg = rightThigh;
        
        // Store references to weapon holders
        player.swordHolder = swordHolder;
        player.sword = sword;
        player.shieldHolder = shieldHolder;
        
        // Camera target (slightly above player's head)
        const cameraTarget = new THREE.Object3D();
        cameraTarget.position.y = 2;
        player.add(cameraTarget);
        player.cameraTarget = cameraTarget;

        // Position player in an open area
        player.position.set(5, 1.0, 5);

        return player;
    }

    // Update player movement and animations
    static update(engine, deltaTime) {
        if (!engine.player) return;

        // Store original position for collision detection
        const originalPosition = engine.player.position.clone();

        // Handle player movement
        const playerDirection = new THREE.Vector3(0, 0, 0);

        // Calculate forward direction based on camera orientation when not target locked
        let forward = new THREE.Vector3(0, 0, -1);
        let right = new THREE.Vector3(1, 0, 0);
        
        // Determine movement directions based on target lock state
        if (engine.targetLocked && engine.currentTarget) {
            // ===== TARGET LOCKED MODE =====
            // Get direction vector to the target
            const targetDirection = new THREE.Vector3()
                .subVectors(engine.currentTarget.position, engine.player.position)
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
            const lookAtTarget = engine.player.position.clone().add(targetDirection);
            
            // Set player rotation to face directly at the target
            engine.player.lookAt(lookAtTarget);
        } else {
            // ===== FREE MOVEMENT MODE =====
            // Movement directions aligned with camera view
            forward.applyEuler(new THREE.Euler(0, engine.mouseControls.cameraRotation.y, 0));
            right.applyEuler(new THREE.Euler(0, engine.mouseControls.cameraRotation.y, 0));
        }

        // Apply movement based on keys
        if (engine.keys.forward) playerDirection.add(forward);
        if (engine.keys.backward) playerDirection.sub(forward);
        if (engine.keys.right) playerDirection.add(right);
        if (engine.keys.left) playerDirection.sub(right);

        // Add subtle bobbing effect and animate limbs when walking
        if (playerDirection.length() > 0) {
            // Update walk animation time
            engine.player.userData.walkTime = (engine.player.userData.walkTime || 0) + deltaTime * 5;
            const walkTime = engine.player.userData.walkTime;
            
            // Animate limbs if references exist
            if (engine.player.leftLeg && engine.player.rightLeg) {
                // Leg swing animation
                const legSwing = Math.PI/8; // Maximum swing angle
                
                // Legs move in opposite phases
                engine.player.leftLeg.rotation.x = Math.sin(walkTime) * legSwing;
                engine.player.rightLeg.rotation.x = Math.sin(walkTime + Math.PI) * legSwing;
                
                // Arm swing animation (opposite to legs for natural walk)
                if (engine.player.leftArm && engine.player.rightArm) {
                    const armSwing = Math.PI/10; // Arm swing angle
                    
                    // Store original rotations if not already stored
                    if (engine.player.leftArm.userData.originalRotation === undefined) {
                        engine.player.leftArm.userData.originalRotation = engine.player.leftArm.rotation.z;
                        engine.player.rightArm.userData.originalRotation = engine.player.rightArm.rotation.z;
                    }
                    
                    // Arms swing opposite to legs for natural walking
                    const leftArmOriginal = engine.player.leftArm.userData.originalRotation;
                    const rightArmOriginal = engine.player.rightArm.userData.originalRotation;
                    
                    engine.player.leftArm.rotation.x = Math.sin(walkTime + Math.PI) * armSwing;
                    engine.player.rightArm.rotation.x = Math.sin(walkTime) * armSwing;
                    
                    // Maintain original side position
                    engine.player.leftArm.rotation.z = leftArmOriginal;
                    engine.player.rightArm.rotation.z = rightArmOriginal;
                }
            }
            
            // Subtle body bob
            const bobHeight = Math.sin(walkTime * 2) * 0.03; // Doubled frequency for realistic gait
            
            // Apply bob to character's children (head, etc.)
            engine.player.children.forEach(child => {
                if (child.position.y > 0.5 && !(child === engine.player.swordHolder || child === engine.player.shieldHolder)) {
                    // Only bob non-weapon parts
                    child.position.y = child.userData.originalY || child.position.y;
                    child.position.y += bobHeight;
                }
            });
        } else {
            // Reset animations when not moving
            if (engine.player.leftLeg && engine.player.rightLeg) {
                engine.player.leftLeg.rotation.x = 0;
                engine.player.rightLeg.rotation.x = 0;
                
                if (engine.player.leftArm && engine.player.rightArm) {
                    engine.player.leftArm.rotation.x = 0;
                    engine.player.rightArm.rotation.x = 0;
                    
                    // Restore original arm positions (T-pose)
                    if (engine.player.leftArm.userData.originalRotation !== undefined) {
                        engine.player.leftArm.rotation.z = engine.player.leftArm.userData.originalRotation;
                        engine.player.rightArm.rotation.z = engine.player.rightArm.userData.originalRotation;
                    }
                }
            }
        }

        // Normalize movement vector and apply velocity
        if (playerDirection.length() > 0) {
            playerDirection.normalize();

            // Apply player speed
            playerDirection.multiplyScalar(engine.player.speed * deltaTime);

            // Calculate new position
            const newPosition = engine.player.position.clone().add(playerDirection);

            // Check for collisions before applying movement
            if (!engine.checkCollision(newPosition)) {
                // No collision, move freely
                engine.player.position.copy(newPosition);
            } else {
                // Try sliding along X axis first
                const slideX = engine.player.position.clone();
                slideX.x = newPosition.x;

                if (!engine.checkCollision(slideX)) {
                    engine.player.position.copy(slideX);
                } else {
                    // Try sliding along Z axis if X failed
                    const slideZ = engine.player.position.clone();
                    slideZ.z = newPosition.z;

                    if (!engine.checkCollision(slideZ)) {
                        engine.player.position.copy(slideZ);
                    } else {
                        // Try to step over small obstacles
                        const elevatedPosition = newPosition.clone();
                        elevatedPosition.y += 0.1; // Try slightly higher
                        
                        if (!engine.checkCollision(elevatedPosition)) {
                            engine.player.position.copy(elevatedPosition);
                        }
                    }
                }
            }

            // Handle player orientation
            if (!engine.targetLocked) {
                // In Ocarina of Time, the character always faces in the direction they're moving
                const moveDir = playerDirection.clone().normalize();
                
                // Face IN the direction of movement (just like in Zelda OoT)
                // If moving forward (W), character faces FORWARD (away from camera)
                // If moving backward (S), character faces BACKWARD (toward camera)
                // If moving left (A), character faces LEFT
                // If moving right (D), character faces RIGHT
                const moveTarget = engine.player.position.clone().add(moveDir);
                engine.player.lookAt(moveTarget);
            }
            // In target-locked mode, orientation was already set above

            // Add footstep effect when moving
            engine.player.userData.lastStepTime = engine.player.userData.lastStepTime || 0;
            engine.player.userData.stepInterval = 0.3; // seconds between footsteps

            if (performance.now() / 1000 - engine.player.userData.lastStepTime > engine.player.userData.stepInterval) {
                // Create subtle dust at feet when moving
                if (engine.player.onGround) {
                    Player.createFootstepDust(engine, engine.player.position.clone());
                    engine.player.userData.lastStepTime = performance.now() / 1000;
                }
            }
        }

        // Handle jumping
        if (engine.keys.jump && engine.player.onGround) {
            engine.player.velocity.y = engine.player.jumpHeight;
            engine.player.onGround = false;
            console.log("Player jumping");
        }

        // Apply gravity
        if (!engine.player.onGround) {
            engine.player.velocity.y -= 9.8 * deltaTime;
            engine.player.position.y += engine.player.velocity.y * deltaTime;

            // Check ground collision - use 1.0 as the ground level now
            if (engine.player.position.y <= 1.0) {
                engine.player.position.y = 1.0;
                engine.player.velocity.y = 0;
                engine.player.onGround = true;
                console.log("Player landed on ground");

                // Create landing dust effect if falling from height
                if (engine.player.velocity.y < -3) {
                    Player.createFootstepDust(engine, engine.player.position.clone(), 2);
                }
            }
        }
    }

    // Handle player attack
    static attack(engine) {
        if (engine.player.isAttacking) return;

        engine.player.isAttacking = true;
        console.log("Player attacking!");

        // If target locked, ensure we're facing the enemy before attacking
        if (engine.targetLocked && engine.currentTarget) {
            // When locked on in Ocarina of Time, Link always faces the enemy
            const targetDirection = new THREE.Vector3()
                .subVectors(engine.currentTarget.position, engine.player.position)
                .normalize();
            targetDirection.y = 0; // Keep on horizontal plane
            
            // Face TOWARD the target (just like Link does when Z-targeting)
            const lookAtPosition = engine.player.position.clone().add(targetDirection);
            engine.player.lookAt(lookAtPosition);
            
            console.log("Attacking while locked on target - character facing toward target");
        }

        // Store initial sword position and rotation
        const initialRotation = engine.player.sword.rotation.x;
        const initialPosition = engine.player.sword.position.clone();

        // Create attack animation object
        const attackAnimation = {
            duration: 400, // ms - slightly faster swing
            startTime: performance.now(),
            complete: false
        };

        // Create sword trail effect
        Player.createSwordTrail(engine);
        
        // Determine attack direction vector (directly in front of player)
        const attackDirection = new THREE.Vector3(0, 0, 1);
        attackDirection.applyQuaternion(engine.player.quaternion);
        
        // Calculate attack position - exactly where the sword will strike
        const attackPosition = engine.player.position.clone().add(
            attackDirection.multiplyScalar(1.2)
        );
        
        // Visualize attack area in debug mode
        if (engine.debugMode && engine.player.attackHitbox) {
            engine.player.attackHitbox.visible = true;
            setTimeout(() => {
                if (engine.player.attackHitbox) engine.player.attackHitbox.visible = false;
            }, 400);
        }
        
        console.log("Attack direction:", attackDirection);
        console.log("Attack position:", attackPosition);

        // Detect hits on enemies - moved to mid-swing for better timing
        setTimeout(() => {
            const hitEnemies = [];
            engine.enemies.forEach(enemy => {
                const distanceToEnemy = engine.player.position.distanceTo(enemy.position);
                
                // Calculate angle between player's forward direction and direction to enemy
                const toEnemy = new THREE.Vector3()
                    .subVectors(enemy.position, engine.player.position)
                    .normalize();
                toEnemy.y = 0; // Keep on horizontal plane
                
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(engine.player.quaternion);
                const angleToEnemy = forward.angleTo(toEnemy);
                
                // Check if enemy is in front of player (within 45 degrees) and in range
                const inAttackAngle = angleToEnemy < Math.PI / 4; // 45 degrees
                const attackRange = engine.targetLocked && engine.currentTarget === enemy ? 3.0 : 2.0;
                
                console.log(`Enemy distance: ${distanceToEnemy.toFixed(2)}, angle: ${(angleToEnemy * 180 / Math.PI).toFixed(2)}°`);
                
                // Calculate if sword can hit enemy - better aligned with visual cues
                // Use positive Z since the sword now points forward with the character
                const swordTip = new THREE.Vector3(0, 0, 1.5).applyQuaternion(engine.player.quaternion).add(engine.player.position);
                const swordDistance = enemy.position.distanceTo(swordTip);
                console.log(`Sword tip distance to enemy: ${swordDistance.toFixed(2)}`);
                
                // Use wider attack angle when target locked and consider the sword's position
                if ((engine.targetLocked && engine.currentTarget === enemy && distanceToEnemy < attackRange) || 
                    (distanceToEnemy < attackRange && inAttackAngle) ||
                    (swordDistance < 1.5)) {
                    
                    console.log("Hit enemy!", enemy);
                    
                    // Damage enemy
                    enemy.health -= 1;
                    hitEnemies.push(enemy);

                    // Enemy knockback - keep it on the horizontal plane to avoid falling through the ground
                    const knockbackDirection = new THREE.Vector3()
                        .subVectors(enemy.position, engine.player.position)
                        .normalize();
                    
                    // Ensure knockback is only horizontal (no Y component)
                    knockbackDirection.y = 0;
                    knockbackDirection.multiplyScalar(1);

                    // Apply knockback on horizontal plane only
                    enemy.position.x += knockbackDirection.x;
                    enemy.position.z += knockbackDirection.z;
                    
                    // Ensure enemy stays at proper height
                    enemy.position.y = Math.max(enemy.position.y, 0.8); // Minimum height to prevent falling

                    // Visual feedback for hit at the actual hit location
                    const hitLocation = enemy.position.clone().sub(knockbackDirection.multiplyScalar(0.3));
                    Player.createHitEffect(engine, hitLocation);

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
                        
                        // Create death effect
                        Player.createDeathEffect(engine, enemy.position);

                        // Wait a moment for the death effect before removing
                        setTimeout(() => {
                            // Double-check the enemy still exists and isn't already removed
                            if (enemy && enemy.parent) {
                                engine.scene.remove(enemy);
                            }

                            // Remove from enemies array
                            const index = engine.enemies.indexOf(enemy);
                            if (index > -1) {
                                engine.enemies.splice(index, 1);
                            }

                            // Remove as target if targeted
                            if (engine.currentTarget === enemy) {
                                engine.currentTarget = null;
                                engine.targetLocked = false;
                                engine.reticle.style.display = 'none';
                            }
                        }, 100);
                    }
                }
            });
        }, 200); // Execute hit detection earlier in the swing

        // Animate the sword swing
        const animateSwordSwing = (timestamp) => {
            if (!engine.player.isAttacking) return;

            const elapsed = timestamp - attackAnimation.startTime;
            const progress = Math.min(elapsed / attackAnimation.duration, 1);

            if (progress < 0.5) {
                // Forward swing (0 to 0.5)
                const swingProgress = progress * 2; // Scale to 0-1
                
                // Swing sword forward - now using swordHolder to rotate entire sword group
                engine.player.swordHolder.rotation.y = engine.lerp(0, -Math.PI/2, engine.easeOutQuad(swingProgress));
                
                // Also adjust the sword's own rotation for extra effect
                engine.player.sword.rotation.x = engine.lerp(initialRotation, initialRotation + Math.PI/4, engine.easeOutQuad(swingProgress));
            } else {
                // Return swing (0.5 to 1)
                const returnProgress = (progress - 0.5) * 2; // Scale to 0-1
                
                // Return sword to original position
                engine.player.swordHolder.rotation.y = engine.lerp(-Math.PI/2, 0, engine.easeInOutQuad(returnProgress));
                engine.player.sword.rotation.x = engine.lerp(initialRotation + Math.PI/4, initialRotation, engine.easeInOutQuad(returnProgress));
            }

            if (progress < 1) {
                requestAnimationFrame(animateSwordSwing);
            } else {
                // Reset after animation completes
                engine.player.swordHolder.rotation.y = 0;
                engine.player.sword.rotation.x = initialRotation;
                engine.player.isAttacking = false;
            }
        };

        // Start animation
        requestAnimationFrame(animateSwordSwing);
    }

    // Create sword trail effect
    static createSwordTrail(engine) {
        // Get sword tip position in world space - now at the end of sword
        const swordTip = new THREE.Vector3(0, 0, 0.7); // End of sword (positive Z)
        engine.player.sword.localToWorld(swordTip);

        // Create sword trail geometry
        const trailGeometry = new THREE.BufferGeometry();
        const vertices = [];

        // Get player's forward direction
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(engine.player.quaternion);
        
        // Get perpendicular vector to create the arc of the sword swing
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(engine.player.quaternion);
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
            const worldPos = engine.player.position.clone().add(new THREE.Vector3(
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
        engine.scene.add(trail);

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
                engine.scene.remove(trail);
            }
        };

        requestAnimationFrame(animateTrail);
    }

    // Create hit effect at position
    static createHitEffect(engine, position) {
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
        engine.scene.add(particles);

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
                engine.scene.remove(particles);
            }
        };

        requestAnimationFrame(animateParticles);
    }

    // Create death effect for enemies
    static createDeathEffect(engine, position) {
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
        engine.scene.add(particleGroup);

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
                engine.scene.remove(particleGroup);
            }
        };

        requestAnimationFrame(animateExplosion);
    }

    // Create dust effect for footsteps or landing
    static createFootstepDust(engine, position, scale = 1) {
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
        engine.scene.add(dustGroup);

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
                engine.scene.remove(dustGroup);
            }
        };

        requestAnimationFrame(animateDust);
    }

    // Reset player position if stuck
    static resetPosition(engine) {
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
            if (!engine.checkCollision(pos)) {
                // Teleport player to this position
                engine.player.position.copy(pos);
                console.log("Reset player to position", pos);
                
                // Reset velocity and set to ground
                engine.player.velocity.set(0, 0, 0);
                engine.player.onGround = true;
                
                // Create a teleport effect
                Player.createFootstepDust(engine, engine.player.position.clone(), 3);
                return true;
            }
        }
        
        // If no safe position found, move up
        engine.player.position.set(0, 5, 0);
        engine.player.velocity.set(0, 0, 0);
        console.log("Elevated player to avoid all obstacles");
        return true;
    }

    // Handle player damage
    static takeDamage(engine, amount) {
        engine.playerHealth = Math.max(0, engine.playerHealth - amount);
        UI.updateHealth(engine);

        // Player knockback
        const knockbackDirection = new THREE.Vector3()
            .subVectors(engine.player.position, engine.currentTarget ? engine.currentTarget.position : engine.camera.position)
            .normalize()
            .multiplyScalar(2);
        knockbackDirection.y = 1;
        engine.player.position.add(knockbackDirection);

        // Visual feedback for damage
        const flashInterval = setInterval(() => {
            engine.player.visible = !engine.player.visible;
        }, 100);

        setTimeout(() => {
            clearInterval(flashInterval);
            engine.player.visible = true;
        }, 500);

        // Death
        if (engine.playerHealth <= 0) {
            alert('Game Over! Refresh to restart.');

            // Death animation
            engine.player.rotation.x = -Math.PI / 2; // Fall over
        }

        // Create hit effect at player position
        Player.createHitEffect(engine, engine.player.position.clone());
    }
}

// Export the Player class
window.Player = Player;