// ============================================================================
// PLANET CLASS - Now with dynamic radius based on pitch
// ============================================================================

class Planet {
  constructor(baseRadius, baseSpeed, phaseOffset, name) {
    this.baseRadius = baseRadius;     // Base orbital radius (fraction of screen)
    this.currentRadius = baseRadius;  // Current radius (can be modulated)
    this.baseSpeed = baseSpeed;       // Orbital speed multiplier
    this.phaseOffset = phaseOffset;   // Starting angle offset
    this.name = name;

    this.angle = phaseOffset;
    this.x = 0;
    this.y = 0;

    // For smooth radius transitions
    this.targetRadius = baseRadius;
    this.radiusLerp = 0.12;  // How fast radius changes (responsive but smooth)
  }

  // Set target radius (will lerp towards it)
  setTargetRadius(radius) {
    this.targetRadius = radius;
  }

  // Reset radius to base
  resetRadius() {
    this.targetRadius = this.baseRadius;
  }

  update(centerX, centerY, elapsedTime, cycleDuration, audioModulation = 0) {
    // Smoothly interpolate to target radius
    this.currentRadius = lerp(this.currentRadius, this.targetRadius, this.radiusLerp);

    // Calculate actual pixel radius based on screen size
    let dynamicRadius = this.currentRadius * min(width, height) * 0.35;

    // Subtle breathing effect from volume (reduced from before)
    dynamicRadius *= (1 + audioModulation * 0.03);

    // Calculate angle based on elapsed time
    this.angle = this.phaseOffset + this.baseSpeed * (elapsedTime / cycleDuration) * TWO_PI;

    // Update position
    this.x = centerX + dynamicRadius * cos(this.angle);
    this.y = centerY + dynamicRadius * sin(this.angle);
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  // Get the current orbital radius (for debugging/display)
  getCurrentRadius() {
    return this.currentRadius;
  }
}
