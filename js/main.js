// ============================================================================
// THE CELESTIAL HARMONOGRAPH - Main Application
// ============================================================================

// Core components
let audioAnalyzer;
let renderer;
let rendererRight; // For split screen

// Graphics layers
let harmonographLayer;
let harmonographLayerRight; // For split screen

// Planets - two sets for split screen
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

// Frame counter for draw interval
let frameCounter = 0;

// Panel visibility
let panelVisible = false;

// ============================================================================
// p5.js SETUP
// ============================================================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // Create graphics layers
  harmonographLayer = createGraphics(width, height);
  harmonographLayer.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayer.background(0);

  harmonographLayerRight = createGraphics(width, height);
  harmonographLayerRight.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayerRight.background(0);

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

// ============================================================================
// INITIALIZE PLANETS
// ============================================================================
function initializePlanets() {
  // Left side planets (or full screen when not split)
  planetsLeft = [
    new Planet(0.85, 7, 0, 'A'),
    new Planet(0.65, 11, PI/4, 'B'),
    new Planet(0.45, 13, PI/2, 'C'),
    new Planet(0.25, 17, 3*PI/4, 'D'),
  ];

  // Right side planets (for split screen - slightly different phase)
  planetsRight = [
    new Planet(0.85, 7, PI/6, 'A'),
    new Planet(0.65, 11, PI/3, 'B'),
    new Planet(0.45, 13, 2*PI/3, 'C'),
    new Planet(0.25, 17, 5*PI/6, 'D'),
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

  // Left side planet pair checkboxes
  Settings.planetPairsLeft.forEach((pair, index) => {
    const el = document.getElementById(pair.id);
    if (el) {
      el.addEventListener('change', (e) => {
        Settings.planetPairsLeft[index].enabled = e.target.checked;
      });
    }
  });

  // Right side planet pair checkboxes
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
}

// ============================================================================
// MAIN DRAW LOOP
// ============================================================================
function draw() {
  // Clear main canvas
  background(0, 0, 0, 15);

  // Analyze audio
  if (audioStarted) {
    audioAnalyzer.analyze(audioMode);

    // Update progress bar
    if (audioMode === 'file' && audioFile && audioFile.isPlaying()) {
      let progress = (audioFile.currentTime() / audioFile.duration()) * 100;
      document.getElementById('progressBar').style.width = progress + '%';
    }
  }

  const analysis = audioAnalyzer.getAnalysis();

  // Check if we should draw this frame
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

    // Calculate elapsed time
    let elapsedTime = millis() - startTime;

    if (Settings.splitScreen) {
      // SPLIT SCREEN MODE
      drawSplitScreen(analysis, elapsedTime, shouldDraw);
    } else {
      // FULL SCREEN MODE
      drawFullScreen(analysis, elapsedTime, shouldDraw);
    }
  }

  // Draw the harmonograph layers
  if (Settings.splitScreen) {
    // Draw left half
    image(harmonographLayer, 0, 0, width/2, height, 0, 0, width/2, height);
    // Draw right half
    image(harmonographLayerRight, width/2, 0, width/2, height, width/2, 0, width/2, height);

    // Draw divider
    stroke(255, 50);
    strokeWeight(1);
    line(width/2, 0, width/2, height);
  } else {
    image(harmonographLayer, 0, 0);
  }

  // Draw comets
  if (isPlaying || audioMode === 'mic') {
    updateComets(analysis.trebleEnergy, analysis.isHighIntensity);
  } else {
    drawCometsOnly();
  }
}

// ============================================================================
// FULL SCREEN DRAWING
// ============================================================================
function drawFullScreen(analysis, elapsedTime, shouldDraw) {
  // Update all planets
  for (let planet of planetsLeft) {
    planet.update(analysis.volume, centerX, centerY, elapsedTime, FULL_CYCLE_DURATION);
  }

  if (shouldDraw) {
    // Draw for each enabled pair
    for (let pair of Settings.planetPairsLeft) {
      if (pair.enabled) {
        const posA = planetsLeft[pair.p1].getPosition();
        const posB = planetsLeft[pair.p2].getPosition();

        const drawSettings = {
          lineOpacity: Settings.lineOpacity,
          baseLineWeight: Settings.baseLineWeight,
          noiseAmount: Settings.noiseAmount,
          spectralCentroid: analysis.spectralCentroid,
          volume: analysis.volume,
          avgVolume: analysis.avgVolume
        };

        if (Settings.drawMode === 'lines' || Settings.drawMode === 'both') {
          renderer.drawLinkLine(posA, posB, pair.hue, analysis.volume, analysis.isTense, drawSettings);
        }

        if (Settings.drawMode === 'midpoints' || Settings.drawMode === 'both') {
          renderer.drawMidpoint(posA, posB, pair.hue, analysis.volume, analysis.isTense, drawSettings);
        }
      }
    }
  }
}

// ============================================================================
// SPLIT SCREEN DRAWING
// ============================================================================
function drawSplitScreen(analysis, elapsedTime, shouldDraw) {
  // Update left planets
  for (let planet of planetsLeft) {
    planet.update(analysis.volume, centerXLeft, centerYLeft, elapsedTime, FULL_CYCLE_DURATION);
  }

  // Update right planets
  for (let planet of planetsRight) {
    planet.update(analysis.volume, centerXRight, centerYRight, elapsedTime, FULL_CYCLE_DURATION);
  }

  if (shouldDraw) {
    const drawSettings = {
      lineOpacity: Settings.lineOpacity,
      baseLineWeight: Settings.baseLineWeight,
      noiseAmount: Settings.noiseAmount,
      spectralCentroid: analysis.spectralCentroid,
      volume: analysis.volume,
      avgVolume: analysis.avgVolume
    };

    // Draw left side
    for (let pair of Settings.planetPairsLeft) {
      if (pair.enabled) {
        const posA = planetsLeft[pair.p1].getPosition();
        const posB = planetsLeft[pair.p2].getPosition();

        if (Settings.drawMode === 'lines' || Settings.drawMode === 'both') {
          renderer.drawLinkLine(posA, posB, pair.hue, analysis.volume, analysis.isTense, drawSettings);
        }

        if (Settings.drawMode === 'midpoints' || Settings.drawMode === 'both') {
          renderer.drawMidpoint(posA, posB, pair.hue, analysis.volume, analysis.isTense, drawSettings);
        }
      }
    }

    // Draw right side
    for (let pair of Settings.planetPairsRight) {
      if (pair.enabled) {
        const posA = planetsRight[pair.p1].getPosition();
        const posB = planetsRight[pair.p2].getPosition();

        if (Settings.drawMode === 'lines' || Settings.drawMode === 'both') {
          rendererRight.drawLinkLine(posA, posB, pair.hue, analysis.volume, analysis.isTense, drawSettings);
        }

        if (Settings.drawMode === 'midpoints' || Settings.drawMode === 'both') {
          rendererRight.drawMidpoint(posA, posB, pair.hue, analysis.volume, analysis.isTense, drawSettings);
        }
      }
    }
  }
}

// ============================================================================
// COMET MANAGEMENT
// ============================================================================
function updateComets(trebleEnergy, isHighIntensity) {
  let targetComets = floor(map(trebleEnergy, 0, 0.5, 5, Settings.maxComets));
  targetComets = constrain(targetComets, 3, Settings.maxComets);

  // Spawn new comets if needed
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

  harmonographLayer = createGraphics(width, height);
  harmonographLayer.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayer.background(0);
  harmonographLayer.image(oldLayer, 0, 0);

  harmonographLayerRight = createGraphics(width, height);
  harmonographLayerRight.colorMode(HSB, 360, 100, 100, 100);
  harmonographLayerRight.background(0);
  harmonographLayerRight.image(oldLayerRight, 0, 0);

  // Update renderers
  renderer = new HarmonographRenderer(harmonographLayer);
  rendererRight = new HarmonographRenderer(harmonographLayerRight);

  // Update centers
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
