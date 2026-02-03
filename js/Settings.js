// ============================================================================
// SETTINGS - Global settings management with per-window support
// ============================================================================

const Settings = {
  // Visual settings (global defaults)
  lineOpacity: 30,
  baseLineWeight: 0.8,
  drawInterval: 1,
  noiseAmount: 60,  // 0-100, controls vertex noise/electricity intensity

  // Trail persistence
  persistentTrails: true,  // true = accumulate lines forever, false = fade quickly
  trailFadeAmount: 0,      // Fade amount when persistent (0 = no fade, permanent)
  quickFadeAmount: 25,     // Fade amount when not persistent (fast fade)

  // Pitch-to-Radius mapping
  pitchRadiusMin: 0.25,   // Minimum orbit radius (high pitch)
  pitchRadiusMax: 0.85,   // Maximum orbit radius (low pitch)
  pitchSensitivity: 1.0,  // How much pitch affects radius

  // Beat/Pulse settings
  beatSensitivity: 0.5,   // 0-1, how sensitive beat detection is
  pulseStrength: 8,       // Percentage to scale on beat (e.g., 8 = 8%)
  pulseFadeBackground: true, // Extra background fade on beat

  // BPM settings (for manual override)
  bpm: 120,
  useBpmSync: false,
  lastBeatTime: 0,

  // Drawing modes
  drawMode: 'lines',  // 'lines', 'midpoints', 'both'
  splitScreen: false,

  // Layout mode: 'single', 'dual', 'triple'
  layoutMode: 'single',

  // Comet settings
  maxComets: 25,

  // Physics settings
  physicsMode: 'legacy',

  // Gravity system parameters
  gravityStrength: 1000,
  timeScale: 1.0,

  // Celestial body visibility
  showBodies: false,

  // ========================================
  // PER-WINDOW SETTINGS (for triple mode)
  // ========================================
  windowSettings: {
    bass: {
      drawMode: 'lines',
      lineOpacity: 30,
      baseLineWeight: 0.8,
      noiseAmount: 60,
      persistentTrails: true,
      trailFadeAmount: 0,
      pulseStrength: 12,  // Bass gets stronger pulse
      activePairs: ['AB'],
      physicsMode: 'legacy',
      showBodies: false,
    },
    mid: {
      drawMode: 'lines',
      lineOpacity: 30,
      baseLineWeight: 0.8,
      noiseAmount: 40,
      persistentTrails: true,
      trailFadeAmount: 0,
      pulseStrength: 8,
      activePairs: ['AB'],
      physicsMode: 'legacy',
      showBodies: false,
    },
    treble: {
      drawMode: 'lines',
      lineOpacity: 30,
      baseLineWeight: 0.6,  // Thinner for treble
      noiseAmount: 80,  // More jittery for treble
      persistentTrails: true,
      trailFadeAmount: 0,
      pulseStrength: 5,
      activePairs: ['AB'],
      physicsMode: 'legacy',
      showBodies: false,
    },
    // For single/dual modes
    left: {
      drawMode: 'lines',
      lineOpacity: 30,
      baseLineWeight: 0.8,
      noiseAmount: 60,
      persistentTrails: true,
      trailFadeAmount: 0,
      pulseStrength: 8,
      activePairs: ['AB'],
      physicsMode: 'legacy',
      showBodies: false,
    },
    right: {
      drawMode: 'lines',
      lineOpacity: 30,
      baseLineWeight: 0.8,
      noiseAmount: 60,
      persistentTrails: true,
      trailFadeAmount: 0,
      pulseStrength: 8,
      activePairs: ['AC'],
      physicsMode: 'legacy',
      showBodies: false,
    },
    main: {
      drawMode: 'lines',
      lineOpacity: 30,
      baseLineWeight: 0.8,
      noiseAmount: 60,
      persistentTrails: true,
      trailFadeAmount: 0,
      pulseStrength: 8,
      activePairs: ['AB'],
      physicsMode: 'legacy',
      showBodies: false,
    },
  },

  // Currently selected window for editing
  selectedWindow: 'all',  // 'all', 'bass', 'mid', 'treble', 'left', 'right', 'main'

  // Get settings for a specific window
  getWindowSettings(windowId) {
    return this.windowSettings[windowId] || this.windowSettings.main;
  },

  // Update a specific window's setting
  updateWindowSetting(windowId, key, value) {
    if (this.windowSettings[windowId]) {
      this.windowSettings[windowId][key] = value;
    }
  },

  // Update all windows with a setting (when 'all' is selected)
  updateAllWindowSettings(key, value) {
    for (let windowId in this.windowSettings) {
      this.windowSettings[windowId][key] = value;
    }
  },

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
      return true;
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
