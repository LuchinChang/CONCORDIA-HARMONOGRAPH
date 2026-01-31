// ============================================================================
// AUDIO ANALYZER - Handles all audio analysis
// ============================================================================

class AudioAnalyzer {
  constructor(historyLength = 60) {
    this.mic = null;
    this.fft = null;
    this.amplitude = null;
    this.audioFile = null;

    this.historyLength = historyLength;
    this.volumeHistory = [];

    // Initialize history
    for (let i = 0; i < historyLength; i++) {
      this.volumeHistory.push(0);
    }

    // Analysis results
    this.volume = 0;
    this.avgVolume = 0;
    this.spectralCentroid = 0;
    this.trebleEnergy = 0;
    this.isTense = false;
    this.isHighIntensity = false;
  }

  initMicrophone() {
    this.mic = new p5.AudioIn();
    this.mic.start();

    this.fft = new p5.FFT(0.8, 256);
    this.fft.setInput(this.mic);

    this.amplitude = new p5.Amplitude();
    this.amplitude.setInput(this.mic);
  }

  initAudioFile(audioFile) {
    this.audioFile = audioFile;

    this.fft = new p5.FFT(0.8, 256);
    this.fft.setInput(audioFile);

    this.amplitude = new p5.Amplitude();
    this.amplitude.setInput(audioFile);
  }

  analyze(audioMode) {
    if (!this.fft) return;

    // Get volume
    if (audioMode === 'mic' && this.mic) {
      this.volume = this.mic.getLevel();
    } else if (audioMode === 'file' && this.amplitude) {
      this.volume = this.amplitude.getLevel();
    }

    // Analyze spectrum
    let spectrum = this.fft.analyze();

    // Calculate spectral centroid
    this.spectralCentroid = this.calculateSpectralCentroid(spectrum);

    // Calculate treble energy
    let trebleBins = spectrum.slice(floor(spectrum.length * 0.6));
    this.trebleEnergy = trebleBins.reduce((a, b) => a + b, 0) / trebleBins.length / 255;

    // Update volume history
    this.volumeHistory.push(this.volume);
    this.volumeHistory.shift();
    this.avgVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.historyLength;

    // Determine tension state
    this.isTense = this.volume > this.avgVolume * 1.5 && this.volume > 0.01;

    // High intensity for effects
    this.isHighIntensity = this.trebleEnergy > 0.4;
  }

  calculateSpectralCentroid(spectrum) {
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < spectrum.length; i++) {
      weightedSum += i * spectrum[i];
      magnitudeSum += spectrum[i];
    }

    if (magnitudeSum === 0) return 0;
    return weightedSum / magnitudeSum / spectrum.length;
  }

  getAnalysis() {
    return {
      volume: this.volume,
      avgVolume: this.avgVolume,
      spectralCentroid: this.spectralCentroid,
      trebleEnergy: this.trebleEnergy,
      isTense: this.isTense,
      isHighIntensity: this.isHighIntensity
    };
  }
}
