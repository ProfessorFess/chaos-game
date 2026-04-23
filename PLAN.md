# Chaos Game Fractal Generator — Claude Code Implementation Plan

## 1. Project Overview

Build an interactive browser-based web application that visualizes the **Chaos Game** algorithm in real time. The app demonstrates how deterministic fractal attractors (Sierpinski Triangle, Vicsek fractal, etc.) emerge from a simple stochastic rule: starting from a random point, repeatedly move a fixed fraction of the distance toward a randomly chosen polygon vertex.

This is a classroom demonstration tool for a Modern Mathematics class presentation (5–7 min live demo). Priority is **mathematical correctness, visual clarity, and smooth real-time performance**.

---

## 2. Tech Stack & Constraints

- **Language:** Vanilla JavaScript (ES6+)
- **Rendering library:** [p5.js](https://p5js.org/) (load via CDN — `https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js`)
- **Styling:** Plain CSS (no frameworks)
- **No build step.** Must run by opening `index.html` directly in a browser (for easy classroom demo / sharing).
- **No backend.** Fully client-side.

---

## 3. File Structure

Use three separate files for clean separation of concerns:

```
chaos-game/
├── index.html        # Markup, UI controls, loads p5.js + sketch.js
├── styles.css        # Layout, typography, control styling
└── sketch.js         # All p5.js logic + chaos game engine
```

---

## 4. Core Mathematical Specification

### 4.1 Vertex generation (regular polygon)
Given `n` vertices and canvas center `(cx, cy)` with radius `r`:

```
For k = 0, 1, ..., n-1:
    angle = -π/2 + (2π * k / n)   // start at top, go clockwise
    vertex[k].x = cx + r * cos(angle)
    vertex[k].y = cy + r * sin(angle)
```

Starting at `-π/2` places the first vertex at the top of the canvas (visually cleaner for triangles/pentagons).

### 4.2 Chaos game iteration
Given current point `P` and randomly chosen vertex `V` and distance ratio `t`:

```
P_next = P + t * (V - P)
       = (P.x + t*(V.x - P.x),  P.y + t*(V.y - P.y))
```

### 4.3 Optimal distance ratio per polygon
The "classic" ratio that produces the cleanest well-known fractal for each `n`:

| Vertices (n) | Optimal ratio | Known fractal |
|---|---|---|
| 3 | 0.5 | Sierpinski Triangle |
| 4 | 0.5 | *(fills the square — no fractal without restriction)* |
| 5 | ~0.382 (= 1 − 1/φ ≈ (3−√5)/2) | Sierpinski Pentagon |
| 6 | ~0.333 | Sierpinski Hexagon / Koch-like |
| 7 | ~0.356 | Sierpinski Heptagon |
| 8 | ~0.354 | Sierpinski Octagon |

**General formula** for the ratio that produces a non-overlapping Sierpinski-style attractor for an `n`-gon:
```
r_optimal(n) = 1 / (2 * (1 + sum_{k=1}^{floor(n/4)} cos(2πk/n)))
```
Implement this formula so the "Reset to Optimal" button works for any `n` in range.

### 4.4 Restriction rules (toggleable, mutually exclusive — only one active at a time)
Track the previous vertex index `prev` and the one before that `prev2`.

1. **None** (default): any vertex allowed.
2. **No repeat** (Vicsek-style on square): cannot pick same vertex as `prev`.
3. **Cannot pick vertex adjacent to previous**: exclude vertices at index `prev±1 mod n`.
4. **Cannot pick vertex two away from previous**: exclude vertices at index `prev±2 mod n`.
5. **Cannot repeat if last two were the same**: if `prev == prev2`, then cannot pick `prev`; otherwise any vertex allowed.

When a restriction filters out all valid choices (shouldn't happen for n ≥ 3 with these rules, but guard anyway), fall back to unrestricted random choice.

**Implementation detail:** build an array of *allowed* vertex indices each iteration, then pick one uniformly at random from that array. Do NOT use rejection sampling in a tight loop (performance).

---

## 5. UI Layout

**Layout:** Two-column on desktop (canvas left ~70%, control panel right ~30%), stack vertically on narrow screens.

Header bar at top: title "The Chaos Game" + subtitle "Fractals from Randomness".

### 5.1 Canvas
- Square-ish canvas, ~700×700 px (or responsive — sized to fit its column with max 800px).
- Dark background (e.g. `#0f0f14` or `#111`) — makes colored points pop.
- Render polygon vertices as small labeled circles (label them V₁, V₂, … or 1, 2, …) in a neutral color (white/light gray).
- Render chaos-game points as 1–2 px dots, no stroke, with alpha ~200 for slight accumulation blending.

### 5.2 Controls (right panel, top to bottom)

Group controls into visually distinct sections with small headings:

**Section: "Geometry"**
- Slider — **Number of vertices**: range 3 to 8, step 1, default 3. Show current value.

**Section: "Chaos Rule"**
- Slider — **Distance ratio (t)**: range 0.10 to 0.90, step 0.01, default 0.50. Show current value to 2 decimals.
- Button — **Reset to optimal** (sets slider to `r_optimal(n)` for current `n`).
- Dropdown (or radio group) — **Restriction rule**: 5 options from §4.4. Default "None".

**Section: "Rendering"**
- Slider — **Iterations per frame**: range 1 to 2000, logarithmic-feeling scale (use step 1 but most of the useful action is 1–500). Default 500. Label: "Speed".
- Toggle (checkbox or switch) — **Color mode**: two positions — "By target vertex" (default) vs "Single color".

**Section: "Playback"**
- Button — **Pause / Resume** (toggles label and state).
- Button — **Clear canvas** (wipes points, keeps polygon + settings, resets point count).
- Button — **Save as image** (downloads current canvas as PNG).

**Section: "Stats"** (read-only text, auto-updating)
- **Points plotted:** (running counter, formatted with commas)
- **Current fractal:** (auto-detected label based on `n` + ratio + restriction — see §7)

---

## 6. Code Architecture (`sketch.js`)

Organize `sketch.js` into logical sections with clear comments. Use modules/closures or plain functions — no classes needed, but a `ChaosGame` state object is cleaner than scattered globals.

### 6.1 State object
```js
const state = {
  vertices: [],          // array of {x, y} after generateVertices()
  currentPoint: null,    // {x, y}
  prevVertex: -1,        // last chosen vertex index
  prevPrevVertex: -1,    // two-ago vertex index
  pointCount: 0,
  paused: false,
  // user-controlled parameters (read from UI):
  n: 3,
  ratio: 0.5,
  restriction: 'none',   // 'none' | 'no-repeat' | 'no-adjacent' | 'no-two-away' | 'no-repeat-if-doubled'
  iterationsPerFrame: 500,
  colorMode: 'by-vertex' // 'by-vertex' | 'single'
};
```

### 6.2 Required functions

```js
function setup()
// - Create canvas, attach to #canvas-container div
// - Call generateVertices()
// - Initialize currentPoint to a random position inside the polygon
// - Set up all UI event listeners (see §6.3)
// - Set background once

function draw()
// - If state.paused: return
// - Run state.iterationsPerFrame chaos-game steps
// - For each step: pick allowed vertex, compute P_next, draw it, update state

function generateVertices(n)
// - Use formula from §4.1
// - Canvas center, radius = ~40% of canvas size
// - Store in state.vertices, return array
// - Redraw background + vertex markers

function pickVertex()
// - Returns a vertex index obeying state.restriction
// - Uses state.prevVertex, state.prevPrevVertex

function stepOnce()
// - v = pickVertex()
// - P_next = lerp from currentPoint to vertices[v] by state.ratio
// - Draw point at P_next (color per state.colorMode)
// - Update state.currentPoint, state.prevPrevVertex, state.prevVertex
// - Increment state.pointCount

function drawVertexMarkers()
// - Draws the labeled circles at each vertex
// - Called after every canvas clear

function optimalRatio(n)
// - Implements formula from §4.3
// - Returns a number between 0 and 1

function getPointColor(vertexIndex)
// - If colorMode === 'single': return a single accent color (e.g., #4fc3f7)
// - If colorMode === 'by-vertex': return a color from a palette indexed by vertexIndex
//   Use a palette of 8 distinct, high-contrast colors (one per possible vertex)
//   Suggested palette (colorblind-friendly): ['#ef4444','#f59e0b','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899']

function classifyFractal()
// - Returns a human-readable string for the "Current fractal" stat
// - See §7 for the lookup table

function clearCanvas()
// - Wipe background, redraw vertex markers
// - Reset state.pointCount to 0
// - Reset state.currentPoint to a random interior point
// - Reset state.prevVertex, state.prevPrevVertex to -1

function saveImage()
// - Use p5's saveCanvas('chaos-game', 'png')
```

### 6.3 Event wiring
Each UI control updates `state.*` and, where appropriate, calls `generateVertices()` + `clearCanvas()` (since changing `n` invalidates all existing points). Rules for what triggers a canvas reset:

- Changing **n**: regenerate vertices AND clear canvas.
- Changing **ratio**: clear canvas (old points don't belong to the new attractor).
- Changing **restriction rule**: clear canvas.
- Changing **iterations per frame**: do NOT clear (just affects speed).
- Changing **color mode**: do NOT clear (future points get new colors; old points remain).
- **Pause**: just flip flag.
- **Clear button**: clear canvas.
- **Reset to optimal**: update ratio slider value AND clear canvas.
- **Save image**: save, don't clear.

---

## 7. Fractal Auto-Classifier (for "Current fractal" stat)

Implement a simple lookup. Define "near" ratio as within ±0.02.

| n | ratio near | restriction | Label |
|---|---|---|---|
| 3 | 0.5 | none | "Sierpinski Triangle" |
| 4 | 0.5 | no-repeat | "Vicsek Fractal" |
| 4 | 0.5 | no-adjacent | "Square Sierpinski variant" |
| 4 | 0.5 | none | "Filled Square (no fractal)" |
| 5 | optimalRatio(5) | none | "Sierpinski Pentagon" |
| 6 | optimalRatio(6) | none | "Sierpinski Hexagon" |
| 6 | 0.5 | none | "Hexagonal gasket (filled)" |
| 7 | optimalRatio(7) | none | "Sierpinski Heptagon" |
| 8 | optimalRatio(8) | none | "Sierpinski Octagon" |
| any | any | any other combo | "Custom Chaos Game ({n}-gon, t={ratio})" |

Fallback: `"Custom Chaos Game ({n}-gon, t={ratio})"`.

---

## 8. Visual Design Guidelines (Clean & Classroom-Ready)

- **Color scheme:** dark canvas (`#0f0f14`), light UI panel (`#f8fafc` background, `#1f2937` text) — or unified dark theme, pick one and be consistent. Dark theme recommended because the fractal is dark-background.
- **Typography:** system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`), base size 15–16px. Headings slightly bolder, not huge.
- **Spacing:** generous padding inside control panel (~16px), ~12px between control groups, section headings in a slightly muted color with a thin divider above.
- **Sliders:** use `<input type="range">` styled to match the theme. Always show the current numeric value next to the label.
- **Buttons:** clearly clickable, subtle hover state, grouped logically. Primary action (Pause/Resume) visually slightly more prominent.
- **Readable labels everywhere** — this will be shown on a projector to a classroom.
- **Responsive:** on screens <900px wide, stack canvas above controls.

---

## 9. Performance Notes

- p5.js's `point()` is fine up to ~2000 points/frame at 60fps on modern hardware. If it stutters, switch to `rect(x, y, 1, 1)` or draw directly to a buffer with `pixels[]` + `updatePixels()`.
- Do NOT call `background()` in the draw loop — it would erase the accumulated fractal. Only clear on explicit reset.
- Call `noStroke()` once in setup and use `fill()` for each point to avoid per-point stroke overhead.

---

## 10. Deliverable Checklist

A working submission must have:

- [ ] `index.html`, `styles.css`, `sketch.js` in a single folder, opens by double-clicking `index.html`.
- [ ] Vertex count slider (3–8) changes polygon live.
- [ ] Distance ratio slider (0.10–0.90) with 2-decimal readout.
- [ ] "Reset to optimal" button works for every `n` in 3–8.
- [ ] All 5 restriction rules selectable and mathematically correct.
- [ ] Iterations-per-frame speed slider works smoothly.
- [ ] Color mode toggle (by-vertex / single) works and doesn't wipe the canvas.
- [ ] Pause/Resume, Clear, Save-as-PNG buttons all functional.
- [ ] Point counter updates live.
- [ ] "Current fractal" auto-label updates correctly for the cases in §7.
- [ ] Sierpinski Triangle forms cleanly at defaults (n=3, t=0.5, no restriction).
- [ ] Vicsek fractal forms at n=4, t=0.5, restriction="no-repeat".
- [ ] No console errors.
- [ ] Looks clean on a 1080p projector.

---

## 11. Suggested Build Order for Claude Code

1. Scaffold `index.html` with p5.js CDN link, container divs, and empty control panel.
2. Write `styles.css` for the two-column layout and dark theme.
3. In `sketch.js`: implement `setup()`, `generateVertices()`, `drawVertexMarkers()` — get a static polygon rendering.
4. Implement `stepOnce()` and basic `draw()` loop with no restrictions, no color modes — confirm Sierpinski Triangle forms at defaults.
5. Add vertex-count slider and distance-ratio slider, wire them up, confirm canvas resets correctly.
6. Implement `optimalRatio(n)` and "Reset to optimal" button.
7. Implement all 5 restriction rules in `pickVertex()` and the restriction dropdown.
8. Implement `getPointColor()` and color mode toggle.
9. Add pause/resume, clear, save-as-image buttons.
10. Implement `classifyFractal()` and wire the "Current fractal" stat label.
11. Polish: spacing, typography, hover states, responsiveness.
12. Test every combination in the checklist.

---

## 12. Out of Scope (Do NOT implement)

- No zoom/pan on the canvas.
- No saving/loading state to localStorage.
- No animation of vertices moving between polygon shapes (just snap).
- No 3D / WebGL rendering.
- No multi-canvas comparison view.
- No audio.