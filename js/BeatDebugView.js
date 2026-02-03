// ============================================================================
// BEAT DEBUG VIEW - Multi-Band Audio Oscilloscope
// Shows Bass, Mid, and Treble frequency bands with independent beat detection
// ============================================================================

class BeatDebugView {
  constructor() {
    // Panel settings
    this.panelHeight = 240;  // Taller to fit 3 graphs comfortably
    this.isOpen = false;
    this.animatedHeight = 0;
    this.animationSpeed = 0.15;

    // Rolling buffer settings (5 seconds at 60fps = 300 frames)
    this.bufferLength = 300;

    // Buffers for each frequency band
    this.bassBuffer = [];
    this.midBuffer = [];
    this.trebleBuffer = [];

    // Threshold buffers for each band
    this.bassThresholdBuffer = [];
    this.midThresholdBuffer = [];
    this.trebleThresholdBuffer = [];

    // Beat markers for each band
    this.bassBeatMarkers = [];
    this.midBeatMarkers = [];
    this.trebleBeatMarkers = [];

    // Initialize buffers
    for (let i = 0; i < this.bufferLength; i++) {
      this.bassBuffer.push(0);
      this.midBuffer.push(0);
      this.trebleBuffer.push(0);
      this.bassThresholdBuffer.push(0);
      this.midThresholdBuffer.push(0);
      this.trebleThresholdBuffer.push(0);
    }

    // Colors for each band (HSB)
    this.bassColor = [200, 80, 100];      // Blue (Kick)
    this.midColor = [60, 80, 100];        // Yellow (Snare/Vocal)
    this.trebleColor = [320, 80, 100];    // Magenta (Hi-hat)
    this.thresholdColor = [0, 80, 100];   // Red
    this.beatMarkerColor = [120, 80, 100]; // Green
    this.backgroundColor = [0, 0, 10, 220];

    // Graph layout
    this.paddingLeft = 80;
    this.paddingRight = 20;
    this.paddingTop = 10;
    this.paddingBottom = 15;
    this.graphGap = 8;  // Gap between graphs

    // Current values for display
    this.currentBass = 0;
    this.currentMid = 0;
    this.currentTreble = 0;

    // Current thresholds
    this.currentBassThreshold = 0;
    this.currentMidThreshold = 0;
    this.currentTrebleThreshold = 0;

    // Beat states
    this.bassBeat = false;
    this.midBeat = false;
    this.trebleBeat = false;

    // Intensity values
    this.bassBeatIntensity = 0;
    this.midBeatIntensity = 0;
    this.trebleBeatIntensity = 0;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  update(analyzer) {
    if (!analyzer) return;

    const analysis = analyzer.getAnalysis();

    // Store current values
    this.currentBass = analysis.bass;
    this.currentMid = analysis.mid;
    this.currentTreble = analysis.treble;

    // Store current thresholds
    this.currentBassThreshold = analyzer.bassThreshold;
    this.currentMidThreshold = analyzer.midThreshold;
    this.currentTrebleThreshold = analyzer.trebleThreshold;

    // Store beat states
    this.bassBeat = analysis.bassBeat;
    this.midBeat = analysis.midBeat;
    this.trebleBeat = analysis.trebleBeat;

    // Store intensities
    this.bassBeatIntensity = analysis.bassBeatIntensity;
    this.midBeatIntensity = analysis.midBeatIntensity;
    this.trebleBeatIntensity = analysis.trebleBeatIntensity;

    // Calculate adaptive thresholds for visualization
    const bassAvg = analyzer.bassHistory.reduce((a, b) => a + b, 0) / analyzer.bassHistory.length;
    const midAvg = analyzer.midHistory.reduce((a, b) => a + b, 0) / analyzer.midHistory.length;
    const trebleAvg = analyzer.trebleHistory.reduce((a, b) => a + b, 0) / analyzer.trebleHistory.length;

    const bassAdaptive = min(bassAvg * map(bassAvg, 0, 1, analyzer.bassSensitivity, analyzer.bassSensitivity * 0.8), 0.98);
    const midAdaptive = min(midAvg * map(midAvg, 0, 1, analyzer.midSensitivity, analyzer.midSensitivity * 0.8), 0.98);
    const trebleAdaptive = min(trebleAvg * map(trebleAvg, 0, 1, analyzer.trebleSensitivity, analyzer.trebleSensitivity * 0.8), 0.98);

    // Update energy buffers
    this.bassBuffer.push(this.currentBass);
    this.bassBuffer.shift();

    this.midBuffer.push(this.currentMid);
    this.midBuffer.shift();

    this.trebleBuffer.push(this.currentTreble);
    this.trebleBuffer.shift();

    // Update threshold buffers (show adaptive threshold)
    this.bassThresholdBuffer.push(bassAdaptive);
    this.bassThresholdBuffer.shift();

    this.midThresholdBuffer.push(midAdaptive);
    this.midThresholdBuffer.shift();

    this.trebleThresholdBuffer.push(trebleAdaptive);
    this.trebleThresholdBuffer.shift();

    // Track beat markers for each band
    if (this.bassBeat) {
      this.bassBeatMarkers.push(this.bufferLength - 1);
    }
    if (this.midBeat) {
      this.midBeatMarkers.push(this.bufferLength - 1);
    }
    if (this.trebleBeat) {
      this.trebleBeatMarkers.push(this.bufferLength - 1);
    }

    // Update and clean beat markers
    this.updateBeatMarkers(this.bassBeatMarkers);
    this.updateBeatMarkers(this.midBeatMarkers);
    this.updateBeatMarkers(this.trebleBeatMarkers);
  }

  updateBeatMarkers(markers) {
    for (let i = markers.length - 1; i >= 0; i--) {
      markers[i]--;
      if (markers[i] < 0) {
        markers.splice(i, 1);
      }
    }
  }

  draw() {
    let targetHeight = this.isOpen ? this.panelHeight : 0;
    this.animatedHeight = lerp(this.animatedHeight, targetHeight, this.animationSpeed);

    if (this.animatedHeight < 1) return;

    push();

    let panelY = height - this.animatedHeight;

    // Draw panel background
    noStroke();
    fill(this.backgroundColor[0], this.backgroundColor[1], this.backgroundColor[2], this.backgroundColor[3]);
    rect(0, panelY, width, this.animatedHeight);

    // Draw border
    stroke(0, 0, 50);
    strokeWeight(1);
    line(0, panelY, width, panelY);

    if (this.animatedHeight > this.panelHeight * 0.5) {
      this.drawThreeBandGraphs(panelY);
    }

    // Draw controls hint
    fill(0, 0, 60);
    textSize(10);
    textAlign(RIGHT, TOP);
    text("D: Toggle Debug View", width - 10, panelY + 5);

    pop();
  }

  drawThreeBandGraphs(panelY) {
    const graphX = this.paddingLeft;
    const totalGraphWidth = width - this.paddingLeft - this.paddingRight;
    const singleGraphHeight = (this.animatedHeight - this.paddingTop - this.paddingBottom - this.graphGap * 2) / 3;

    // Band configurations
    const bands = [
      {
        buffer: this.bassBuffer,
        thresholdBuffer: this.bassThresholdBuffer,
        beatMarkers: this.bassBeatMarkers,
        color: this.bassColor,
        label: 'BASS (Kick)',
        currentValue: this.currentBass,
        threshold: this.currentBassThreshold,
        isBeat: this.bassBeat,
        intensity: this.bassBeatIntensity
      },
      {
        buffer: this.midBuffer,
        thresholdBuffer: this.midThresholdBuffer,
        beatMarkers: this.midBeatMarkers,
        color: this.midColor,
        label: 'MID (Snare)',
        currentValue: this.currentMid,
        threshold: this.currentMidThreshold,
        isBeat: this.midBeat,
        intensity: this.midBeatIntensity
      },
      {
        buffer: this.trebleBuffer,
        thresholdBuffer: this.trebleThresholdBuffer,
        beatMarkers: this.trebleBeatMarkers,
        color: this.trebleColor,
        label: 'TREBLE (Hi-hat)',
        currentValue: this.currentTreble,
        threshold: this.currentTrebleThreshold,
        isBeat: this.trebleBeat,
        intensity: this.trebleBeatIntensity
      },
    ];

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const graphY = panelY + this.paddingTop + i * (singleGraphHeight + this.graphGap);

      // Graph background
      noStroke();
      fill(0, 0, 5, 150);
      rect(graphX, graphY, totalGraphWidth, singleGraphHeight);

      // Grid lines (0.5 line)
      stroke(0, 0, 25);
      strokeWeight(0.5);
      line(graphX, graphY + singleGraphHeight / 2, graphX + totalGraphWidth, graphY + singleGraphHeight / 2);

      // Draw beat markers (green vertical lines)
      stroke(this.beatMarkerColor[0], this.beatMarkerColor[1], this.beatMarkerColor[2], 60);
      strokeWeight(2);
      for (let marker of band.beatMarkers) {
        let x = graphX + (marker / this.bufferLength) * totalGraphWidth;
        line(x, graphY, x, graphY + singleGraphHeight);
      }

      // Draw threshold line (red)
      stroke(this.thresholdColor[0], this.thresholdColor[1], this.thresholdColor[2], 80);
      strokeWeight(1);
      noFill();
      beginShape();
      for (let j = 0; j < this.bufferLength; j++) {
        let x = graphX + (j / this.bufferLength) * totalGraphWidth;
        let y = graphY + singleGraphHeight - (band.thresholdBuffer[j] * singleGraphHeight);
        y = constrain(y, graphY, graphY + singleGraphHeight);
        vertex(x, y);
      }
      endShape();

      // Draw energy waveform (white/colored)
      stroke(0, 0, 100);  // White energy line
      strokeWeight(1.5);
      noFill();
      beginShape();
      for (let j = 0; j < this.bufferLength; j++) {
        let x = graphX + (j / this.bufferLength) * totalGraphWidth;
        let y = graphY + singleGraphHeight - (band.buffer[j] * singleGraphHeight);
        y = constrain(y, graphY, graphY + singleGraphHeight);
        vertex(x, y);
      }
      endShape();

      // Current value dot
      let currentVal = band.buffer[this.bufferLength - 1];
      let dotY = graphY + singleGraphHeight - (currentVal * singleGraphHeight);
      dotY = constrain(dotY, graphY, graphY + singleGraphHeight);

      // Glow on beat
      if (band.isBeat) {
        noStroke();
        fill(this.beatMarkerColor[0], this.beatMarkerColor[1], this.beatMarkerColor[2], 50);
        ellipse(graphX + totalGraphWidth, dotY, 20, 20);
      }

      // Dot
      noStroke();
      fill(0, 0, 100);
      ellipse(graphX + totalGraphWidth, dotY, 6, 6);

      // ========================================
      // TEXT LABELS (Left side of graph)
      // ========================================

      // Band label with color
      fill(band.color[0], band.color[1], band.color[2]);
      textSize(10);
      textAlign(LEFT, TOP);
      textStyle(BOLD);
      text(band.label, 5, graphY + 2);
      textStyle(NORMAL);

      // Current value
      fill(0, 0, 100);
      textSize(9);
      text('E: ' + band.currentValue.toFixed(3), 5, graphY + 15);

      // Threshold value
      fill(this.thresholdColor[0], this.thresholdColor[1], this.thresholdColor[2]);
      text('T: ' + band.threshold.toFixed(3), 5, graphY + 26);

      // Beat indicator
      if (band.isBeat) {
        fill(this.beatMarkerColor[0], this.beatMarkerColor[1], this.beatMarkerColor[2]);
        textStyle(BOLD);
        text('BEAT!', 5, graphY + 38);
        textStyle(NORMAL);
      }
    }

    // Draw legend at bottom
    this.drawLegend(graphX, panelY + this.animatedHeight - 12);
  }

  drawLegend(startX, y) {
    textSize(9);
    textAlign(LEFT, CENTER);

    let x = startX;

    // Energy (White)
    stroke(0, 0, 100);
    strokeWeight(2);
    line(x, y, x + 15, y);
    noStroke();
    fill(0, 0, 80);
    text("Energy", x + 20, y);

    x += 65;

    // Threshold (Red)
    stroke(this.thresholdColor[0], this.thresholdColor[1], this.thresholdColor[2]);
    strokeWeight(2);
    line(x, y, x + 15, y);
    noStroke();
    fill(0, 0, 80);
    text("Threshold", x + 20, y);

    x += 80;

    // Beat (Green)
    stroke(this.beatMarkerColor[0], this.beatMarkerColor[1], this.beatMarkerColor[2]);
    strokeWeight(2);
    line(x + 7, y - 5, x + 7, y + 5);
    noStroke();
    fill(0, 0, 80);
    text("Beat Trigger", x + 18, y);
  }
}
