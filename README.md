# The Celestial Harmonograph

An audio-reactive generative art visualization built with p5.js. The system creates mesmerizing geometric patterns that respond to music in real-time, behaving like a "breathing solar system" that expands on bass notes, contracts on high pitches, and pulses on kick drums.

![Harmonograph Preview](preview.png)

## Features

### Audio Reactivity
- **Pitch → Radius**: Low frequencies expand planet orbits outward; high frequencies contract them inward. Watch the pattern breathe with the melody.
- **Beat Detection**: Automatic kick drum detection triggers screen-wide "pulse" effects and instant color shifts.
- **Dynamic Line Quality**: Quiet moments produce thin, elegant lines; loud moments create thick, electric/jagged strokes.
- **Frequency-Driven Colors**: Each planet pair has its own color identity, with subtle hue shifts based on spectral content.

### Visualization Modes
- **Persistent Trails**: Accumulate lines forever to build complete harmonograph patterns
- **Live Mode**: Lines fade quickly, showing only recent activity (great for live performances)
- **Drawing Modes**: Lines, Midpoints, or Both
- **Split Screen**: Two independent patterns reacting to the same audio

### The Geometry
Four "planets" orbit at prime-number ratios (7:11:13:17), creating complex, never-repeating interference patterns. Planet B's orbit radius dynamically responds to pitch, making the geometry itself musical.

### Background Comets
Elegant white comets with glowing tails drift across the background, their quantity and behavior driven by treble frequencies.

## Quick Start

### Option 1: Run Script (Recommended)
```bash
# Make the script executable (first time only)
chmod +x run.sh

# Start the server and open browser
./run.sh
```

### Option 2: Manual
```bash
# Start a local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

### Option 3: Using Node.js
```bash
npx http-server -p 8000
```

Then open http://localhost:8000 in your browser.

## Usage

1. **Choose Audio Input**:
   - 🎤 **Microphone**: Reacts to ambient sound or music playing through speakers
   - 📁 **Upload File**: Load an MP3, WAV, or OGG file directly

2. **Open Settings** (press `P` or click ⚙):
   - Adjust audio reactivity (beat sensitivity, pulse strength, pitch response)
   - Toggle persistent vs. fading trails
   - Select which planet pairs to draw
   - Fine-tune line opacity, weight, and electricity

3. **Keyboard Shortcuts**:
   | Key | Action |
   |-----|--------|
   | `P` | Toggle settings panel |
   | `R` | Reset/clear the drawing |
   | `S` | Save as PNG |
   | `Space` | Play/pause (file mode) |

## Settings Reference

### Audio Reactivity
| Setting | Description |
|---------|-------------|
| **Beat Sensitivity** | How easily kick drums are detected (0-1) |
| **Pulse Strength** | Screen scale amount on beats (0-20%) |
| **Pitch → Radius** | How much pitch affects Planet B's orbit |

### Drawing Settings
| Setting | Description |
|---------|-------------|
| **Persistent Trails** | ON = lines accumulate forever; OFF = lines fade (live mode) |
| **Drawing Mode** | Lines / Midpoints / Both |
| **Split Screen** | Divide canvas into two independent patterns |

### Line Settings
| Setting | Description |
|---------|-------------|
| **Line Opacity** | Transparency of drawn lines (5-100%) |
| **Line Weight** | Base thickness of lines |
| **Draw Interval** | Frames between draws (higher = more spacing) |
| **Electricity** | Jaggedness of lines when volume is high |

### Planet Pairs
Six available pairs with different orbital ratios:
- A ↔ B (7:11) - *pitch-reactive*
- A ↔ C (7:13)
- B ↔ C (11:13)
- A ↔ D (7:17)
- B ↔ D (11:17)
- C ↔ D (13:17)

## Project Structure

```
harmonograph/
├── index.html          # Main HTML with UI
├── styles.css          # Styling
├── run.sh              # Quick-start script
├── README.md           # This file
└── js/
    ├── Settings.js     # Global configuration
    ├── Planet.js       # Orbital body class
    ├── Comet.js        # Background particle class
    ├── AudioAnalyzer.js    # FFT analysis & beat detection
    ├── HarmonographRenderer.js  # Line drawing logic
    └── main.js         # Main application
```

## Technical Details

### Audio Analysis
- Uses p5.js FFT with 512 bins for frequency analysis
- Spectral centroid (`fft.getCentroid()`) determines perceived pitch
- Beat detection via bass energy threshold with adaptive sensitivity
- Smoothed values (lerp) prevent jitter while maintaining responsiveness

### Harmonograph Math
The visualization is based on the mathematical harmonograph, where patterns emerge from the interference of circular motions at different frequencies. Using prime number ratios (7, 11, 13, 17) ensures the pattern never exactly repeats.

### Rendering
- PGraphics layers for persistent trail accumulation
- Pulse effect via `scale()` transform on the graphics layer
- Vertex noise (Perlin-based) for electric line effects

## Browser Compatibility

Tested on:
- Chrome (recommended)
- Firefox
- Safari
- Edge

**Note**: Microphone access requires HTTPS or localhost.

## Tips for Best Results

1. **For Building Patterns**: Enable "Persistent Trails", use low opacity (15-30%), let it run for 3-5 minutes
2. **For Live Performance**: Disable "Persistent Trails", increase opacity (50-80%), increase electricity
3. **For Electronic Music**: Increase beat sensitivity, enable multiple planet pairs
4. **For Ambient Music**: Decrease beat sensitivity, increase pitch sensitivity, use single planet pair

## License

MIT License - Feel free to use, modify, and share.

## Credits

Built with [p5.js](https://p5js.org/) and [p5.sound](https://p5js.org/reference/#/libraries/p5.sound).

---

*"A breathing solar system that thumps on the kick drum."*
