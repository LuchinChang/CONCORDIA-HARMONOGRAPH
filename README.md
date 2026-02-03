# The Celestial Harmonograph

An audio-reactive generative art visualization built with p5.js. The system creates mesmerizing geometric patterns that respond to music in real-time, behaving like a "breathing solar system" that expands on bass notes, contracts on high pitches, and pulses on kick drums.

![Harmonograph Preview](preview.png)

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Audio to Visual Mapping](#audio-to-visual-mapping)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Key Classes](#key-classes)
- [Settings Reference](#settings-reference)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tips for Best Results](#tips-for-best-results)

---

## Features

### Multi-Band Audio Reactivity
- **Independent Beat Detection**: Separate detection for Bass (kicks), Mid (snares), and Treble (hi-hats)
- **Triple Split-Screen Mode**: Each frequency band gets its own visualization window
- **Pitch → Radius**: Low frequencies expand planet orbits; high frequencies contract them
- **Dynamic Line Quality**: Quiet = thin & elegant; Loud = thick & electric

### Visualization Modes
- **Layout Modes**: Single, Dual (split), or Triple (Bass|Mid|Treble)
- **Per-Window Settings**: Configure each window independently
- **Persistent Trails**: Accumulate lines forever or let them fade
- **Drawing Modes**: Lines, Midpoints, or Both
- **Physics Modes**: Legacy (circular orbits) or Reactive (audio-modulated gravity)

### The Geometry
Four "planets" orbit at prime-number ratios (7:11:13:17), creating complex, never-repeating interference patterns. Lines drawn between planet pairs create the harmonograph effect.

### Debug View
Real-time visualization of beat detection showing energy levels, thresholds, and beat triggers for all three frequency bands.

---

## Quick Start

### Option 1: Run Script (Recommended)
```bash
chmod +x run.sh
./run.sh
```

### Option 2: Manual
```bash
python3 -m http.server 8000
open http://localhost:8000
```

### Option 3: Using Node.js
```bash
npx http-server -p 8000
```

Then:
1. Choose **Microphone** or **Upload Audio File**
2. Press `?` for the interactive help guide
3. Press `3` for Triple mode (Bass | Mid | Treble split)
4. Press `P` to open settings
5. Press `D` to view beat detection debug

> **New to Harmonograph?** Press `?` or click the help button for a quick start guide with tips and recommended settings.

---

## Audio to Visual Mapping

### Frequency Band Detection

The `AudioAnalyzer` splits audio into frequency bands with independent beat detection:

| Band | Frequency Range | Typical Sounds | Cooldown | Sensitivity |
|------|----------------|----------------|----------|-------------|
| **Bass** | 20-140 Hz | Kick drums, bass guitar | 200ms | 1.5x |
| **Mid** | 400-2600 Hz | Snare, vocals, guitars | 150ms | 1.4x |
| **Treble** | 5200-14000 Hz | Hi-hats, cymbals | 100ms | 1.3x |

### Beat Detection Algorithm

Each band uses an **adaptive threshold** with sliding window:

```
Beat Detected = (Energy > DecayingThreshold)
             && (Energy > AdaptiveThreshold)
             && (IsRisingEdge)
             && (TimeSinceLastBeat > Cooldown)
```

**Components:**
- **Decaying Threshold**: Set to energy at last beat, decays at 0.90-0.95 per frame (prevents double-triggers)
- **Adaptive Threshold**: `avgEnergy × adaptiveMultiplier` (capped at 0.98)
- **Adaptive Multiplier**: Higher when quiet (1.5x), lower when loud (1.2x)
- **Rising Edge**: Current energy > previous frame (catches attack, not sustain)
- **Cooldown**: Minimum ms between beats (faster for treble)

### Visual Mapping Rules

#### 1. Pulse (Screen "Thump")

On beat detection, the entire visualization scales up then decays:

| Frequency | Pulse Strength | Decay Rate | Character |
|-----------|---------------|------------|-----------|
| **Bass** | 8-12% | 0.92 | Strong, punchy |
| **Mid** | 5-8% | 0.90 | Moderate |
| **Treble** | 3-5% | 0.85 | Subtle, quick |

```javascript
// On beat:
pulseScale = 1.0 + (beatIntensity × pulseStrength)

// Each frame:
pulseScale = lerp(pulseScale, 1.0, 1 - pulseDecay)
```

#### 2. Orbit Radius (Pitch Reactivity)

The **spectral centroid** (perceived pitch center) controls Planet B's orbital radius:

```javascript
// Normalize centroid (log scale, 100Hz-8000Hz → 0-1)
normalizedCentroid = map(log(centroid), log(100), log(8000), 0, 1)

// Low pitch = large radius, High pitch = small radius
pitchRadius = map(smoothedCentroid, 0, 1, 0.7, 0.3)

// Planet B follows pitch
planetB.setTargetRadius(pitchRadius)

// Planet C follows at 70% scale
planetC.setTargetRadius(pitchRadius × 0.7)
```

#### 3. Line Quality (Volume/Tension)

| Volume Level | Line Weight | Line Style | When |
|--------------|-------------|------------|------|
| Low (< 30%) | 0.3-1.0 | Smooth, clean | Quiet passages |
| Medium (30-60%) | 1.0-2.0 | Slightly noisy | Normal playing |
| High/Tense | 2.0-2.5 | Electric/jagged | Loud or beat moments |

**Tension Detection:**
```javascript
isTense = (volume > avgVolume × 1.2) || (treble > 0.2) || isBeat
```

When tense, lines use Perlin noise displacement:
```javascript
jitterStrength = noiseAmount × smoothedVolume × 3
displacement = (noise(x, y, time) - 0.5) × 2 × jitterStrength
```

#### 4. Color Mapping

Each planet pair has a **base hue**, modified by audio:

| Pair | Base Hue | Color |
|------|----------|-------|
| A-B | 200° | Blue |
| A-C | 320° | Magenta |
| B-C | 60° | Yellow |
| A-D | 140° | Green |
| B-D | 280° | Purple |
| C-D | 20° | Orange |

**Dynamic Shifts:**
```javascript
// Beat shifts hue by +15° (accumulates, wraps at 360)
beatHueShift = (beatHueShift + 15 × beatIntensity) % 360

// Pitch shifts ±15° from base
centroidShift = map(spectralCentroid, 0, 1, -15, +15)

// Final color
finalHue = (baseHue + beatHueShift + centroidShift) % 360
```

**Saturation/Brightness:**
```javascript
if (isBeat) {
  saturation = 90, brightness = 100  // Vivid on beat
} else {
  saturation = map(volume, 0, 0.3, 50, 80)
  brightness = map(volume, 0, 0.2, 60, 95)
}
```

#### 5. Trail Fade (Beat-Reactive Breathing)

On beat, trails fade slightly more to create a "breathing" effect:

```javascript
// Normal fade (persistent mode)
fadeAmount = trailFadeAmount  // Usually 0

// On beat, add extra fade
if (isBeat) {
  fadeAmount = max(fadeAmount, map(beatIntensity, 0.5, 1, 5, 15))
}

// Apply fade
graphics.fill(0, 0, 0, fadeAmount)
graphics.rect(0, 0, width, height)
```

### Triple Mode Behavior

In triple split-screen, each window reacts independently:

| Window | Reacts To | Unique Behavior |
|--------|-----------|-----------------|
| **BASS** (Left) | `bassBeat`, `bassBeatIntensity` | Strong pulse (12%), stable lines |
| **MID** (Center) | `midBeat`, `midBeatIntensity` | Pitch-reactive orbits, moderate pulse |
| **TREBLE** (Right) | `trebleBeat`, `trebleBeatIntensity` | High electricity, fast subtle pulses |

Default per-window settings:
- **Bass**: `noiseAmount: 60`, `pulseStrength: 12%`, `lineWeight: 0.8`
- **Mid**: `noiseAmount: 40`, `pulseStrength: 8%`, `lineWeight: 0.8`
- **Treble**: `noiseAmount: 80`, `pulseStrength: 5%`, `lineWeight: 0.6`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         main.js                              │
│  - p5.js setup/draw loop                                    │
│  - System orchestration                                      │
│  - UI event handling                                         │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ HarmonographSystem│ │ HarmonographSystem│ │ HarmonographSystem│
│     (Bass)       │  │     (Mid)        │  │    (Treble)     │
│  frequencyRange: │  │  frequencyRange: │  │  frequencyRange: │
│     'bass'       │  │     'mid'        │  │     'treble'     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Planet.js     │  │ HarmonographRenderer│ │  GravitySystem  │
│ (Orbital motion)│  │ (Line drawing)      │  │ (Physics sim)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  AudioAnalyzer  │
                    │ - Multi-band FFT│
                    │ - 3 beat detectors│
                    │ - 3 pulse states│
                    └─────────────────┘
```

---

## File Structure

```
harmonograph/
├── index.html              # Main HTML entry point
├── styles.css              # UI styling
├── run.sh                  # Quick-start script
├── README.md               # This file
└── js/
    ├── main.js             # Application orchestrator
    ├── Settings.js         # Global & per-window settings
    ├── AudioAnalyzer.js    # Multi-band audio analysis
    ├── HarmonographSystem.js # Self-contained drawing system
    ├── HarmonographRenderer.js # Line/midpoint drawing
    ├── Planet.js           # Orbital body with physics support
    ├── GravitySystem.js    # N-body physics simulation
    ├── Comet.js            # Decorative comet particles
    └── BeatDebugView.js    # 3-band beat visualization
```

---

## Key Classes

### AudioAnalyzer

Multi-band audio analysis with independent beat detection.

```javascript
const analyzer = new AudioAnalyzer(historyLength = 60);

// Initialize
analyzer.initMicrophone();
// or
analyzer.initAudioFile(p5SoundFile);

// Each frame
analyzer.analyze(audioMode); // 'mic' or 'file'

// Get all results
const analysis = analyzer.getAnalysis();

// Key properties in analysis:
// - bass, mid, treble (0-1 energy)
// - smoothedBass, smoothedMid, smoothedTreble
// - bassBeat, midBeat, trebleBeat (boolean)
// - bassBeatIntensity, midBeatIntensity, trebleBeatIntensity (0-1)
// - spectralCentroid (0-1, low to high pitch)
// - isTense, isHighIntensity (boolean)
```

### HarmonographSystem

Self-contained drawing system with its own graphics buffer and settings.

```javascript
const system = new HarmonographSystem(x, y, width, height, frequencyRange, id);

// frequencyRange: 'bass', 'mid', 'treble', or 'all'

// Configuration (chainable)
system
  .setDrawMode('lines')           // 'lines', 'midpoints', 'both'
  .setActivePairs(['AB', 'AC'])   // Which connections to draw
  .setPhysicsMode('legacy')       // 'legacy' or 'reactive'
  .setShowBodies(false)           // Hide sun/planets
  .setTrailPersistence(true, 0)   // Persistent, no fade
  .setVisualSettings({
    lineOpacity: 30,
    baseLineWeight: 0.8,
    noiseAmount: 60
  });

// Each frame
system.update(audioAnalyzer);
system.draw(audioAnalyzer, shouldDraw);

// Render to main canvas
image(system.getGraphics(), system.x, system.y);
```

### BeatDebugView

Three-row oscilloscope showing beat detection state.

```javascript
const debug = new BeatDebugView();

debug.toggle();  // Show/hide
debug.update(audioAnalyzer);
debug.draw();
```

Each row shows:
- **White line**: Energy level (0-1)
- **Red line**: Adaptive threshold
- **Green bars**: Beat trigger moments

---

## Settings Reference

### Global Settings

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `layoutMode` | `'single'` | single/dual/triple | Screen layout |
| `drawMode` | `'lines'` | lines/midpoints/both | What to draw |
| `physicsMode` | `'legacy'` | legacy/reactive | Orbit behavior |
| `lineOpacity` | `30` | 5-100 | Line transparency |
| `baseLineWeight` | `0.8` | 0.1-3.0 | Line thickness |
| `noiseAmount` | `60` | 0-100 | Electric jitter |
| `persistentTrails` | `true` | bool | Accumulate vs fade |
| `beatSensitivity` | `0.5` | 0-1 | Detection sensitivity |
| `pulseStrength` | `8` | 0-20 | Screen pulse % |
| `maxComets` | `25` | 0-100 | Comet count |

### Per-Window Settings

Each window (`bass`, `mid`, `treble`, `left`, `right`, `main`) can have:

- `drawMode`
- `lineOpacity`
- `baseLineWeight`
- `noiseAmount`
- `persistentTrails`
- `trailFadeAmount`
- `pulseStrength`
- `activePairs` (array of 'AB', 'AC', etc.)
- `physicsMode`
- `showBodies`

Use the dropdown in the Settings panel to select which window to configure.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Single window mode |
| `2` | Dual split mode |
| `3` | Triple split mode (Bass/Mid/Treble) |
| `R` | Reset/clear drawing |
| `S` | Save canvas as PNG |
| `Space` | Play/Pause audio |
| `P` | Toggle settings panel |
| `D` | Toggle debug view |
| `G` | Toggle physics mode |
| `B` | Toggle celestial bodies |
| `+`/`-` | Increase/decrease time scale |
| `?` | Toggle help guide |

---

## Tips for Best Results

### For Building Patterns
- Enable "Persistent Trails"
- Low opacity (15-30%)
- Single planet pair (A-B)
- Let it run for 3-5 minutes

### For Live Performance
- Disable "Persistent Trails"
- High opacity (50-80%)
- High electricity (70-100%)
- Multiple planet pairs

### For Electronic Music
- Use Triple mode
- Increase beat sensitivity
- High pulse strength for bass window

### For Ambient Music
- Single mode
- Decrease beat sensitivity
- Increase pitch sensitivity
- Low electricity

---

## Browser Compatibility

Tested on Chrome (recommended), Firefox, Safari, Edge.

**Note**: Microphone requires HTTPS or localhost.

---

## License

MIT License - Feel free to use, modify, and share.

---

## Credits

Built with [p5.js](https://p5js.org/) and [p5.sound](https://p5js.org/reference/#/libraries/p5.sound).

Inspired by the mechanical harmonograph drawing machines of the 19th century.

---

*"A breathing solar system that thumps on the kick drum."*
