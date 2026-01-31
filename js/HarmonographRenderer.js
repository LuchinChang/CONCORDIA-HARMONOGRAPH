// ============================================================================
// HARMONOGRAPH RENDERER - Handles drawing of link lines and midpoints
// ============================================================================

class HarmonographRenderer {
  constructor(graphics) {
    this.graphics = graphics;
  }

  // Draw a link line between two planets
  drawLinkLine(posA, posB, hue, volume, isTense, settings) {
    const g = this.graphics;

    // Subtle hue variation based on spectral centroid
    let hueShift = map(settings.spectralCentroid, 0, 1, -30, 30);
    let finalHue = (hue + hueShift + 360) % 360;

    // Calculate stroke weight
    let weight = settings.baseLineWeight + map(volume, 0, 0.3, 0, 0.3);
    weight = constrain(weight, 0.1, 2);

    // Lower saturation and brightness for subtle appearance
    let saturation = map(volume, 0, 0.3, 40, 70);
    let brightness = map(volume, 0, 0.2, 60, 90);

    g.stroke(finalHue, saturation, brightness, settings.lineOpacity);
    g.strokeWeight(weight);

    if (isTense && settings.noiseAmount > 0) {
      this.drawNoisyLine(posA, posB, finalHue, saturation, brightness, weight, settings);
    } else {
      g.line(posA.x, posA.y, posB.x, posB.y);
    }
  }

  // Draw a noisy/jittery line
  drawNoisyLine(posA, posB, hue, saturation, brightness, weight, settings) {
    const g = this.graphics;

    // Scale jitter by noise amount setting (0-100)
    let jitterScale = settings.noiseAmount / 50; // Normalize to reasonable range
    let jitterAmount = map(settings.volume, settings.avgVolume, 0.5, 1, 8) * jitterScale;
    jitterAmount = constrain(jitterAmount, 0.5, 15);

    // Draw jittered lines
    let numJitterLines = 3;
    for (let i = 0; i < numJitterLines; i++) {
      let jitterA = {
        x: posA.x + randomGaussian(0, jitterAmount),
        y: posA.y + randomGaussian(0, jitterAmount)
      };
      let jitterB = {
        x: posB.x + randomGaussian(0, jitterAmount),
        y: posB.y + randomGaussian(0, jitterAmount)
      };

      g.stroke(hue, saturation, brightness, settings.lineOpacity * 0.5);
      g.strokeWeight(weight * 0.8);
      g.line(jitterA.x, jitterA.y, jitterB.x, jitterB.y);
    }

    // Core line
    g.stroke(hue, saturation - 10, brightness + 10, settings.lineOpacity * 0.8);
    g.strokeWeight(weight * 0.6);
    g.line(posA.x, posA.y, posB.x, posB.y);
  }

  // Draw midpoint between two planets
  drawMidpoint(posA, posB, hue, volume, isTense, settings) {
    const g = this.graphics;

    // Calculate midpoint
    let midX = (posA.x + posB.x) / 2;
    let midY = (posA.y + posB.y) / 2;

    // Apply noise to midpoint if tense
    if (isTense && settings.noiseAmount > 0) {
      let jitterScale = settings.noiseAmount / 50;
      let jitterAmount = map(volume, settings.avgVolume, 0.5, 2, 12) * jitterScale;
      jitterAmount = constrain(jitterAmount, 1, 20);

      midX += randomGaussian(0, jitterAmount);
      midY += randomGaussian(0, jitterAmount);
    }

    // Hue variation
    let hueShift = map(settings.spectralCentroid, 0, 1, -30, 30);
    let finalHue = (hue + hueShift + 360) % 360;

    // Point size based on volume
    let pointSize = settings.baseLineWeight * 2 + map(volume, 0, 0.3, 0, 2);
    pointSize = constrain(pointSize, 0.5, 4);

    let saturation = map(volume, 0, 0.3, 50, 80);
    let brightness = map(volume, 0, 0.2, 70, 100);

    g.noStroke();
    g.fill(finalHue, saturation, brightness, settings.lineOpacity);
    g.ellipse(midX, midY, pointSize, pointSize);
  }
}
