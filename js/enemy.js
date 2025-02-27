/**
 * Enemy module for the Zelda-like 3D Game Engine
 * Contains enemy creation and behavior functionality
 */

class Enemy {
    // Create enemy
    static create(engine, x, y, z) {
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
        enemy.speed = 2;
        enemy.attackRange = 1.5;
        enemy.type = 'enemy';
        enemy.maxDetectionRange = 10;
        enemy.aggro = false;
        enemy.lastAttackTime = 0;
        enemy.attackCooldown = 2; // seconds

        engine.scene.add(enemy);
        engine.enemies.push(enemy);

        return enemy;
    }

    // Update all enemies
    static update(engine, deltaTime) {
        engine.enemies.forEach(enemy => {
            // Get distance to player
            const distanceToPlayer = enemy.position.distanceTo(engine.player.position);

            // Enemy AI behavior
            if (distanceToPlayer < enemy.maxDetectionRange) {
                enemy.aggro = true;

                // Move towards player if not in attack range
                if (distanceToPlayer > enemy.attackRange) {
                    const direction = new THREE.Vector3()
                        .subVectors(engine.player.position, enemy.position)
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
                        engine.player.position.x,
                        enemy.position.y,
                        engine.player.position.z
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
                    const currentTime = engine.clock.getElapsedTime();
                    if (currentTime - enemy.lastAttackTime > enemy.attackCooldown) {
                        Player.takeDamage(engine, 1);
                        enemy.lastAttackTime = currentTime;
                        
                        // Animate attack by moving forward slightly
                        if (enemy.body) {
                            const attackDirection = new THREE.Vector3()
                                .subVectors(engine.player.position, enemy.position)
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
                                    enemy.body.position.copy(startPosition).lerp(endPosition, engine.easeOutQuad(t));
                                } else {
                                    // Move back
                                    const t = (progress - 0.5) * 2; // Scale to 0-1 for second half
                                    enemy.body.position.copy(endPosition).lerp(startPosition, engine.easeInOutQuad(t));
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
                    engine.player.position.x,
                    enemy.position.y,
                    engine.player.position.z
                );
                enemy.lookAt(lookPos);
                
                // Then fine-tune eye tracking
                enemy.body.children.forEach(child => {
                    if (child.children.length > 0 && child.name !== "mouth") {
                        child.lookAt(engine.player.position);
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
}

// Export the Enemy class
window.Enemy = Enemy;