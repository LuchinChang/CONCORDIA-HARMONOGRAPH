// ============================================================================
// AUDIO ANALYZER - Enhanced for rhythmic responsiveness
// ============================================================================

class AudioAnalyzer {
  constructor(historyLength = 60) {
    this.mic = null;
    this.fft = null;
    this.amplitude = null;
    this.audioFile = null;

    this.historyLength = historyLength;
    this.volumeHistory = [];
    this.bassHistory = [];

    // Initialize history
    for (let i = 0; i < historyLength; i++) {
      this.volumeHistory.push(0);
      this.bassHistory.push(0);
    }

    // Raw analysis values
    this.volume = 0;
    this.avgVolume = 0;
    this.spectralCentroid = 0;
    this.trebleEnergy = 0;

    // Frequency band energies
    this.bass = 0;
    this.lowMid = 0;
    this.mid = 0;
    this.highMid = 0;
    this.treble = 0;

    // Beat detection
    this.beatThreshold = 0.6;      // Sensitivity for beat detection
    this.beatDecay = 0.98;         // How fast the threshold decays
    this.beatCutoff = 0.3;         // Minimum threshold
    this.lastBeatTime = 0;
    this.beatCooldown = 100;       // Minimum ms between beats
    this.isBeat = false;
    this.beatIntensity = 0;        // 0-1, how strong the beat was

    // Smoothed values for visual mapping
    this.smoothedCentroid = 0.5;
    this.smoothedBass = 0;
    this.smoothedVolume = 0;

    // Lerp speeds (higher = more responsive)
    this.centroidLerp = 0.15;      // Pitch responsiveness
    this.bassLerp = 0.3;           // Bass responsiveness
    this.volumeLerp = 0.25;        // Volume responsiveness

    // Pulse state
    this.pulseAmount = 1.0;        // Current scale multiplier
    this.pulseDecay = 0.92;        // How fast pulse decays
    this.pulseStrength = 0.08;     // How much to scale on beat (8%)

    // Tension detection (for noise/electricity)
    this.isTense = false;
    this.isHighIntensity = false;
  }

  initMicrophone() {
    this.mic = new p5.AudioIn();
    this.mic.start();

    // Higher FFT bins for better frequency resolution
    this.fft = new p5.FFT(0.8, 512);
    this.fft.setInput(this.mic);

    this.amplitude = new p5.Amplitude();
    this.amplitude.setInput(this.mic);
  }

  initAudioFile(audioFile) {
    this.audioFile = audioFile;

    this.fft = new p5.FFT(0.8, 512);
    this.fft.setInput(audioFile);

    this.amplitude = new p5.Amplitude();
    this.amplitude.setInput(audioFile);
  }

  analyze(audioMode) {
    if (!this.fft) return;

    // Get raw volume
    if (audioMode === 'mic' && this.mic) {
      this.volume = this.mic.getLevel();
    } else if (audioMode === 'file' && this.amplitude) {
      this.volume = this.amplitude.getLevel();
    }

    // Analyze spectrum
    let spectrum = this.fft.analyze();

    // Get spectral centroid (pitch center)
    // Returns frequency in Hz, normalize to 0-1 range
    let rawCentroid = this.fft.getCentroid();
    // Centroid typically ranges from ~100Hz to ~8000Hz for music
    // Map to 0-1 with log scale for better perceptual mapping
    let normalizedCentroid = map(log(rawCentroid + 1), log(100), log(8000), 0, 1);
    normalizedCentroid = constrain(normalizedCentroid, 0, 1);

    // Smooth the centroid (fast enough to see melody, smooth enough to not jitter)
    this.smoothedCentroid = lerp(this.smoothedCentroid, normalizedCentroid, this.centroidLerp);
    this.spectralCentroid = this.smoothedCentroid;

    // Get frequency band energies (0-255 range from p5)
    this.bass = this.fft.getEnergy("bass") / 255;           // 20-140 Hz
    this.lowMid = this.fft.getEnergy("lowMid") / 255;       // 140-400 Hz
    this.mid = this.fft.getEnergy("mid") / 255;             // 400-2600 Hz
    this.highMid = this.fft.getEnergy("highMid") / 255;     // 2600-5200 Hz
    this.treble = this.fft.getEnergy("treble") / 255;       // 5200-14000 Hz

    // Smooth the bass for visual mapping
    this.smoothedBass = lerp(this.smoothedBass, this.bass, this.bassLerp);

    // Smooth volume
    this.smoothedVolume = lerp(this.smoothedVolume, this.volume, this.volumeLerp);

    // Update volume history
    this.volumeHistory.push(this.volume);
    this.volumeHistory.shift();
    this.avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.historyLength;

    // Update bass history for beat detection
    this.bassHistory.push(this.bass);
    this.bassHistory.shift();
    let avgBass = this.bassHistory.reduce((a, b) => a + b, 0) / this.bassHistory.length;

    // ========================================
    // BEAT DETECTION (Kick Drum Detection)
    // ========================================
    this.isBeat = false;
    this.beatIntensity = 0;

    let currentTime = millis();
    let timeSinceLastBeat = currentTime - this.lastBeatTime;

    // Detect beat: bass energy exceeds threshold and cooldown passed
    if (this.bass > this.beatThreshold &&
        this.bass > avgBass * 1.4 &&
        timeSinceLastBeat > this.beatCooldown) {

      this.isBeat = true;
      this.beatIntensity = map(this.bass, this.beatThreshold, 1, 0.5, 1);
      this.beatIntensity = constrain(this.beatIntensity, 0.5, 1);
      this.lastBeatTime = currentTime;

      // Raise threshold after beat to prevent double-triggers
      this.beatThreshold = min(this.bass * 1.1, 0.9);

      // Trigger pulse
      this.pulseAmount = 1.0 + (this.pulseStrength * this.beatIntensity);
    }

    // Decay the beat threshold back down
    this.beatThreshold = max(this.beatThreshold * this.beatDecay, this.beatCutoff);

    // Decay the pulse
    this.pulseAmount = lerp(this.pulseAmount, 1.0, 1 - this.pulseDecay);
    if (abs(this.pulseAmount - 1.0) < 0.001) {
      this.pulseAmount = 1.0;
    }

    // ========================================
    // TENSION DETECTION (for electricity/noise)
    // ========================================
    // Tense when volume spikes above average
    this.isTense = this.volume > this.avgVolume * 1.5 && this.volume > 0.02;

    // High intensity when lots of treble energy
    this.isHighIntensity = this.treble > 0.4 || this.highMid > 0.5;

    // Also tense during beats
    if (this.isBeat) {
      this.isTense = true;
    }
  }

  // Get pitch-mapped radius (for Planet B orbit)
  // Low pitch = large radius, High pitch = small radius
  getPitchRadius(minRadius, maxRadius) {
    // Invert: low centroid (bass) = large radius
    let t = 1 - this.smoothedCentroid;
    return lerp(minRadius, maxRadius, t);
  }

  // Get the current pulse scale factor
  getPulseScale() {
    return this.pulseAmount;
  }

  // Get analysis results
  getAnalysis() {
    return {
      volume: this.volume,
      smoothedVolume: this.smoothedVolume,
      avgVolume: this.avgVolume,
      spectralCentroid: this.spectralCentroid,
      smoothedCentroid: this.smoothedCentroid,

      // Frequency bands
      bass: this.bass,
      smoothedBass: this.smoothedBass,
      lowMid: this.lowMid,
      mid: this.mid,
      highMid: this.highMid,
      treble: this.treble,

      // Beat detection
      isBeat: this.isBeat,
      beatIntensity: this.beatIntensity,
      pulseScale: this.pulseAmount,

      // Tension
      isTense: this.isTense,
      isHighIntensity: this.isHighIntensity,

      // For backwards compatibility
      trebleEnergy: this.treble
    };
  }
}
