# Research Journal: The Celestial Harmonograph

A development journal documenting the design decisions, experiments, and discoveries made while building an audio-reactive generative art visualization.

---

## Questions Tracker

### Open Questions

| # | Question | Date Opened | Status |
|---|----------|-------------|--------|
| 1 | How to make the visualization feel more "alive" during quiet passages? | 2026-01-31 | Open |
| 2 | Should users be able to save/load presets for their favorite settings? | 2026-02-02 | Open |
| 3 | Would WebGL/shaders provide better performance for complex visualizations? | 2026-01-31 | Open |
| 4 | How to handle very bass-heavy vs very treble-heavy music gracefully? | 2026-02-02 | Open |

### Solved Questions

| # | Question | Date Opened | Date Solved | Finding |
|---|----------|-------------|-------------|---------|
| 1 | What orbital ratios create interesting, non-repeating patterns? | 2026-01-31 | 2026-01-31 | **Prime number ratios (7:11:13:17)** produce complex interference patterns that never exactly repeat, creating organic-feeling geometry. |
| 2 | How to detect beats reliably across different music genres? | 2026-01-31 | 2026-02-02 | **Adaptive threshold with sliding window** works better than fixed thresholds. Key insight: cap threshold at 0.98 for compressed/loud audio, use rising edge detection to catch attack not sustain. |
| 3 | Single beat detector vs multi-band? | 2026-01-31 | 2026-02-02 | **Multi-band is essential.** Bass-only detection misses hi-hats and snares. Independent detectors for Bass (20-140Hz), Mid (400-2600Hz), Treble (5200-14000Hz) with different cooldowns (200ms/150ms/100ms) captures the full rhythmic complexity. |
| 4 | How to map audio to visuals in a way that feels natural? | 2026-01-31 | 2026-02-02 | **Pitch → radius** (low = expand, high = contract) feels like breathing. **Volume → line weight/electricity.** **Beats → pulse + hue shift.** These mappings feel intuitive because they mirror physical metaphors. |
| 5 | How to prevent patterns from escaping the viewport? | 2026-02-02 | 2026-02-02 | **Auto-scaling** based on maximum orbital radius. Calculate bounds and apply uniform scale factor to keep all geometry visible. |
| 6 | Scientific n-body physics vs simple circular orbits? | 2026-01-31 | 2026-02-02 | **Both have value.** Legacy (circular) = predictable, geometric patterns. Reactive (audio-modulated gravity) = chaotic, organic patterns. Kept both as user-selectable modes rather than choosing one. |
| 7 | How to make the tool accessible to first-time users? | 2026-02-02 | 2026-02-02 | **In-app help modal** with quick start guide, keyboard shortcuts, and recommended settings. Press `?` to access. Also created standalone USER_GUIDE.md for sharing. |

---

## Development Timeline

### 2026-01-31

#### Initial Commit: Foundation
**Goal:** Create a basic audio-reactive harmonograph visualization.

**Key Design Decisions:**
- **p5.js + p5.sound**: Chosen for rapid prototyping and built-in audio analysis (FFT, amplitude). No build step required.
- **Prime number orbital ratios (7:11:13:17)**: After experimenting with various ratios, primes create the most interesting interference patterns without obvious repetition.
- **Modular architecture**: Separated concerns into `Settings.js`, `Planet.js`, `Comet.js`, `AudioAnalyzer.js`, `HarmonographRenderer.js`. This paid off later when refactoring.

**What Worked:**
- Dual audio input (microphone or file upload) gives flexibility
- Planet pairs concept allows users to control visual complexity
- Split screen mode creates interesting stereo-like effect

**What Needed Improvement:**
- Beat detection was basic (bass only)
- No persistence of trails option
- Patterns sometimes escaped viewport

---

#### Enhancement: Rhythmic Responsiveness
**Goal:** Make the visualization feel more connected to the music's rhythm.

**Key Design Decisions:**
- **Pitch-to-radius mapping**: Spectral centroid (perceived pitch center) controls Planet B's orbital radius. Low pitch = expand outward, high pitch = contract inward. This creates a "breathing" effect.
- **Volume-based line quality**: Quiet = thin, elegant lines. Loud = thick, electric/jagged lines using Perlin noise displacement.
- **Beat-triggered hue shifts**: Each beat rotates the color wheel by +15 degrees, creating evolving color palettes over time.

**Experiments Tried:**
1. ~~Fixed threshold beat detection~~ → Failed on quiet tracks
2. ~~Amplitude-only detection~~ → Too many false positives
3. **Adaptive threshold** → Works across genres

**Discovery: "Tension" Detection**
```
isTense = (volume > avgVolume × 1.2) || (treble > 0.2) || isBeat
```
This heuristic captures musical intensity better than any single metric.

---

### 2026-02-02

#### Major Refactor: Multi-Band Architecture (v2.0.0)
**Goal:** Independent reactivity for different frequency bands.

**Problem Identified:** Single beat detector missed rhythmic complexity. A track with steady kick drums and intricate hi-hat patterns looked the same as one with only kicks.

**Key Design Decisions:**
- **Three independent beat detectors**: Bass, Mid, Treble with:
  - Different frequency ranges
  - Different cooldown periods (bass needs longer to prevent double-triggers on sustained notes)
  - Different sensitivity multipliers
- **Triple split-screen mode**: Each panel reacts to only one frequency band. Visualizes the "layers" of a mix.
- **Per-window settings**: Each window can have independent configuration. Allows for asymmetric, creative setups.

**Architecture Insight:**
Created `HarmonographSystem` class to encapsulate a complete drawing system with its own graphics buffer. This made multi-window layouts trivial to implement.

**Physics Mode Decision:**
Initially had three modes: Legacy, Scientific, Reactive. Removed Scientific (pure n-body simulation) because:
1. Without audio reactivity, it was just a physics demo
2. Users were confused by three options
3. Legacy + Reactive covers all meaningful use cases

**Beat Detection Algorithm (Final):**
```
Beat Detected = (Energy > DecayingThreshold)
             && (Energy > AdaptiveThreshold)
             && (IsRisingEdge)
             && (TimeSinceLastBeat > Cooldown)
```

**Key Fix:** Capping adaptive threshold at 0.98 prevents it from becoming impossible to trigger on heavily compressed/loud audio.

---

#### User Experience: Help System (v2.1.0)
**Goal:** Make the tool accessible to newcomers without reading documentation.

**Key Design Decisions:**
- **In-app help modal**: Press `?` for instant access. Users don't need to leave the experience.
- **"Chaos Mode" feature highlight**: Discovered that enabling multiple planet pairs + high opacity + high electricity + toggling persistent trails creates spectacular results. Worth featuring prominently.
- **Standalone USER_GUIDE.md**: For sharing with friends who haven't seen the tool yet.

**What Was Included:**
- Getting started (2 steps)
- Audio-to-visual mapping explanation
- All keyboard shortcuts
- Physics modes explained
- Recommended settings by music genre

**What Was Deliberately Excluded:**
- Technical implementation details
- API documentation
- Architecture diagrams

The guide is for *users*, not developers. Keep it focused.

---

## Key Learnings

### On Audio-Visual Mapping
1. **Physical metaphors work**: Expansion/contraction, breathing, pulsing—these feel natural because they mirror how we experience sound physically.
2. **Multiple mappings > one strong mapping**: Combining pitch→radius, volume→line quality, and beat→pulse creates richer responsiveness than any single dominant effect.
3. **Smoothing is essential**: Raw audio data is too noisy. Exponential smoothing (`lerp(current, target, 0.1)`) makes everything feel intentional.

### On Beat Detection
1. **Adaptive beats fixed threshold**: Music varies too much in dynamics.
2. **Rising edge detection**: Catches the attack, not the sustain. Critical for drums.
3. **Per-band cooldowns**: Bass drums sustain longer than hi-hats. Detection should reflect this.

### On User Experience
1. **Sensible defaults matter**: Users should see something beautiful immediately, then discover customization.
2. **Keyboard shortcuts for power users**: Don't clutter UI, but reward exploration.
3. **Help should be instant**: In-app modal > external documentation.

---

## Future Exploration

- [ ] Preset system for saving/loading favorite settings
- [ ] MIDI input for live performance
- [ ] WebGL renderer for better performance
- [ ] Recording/export to video
- [ ] Collaborative mode (multiple users control different windows)
