/**
 * Main module for the Zelda-like 3D Game Engine
 * Integrates all modules and controls the game loop
 */

class ZeldaLikeEngine extends Core {
    constructor(containerId) {
        super(containerId);
        
        // Setup the world
        Environment.setup(this);
        
        // Setup camera
        Camera.setup(this);
        
        // Start the engine
        this.animate();
    }
    
    // Check for player interactions
    checkInteraction() {
        UI.checkInteraction(this);
    }
    
    // Toggle target lock
    toggleTargetLock() {
        Camera.toggleTargetLock(this);
    }
    
    // Player attack
    playerAttack() {
        Player.attack(this);
    }
    
    // Reset player position
    resetPlayerPosition() {
        Player.resetPosition(this);
    }

    // Animation loop
    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // Update day/night cycle
        this.updateDayNightCycle(deltaTime);

        // Update player
        Player.update(this, deltaTime);

        // Update camera
        Camera.update(this, deltaTime);

        // Update enemies
        Enemy.update(this, deltaTime);

        // Update collectibles
        Environment.updateCollectibles(this, deltaTime);

        // Update environment
        Environment.updateEnvironment(this, deltaTime);

        // Update target reticle
        Camera.updateTargetReticle(this);

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Make the engine class available globally
window.ZeldaLikeEngine = ZeldaLikeEngine;