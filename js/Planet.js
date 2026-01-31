// ============================================================================
// PLANET CLASS - Represents an orbiting celestial body
// ============================================================================

class Planet {
  constructor(baseRadius, baseSpeed, phaseOffset, name) {
    this.baseRadius = baseRadius;
    this.baseSpeed = baseSpeed;
    this.phaseOffset = phaseOffset;
    this.name = name;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
  }

  update(audioModulation, centerX, centerY, elapsedTime, cycleDuration) {
    let dynamicRadius = this.baseRadius * min(width, height) * 0.35;
    dynamicRadius *= (1 + audioModulation * 0.05);

    // Calculate angle based on elapsed time
    this.angle = this.phaseOffset + this.baseSpeed * (elapsedTime / cycleDuration) * TWO_PI;

    this.x = centerX + dynamicRadius * cos(this.angle);
    this.y = centerY + dynamicRadius * sin(this.angle);
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }
}
