// =============================================================
// The Chaos Game — sketch.js
// Steps 1–3: static polygon rendering scaffold.
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

function setup() {
  const container = document.getElementById('canvas-container');
  const cnv = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  cnv.parent(container);

  noStroke();
  background(BG_COLOR);

  generateVertices(state.n);
  noLoop(); // draw loop inactive until chaos engine is wired up (step 4+)
}

function draw() {
  // Chaos engine lands in step 4. For now, the polygon is drawn once in setup().
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
