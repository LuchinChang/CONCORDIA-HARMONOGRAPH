// ============================================================================
// GRAVITY SYSTEM - Newtonian N-Body Physics Engine
// Implements real gravitational physics with F = GMm/r²
// ============================================================================

class GravitySystem {
  constructor() {
    // Gravitational constant (scaled for visual simulation)
    // Real G = 6.674×10⁻¹¹, we use a scaled version for pixels
    this.G = 1000;

    // Time step for integration (smaller = more accurate but slower)
    this.dt = 0.016; // ~60fps equivalent

    // Simulation speed multiplier
    this.timeScale = 1.0;

    // Bodies in the system
    this.sun = null;
    this.planets = [];
    this.comets = [];

    // Mode: 'scientific' or 'reactive'
    this.mode = 'scientific';

    // Audio modulation values (for reactive mode)
    this.audioModulation = {
      bassMultiplier: 1.0,      // Affects sun's gravitational pull
      midMultiplier: 1.0,       // Affects orbital energy
      trebleMultiplier: 1.0,    // Affects comet spawning
      beatPulse: 0,             // Gravitational pulse on beat
    };

    // Softening parameter to prevent singularities at close distances
    this.softeningLength = 10;

    // Trail settings
    this.maxTrailLength = 100;
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  initialize(centerX, centerY, screenScale) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.screenScale = screenScale || min(width, height) * 0.4;

    // Create the Sun at center
    this.sun = new CelestialBody({
      name: 'Sun',
      mass: 10000,
      radius: 20,
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      color: [45, 100, 100], // Yellow-orange
      isFixed: true, // Sun doesn't move
    });

    // Create planets with realistic orbital parameters
    this.planets = [];
    this.createPlanets();

    // Clear comets
    this.comets = [];
  }

  createPlanets() {
    // Planet configurations based on relative solar system ratios
    // Using semi-major axis and calculating initial velocity for stable orbit
    const planetConfigs = [
      {
        name: 'A', // Mercury-like (inner, fast)
        mass: 50,
        radius: 4,
        semiMajorAxis: 0.2, // Fraction of screenScale
        eccentricity: 0.1,
        color: [200, 80, 100], // Blue
        startAngle: 0,
      },
      {
        name: 'B', // Venus-like
        mass: 80,
        radius: 6,
        semiMajorAxis: 0.35,
        eccentricity: 0.05,
        color: [60, 80, 100], // Yellow
        startAngle: PI / 4,
      },
      {
        name: 'C', // Earth-like
        mass: 100,
        radius: 7,
        semiMajorAxis: 0.5,
        eccentricity: 0.08,
        color: [120, 70, 90], // Green
        startAngle: PI / 2,
      },
      {
        name: 'D', // Mars-like (outer, slow)
        mass: 60,
        radius: 5,
        semiMajorAxis: 0.7,
        eccentricity: 0.12,
        color: [320, 80, 100], // Magenta
        startAngle: 3 * PI / 4,
      },
    ];

    for (let config of planetConfigs) {
      const planet = this.createOrbitalBody(config);
      this.planets.push(planet);
    }
  }

  createOrbitalBody(config) {
    // Calculate initial position at perihelion (closest point)
    // r_perihelion = a(1 - e)
    const a = config.semiMajorAxis * this.screenScale;
    const e = config.eccentricity;
    const rPerihelion = a * (1 - e);

    // Initial position
    const angle = config.startAngle;
    const x = this.centerX + rPerihelion * cos(angle);
    const y = this.centerY + rPerihelion * sin(angle);

    // Calculate orbital velocity at perihelion using vis-viva equation
    // v² = GM(2/r - 1/a)
    const GM = this.G * this.sun.mass;
    const vPerihelion = sqrt(GM * (2 / rPerihelion - 1 / a));

    // Velocity is perpendicular to radius (tangential)
    const vAngle = angle + HALF_PI;
    const vx = vPerihelion * cos(vAngle);
    const vy = vPerihelion * sin(vAngle);

    return new CelestialBody({
      name: config.name,
      mass: config.mass,
      radius: config.radius,
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      color: config.color,
      semiMajorAxis: a,
      eccentricity: e,
    });
  }

  // ========================================
  // COMET MANAGEMENT
  // ========================================

  spawnComet() {
    // Spawn comets from the edges with hyperbolic or parabolic trajectories
    const edge = floor(random(4));
    let x, y;

    switch (edge) {
      case 0: x = random(width); y = -50; break;
      case 1: x = width + 50; y = random(height); break;
      case 2: x = random(width); y = height + 50; break;
      case 3: x = -50; y = random(height); break;
    }

    // Calculate velocity to create a trajectory that passes near the sun
    const dx = this.centerX - x;
    const dy = this.centerY - y;
    const dist = sqrt(dx * dx + dy * dy);

    // Angle towards center with some offset for interesting trajectory
    const angleToCenter = atan2(dy, dx);
    const offset = random(-PI / 4, PI / 4);
    const angle = angleToCenter + offset;

    // Speed based on distance (conservation of energy consideration)
    // Closer spawn = faster to make it interesting
    const speed = random(3, 8);

    const comet = new CelestialBody({
      name: 'Comet',
      mass: random(1, 5), // Very light
      radius: random(1.5, 3),
      x: x,
      y: y,
      vx: speed * cos(angle),
      vy: speed * sin(angle),
      color: [0, 0, 100], // White
      isComet: true,
      life: 255,
      maxTrailLength: floor(random(30, 60)),
    });

    this.comets.push(comet);
    return comet;
  }

  // ========================================
  // PHYSICS UPDATE
  // ========================================

  update(analysis = null) {
    const dt = this.dt * this.timeScale;

    // Apply audio modulation in reactive mode
    if (this.mode === 'reactive' && analysis) {
      this.applyAudioModulation(analysis);
    }

    // Update planets using Velocity Verlet integration
    for (let planet of this.planets) {
      this.updateBody(planet, dt);
    }

    // Update comets
    for (let i = this.comets.length - 1; i >= 0; i--) {
      const comet = this.comets[i];
      this.updateBody(comet, dt);

      // Decay comet life
      comet.life -= 0.5;

      // Remove dead or escaped comets
      if (comet.life <= 0 ||
          comet.x < -200 || comet.x > width + 200 ||
          comet.y < -200 || comet.y > height + 200) {
        this.comets.splice(i, 1);
      }
    }
  }

  updateBody(body, dt) {
    if (body.isFixed) return;

    // Store trail
    body.trail.push({ x: body.x, y: body.y });
    while (body.trail.length > (body.maxTrailLength || this.maxTrailLength)) {
      body.trail.shift();
    }

    // Calculate gravitational acceleration
    const acc = this.calculateAcceleration(body);

    // Velocity Verlet integration (more stable than Euler)
    // x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
    body.x += body.vx * dt + 0.5 * acc.ax * dt * dt;
    body.y += body.vy * dt + 0.5 * acc.ay * dt * dt;

    // Calculate new acceleration at new position
    const newAcc = this.calculateAcceleration(body);

    // v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
    body.vx += 0.5 * (acc.ax + newAcc.ax) * dt;
    body.vy += 0.5 * (acc.ay + newAcc.ay) * dt;
  }

  calculateAcceleration(body) {
    let ax = 0;
    let ay = 0;

    // Gravitational pull from the Sun
    const sunAcc = this.gravitationalAcceleration(body, this.sun);
    ax += sunAcc.ax;
    ay += sunAcc.ay;

    // For comets: also affected by planets
    if (body.isComet) {
      for (let planet of this.planets) {
        const planetAcc = this.gravitationalAcceleration(body, planet);
        ax += planetAcc.ax;
        ay += planetAcc.ay;
      }
    }

    // Apply beat pulse in reactive mode (gravitational wave effect)
    if (this.mode === 'reactive' && this.audioModulation.beatPulse > 0) {
      const dx = this.centerX - body.x;
      const dy = this.centerY - body.y;
      const dist = sqrt(dx * dx + dy * dy);
      const pulseStrength = this.audioModulation.beatPulse * 50 / (dist + 50);
      ax += (dx / dist) * pulseStrength;
      ay += (dy / dist) * pulseStrength;
    }

    return { ax, ay };
  }

  gravitationalAcceleration(body, attractor) {
    const dx = attractor.x - body.x;
    const dy = attractor.y - body.y;

    // Distance with softening to prevent singularities
    const distSq = dx * dx + dy * dy + this.softeningLength * this.softeningLength;
    const dist = sqrt(distSq);

    // F = GMm/r², a = F/m = GM/r²
    let GM = this.G * attractor.mass;

    // Apply audio modulation to sun's gravity in reactive mode
    if (this.mode === 'reactive' && attractor === this.sun) {
      GM *= this.audioModulation.bassMultiplier;
    }

    const aMag = GM / distSq;

    // Direction
    const ax = aMag * (dx / dist);
    const ay = aMag * (dy / dist);

    return { ax, ay };
  }

  // ========================================
  // AUDIO MODULATION (Reactive Mode)
  // ========================================

  applyAudioModulation(analysis) {
    // Bass affects sun's gravitational pull
    this.audioModulation.bassMultiplier = 1.0 + analysis.smoothedBass * 0.5;

    // Mid affects orbital energy (time scale)
    this.audioModulation.midMultiplier = 1.0 + analysis.mid * 0.3;
    this.timeScale = this.audioModulation.midMultiplier;

    // Beat creates a gravitational pulse
    if (analysis.isBeat) {
      this.audioModulation.beatPulse = analysis.beatIntensity;
    } else {
      this.audioModulation.beatPulse *= 0.9; // Decay
    }
  }

  // ========================================
  // MODE SWITCHING
  // ========================================

  setMode(mode) {
    this.mode = mode;
    if (mode === 'scientific') {
      // Reset to pure physics
      this.audioModulation.bassMultiplier = 1.0;
      this.audioModulation.midMultiplier = 1.0;
      this.audioModulation.beatPulse = 0;
      this.timeScale = 1.0;
    }
  }

  // ========================================
  // GETTERS
  // ========================================

  getSun() {
    return this.sun;
  }

  getPlanets() {
    return this.planets;
  }

  getComets() {
    return this.comets;
  }

  getPlanetByName(name) {
    return this.planets.find(p => p.name === name);
  }

  // ========================================
  // RESET
  // ========================================

  reset() {
    this.comets = [];
    for (let planet of this.planets) {
      planet.trail = [];
    }
    // Reinitialize planets to original positions
    this.createPlanets();
  }
}

// ============================================================================
// CELESTIAL BODY - Base class for Sun, Planets, and Comets
// ============================================================================

class CelestialBody {
  constructor(config) {
    this.name = config.name || 'Body';
    this.mass = config.mass || 1;
    this.radius = config.radius || 5;

    // Position
    this.x = config.x || 0;
    this.y = config.y || 0;

    // Velocity
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;

    // Color (HSB)
    this.color = config.color || [0, 0, 100];

    // Orbital parameters (for reference)
    this.semiMajorAxis = config.semiMajorAxis || 0;
    this.eccentricity = config.eccentricity || 0;

    // Flags
    this.isFixed = config.isFixed || false;
    this.isComet = config.isComet || false;

    // Trail for visualization
    this.trail = [];
    this.maxTrailLength = config.maxTrailLength || 100;

    // Life (for comets)
    this.life = config.life || 255;
    this.maxLife = config.life || 255;
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  getVelocity() {
    return { vx: this.vx, vy: this.vy };
  }

  getSpeed() {
    return sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  // Calculate orbital energy (for diagnostics)
  getOrbitalEnergy(sunMass, G) {
    const v2 = this.vx * this.vx + this.vy * this.vy;
    const kinetic = 0.5 * this.mass * v2;

    // Potential energy (needs distance to sun)
    // Would need centerX, centerY passed in
    return kinetic; // Simplified
  }
}
