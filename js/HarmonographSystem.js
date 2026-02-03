// ============================================================================
// HARMONOGRAPH SYSTEM - Self-contained drawing system with frequency reactivity
// Supports auto-scaling to ensure patterns stay within viewport
// ============================================================================

class HarmonographSystem {
  constructor(x, y, w, h, frequencyRange, id) {
    // Position and dimensions
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.id = id || 'system';

    // Frequency range this system reacts to: 'bass', 'mid', 'treble', 'all'
    this.frequencyRange = frequencyRange || 'all';

    // Create graphics buffer
    this.pg = createGraphics(w, h);
    this.pg.colorMode(HSB, 360, 100, 100, 100);
    this.pg.background(0);

    // Create renderer for this system
    this.renderer = new HarmonographRenderer(this.pg);

    // Drawing mode: 'lines', 'midpoints', 'both'
    this.drawMode = 'lines';

    // Active pairs (array of pair IDs like ['AB', 'AC'])
    this.activePairs = ['AB'];

    // Planet pair definitions with hues
    this.pairDefinitions = {
      'AB': { p1: 0, p2: 1, hue: 200 },
      'AC': { p1: 0, p2: 2, hue: 320 },
      'BC': { p1: 1, p2: 2, hue: 60 },
      'AD': { p1: 0, p2: 3, hue: 140 },
      'BD': { p1: 1, p2: 3, hue: 280 },
      'CD': { p1: 2, p2: 3, hue: 20 },
    };

    // Center point for this system (relative to buffer)
    this.centerX = w / 2;
    this.centerY = h / 2;

    // ========================================
    // AUTO-SCALING CONFIGURATION
    // ========================================
    // Calculate the maximum safe radius based on viewport
    this.viewportPadding = 20;  // Pixels of padding from edge
    this.maxSafeRadius = (min(w, h) / 2) - this.viewportPadding;

    // Scale factor to apply to all positions
    this.autoScale = 1.0;
    this.calculateAutoScale();

    // Initialize gravity system (for physics modes)
    this.gravitySystem = new GravitySystem();
    this.gravitySystem.initialize(this.centerX, this.centerY, min(w, h) * 0.4);

    // Initialize planets
    this.planets = [
      new Planet(0.75, 7, 0, 'A'),
      new Planet(0.5, 11, PI / 4, 'B'),
      new Planet(0.35, 13, PI / 2, 'C'),
      new Planet(0.2, 17, 3 * PI / 4, 'D'),
    ];

    // Link planets to gravity bodies
    this.linkPlanetsToGravity();

    // Physics mode: 'legacy', 'reactive'
    // NOTE: 'scientific' mode removed - now only audio-reactive
    this.physicsMode = 'legacy';

    // Timing
    this.startTime = millis();
    this.cycleDuration = 240000;

    // Frame counter for draw interval
    this.frameCounter = 0;

    // ========================================
    // FREQUENCY-SPECIFIC PULSE SCALES
    // ========================================
    this.pulseScale = 1.0;
    this.targetPulseScale = 1.0;
    this.pulseDecay = 0.92;

    // Jitter amount (for treble reactivity)
    this.jitterAmount = 0;

    // Trail settings
    this.trailFadeAmount = 0;
    this.persistentTrails = true;

    // Visual settings
    this.lineOpacity = 30;
    this.baseLineWeight = 0.8;
    this.noiseAmount = 60;
    this.drawInterval = 1;

    // ========================================
    // SHOW OPTIONS
    // In reactive mode, we typically want ONLY lines/trails
    // ========================================
    this.showOrbits = false;    // Default: false (hide orbital trails)
    this.showPlanets = false;   // Default: false (hide planet bodies)
    this.showSun = false;       // Default: false (hide sun)
    this.showBodies = false;    // Master toggle for all celestial bodies
  }

  // ========================================
  // AUTO-SCALING CALCULATION
  // Ensures the pattern always stays within viewport
  // ========================================
  calculateAutoScale() {
    // The outermost planet has baseRadius of 0.75
    // Calculate maximum possible radius in pixels
    const maxPlanetRadius = 0.75 * min(this.width, this.height) * 0.35;

    // Add some margin for audio modulation (can expand up to 10%)
    const maxPossibleRadius = maxPlanetRadius * 1.1;

    // Calculate scale factor to keep everything within safe bounds
    if (maxPossibleRadius > this.maxSafeRadius) {
      this.autoScale = this.maxSafeRadius / maxPossibleRadius;
    } else {
      this.autoScale = 1.0;
    }
  }

  // Link Planet objects to CelestialBody objects in gravity system
  linkPlanetsToGravity() {
    const gravityPlanets = this.gravitySystem.getPlanets();
    for (let i = 0; i < this.planets.length && i < gravityPlanets.length; i++) {
      this.planets[i].setGravityBody(gravityPlanets[i]);
      this.planets[i].color = gravityPlanets[i].color;
    }
  }

  // ========================================
  // CONFIGURATION METHODS
  // ========================================

  setPhysicsMode(mode) {
    // Only allow 'legacy' and 'reactive' modes now
    if (['legacy', 'reactive'].includes(mode)) {
      this.physicsMode = mode;

      const usePhysics = mode === 'reactive';
      for (let planet of this.planets) {
        planet.setUsePhysics(usePhysics);
      }

      if (mode === 'reactive') {
        this.gravitySystem.setMode('reactive');
      }
    }
    return this;
  }

  setDrawMode(mode) {
    if (['lines', 'midpoints', 'both'].includes(mode)) {
      this.drawMode = mode;
    }
    return this;
  }

  setActivePairs(pairsArray) {
    this.activePairs = pairsArray.filter(p => this.pairDefinitions[p]);
    return this;
  }

  setFrequencyRange(range) {
    if (['bass', 'mid', 'treble', 'all'].includes(range)) {
      this.frequencyRange = range;
    }
    return this;
  }

  setTrailPersistence(persistent, fadeAmount = 0) {
    this.persistentTrails = persistent;
    this.trailFadeAmount = fadeAmount;
    return this;
  }

  setVisualSettings(settings) {
    if (settings.lineOpacity !== undefined) this.lineOpacity = settings.lineOpacity;
    if (settings.baseLineWeight !== undefined) this.baseLineWeight = settings.baseLineWeight;
    if (settings.noiseAmount !== undefined) this.noiseAmount = settings.noiseAmount;
    if (settings.drawInterval !== undefined) this.drawInterval = settings.drawInterval;
    return this;
  }

  setPlanetPhaseOffsets(offsets) {
    offsets.forEach((offset, i) => {
      if (this.planets[i]) {
        this.planets[i].phaseOffset = offset;
        this.planets[i].angle = offset;
      }
    });
    return this;
  }

  setShowOptions(showOrbits, showPlanets, showSun) {
    this.showOrbits = showOrbits;
    this.showPlanets = showPlanets;
    this.showSun = showSun;
    return this;
  }

  // Master toggle for showing all celestial bodies
  setShowBodies(show) {
    this.showBodies = show;
    this.showOrbits = show;
    this.showPlanets = show;
    this.showSun = show;
    return this;
  }

  setGravityStrength(G) {
    this.gravitySystem.G = G;
    return this;
  }

  setTimeScale(scale) {
    this.gravitySystem.timeScale = scale;
    return this;
  }

  // ========================================
  // RESIZE HANDLING
  // ========================================

  resize(x, y, w, h) {
    this.x = x;
    this.y = y;

    if (this.width !== w || this.height !== h) {
      const oldPg = this.pg;

      this.width = w;
      this.height = h;
      this.centerX = w / 2;
      this.centerY = h / 2;

      // Recalculate auto-scale for new dimensions
      this.maxSafeRadius = (min(w, h) / 2) - this.viewportPadding;
      this.calculateAutoScale();

      this.pg = createGraphics(w, h);
      this.pg.colorMode(HSB, 360, 100, 100, 100);
      this.pg.image(oldPg, 0, 0, w, h);

      this.renderer = new HarmonographRenderer(this.pg);

      // Reinitialize gravity system with new dimensions
      this.gravitySystem.initialize(this.centerX, this.centerY, min(w, h) * 0.4);
      this.linkPlanetsToGravity();
    }
  }

  // ========================================
  // UPDATE METHOD
  // ========================================

  update(analyzer) {
    const analysis = analyzer ? analyzer.getAnalysis() : null;
    const elapsedTime = millis() - this.startTime;

    // ========================================
    // UPDATE PHYSICS OR LEGACY
    // ========================================

    if (this.physicsMode === 'reactive') {
      // Reactive mode: update gravity system with audio
      this.gravitySystem.update(analysis);

      // Sync planet positions from gravity bodies
      for (let planet of this.planets) {
        planet.update(this.centerX, this.centerY, elapsedTime, this.cycleDuration, 0);
      }
    } else {
      // Legacy mode: circular orbits with audio reactivity
      this.updateLegacy(analyzer, elapsedTime);
    }

    // ========================================
    // FREQUENCY-SPECIFIC VISUAL EFFECTS
    // ========================================

    if (analysis) {
      this.updateVisualEffects(analysis, analyzer);
    }
  }

  updateLegacy(analyzer, elapsedTime) {
    if (!analyzer) return;

    const analysis = analyzer.getAnalysis();
    let volumeModulation = analysis.smoothedVolume;
    let shouldApplyOrbitModulation = false;

    switch (this.frequencyRange) {
      case 'bass':
        volumeModulation = analysis.smoothedBass;
        break;
      case 'mid':
        shouldApplyOrbitModulation = true;
        volumeModulation = analysis.mid;
        break;
      case 'treble':
        volumeModulation = analysis.treble;
        break;
      case 'all':
      default:
        shouldApplyOrbitModulation = true;
        break;
    }

    // Update orbit radii based on pitch (legacy mode only)
    if (shouldApplyOrbitModulation) {
      let pitchRadius = map(analysis.smoothedCentroid, 0, 1, 0.7, 0.3);
      this.planets[1].setTargetRadius(pitchRadius);
      let secondaryRadius = lerp(0.35, pitchRadius * 0.7, 0.5);
      this.planets[2].setTargetRadius(secondaryRadius);
    }

    // Update planet positions
    for (let planet of this.planets) {
      planet.update(
        this.centerX,
        this.centerY,
        elapsedTime,
        this.cycleDuration,
        volumeModulation
      );
    }
  }

  updateVisualEffects(analysis, analyzer) {
    // Get the appropriate beat state for this system's frequency range
    let bandBeat = { isBeat: false, intensity: 0 };

    switch (this.frequencyRange) {
      case 'bass':
        bandBeat = { isBeat: analysis.bassBeat, intensity: analysis.bassBeatIntensity };
        if (bandBeat.isBeat) {
          this.targetPulseScale = 1.0 + (bandBeat.intensity * 0.12);
          this.renderer.onBeat(bandBeat.intensity);
        }
        break;

      case 'mid':
        bandBeat = { isBeat: analysis.midBeat, intensity: analysis.midBeatIntensity };
        if (bandBeat.isBeat) {
          this.targetPulseScale = 1.0 + (bandBeat.intensity * 0.08);
          this.renderer.onBeat(bandBeat.intensity * 0.7);
        }
        break;

      case 'treble':
        bandBeat = { isBeat: analysis.trebleBeat, intensity: analysis.trebleBeatIntensity };
        this.jitterAmount = analysis.treble * 100;
        if (bandBeat.isBeat) {
          this.targetPulseScale = 1.0 + (bandBeat.intensity * 0.05);
          this.renderer.onBeat(bandBeat.intensity * 0.5);
        }
        break;

      case 'all':
      default:
        // Use bass beat as primary for combined mode
        bandBeat = { isBeat: analysis.isBeat, intensity: analysis.beatIntensity };
        if (bandBeat.isBeat) {
          this.targetPulseScale = 1.0 + (bandBeat.intensity * 0.08);
          this.renderer.onBeat(bandBeat.intensity);
        }
        this.jitterAmount = analysis.treble * 60;
        break;
    }

    // Decay pulse scale
    this.pulseScale = lerp(this.pulseScale, 1.0, 1 - this.pulseDecay);
    if (this.targetPulseScale > this.pulseScale) {
      this.pulseScale = this.targetPulseScale;
    }
    this.targetPulseScale = 1.0;
  }

  // ========================================
  // DRAW METHOD
  // ========================================

  draw(analyzer, shouldDraw = true) {
    const analysis = analyzer ? analyzer.getAnalysis() : { isBeat: false, beatIntensity: 0, bassBeat: false, midBeat: false, trebleBeat: false };

    // Get the band-specific beat for fading
    let bandBeat = false;
    let bandIntensity = 0;

    switch (this.frequencyRange) {
      case 'bass':
        bandBeat = analysis.bassBeat;
        bandIntensity = analysis.bassBeatIntensity;
        break;
      case 'mid':
        bandBeat = analysis.midBeat;
        bandIntensity = analysis.midBeatIntensity;
        break;
      case 'treble':
        bandBeat = analysis.trebleBeat;
        bandIntensity = analysis.trebleBeatIntensity;
        break;
      default:
        bandBeat = analysis.isBeat;
        bandIntensity = analysis.beatIntensity;
    }

    // ========================================
    // APPLY TRAIL FADE
    // ========================================

    let fadeAmount = this.persistentTrails ? this.trailFadeAmount : 25;

    // Extra fade on beat for this band
    if (bandBeat) {
      fadeAmount = max(fadeAmount, map(bandIntensity, 0.5, 1, 5, 15));
    }

    if (fadeAmount > 0) {
      this.pg.push();
      this.pg.noStroke();
      this.pg.fill(0, 0, 0, fadeAmount);
      this.pg.rect(0, 0, this.width, this.height);
      this.pg.pop();
    }

    // ========================================
    // CHECK DRAW INTERVAL
    // ========================================

    if (!shouldDraw) {
      this.frameCounter++;
      if (this.frameCounter < this.drawInterval) {
        return this.pg;
      }
      this.frameCounter = 0;
    }

    // ========================================
    // DRAW CELESTIAL BODIES (if enabled)
    // ========================================

    if (this.showBodies || this.showSun) {
      if (this.physicsMode === 'reactive' && this.showSun) {
        this.drawSun();
      }
    }

    if (this.showBodies || this.showOrbits) {
      if (this.physicsMode === 'reactive' && this.showOrbits) {
        this.drawOrbitalTrails();
      }
    }

    if (this.showBodies || this.showPlanets) {
      if (this.physicsMode === 'reactive' && this.showPlanets) {
        this.drawPlanetBodies();
      }
    }

    // ========================================
    // DRAW ACTIVE PAIRS (Harmonograph lines)
    // Apply auto-scaling to positions
    // ========================================

    const drawSettings = {
      lineOpacity: this.lineOpacity,
      baseLineWeight: this.baseLineWeight,
      noiseAmount: this.frequencyRange === 'treble' ? this.jitterAmount : this.noiseAmount,
    };

    for (let pairId of this.activePairs) {
      const pair = this.pairDefinitions[pairId];
      if (!pair) continue;

      // Get planet positions and apply auto-scaling
      const rawPosA = this.planets[pair.p1].getPosition();
      const rawPosB = this.planets[pair.p2].getPosition();

      // Scale positions relative to center
      const posA = this.scalePosition(rawPosA);
      const posB = this.scalePosition(rawPosB);

      if (this.drawMode === 'lines' || this.drawMode === 'both') {
        this.renderer.drawLinkLine(posA, posB, pair.hue, analysis, drawSettings);
      }

      if (this.drawMode === 'midpoints' || this.drawMode === 'both') {
        this.renderer.drawMidpoint(posA, posB, pair.hue, analysis, drawSettings);
      }
    }

    return this.pg;
  }

  // Scale a position relative to center using autoScale
  scalePosition(pos) {
    return {
      x: this.centerX + (pos.x - this.centerX) * this.autoScale,
      y: this.centerY + (pos.y - this.centerY) * this.autoScale
    };
  }

  drawSun() {
    const sun = this.gravitySystem.getSun();
    if (!sun) return;

    this.pg.push();
    this.pg.noStroke();

    // Outer glow
    this.pg.fill(45, 80, 100, 10);
    this.pg.ellipse(sun.x, sun.y, sun.radius * 4);

    // Middle glow
    this.pg.fill(45, 90, 100, 20);
    this.pg.ellipse(sun.x, sun.y, sun.radius * 2.5);

    // Core
    this.pg.fill(45, 100, 100, 80);
    this.pg.ellipse(sun.x, sun.y, sun.radius * 1.5);

    this.pg.pop();
  }

  drawOrbitalTrails() {
    this.pg.push();
    this.pg.noFill();

    for (let planet of this.planets) {
      const trail = planet.getTrail();
      if (trail.length < 2) continue;

      for (let i = 0; i < trail.length - 1; i++) {
        const t = i / (trail.length - 1);
        const alpha = t * 20;
        this.pg.stroke(planet.color[0], planet.color[1], planet.color[2], alpha);
        this.pg.strokeWeight(1);

        // Scale trail positions
        const scaledP1 = this.scalePosition(trail[i]);
        const scaledP2 = this.scalePosition(trail[i + 1]);
        this.pg.line(scaledP1.x, scaledP1.y, scaledP2.x, scaledP2.y);
      }
    }

    this.pg.pop();
  }

  drawPlanetBodies() {
    this.pg.push();
    this.pg.noStroke();

    for (let planet of this.planets) {
      const rawPos = planet.getPosition();
      const pos = this.scalePosition(rawPos);
      const body = planet.gravityBody;
      const radius = body ? body.radius : 5;

      // Glow
      this.pg.fill(planet.color[0], planet.color[1], planet.color[2], 30);
      this.pg.ellipse(pos.x, pos.y, radius * 3);

      // Body
      this.pg.fill(planet.color[0], planet.color[1], planet.color[2], 80);
      this.pg.ellipse(pos.x, pos.y, radius * 2);
    }

    this.pg.pop();
  }

  // ========================================
  // GETTERS
  // ========================================

  getGraphics() {
    return this.pg;
  }

  getPulseScale() {
    return this.pulseScale;
  }

  getGravitySystem() {
    return this.gravitySystem;
  }

  getPlanets() {
    return this.planets;
  }

  getAutoScale() {
    return this.autoScale;
  }

  // ========================================
  // RESET
  // ========================================

  reset() {
    this.pg.background(0);
    this.startTime = millis();
    this.frameCounter = 0;
    this.pulseScale = 1.0;
    this.targetPulseScale = 1.0;
    this.jitterAmount = 0;

    // Reset gravity system
    this.gravitySystem.reset();
    this.linkPlanetsToGravity();

    // Reset planet radii (legacy mode)
    for (let planet of this.planets) {
      planet.resetRadius();
      planet.trail = [];
    }
  }
}
