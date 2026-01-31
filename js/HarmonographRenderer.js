// ============================================================================
// HARMONOGRAPH RENDERER - Rhythmically responsive line drawing
// ============================================================================

class HarmonographRenderer {
  constructor(graphics) {
    this.graphics = graphics;

    // Beat-triggered hue shift (added to base hue, not replacing it)
    this.beatHueShift = 0;           // Current beat-driven hue offset
    this.hueShiftAmount = 15;        // How much hue shifts per beat (reduced)

    // Line quality settings
    this.noiseScale = 0.02;          // Perlin noise scale for electricity
    this.noiseTime = 0;              // Time offset for noise animation
  }

  // Call this on each beat to shift the color offset
  onBeat(intensity) {
    // Add to the hue shift (this is added to each pair's base hue)
    this.beatHueShift = (this.beatHueShift + this.hueShiftAmount * intensity) % 360;
  }

  // Draw a link line between two planets
  // Now with volume-based line quality (thin/smooth vs thick/electric)
  drawLinkLine(posA, posB, baseHue, analysis, settings) {
    const g = this.graphics;

    // Use the pair's BASE HUE + beat shift + centroid variation
    // Each pair keeps its own color identity
    let centroidShift = map(analysis.smoothedCentroid, 0, 1, -15, 15);
    let finalHue = (baseHue + this.beatHueShift + centroidShift + 360) % 360;

    // If a beat just hit, use a brighter, more saturated color
    let saturation, brightness;
    if (analysis.isBeat) {
      saturation = 90;
      brightness = 100;
    } else {
      saturation = map(analysis.smoothedVolume, 0, 0.3, 50, 80);
      brightness = map(analysis.smoothedVolume, 0, 0.2, 60, 95);
    }

    // ========================================
    // LINE QUALITY BASED ON VOLUME
    // ========================================
    // Low volume = thin, smooth lines
    // High volume = thick, jagged/electric lines

    let volumeNormalized = constrain(analysis.smoothedVolume / 0.4, 0, 1);

    // Base weight: thin when quiet, thicker when loud
    let weight = lerp(0.3, 2.5, volumeNormalized) * settings.baseLineWeight;
    weight = constrain(weight, 0.2, 4);

    // Opacity: slightly more opaque when loud
    let opacity = settings.lineOpacity * lerp(0.8, 1.2, volumeNormalized);

    // ========================================
    // DRAW THE LINE
    // ========================================

    if (analysis.isTense && settings.noiseAmount > 0) {
      // HIGH ENERGY: Draw jagged/electric line
      this.drawElectricLine(posA, posB, finalHue, saturation, brightness, weight, opacity, analysis, settings);
    } else if (volumeNormalized > 0.3) {
      // MEDIUM ENERGY: Draw slightly noisy line
      this.drawNoisyLine(posA, posB, finalHue, saturation, brightness, weight, opacity, analysis, settings);
    } else {
      // LOW ENERGY: Draw smooth, thin line
      g.stroke(finalHue, saturation, brightness, opacity);
      g.strokeWeight(weight);
      g.line(posA.x, posA.y, posB.x, posB.y);
    }

    // Update noise time for animation
    this.noiseTime += 0.1;
  }

  // Draw an electric/jagged line with vertex noise
  drawElectricLine(posA, posB, hue, saturation, brightness, weight, opacity, analysis, settings) {
    const g = this.graphics;

    // Number of segments for the jagged line
    let segments = 12;

    // Noise amount scales with volume and settings
    let noiseAmount = settings.noiseAmount / 100;
    let jitterStrength = lerp(2, 25, noiseAmount) * analysis.smoothedVolume * 3;

    // Draw multiple passes for glow effect
    for (let pass = 0; pass < 3; pass++) {
      let passWeight = weight * (1 - pass * 0.25);
      let passOpacity = opacity * (1 - pass * 0.3);

      g.stroke(hue, saturation - pass * 10, brightness, passOpacity);
      g.strokeWeight(passWeight);
      g.noFill();
      g.beginShape();

      for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        let x = lerp(posA.x, posB.x, t);
        let y = lerp(posA.y, posB.y, t);

        // Add noise displacement (perpendicular to line)
        if (i > 0 && i < segments) {
          let angle = atan2(posB.y - posA.y, posB.x - posA.x) + HALF_PI;
          let noiseVal = noise(x * this.noiseScale, y * this.noiseScale, this.noiseTime + pass);
          let displacement = (noiseVal - 0.5) * 2 * jitterStrength;

          x += cos(angle) * displacement;
          y += sin(angle) * displacement;
        }

        g.vertex(x, y);
      }

      g.endShape();
    }

    // Add bright core line
    g.stroke(hue, saturation - 20, 100, opacity * 0.7);
    g.strokeWeight(weight * 0.4);
    g.line(posA.x, posA.y, posB.x, posB.y);
  }

  // Draw a slightly noisy line (medium energy)
  drawNoisyLine(posA, posB, hue, saturation, brightness, weight, opacity, analysis, settings) {
    const g = this.graphics;

    let segments = 6;
    let noiseAmount = settings.noiseAmount / 100;
    let jitterStrength = lerp(1, 8, noiseAmount) * analysis.smoothedVolume * 2;

    g.stroke(hue, saturation, brightness, opacity);
    g.strokeWeight(weight);
    g.noFill();
    g.beginShape();

    for (let i = 0; i <= segments; i++) {
      let t = i / segments;
      let x = lerp(posA.x, posB.x, t);
      let y = lerp(posA.y, posB.y, t);

      if (i > 0 && i < segments) {
        let angle = atan2(posB.y - posA.y, posB.x - posA.x) + HALF_PI;
        let noiseVal = noise(x * this.noiseScale * 2, y * this.noiseScale * 2, this.noiseTime);
        let displacement = (noiseVal - 0.5) * 2 * jitterStrength;

        x += cos(angle) * displacement;
        y += sin(angle) * displacement;
      }

      g.vertex(x, y);
    }

    g.endShape();
  }

  // Draw midpoint with beat-reactive behavior
  drawMidpoint(posA, posB, baseHue, analysis, settings) {
    const g = this.graphics;

    // Calculate midpoint
    let midX = (posA.x + posB.x) / 2;
    let midY = (posA.y + posB.y) / 2;

    // Add noise to midpoint if tense
    if (analysis.isTense && settings.noiseAmount > 0) {
      let noiseAmount = settings.noiseAmount / 100;
      let jitterAmount = lerp(2, 15, noiseAmount) * analysis.smoothedVolume * 2;

      midX += randomGaussian(0, jitterAmount);
      midY += randomGaussian(0, jitterAmount);
    }

    // Use the pair's BASE HUE + beat shift + centroid variation
    let centroidShift = map(analysis.smoothedCentroid, 0, 1, -15, 15);
    let finalHue = (baseHue + this.beatHueShift + centroidShift + 360) % 360;

    // Point size based on volume and beat
    let baseSize = settings.baseLineWeight * 2;
    let sizeMultiplier = analysis.isBeat ? 2.5 : 1;
    let pointSize = baseSize + map(analysis.smoothedVolume, 0, 0.3, 0, 3);
    pointSize *= sizeMultiplier;
    pointSize = constrain(pointSize, 0.5, 8);

    let saturation = analysis.isBeat ? 90 : map(analysis.smoothedVolume, 0, 0.3, 50, 80);
    let brightness = analysis.isBeat ? 100 : map(analysis.smoothedVolume, 0, 0.2, 70, 100);

    // Draw glow on beat
    if (analysis.isBeat) {
      g.noStroke();
      g.fill(finalHue, saturation - 20, brightness, settings.lineOpacity * 0.3);
      g.ellipse(midX, midY, pointSize * 3, pointSize * 3);
    }

    g.noStroke();
    g.fill(finalHue, saturation, brightness, settings.lineOpacity);
    g.ellipse(midX, midY, pointSize, pointSize);
  }
}
