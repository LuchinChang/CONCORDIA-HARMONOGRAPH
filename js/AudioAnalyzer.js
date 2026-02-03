// ============================================================================
// AUDIO ANALYZER - Multi-Band Beat Detection with Adaptive Thresholds
// Supports independent detection for Bass, Mid, and Treble frequencies
// ============================================================================

class AudioAnalyzer {
  constructor(historyLength = 60) {
    this.mic = null;
    this.fft = null;
    this.amplitude = null;
    this.audioFile = null;

    this.historyLength = historyLength;
    this.volumeHistory = [];

    // Separate histories for each frequency band
    this.bassHistory = [];
    this.midHistory = [];
    this.trebleHistory = [];

    // Initialize histories
    for (let i = 0; i < historyLength; i++) {
      this.volumeHistory.push(0);
      this.bassHistory.push(0);
      this.midHistory.push(0);
      this.trebleHistory.push(0);
    }

    // Raw analysis values
    this.volume = 0;
    this.avgVolume = 0;
    this.spectralCentroid = 0;
    this.trebleEnergy = 0;

    // Frequency band energies (normalized 0-1)
    this.bass = 0;
    this.lowMid = 0;
    this.mid = 0;
    this.highMid = 0;
    this.treble = 0;

    // ========================================
    // MULTI-BAND BEAT DETECTION STATE
    // ========================================

    // Bass beat detection (Kick drums)
    this.bassBeat = false;
    this.bassBeatIntensity = 0;
    this.bassThreshold = 0.4;
    this.bassLastBeatTime = 0;
    this.bassCooldown = 200;       // ms between bass beats
    this.bassCutoff = 0.3;         // Minimum threshold floor
    this.bassDecay = 0.95;         // Threshold decay rate
    this.bassSensitivity = 1.5;    // Spike detection multiplier

    // Mid beat detection (Snare/Vocals)
    this.midBeat = false;
    this.midBeatIntensity = 0;
    this.midThreshold = 0.35;
    this.midLastBeatTime = 0;
    this.midCooldown = 150;        // ms between mid beats
    this.midCutoff = 0.25;
    this.midDecay = 0.93;
    this.midSensitivity = 1.4;

    // Treble beat detection (Hi-hats/Cymbals)
    this.trebleBeat = false;
    this.trebleBeatIntensity = 0;
    this.trebleThreshold = 0.3;
    this.trebleLastBeatTime = 0;
    this.trebleCooldown = 100;     // ms between treble beats (faster)
    this.trebleCutoff = 0.2;
    this.trebleDecay = 0.9;        // Faster decay for treble
    this.trebleSensitivity = 1.3;

    // Legacy: Combined beat (for backward compatibility)
    this.isBeat = false;
    this.beatIntensity = 0;
    this.beatThreshold = 0.4;
    this.beatDecay = 0.95;
    this.beatCutoff = 0.3;
    this.lastBeatTime = 0;
    this.beatCooldown = 200;

    // Smoothed values for visual mapping
    this.smoothedCentroid = 0.5;
    this.smoothedBass = 0;
    this.smoothedMid = 0;
    this.smoothedTreble = 0;
    this.smoothedVolume = 0;

    // Lerp speeds (higher = more responsive)
    this.centroidLerp = 0.15;
    this.bassLerp = 0.3;
    this.midLerp = 0.25;
    this.trebleLerp = 0.2;
    this.volumeLerp = 0.25;

    // ========================================
    // PULSE STATE (per band)
    // ========================================

    // Bass pulse (main "thump")
    this.bassPulseAmount = 1.0;
    this.bassPulseDecay = 0.92;
    this.bassPulseStrength = 0.08;

    // Mid pulse (snare hit)
    this.midPulseAmount = 1.0;
    this.midPulseDecay = 0.9;
    this.midPulseStrength = 0.05;

    // Treble pulse (hi-hat shimmer)
    this.treblePulseAmount = 1.0;
    this.treblePulseDecay = 0.85;
    this.treblePulseStrength = 0.03;

    // Legacy combined pulse
    this.pulseAmount = 1.0;
    this.pulseDecay = 0.92;
    this.pulseStrength = 0.08;

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
    let rawCentroid = this.fft.getCentroid();
    let normalizedCentroid = map(log(rawCentroid + 1), log(100), log(8000), 0, 1);
    normalizedCentroid = constrain(normalizedCentroid, 0, 1);

    // Smooth the centroid
    this.smoothedCentroid = lerp(this.smoothedCentroid, normalizedCentroid, this.centroidLerp);
    this.spectralCentroid = this.smoothedCentroid;

    // Get frequency band energies (0-255 range from p5, normalize to 0-1)
    this.bass = this.fft.getEnergy("bass") / 255;           // 20-140 Hz
    this.lowMid = this.fft.getEnergy("lowMid") / 255;       // 140-400 Hz
    this.mid = this.fft.getEnergy("mid") / 255;             // 400-2600 Hz
    this.highMid = this.fft.getEnergy("highMid") / 255;     // 2600-5200 Hz
    this.treble = this.fft.getEnergy("treble") / 255;       // 5200-14000 Hz

    // Smooth the frequency bands
    this.smoothedBass = lerp(this.smoothedBass, this.bass, this.bassLerp);
    this.smoothedMid = lerp(this.smoothedMid, this.mid, this.midLerp);
    this.smoothedTreble = lerp(this.smoothedTreble, this.treble, this.trebleLerp);
    this.smoothedVolume = lerp(this.smoothedVolume, this.volume, this.volumeLerp);

    // Update volume history
    this.volumeHistory.push(this.volume);
    this.volumeHistory.shift();
    this.avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.historyLength;

    // Update band histories
    this.bassHistory.push(this.bass);
    this.bassHistory.shift();

    this.midHistory.push(this.mid);
    this.midHistory.shift();

    this.trebleHistory.push(this.treble);
    this.trebleHistory.shift();

    // ========================================
    // MULTI-BAND BEAT DETECTION
    // ========================================

    const currentTime = millis();

    // Detect bass beat (kick drums)
    const bassResult = this.detectBeat(
      this.bass,
      this.bassHistory,
      this.bassThreshold,
      this.bassLastBeatTime,
      this.bassCooldown,
      this.bassCutoff,
      this.bassDecay,
      this.bassSensitivity,
      currentTime
    );
    this.bassBeat = bassResult.isBeat;
    this.bassBeatIntensity = bassResult.intensity;
    this.bassThreshold = bassResult.threshold;
    if (bassResult.isBeat) {
      this.bassLastBeatTime = currentTime;
      this.bassPulseAmount = 1.0 + (this.bassPulseStrength * bassResult.intensity);
    }

    // Detect mid beat (snare/vocals)
    const midResult = this.detectBeat(
      this.mid,
      this.midHistory,
      this.midThreshold,
      this.midLastBeatTime,
      this.midCooldown,
      this.midCutoff,
      this.midDecay,
      this.midSensitivity,
      currentTime
    );
    this.midBeat = midResult.isBeat;
    this.midBeatIntensity = midResult.intensity;
    this.midThreshold = midResult.threshold;
    if (midResult.isBeat) {
      this.midLastBeatTime = currentTime;
      this.midPulseAmount = 1.0 + (this.midPulseStrength * midResult.intensity);
    }

    // Detect treble beat (hi-hats/cymbals)
    const trebleResult = this.detectBeat(
      this.treble,
      this.trebleHistory,
      this.trebleThreshold,
      this.trebleLastBeatTime,
      this.trebleCooldown,
      this.trebleCutoff,
      this.trebleDecay,
      this.trebleSensitivity,
      currentTime
    );
    this.trebleBeat = trebleResult.isBeat;
    this.trebleBeatIntensity = trebleResult.intensity;
    this.trebleThreshold = trebleResult.threshold;
    if (trebleResult.isBeat) {
      this.trebleLastBeatTime = currentTime;
      this.treblePulseAmount = 1.0 + (this.treblePulseStrength * trebleResult.intensity);
    }

    // ========================================
    // LEGACY COMBINED BEAT (backward compatibility)
    // Uses bass beat as primary, triggered by any beat
    // ========================================
    this.isBeat = this.bassBeat;
    this.beatIntensity = this.bassBeatIntensity;
    this.beatThreshold = this.bassThreshold;
    if (this.bassBeat) {
      this.lastBeatTime = currentTime;
      this.pulseAmount = 1.0 + (this.pulseStrength * this.beatIntensity);
    }

    // ========================================
    // DECAY PULSES
    // ========================================
    this.bassPulseAmount = lerp(this.bassPulseAmount, 1.0, 1 - this.bassPulseDecay);
    this.midPulseAmount = lerp(this.midPulseAmount, 1.0, 1 - this.midPulseDecay);
    this.treblePulseAmount = lerp(this.treblePulseAmount, 1.0, 1 - this.treblePulseDecay);
    this.pulseAmount = lerp(this.pulseAmount, 1.0, 1 - this.pulseDecay);

    // Snap to 1.0 if close
    if (abs(this.bassPulseAmount - 1.0) < 0.001) this.bassPulseAmount = 1.0;
    if (abs(this.midPulseAmount - 1.0) < 0.001) this.midPulseAmount = 1.0;
    if (abs(this.treblePulseAmount - 1.0) < 0.001) this.treblePulseAmount = 1.0;
    if (abs(this.pulseAmount - 1.0) < 0.001) this.pulseAmount = 1.0;

    // ========================================
    // TENSION DETECTION (for electricity/noise)
    // ========================================
    this.isTense = this.volume > this.avgVolume * 1.2 && this.volume > 0.02;
    this.isHighIntensity = this.treble > 0.2 || this.highMid > 0.5;

    // Also tense during any beat
    if (this.bassBeat || this.midBeat || this.trebleBeat) {
      this.isTense = true;
    }
  }

  // ========================================
  // GENERALIZED BEAT DETECTION METHOD
  // Uses adaptive threshold with sliding window
  // ========================================
  detectBeat(energy, history, threshold, lastBeatTime, cooldown, cutoff, decay, sensitivity, currentTime) {
    let isBeat = false;
    let intensity = 0;

    // Calculate average energy from history
    const avgEnergy = history.reduce((a, b) => a + b, 0) / history.length;

    // Adaptive multiplier based on average energy level
    // Higher avgEnergy = lower multiplier (less sensitivity needed)
    // Lower avgEnergy = higher multiplier (more sensitivity needed)
    const adaptiveMultiplier = map(avgEnergy, 0, 1, sensitivity, sensitivity * 0.8);

    // Dynamic threshold based on local average
    // Cap at 0.98 to ensure the energy can always exceed it
    const dynamicThreshold = min(avgEnergy * adaptiveMultiplier, 0.98);

    // Check if on rising edge
    const isRising = energy > history[history.length - 2];

    // Time since last beat
    const timeSinceLast = currentTime - lastBeatTime;

    // Beat detection logic
    if (energy > threshold &&           // Above decaying threshold
        energy > dynamicThreshold &&    // Above adaptive threshold
        isRising &&                      // On rising edge
        timeSinceLast > cooldown) {      // Past cooldown period

      isBeat = true;
      intensity = map(energy, threshold, 1, 0.5, 1);
      intensity = constrain(intensity, 0.5, 1);

      // Reset threshold to current energy level
      threshold = energy * 0.95;
    }

    // Decay the threshold
    threshold = max(threshold * decay, cutoff);

    return {
      isBeat,
      intensity,
      threshold,
      dynamicThreshold,
      avgEnergy
    };
  }

  // Get pitch-mapped radius (for Planet B orbit)
  // Low pitch = large radius, High pitch = small radius
  getPitchRadius(minRadius, maxRadius) {
    let t = 1 - this.smoothedCentroid;
    return lerp(minRadius, maxRadius, t);
  }

  // Get the current pulse scale factor (legacy)
  getPulseScale() {
    return this.pulseAmount;
  }

  // Get pulse scale for specific frequency band
  getBandPulseScale(band) {
    switch (band) {
      case 'bass': return this.bassPulseAmount;
      case 'mid': return this.midPulseAmount;
      case 'treble': return this.treblePulseAmount;
      default: return this.pulseAmount;
    }
  }

  // Get beat state for specific frequency band
  getBandBeat(band) {
    switch (band) {
      case 'bass': return { isBeat: this.bassBeat, intensity: this.bassBeatIntensity };
      case 'mid': return { isBeat: this.midBeat, intensity: this.midBeatIntensity };
      case 'treble': return { isBeat: this.trebleBeat, intensity: this.trebleBeatIntensity };
      default: return { isBeat: this.isBeat, intensity: this.beatIntensity };
    }
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
      smoothedMid: this.smoothedMid,
      highMid: this.highMid,
      treble: this.treble,
      smoothedTreble: this.smoothedTreble,

      // Multi-band beat detection
      bassBeat: this.bassBeat,
      bassBeatIntensity: this.bassBeatIntensity,
      midBeat: this.midBeat,
      midBeatIntensity: this.midBeatIntensity,
      trebleBeat: this.trebleBeat,
      trebleBeatIntensity: this.trebleBeatIntensity,

      // Legacy combined beat detection (backward compatibility)
      isBeat: this.isBeat,
      beatIntensity: this.beatIntensity,
      pulseScale: this.pulseAmount,

      // Per-band pulse scales
      bassPulseScale: this.bassPulseAmount,
      midPulseScale: this.midPulseAmount,
      treblePulseScale: this.treblePulseAmount,

      // Tension
      isTense: this.isTense,
      isHighIntensity: this.isHighIntensity,

      // For backwards compatibility
      trebleEnergy: this.treble
    };
  }
}
