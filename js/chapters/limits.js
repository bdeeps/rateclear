// Chapter 5: where the simple rules stop, and a myth. Three scenes.
// "slope": a rate is not one number. The tank of chapter 1 (the collision model of kinetics.js) is
//   run as a batch: A + B → C + D with nothing topped up, so the reactants run out. The count of A
//   left is plotted against time. The rate at any moment is the slope of that curve, read with a
//   tangent. Collision theory says rate = c × N_A × N_B, so with equal numbers
//       dN/dt = −c N²,  N(t) = N₀ ÷ (1 + c N₀ t),
//   a second-order reaction: each half-life is twice as long as the one before. c is not fitted: it is
//   the collision-theory rate for one A and one B (kinetics.js). The counted curve lies on it.
// "toohot": living chemistry disobeys Arrhenius at the hot end. The speed of a curd culture follows
//   the Arrhenius equation (apparent hill 60 kJ/mol, as in chapter 2) only while its enzymes stay
//   folded. A protein unfolds over a few degrees: the share still folded is
//       1 ÷ (1 + e^((ΔH ÷ R) × (1/T_m − 1/T)))
//   (the two-state model used for the temperature response of living things: Schoolfield, Sharpe and
//   Magnuson, J. Theor. Biol. 88, 719, 1981). ΔH = 450 kJ/mol is typical of protein unfolding
//   (hundreds of kJ/mol) and T_m = 47 °C is chosen so the best temperature is about 43 °C and the
//   culture stops above about 50 °C, as curd cultures do (Streptococcus thermophilus and Lactobacillus
//   bulgaricus grow best at about 40 to 45 °C; see CurdClear). Setting time is pinned to 5 hours at
//   42 °C. The numbers show the shape of the effect, not one dairy's culture.
// "diamond": the myth-buster. "Diamonds are for ever." At room conditions graphite is the more stable
//   form of carbon, by 2.9 kJ/mol (standard Gibbs energy of formation of diamond, 2.90 kJ/mol, CRC
//   Handbook), so diamond "should" turn into graphite. But the hill is enormous: 728 ± 50 kJ/mol for
//   the {110} face and about 1,060 kJ/mol for {111}, measured in vacuum at 1,850 to 2,000 °C (Davies and
//   Evans, Proc. R. Soc. Lond. A 328, 413, 1972: 174 and 253 kcal/mol). The time shown is 1 ÷ k with
//   k = A × e^(−Ea ÷ RT) and A = 10¹³ a second, the rate at which atoms in a solid vibrate: an
//   order-of-magnitude estimate only. Age of the universe: 1.38 × 10¹⁰ years (Planck 2018).
//   In air a diamond burns to CO₂ long before this, above about 700 °C: the scene is in a vacuum.
import { M, box, clamp, approach } from '../kit.js';
import {
  THREE, Gas, R, K0, TAU, boltz, A, COL, hex, share, times, num, fmt0, sci, fmtDur, board, panelBg, title, axes, line, curve, dot, ring, text, clip,
  tank, gasView, dots, thermometer, rng, tempColor, cssTemp, fitNarrow, placeBoard, fit, focusSwitch, showLabels, inReel,
} from '../rate.js';

const VIEW = { pos: [0.2, 3.5, 10.6], target: [0.2, 3.25, 0] };
const VIEWS = { slope: VIEW, toohot: VIEW, diamond: VIEW };
const REEL = [[0, 7.5, 0], 0, 2], PHONE = [[0, -1.6, 1.2], 0, 1.35];
const AT = [0, 2.35, 0];
const N0 = 200, T_RUN = 120, EA_RUN = 8;

// ---------------------------------------------------------------- a curd culture
const CULT = { Ea: 60, Hd: 450, Tm: 47, T0: 42, h0: 5 };
const folded = (Tc) => 1 / (1 + Math.exp(((CULT.Hd * 1000) / R) * (1 / (CULT.Tm + K0) - 1 / (Tc + K0))));
const arrRel = (Tc) => Math.exp(((CULT.Ea * 1000) / R) * (1 / (CULT.T0 + K0) - 1 / (Tc + K0)));     // against 42 °C
export const cultRate = (Tc) => (arrRel(Tc) * folded(Tc)) / folded(CULT.T0);
let BEST = 42; for (let t = 30; t <= 55; t += 0.1) if (cultRate(t) > cultRate(BEST)) BEST = t;
const WHERE = [[-18, 'freezer'], [4, 'fridge'], [15, 'winter kitchen'], [25, 'room'], [35, 'summer kitchen'], [43, 'warm spot'], [55, 'too hot'], [70, 'scalding']];
const whereName = (T) => WHERE.reduce((a, p) => (Math.abs(p[0] - T) < Math.abs(a[0] - T) ? p : a), WHERE[0])[1];

// ---------------------------------------------------------------- diamond to graphite
const DIA = { Ea: 728, Ea111: 1059, A: 1e13, dG: 2.9 };
const YEAR = 3.156e7, UNIVERSE = 1.38e10;
export const diaYears = (Tc) => 1 / (DIA.A * boltz(DIA.Ea, Tc + K0)) / YEAR;
const p10 = (v) => { const e = Math.round(Math.log10(v)); return '10' + String(e).split('').map((c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c])).join(''); };
const fmtYears = (y) => {
  if (y >= 1e6) return `about ${p10(y)} years`;
  if (y >= 2) return `about ${fmt0(+y.toPrecision(2))} years`;
  const min = y * 525960; return `about ${fmtDur(+min.toPrecision(2))}`;
};

export default {
  id: 'limits',
  short: 'Where it stops',
  title: 'Limits: slowing down, too hot for life, and a myth about diamonds',
  subtitle: 'A rate falls as the reactants run out. Living things break the hot-is-fast rule. And downhill does not mean fast.',
  view: VIEW,
  learn: `<p><b>A rate is not one number.</b> As a reaction goes on, the reactants are used up, so there are fewer collisions and the rate falls. On a graph of amount against time the rate at any moment is the <b>slope</b>: draw a <b>tangent</b> and find its gradient. The curve is steepest at the start and flattens towards the end. In the tank, with equal numbers of A and B, each <b>half-life</b> takes twice as long as the one before.</p>
    <p><b>Hotter is not always faster.</b> The Arrhenius equation says heat always speeds a reaction. But the chemistry of life is run by <b>enzymes</b>, and an enzyme is a folded protein. Heat it too far and it unfolds and stops working. So curd bacteria speed up as the kitchen warms from 15 °C to about 43 °C, which is why dahi sets fast in summer (see CurdClear), and then stop within a few more degrees. Pour the starter into milk that is too hot and you get no dahi at all. The cold end has a limit too: a fridge <b>slows</b> microbes but does not kill them, so food still spoils there in the end (see FridgeClear).</p>
    <p><b>Downhill does not mean fast.</b> How <b>far</b> a reaction can go and how <b>fast</b> it goes are separate questions. How far is the business of energy and equilibrium (see <a href="https://glassbox.how/equilibriumclear/">EquilibriumClear</a>). How fast is the business of the hill. Wood and air could give out a great deal of energy, yet a wooden table sits in air for a century, until a flame gives it the push over the hill.</p>
    <p><b>Myth: "diamonds are for ever".</b> At room conditions graphite, the stuff of pencil lead, is the more stable form of carbon. So every diamond is very slowly on its way to becoming graphite. The hill is about 730 kJ/mol, so high that at room temperature the wait is far longer than the age of the universe. In a furnace at 1,900 °C, with no air, it takes hours. The myth is false in theory and true for any jeweller.</p>
    <p><b>Three quick myths.</b> A pressure cooker does not cook by "pushing" heat into food: the pressure only lets the water get hotter (see BoilClear). A catalyst does not give you more product, only the same product sooner. And "doubles every 10 °C" is a rule of thumb for one size of hill, not a law.</p>
    <p class="tip"><b>Try it:</b> in <b>Running out</b>, slide the tangent along the curve and watch the slope fall. In <b>Too hot</b>, warm the culture from the fridge to 43 °C, then on to 55 °C. In <b>Diamond</b>, heat the vacuum furnace until the wait drops from longer than the universe to an afternoon.</p>`,
  terms: [
    { t: 'Tangent', d: 'A straight line that just touches a curve. Its gradient on an amount against time graph is the rate at that moment.' },
    { t: 'Half-life', d: 'The time for half of a reactant to be used up.' },
    { t: 'Initial rate', d: 'The rate at the very start, when the curve is steepest. Chemists compare reactions by it.' },
    { t: 'Denature', d: 'To unfold a protein by heat or acid so that it loses its shape and stops working. A boiled egg white is denatured protein.' },
    { t: 'Optimum temperature', d: 'The temperature at which an enzyme or a microbe works fastest. Hotter than this, it fails quickly.' },
    { t: 'Stable and metastable', d: 'Stable means lowest in energy. Metastable means not the lowest, but stuck behind a high hill, like diamond.' },
  ],
  defaults: { focus: 'slope', T: 27, tt: 10, ff: 4, run: 0, bT: 30, dT: 25 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'slope', label: 'Running out' }, { v: 'toohot', label: 'Too hot' }, { v: 'diamond', label: 'Diamond' }] },
    { key: 'tt', type: 'range', label: 'Running out: put the tangent at', min: 0, max: T_RUN, step: 1, ends: ['0 s', '120 s'], fmt: (v) => `${Math.round(v)} s` },
    { key: 'T', type: 'range', label: 'Running out: temperature', min: -50, max: 200, step: 5, ends: ['−50 °C', '200 °C'], fmt: (v) => `${Math.round(v)} °C` },
    { key: 'ff', type: 'seg', label: 'Running out: run the tank', options: [{ v: 1, label: 'At normal speed' }, { v: 4, label: '4× fast' }, { v: 12, label: '12× fast' }] },
    { key: 'go', type: 'buttons', label: 'Running out: the experiment', items: [{ label: 'Run it again', act: (s) => { s.run = (s.run || 0) + 1; } }] },
    { key: 'bT', type: 'range', label: 'Too hot: temperature of the milk', min: 0, max: 70, step: 1, ends: ['0 °C', '70 °C'], fmt: (v) => `${v} °C · ${whereName(v)}` },
    { key: 'dT', type: 'range', label: 'Diamond: temperature of the furnace', min: 25, max: 2200, step: 25, ends: ['25 °C', '2,200 °C'], fmt: (v) => `${fmt0(v)} °C` },
  ],
  quiz: [
    { q: 'On a graph of reactant left against time, the curve is steep at first and then flattens. What does that tell you?', options: ['The reaction speeds up as it goes', 'The rate falls as the reactants are used up', 'The thermometer is broken', 'The rate is the same all the way through'], answer: 1, why: 'The slope of the curve is the rate. Fewer reactant particles means fewer collisions each second, so the slope gets gentler and reaches zero when the reaction is over.' },
    { q: 'Milk with a spoon of starter is kept at 60 °C. Why does it not set into dahi?', options: ['The Arrhenius equation stops working for all reactions at 60 °C', 'The bacteria\'s enzymes unfold in the heat, so their chemistry stops', 'Milk boils at 60 °C', 'The milk has too much water'], answer: 1, why: 'Enzymes are folded proteins. Past about 45 to 50 °C the enzymes of curd bacteria lose their shape and the bacteria die. About 40 to 45 °C is their best temperature.' },
    { q: 'Graphite is more stable than diamond at room conditions. Why do diamonds not turn into graphite?', options: ['They do, in a few years', 'The activation energy is so high that the change is far too slow to see', 'Diamond is not made of carbon', 'A catalyst in the air protects them'], answer: 1, why: 'Being downhill says a change can happen, not how fast. The hill for diamond to graphite is about 730 kJ/mol, so at room temperature almost no atom ever gets over it.' },
  ],
  reel: [
    { ms: 5400, caption: 'A rate is not one number. As the reactants run out the curve flattens, and the slope of the tangent is the rate at that moment.', set: { focus: 'slope', T: 27, ff: 4 }, act: (s) => { s.run = (s.run || 0) + 1; }, anim: { tt: [0, 22] }, view: { pos: [0, 5.3, 7.2], target: [0, 5.0, 0] }, spin: 0 },
    { ms: 5600, caption: 'Diamond should turn into graphite. Its energy hill is so high that at room temperature the wait is longer than the age of the universe.', set: { focus: 'diamond' }, anim: { dT: [25, 2100] }, view: { pos: [0, 5.0, 7.0], target: [0, 4.8, 0] }, spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const bench = box(7.2, 0.1, 3.6, M.matte(0x2b3039)); bench.position.set(0, 0.05, 0); root.add(bench);
    const G = { slope: new THREE.Group(), toohot: new THREE.Group(), diamond: new THREE.Group() };
    Object.values(G).forEach((g) => root.add(g));
    const rnd = rng(51), cc = new THREE.Color(), white = new THREE.Color(0xffffff);

    // ================================================================ slope: a batch run in the tank
    const gas = new Gas({ n: 400, box: [5, 3, 2.4], r: 0.08, s300: 1.6, seed: 17, T: 300 });
    const tk = tank(G.slope, gas, AT);
    for (const x of [-2.2, 2.2]) { const leg = box(0.5, AT[1] - 1.5 - 0.27, 2.2, M.matte(0x23272f)); leg.position.set(x, (AT[1] - 1.5 - 0.17) / 2 + 0.05, 0); G.slope.add(leg); }
    const view = gasView(tk, gas);
    const opt = { Ea: EA_RUN, EaBack: null, steric: 1, mode: 'batch', cat: null };
    let sKey = '', trace = [], nextRec = 0, cK = 0, half1 = null, half2 = null;
    const lLeft = stage.label('', [-1.6, AT[1] + 1.85, 1.2], G.slope, 'hot'), lST = stage.label('', [1.5, AT[1] - 1.75, 1.5], G.slope), lSF = stage.label('blue and orange react and turn green', [-1.4, AT[1] - 1.75, 1.5], G.slope);
    const slopeLabels = [lLeft, lST, lSF];
    const nTheory = (t) => N0 / (1 + cK * N0 * t);
    const nAt = (t) => { if (!trace.length) return N0; const i = clamp(Math.round(t / 0.5), 0, trace.length - 1); return trace[i][1]; };
    // counted slope: the fall in A over 8 s around t (molecules a second), or null if not yet reached
    const countedSlope = (t) => { const a = Math.max(0, t - 4), b = Math.min(T_RUN, t + 4); if (gas.t < b - 1e-6) return null; return (nAt(a) - nAt(b)) / (b - a); };

    // ================================================================ too hot: a pot of milk with its culture
    const P = new THREE.Group(); P.scale.setScalar(1.4); P.position.y = -0.04; G.toohot.add(P);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.7), new THREE.MeshBasicMaterial({ color: 0x223044, toneMapped: false })); back.position.set(0, 1.5, -1.2); P.add(back);
    const potPts = [[0.55, 0], [0.95, 0.12], [1.22, 0.55], [1.2, 0.95], [1.02, 1.2], [1.08, 1.28]].map(([r, y]) => new THREE.Vector2(r, y));
    const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 48), new THREE.MeshStandardMaterial({ color: 0xa8552f, roughness: 0.85, side: THREE.DoubleSide })); pot.position.set(0, 0.12, 0); pot.castShadow = true; P.add(pot);
    const milkMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.35 });
    const milk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.03, 48), milkMat); milk.position.set(0, 1.27, 0); P.add(milk);
    const NB = 80, bugs = dots(NB, 0.045, 0xffffff); P.add(bugs);
    const bug = Array.from({ length: NB }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.9; return { x: r * Math.cos(a), z: r * Math.sin(a), f: 0, k: rnd() }; });
    const thB = thermometer(P, -2.2, 0.35, 0.3, 2.2);
    const lPot = stage.label('', [0, 2.55, -1.0], P, 'hot'), lBug = stage.label('', [0, 0.2, 1.5], P), lSet = stage.label('', [2.2, 1.4, 0.4], P);
    const hotLabels = [lPot, lBug, lSet];
    const aliveC = new THREE.Color(0x6fb6ff), deadC = new THREE.Color(0x5b6170);

    // ================================================================ diamond in a vacuum furnace
    const D = new THREE.Group(); D.scale.setScalar(0.9); G.diamond.add(D);
    const DY = 2.25;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.35, 48), M.metal(0x6b717c, { roughness: 0.5 })); base.position.set(0, 0.3, 0); D.add(base);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.6, 48, 1, true), M.clear(0xcfe8ff, 0.1)); jar.position.set(0, 0.47 + 1.3, 0); D.add(jar);
    const domeJ = new THREE.Mesh(new THREE.SphereGeometry(1.35, 48, 16, 0, TAU, 0, Math.PI / 2), M.clear(0xcfe8ff, 0.1)); domeJ.position.set(0, 0.47 + 2.6, 0); D.add(domeJ);
    const heatMat = new THREE.MeshStandardMaterial({ color: 0x3b3f48, emissive: 0x000000, roughness: 0.6 });
    const coil = new THREE.Group(); D.add(coil);
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 10, 48), heatMat); t.rotation.x = Math.PI / 2; t.position.y = DY - 0.8 + i * 0.4; coil.add(t); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, DY - 0.95, 16), M.matte(0xd9d4c8)); stem.position.set(0, 0.47 + (DY - 0.95) / 2, 0); D.add(stem);
    const gemMat = new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.92, emissive: 0x4a90c8, emissiveIntensity: 0.35, flatShading: true });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), gemMat); gem.scale.y = 1.15; gem.position.set(0, DY, 0); gem.castShadow = true; D.add(gem);
    const gemE = new THREE.LineSegments(new THREE.EdgesGeometry(gem.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); gem.add(gemE);
    const lGem = stage.label('', [0, DY + 1.95, 0.3], D, 'hot'), lJar = stage.label('vacuum furnace: no air, so nothing can burn', [-2.5, 0.75, 1.2], D), lWait = stage.label('', [2.4, DY - 0.2, 0.6], D);
    const diaLabels = [lGem, lJar, lWait];
    let gph = 0;
    const gemClear = new THREE.Color(0xdff4ff), gemBlack = new THREE.Color(0x1b1d22), glowBlue = new THREE.Color(0x4a90c8);

    // ================================================================ board
    let S = null, tDraw = 0, bKey = '';
    const bd = board(root, 3.4, 2.45, 640, 460, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'slope') {
        title(g, 'Blue molecules left', 'against time');
        const a = axes(g, w, h, { xMax: T_RUN, yMax: 200, xTicks: [0, 30, 60, 90, 120], yTicks: [0, 50, 100, 150, 200], xFmt: (v) => v + ' s', xLabel: 'time since mixing →' });
        clip(g, a, () => {
          curve(g, nTheory, 0, T_RUN, a.X, a.Y, 'rgba(255,255,255,.55)', 3, [8, 6]);
          line(g, trace, a.X, a.Y, COL.count, 5);
          const t = S.tt, v = nTheory(t), m = -cK * v * v, dx = 16;
          g.strokeStyle = COL.hill; g.lineWidth = 3; g.beginPath(); g.moveTo(a.X(t - dx), a.Y(v - m * dx)); g.lineTo(a.X(t + dx), a.Y(v + m * dx)); g.stroke();
          dot(g, a.X(t), a.Y(v), COL.hill, 9);
        });
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.setLineDash([5, 6]); g.lineWidth = 2;
        for (const n of [100, 50]) { const t = (N0 / n - 1) / (cK * N0); if (t < T_RUN) { g.beginPath(); g.moveTo(a.x0, a.Y(n)); g.lineTo(a.X(t), a.Y(n)); g.lineTo(a.X(t), a.y0); g.stroke(); } }
        g.setLineDash([]);
        text(g, `slope at ${Math.round(S.tt)} s: −${num(cK * nTheory(S.tt) ** 2, 2)} a second`, w - 30, a.y1 + 24, COL.hill, 'bold 23px sans-serif', 'right');
        text(g, 'yellow: counted · dashes: theory', w - 30, a.y1 + 54, COL.soft, '19px sans-serif', 'right');
      } else if (S.focus === 'toohot') {
        title(g, 'Speed of a curd culture', '42 °C = 1');
        const a = axes(g, w, h, { xMax: 70, yMax: 3, xTicks: [0, 10, 20, 30, 40, 50, 60, 70], yTicks: [0, 1, 2, 3], xFmt: (v) => v + '°', yFmt: (v) => '×' + v, xLabel: 'temperature of the milk (°C) →' });
        clip(g, a, () => {
          curve(g, arrRel, 0, 70, a.X, a.Y, 'rgba(255,255,255,.5)', 3, [8, 6]);
          curve(g, cultRate, 0, 70, a.X, a.Y, COL.count, 5);
        });
        text(g, 'Arrhenius alone', a.X(52), a.Y(2.55), COL.soft, '19px sans-serif', 'right');
        text(g, 'real culture', a.X(BEST) - 14, a.Y(cultRate(BEST)) - 16, COL.count, 'bold 20px sans-serif', 'right');
        text(g, 'enzymes unfold', a.X(53), a.Y(0.5), COL.hill, 'bold 20px sans-serif');
        ring(g, a.X(4), a.Y(cultRate(4)), 'rgba(255,255,255,.75)', 7); text(g, 'fridge', a.X(4) + 4, a.Y(cultRate(4)) - 14, COL.soft, '18px sans-serif');
        dot(g, a.X(S.bT), a.Y(Math.min(3, cultRate(S.bT))), COL.hill, 10);
      } else {
        title(g, 'How long until diamond is graphite?');
        const a = axes(g, w, h, { x0: 110, xMax: 2200, yMin: 1e-6, yMax: 1e110, yLog: true, xTicks: [0, 500, 1000, 1500, 2000], yTicks: [1, 1e10, 1e30, 1e50, 1e70, 1e90, 1e110], xFmt: (v) => v + '°', yFmt: (v) => (v === 1 ? '1 year' : p10(v)), xLabel: 'temperature (°C) →', yLabel: 'years' });
        clip(g, a, () => curve(g, diaYears, 25, 2200, a.X, a.Y, COL.theory, 4));
        g.strokeStyle = COL.ok; g.setLineDash([7, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(a.x0, a.Y(UNIVERSE)); g.lineTo(a.x1, a.Y(UNIVERSE)); g.stroke(); g.setLineDash([]);
        text(g, 'age of the universe', a.x1 - 6, a.Y(UNIVERSE) - 10, COL.ok, 'bold 20px sans-serif', 'right');
        dot(g, a.X(S.dT), a.Y(clamp(diaYears(S.dT), 1e-6, 1e110)), COL.hill, 10);
        text(g, `hill: ${DIA.Ea} kJ/mol`, a.x1 - 6, a.y1 + 60, COL.hill, 'bold 22px sans-serif', 'right');
      }
    }, [3.25, 6.25, 0]);

    const setFocus = focusSwitch(stage, G, VIEWS);
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        setFocus(s.focus);
        const narrow = fitNarrow(stage, []);
        showLabels(slopeLabels, s.focus === 'slope'); showLabels(hotLabels, s.focus === 'toohot'); showLabels(diaLabels, s.focus === 'diamond');
        placeBoard(bd, [[3.25, 6.25, 0], -0.06, 1.3], REEL, PHONE);
        if (s.focus === 'slope') {
          const T = s.T + K0, k = `${s.T}|${s.run}`;
          if (k !== sKey) {
            sKey = k; gas.setT(T); gas.fill(N0, N0); gas.resetCounts(); trace = [[0, N0]]; nextRec = 0.5; half1 = half2 = null;
            cK = gas.theory(EA_RUN, 1, 1, 1).rate;
          }
          for (let i = 0; i < (s.ff || 1) && gas.t < T_RUN; i++) {
            gas.step(dt, opt);
            while (gas.t >= nextRec && nextRec <= T_RUN + 1e-6) {
              const n = gas.count(A); trace.push([nextRec, n]);
              if (half1 == null && n <= N0 / 2) half1 = nextRec; if (half2 == null && n <= N0 / 4) half2 = nextRec;
              nextRec += 0.5;
            }
          }
          if (gas.t >= T_RUN) gas.events.length = 0;
          view.draw(dt); tk.setT(T);
          lLeft.element.innerHTML = `<b style="color:${COL.A}">${gas.count(A)}</b> of ${N0} blue molecules left · ${Math.min(T_RUN, Math.round(gas.t))} s`; lLeft.element.style.setProperty('--c', COL.count);
          lST.element.innerHTML = gas.t >= T_RUN ? 'the run is over: press <b>Run it again</b>' : `thermostat: <b>${Math.round(s.T)} °C</b>`;
          lSF.visible = !narrow && !inReel();
        } else if (s.focus === 'toohot') {
          const T = s.bT + K0, rel = cultRate(s.bT), alive = folded(s.bT);
          tempColor(T, 270, 345, back.material.color).multiplyScalar(0.16);
          thB.set(s.bT / 75 + 0.05); thB.tint(tempColor(T, 270, 345, cc));
          for (let i = 0; i < NB; i++) {
            const b = bug[i], ok = b.k < alive + 0.02;
            if (ok) { b.x += (rnd() - 0.5) * 0.9 * dt * Math.sqrt(T / 300); b.z += (rnd() - 0.5) * 0.9 * dt * Math.sqrt(T / 300); }
            const rr = Math.hypot(b.x, b.z); if (rr > 0.92) { b.x *= 0.92 / rr; b.z *= 0.92 / rr; }
            if (ok && rnd() < rel * dt * 0.9) b.f = 0.6;
            b.f = Math.max(0, b.f - dt);
            bugs.place(i, b.x, 1.31, b.z, 1 + 2 * b.f); bugs.color(i, cc.copy(ok ? aliveC : deadC).lerp(white, clamp(b.f * 2, 0, 1)));
          }
          bugs.done();
          lPot.element.innerHTML = `${whereName(s.bT)}: milk at <b>${s.bT} °C</b>`; lPot.element.style.setProperty('--c', cssTemp(T, 270, 345));
          lBug.element.innerHTML = alive < 0.5 ? '<b>grey: enzymes unfolded, the bacteria are dying</b>' : 'each flash: bacteria make a little lactic acid';
          const hrs = CULT.h0 / rel;
          lSet.element.innerHTML = hrs > 36 ? 'dahi will <b>not set</b>' : `sets in about <b>${fmtDur(hrs * 60)}</b>`;
          if (narrow) showLabels([lBug], false);
        } else {
          const T = s.dT + K0, yrs = diaYears(s.dT);
          // the stone turns black when the wait is hours, not years
          const want = clamp(1 - (Math.log10(yrs) + 3.5) / 2.5, 0, 1);
          gph = approach(gph, want, 1.5, dt);
          gemMat.color.copy(gemClear).lerp(gemBlack, gph); gemMat.opacity = 0.92 + 0.08 * gph; gemMat.roughness = 0.05 + 0.7 * gph;
          gemMat.emissive.copy(glowBlue).lerp(tempColor(T, 600, 2600, cc), clamp((s.dT - 500) / 900, 0, 1)); gemMat.emissiveIntensity = (1 - gph) * (0.35 + clamp((s.dT - 500) / 1700, 0, 1) * 0.4) + gph * 0.04;
          gemE.material.opacity = 0.8 * (1 - gph) + 0.15;
          gem.rotation.y = time * 0.4;
          heatMat.emissive.setHex(0xff5a1e).multiplyScalar(clamp((s.dT - 400) / 1500, 0, 1));
          lGem.element.innerHTML = gph > 0.6 ? `<b>${fmt0(s.dT)} °C</b>: the diamond turns to black graphite` : `diamond at <b>${fmt0(s.dT)} °C</b>`; lGem.element.style.setProperty('--c', gph > 0.6 ? COL.hill : COL.A);
          lWait.element.innerHTML = `the wait: <b>${fmtYears(yrs)}</b>`;
          if (narrow) showLabels([lJar], false);
        }
        tDraw -= dt;
        const k2 = `${s.focus}|${s.tt}|${s.bT}|${s.dT}|${sKey}`;
        if (k2 !== bKey || (tDraw <= 0 && s.focus === 'slope' && gas.t < T_RUN + 1)) { bKey = k2; tDraw = 0.3; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'slope') {
          const v = nTheory(s.tt), m = cK * v * v, m0 = cK * N0 * N0, c = countedSlope(s.tt), h1 = 1 / (cK * N0);
          return `<div class="big">Rate at ${Math.round(s.tt)} s: ${num(m, 2)} molecules a second</div>
            <div class="row"><span>Slope of the tangent</span><b style="color:${COL.count}">counted ${c == null ? '…' : num(Math.max(0, c), 2)} · theory ${num(m, 2)} a second</b></div>
            <div class="row"><span>Blue molecules left at ${Math.round(s.tt)} s</span><b>counted ${gas.t >= s.tt ? nAt(s.tt) : '…'} · theory ${Math.round(v)}</b></div>
            <div class="row x"><span>Rate at the start</span><b>${num(m0, 2)} a second: ${(m0 / m).toFixed(1)} times the rate now</b></div>
            <div class="row x"><span>Half-lives (theory ${h1.toFixed(1)} s, then ${(2 * h1).toFixed(1)} s)</span><b>counted ${half1 == null ? '…' : half1.toFixed(1) + ' s'}, then ${half2 == null ? '…' : (half2 - half1).toFixed(1) + ' s'}</b></div>
            <small>Rate = c × A × B. With half of each left, their collisions are four times rarer, so the curve flattens.</small>`;
        }
        if (s.focus === 'toohot') {
          const rel = cultRate(s.bT), arr = arrRel(s.bT), f = folded(s.bT), hrs = CULT.h0 / rel;
          return `<div class="big">${hrs > 36 ? 'The dahi will not set' : `Dahi sets in about ${fmtDur(hrs * 60)}`}</div>
            <div class="row x"><span>Milk at</span><b>${s.bT} °C, ${whereName(s.bT)}</b></div>
            <div class="row"><span>Speed against 42 °C</span><b style="color:${COL.count}">×${rel < 0.01 ? num(rel, 1) : rel.toFixed(2)}</b></div>
            <div class="row"><span>Arrhenius alone would say</span><b>×${arr.toFixed(2)}</b></div>
            <div class="row"><span>Enzymes still folded</span><b>${f > 0.995 ? 'nearly all' : (f * 100).toFixed(f < 0.1 ? 1 : 0) + ' %'}</b></div>
            <div class="row x"><span>Best temperature in this model</span><b>${BEST.toFixed(0)} °C</b></div>
            <small>${s.bT > 50 ? 'Too hot: the enzymes unfold, and they do not fold back when the milk cools.' : s.bT < 10 ? 'Cold slows the bacteria almost to a stop but does not kill them. Warm the pot and they start again.' : 'Arrhenius (hill 60 kJ/mol) times the share of enzymes still folded. A model of the shape, not of one dairy’s culture.'}</small>`;
        }
        const yrs = diaYears(s.dT), T = s.dT + K0;
        return `<div class="big">The wait: ${fmtYears(yrs)}</div>
          <div class="row x"><span>Furnace, no air</span><b>${fmt0(s.dT)} °C</b></div>
          <div class="row"><span>The hill, diamond to graphite</span><b>${DIA.Ea} kJ/mol</b></div>
          <div class="row x"><span>Share of tries that clear it</span><b>${p10(boltz(DIA.Ea, T)) === '10⁰' ? '1' : '1 in ' + p10(1 / boltz(DIA.Ea, T))}</b></div>
          <div class="row"><span>Against the age of the universe</span><b>${yrs > UNIVERSE ? p10(yrs / UNIVERSE) + ' times longer' : 'far shorter'}</b></div>
          <small>A rough estimate: 1 ÷ (10¹³ tries a second × e<sup>−Ea ÷ RT</sup>). Graphite is lower in energy by only ${DIA.dG} kJ/mol. In air a diamond would burn first.</small>`;
      })(s)),
    };
  },
};
