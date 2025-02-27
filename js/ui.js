/**
 * UI module for the Zelda-like 3D Game Engine
 * Contains UI elements and HUD functionality
 */

class UI {
    // Create health UI
    static createHealth(engine) {
        const healthContainer = document.getElementById('health-container');
        healthContainer.innerHTML = '';

        for (let i = 0; i < engine.maxHealth; i++) {
            const heart = document.createElement('div');
            heart.className = i < engine.playerHealth ? 'heart' : 'heart empty';
            healthContainer.appendChild(heart);
        }
    }

    // Update health UI
    static updateHealth(engine) {
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index < engine.playerHealth) {
                heart.classList.remove('empty');
            } else {
                heart.classList.add('empty');
            }
        });
    }

    // Check for interaction with objects
    static checkInteraction(engine) {
        if (!engine.keys.interact) return;

        const playerBox = new THREE.Box3().setFromObject(engine.player);

        engine.interactables.forEach(interactable => {
            if (playerBox.intersectsBox(interactable.box)) {
                interactable.action();
            }
        });
    }
}

// Export the UI class
window.UI = UI;