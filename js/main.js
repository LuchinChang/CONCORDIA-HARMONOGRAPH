// ============================================================================
// THE CELESTIAL HARMONOGRAPH - Multi-System Frequency-Reactive Version
// "A breathing solar system that thumps on the kick drum"
// ============================================================================

// Core components
let audioAnalyzer;

// Harmonograph systems array
let systems = [];

// Legacy renderers (for backward compatibility)
let renderer;
let rendererRight;

// Legacy graphics layers (for backward compatibility with single/dual mode)
let harmonographLayer;
let harmonographLayerRight;

// Legacy planets (for backward compatibility)
let planetsLeft = [];
let planetsRight = [];

// Center points (legacy)
let centerX, centerY;
let centerXLeft, centerYLeft;
let centerXRight, centerYRight;

// Comets
let comets = [];

// Debug view
let beatDebugView;

// State
let audioStarted = false;
let audioMode = null;
let isPlaying = false;
let audioFile = null;
let currentFileName = '';

// Timing
let startTime;
const FULL_CYCLE_DURATION = 240000;

// Frame counter
let frameCounter = 0;

// Panel visibility
let panelVisible = false;

// Pulse visualization state
let currentPulseScale = 1.0;

// ============================================================================
// p5.js SETUP
// ============================================================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // Create audio analyzer
  audioAnalyzer = new AudioAnalyzer(60);

  // Create beat debug view
  beatDebugView = new BeatDebugView();

  // Initialize the harmonograph systems
  initializeSystems();

  // Legacy: Create graphics layers for backward compatibility
  createGraphicsLayers();

  // Legacy: Create renderers
  renderer = new HarmonographRenderer(harmonographLayer);
  rendererRight = new HarmonographRenderer(harmonographLayerRight);

  // Legacy: Initialize centers
  updateCenters();

  // Legacy: Initialize planets
  initializePlanets();

  // Initialize timing
  startTime = millis();

  // Setup UI
  setupUIListeners();
}

// ============================================================================
// INITIALIZE HARMONOGRAPH SYSTEMS (New Multi-System Architecture)
// ============================================================================
function initializeSystems() {
  systems = [];

  if (Settings.layoutMode === 'triple') {
    // Triple split: Bass | Mid | Treble
    const sectionWidth = floor(width / 3);

    // System 0: Bass (Left third)
    const bassSystem = new HarmonographSystem(0, 0, sectionWidth, height, 'bass', 'bass');
    applyWindowSettingsToSystem(bassSystem, 'bass');
    systems.push(bassSystem);

    // System 1: Mid (Center third)
    const midSystem = new HarmonographSystem(sectionWidth, 0, sectionWidth, height, 'mid', 'mid');
    applyWindowSettingsToSystem(midSystem, 'mid');
    systems.push(midSystem);

    // System 2: Treble (Right third)
    const trebleSystem = new HarmonographSystem(sectionWidth * 2, 0, sectionWidth, height, 'treble', 'treble');
    applyWindowSettingsToSystem(trebleSystem, 'treble');
    systems.push(trebleSystem);

  } else if (Settings.layoutMode === 'dual') {
    // Dual split
    const halfWidth = floor(width / 2);

    const leftSystem = new HarmonographSystem(0, 0, halfWidth, height, 'all', 'left');
    applyWindowSettingsToSystem(leftSystem, 'left');
    systems.push(leftSystem);

    const rightSystem = new HarmonographSystem(halfWidth, 0, halfWidth, height, 'all', 'right');
    applyWindowSettingsToSystem(rightSystem, 'right');
    systems.push(rightSystem);

  } else {
    // Single full-screen system
    const mainSystem = new HarmonographSystem(0, 0, width, height, 'all', 'main');
    applyWindowSettingsToSystem(mainSystem, 'main');
    systems.push(mainSystem);
  }
}

// Apply per-window settings to a system
function applyWindowSettingsToSystem(system, windowId) {
  const ws = Settings.getWindowSettings(windowId);

  system
    .setDrawMode(ws.drawMode)
    .setActivePairs(ws.activePairs)
    .setTrailPersistence(ws.persistentTrails, ws.trailFadeAmount)
    .setShowBodies(ws.showBodies)
    .setPhysicsMode(ws.physicsMode)
    .setVisualSettings({
      lineOpacity: ws.lineOpacity,
      baseLineWeight: ws.baseLineWeight,
      noiseAmount: ws.noiseAmount,
      drawInterval: Settings.drawInterval,
    });

  // Set different phase offsets based on window
  if (windowId === 'bass') {
    system.setPlanetPhaseOffsets([0, PI / 4, PI / 2, 3 * PI / 4]);
  } else if (windowId === 'mid') {
    system.setPlanetPhaseOffsets([PI / 6, PI / 3, 2 * PI / 3, 5 * PI / 6]);
  } else if (windowId === 'treble') {
    system.setPlanetPhaseOffsets([PI / 8, 3 * PI / 8, 5 * PI / 8, 7 * PI / 8]);
  } else if (windowId === 'right') {
    system.setPlanetPhaseOffsets([PI / 6, PI / 3, 2 * PI / 3, 5 * PI / 6]);
  }
}

// Helper: Get active pair IDs from legacy pair array
function getActivePairIds(pairsArray) {
  const idMap = {
    'pairAB': 'AB', 'pairAC': 'AC', 'pairBC': 'BC',
    'pairAD': 'AD', 'pairBD': 'BD', 'pairCD': 'CD',
    'pairAB_R': 'AB', 'pairAC_R': 'AC', 'pairBC_R': 'BC',
    'pairAD_R': 'AD', 'pairBD_R': 'BD', 'pairCD_R': 'CD',
  };

  return pairsArray
    .filter(p => p.enabled)
    .map(p => idMap[p.id])
    .filter(id => id);
}

// Apply a setting to selected window(s)
function applySettingToWindows(key, value) {
  if (Settings.selectedWindow === 'all') {
    Settings.updateAllWindowSettings(key, value);
    // Apply to all systems
    for (let sys of systems) {
      applySettingToSystem(sys, key, value);
    }
  } else {
    Settings.updateWindowSetting(Settings.selectedWindow, key, value);
    // Find and update the specific system
    const sys = systems.find(s => s.id === Settings.selectedWindow);
    if (sys) {
      applySettingToSystem(sys, key, value);
    }
  }
}

// Apply a single setting to a system
function applySettingToSystem(system, key, value) {
  switch (key) {
    case 'drawMode':
      system.setDrawMode(value);
      break;
    case 'lineOpacity':
    case 'baseLineWeight':
    case 'noiseAmount':
      system.setVisualSettings({ [key]: value });
      break;
    case 'persistentTrails':
      system.setTrailPersistence(value, Settings.getWindowSettings(system.id).trailFadeAmount);
      break;
    case 'trailFadeAmount':
      system.setTrailPersistence(Settings.getWindowSettings(system.id).persistentTrails, value);
      break;
    case 'showBodies':
      system.setShowBodies(value);
      break;
    case 'physicsMode':
      system.setPhysicsMode(value);
      break;
    case 'activePairs':
      system.setActivePairs(value);
      break;
  }
}

// ============================================================================
// LEGACY: Create graphics layers for backward compatibility
// ============================================================================
function createGraphicsLayers() {
  harmonographLayer = createGraphics(width, height);
  harmonographLayer.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayer.background(0);

  harmonographLayerRight = createGraphics(width, height);
  harmonographLayerRight.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayerRight.background(0);
}

// ============================================================================
// LEGACY: Initialize planets
// ============================================================================
function initializePlanets() {
  planetsLeft = [
    new Planet(0.75, 7, 0, 'A'),
    new Planet(0.5, 11, PI / 4, 'B'),
    new Planet(0.35, 13, PI / 2, 'C'),
    new Planet(0.2, 17, 3 * PI / 4, 'D'),
  ];

  planetsRight = [
    new Planet(0.75, 7, PI / 6, 'A'),
    new Planet(0.5, 11, PI / 3, 'B'),
    new Planet(0.35, 13, 2 * PI / 3, 'C'),
    new Planet(0.2, 17, 5 * PI / 6, 'D'),
  ];
}

// ============================================================================
// LEGACY: Update centers
// ============================================================================
function updateCenters() {
  if (Settings.splitScreen || Settings.layoutMode === 'dual') {
    centerXLeft = width / 4;
    centerYLeft = height / 2;
    centerXRight = width * 3 / 4;
    centerYRight = height / 2;
  } else {
    centerX = width / 2;
    centerY = height / 2;
  }
}

// ============================================================================
// UI EVENT LISTENERS
// ============================================================================
function setupUIListeners() {
  // Audio controls
  document.getElementById('micBtn').addEventListener('click', startMicrophone);
  document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);

  // Playback controls
  document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
  document.getElementById('restartBtn').addEventListener('click', restartAudio);
  document.getElementById('resetDrawingBtn').addEventListener('click', resetDrawing);

  // Panel toggle
  document.getElementById('panelToggle').addEventListener('click', togglePanel);

  // Window selector for per-window settings
  const windowSelector = document.getElementById('windowSelector');
  if (windowSelector) {
    windowSelector.addEventListener('change', (e) => {
      Settings.selectedWindow = e.target.value;
      updateUIFromSelectedWindow();
    });
  }

  // Trail persistence toggle
  document.getElementById('persistentTrailsToggle').addEventListener('change', (e) => {
    Settings.persistentTrails = e.target.checked;
    applySettingToWindows('persistentTrails', e.target.checked);
  });

  // Drawing mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      Settings.drawMode = e.target.dataset.mode;
      applySettingToWindows('drawMode', e.target.dataset.mode);
    });
  });

  // Layout mode buttons
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const layout = e.target.dataset.layout;
      Settings.layoutMode = layout;
      Settings.splitScreen = (layout === 'dual');

      // Update window selector options based on layout
      updateWindowSelectorOptions();

      // Show/hide right pairs section
      const rightPairs = document.getElementById('rightPairsSection');
      if (rightPairs) {
        rightPairs.style.display = (layout === 'dual') ? 'block' : 'none';
      }
      const pairsHeader = document.getElementById('pairsHeaderLeft');
      if (pairsHeader) {
        pairsHeader.textContent = (layout === 'dual') ? 'Left Side Pairs' : 'Planet Pairs';
      }

      updateCenters();
      initializeSystems();
      resetDrawing();
    });
  });

  // Physics mode buttons
  document.querySelectorAll('.physics-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.target.dataset.physics;
      if (mode === 'legacy' || mode === 'reactive') {
        document.querySelectorAll('.physics-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        Settings.physicsMode = mode;
        applySettingToWindows('physicsMode', mode);
        showModeIndicator();
      }
    });
  });

  // Gravity strength slider
  const gravitySlider = document.getElementById('gravitySlider');
  if (gravitySlider) {
    gravitySlider.addEventListener('input', (e) => {
      Settings.gravityStrength = parseInt(e.target.value);
      document.getElementById('gravityValue').textContent = Settings.gravityStrength;
      for (let sys of systems) {
        sys.setGravityStrength(Settings.gravityStrength);
      }
    });
  }

  // Time scale slider
  const timeScaleSlider = document.getElementById('timeScaleSlider');
  if (timeScaleSlider) {
    timeScaleSlider.addEventListener('input', (e) => {
      Settings.timeScale = parseInt(e.target.value) / 100;
      document.getElementById('timeScaleValue').textContent = Settings.timeScale.toFixed(1);
      for (let sys of systems) {
        sys.setTimeScale(Settings.timeScale);
      }
    });
  }

  // Show bodies toggle
  const showBodiesToggle = document.getElementById('showBodiesToggle');
  if (showBodiesToggle) {
    showBodiesToggle.addEventListener('change', (e) => {
      Settings.showBodies = e.target.checked;
      applySettingToWindows('showBodies', e.target.checked);
    });
  }

  // BPM controls
  document.getElementById('bpmSyncToggle').addEventListener('change', (e) => {
    Settings.useBpmSync = e.target.checked;
    Settings.lastBeatTime = millis();
  });

  document.getElementById('bpmSlider').addEventListener('input', (e) => {
    Settings.bpm = parseInt(e.target.value);
    document.getElementById('bpmValue').textContent = Settings.bpm;
  });

  // Visual settings sliders
  document.getElementById('opacitySlider').addEventListener('input', (e) => {
    Settings.lineOpacity = parseInt(e.target.value);
    document.getElementById('opacityValue').textContent = Settings.lineOpacity;
    applySettingToWindows('lineOpacity', Settings.lineOpacity);
  });

  document.getElementById('weightSlider').addEventListener('input', (e) => {
    Settings.baseLineWeight = parseInt(e.target.value) / 10;
    document.getElementById('weightValue').textContent = Settings.baseLineWeight.toFixed(1);
    applySettingToWindows('baseLineWeight', Settings.baseLineWeight);
  });

  document.getElementById('intervalSlider').addEventListener('input', (e) => {
    Settings.drawInterval = parseInt(e.target.value);
    document.getElementById('intervalValue').textContent = Settings.drawInterval;
    for (let sys of systems) {
      sys.setVisualSettings({ drawInterval: Settings.drawInterval });
    }
  });

  document.getElementById('noiseSlider').addEventListener('input', (e) => {
    Settings.noiseAmount = parseInt(e.target.value);
    document.getElementById('noiseValue').textContent = Settings.noiseAmount;
    applySettingToWindows('noiseAmount', Settings.noiseAmount);
  });

  document.getElementById('cometSlider').addEventListener('input', (e) => {
    Settings.maxComets = parseInt(e.target.value);
    document.getElementById('cometValue').textContent = Settings.maxComets;
  });

  // Beat sensitivity slider
  const beatSensEl = document.getElementById('beatSensitivitySlider');
  if (beatSensEl) {
    beatSensEl.addEventListener('input', (e) => {
      Settings.beatSensitivity = parseInt(e.target.value) / 100;
      document.getElementById('beatSensitivityValue').textContent = Settings.beatSensitivity.toFixed(2);
      if (audioAnalyzer) {
        const cutoffRange = map(Settings.beatSensitivity, 0, 1, 0.5, 0.15);
        audioAnalyzer.bassCutoff = cutoffRange;
        audioAnalyzer.midCutoff = cutoffRange * 0.85;
        audioAnalyzer.trebleCutoff = cutoffRange * 0.7;
      }
    });
  }

  // Pulse strength slider
  const pulseStrEl = document.getElementById('pulseStrengthSlider');
  if (pulseStrEl) {
    pulseStrEl.addEventListener('input', (e) => {
      Settings.pulseStrength = parseInt(e.target.value);
      document.getElementById('pulseStrengthValue').textContent = Settings.pulseStrength;
      if (audioAnalyzer) {
        const strength = Settings.pulseStrength / 100;
        audioAnalyzer.bassPulseStrength = strength;
        audioAnalyzer.midPulseStrength = strength * 0.6;
        audioAnalyzer.treblePulseStrength = strength * 0.4;
        audioAnalyzer.pulseStrength = strength;
      }
    });
  }

  // Pitch sensitivity slider
  const pitchSensEl = document.getElementById('pitchSensitivitySlider');
  if (pitchSensEl) {
    pitchSensEl.addEventListener('input', (e) => {
      Settings.pitchSensitivity = parseInt(e.target.value) / 100;
      document.getElementById('pitchSensitivityValue').textContent = Settings.pitchSensitivity.toFixed(2);
    });
  }

  // Planet pair checkboxes
  Settings.planetPairsLeft.forEach((pair, index) => {
    const el = document.getElementById(pair.id);
    if (el) {
      el.addEventListener('change', (e) => {
        Settings.planetPairsLeft[index].enabled = e.target.checked;
        const activePairs = getActivePairIds(Settings.planetPairsLeft);

        // Update based on selected window
        if (Settings.selectedWindow === 'all') {
          // Update all windows except right (which has its own pairs)
          ['bass', 'mid', 'treble', 'main', 'left'].forEach(wid => {
            Settings.updateWindowSetting(wid, 'activePairs', activePairs);
          });
          for (let sys of systems) {
            if (sys.id !== 'right') {
              sys.setActivePairs(activePairs);
            }
          }
        } else if (Settings.selectedWindow !== 'right') {
          Settings.updateWindowSetting(Settings.selectedWindow, 'activePairs', activePairs);
          const sys = systems.find(s => s.id === Settings.selectedWindow);
          if (sys) {
            sys.setActivePairs(activePairs);
          }
        }
      });
    }
  });

  Settings.planetPairsRight.forEach((pair, index) => {
    const el = document.getElementById(pair.id);
    if (el) {
      el.addEventListener('change', (e) => {
        Settings.planetPairsRight[index].enabled = e.target.checked;
        const activePairs = getActivePairIds(Settings.planetPairsRight);
        Settings.updateWindowSetting('right', 'activePairs', activePairs);
        const rightSys = systems.find(s => s.id === 'right');
        if (rightSys) {
          rightSys.setActivePairs(activePairs);
        }
      });
    }
  });
}

// Update window selector options based on current layout
function updateWindowSelectorOptions() {
  const selector = document.getElementById('windowSelector');
  if (!selector) return;

  selector.innerHTML = '<option value="all">All Windows</option>';

  if (Settings.layoutMode === 'triple') {
    selector.innerHTML += '<option value="bass">Bass Window</option>';
    selector.innerHTML += '<option value="mid">Mid Window</option>';
    selector.innerHTML += '<option value="treble">Treble Window</option>';
  } else if (Settings.layoutMode === 'dual') {
    selector.innerHTML += '<option value="left">Left Window</option>';
    selector.innerHTML += '<option value="right">Right Window</option>';
  } else {
    selector.innerHTML += '<option value="main">Main Window</option>';
  }

  Settings.selectedWindow = 'all';
}

// Update UI controls to reflect selected window's settings
function updateUIFromSelectedWindow() {
  if (Settings.selectedWindow === 'all') return;

  const ws = Settings.getWindowSettings(Settings.selectedWindow);

  // Update draw mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === ws.drawMode);
  });

  // Update sliders
  const opacitySlider = document.getElementById('opacitySlider');
  if (opacitySlider) {
    opacitySlider.value = ws.lineOpacity;
    document.getElementById('opacityValue').textContent = ws.lineOpacity;
  }

  const weightSlider = document.getElementById('weightSlider');
  if (weightSlider) {
    weightSlider.value = ws.baseLineWeight * 10;
    document.getElementById('weightValue').textContent = ws.baseLineWeight.toFixed(1);
  }

  const noiseSlider = document.getElementById('noiseSlider');
  if (noiseSlider) {
    noiseSlider.value = ws.noiseAmount;
    document.getElementById('noiseValue').textContent = ws.noiseAmount;
  }

  // Update toggles
  const persistentToggle = document.getElementById('persistentTrailsToggle');
  if (persistentToggle) {
    persistentToggle.checked = ws.persistentTrails;
  }

  const bodiesToggle = document.getElementById('showBodiesToggle');
  if (bodiesToggle) {
    bodiesToggle.checked = ws.showBodies;
  }

  // Update physics mode buttons
  document.querySelectorAll('.physics-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.physics === ws.physicsMode);
  });
}

function togglePanel() {
  panelVisible = !panelVisible;
  document.getElementById('planetPanel').style.display = panelVisible ? 'block' : 'none';
  document.getElementById('panelToggle').textContent = panelVisible ? 'Close' : 'Settings';
}

// ============================================================================
// AUDIO CONTROLS
// ============================================================================
function startMicrophone() {
  userStartAudio().then(() => {
    audioAnalyzer.initMicrophone();

    const cutoffRange = map(Settings.beatSensitivity, 0, 1, 0.5, 0.15);
    audioAnalyzer.bassCutoff = cutoffRange;
    audioAnalyzer.midCutoff = cutoffRange * 0.85;
    audioAnalyzer.trebleCutoff = cutoffRange * 0.7;

    const strength = Settings.pulseStrength / 100;
    audioAnalyzer.bassPulseStrength = strength;
    audioAnalyzer.midPulseStrength = strength * 0.6;
    audioAnalyzer.treblePulseStrength = strength * 0.4;

    audioStarted = true;
    audioMode = 'mic';
    isPlaying = true;

    document.getElementById('controls').style.display = 'none';
    document.getElementById('songInfo').style.display = 'block';
    document.getElementById('songInfo').textContent = 'Listening to Microphone...';
    document.getElementById('panelToggle').style.display = 'block';

    resetDrawing();
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  currentFileName = file.name;

  document.getElementById('uploadBtn').textContent = 'Loading...';
  document.getElementById('uploadBtn').disabled = true;

  userStartAudio().then(() => {
    const fileURL = URL.createObjectURL(file);

    audioFile = loadSound(fileURL,
      () => {
        audioAnalyzer.initAudioFile(audioFile);

        const cutoffRange = map(Settings.beatSensitivity, 0, 1, 0.5, 0.15);
        audioAnalyzer.bassCutoff = cutoffRange;
        audioAnalyzer.midCutoff = cutoffRange * 0.85;
        audioAnalyzer.trebleCutoff = cutoffRange * 0.7;

        const strength = Settings.pulseStrength / 100;
        audioAnalyzer.bassPulseStrength = strength;
        audioAnalyzer.midPulseStrength = strength * 0.6;
        audioAnalyzer.treblePulseStrength = strength * 0.4;

        audioFile.loop();

        audioStarted = true;
        audioMode = 'file';
        isPlaying = true;

        document.getElementById('controls').style.display = 'none';
        document.getElementById('playbackControls').style.display = 'block';
        document.getElementById('songInfo').style.display = 'block';
        document.getElementById('songInfo').textContent = currentFileName;
        document.getElementById('panelToggle').style.display = 'block';

        resetDrawing();
      },
      (err) => {
        console.error('Error loading audio file:', err);
        alert('Error loading audio file. Please try a different file.');
        document.getElementById('uploadBtn').textContent = 'Upload Audio File';
        document.getElementById('uploadBtn').disabled = false;
      }
    );
  });
}

function togglePlayPause() {
  if (!audioFile) return;

  if (isPlaying) {
    audioFile.pause();
    isPlaying = false;
    document.getElementById('playPauseBtn').textContent = 'Play';
  } else {
    audioFile.play();
    isPlaying = true;
    document.getElementById('playPauseBtn').textContent = 'Pause';
  }
}

function restartAudio() {
  if (!audioFile) return;

  audioFile.stop();
  audioFile.play();
  isPlaying = true;
  document.getElementById('playPauseBtn').textContent = 'Pause';
  resetDrawing();
}

function resetDrawing() {
  for (let sys of systems) {
    sys.reset();
  }

  harmonographLayer.background(0);
  harmonographLayerRight.background(0);

  startTime = millis();
  comets = [];
  frameCounter = 0;
  Settings.lastBeatTime = millis();
  currentPulseScale = 1.0;
}

// ============================================================================
// MAIN DRAW LOOP
// ============================================================================
function draw() {
  background(0);

  let analysis = { volume: 0, isBeat: false, pulseScale: 1.0, bassBeat: false, midBeat: false, trebleBeat: false };

  if (audioStarted) {
    audioAnalyzer.analyze(audioMode);
    analysis = audioAnalyzer.getAnalysis();

    if (audioMode === 'file' && audioFile && audioFile.isPlaying()) {
      let progress = (audioFile.currentTime() / audioFile.duration()) * 100;
      document.getElementById('progressBar').style.width = progress + '%';
    }
  }

  let shouldDraw = false;

  if (isPlaying || audioMode === 'mic') {
    if (Settings.useBpmSync) {
      shouldDraw = Settings.shouldDrawOnBeat(millis());
    } else {
      frameCounter++;
      if (frameCounter >= Settings.drawInterval) {
        frameCounter = 0;
        shouldDraw = true;
      }
    }
  }

  if (isPlaying || audioMode === 'mic') {
    currentPulseScale = analysis.pulseScale;

    for (let sys of systems) {
      sys.update(audioAnalyzer);
      sys.draw(audioAnalyzer, shouldDraw);

      if (sys.frequencyRange === 'bass' || sys.frequencyRange === 'all') {
        currentPulseScale = max(currentPulseScale, sys.getPulseScale());
      }
    }
  }

  renderSystemsToCanvas();

  if (isPlaying || audioMode === 'mic') {
    updateComets(analysis.treble, analysis.isHighIntensity, analysis.isBeat);
  } else {
    drawCometsOnly();
  }

  if (audioStarted) {
    beatDebugView.update(audioAnalyzer);
    beatDebugView.draw();
  }

  if (showModeIndicatorFlag) {
    drawModeIndicator();
  }
}

function drawModeIndicator() {
  push();
  textAlign(CENTER, TOP);
  textSize(16);
  noStroke();

  const modeNames = {
    'legacy': 'LEGACY MODE (Circular Orbits)',
    'reactive': 'REACTIVE MODE (Audio + Gravity)',
  };

  const modeColors = {
    'legacy': [200, 80, 100],
    'reactive': [320, 80, 100],
  };

  const modeName = modeNames[Settings.physicsMode] || Settings.physicsMode;
  const modeColor = modeColors[Settings.physicsMode] || [0, 0, 100];

  fill(0, 0, 0, 80);
  rect(width / 2 - 180, 60, 360, 35, 5);

  fill(modeColor[0], modeColor[1], modeColor[2]);
  text(modeName, width / 2, 68);

  textSize(11);
  fill(0, 0, 70);
  text(`Time Scale: ${Settings.timeScale.toFixed(2)}x`, width / 2, 88);

  pop();
}

// ============================================================================
// RENDER SYSTEMS TO MAIN CANVAS
// ============================================================================
function renderSystemsToCanvas() {
  push();

  if (Settings.layoutMode === 'triple') {
    const sectionWidth = width / 3;

    for (let i = 0; i < systems.length; i++) {
      const sys = systems[i];
      const sectionCenterX = sys.x + sectionWidth / 2;
      const sectionCenterY = height / 2;
      const sysPulse = sys.getPulseScale();

      push();
      translate(sectionCenterX, sectionCenterY);
      scale(sysPulse);
      translate(-sectionCenterX, -sectionCenterY);
      image(sys.getGraphics(), sys.x, sys.y);
      pop();
    }

    stroke(0, 0, 30, 50);
    strokeWeight(1);
    line(width / 3, 0, width / 3, height);
    line(2 * width / 3, 0, 2 * width / 3, height);

    drawSystemLabels();

  } else if (Settings.layoutMode === 'dual') {
    const halfWidth = width / 2;

    if (systems[0]) {
      push();
      translate(halfWidth / 2, height / 2);
      scale(currentPulseScale);
      translate(-halfWidth / 2, -height / 2);
      image(systems[0].getGraphics(), 0, 0);
      pop();
    }

    if (systems[1]) {
      push();
      translate(halfWidth + halfWidth / 2, height / 2);
      scale(currentPulseScale);
      translate(-(halfWidth + halfWidth / 2), -height / 2);
      image(systems[1].getGraphics(), halfWidth, 0);
      pop();
    }

    stroke(0, 0, 100, 30);
    strokeWeight(1);
    line(width / 2, 0, width / 2, height);

  } else {
    if (systems[0]) {
      push();
      translate(width / 2, height / 2);
      scale(currentPulseScale);
      translate(-width / 2, -height / 2);
      image(systems[0].getGraphics(), 0, 0);
      pop();
    }
  }

  pop();
}

// ============================================================================
// DRAW SYSTEM LABELS (for triple mode)
// ============================================================================
function drawSystemLabels() {
  const labels = ['BASS', 'MID', 'TREBLE'];
  const sectionWidth = width / 3;

  push();
  textAlign(CENTER, TOP);
  textSize(12);
  noStroke();

  for (let i = 0; i < 3; i++) {
    const x = sectionWidth * i + sectionWidth / 2;

    fill(0, 0, 0, 70);
    rect(x - 30, 10, 60, 20, 5);

    fill(0, 0, 100, 80);
    text(labels[i], x, 14);
  }

  pop();

  // Draw filename in top-right corner
  if (currentFileName && audioStarted) {
    push();
    textAlign(RIGHT, TOP);
    textSize(11);
    fill(0, 0, 60);
    noStroke();
    text(currentFileName, width - 15, 15);
    pop();
  }
}

// ============================================================================
// COMET MANAGEMENT
// ============================================================================
function updateComets(trebleEnergy, isHighIntensity, isBeat) {
  if (Settings.physicsMode === 'reactive') {
    updateCometsPhysics(trebleEnergy, isHighIntensity, isBeat);
    return;
  }

  let targetComets = floor(map(trebleEnergy, 0, 0.5, 3, Settings.maxComets));
  targetComets = constrain(targetComets, 2, Settings.maxComets);

  if (isBeat && comets.length < Settings.maxComets) {
    let burstCount = floor(random(2, 5));
    for (let i = 0; i < burstCount && comets.length < Settings.maxComets; i++) {
      comets.push(new Comet());
    }
  }

  while (comets.length < targetComets) {
    comets.push(new Comet());
  }

  for (let i = comets.length - 1; i >= 0; i--) {
    let shouldReset = comets[i].update(trebleEnergy, isHighIntensity);

    if (shouldReset) {
      if (comets.length > targetComets * 0.5) {
        comets.splice(i, 1);
      } else {
        comets[i].reset();
      }
    } else {
      comets[i].draw();
    }
  }
}

function updateCometsPhysics(trebleEnergy, isHighIntensity, isBeat) {
  if (systems.length === 0) return;

  const gravitySystem = systems[0].getGravitySystem();
  if (!gravitySystem) return;

  let targetComets = floor(map(trebleEnergy, 0, 0.5, 3, Settings.maxComets));
  targetComets = constrain(targetComets, 2, Settings.maxComets);

  if (isBeat && gravitySystem.comets.length < Settings.maxComets) {
    let burstCount = floor(random(2, 4));
    for (let i = 0; i < burstCount && gravitySystem.comets.length < Settings.maxComets; i++) {
      gravitySystem.spawnComet();
    }
  }

  while (gravitySystem.comets.length < targetComets) {
    gravitySystem.spawnComet();
  }

  for (let comet of gravitySystem.comets) {
    drawPhysicsComet(comet);
  }
}

function drawPhysicsComet(body) {
  push();
  colorMode(RGB, 255);

  if (body.trail.length > 1) {
    noFill();
    for (let i = 0; i < body.trail.length - 1; i++) {
      let t = i / (body.trail.length - 1);
      let alpha = t * t * (body.life / body.maxLife) * 180;
      let weight = body.radius * t * 0.8;

      stroke(255, 255, 255, alpha);
      strokeWeight(weight);
      line(body.trail[i].x, body.trail[i].y, body.trail[i + 1].x, body.trail[i + 1].y);
    }
  }

  noStroke();
  let glowAlpha = (body.life / body.maxLife) * 30;
  fill(255, 255, 255, glowAlpha);
  ellipse(body.x, body.y, body.radius * 6);

  fill(255, 255, 255, glowAlpha * 2);
  ellipse(body.x, body.y, body.radius * 3);

  fill(255, 255, 255, (body.life / body.maxLife) * 255);
  ellipse(body.x, body.y, body.radius * 1.5);

  pop();
}

function drawCometsOnly() {
  if (Settings.physicsMode === 'reactive') {
    if (systems.length > 0) {
      const gravitySystem = systems[0].getGravitySystem();
      if (gravitySystem) {
        for (let comet of gravitySystem.comets) {
          drawPhysicsComet(comet);
        }
      }
    }
    return;
  }

  for (let i = comets.length - 1; i >= 0; i--) {
    let shouldReset = comets[i].update(0, false);

    if (shouldReset) {
      comets.splice(i, 1);
    } else {
      comets[i].draw();
    }
  }
}

// ============================================================================
// WINDOW RESIZE
// ============================================================================
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  initializeSystems();

  let oldLayer = harmonographLayer;
  let oldLayerRight = harmonographLayerRight;

  createGraphicsLayers();

  harmonographLayer.image(oldLayer, 0, 0);
  harmonographLayerRight.image(oldLayerRight, 0, 0);

  renderer = new HarmonographRenderer(harmonographLayer);
  rendererRight = new HarmonographRenderer(harmonographLayerRight);

  updateCenters();
}

// ============================================================================
// KEYBOARD CONTROLS
// ============================================================================
function keyPressed() {
  if (key === 'r' || key === 'R') {
    resetDrawing();
  }

  if (key === 's' || key === 'S') {
    saveCanvas('celestial-harmonograph', 'png');
  }

  if (key === ' ') {
    if (audioMode === 'file') {
      togglePlayPause();
    }
  }

  if (key === 'p' || key === 'P') {
    if (audioStarted) {
      togglePanel();
    }
  }

  if (key === 'd' || key === 'D') {
    if (audioStarted) {
      beatDebugView.toggle();
    }
  }

  if (key === '1') {
    Settings.layoutMode = 'single';
    Settings.splitScreen = false;
    updateWindowSelectorOptions();
    initializeSystems();
    resetDrawing();
  }
  if (key === '2') {
    Settings.layoutMode = 'dual';
    Settings.splitScreen = true;
    updateWindowSelectorOptions();
    initializeSystems();
    resetDrawing();
  }
  if (key === '3') {
    Settings.layoutMode = 'triple';
    Settings.splitScreen = false;
    updateWindowSelectorOptions();
    initializeSystems();
    resetDrawing();
  }

  if (key === 'g' || key === 'G') {
    togglePhysicsMode();
  }

  if (key === 'b' || key === 'B') {
    Settings.showBodies = !Settings.showBodies;
    applySettingToWindows('showBodies', Settings.showBodies);
  }

  if (key === '+' || key === '=') {
    Settings.timeScale = min(Settings.timeScale * 1.2, 5.0);
    for (let sys of systems) {
      sys.setTimeScale(Settings.timeScale);
    }
  }
  if (key === '-' || key === '_') {
    Settings.timeScale = max(Settings.timeScale / 1.2, 0.1);
    for (let sys of systems) {
      sys.setTimeScale(Settings.timeScale);
    }
  }
}

function togglePhysicsMode() {
  if (Settings.physicsMode === 'legacy') {
    Settings.physicsMode = 'reactive';
  } else {
    Settings.physicsMode = 'legacy';
  }

  applySettingToWindows('physicsMode', Settings.physicsMode);
  showModeIndicator();
}

let modeIndicatorTimeout = null;
let showModeIndicatorFlag = false;

function showModeIndicator() {
  showModeIndicatorFlag = true;
  if (modeIndicatorTimeout) clearTimeout(modeIndicatorTimeout);
  modeIndicatorTimeout = setTimeout(() => {
    showModeIndicatorFlag = false;
  }, 2000);
}

window.addEventListener('keydown', function (e) {
  if (e.code === 'Space' && audioStarted) {
    e.preventDefault();
  }
});
