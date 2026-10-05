// Chapter 3: surface area, and reading a rate from the slope of a graph. Three scenes.
// "chips": the classic school experiment. Marble (calcium carbonate) in dilute hydrochloric acid:
//     CaCO₃ + 2 HCl → CaCl₂ + H₂O + CO₂
//   The gas is collected in a syringe and its volume plotted against time (RSC Education, "The effect
//   of surface area on the rate of reaction"; done in school with dilute acid and eye protection).
//   0.40 g of marble (0.0040 mol, density 2.71 g/cm³) in 50 cm³ of acid gives 0.0040 mol of CO₂:
//   96 cm³ at room temperature (24,000 cm³ per mole). The acid is in excess.
//   A solid reacts only at its surface, so each piece shrinks inwards at a speed set by the acid:
//     dr/dt = −k × [HCl], with k = 1.9 × 10⁻⁵ m/s per mol/dm³.
//   That is the surface rate of calcite in acid (Plummer, Wigley and Parkhurst, Am. J. Sci. 278, 179,
//   1978: rate = k₁ × a(H⁺), log k₁ = 0.198 − 444/T cm/s, so k₁ = 0.051 cm/s at 25 °C; times calcite's
//   molar volume of 36.9 cm³/mol). Pieces are treated as spheres of 4 mm, 2 mm or 0.2 mm. The acid's
//   concentration falls as it is used up (2 HCl for each CaCO₃), which the model follows. In a real
//   flask stirring and bubbles change the pace somewhat; the shape and the order of the curves do not.
//   The slope of the gas curve at any moment IS the rate then (cm³ of gas a second): the tangent.
// "dust": cutting a lump up. A 10 cm cube (1 litre) has 0.06 m² of surface. Cut into cubes of side d,
//   the total is 6 × volume ÷ d: at 50 µm, the size of flour, it is 120 m² (the worked example in
//   Wikipedia "Dust explosion": 1 kg, 0.048 m² as a ball, 120 m² as 50 µm grains). That is why a fine
//   dust of something that only smoulders as a lump (flour, sugar, coal, sawdust) can burn through a
//   cloud in a flash. It is stated here as a hazard: Turin 1785 (first recorded flour dust explosion,
//   Count Morozzo), Washburn A Mill 1878 (18 dead), Courrières 1906 (1,099 dead, coal dust).
//   Sizes: table sugar crystals about 0.5 mm, wheat flour mostly under 0.1 mm.
// "rust": iron rusts faster in damp, salty air. First-year corrosion of carbon steel, in µm a year,
//   from the dose-response function of ISO 9223:2012:
//     r = 1.77 × P^0.52 × e^(0.020 RH + f) + 0.102 × S^0.62 × e^(0.033 RH + 0.040 T)
//     f = 0.150 (T − 10) below 10 °C, −0.054 (T − 10) above
//   P = sulphur dioxide deposition and S = chloride (salt) deposition, both in mg/m² a day, RH in %,
//   T in °C, all as yearly averages. Categories for steel (µm a year): C1 up to 1.3, C2 to 25, C3 to
//   50, C4 to 80, C5 to 200, CX to 700. P is fixed at 10 (a town); S is 3 inland, 60 near the sea,
//   300 on the sea front (the standard's S₁ to S₂ bands).
import { M, box, clamp, approach } from '../kit.js';
import {
  THREE, TAU, COL, hex, num, sci, fmt0, board, panelBg, title, axes, line, curve, dot, ring, text, clip,
  dots, rng, fitNarrow, placeBoard, fit, focusSwitch, showLabels,
} from '../rate.js';

const VIEW = { pos: [0.2, 3.5, 10.6], target: [0.2, 3.25, 0] };
const VIEWS = { chips: VIEW, dust: VIEW, rust: VIEW };
const REEL = [[0, 7.5, 0], 0, 2], PHONE = [[0, -1.6, 1.2], 0, 1.35];

// ---------------------------------------------------------------- marble in acid
const K_SURF = 1.9e-5;                  // m/s per mol/dm³
const N0 = 0.40 / 100.09, V_ACID = 0.05, RTP = 24000, T_MAX = 420;
export const SIZES = { big: { d: 4, n: 'Large chips, 4 mm' }, small: { d: 2, n: 'Small chips, 2 mm' }, powder: { d: 0.2, n: 'Powder, 0.2 mm' } };
const VOL_CM3 = 0.40 / 2.71;
export const pieces = (d) => VOL_CM3 / ((Math.PI / 6) * (d / 10) ** 3);          // how many spheres of d mm
export const areaCm2 = (d) => (6 * VOL_CM3) / (d / 10);                          // their total surface
const cache = new Map();
// Gas volume (cm³) against time for pieces of d mm in acid of c0 mol/dm³: rows of [t, V, r/r0, c].
export function run(d, c0) {
  const key = d + '|' + c0.toFixed(2);
  if (cache.has(key)) return cache.get(key);
  const r0 = d / 2000, rows = [], h = 0.1;
  let r = r0;
  for (let t = 0; t <= T_MAX + 1e-9; t += h) {
    const X = 1 - (r / r0) ** 3, c = c0 - (2 * N0 * X) / V_ACID;
    if (Math.abs(t / 0.5 - Math.round(t / 0.5)) < 1e-6) rows.push([t, N0 * X * RTP, r / r0, c]);
    r = Math.max(0, r - K_SURF * Math.max(0, c) * h);
  }
  cache.set(key, rows); if (cache.size > 60) cache.delete(cache.keys().next().value);
  return rows;
}
const at = (rows, t) => rows[clamp(Math.round(t / 0.5), 0, rows.length - 1)];
const slope = (rows, t) => { const i = clamp(Math.round(t / 0.5), 0, rows.length - 2); return (rows[i + 1][1] - rows[i][1]) / 0.5; };
const doneAt = (rows) => { const r = rows.find((q) => q[2] <= 0); return r ? r[0] : Infinity; };

// ---------------------------------------------------------------- rust (ISO 9223:2012)
export function rust(RH, T, S, P = 10) {
  const f = T <= 10 ? 0.15 * (T - 10) : -0.054 * (T - 10);
  return 1.77 * Math.pow(P, 0.52) * Math.exp(0.02 * RH + f) + 0.102 * Math.pow(S, 0.62) * Math.exp(0.033 * RH + 0.04 * T);
}
const CATS = [[1.3, 'C1', 'very low'], [25, 'C2', 'low'], [50, 'C3', 'medium'], [80, 'C4', 'high'], [200, 'C5', 'very high'], [700, 'CX', 'extreme']];
const cat = (r) => CATS.find((c) => r <= c[0]) || CATS[5];
const SALT = { 3: 'inland', 60: 'near the sea', 300: 'on the sea front' };
const fmtSize = (mm) => (mm >= 10 ? `${+(mm / 10).toPrecision(2)} cm` : mm >= 1 ? `${+mm.toPrecision(2)} mm` : `${+(mm * 1000).toPrecision(2)} µm`);
const sizeOf = (s) => 100 * Math.pow(10, -s.cut);       // mm

export default {
  id: 'surface',
  short: 'Lump or powder',
  title: 'Surface: why powder reacts faster than a lump',
  subtitle: 'A solid reacts only where it can be reached. Read the rate from the slope of the gas curve.',
  view: VIEW,
  learn: `<p>When a solid reacts with a liquid or a gas, only the particles <b>at its surface</b> can be hit. The ones inside must wait their turn. So the rate depends on how much <b>surface area</b> is showing, not on how much solid there is.</p>
    <p><b>Marble in acid.</b> Drop marble chips into dilute hydrochloric acid and they fizz: the gas is carbon dioxide. Collect it in a gas syringe and plot its volume against time. The same mass of marble as a <b>powder</b> has far more surface, so the gas rushes out in seconds. Big chips take minutes. Notice the end of each curve: every run finishes at the <b>same volume</b>, because the amount of marble is the same. Surface changes how fast, not how much. (Schools do this with dilute acid and eye protection.)</p>
    <p><b>Reading the rate.</b> The rate at any moment is the <b>slope</b> of the curve at that moment: draw a <b>tangent</b> and work out its gradient. The curve is steepest at the start, when there is most surface and the acid is strongest. It flattens as the marble is used up, and the rate is zero when the line is level.</p>
    <p><b>Dust.</b> Cut a lump in half and you make new surface. Keep going down to the size of flour and one litre of solid has the surface of two cricket pitches. This is why a cloud of fine <b>flour, sugar or coal dust</b> hanging in air is a serious <b>hazard</b>: every grain is surrounded by oxygen, so a flame can run through the whole cloud almost at once. Flour mills, sugar plants and coal mines work hard to keep dust down and flames and sparks away.</p>
    <p><b>Rust.</b> Iron needs both oxygen and water to rust. In dry air a nail stays bright for years. In the monsoon a thin film of water sits on the metal for most of the day and rusting speeds up, and sea salt in the film makes it faster still (see <a href="https://glassbox.how/redoxclear/">RedoxClear</a>).</p>
    <p class="tip"><b>Try it:</b> in <b>Marble in acid</b>, press <b>Run it</b> for large chips, then for powder, and compare the slopes at 10 seconds. In <b>Cut it up</b>, slide from a 10 cm block to flour and watch the surface climb. In <b>Rust</b>, take a steel sheet from a dry inland winter to a monsoon sea front.</p>`,
  terms: [
    { t: 'Surface area', d: 'The total area of a solid that is open to the other reactant. Smaller pieces of the same mass have more of it.' },
    { t: 'Tangent', d: 'A straight line that just touches a curve at one point. Its gradient is the rate at that moment.' },
    { t: 'Gradient (slope)', d: 'Rise divided by run. On a volume against time graph it is cm³ of gas per second.' },
    { t: 'Limiting reactant', d: 'The reactant that runs out first. It fixes how much product you get in the end.' },
    { t: 'Combustible dust', d: 'Any fine powder that can burn, such as flour, sugar, coal or sawdust. As a cloud in air it is an explosion hazard.' },
    { t: 'Corrosion', d: 'The slow reaction of a metal with air and water. Rusting is the corrosion of iron.' },
  ],
  defaults: { focus: 'chips', size: 'small', acid: 0.5, t: 20, play: false, cut: 0, RH: 85, rT: 28, salt: 3 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'chips', label: 'Marble in acid' }, { v: 'dust', label: 'Cut it up' }, { v: 'rust', label: 'Rust' }] },
    { key: 'size', type: 'seg', label: 'Marble: 0.40 g as', options: Object.entries(SIZES).map(([v, z]) => ({ v, label: z.n })), fmt: (v) => `${num(areaCm2(SIZES[v].d), 2)} cm² of surface` },
    { key: 'acid', type: 'range', label: 'Marble: acid concentration', min: 0.25, max: 1, step: 0.05, ends: ['0.25 mol/dm³', '1.0 mol/dm³'], fmt: (v) => `${v.toFixed(2)} mol/dm³` },
    { key: 't', type: 'range', label: 'Marble: seconds since mixing', min: 0, max: T_MAX, step: 1, ends: ['0', '7 min'], fmt: (v) => `${Math.round(v)} s` },
    { key: 'go', type: 'buttons', label: 'Marble: the experiment', items: [{ label: 'Run it', act: (s) => { s.t = 0; s.play = true; } }, { label: 'Pause', act: (s) => { s.play = false; } }] },
    { key: 'cut', type: 'range', label: 'Cut it up: size of each piece', min: 0, max: 4, step: 0.02, ends: ['10 cm block', '10 µm dust'], fmt: (v, s) => fmtSize(sizeOf(s)) },
    { key: 'RH', type: 'range', label: 'Rust: humidity of the air', min: 30, max: 100, step: 1, ends: ['30 % dry', '100 %'], fmt: (v) => `${v} %` },
    { key: 'rT', type: 'range', label: 'Rust: temperature', min: 0, max: 40, step: 1, ends: ['0 °C', '40 °C'], fmt: (v) => `${v} °C` },
    { key: 'salt', type: 'seg', label: 'Rust: salt in the air', options: [{ v: 3, label: 'Inland' }, { v: 60, label: 'Near the sea' }, { v: 300, label: 'Sea front' }] },
  ],
  quiz: [
    { q: 'The same mass of marble is used as large chips and as powder, in the same acid. How do the two gas curves compare?', options: ['Powder: steeper at the start, same final volume', 'Powder: steeper, and more gas in the end', 'Chips: steeper, same final volume', 'They are identical'], answer: 0, why: 'Powder has far more surface, so the gas comes faster and the curve is steeper. The amount of marble is the same, so both curves level off at the same volume.' },
    { q: 'On a graph of gas volume against time, how do you find the rate of reaction at 30 seconds?', options: ['Read the volume at 30 s', 'Divide the final volume by 30', 'Draw a tangent to the curve at 30 s and find its gradient', 'Measure the area under the curve'], answer: 2, why: 'The rate at a moment is the slope of the curve at that moment. A tangent gives that slope: its rise in cm³ divided by its run in seconds.' },
    { q: 'Why is a cloud of fine flour dust in a mill treated as a serious hazard, when a sack of flour is not?', options: ['Dust is a different chemical from flour', 'Each tiny grain is surrounded by air, so a huge surface can burn almost at once', 'Dust is heavier than flour', 'The sack keeps the flour cold'], answer: 1, why: 'Cutting a solid finer multiplies its surface area. In a cloud every grain touches oxygen, so burning can spread through it in a fraction of a second. Mills control dust and ban flames for this reason.' },
  ],
  reel: [
    { ms: 5400, caption: 'A solid reacts only at its surface. The same marble as powder gives off its gas many times faster than chips.', set: { focus: 'chips', size: 'powder', acid: 0.5, play: false }, anim: { t: [0, 40] }, view: { pos: [0, 5.3, 7.2], target: [0, 5.0, 0] }, spin: 0 },
    { ms: 5200, caption: 'Cut one litre of solid down to the size of flour and its surface grows to 120 square metres. That is why dust clouds are a fire hazard.', set: { focus: 'dust' }, anim: { cut: [0, 3.3] }, view: { pos: [0, 5.3, 7.2], target: [0, 5.0, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const bench = box(7.2, 0.1, 3.6, M.matte(0x2b3039)); bench.position.set(0, 0.05, 0); root.add(bench);
    const G = { chips: new THREE.Group(), dust: new THREE.Group(), rust: new THREE.Group() };
    Object.values(G).forEach((g) => root.add(g));
    const rnd = rng(31), cc = new THREE.Color();

    // ================================================================ marble in acid
    const F = G.chips, FX = -1.3, FY = 0.12;
    const prof = [[1.35, 0], [1.38, 0.08], [0.42, 2.3], [0.42, 3.0], [0.48, 3.05]].map(([r, y]) => new THREE.Vector2(r, y));
    const flask = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.clear(0xcfe8ff, 0.16)); flask.position.set(FX, FY, 0); F.add(flask);
    const liqH = 0.95, rAt = (y) => 1.36 - (0.94 * y) / 2.3;
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(rAt(liqH) - 0.03, 1.31, liqH, 48), M.clear(0x8fd8c0, 0.32)); liquid.position.set(FX, FY + liqH / 2 + 0.03, 0); F.add(liquid);
    const bung = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.38, 0.3, 24), M.matte(0x7a4a32)); bung.position.set(FX, FY + 3.0, 0); F.add(bung);
    // delivery tube and gas syringe
    const SY = FY + 3.75, SX0 = 0.2, SL = 3.3;
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[FX, FY + 3.1, 0], [FX, SY - 0.15, 0], [FX + 0.25, SY, 0], [SX0, SY, 0]].map((p) => new THREE.Vector3(...p))), 40, 0.05, 8), M.clear(0xcfe8ff, 0.4)); F.add(pipe);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, SL, 32, 1, true), M.clear(0xcfe8ff, 0.2)); barrel.rotation.z = Math.PI / 2; barrel.position.set(SX0 + SL / 2, SY, 0); F.add(barrel);
    for (let i = 0; i <= 10; i++) { const tk = box(0.02, i % 5 ? 0.12 : 0.22, 0.02, M.glow(0xc8d2e4)); tk.position.set(SX0 + 0.15 + (i / 10) * (SL - 0.5), SY + 0.36, 0.1); F.add(tk); }
    const plunger = new THREE.Group(); F.add(plunger);
    const pHead = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 24), M.plastic(0x30343d)); pHead.rotation.z = Math.PI / 2; plunger.add(pHead);
    const pRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, SL, 12), M.plastic(0x8a8f99)); pRod.rotation.z = Math.PI / 2; pRod.position.x = SL / 2; plunger.add(pRod);
    const gasFill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 24), M.ghost(0xffe28a, 0.16)); gasFill.rotation.z = Math.PI / 2; F.add(gasFill);
    const stand = box(0.12, SY - 0.1, 0.12, M.metal(0x8a8f99)); stand.position.set(SX0 + SL + 0.2, (SY - 0.1) / 2 + 0.1, -0.5); F.add(stand);
    const NPC = 320, chips = dots(NPC, 0.1, 0xe9e4d8, 8); F.add(chips);
    const chipP = Array.from({ length: NPC }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 1.15; return { x: r * Math.cos(a), z: r * Math.sin(a), y: rnd() }; });
    const NBB = 90, bub = dots(NBB, 0.035, 0xffffff, 6); F.add(bub);
    const bubP = Array.from({ length: NBB }, () => ({ t: rnd(), x: 0, z: 0, on: false }));
    const lSyr = stage.label('', [SX0 + SL / 2, SY + 0.8, 0], F, 'hot'), lFl = stage.label('', [FX, FY - 0.0, 1.5], F), lAcid = stage.label('dilute hydrochloric acid', [FX - 1.2, FY + 1.5, 0.9], F);
    const chipLabels = [lSyr, lFl, lAcid];
    let bubAcc = 0;

    // ================================================================ cut it up
    const U = G.dust, CL = 2.2, CY = 1.75;
    const NCB = 512, cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 }), NCB);
    cubes.castShadow = true; U.add(cubes);
    const cubeO = new THREE.Object3D();
    const caseG = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 2.6), M.clear(0xcfe8ff, 0.05)); caseG.position.set(0, CY + 0.1, 0); U.add(caseG);
    const caseE = new THREE.LineSegments(new THREE.EdgesGeometry(caseG.geometry), new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.5 })); caseE.position.copy(caseG.position); U.add(caseE);
    const ND = 700, dust = dots(ND, 0.03, 0xe8dcc0, 6); U.add(dust);
    const dustP = Array.from({ length: ND }, () => ({ x: (rnd() - 0.5) * 3.9, y: (rnd() - 0.5) * 2.9, z: (rnd() - 0.5) * 2.3, ph: rnd() * TAU }));
    const lCut = stage.label('', [0, CY + 2.05, 0.6], U, 'hot'), lArea = stage.label('', [0, 0.35, 1.5], U);
    const dustLabels = [lCut, lArea];
    let cutN = 0;
    const layCubes = (n, spread) => {
      const side = CL / n, gap = side * spread;
      let i = 0;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) {
        cubeO.position.set((a - (n - 1) / 2) * (side + gap), CY + (b - (n - 1) / 2) * (side + gap), (c - (n - 1) / 2) * (side + gap));
        cubeO.scale.setScalar(side * 0.98); cubeO.updateMatrix(); cubes.setMatrixAt(i++, cubeO.matrix);
      }
      cubeO.scale.setScalar(0.0001); cubeO.position.set(0, -50, 0); cubeO.updateMatrix();
      for (; i < NCB; i++) cubes.setMatrixAt(i, cubeO.matrix);
      cubes.instanceMatrix.needsUpdate = true;
    };

    // ================================================================ rust
    const Rg = G.rust;
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 });
    const sheet = box(3.6, 2.4, 0.08, sheetMat); sheet.position.set(0, 1.75, 0); sheet.rotation.x = -0.35; Rg.add(sheet);
    for (const x of [-1.5, 1.5]) { const leg = box(0.1, 1.5, 0.1, M.metal(0x6b717c)); leg.position.set(x, 0.8, -0.75); Rg.add(leg); }
    const NR = 260, rustD = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NR);
    sheet.add(rustD);
    const rustP = Array.from({ length: NR }, () => ({ x: (rnd() - 0.5) * 3.4, y: (rnd() - 0.5) * 2.2, s: 0.05 + rnd() * 0.16, k: rnd(), c: rnd() }));
    const rO = new THREE.Object3D(), rustA = new THREE.Color(0xb5521e), rustB = new THREE.Color(0x6e2f12);
    const NW = 60, wet = dots(NW, 0.05, 0x9fd4ff, 8); sheet.add(wet);
    const wetP = Array.from({ length: NW }, () => ({ x: (rnd() - 0.5) * 3.3, y: (rnd() - 0.5) * 2.1, k: rnd() }));
    const NSL = 50, saltD = dots(NSL, 0.035, 0xffffff, 6); Rg.add(saltD);
    const saltP = Array.from({ length: NSL }, () => ({ x: (rnd() - 0.5) * 6, y: 1 + rnd() * 3.2, z: (rnd() - 0.5) * 2, k: rnd() }));
    const lRust = stage.label('', [0, 3.35, 0], Rg, 'hot'), lAir = stage.label('', [-2.3, 0.45, 1.3], Rg), lSheet = stage.label('bare steel sheet', [1.9, 0.45, 1.3], Rg);
    const rustLabels = [lRust, lAir, lSheet];
    let rShow = 0;

    // ================================================================ board
    let S = null, bKey = '';
    const bd = board(root, 3.4, 2.45, 640, 460, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'chips') {
        title(g, 'Gas collected', 'cm³ against seconds');
        const xMax = S.size === 'powder' ? 60 : S.size === 'small' ? 240 : T_MAX;
        const a = axes(g, w, h, { xMax, yMax: 100, xTicks: [0, xMax / 4, xMax / 2, (3 * xMax) / 4, xMax], yTicks: [0, 25, 50, 75, 100], xFmt: (v) => v + ' s', xLabel: 'time since mixing →' });
        clip(g, a, () => {
          for (const [k, z] of Object.entries(SIZES)) { const rows = run(z.d, S.acid); line(g, rows.filter((r) => r[0] <= xMax).map((r) => [r[0], r[1]]), a.X, a.Y, k === S.size ? COL.count : 'rgba(255,255,255,.3)', k === S.size ? 5 : 2); }
          const rows = run(SIZES[S.size].d, S.acid), t = Math.min(S.t, xMax), m = slope(rows, t), v = at(rows, t)[1];
          // the tangent at t
          const dx = xMax * 0.16;
          g.strokeStyle = COL.hill; g.lineWidth = 3; g.beginPath(); g.moveTo(a.X(t - dx), a.Y(v - m * dx)); g.lineTo(a.X(t + dx), a.Y(v + m * dx)); g.stroke();
          dot(g, a.X(t), a.Y(v), COL.hill, 9);
        });
        const rows = run(SIZES[S.size].d, S.acid), m = slope(rows, S.t);
        text(g, `slope now: ${m < 0.005 ? '0' : num(m, 2)} cm³/s`, w - 30, a.y0 - 50, COL.hill, 'bold 24px sans-serif', 'right');
        text(g, 'all end at 96 cm³', w - 30, a.y0 - 20, COL.soft, '20px sans-serif', 'right');
      } else if (S.focus === 'dust') {
        title(g, 'Surface of one litre of solid');
        const a = axes(g, w, h, { xMin: 0.01, xMax: 100, xLog: true, yMin: 0.01, yMax: 1000, yLog: true, xTicks: [0.01, 0.1, 1, 10, 100], yTicks: [0.01, 0.1, 1, 10, 100, 1000], xFmt: (v) => fmtSize(v), yFmt: (v) => v + ' m²', xLabel: '← finer · size of each piece' });
        line(g, [[0.01, 600], [100, 0.06]], a.X, a.Y, COL.theory, 4);
        for (const [mm, n, dy] of [[0.5, 'sugar crystals', -14], [0.05, 'flour', -14], [100, 'one block', -14]]) { ring(g, a.X(mm), a.Y(6 / mm), 'rgba(255,255,255,.75)', 7); text(g, n, a.X(mm) + (mm === 100 ? -12 : 12), a.Y(6 / mm) + dy, COL.soft, '19px sans-serif', mm === 100 ? 'right' : 'left'); }
        const d = sizeOf(S); dot(g, a.X(d), a.Y(6 / d), COL.hill, 10);
        text(g, 'area = 6 × volume ÷ size', a.x0 + 14, a.y0 - 16, COL.soft, '20px sans-serif');
      } else {
        title(g, 'Rusting of steel', 'µm lost a year');
        const a = axes(g, w, h, { xMin: 30, xMax: 100, yMin: 1, yMax: 1000, yLog: true, xTicks: [30, 50, 70, 90, 100], yTicks: [1, 10, 100, 1000], xFmt: (v) => v + ' %', xLabel: 'humidity of the air →' });
        for (const sl of [3, 60, 300]) clip(g, a, () => curve(g, (RH) => rust(RH, S.rT, sl), 30, 100, a.X, a.Y, sl === S.salt ? COL.hill : 'rgba(255,255,255,.3)', sl === S.salt ? 5 : 2));
        text(g, 'sea front', a.x1 - 8, a.Y(rust(100, S.rT, 300)) + 30, COL.soft, '18px sans-serif', 'right');
        text(g, 'inland', a.x1 - 8, a.Y(rust(100, S.rT, 3)) + 28, COL.soft, '18px sans-serif', 'right');
        dot(g, a.X(S.RH), a.Y(clamp(rust(S.RH, S.rT, S.salt), 1, 1000)), COL.count, 10);
        text(g, 'ISO 9223 first-year loss', a.x0 + 14, a.y1 + 24, COL.soft, '20px sans-serif');
      }
    }, [3.25, 6.25, 0]);

    const setFocus = focusSwitch(stage, G, VIEWS);
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        setFocus(s.focus);
        const narrow = fitNarrow(stage, []);
        showLabels(chipLabels, s.focus === 'chips'); showLabels(dustLabels, s.focus === 'dust'); showLabels(rustLabels, s.focus === 'rust');
        placeBoard(bd, [[3.25, 6.25, 0], -0.06, 1.3], REEL, PHONE);
        if (s.focus === 'chips') {
          const z = SIZES[s.size], rows = run(z.d, s.acid);
          if (s.play) { s.t = Math.min(T_MAX, s.t + dt * (s.size === 'powder' ? 4 : 16)); if (at(rows, s.t)[2] <= 0 || s.t >= T_MAX) s.play = false; }
          const [, V, k] = at(rows, s.t), m = slope(rows, s.t);
          // pieces shrink inwards
          const nShow = s.size === 'big' ? 4 : s.size === 'small' ? 35 : NPC, sc = (s.size === 'big' ? 1.9 : s.size === 'small' ? 0.95 : 0.22) * k;
          for (let i = 0; i < NPC; i++) {
            if (i >= nShow || k <= 0) { chips.hide(i); continue; }
            const p = chipP[i], lift = s.size === 'powder' ? p.y * 0.5 * Math.min(1, m / 4) : 0;
            const px = s.size === 'big' ? [-0.55, 0.5, -0.1, 0.15][i] : p.x * (s.size === 'powder' ? 1 : 0.9), pz = s.size === 'big' ? [0.3, 0.35, -0.5, 0.0][i] : p.z * (s.size === 'powder' ? 1 : 0.9);
            chips.place(i, FX + px * (1 - lift * 0.3), FY + 0.1 + 0.1 * sc + lift + (s.size === 'powder' ? 0.03 * Math.sin(time * 5 + i) * Math.min(1, m) : 0), pz * (1 - lift * 0.3), sc);
          }
          chips.done();
          // bubbles: one for each 0.25 cm³ or so, capped
          bubAcc += Math.min(60, m * 6) * dt;
          for (let i = 0; i < NBB; i++) {
            const b = bubP[i];
            if (!b.on && bubAcc >= 1) { bubAcc -= 1; b.on = true; b.t = 0; const a = rnd() * TAU, r = Math.sqrt(rnd()) * 1.1; b.x = r * Math.cos(a); b.z = r * Math.sin(a); }
            if (b.on) { b.t += dt * 1.6; if (b.t >= 1) b.on = false; }
            if (b.on) { const y = 0.12 + b.t * (liqH - 0.12), rr = rAt(y) - 0.08, q = Math.hypot(b.x, b.z); const f = q > rr ? rr / q : 1; bub.place(i, FX + b.x * f, FY + y, b.z * f, 0.7 + b.t); } else bub.hide(i);
          }
          if (bubAcc > 5) bubAcc = 5;
          bub.done();
          const px = SX0 + 0.15 + (V / 100) * (SL - 0.5);
          plunger.position.set(px, SY, 0);
          gasFill.scale.y = Math.max(0.001, px - SX0); gasFill.position.set((SX0 + px) / 2, SY, 0);
          lSyr.element.innerHTML = `gas syringe: <b>${V.toFixed(0)} cm³</b> of CO₂`; lSyr.element.style.setProperty('--c', COL.count);
          lFl.element.innerHTML = k <= 0 ? 'all the marble has gone' : `${z.n.toLowerCase()}: ${num(pieces(z.d), 2)} pieces`;
          if (narrow) showLabels([lAcid, lFl], false);
        } else if (s.focus === 'dust') {
          const d = sizeOf(s), per = 100 / d;
          const n = per < 1.5 ? 1 : per < 3 ? 2 : per < 6 ? 4 : per < 12 ? 8 : 0;
          const spread = n ? 0.22 : 0;
          if (n !== cutN) { cutN = n; layCubes(n || 1, spread); cubes.visible = n > 0; }
          const cloud = n === 0;
          const fine = clamp((Math.log10(100 / d) - 1.1) / 2.9, 0, 1);            // 0 at 8 mm, 1 at 10 µm
          const nd = cloud ? Math.round(120 + 580 * fine) : 0;
          for (let i = 0; i < ND; i++) {
            if (i >= nd) { dust.hide(i); continue; }
            const p = dustP[i], settle = 1 - fine;                              // coarse grit sits low, fine dust hangs
            const y = p.y * (1 - 0.75 * settle) - 1.1 * settle + 0.05 * Math.sin(time * 0.7 + p.ph);
            dust.place(i, p.x + 0.06 * Math.sin(time * 0.5 + p.ph * 2), CY + 0.1 + y, p.z + 0.06 * Math.cos(time * 0.4 + p.ph), 2.2 - 1.5 * fine);
          }
          dust.done();
          const area = 6 / d;                                                    // m² for one litre (d in mm)
          lCut.element.innerHTML = `pieces ${fmtSize(d)} across: <b>${area < 10 ? num(area, 2) : fmt0(area)} m²</b> of surface`; lCut.element.style.setProperty('--c', COL.hill);
          lArea.element.innerHTML = cloud ? (d < 0.5 ? 'fine dust hangs in the air: every grain touches oxygen' : 'grit: it settles quickly') : `${n ** 3} piece${n > 1 ? 's' : ''}: new faces are new surface`;
          if (narrow) showLabels([lArea], false);
        } else {
          const r = rust(s.RH, s.rT, s.salt);
          rShow = approach(rShow, clamp(Math.log10(r) / 3, 0, 1), 3, dt);
          for (let i = 0; i < NR; i++) {
            const p = rustP[i], on = p.k < rShow * 1.05;
            rO.position.set(p.x, p.y, 0.045); rO.scale.setScalar(on ? p.s * (0.5 + rShow) : 0.0001); rO.updateMatrix(); rustD.setMatrixAt(i, rO.matrix);
            rustD.setColorAt(i, cc.copy(rustA).lerp(rustB, p.c));
          }
          rustD.instanceMatrix.needsUpdate = true; if (rustD.instanceColor) rustD.instanceColor.needsUpdate = true;
          const wetK = clamp((s.RH - 60) / 35, 0, 1);
          for (let i = 0; i < NW; i++) { const p = wetP[i]; if (p.k < wetK) wet.place(i, p.x, p.y, 0.05, 0.6 + p.k); else wet.hide(i); }
          wet.done();
          const ns = s.salt === 3 ? 0 : s.salt === 60 ? 18 : NSL;
          for (let i = 0; i < NSL; i++) { const p = saltP[i]; if (i < ns) saltD.place(i, ((p.x + time * 0.5 + 3) % 6) - 3, p.y + 0.1 * Math.sin(time + p.k * 9), p.z, 1); else saltD.hide(i); }
          saltD.done();
          const c = cat(r);
          lRust.element.innerHTML = `rusting at <b>${num(r, 2)} µm a year</b> · ${c[1]}, ${c[2]}`; lRust.element.style.setProperty('--c', r > 50 ? COL.hill : r > 25 ? COL.count : COL.ok);
          lAir.element.innerHTML = `air: ${s.RH} % humid, ${s.rT} °C, ${SALT[s.salt]}`;
          if (narrow) showLabels([lAir, lSheet], false);
        }
        const k2 = `${s.focus}|${s.size}|${s.acid}|${Math.round(s.t * 2)}|${s.cut}|${s.RH}|${s.rT}|${s.salt}`;
        if (k2 !== bKey) { bKey = k2; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'chips') {
          const z = SIZES[s.size], rows = run(z.d, s.acid), [, V, k, c] = at(rows, s.t), m = slope(rows, s.t), m0 = slope(rows, 0), end = doneAt(rows);
          return `<div class="big">Rate now: ${m < 0.005 ? '0' : num(m, 2)} cm³ of gas a second</div>
            <div class="row"><span>${z.n}</span><b>${num(pieces(z.d), 2)} pieces, ${num(areaCm2(z.d), 2)} cm² at the start</b></div>
            <div class="row"><span>Gas so far, at ${Math.round(s.t)} s</span><b>${V.toFixed(1)} of 96 cm³</b></div>
            <div class="row x"><span>Slope at the start</span><b>${num(m0, 2)} cm³/s</b></div>
            <div class="row x"><span>Acid left</span><b>${c.toFixed(2)} mol/dm³</b></div>
            <div class="row"><span>All the marble gone after</span><b>${isFinite(end) ? Math.round(end) + ' s' : 'more than 7 min'}</b></div>
            <small>The slope of the curve is the rate. ${k <= 0 ? 'The line is level: the reaction has stopped.' : 'It falls as the pieces shrink and the acid weakens.'}</small>`;
        }
        if (s.focus === 'dust') {
          const d = sizeOf(s), area = 6 / d, n = Math.pow(100 / d, 3);
          const like = area < 0.2 ? 'about one sheet of A4 paper (0.06 m²)' : area < 3 ? 'about a table top' : area < 30 ? 'about the floor of a room' : area < 90 ? 'about a cricket pitch (61 m²)' : area < 180 ? 'about two cricket pitches (61 m² each)' : area < 400 ? 'about a tennis court (261 m²)' : 'more than two tennis courts';
          return `<div class="big">${area < 10 ? num(area, 2) : fmt0(area)} m² of surface</div>
            <div class="row"><span>Size of each piece</span><b>${fmtSize(d)}</b></div>
            <div class="row"><span>Number of pieces</span><b>${n < 1e6 ? fmt0(n) : sci(n, 1)}</b></div>
            <div class="row"><span>Against the uncut block</span><b>${fmt0(area / 0.06)} times the surface</b></div>
            <div class="row x"><span>That is</span><b>${like}</b></div>
            <small>One litre of solid, cut into cubes: area = 6 × volume ÷ size. ${d < 0.5 ? 'As a cloud in air, dust this fine of anything that can burn is an explosion hazard.' : ''}</small>`;
        }
        const r = rust(s.RH, s.rT, s.salt), c = cat(r), dry = rust(45, 15, 3);
        return `<div class="big">Steel rusts at ${num(r, 2)} µm a year</div>
          <div class="row"><span>The air</span><b>${s.RH} % humid, ${s.rT} °C, ${SALT[s.salt]}</b></div>
          <div class="row"><span>ISO 9223 category</span><b>${c[1]}: ${c[2]}</b></div>
          <div class="row"><span>Against a dry inland winter (45 %, 15 °C)</span><b>${(r / dry).toFixed(1)} times</b></div>
          <div class="row x"><span>From salt in the air</span><b>${num(0.102 * Math.pow(s.salt, 0.62) * Math.exp(0.033 * s.RH + 0.04 * s.rT), 2)} µm a year</b></div>
          <small>First-year loss of bare carbon steel if the whole year were like this. Water is a reactant here: more of it on the metal, for longer, means faster rusting.</small>`;
      })(s)),
    };
  },
};
