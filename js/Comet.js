// ============================================================================
// COMET CLASS - Elegant white comets with beautiful tails
// ============================================================================

class Comet {
  constructor() {
    this.trail = [];
    this.reset();
  }

  reset() {
    // Spawn from edges of the screen
    let edge = floor(random(4));
    switch(edge) {
      case 0: this.x = random(width); this.y = -20; break;
      case 1: this.x = width + 20; this.y = random(height); break;
      case 2: this.x = random(width); this.y = height + 20; break;
      case 3: this.x = -20; this.y = random(height); break;
    }

    // Direction towards center with some randomness
    let targetX = width/2 + random(-300, 300);
    let targetY = height/2 + random(-300, 300);
    let angle = atan2(targetY - this.y, targetX - this.x);

    this.baseSpeed = random(1.5, 4);
    this.vx = cos(angle) * this.baseSpeed;
    this.vy = sin(angle) * this.baseSpeed;

    // Visual properties - more elegant
    this.size = random(1.5, 3);
    this.life = 255;
    this.maxLife = 255;
    this.tailLength = floor(random(20, 40)); // Longer, more beautiful tails

    // Clear trail on reset
    this.trail = [];
  }

  update(intensity, isHighIntensity) {
    // Store trail position
    this.trail.push({ x: this.x, y: this.y, life: this.life });

    // Limit trail length
    while (this.trail.length > this.tailLength) {
      this.trail.shift();
    }

    // Speed modulation based on intensity (subtle)
    let speedMultiplier = 1 + intensity * 1.5;

    if (isHighIntensity) {
      // Subtle wandering during high intensity
      let noiseScale = 0.005;
      let noiseVal = noise(this.x * noiseScale, this.y * noiseScale, millis() * 0.0005);
      let wanderAngle = noiseVal * TWO_PI;

      this.vx += cos(wanderAngle) * 0.2;
      this.vy += sin(wanderAngle) * 0.2;

      // Limit velocity
      let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > 8) {
        this.vx = (this.vx / speed) * 8;
        this.vy = (this.vy / speed) * 8;
      }
    }

    // Update position
    this.x += this.vx * speedMultiplier;
    this.y += this.vy * speedMultiplier;

    // Slower fade for longer visibility
    this.life -= 0.8;

    // Check if comet should be reset
    if (this.life <= 0 ||
        this.x < -100 || this.x > width + 100 ||
        this.y < -100 || this.y > height + 100) {
      return true;
    }
    return false;
  }

  draw() {
    push();
    colorMode(RGB, 255);

    // Draw the beautiful tail with gradient
    noFill();

    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        let t = i / (this.trail.length - 1);

        // Tail gets thinner and more transparent towards the end
        let alpha = t * t * (this.life / this.maxLife) * 180;
        let weight = this.size * t * 0.8;

        stroke(255, 255, 255, alpha);
        strokeWeight(weight);

        line(
          this.trail[i].x, this.trail[i].y,
          this.trail[i + 1].x, this.trail[i + 1].y
        );
      }
    }

    // Draw the comet head with glow
    noStroke();

    // Outer glow
    let glowAlpha = (this.life / this.maxLife) * 30;
    fill(255, 255, 255, glowAlpha);
    ellipse(this.x, this.y, this.size * 6);

    // Middle glow
    fill(255, 255, 255, glowAlpha * 2);
    ellipse(this.x, this.y, this.size * 3);

    // Bright core
    fill(255, 255, 255, (this.life / this.maxLife) * 255);
    ellipse(this.x, this.y, this.size * 1.5);

    pop();
  }
}
