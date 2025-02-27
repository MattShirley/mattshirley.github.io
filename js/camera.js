/**
 * Camera module for the Zelda-like 3D Game Engine
 * Contains camera updates and effects
 */

class Camera {
    // Initialize camera properties
    static setup(engine) {
        // Third-person camera setup
        engine.cameraOffset = new THREE.Vector3(0, 1.5, 3);
        engine.cameraLookOffset = new THREE.Vector3(0, 0.5, 0);
        engine.cameraIdealPosition = new THREE.Vector3();
    }

    // Update camera position and orientation
    static update(engine, deltaTime) {
        if (!engine.player) return;

        if (engine.targetLocked && engine.currentTarget) {
            // Get direction vector from player to target
            const playerToTarget = new THREE.Vector3();
            playerToTarget.subVectors(engine.currentTarget.position, engine.player.position).normalize();
            
            // Get the current player-to-target distance
            const distanceToTarget = engine.player.position.distanceTo(engine.currentTarget.position);
            
            // Calculate optimal camera position slightly higher and behind player
            const cameraPos = new THREE.Vector3();
            // Start at player position
            cameraPos.copy(engine.player.position);
            // Move backward along the player-to-target axis (in reverse)
            const backDistance = engine.mouseControls.orbitDistance + 1.0; // Slightly further back
            const backVector = playerToTarget.clone().multiplyScalar(-backDistance);
            cameraPos.add(backVector);
            // Raise camera height based on distance to target (higher when further away)
            const heightFactor = 1.5 + (distanceToTarget * 0.1); // Dynamic height
            cameraPos.y += engine.cameraOffset.y * heightFactor;

            // Add offset to right side for more cinematic view during combat
            const rightVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), playerToTarget).normalize();
            cameraPos.add(rightVector.multiplyScalar(1.0));

            // Smoothly move camera with dynamic speed based on how fast the target is moving
            const targetMoveSpeed = (engine.currentTarget.lastPosition) ? 
                engine.currentTarget.position.distanceTo(engine.currentTarget.lastPosition) / deltaTime : 0;
            engine.currentTarget.lastPosition = engine.currentTarget.position.clone();
            
            // Faster camera movement when target is moving quickly
            const lerpSpeed = 5 + (targetMoveSpeed * 2);
            engine.camera.position.lerp(cameraPos, lerpSpeed * deltaTime);

            // Calculate ideal look target - dynamic positioning between player and enemy
            // When enemy is closer, look more at the enemy; when further, look more at midpoint
            const proximityFactor = Math.min(1, 4 / distanceToTarget);
            const lookTarget = new THREE.Vector3();
            lookTarget.copy(engine.player.position).lerp(
                engine.currentTarget.position, 
                0.3 + (proximityFactor * 0.4) // Weighted more toward enemy at close range
            );
            // Add slight height for better angle
            lookTarget.y += 0.7;
            
            engine.camera.lookAt(lookTarget);

            // Add dynamic camera shake during combat based on distance
            if (engine.player.isAttacking) {
                const shakeIntensity = 0.015 - (distanceToTarget * 0.002); // More intense at close range
                const shakeAmount = Math.max(0.003, Math.min(0.015, shakeIntensity)); 
                engine.camera.position.x += (Math.random() - 0.5) * shakeAmount;
                engine.camera.position.y += (Math.random() - 0.5) * shakeAmount;
                engine.camera.position.z += (Math.random() - 0.5) * shakeAmount;
            }
        } else {
            // Standard third-person camera
            // Calculate camera position based on orbit distance and rotation
            const cameraPos = new THREE.Vector3();

            // Convert spherical coordinates to Cartesian
            cameraPos.x = Math.sin(engine.mouseControls.cameraRotation.y) * Math.cos(engine.mouseControls.cameraRotation.x) * engine.mouseControls.orbitDistance;
            cameraPos.y = Math.sin(engine.mouseControls.cameraRotation.x) * engine.mouseControls.orbitDistance + engine.cameraOffset.y;
            cameraPos.z = Math.cos(engine.mouseControls.cameraRotation.y) * Math.cos(engine.mouseControls.cameraRotation.x) * engine.mouseControls.orbitDistance;

            // Add to player position
            cameraPos.add(engine.player.position);

            // Add slight camera lag effect for more natural movement
            if (engine.lastPlayerPos) {
                const playerMoveDelta = new THREE.Vector3().subVectors(engine.player.position, engine.lastPlayerPos);
                const moveMagnitude = playerMoveDelta.length();

                if (moveMagnitude > 0.01) { // Only apply when significant movement occurs
                    const lagFactor = 0.05;
                    const lag = playerMoveDelta.clone().multiplyScalar(-lagFactor);
                    cameraPos.add(lag);
                }
            }

            // Remember player position for next frame
            engine.lastPlayerPos = engine.player.position.clone();

            // Smoothly move camera with dynamic damping based on player movement
            const playerSpeed = engine.player.velocity ? engine.player.velocity.length() : 0;
            const dampingFactor = 5 + (playerSpeed * 0.5); // More damping when moving fast
            engine.camera.position.lerp(cameraPos, dampingFactor * deltaTime);

            // Look at player with slight offset for better perspective
            const lookTarget = new THREE.Vector3();
            lookTarget.copy(engine.player.position).add(engine.cameraLookOffset);
            engine.camera.lookAt(lookTarget);
        }

        // Advanced camera collision detection
        // Prevent camera from going through solid objects
        const rayStart = new THREE.Vector3();
        rayStart.copy(engine.player.position);
        rayStart.y += 1; // Eye level

        const rayDirection = new THREE.Vector3();
        rayDirection.subVectors(engine.camera.position, rayStart).normalize();

        const rayLength = engine.player.position.distanceTo(engine.camera.position);
        const raycaster = new THREE.Raycaster(rayStart, rayDirection, 0.1, rayLength);

        // Check against all collidable objects
        const collidableObjects = engine.scene.children.filter(obj => {
            // Filter out the player and non-solid objects
            return obj !== engine.player;
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
                engine.camera.position.lerp(adjustedPosition, 10 * deltaTime);

                // Fade out objects between camera and player for visibility
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

        // Apply subtle camera shake on landing from jump
        if (engine.player.onGround && engine.player.velocity && engine.player.velocity.y < -5) {
            const shakeAmount = Math.min(Math.abs(engine.player.velocity.y) * 0.01, 0.05);

            const applyShake = () => {
                engine.camera.position.y += (Math.random() - 0.5) * shakeAmount;
                shakeAmount *= 0.9; // Decay the shake

                if (shakeAmount > 0.001) {
                    requestAnimationFrame(applyShake);
                }
            };

            requestAnimationFrame(applyShake);
        }
    }

    // Update target reticle position
    static updateTargetReticle(engine) {
        if (!engine.targetLocked || !engine.currentTarget) return;

        const vector = new THREE.Vector3();
        const widthHalf = engine.width / 2;
        const heightHalf = engine.height / 2;

        engine.currentTarget.updateMatrixWorld();
        vector.setFromMatrixPosition(engine.currentTarget.matrixWorld);
        vector.project(engine.camera);

        vector.x = (vector.x * widthHalf) + widthHalf;
        vector.y = -(vector.y * heightHalf) + heightHalf;

        engine.reticle.style.left = `${vector.x}px`;
        engine.reticle.style.top = `${vector.y}px`;

        // Hide reticle if target is behind camera
        if (vector.z > 1) {
            engine.reticle.style.display = 'none';
        } else {
            engine.reticle.style.display = 'block';
        }
    }

    // Toggle target lock
    static toggleTargetLock(engine) {
        if (engine.enemies.length === 0) {
            console.log("No enemies to target");
            return;
        }

        if (!engine.targetLocked) {
            // Find closest enemy
            let closestEnemy = null;
            let closestDistance = Infinity;

            engine.enemies.forEach(enemy => {
                const distance = engine.player.position.distanceTo(enemy.position);
                if (distance < closestDistance && distance < 15) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            });

            if (closestEnemy) {
                engine.currentTarget = closestEnemy;
                engine.targetLocked = true;
                engine.reticle.style.display = 'block';
                
                // Immediately face the enemy when locking on
                const targetDirection = new THREE.Vector3()
                    .subVectors(closestEnemy.position, engine.player.position)
                    .normalize();
                targetDirection.y = 0; // Keep on horizontal plane
                
                const targetPosition = new THREE.Vector3()
                    .copy(engine.player.position)
                    .add(targetDirection);
                engine.player.lookAt(targetPosition);
                
                console.log("Target locked on enemy at distance:", closestDistance);
            } else {
                console.log("No enemies within range");
            }
        } else {
            engine.targetLocked = false;
            engine.currentTarget = null;
            engine.reticle.style.display = 'none';
            console.log("Target lock released");
        }
    }
}

// Export the Camera class
window.Camera = Camera;