// =============================================================
// The Chaos Game — sketch.js
// Steps 1–8: polygon + chaos engine + sliders + optimal button
//            + restriction rules + color-mode toggle.
// =============================================================

const state = {
  vertices: [],
  currentPoint: null,
  prevVertex: -1,
  prevPrevVertex: -1,
  pointCount: 0,
  paused: false,
  n: 3,
  ratio: 0.5,
  restriction: 'none',
  iterationsPerFrame: 500,
  colorMode: 'by-vertex'
};

const CANVAS_SIZE = 700;
const BG_COLOR = '#0f0f14';
const VERTEX_COLOR = '#f1f5f9';
const VERTEX_LABEL_COLOR = '#cbd5e1';
const VERTEX_RADIUS = 6;

const PALETTE_HEX = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];
const SINGLE_HEX = '#4fc3f7';
const POINT_ALPHA = 200;

function hexToRgb(h) {
  const v = h.replace('#', '');
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16)
  };
}

const PALETTE_RGB = PALETTE_HEX.map(hexToRgb);
const SINGLE_RGB = hexToRgb(SINGLE_HEX);

let pointCountEl = null;
let ratioSliderEl = null;
let ratioValueEl = null;

function setup() {
  const container = document.getElementById('canvas-container');
  const cnv = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  cnv.parent(container);

  noStroke();
  background(BG_COLOR);

  generateVertices(state.n);
  initCurrentPoint();

  pointCountEl = document.getElementById('point-count');
  ratioSliderEl = document.getElementById('ratio');
  ratioValueEl = document.getElementById('ratio-value');
  wireControls();
}

function draw() {
  if (state.paused) return;

  noStroke();
  for (let i = 0; i < state.iterationsPerFrame; i++) {
    stepOnce();
  }
  updatePointCountDisplay();
}

function stepOnce() {
  const v = pickVertex();
  const target = state.vertices[v];
  const p = state.currentPoint;

  const nx = p.x + state.ratio * (target.x - p.x);
  const ny = p.y + state.ratio * (target.y - p.y);

  const c = getPointColor(v);
  fill(c.r, c.g, c.b, POINT_ALPHA);
  rect(nx, ny, 1.5, 1.5);

  p.x = nx;
  p.y = ny;
  state.prevPrevVertex = state.prevVertex;
  state.prevVertex = v;
  state.pointCount++;
}

function pickVertex() {
  const n = state.n;
  const prev = state.prevVertex;
  const prev2 = state.prevPrevVertex;
  const rule = state.restriction;
  const allowed = [];

  switch (rule) {
    case 'none':
      return Math.floor(Math.random() * n);

    case 'no-repeat': {
      if (prev < 0) return Math.floor(Math.random() * n);
      for (let i = 0; i < n; i++) {
        if (i !== prev) allowed.push(i);
      }
      break;
    }

    case 'no-adjacent': {
      if (prev < 0) return Math.floor(Math.random() * n);
      const a = (prev - 1 + n) % n;
      const b = (prev + 1) % n;
      for (let i = 0; i < n; i++) {
        if (i !== a && i !== b) allowed.push(i);
      }
      break;
    }

    case 'no-two-away': {
      if (prev < 0) return Math.floor(Math.random() * n);
      const a = (prev - 2 + n) % n;
      const b = (prev + 2) % n;
      for (let i = 0; i < n; i++) {
        if (i !== a && i !== b) allowed.push(i);
      }
      break;
    }

    case 'no-repeat-if-doubled': {
      if (prev >= 0 && prev === prev2) {
        for (let i = 0; i < n; i++) {
          if (i !== prev) allowed.push(i);
        }
      } else {
        return Math.floor(Math.random() * n);
      }
      break;
    }

    default:
      return Math.floor(Math.random() * n);
  }

  if (allowed.length === 0) return Math.floor(Math.random() * n);
  return allowed[Math.floor(Math.random() * allowed.length)];
}

function optimalRatio(n) {
  let sum = 1;
  const limit = Math.floor(n / 4);
  for (let k = 1; k <= limit; k++) {
    sum += Math.cos((2 * Math.PI * k) / n);
  }
  return 1 / (2 * sum);
}

function getPointColor(vertexIndex) {
  if (state.colorMode === 'single') return SINGLE_RGB;
  return PALETTE_RGB[vertexIndex % PALETTE_RGB.length];
}

function generateVertices(n) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;

  const verts = [];
  for (let k = 0; k < n; k++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / n;
    verts.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  state.vertices = verts;

  background(BG_COLOR);
  drawVertexMarkers();
  return verts;
}

function drawVertexMarkers() {
  push();
  for (let i = 0; i < state.vertices.length; i++) {
    const v = state.vertices[i];

    noStroke();
    fill(VERTEX_COLOR);
    circle(v.x, v.y, VERTEX_RADIUS * 2);

    const cx = width / 2;
    const cy = height / 2;
    const dx = v.x - cx;
    const dy = v.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const labelOffset = 18;
    const lx = v.x + (dx / len) * labelOffset;
    const ly = v.y + (dy / len) * labelOffset;

    fill(VERTEX_LABEL_COLOR);
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text(`V${i + 1}`, lx, ly);
  }
  pop();
}

function initCurrentPoint() {
  const cx = width / 2;
  const cy = height / 2;
  const circumradius = Math.min(width, height) * 0.4;
  const inscribed = circumradius * Math.cos(Math.PI / state.n);
  const angle = Math.random() * 2 * Math.PI;
  const rad = Math.random() * inscribed;
  state.currentPoint = {
    x: cx + rad * Math.cos(angle),
    y: cy + rad * Math.sin(angle)
  };
}

function clearCanvas() {
  background(BG_COLOR);
  drawVertexMarkers();
  state.pointCount = 0;
  state.prevVertex = -1;
  state.prevPrevVertex = -1;
  initCurrentPoint();
  updatePointCountDisplay();
}

function updatePointCountDisplay() {
  if (pointCountEl) {
    pointCountEl.textContent = state.pointCount.toLocaleString();
  }
}

function wireControls() {
  const vertexSlider = document.getElementById('vertex-count');
  const vertexValue = document.getElementById('vertex-count-value');
  const resetBtn = document.getElementById('reset-optimal');
  const restrictionSelect = document.getElementById('restriction');
  const colorModeCheckbox = document.getElementById('color-mode');

  vertexSlider.addEventListener('input', (e) => {
    const n = parseInt(e.target.value, 10);
    state.n = n;
    vertexValue.textContent = String(n);
    generateVertices(n);
    clearCanvas();
  });

  ratioSliderEl.addEventListener('input', (e) => {
    const r = parseFloat(e.target.value);
    state.ratio = r;
    ratioValueEl.textContent = r.toFixed(2);
    clearCanvas();
  });

  resetBtn.addEventListener('click', () => {
    const r = optimalRatio(state.n);
    state.ratio = r;
    ratioSliderEl.value = r;
    ratioValueEl.textContent = r.toFixed(2);
    clearCanvas();
  });

  restrictionSelect.addEventListener('change', (e) => {
    state.restriction = e.target.value;
    clearCanvas();
  });

  colorModeCheckbox.addEventListener('change', (e) => {
    state.colorMode = e.target.checked ? 'by-vertex' : 'single';
    // Per §6.3: do NOT clear — future points get new colors; old points remain.
  });
}
