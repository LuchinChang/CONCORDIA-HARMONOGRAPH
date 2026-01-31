// ============================================================================
// SETTINGS - Global settings management
// ============================================================================

const Settings = {
  // Visual settings
  lineOpacity: 25,
  baseLineWeight: 0.5,
  drawInterval: 1,
  noiseAmount: 50,  // 0-100, controls white noise intensity

  // BPM settings
  bpm: 120,
  useBpmSync: false,
  lastBeatTime: 0,

  // Drawing modes
  drawMode: 'lines',  // 'lines', 'midpoints', 'both'
  splitScreen: false,

  // Comet settings
  maxComets: 30,  // Reduced for elegance

  // Planet pairs for left side (or full screen)
  planetPairsLeft: [
    { p1: 0, p2: 1, hue: 200, enabled: true, id: 'pairAB' },
    { p1: 0, p2: 2, hue: 320, enabled: false, id: 'pairAC' },
    { p1: 1, p2: 2, hue: 60, enabled: false, id: 'pairBC' },
    { p1: 0, p2: 3, hue: 140, enabled: false, id: 'pairAD' },
    { p1: 1, p2: 3, hue: 280, enabled: false, id: 'pairBD' },
    { p1: 2, p2: 3, hue: 20, enabled: false, id: 'pairCD' },
  ],

  // Planet pairs for right side (split screen mode)
  planetPairsRight: [
    { p1: 0, p2: 1, hue: 200, enabled: false, id: 'pairAB_R' },
    { p1: 0, p2: 2, hue: 320, enabled: true, id: 'pairAC_R' },
    { p1: 1, p2: 2, hue: 60, enabled: false, id: 'pairBC_R' },
    { p1: 0, p2: 3, hue: 140, enabled: false, id: 'pairAD_R' },
    { p1: 1, p2: 3, hue: 280, enabled: false, id: 'pairBD_R' },
    { p1: 2, p2: 3, hue: 20, enabled: false, id: 'pairCD_R' },
  ],

  // Calculate ms per beat from BPM
  getMsPerBeat() {
    return 60000 / this.bpm;
  },

  // Check if we should draw based on BPM sync
  shouldDrawOnBeat(currentTime) {
    if (!this.useBpmSync) {
      return true; // Always draw if not using BPM sync
    }

    const msPerBeat = this.getMsPerBeat();
    const timeSinceLastBeat = currentTime - this.lastBeatTime;

    if (timeSinceLastBeat >= msPerBeat / this.drawInterval) {
      this.lastBeatTime = currentTime;
      return true;
    }
    return false;
  }
};
