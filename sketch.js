// =============================================================
// The Chaos Game — sketch.js
// Steps 1–5: static polygon + chaos engine + n & ratio sliders.
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
const POINT_COLOR = { r: 79, g: 195, b: 247, a: 200 }; // #4fc3f7

let pointCountEl = null;

function setup() {
  const container = document.getElementById('canvas-container');
  const cnv = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  cnv.parent(container);

  noStroke();
  background(BG_COLOR);

  generateVertices(state.n);
  initCurrentPoint();

  pointCountEl = document.getElementById('point-count');
  wireControls();
}

function draw() {
  if (state.paused) return;

  noStroke();
  fill(POINT_COLOR.r, POINT_COLOR.g, POINT_COLOR.b, POINT_COLOR.a);

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

  rect(nx, ny, 1.5, 1.5);

  p.x = nx;
  p.y = ny;
  state.prevPrevVertex = state.prevVertex;
  state.prevVertex = v;
  state.pointCount++;
}

function pickVertex() {
  // No restrictions yet — step 7 adds the rules.
  return Math.floor(Math.random() * state.n);
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
  // Random point inside the polygon's inscribed circle.
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
  const ratioSlider = document.getElementById('ratio');
  const ratioValue = document.getElementById('ratio-value');

  vertexSlider.addEventListener('input', (e) => {
    const n = parseInt(e.target.value, 10);
    state.n = n;
    vertexValue.textContent = String(n);
    generateVertices(n);
    clearCanvas();
  });

  ratioSlider.addEventListener('input', (e) => {
    const r = parseFloat(e.target.value);
    state.ratio = r;
    ratioValue.textContent = r.toFixed(2);
    clearCanvas();
  });
}
