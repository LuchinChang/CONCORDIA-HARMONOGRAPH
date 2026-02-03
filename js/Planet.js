// ============================================================================
// PLANET CLASS - Supports both legacy circular orbits and Newtonian physics
// ============================================================================

class Planet {
  constructor(baseRadius, baseSpeed, phaseOffset, name) {
    this.name = name;

    // Legacy circular orbit parameters
    this.baseRadius = baseRadius;     // Base orbital radius (fraction of screen)
    this.currentRadius = baseRadius;  // Current radius (can be modulated)
    this.baseSpeed = baseSpeed;       // Orbital speed multiplier
    this.phaseOffset = phaseOffset;   // Starting angle offset
    this.angle = phaseOffset;

    // Position (used by both modes)
    this.x = 0;
    this.y = 0;

    // Velocity (for physics mode)
    this.vx = 0;
    this.vy = 0;

    // Physical properties
    this.mass = 100;        // Mass for gravitational calculations
    this.radius = 5;        // Visual radius
    this.color = [200, 80, 100]; // HSB color

    // For smooth radius transitions (legacy mode)
    this.targetRadius = baseRadius;
    this.radiusLerp = 0.12;

    // Trail for visualization
    this.trail = [];
    this.maxTrailLength = 100;

    // Mode flag - set by HarmonographSystem
    this.usePhysics = false;

    // Reference to gravity system (set externally)
    this.gravityBody = null;
  }

  // ========================================
  // CONFIGURATION
  // ========================================

  setPhysicalProperties(mass, radius, color) {
    this.mass = mass;
    this.radius = radius;
    this.color = color;
    return this;
  }

  setGravityBody(body) {
    this.gravityBody = body;
    return this;
  }

  setUsePhysics(usePhysics) {
    this.usePhysics = usePhysics;
    return this;
  }

  // Set target radius (will lerp towards it) - legacy mode
  setTargetRadius(radius) {
    this.targetRadius = radius;
  }

  // Reset radius to base - legacy mode
  resetRadius() {
    this.targetRadius = this.baseRadius;
  }

  // ========================================
  // UPDATE
  // ========================================

  update(centerX, centerY, elapsedTime, cycleDuration, audioModulation = 0) {
    if (this.usePhysics && this.gravityBody) {
      // Physics mode: position comes from gravity body
      this.x = this.gravityBody.x;
      this.y = this.gravityBody.y;
      this.vx = this.gravityBody.vx;
      this.vy = this.gravityBody.vy;

      // Update trail
      this.trail = this.gravityBody.trail;
    } else {
      // Legacy circular orbit mode
      this.updateCircularOrbit(centerX, centerY, elapsedTime, cycleDuration, audioModulation);
    }
  }

  updateCircularOrbit(centerX, centerY, elapsedTime, cycleDuration, audioModulation) {
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

    // Update trail for legacy mode too
    this.trail.push({ x: this.x, y: this.y });
    while (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  // ========================================
  // GETTERS
  // ========================================

  getPosition() {
    return { x: this.x, y: this.y };
  }

  getVelocity() {
    return { vx: this.vx, vy: this.vy };
  }

  getSpeed() {
    return sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  getCurrentRadius() {
    return this.currentRadius;
  }

  getTrail() {
    return this.trail;
  }

  // ========================================
  // DRAWING (Optional - can be used for debug)
  // ========================================

  draw(g) {
    if (!g) g = window; // Use main canvas if no graphics buffer

    g.push();

    // Draw trail
    if (this.trail.length > 1) {
      g.noFill();
      for (let i = 0; i < this.trail.length - 1; i++) {
        const t = i / (this.trail.length - 1);
        const alpha = t * 30;
        g.stroke(this.color[0], this.color[1], this.color[2], alpha);
        g.strokeWeight(1);
        g.line(
          this.trail[i].x, this.trail[i].y,
          this.trail[i + 1].x, this.trail[i + 1].y
        );
      }
    }

    // Draw planet
    g.noStroke();
    g.fill(this.color[0], this.color[1], this.color[2]);
    g.ellipse(this.x, this.y, this.radius * 2);

    g.pop();
  }
}
