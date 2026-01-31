// ============================================================================
// THE CELESTIAL HARMONOGRAPH - Rhythmically Responsive Version
// "A breathing solar system that thumps on the kick drum"
// ============================================================================

// Core components
let audioAnalyzer;
let renderer;
let rendererRight;

// Graphics layers (for trails with pulse effect)
let harmonographLayer;
let harmonographLayerRight;

// Planets
let planetsLeft = [];
let planetsRight = [];

// Center points
let centerX, centerY;
let centerXLeft, centerYLeft;
let centerXRight, centerYRight;

// Comets
let comets = [];

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

  // Create graphics layers
  createGraphicsLayers();

  // Create renderers
  renderer = new HarmonographRenderer(harmonographLayer);
  rendererRight = new HarmonographRenderer(harmonographLayerRight);

  // Create audio analyzer
  audioAnalyzer = new AudioAnalyzer(60);

  // Initialize centers
  updateCenters();

  // Initialize planets
  initializePlanets();

  // Initialize timing
  startTime = millis();

  // Setup UI
  setupUIListeners();
}

function createGraphicsLayers() {
  harmonographLayer = createGraphics(width, height);
  harmonographLayer.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayer.background(0);

  harmonographLayerRight = createGraphics(width, height);
  harmonographLayerRight.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayerRight.background(0);
}

// ============================================================================
// INITIALIZE PLANETS
// ============================================================================
function initializePlanets() {
  // Planet A: Outer orbit, slower (anchor planet)
  // Planet B: Dynamic orbit based on pitch
  // Planet C & D: Additional planets for complex patterns

  planetsLeft = [
    new Planet(0.75, 7, 0, 'A'),           // Outer anchor
    new Planet(0.5, 11, PI/4, 'B'),        // Pitch-reactive
    new Planet(0.35, 13, PI/2, 'C'),       // Inner
    new Planet(0.2, 17, 3*PI/4, 'D'),      // Core
  ];

  planetsRight = [
    new Planet(0.75, 7, PI/6, 'A'),
    new Planet(0.5, 11, PI/3, 'B'),
    new Planet(0.35, 13, 2*PI/3, 'C'),
    new Planet(0.2, 17, 5*PI/6, 'D'),
  ];
}

// ============================================================================
// UPDATE CENTERS
// ============================================================================
function updateCenters() {
  if (Settings.splitScreen) {
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

  // Trail persistence toggle
  document.getElementById('persistentTrailsToggle').addEventListener('change', (e) => {
    Settings.persistentTrails = e.target.checked;
  });

  // Drawing mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      Settings.drawMode = e.target.dataset.mode;
    });
  });

  // Split screen toggle
  document.getElementById('splitScreenToggle').addEventListener('change', (e) => {
    Settings.splitScreen = e.target.checked;
    document.getElementById('rightPairsSection').style.display = e.target.checked ? 'block' : 'none';
    document.getElementById('pairsHeaderLeft').textContent = e.target.checked ? 'Left Side Pairs' : 'Planet Pairs';
    updateCenters();
    resetDrawing();
  });

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
  });

  document.getElementById('weightSlider').addEventListener('input', (e) => {
    Settings.baseLineWeight = parseInt(e.target.value) / 10;
    document.getElementById('weightValue').textContent = Settings.baseLineWeight.toFixed(1);
  });

  document.getElementById('intervalSlider').addEventListener('input', (e) => {
    Settings.drawInterval = parseInt(e.target.value);
    document.getElementById('intervalValue').textContent = Settings.drawInterval;
  });

  document.getElementById('noiseSlider').addEventListener('input', (e) => {
    Settings.noiseAmount = parseInt(e.target.value);
    document.getElementById('noiseValue').textContent = Settings.noiseAmount;
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
      // Update analyzer threshold
      if (audioAnalyzer) {
        audioAnalyzer.beatCutoff = map(Settings.beatSensitivity, 0, 1, 0.5, 0.15);
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
        audioAnalyzer.pulseStrength = Settings.pulseStrength / 100;
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
      });
    }
  });

  Settings.planetPairsRight.forEach((pair, index) => {
    const el = document.getElementById(pair.id);
    if (el) {
      el.addEventListener('change', (e) => {
        Settings.planetPairsRight[index].enabled = e.target.checked;
      });
    }
  });
}

function togglePanel() {
  panelVisible = !panelVisible;
  document.getElementById('planetPanel').style.display = panelVisible ? 'block' : 'none';
  document.getElementById('panelToggle').textContent = panelVisible ? '✕ Close' : '⚙ Settings';
}

// ============================================================================
// AUDIO CONTROLS
// ============================================================================
function startMicrophone() {
  userStartAudio().then(() => {
    audioAnalyzer.initMicrophone();
    // Apply current settings to analyzer
    audioAnalyzer.beatCutoff = map(Settings.beatSensitivity, 0, 1, 0.5, 0.15);
    audioAnalyzer.pulseStrength = Settings.pulseStrength / 100;

    audioStarted = true;
    audioMode = 'mic';
    isPlaying = true;

    document.getElementById('controls').style.display = 'none';
    document.getElementById('songInfo').style.display = 'block';
    document.getElementById('songInfo').textContent = '🎤 Listening to Microphone...';
    document.getElementById('panelToggle').style.display = 'block';

    resetDrawing();
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  currentFileName = file.name;

  document.getElementById('uploadBtn').textContent = '⏳ Loading...';
  document.getElementById('uploadBtn').disabled = true;

  userStartAudio().then(() => {
    const fileURL = URL.createObjectURL(file);

    audioFile = loadSound(fileURL,
      () => {
        audioAnalyzer.initAudioFile(audioFile);
        // Apply current settings
        audioAnalyzer.beatCutoff = map(Settings.beatSensitivity, 0, 1, 0.5, 0.15);
        audioAnalyzer.pulseStrength = Settings.pulseStrength / 100;

        audioFile.loop();

        audioStarted = true;
        audioMode = 'file';
        isPlaying = true;

        document.getElementById('controls').style.display = 'none';
        document.getElementById('playbackControls').style.display = 'block';
        document.getElementById('songInfo').style.display = 'block';
        document.getElementById('songInfo').textContent = '🎵 ' + currentFileName;
        document.getElementById('panelToggle').style.display = 'block';

        resetDrawing();
      },
      (err) => {
        console.error('Error loading audio file:', err);
        alert('Error loading audio file. Please try a different file.');
        document.getElementById('uploadBtn').textContent = '📁 Upload Audio File';
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
    document.getElementById('playPauseBtn').textContent = '▶ Play';
  } else {
    audioFile.play();
    isPlaying = true;
    document.getElementById('playPauseBtn').textContent = '⏸ Pause';
  }
}

function restartAudio() {
  if (!audioFile) return;

  audioFile.stop();
  audioFile.play();
  isPlaying = true;
  document.getElementById('playPauseBtn').textContent = '⏸ Pause';
  resetDrawing();
}

function resetDrawing() {
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
  // Clear main canvas completely
  background(0);

  // Analyze audio
  let analysis = { volume: 0, isBeat: false, pulseScale: 1.0 };

  if (audioStarted) {
    audioAnalyzer.analyze(audioMode);
    analysis = audioAnalyzer.getAnalysis();

    // Update progress bar
    if (audioMode === 'file' && audioFile && audioFile.isPlaying()) {
      let progress = (audioFile.currentTime() / audioFile.duration()) * 100;
      document.getElementById('progressBar').style.width = progress + '%';
    }
  }

  // ========================================
  // BEAT-TRIGGERED EFFECTS
  // ========================================
  if (analysis.isBeat) {
    // Trigger color shift in renderers
    renderer.onBeat(analysis.beatIntensity);
    rendererRight.onBeat(analysis.beatIntensity);

    // Extra background fade on beat for "pumping" effect
    if (Settings.pulseFadeBackground) {
      applyBeatFade(harmonographLayer, analysis.beatIntensity);
      if (Settings.splitScreen) {
        applyBeatFade(harmonographLayerRight, analysis.beatIntensity);
      }
    }
  }

  // Get the current pulse scale for the "breathing" effect
  currentPulseScale = analysis.pulseScale;

  // ========================================
  // UPDATE & DRAW HARMONOGRAPH
  // ========================================
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

    let elapsedTime = millis() - startTime;

    // Update pitch-reactive radius for Planet B (index 1)
    updatePitchReactiveRadius(analysis);

    if (Settings.splitScreen) {
      drawSplitScreen(analysis, elapsedTime, shouldDraw);
    } else {
      drawFullScreen(analysis, elapsedTime, shouldDraw);
    }
  }

  // ========================================
  // DRAW THE GRAPHICS LAYER WITH PULSE SCALING
  // ========================================
  drawWithPulse(analysis);

  // ========================================
  // DRAW COMETS
  // ========================================
  if (isPlaying || audioMode === 'mic') {
    updateComets(analysis.treble, analysis.isHighIntensity, analysis.isBeat);
  } else {
    drawCometsOnly();
  }
}

// ============================================================================
// APPLY BEAT FADE (Extra background fade on beat)
// ============================================================================
function applyBeatFade(layer, intensity) {
  layer.push();
  layer.blendMode(BLEND);
  layer.noStroke();
  // Stronger fade on stronger beats
  let fadeAmount = map(intensity, 0.5, 1, 5, 15);
  layer.fill(0, 0, 0, fadeAmount);
  layer.rect(0, 0, layer.width, layer.height);
  layer.pop();
}

// ============================================================================
// UPDATE PITCH-REACTIVE RADIUS
// ============================================================================
function updatePitchReactiveRadius(analysis) {
  // Get pitch-mapped radius from analyzer
  // Low pitch = large radius, High pitch = small radius
  let pitchRadius = audioAnalyzer.getPitchRadius(
    Settings.pitchRadiusMin,
    Settings.pitchRadiusMax
  );

  // Apply sensitivity scaling
  let baseRadius = 0.5; // Default middle radius
  pitchRadius = lerp(baseRadius, pitchRadius, Settings.pitchSensitivity);

  // Update Planet B's target radius (index 1)
  planetsLeft[1].setTargetRadius(pitchRadius);
  planetsRight[1].setTargetRadius(pitchRadius);

  // Optionally also affect Planet C slightly
  let secondaryRadius = lerp(0.35, pitchRadius * 0.7, Settings.pitchSensitivity * 0.5);
  planetsLeft[2].setTargetRadius(secondaryRadius);
  planetsRight[2].setTargetRadius(secondaryRadius);
}

// ============================================================================
// DRAW WITH PULSE SCALING
// ============================================================================
function drawWithPulse(analysis) {
  push();

  if (Settings.splitScreen) {
    // Left half with pulse
    push();
    translate(width / 4, height / 2);
    scale(currentPulseScale);
    translate(-width / 4, -height / 2);
    image(harmonographLayer, 0, 0, width / 2, height, 0, 0, width / 2, height);
    pop();

    // Right half with pulse
    push();
    translate(width * 3 / 4, height / 2);
    scale(currentPulseScale);
    translate(-width * 3 / 4, -height / 2);
    image(harmonographLayerRight, width / 2, 0, width / 2, height, width / 2, 0, width / 2, height);
    pop();

    // Draw divider
    stroke(255, 30);
    strokeWeight(1);
    line(width / 2, 0, width / 2, height);

  } else {
    // Full screen with pulse - scale from center
    translate(width / 2, height / 2);
    scale(currentPulseScale);
    translate(-width / 2, -height / 2);
    image(harmonographLayer, 0, 0);
  }

  pop();
}

// ============================================================================
// FULL SCREEN DRAWING
// ============================================================================
function drawFullScreen(analysis, elapsedTime, shouldDraw) {
  // Apply background fade based on persistence mode
  let fadeAmount = Settings.persistentTrails ? Settings.trailFadeAmount : Settings.quickFadeAmount;

  harmonographLayer.push();
  harmonographLayer.noStroke();
  harmonographLayer.fill(0, 0, 0, fadeAmount);
  harmonographLayer.rect(0, 0, width, height);
  harmonographLayer.pop();

  // Update all planets
  for (let planet of planetsLeft) {
    planet.update(centerX, centerY, elapsedTime, FULL_CYCLE_DURATION, analysis.smoothedVolume);
  }

  if (shouldDraw) {
    const drawSettings = {
      lineOpacity: Settings.lineOpacity,
      baseLineWeight: Settings.baseLineWeight,
      noiseAmount: Settings.noiseAmount,
    };

    for (let pair of Settings.planetPairsLeft) {
      if (pair.enabled) {
        const posA = planetsLeft[pair.p1].getPosition();
        const posB = planetsLeft[pair.p2].getPosition();

        if (Settings.drawMode === 'lines' || Settings.drawMode === 'both') {
          renderer.drawLinkLine(posA, posB, pair.hue, analysis, drawSettings);
        }

        if (Settings.drawMode === 'midpoints' || Settings.drawMode === 'both') {
          renderer.drawMidpoint(posA, posB, pair.hue, analysis, drawSettings);
        }
      }
    }
  }
}

// ============================================================================
// SPLIT SCREEN DRAWING
// ============================================================================
function drawSplitScreen(analysis, elapsedTime, shouldDraw) {
  // Apply background fade based on persistence mode
  let fadeAmount = Settings.persistentTrails ? Settings.trailFadeAmount : Settings.quickFadeAmount;

  [harmonographLayer, harmonographLayerRight].forEach(layer => {
    layer.push();
    layer.noStroke();
    layer.fill(0, 0, 0, fadeAmount);
    layer.rect(0, 0, layer.width, layer.height);
    layer.pop();
  });

  // Update left planets
  for (let planet of planetsLeft) {
    planet.update(centerXLeft, centerYLeft, elapsedTime, FULL_CYCLE_DURATION, analysis.smoothedVolume);
  }

  // Update right planets
  for (let planet of planetsRight) {
    planet.update(centerXRight, centerYRight, elapsedTime, FULL_CYCLE_DURATION, analysis.smoothedVolume);
  }

  if (shouldDraw) {
    const drawSettings = {
      lineOpacity: Settings.lineOpacity,
      baseLineWeight: Settings.baseLineWeight,
      noiseAmount: Settings.noiseAmount,
    };

    // Draw left side
    for (let pair of Settings.planetPairsLeft) {
      if (pair.enabled) {
        const posA = planetsLeft[pair.p1].getPosition();
        const posB = planetsLeft[pair.p2].getPosition();

        if (Settings.drawMode === 'lines' || Settings.drawMode === 'both') {
          renderer.drawLinkLine(posA, posB, pair.hue, analysis, drawSettings);
        }

        if (Settings.drawMode === 'midpoints' || Settings.drawMode === 'both') {
          renderer.drawMidpoint(posA, posB, pair.hue, analysis, drawSettings);
        }
      }
    }

    // Draw right side
    for (let pair of Settings.planetPairsRight) {
      if (pair.enabled) {
        const posA = planetsRight[pair.p1].getPosition();
        const posB = planetsRight[pair.p2].getPosition();

        if (Settings.drawMode === 'lines' || Settings.drawMode === 'both') {
          rendererRight.drawLinkLine(posA, posB, pair.hue, analysis, drawSettings);
        }

        if (Settings.drawMode === 'midpoints' || Settings.drawMode === 'both') {
          rendererRight.drawMidpoint(posA, posB, pair.hue, analysis, drawSettings);
        }
      }
    }
  }
}

// ============================================================================
// COMET MANAGEMENT
// ============================================================================
function updateComets(trebleEnergy, isHighIntensity, isBeat) {
  let targetComets = floor(map(trebleEnergy, 0, 0.5, 3, Settings.maxComets));
  targetComets = constrain(targetComets, 2, Settings.maxComets);

  // Spawn burst of comets on beat
  if (isBeat && comets.length < Settings.maxComets) {
    let burstCount = floor(random(2, 5));
    for (let i = 0; i < burstCount && comets.length < Settings.maxComets; i++) {
      comets.push(new Comet());
    }
  }

  // Normal spawning
  while (comets.length < targetComets) {
    comets.push(new Comet());
  }

  // Update and draw
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

function drawCometsOnly() {
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

  // Recreate graphics layers
  let oldLayer = harmonographLayer;
  let oldLayerRight = harmonographLayerRight;

  createGraphicsLayers();

  // Copy old content
  harmonographLayer.image(oldLayer, 0, 0);
  harmonographLayerRight.image(oldLayerRight, 0, 0);

  // Update renderers
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
}

window.addEventListener('keydown', function(e) {
  if (e.code === 'Space' && audioStarted) {
    e.preventDefault();
  }
});
