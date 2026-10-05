// Shared parts for RateClear: colours, number formats, chart boards, glowing molecules, a glass tank
// that shows the particle model of kinetics.js, the energy-hill drawing, and the layout helpers every
// chapter uses. Boards and stage helpers follow the other law boxes (GasLawClear, PhotoelectricClear)
// so the boxes look alike. +x right, +y up, +z towards you.
import { THREE, M, box, canvasTexture, clamp } from './kit.js';
import { R, K0, TAU, boltz, A, B, C, D } from './kinetics.js';

export * from './kinetics.js';
export { THREE, M, box, clamp };

// ---------------------------------------------------------------- colours
export const COL = {
  A: '#6fb6ff', B: '#ffb547', C: '#5ce1a9', D: '#b6f0c9', cat: '#e7c66b', hill: '#ff7a59', cool: '#6fb6ff', hot: '#ff7a59',
  ok: '#5ce1a9', bad: '#ff5a8a', text: '#e8eef8', soft: 'rgba(255,255,255,.6)', theory: '#e8eef8', count: '#ffe28a', volt: '#c49bff',
};
export const hex = (c) => new THREE.Color(c).getHex();

// ---------------------------------------------------------------- number formats
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export function sci(v, d = 1) {
  if (!v) return '0';
  let e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e);
  if (+m.toFixed(d) >= 10) { m /= 10; e += 1; }
  return `${m.toFixed(d)} × 10${String(e).split('').map((c) => SUP[c]).join('')}`;
}
export const fmt0 = (v) => Math.round(v).toLocaleString('en-IN');
// A number with about three figures that people can read: 0.0067 → "0.0067", 1234567 → "12,34,567".
export function num(v, sig = 3) {
  const a = Math.abs(v);
  if (!isFinite(v)) return '∞';
  if (a === 0) return '0';
  if (a >= 1e7 || a < 1e-4) return sci(v, 1);
  if (a >= 1000) return fmt0(v);
  return String(+v.toPrecision(sig));
}
// A share as a percentage, or as "1 in N" when it is tiny.
export function share(f) {
  if (f >= 0.001) return `${+(f * 100).toPrecision(f >= 0.1 ? 3 : 2)} %`;
  if (f <= 0) return 'none';
  const n = 1 / f;
  return `1 in ${n >= 1e7 ? sci(n, 1) : fmt0(+n.toPrecision(2))}`;
}
export const times = (f) => (f >= 1e5 ? `${sci(f, 1)} times` : f >= 100 ? `${fmt0(+f.toPrecision(3))} times` : f >= 10 ? `${f.toFixed(0)} times` : `${f.toFixed(f >= 3 ? 1 : 2)} times`);
export const degC = (T) => `${Math.round(T - K0)} °C`;
export function fmtDur(min) {
  if (!isFinite(min)) return 'never';
  if (min < 1) return `${Math.round(min * 60)} s`;
  if (min < 90) return `${Math.round(min)} min`;
  if (min < 48 * 60) return `${(min / 60).toFixed(1).replace('.0', '')} hours`;
  if (min < 60 * 24 * 60) return `${(min / 1440).toFixed(1).replace('.0', '')} days`;
  return `${fmt0(min / 1440 / 30)} months`;
}

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.fillStyle = '#0b0d13'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const tex = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return Object.assign(tex, { mesh: m });
}
// Boards are 640 px wide and shown small beside the model, so their type is large.
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 30px sans-serif'; g.fillText(text, 20, 40);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '21px sans-serif'; g.fillStyle = COL.soft; g.fillText(sub, x, 40); }
}
export function axes(g, w, h, { x0 = 92, x1 = w - 26, y0 = h - 70, y1 = 96, xMax, yMax, xMin = 0, yMin = 0, xTicks = [], yTicks = [], xFmt = String, yFmt = String, xLabel = '', yLabel = '', xLog = false, yLog = false }) {
  const X = xLog ? (x) => x0 + (Math.log(Math.max(x, xMin) / xMin) / Math.log(xMax / xMin)) * (x1 - x0) : (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = yLog ? (y) => y0 - (Math.log(Math.max(y, yMin) / yMin) / Math.log(yMax / yMin)) * (y0 - y1) : (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = COL.soft; g.font = '22px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 28); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 7); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '21px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 58);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function line(g, pts, X, Y, col, wdt = 4, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function curve(g, fn, a, b, X, Y, col, wdt = 4, dash = null, n = 160) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; pts.push([x, fn(x)]); }
  line(g, pts, X, Y, col, wdt, dash);
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function ring(g, x, y, col, r = 9) { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
export function text(g, s, x, y, col = COL.text, font = '22px sans-serif', align = 'left') { g.fillStyle = col; g.font = font; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
export function clip(g, a, fn) { g.save(); g.beginPath(); g.rect(a.x0, a.y1 - 4, a.x1 - a.x0, a.y0 - a.y1 + 4); g.clip(); fn(); g.restore(); }
export function legend(g, items, x = 24, y = 62, font = 20) {
  g.font = `bold ${font}px sans-serif`;
  for (const [n, c] of items) { g.fillStyle = c; g.fillRect(x, y, 16, 16); g.fillStyle = COL.text; g.fillText(n, x + 22, y + 15); x += 38 + g.measureText(n).width; }
}

// Height of the hill (kJ/mol) at k = 0…1 along the reaction path: 0 for reactants, Ea at the top, dE
// for products.
export const hillE = (k, Ea, dE = 0) => dE * (k * k * (3 - 2 * k)) + (Ea - dE * 0.5) * Math.sin(Math.PI * k) ** 2;
// The energy hill (a reaction profile). hills: [{ Ea, col, label, dash }], all starting from the
// reactants' level 0 and ending at the products' level dE (kJ/mol). Returns the pixel helpers.
export function hill(g, { x0, x1, y0, y1, yMax, yMin = 0, hills, dE = 0, left = 'reactants', right = 'products' }) {
  const Y = (e) => y0 - ((e - yMin) / (yMax - yMin)) * (y0 - y1);
  const xa = x0 + (x1 - x0) * 0.22, xb = x0 + (x1 - x0) * 0.78, xm = (xa + xb) / 2;
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  for (const hl of hills) {
    g.strokeStyle = hl.col; g.lineWidth = hl.w || 5; g.setLineDash(hl.dash || []); g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0, Y(0)); g.lineTo(xa, Y(0));
    for (let i = 0; i <= 40; i++) {
      const k = i / 40;
      g.lineTo(xa + (xb - xa) * k, Y(hillE(k, hl.Ea, dE)));
    }
    g.lineTo(x1, Y(dE)); g.stroke(); g.setLineDash([]);
  }
  text(g, left, x0 + 8, Y(0) + 28, COL.soft, '20px sans-serif');
  text(g, right, x1 - 8, Y(dE) - 14, COL.soft, '20px sans-serif', 'right');
  return { Y, xa, xb, xm };
}

// ---------------------------------------------------------------- 3D pieces
// n glowing spheres placed each frame with place(i, x, y, z, s); color(i, THREE.Color) tints one.
export function dots(n, r, color = 0xffffff, seg = 10) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 3)), mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D(), c0 = new THREE.Color(color);
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.hide = (i) => mesh.place(i, 0, -80, 0, 0.0001);
  mesh.color = (i, c) => { mesh.setColorAt(i, c); };
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  for (let i = 0; i < n; i++) { mesh.hide(i); mesh.setColorAt(i, c0); }
  return mesh;
}
// Temperature to colour: deep blue (cold) through white to red-orange (hot).
const C_COLD = new THREE.Color(0x3b7bff), C_MID = new THREE.Color(0xe8eef8), C_HOT = new THREE.Color(0xff5a2a);
export function tempColor(T, lo = 220, hi = 780, out = new THREE.Color()) {
  const k = clamp((T - lo) / (hi - lo), 0, 1);
  return k < 0.5 ? out.copy(C_COLD).lerp(C_MID, k * 2) : out.copy(C_MID).lerp(C_HOT, (k - 0.5) * 2);
}
export const cssTemp = (T, lo, hi) => '#' + tempColor(T, lo, hi).getHexString();

// A glass tank whose inside matches a Gas's box, standing on a thermostat plate. at = its centre.
export function tank(parent, gas, at) {
  const g = new THREE.Group(); g.position.set(...at); parent.add(g);
  const [w, h, d] = gas.box.map((L) => L + 2 * gas.r);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.clear(0xcfe8ff, 0.07));
  g.add(glass);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.75 }));
  g.add(e);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x3b414d, emissive: 0x000000, roughness: 0.5, metalness: 0.3 });
  const plate = box(w + 0.3, 0.16, d + 0.3, plateMat); plate.position.y = -h / 2 - 0.09; g.add(plate);
  g.setT = (T, lo, hi) => { tempColor(T, lo, hi, plateMat.emissive).multiplyScalar(0.28); };
  g.size = [w, h, d];
  return g;
}
// Draws a Gas as glowing molecules inside a group. Reactions flash white and throw a short spark.
const KIND_COL = [COL.A, COL.B, COL.C, COL.D].map((c) => new THREE.Color(c));
export function gasView(parent, gas, { nub = false, cols = KIND_COL, sparkCol = 0xffffff } = {}) {
  const mesh = dots(gas.n, gas.r); parent.add(mesh);
  const nubs = nub ? dots(gas.n, gas.r * 0.5, 0xffffff, 6) : null; if (nubs) parent.add(nubs);
  const NS = 14, sparks = dots(NS, gas.r * 1.5, sparkCol, 12); parent.add(sparks);
  const sp = Array.from({ length: NS }, () => ({ t: 0, x: 0, y: 0, z: 0 }));
  let spi = 0;
  const col = new THREE.Color(), white = new THREE.Color(0xffffff);
  let siteMesh = null;
  const view = {
    mesh,
    cols,
    // big catalyst spheres, drawn once the gas has its sites
    sites(color = hex(COL.cat)) {
      if (siteMesh) { parent.remove(siteMesh); siteMesh.geometry.dispose(); siteMesh.material.dispose(); siteMesh = null; }
      if (!gas.sites.length) return;
      siteMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.3 }), gas.sites.length);
      const o = new THREE.Object3D();
      gas.sites.forEach((s, i) => { o.position.set(s.x, s.y, s.z); o.scale.setScalar(s.r); o.updateMatrix(); siteMesh.setMatrixAt(i, o.matrix); });
      parent.add(siteMesh); view.siteMesh = siteMesh;
    },
    draw(dt, showNub = false) {
      const { n, x, on, kind, flash, o, r } = gas;
      for (const e of gas.events) { const q = sp[spi++ % NS]; q.t = 0.45; q.x = e.x; q.y = e.y; q.z = e.z; }
      for (let i = 0; i < n; i++) {
        if (!on[i]) { mesh.hide(i); if (nubs) nubs.hide(i); continue; }
        const j = i * 3, f = clamp(flash[i] / 0.7, 0, 1);
        mesh.place(i, x[j], x[j + 1], x[j + 2], 1 + 0.6 * f);
        col.copy(view.cols[kind[i]]).lerp(white, f); mesh.color(i, col);
        if (nubs) { if (showNub && kind[i] === A) nubs.place(i, x[j] + o[j] * r * 0.75, x[j + 1] + o[j + 1] * r * 0.75, x[j + 2] + o[j + 2] * r * 0.75, 1); else nubs.hide(i); }
      }
      mesh.done(); if (nubs) nubs.done();
      for (let k = 0; k < NS; k++) { const q = sp[k]; if (q.t > 0) { q.t -= dt; const a = clamp(q.t / 0.45, 0, 1); sparks.place(k, q.x, q.y, q.z, 0.4 + 2.6 * (1 - a) * a * 2.2); } else sparks.hide(k); }
      sparks.done();
    },
  };
  return view;
}
// A simple glass thermometer: set(k) fills the column 0→1.
export function thermometer(parent, x, y, z, len = 1.6, color = 0xff3b30) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 16, 1, true), M.clear(0xffffff, 0.3)); t.position.y = len / 2 + 0.1; g.add(t);
  const bulbMat = M.glow(color), bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), bulbMat); g.add(bulb);
  const colm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 10), bulbMat); g.add(colm);
  g.set = (k) => { k = clamp(k, 0.02, 1); const L = 0.1 + k * (len - 0.2); colm.scale.y = L; colm.position.y = L / 2; };
  g.tint = (c) => bulbMat.color.copy(c);
  g.set(0.3);
  return g;
}

// ---------------------------------------------------------------- layout
export const inReel = () => document.body.classList.contains('gb-reel');
export const isPhone = () => !inReel() && window.innerWidth < 560;
// On a phone-width stage: hide the minor labels (the board sits under the model there, see placeBoard).
export function fitNarrow(stage, minor = [], shift = 0.01) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? shift : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards sit beside the model on a wide screen, above it in the tall reel video, and under it on a
// phone (where the readout fills the top of the stage). Each placement is [position, rotationY, scale].
export function placeBoard(b, wide, reel, phone) {
  const [p, r = 0, s = 1] = inReel() ? reel : isPhone() ? phone : wide;
  b.mesh.position.set(...p); b.mesh.rotation.set(0, r, 0); b.mesh.scale.setScalar(s);
}
// On a phone the readout keeps only its main rows: rows marked "row x" and small notes are dropped.
export const fit = (html) => (isPhone() ? html.replace(/<div class="row x">[\s\S]*?<\/div>\s*/g, '').replace(/<small>[\s\S]*?<\/small>/g, '') : html);
// Show one scene group of a chapter and fly the camera to it (not in the reel, which sets its own views).
export function focusSwitch(stage, groups, views) {
  let cur = '';
  return (id) => {
    if (id === cur) return false;
    cur = id;
    Object.entries(groups).forEach(([k, g]) => { g.visible = k === id; });
    if (!inReel() && views[id]) stage.setView(views[id].pos, views[id].target, 1.0);
    return true;
  };
}
// Hide a label together with its group (CSS2D labels do not follow a parent's visibility).
export function showLabels(list, on) { list.forEach((l) => { if (l) l.visible = on; }); }
