# Changelog

All notable changes to The Celestial Harmonograph project will be documented in this file.

## [2.1.0] - 2025-02-02

### Added

#### Interactive Help Guide
- **Help Modal**: In-app quick start guide accessible via `?` button or keyboard shortcut
- **`?` / `/` keyboard shortcut**: Toggle help modal from anywhere
- Help content includes:
  - Getting started instructions
  - Audio-to-visual mapping explanation
  - Complete keyboard shortcuts reference
  - Physics modes explanation (Legacy vs Reactive)
  - "Chaos Mode" featured settings combination
  - Tips organized by music genre

#### User Guide Documentation
- **USER_GUIDE.md**: Standalone markdown guide for sharing/PDF export
- Concise, beginner-friendly format
- Covers all essential features and recommended settings

### Changed
- Updated info bar to include `?: Help` shortcut
- Reorganized button layout (Settings and Help buttons)

---

## [2.0.0] - 2025-02-02

### Major Refactor: Multi-Band Beat Detection & Per-Window Settings

This release introduces a complete architectural overhaul to support independent frequency-band reactivity and per-window configuration.

### Added

#### Multi-Band Beat Detection (`AudioAnalyzer.js`)
- **Independent beat detection** for Bass, Mid, and Treble frequencies
- Each band has its own:
  - Adaptive threshold with sliding window algorithm
  - Configurable cooldown (Bass: 200ms, Mid: 150ms, Treble: 100ms)
  - Sensitivity multiplier (Bass: 1.5x, Mid: 1.4x, Treble: 1.3x)
  - Pulse amount and decay rate
- New properties: `bassBeat`, `midBeat`, `trebleBeat`, `bassBeatIntensity`, `midBeatIntensity`, `trebleBeatIntensity`
- New methods: `getBandPulseScale(band)`, `getBandBeat(band)`
- Generalized `detectBeat(energy, history, threshold, ...)` method

#### Triple Split-Screen Mode
- **New layout mode**: Press `3` for Bass | Mid | Treble split view
- Each window reacts only to its assigned frequency band
- Independent pulse effects per window

#### Per-Window Settings System (`Settings.js`)
- `Settings.windowSettings` object stores settings for each window
- Window selector dropdown in UI to choose which window(s) to configure
- Settings that can be configured per-window:
  - `drawMode`, `lineOpacity`, `baseLineWeight`, `noiseAmount`
  - `persistentTrails`, `trailFadeAmount`, `pulseStrength`
  - `activePairs`, `physicsMode`, `showBodies`

#### New Files
- `js/HarmonographSystem.js` - Self-contained drawing system class with:
  - Auto-scaling to ensure patterns stay within viewport
  - `frequencyRange` parameter for band-specific reactivity
  - `showBodies` toggle to hide sun/planets (show only harmonograph lines)
- `js/GravitySystem.js` - N-body physics simulation for reactive mode
- `js/BeatDebugView.js` - 3-row oscilloscope showing beat detection for all bands

#### Debug View Enhancements (`BeatDebugView.js`)
- Three stacked graphs (Bass/Kick, Mid/Snare, Treble/Hi-hat)
- Each graph shows:
  - White line: Energy level
  - Red line: Adaptive threshold
  - Green vertical lines: Beat triggers
- Per-band "BEAT!" indicators

### Changed

#### UI Updates (`index.html`, `styles.css`)
- **Layout Mode buttons**: Single | Dual | Triple
- **Window Selector dropdown**: Choose which window to configure
- **Removed**: Scientific Mode button (simplified to Legacy/Reactive only)
- **Removed**: Separate "Show Orbits" and "Show Planets" toggles (replaced with single "Show Celestial Bodies")
- Moved filename display to top-right corner (avoids overlap with "MID" label)
- Cleaner button styling without emoji icons

#### Physics Modes Simplified
- Removed "Scientific" mode
- Only two modes remain:
  - **Legacy**: Original circular orbits
  - **Reactive**: Audio-modulated gravity

#### Keyboard Shortcuts Updated
- `1/2/3`: Switch layout modes (Single/Dual/Triple)
- `G`: Toggle between Legacy and Reactive physics
- `B`: Toggle celestial bodies visibility
- Removed: `O` (orbits), `V` (debug view mode)

### Fixed

- Auto-scaling prevents patterns from exceeding viewport bounds
- Planet pairs selection properly respects checkbox state in all layout modes
- Beat detection works correctly for compressed/loud audio (adaptive threshold caps at 0.98)

### Documentation

- Comprehensive README with:
  - Audio-to-visual mapping rules with code examples
  - Architecture diagram
  - API documentation for key classes
  - Settings reference tables
  - Tips for different music genres

---

## [1.1.0] - Previous Version

### Features
- Single and dual split-screen modes
- Basic beat detection (bass only)
- Pitch-to-radius mapping
- Persistent trails toggle
- Planet pair selection

---

## [1.0.0] - Initial Release

### Features
- Basic harmonograph visualization
- Four planets at prime number ratios (7:11:13:17)
- Audio input via microphone or file upload
- Line and midpoint drawing modes
